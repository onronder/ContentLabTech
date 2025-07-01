/**
 * Redis-Based Distributed Job Queue Manager
 * Production-grade job processing with horizontal scaling capabilities
 */

import { z } from "zod";
import Bull from "bull";
import Redis from "ioredis";
import type { Job as BullJob, Queue as BullQueue } from "bull";

// Configuration schema
const redisQueueConfigSchema = z.object({
  redis: z.object({
    host: z.string().default("localhost"),
    port: z.number().default(6379),
    password: z.string().optional(),
    db: z.number().default(0),
    maxRetriesPerRequest: z.number().default(3),
    retryDelayOnFailover: z.number().default(100),
    lazyConnect: z.boolean().default(true),
  }),
  queue: z.object({
    name: z.string().default("contentlab-jobs"),
    defaultJobOptions: z.object({
      removeOnComplete: z.number().default(100),
      removeOnFail: z.number().default(50),
      attempts: z.number().default(3),
      backoff: z.object({
        type: z.string().default("exponential"),
        delay: z.number().default(2000),
      }),
    }),
  }),
  concurrency: z.object({
    default: z.number().default(5),
    competitive: z.number().default(3),
    analytics: z.number().default(2),
    seo: z.number().default(4),
    performance: z.number().default(2),
  }),
  monitoring: z.object({
    enableMetrics: z.boolean().default(true),
    metricsInterval: z.number().default(30000), // 30 seconds
    enableHealthCheck: z.boolean().default(true),
  }),
});

// Job schemas
const jobDataSchema = z.object({
  id: z.string(),
  type: z.enum([
    "competitive-analysis",
    "seo-audit",
    "performance-analysis",
    "content-analysis",
  ]),
  priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
  params: z.record(z.unknown()),
  metadata: z.object({
    userId: z.string().optional(),
    projectId: z.string().optional(),
    timestamp: z.string().default(() => new Date().toISOString()),
    source: z.string().default("api"),
  }),
});

const jobResultSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  metadata: z.object({
    processingTime: z.number(),
    retryCount: z.number(),
    completedAt: z.string(),
    processor: z.string(),
  }),
});

type JobData = z.infer<typeof jobDataSchema>;
type JobResult = z.infer<typeof jobResultSchema>;

interface QueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

interface ProcessorFunction {
  (job: BullJob<JobData>): Promise<JobResult>;
}

export class RedisQueueManager {
  private config: z.infer<typeof redisQueueConfigSchema>;
  private redis: Redis;
  private queues: Map<string, BullQueue<JobData>> = new Map();
  private processors: Map<string, ProcessorFunction> = new Map();
  private metrics: Map<string, QueueMetrics> = new Map();
  private metricsInterval?: NodeJS.Timeout;
  private isInitialized = false;

  constructor(config: Partial<z.infer<typeof redisQueueConfigSchema>> = {}) {
    this.config = redisQueueConfigSchema.parse({
      redis: {
        host: process.env["REDIS_HOST"] || "localhost",
        port: parseInt(process.env["REDIS_PORT"] || "6379"),
        password: process.env["REDIS_PASSWORD"],
        ...config.redis,
      },
      ...config,
    });

    // Initialize Redis connection
    const redisOptions: any = {
      host: this.config.redis.host,
      port: this.config.redis.port,
      db: this.config.redis.db,
      maxRetriesPerRequest: this.config.redis.maxRetriesPerRequest,
      lazyConnect: this.config.redis.lazyConnect,
    };

    if (this.config.redis.password) {
      redisOptions.password = this.config.redis.password;
    }

    this.redis = new Redis(redisOptions);

    this.setupRedisEventHandlers();
  }

  /**
   * Initialize the queue manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Test Redis connection
      await this.redis.ping();

      // Create main job queue
      await this.createQueue(this.config.queue.name);

      // Start metrics collection if enabled
      if (this.config.monitoring.enableMetrics) {
        this.startMetricsCollection();
      }

      this.isInitialized = true;
      console.log("Redis Queue Manager initialized successfully");
    } catch (error) {
      throw new Error(
        `Failed to initialize Redis Queue Manager: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Create a new job queue
   */
  async createQueue(queueName: string): Promise<BullQueue<JobData>> {
    if (this.queues.has(queueName)) {
      return this.queues.get(queueName)!;
    }

    const redisConfig: any = { ...this.config.redis };
    if (!redisConfig.password) {
      delete redisConfig.password;
    }

    const queue = new Bull<JobData>(queueName, {
      redis: redisConfig,
      defaultJobOptions: this.config.queue.defaultJobOptions,
    });

    // Set up queue event handlers
    this.setupQueueEventHandlers(queue, queueName);

    this.queues.set(queueName, queue);
    return queue;
  }

  /**
   * Register a job processor
   */
  registerProcessor(
    jobType: string,
    processor: ProcessorFunction,
    options: { concurrency?: number; queueName?: string } = {}
  ): void {
    const queueName = options.queueName || this.config.queue.name;
    const concurrency =
      options.concurrency || this.getConcurrencyForJobType(jobType);

    this.processors.set(jobType, processor);

    // Get or create queue
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found. Create queue first.`);
    }

    // Register processor with Bull
    queue.process(jobType, concurrency, async (job: BullJob<JobData>) => {
      const startTime = Date.now();

      try {
        // Validate job data
        const validatedData = jobDataSchema.parse(job.data);

        // Update job progress
        await job.progress(10);

        // Execute processor
        const result = await processor(job);

        // Update progress to completion
        await job.progress(100);

        // Add processing metadata
        result.metadata.processingTime = Date.now() - startTime;
        result.metadata.retryCount = job.attemptsMade;
        result.metadata.completedAt = new Date().toISOString();
        result.metadata.processor = `${process.pid}-${jobType}`;

        return result;
      } catch (error) {
        const errorResult: JobResult = {
          success: false,
          error: error instanceof Error ? error.message : "Processing failed",
          metadata: {
            processingTime: Date.now() - startTime,
            retryCount: job.attemptsMade,
            completedAt: new Date().toISOString(),
            processor: `${process.pid}-${jobType}`,
          },
        };

        // Don't throw - return error result instead
        return errorResult;
      }
    });

    console.log(
      `Registered processor for job type: ${jobType} with concurrency: ${concurrency}`
    );
  }

  /**
   * Add a job to the queue
   */
  async addJob(
    jobData: Omit<JobData, "id">,
    options: {
      priority?: number;
      delay?: number;
      queueName?: string;
    } = {}
  ): Promise<string> {
    const queueName = options.queueName || this.config.queue.name;
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    // Generate job ID
    const jobId = `${jobData.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Prepare complete job data
    const completeJobData: JobData = {
      ...jobData,
      id: jobId,
    };

    // Validate job data
    jobDataSchema.parse(completeJobData);

    // Determine job options
    const jobOptions: Bull.JobOptions = {
      priority: this.getPriorityValue(jobData.priority),
      delay: options.delay,
      jobId,
    };

    // Add job to queue
    const job = await queue.add(jobData.type, completeJobData, jobOptions);

    console.log(
      `Added job ${jobId} of type ${jobData.type} to queue ${queueName}`
    );
    return jobId;
  }

  /**
   * Get job status and progress
   */
  async getJobStatus(
    jobId: string,
    queueName?: string
  ): Promise<{
    id: string;
    state: string;
    progress: number;
    data?: JobData;
    result?: JobResult;
    error?: string | undefined;
    attemptsMade: number;
    createdAt: Date;
    processedAt?: Date | undefined;
    finishedAt?: Date | undefined;
  } | null> {
    const targetQueue = queueName || this.config.queue.name;
    const queue = this.queues.get(targetQueue);

    if (!queue) {
      throw new Error(`Queue ${targetQueue} not found`);
    }

    const job = await queue.getJob(jobId);
    if (!job) return null;

    return {
      id: job.id as string,
      state: await job.getState(),
      progress: (typeof job.progress === "function"
        ? 0
        : job.progress) as number,
      data: job.data,
      result: job.returnvalue,
      error: job.failedReason || undefined,
      attemptsMade: job.attemptsMade,
      createdAt: new Date(job.timestamp),
      processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
      finishedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
    };
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string, queueName?: string): Promise<boolean> {
    const targetQueue = queueName || this.config.queue.name;
    const queue = this.queues.get(targetQueue);

    if (!queue) {
      throw new Error(`Queue ${targetQueue} not found`);
    }

    const job = await queue.getJob(jobId);
    if (!job) return false;

    const state = await job.getState();
    if (state === "completed" || state === "failed") {
      return false; // Cannot cancel completed/failed jobs
    }

    await job.remove();
    console.log(`Cancelled job ${jobId}`);
    return true;
  }

  /**
   * Get queue metrics
   */
  async getQueueMetrics(queueName?: string): Promise<QueueMetrics> {
    const targetQueue = queueName || this.config.queue.name;
    const queue = this.queues.get(targetQueue);

    if (!queue) {
      throw new Error(`Queue ${targetQueue} not found`);
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
    ]);

    // getPaused might not exist in all Bull versions
    let paused = [];
    try {
      paused = await (queue as any).getPaused();
    } catch (error) {
      // Method doesn't exist, paused will remain empty array
    }

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      paused: paused.length,
    };
  }

  /**
   * Pause queue processing
   */
  async pauseQueue(queueName?: string): Promise<void> {
    const targetQueue = queueName || this.config.queue.name;
    const queue = this.queues.get(targetQueue);

    if (!queue) {
      throw new Error(`Queue ${targetQueue} not found`);
    }

    await queue.pause();
    console.log(`Paused queue: ${targetQueue}`);
  }

  /**
   * Resume queue processing
   */
  async resumeQueue(queueName?: string): Promise<void> {
    const targetQueue = queueName || this.config.queue.name;
    const queue = this.queues.get(targetQueue);

    if (!queue) {
      throw new Error(`Queue ${targetQueue} not found`);
    }

    await queue.resume();
    console.log(`Resumed queue: ${targetQueue}`);
  }

  /**
   * Clean completed and failed jobs
   */
  async cleanQueue(
    queueName?: string,
    options: {
      grace?: number;
      limit?: number;
      type?: "completed" | "failed" | "active" | "waiting";
    } = {}
  ): Promise<number> {
    const targetQueue = queueName || this.config.queue.name;
    const queue = this.queues.get(targetQueue);

    if (!queue) {
      throw new Error(`Queue ${targetQueue} not found`);
    }

    const grace = options.grace || 24 * 60 * 60 * 1000; // 24 hours
    const limit = options.limit || 100;
    const type = options.type || "completed";

    const cleaned = await queue.clean(grace, type as any, limit);
    console.log(
      `Cleaned ${cleaned.length} ${type} jobs from queue ${targetQueue}`
    );

    return cleaned.length;
  }

  /**
   * Get queue health status
   */
  async getHealthStatus(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    redis: {
      connected: boolean;
      responseTime: number;
    };
    queues: Record<
      string,
      {
        active: boolean;
        metrics: QueueMetrics;
      }
    >;
    overall: {
      totalJobs: number;
      processing: number;
      errors: number;
    };
  }> {
    const startTime = Date.now();

    try {
      // Test Redis connection
      await this.redis.ping();
      const redisResponseTime = Date.now() - startTime;

      // Get metrics for all queues
      const queueStatuses: Record<string, any> = {};
      let totalJobs = 0;
      let processing = 0;
      let errors = 0;

      for (const [queueName, queue] of this.queues) {
        try {
          const metrics = await this.getQueueMetrics(queueName);
          queueStatuses[queueName] = {
            active: true,
            metrics,
          };

          totalJobs +=
            metrics.waiting +
            metrics.active +
            metrics.completed +
            metrics.failed;
          processing += metrics.active;
          errors += metrics.failed;
        } catch (error) {
          queueStatuses[queueName] = {
            active: false,
            metrics: {
              waiting: 0,
              active: 0,
              completed: 0,
              failed: 0,
              delayed: 0,
              paused: 0,
            },
          };
        }
      }

      // Determine overall status
      let status: "healthy" | "degraded" | "unhealthy" = "healthy";

      if (redisResponseTime > 1000) {
        status = "degraded";
      }

      if (
        redisResponseTime > 5000 ||
        Object.values(queueStatuses).some(q => !q.active)
      ) {
        status = "unhealthy";
      }

      return {
        status,
        redis: {
          connected: true,
          responseTime: redisResponseTime,
        },
        queues: queueStatuses,
        overall: {
          totalJobs,
          processing,
          errors,
        },
      };
    } catch (error) {
      return {
        status: "unhealthy",
        redis: {
          connected: false,
          responseTime: Date.now() - startTime,
        },
        queues: {},
        overall: {
          totalJobs: 0,
          processing: 0,
          errors: 0,
        },
      };
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log("Shutting down Redis Queue Manager...");

    // Stop metrics collection
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Close all queues
    for (const [queueName, queue] of this.queues) {
      try {
        await queue.close();
        console.log(`Closed queue: ${queueName}`);
      } catch (error) {
        console.error(`Error closing queue ${queueName}:`, error);
      }
    }

    // Close Redis connection
    try {
      await this.redis.quit();
      console.log("Redis connection closed");
    } catch (error) {
      console.error("Error closing Redis connection:", error);
    }

    this.isInitialized = false;
    console.log("Redis Queue Manager shutdown complete");
  }

  /**
   * Setup Redis event handlers
   */
  private setupRedisEventHandlers(): void {
    this.redis.on("connect", () => {
      console.log("Redis connected");
    });

    this.redis.on("error", error => {
      console.error("Redis error:", error);
    });

    this.redis.on("close", () => {
      console.log("Redis connection closed");
    });
  }

  /**
   * Setup queue event handlers
   */
  private setupQueueEventHandlers(
    queue: BullQueue<JobData>,
    queueName: string
  ): void {
    queue.on("completed", (job: BullJob<JobData>, result: JobResult) => {
      console.log(`Job ${job.id} completed in queue ${queueName}`);
    });

    queue.on("failed", (job: BullJob<JobData>, error: Error) => {
      console.error(
        `Job ${job.id} failed in queue ${queueName}:`,
        error.message
      );
    });

    queue.on("stalled", (job: BullJob<JobData>) => {
      console.warn(`Job ${job.id} stalled in queue ${queueName}`);
    });

    queue.on("progress", (job: BullJob<JobData>, progress: number) => {
      console.log(`Job ${job.id} progress: ${progress}%`);
    });
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(async () => {
      for (const [queueName] of this.queues) {
        try {
          const metrics = await this.getQueueMetrics(queueName);
          this.metrics.set(queueName, metrics);
        } catch (error) {
          console.error(
            `Error collecting metrics for queue ${queueName}:`,
            error
          );
        }
      }
    }, this.config.monitoring.metricsInterval);
  }

  /**
   * Get concurrency setting for job type
   */
  private getConcurrencyForJobType(jobType: string): number {
    const concurrencyMap: Record<string, keyof typeof this.config.concurrency> =
      {
        "competitive-analysis": "competitive",
        "seo-audit": "seo",
        "performance-analysis": "performance",
        "content-analysis": "analytics",
      };

    const concurrencyKey = concurrencyMap[jobType] || "default";
    return this.config.concurrency[concurrencyKey];
  }

  /**
   * Convert priority string to numeric value
   */
  private getPriorityValue(priority: JobData["priority"]): number {
    const priorityMap = {
      low: 1,
      normal: 5,
      high: 10,
      critical: 20,
    };

    return priorityMap[priority];
  }
}

// Export singleton instance
export const redisQueueManager = new RedisQueueManager();

// Export types
export type { JobData, JobResult, QueueMetrics, ProcessorFunction };
