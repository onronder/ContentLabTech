/**
 * Job Queue Management System
 * Handles background processing with progress tracking and error recovery
 */

import { createClient } from '@supabase/supabase-js';
import type {
  Job,
  JobType,
  JobPriority,
  JobStatus,
  JobData,
  // JobResult,
  JobProgress,
  JobQueueConfig,
  // JobEventData,
} from './types';

// In-memory job queue (Redis replacement for now)
class JobQueue {
  private jobs: Map<string, Job> = new Map();
  private processing: Set<string> = new Set();
  private listeners: Map<string, ((progress: JobProgress) => void)[]> = new Map();
  private config: JobQueueConfig;
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

  constructor(config: Partial<JobQueueConfig> = {}) {
    this.config = {
      concurrency: config.concurrency ?? 3,
      defaultPriority: config.defaultPriority ?? 'normal',
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      cleanupInterval: config.cleanupInterval ?? 60000, // 1 minute
      maxJobAge: config.maxJobAge ?? 86400000, // 24 hours
      ...config,
    };

    // Start cleanup interval
    setInterval(() => this.cleanup(), this.config.cleanupInterval);
  }

  /**
   * Add a new job to the queue
   */
  async addJob(
    type: JobType,
    data: JobData,
    priority: JobPriority = this.config.defaultPriority
  ): Promise<string> {
    const job: Job = {
      id: this.generateJobId(),
      type,
      status: 'pending',
      priority,
      data,
      attempts: 0,
      maxAttempts: this.config.maxRetries,
      createdAt: new Date(),
      progress: 0,
    };

    this.jobs.set(job.id, job);

    // Store job in database
    await this.storeJob(job);

    // Emit job created event
    this.emitJobEvent(job.id, 'job.created');

    // Start processing if capacity available
    this.processNextJob();

    return job.id;
  }

  /**
   * Get job status and progress
   */
  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get jobs by status
   */
  getJobsByStatus(status: JobStatus): Job[] {
    return Array.from(this.jobs.values()).filter(job => job.status === status);
  }

  /**
   * Get jobs for a specific project
   */
  getProjectJobs(projectId: string): Job[] {
    return Array.from(this.jobs.values()).filter(
      job => job.data.projectId === projectId
    );
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job || job.status === 'completed' || job.status === 'failed') {
      return false;
    }

    job.status = 'cancelled';
    this.processing.delete(jobId);

    await this.updateJobInDatabase(job);
    this.emitJobEvent(jobId, 'job.cancelled');

    return true;
  }

  /**
   * Subscribe to job progress updates
   */
  onJobProgress(jobId: string, callback: (progress: JobProgress) => void): () => void {
    if (!this.listeners.has(jobId)) {
      this.listeners.set(jobId, []);
    }
    this.listeners.get(jobId)!.push(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(jobId);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  /**
   * Update job progress
   */
  async updateJobProgress(
    jobId: string,
    progress: number,
    message?: string,
    partialResults?: unknown
  ): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.progress = Math.max(0, Math.min(100, progress));
    job.progressMessage = message;

    const progressUpdate: JobProgress = {
      jobId,
      progress: job.progress,
      message: message || '',
      partialResults,
    };

    // Notify listeners
    const listeners = this.listeners.get(jobId);
    if (listeners) {
      listeners.forEach(callback => callback(progressUpdate));
    }

    // Update database
    await this.updateJobInDatabase(job);

    // Emit progress event
    this.emitJobEvent(jobId, 'job.progress', progressUpdate);
  }

  /**
   * Mark job as completed
   */
  async completeJob(jobId: string, result: unknown): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'completed';
    job.progress = 100;
    job.result = result;
    job.completedAt = new Date();

    this.processing.delete(jobId);

    await this.updateJobInDatabase(job);
    this.emitJobEvent(jobId, 'job.completed', result);

    // Process next job
    this.processNextJob();
  }

  /**
   * Mark job as failed
   */
  async failJob(jobId: string, error: string, retryable: boolean = true): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.attempts++;
    job.error = error;
    job.failedAt = new Date();

    if (retryable && job.attempts < job.maxAttempts) {
      // Schedule retry
      job.status = 'retrying';
      setTimeout(() => {
        if (this.jobs.has(jobId)) {
          job.status = 'pending';
          this.processNextJob();
        }
      }, this.config.retryDelay * Math.pow(2, job.attempts - 1)); // Exponential backoff
    } else {
      job.status = 'failed';
      this.processing.delete(jobId);
    }

    await this.updateJobInDatabase(job);
    this.emitJobEvent(jobId, 'job.failed', { error, retryable });

    // Process next job if not retrying
    if (job.status === 'failed') {
      this.processNextJob();
    }
  }

  /**
   * Process the next job in queue
   */
  private async processNextJob(): Promise<void> {
    if (this.processing.size >= this.config.concurrency) {
      return; // At capacity
    }

    // Get next pending job by priority
    const pendingJobs = this.getJobsByStatus('pending');
    if (pendingJobs.length === 0) {
      return; // No jobs to process
    }

    // Sort by priority and creation time
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    const nextJob = pendingJobs.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.createdAt.getTime() - b.createdAt.getTime();
    })[0];

    await this.processJob(nextJob);
  }

  /**
   * Process a specific job
   */
  private async processJob(job: Job): Promise<void> {
    this.processing.add(job.id);
    job.status = 'processing';
    job.processedAt = new Date();

    await this.updateJobInDatabase(job);
    this.emitJobEvent(job.id, 'job.started');

    try {
      // Import and execute the appropriate processor
      const processor = await this.getJobProcessor(job.type);
      const result = await processor.process(job);

      if (result.success) {
        await this.completeJob(job.id, result.data);
      } else {
        await this.failJob(job.id, result.error || 'Unknown error', result.retryable);
      }
    } catch (error) {
      await this.failJob(job.id, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Get the appropriate job processor
   */
  private async getJobProcessor(type: JobType): Promise<JobProcessor> {
    switch (type) {
      case 'content-analysis':
        const { ContentAnalysisProcessor } = await import('./processors/content-analysis');
        return new ContentAnalysisProcessor();
      case 'seo-health-check':
        const { SEOHealthProcessor } = await import('./processors/seo-health');
        return new SEOHealthProcessor();
      case 'performance-analysis':
        const { PerformanceAnalysisProcessor } = await import('./processors/performance');
        return new PerformanceAnalysisProcessor();
      case 'competitive-intelligence':
        const { CompetitiveIntelligenceProcessor } = await import('./processors/competitive');
        return new CompetitiveIntelligenceProcessor();
      case 'industry-benchmarking':
        const { IndustryBenchmarkingProcessor } = await import('./processors/benchmarking');
        return new IndustryBenchmarkingProcessor();
      case 'project-health-scoring':
        const { ProjectHealthProcessor } = await import('./processors/project-health');
        return new ProjectHealthProcessor();
      default:
        throw new Error(`Unknown job type: ${type}`);
    }
  }

  /**
   * Store job in database
   */
  private async storeJob(job: Job): Promise<void> {
    try {
      await this.supabase.from('processing_jobs').insert({
        id: job.id,
        type: job.type,
        status: job.status,
        priority: job.priority,
        project_id: job.data.projectId,
        user_id: job.data.userId,
        team_id: job.data.teamId,
        data: job.data,
        attempts: job.attempts,
        max_attempts: job.maxAttempts,
        progress: job.progress,
        progress_message: job.progressMessage,
        created_at: job.createdAt.toISOString(),
      });
    } catch (error) {
      console.error('Failed to store job in database:', error);
    }
  }

  /**
   * Update job in database
   */
  private async updateJobInDatabase(job: Job): Promise<void> {
    try {
      await this.supabase
        .from('processing_jobs')
        .update({
          status: job.status,
          attempts: job.attempts,
          progress: job.progress,
          progress_message: job.progressMessage,
          error: job.error,
          result: job.result,
          processed_at: job.processedAt?.toISOString(),
          completed_at: job.completedAt?.toISOString(),
          failed_at: job.failedAt?.toISOString(),
        })
        .eq('id', job.id);
    } catch (error) {
      console.error('Failed to update job in database:', error);
    }
  }

  /**
   * Emit job event
   */
  private emitJobEvent(jobId: string, event: string, data?: unknown): void {
    // In a real implementation, this would publish to a message queue
    // For now, we'll just log the event
    console.warn(`Job Event: ${event} for job ${jobId}`, data);
  }

  /**
   * Clean up old completed/failed jobs
   */
  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [jobId, job] of this.jobs.entries()) {
      if (
        (job.status === 'completed' || job.status === 'failed') &&
        now - job.createdAt.getTime() > this.config.maxJobAge
      ) {
        toDelete.push(jobId);
      }
    }

    toDelete.forEach(jobId => {
      this.jobs.delete(jobId);
      this.listeners.delete(jobId);
    });

    if (toDelete.length > 0) {
      console.warn(`Cleaned up ${toDelete.length} old jobs`);
    }
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    processing_capacity: number;
  } {
    const jobs = Array.from(this.jobs.values());
    return {
      total: jobs.length,
      pending: jobs.filter(j => j.status === 'pending').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      processing_capacity: this.config.concurrency - this.processing.size,
    };
  }
}

// Singleton instance
export const jobQueue = new JobQueue({
  concurrency: 5,
  maxRetries: 3,
  retryDelay: 2000,
});

export default jobQueue;