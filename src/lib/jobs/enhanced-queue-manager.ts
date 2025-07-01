/**
 * Enhanced Job Queue Manager
 * Production-grade job processing with Redis support and fallback to in-memory
 */

import { z } from "zod";
import {
  redisQueueManager,
  type JobData as RedisJobData,
  type JobResult as RedisJobResult,
} from "./redis-queue-manager";
import { jobQueue as inMemoryQueue } from "./queue";
import type {
  Job,
  JobType,
  JobPriority,
  JobData,
  JobProcessor,
  JobResult,
} from "./types";

// Configuration schema
const enhancedQueueConfigSchema = z.object({
  preferRedis: z.boolean().default(true),
  fallbackToMemory: z.boolean().default(true),
  redisConnectionTimeout: z.number().default(5000),
  enableMetrics: z.boolean().default(true),
  enableHealthCheck: z.boolean().default(true),
});

interface QueueMetrics {
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  queueType: "redis" | "memory";
  uptime: number;
}

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  queueType: "redis" | "memory";
  redis?: {
    available: boolean;
    responseTime: number;
  };
  processing: {
    activeJobs: number;
    totalProcessed: number;
    errorRate: number;
  };
}

export class EnhancedQueueManager {
  private config: z.infer<typeof enhancedQueueConfigSchema>;
  private useRedis = false;
  private isInitialized = false;
  private startTime = Date.now();
  private processors: Map<string, JobProcessor<any, any>> = new Map();
  private totalProcessed = 0;
  private totalErrors = 0;

  constructor(config: Partial<z.infer<typeof enhancedQueueConfigSchema>> = {}) {
    this.config = enhancedQueueConfigSchema.parse(config);
  }

  /**
   * Initialize the enhanced queue manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log("Initializing Enhanced Queue Manager...");

    // Try to initialize Redis if preferred
    if (this.config.preferRedis) {
      try {
        const initPromise = redisQueueManager.initialize();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Redis initialization timeout")),
            this.config.redisConnectionTimeout
          )
        );

        await Promise.race([initPromise, timeoutPromise]);
        this.useRedis = true;
        console.log("Enhanced Queue Manager: Using Redis-based queue");
      } catch (error) {
        console.warn(
          "Redis queue initialization failed:",
          error instanceof Error ? error.message : "Unknown error"
        );

        if (!this.config.fallbackToMemory) {
          throw new Error("Redis queue failed and fallback disabled");
        }

        console.log("Enhanced Queue Manager: Falling back to in-memory queue");
        this.useRedis = false;
      }
    } else {
      console.log(
        "Enhanced Queue Manager: Using in-memory queue (Redis disabled)"
      );
      this.useRedis = false;
    }

    // Register processors that were added before initialization
    for (const [jobType, processor] of this.processors) {
      await this.registerProcessorInternal(jobType as JobType, processor);
    }

    this.isInitialized = true;
    console.log(
      `Enhanced Queue Manager initialized successfully (${this.useRedis ? "Redis" : "Memory"})`
    );
  }

  /**
   * Register a job processor
   */
  async registerProcessor<TData extends JobData, TResult>(
    jobType: JobType,
    processor: JobProcessor<TData, TResult>
  ): Promise<void> {
    this.processors.set(jobType, processor);

    if (this.isInitialized) {
      await this.registerProcessorInternal(jobType, processor);
    }
  }

  /**
   * Add a job to the queue
   */
  async addJob<TData extends JobData>(
    type: JobType,
    data: TData,
    options: {
      priority?: JobPriority;
      delay?: number;
      userId?: string;
      projectId?: string;
    } = {}
  ): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.useRedis) {
      // Use Redis queue
      const redisJobData: Omit<RedisJobData, "id"> = {
        type: this.mapJobTypeToRedis(type) as
          | "competitive-analysis"
          | "content-analysis"
          | "performance-analysis"
          | "seo-audit",
        priority: options.priority || "normal",
        params: data.params,
        metadata: {
          userId: options.userId,
          projectId: options.projectId,
          timestamp: new Date().toISOString(),
          source: "api",
        },
      };

      const addJobOptions: {
        priority?: number;
        delay?: number;
        queueName?: string;
      } = {};
      if (options.delay !== undefined) {
        addJobOptions.delay = options.delay;
      }
      return await redisQueueManager.addJob(redisJobData, addJobOptions);
    } else {
      // Use in-memory queue
      const job: Omit<Job, "id" | "status" | "createdAt" | "updatedAt"> = {
        type,
        data,
        priority: options.priority || "normal",
        attempts: 0,
        maxAttempts: 3,
        progress: 0,
      };

      return await inMemoryQueue.addJob(job as any, options.priority as any);
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<{
    id: string;
    status: string;
    progress: number;
    result?: any;
    error?: string | undefined;
    createdAt: Date;
    updatedAt?: Date | undefined;
  } | null> {
    if (this.useRedis) {
      const status = await redisQueueManager.getJobStatus(jobId);
      if (!status) return null;

      return {
        id: status.id,
        status: status.state,
        progress: status.progress,
        result: status.result,
        error: status.error || undefined,
        createdAt: status.createdAt,
        updatedAt: status.processedAt || status.finishedAt,
      };
    } else {
      const job = await inMemoryQueue.getJob(jobId);
      if (!job) return null;

      return {
        id: job.id,
        status: job.status,
        progress: job.progress || 0,
        result: job.result,
        error: job.error || undefined,
        createdAt: job.createdAt,
        updatedAt: job.processedAt || job.completedAt || job.failedAt,
      };
    }
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    if (this.useRedis) {
      return await redisQueueManager.cancelJob(jobId);
    } else {
      return await inMemoryQueue.cancelJob(jobId);
    }
  }

  /**
   * Get queue metrics
   */
  async getMetrics(): Promise<QueueMetrics> {
    const uptime = Date.now() - this.startTime;

    if (this.useRedis) {
      const redisMetrics = await redisQueueManager.getQueueMetrics();
      return {
        totalJobs:
          redisMetrics.waiting +
          redisMetrics.active +
          redisMetrics.completed +
          redisMetrics.failed,
        activeJobs: redisMetrics.active,
        completedJobs: redisMetrics.completed,
        failedJobs: redisMetrics.failed,
        queueType: "redis",
        uptime,
      };
    } else {
      const memoryStats = inMemoryQueue.getStats();
      return {
        totalJobs: memoryStats.total,
        activeJobs: memoryStats.processing,
        completedJobs: memoryStats.completed,
        failedJobs: memoryStats.failed,
        queueType: "memory",
        uptime,
      };
    }
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const metrics = await this.getMetrics();
    const errorRate =
      metrics.totalJobs > 0
        ? (metrics.failedJobs / metrics.totalJobs) * 100
        : 0;

    let status: "healthy" | "degraded" | "unhealthy" = "healthy";

    if (errorRate > 10) {
      status = "degraded";
    }

    if (errorRate > 25 || !this.isInitialized) {
      status = "unhealthy";
    }

    const healthStatus: HealthStatus = {
      status,
      queueType: this.useRedis ? "redis" : "memory",
      processing: {
        activeJobs: metrics.activeJobs,
        totalProcessed: this.totalProcessed,
        errorRate: Math.round(errorRate * 100) / 100,
      },
    };

    // Add Redis-specific health info
    if (this.useRedis) {
      try {
        const redisHealth = await redisQueueManager.getHealthStatus();
        healthStatus.redis = {
          available: redisHealth.redis.connected,
          responseTime: redisHealth.redis.responseTime,
        };

        if (redisHealth.status === "unhealthy") {
          healthStatus.status = "unhealthy";
        } else if (
          redisHealth.status === "degraded" &&
          healthStatus.status === "healthy"
        ) {
          healthStatus.status = "degraded";
        }
      } catch (error) {
        healthStatus.redis = {
          available: false,
          responseTime: -1,
        };
        healthStatus.status = "unhealthy";
      }
    }

    return healthStatus;
  }

  /**
   * Pause queue processing
   */
  async pauseQueue(): Promise<void> {
    if (this.useRedis) {
      await redisQueueManager.pauseQueue();
    } else {
      // In-memory queue doesn't support pause/resume - this is a no-op
      console.warn("In-memory queue doesn't support pause operation");
    }
  }

  /**
   * Resume queue processing
   */
  async resumeQueue(): Promise<void> {
    if (this.useRedis) {
      await redisQueueManager.resumeQueue();
    } else {
      // In-memory queue doesn't support pause/resume - this is a no-op
      console.warn("In-memory queue doesn't support resume operation");
    }
  }

  /**
   * Clean old jobs
   */
  async cleanQueue(
    options: {
      olderThan?: number;
      status?: "completed" | "failed";
      limit?: number;
    } = {}
  ): Promise<number> {
    if (this.useRedis) {
      const type = options.status === "failed" ? "failed" : "completed";
      const grace = options.olderThan || 24 * 60 * 60 * 1000; // 24 hours
      const limit = options.limit || 100;

      return await redisQueueManager.cleanQueue(undefined, {
        grace,
        limit,
        type,
      });
    } else {
      // In-memory queue cleanup is private - return 0 as a mock
      console.warn("In-memory queue cleanup is not accessible");
      return 0;
    }
  }

  /**
   * Force switch to Redis (if available)
   */
  async switchToRedis(): Promise<boolean> {
    if (this.useRedis) return true;

    try {
      await redisQueueManager.initialize();
      this.useRedis = true;

      // Re-register processors
      for (const [jobType, processor] of this.processors) {
        await this.registerProcessorInternal(jobType as JobType, processor);
      }

      console.log("Successfully switched to Redis queue");
      return true;
    } catch (error) {
      console.error("Failed to switch to Redis queue:", error);
      return false;
    }
  }

  /**
   * Force switch to in-memory queue
   */
  async switchToMemory(): Promise<void> {
    if (!this.useRedis) return;

    this.useRedis = false;
    console.log("Switched to in-memory queue");
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log("Shutting down Enhanced Queue Manager...");

    if (this.useRedis) {
      await redisQueueManager.shutdown();
    }

    this.isInitialized = false;
    console.log("Enhanced Queue Manager shutdown complete");
  }

  /**
   * Register processor internally
   */
  private async registerProcessorInternal<TData extends JobData, TResult>(
    jobType: JobType,
    processor: JobProcessor<TData, TResult>
  ): Promise<void> {
    if (this.useRedis) {
      // Wrap processor for Redis
      const redisProcessor = async (job: any): Promise<RedisJobResult> => {
        const startTime = Date.now();

        try {
          // Convert Redis job to internal format
          const internalJob: Job = {
            id: job.data.id,
            type: this.mapRedisJobTypeToInternal(job.data.type),
            data: {
              params: job.data.params,
            } as TData,
            status: "processing",
            priority: job.data.priority,
            attempts: job.attemptsMade || 0,
            maxAttempts: 3,
            createdAt: new Date(job.timestamp),
            processedAt: new Date(),
            progress: 0,
          };

          // Execute processor
          const result = await processor.process(internalJob);

          this.totalProcessed++;

          return {
            success: result.success,
            data: result.data,
            error: result.error,
            metadata: {
              processingTime: Date.now() - startTime,
              retryCount: job.attemptsMade || 0,
              completedAt: new Date().toISOString(),
              processor: `enhanced-${jobType}`,
            },
          };
        } catch (error) {
          this.totalErrors++;

          return {
            success: false,
            error: error instanceof Error ? error.message : "Processing failed",
            metadata: {
              processingTime: Date.now() - startTime,
              retryCount: job.attemptsMade || 0,
              completedAt: new Date().toISOString(),
              processor: `enhanced-${jobType}`,
            },
          };
        }
      };

      await redisQueueManager.registerProcessor(
        this.mapJobTypeToRedis(jobType),
        redisProcessor
      );
    } else {
      // In-memory queue doesn't have registerProcessor method - store it locally
      console.warn("In-memory queue doesn't support processor registration");
    }
  }

  /**
   * Map internal job type to Redis job type
   */
  private mapJobTypeToRedis(jobType: JobType): string {
    const mapping: Partial<Record<JobType, string>> = {
      "competitive-analysis": "competitive-analysis",
      "performance-analysis": "performance-analysis",
      "content-analysis": "content-analysis",
    };

    return mapping[jobType] || jobType;
  }

  /**
   * Map Redis job type to internal job type
   */
  private mapRedisJobTypeToInternal(redisJobType: string): JobType {
    const mapping: Record<string, JobType> = {
      "competitive-analysis": "competitive-analysis",
      "performance-analysis": "performance-analysis",
      "content-analysis": "content-analysis",
    };

    return mapping[redisJobType] || (redisJobType as JobType);
  }

  /**
   * Get queue type
   */
  getQueueType(): "redis" | "memory" {
    return this.useRedis ? "redis" : "memory";
  }

  /**
   * Check if initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const enhancedQueueManager = new EnhancedQueueManager();

// Export types
export type { QueueMetrics, HealthStatus };
