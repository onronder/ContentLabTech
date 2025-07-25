/**
 * Enterprise Resilience Framework
 * Comprehensive failure handling with circuit breakers, retries, bulkheads, and graceful degradation
 */

import { EventEmitter } from "events";
import { enterpriseLogger } from "../monitoring/enterprise-logger";
import { enterpriseAlertingSystem } from "../monitoring/enterprise-alerting";
import { distributedTracer } from "../monitoring/distributed-tracing";
import { circuitBreakerManager } from "./circuit-breaker";
import { performance } from "perf_hooks";

// Enhanced resilience patterns
export interface ResilienceConfig {
  serviceName: string;
  circuitBreaker?: CircuitBreakerOptions;
  retry?: RetryOptions;
  timeout?: TimeoutOptions;
  bulkhead?: BulkheadOptions;
  fallback?: FallbackOptions;
  degradation?: DegradationOptions;
  monitoring?: MonitoringOptions;
}

export interface CircuitBreakerOptions {
  enabled: boolean;
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  volumeThreshold: number;
  errorFilter?: (error: Error) => boolean;
}

export interface RetryOptions {
  enabled: boolean;
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryableErrors?: (error: Error) => boolean;
}

export interface TimeoutOptions {
  enabled: boolean;
  duration: number;
  onTimeout?: () => void;
}

export interface BulkheadOptions {
  enabled: boolean;
  maxConcurrentCalls: number;
  maxQueueSize: number;
  queueTimeout: number;
}

export interface FallbackOptions {
  enabled: boolean;
  strategy: "cache" | "default" | "alternative" | "custom";
  cacheKey?: string;
  defaultValue?: any;
  alternativeService?: () => Promise<any>;
  customFallback?: (error: Error) => Promise<any>;
}

export interface DegradationOptions {
  enabled: boolean;
  triggers: DegradationTrigger[];
  levels: DegradationLevel[];
  autoRecover: boolean;
  recoveryCriteria: RecoveryCriteria;
}

export interface MonitoringOptions {
  enabled: boolean;
  tracing: boolean;
  metrics: boolean;
  alerts: boolean;
  logLevel: "debug" | "info" | "warn" | "error";
}

export interface DegradationTrigger {
  type: "error_rate" | "response_time" | "resource_usage" | "external_signal";
  threshold: number;
  window: number; // time window in ms
  metric: string;
}

export interface DegradationLevel {
  level: number;
  name: string;
  features: string[];
  actions: DegradationAction[];
}

export interface DegradationAction {
  type: "disable_feature" | "reduce_quality" | "limit_requests" | "use_cache" | "custom";
  parameters: Record<string, any>;
  executor?: (parameters: Record<string, any>) => Promise<void>;
}

export interface RecoveryCriteria {
  healthyDuration: number; // Duration service must be healthy before recovery
  successRate: number; // Minimum success rate for recovery
  responseTime: number; // Maximum response time for recovery
}

// Resilience execution context
export interface ResilienceContext {
  operationName: string;
  correlationId?: string;
  traceId?: string;
  metadata?: Record<string, any>;
  businessContext?: {
    criticality: "low" | "medium" | "high" | "critical";
    userTier: "free" | "premium" | "enterprise";
    feature: string;
  };
}

// Resilience result
export interface ResilienceResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  executionPath: ExecutionStep[];
  totalDuration: number;
  attempts: number;
  fallbackUsed: boolean;
  degradationApplied?: string;
  circuitBreakerState?: string;
}

export interface ExecutionStep {
  step: "operation" | "retry" | "fallback" | "circuit_breaker" | "timeout" | "bulkhead";
  status: "success" | "failure" | "skipped";
  duration: number;
  details?: any;
}

// Enterprise Resilience Manager
export class EnterpriseResilienceManager extends EventEmitter {
  private services: Map<string, ResilienceConfig> = new Map();
  private degradationState: Map<string, DegradationLevel> = new Map();
  private activeCalls: Map<string, number> = new Map();
  private callQueues: Map<string, Array<QueuedCall>> = new Map();
  private fallbackCache: Map<string, CachedValue> = new Map();
  private healthMetrics: Map<string, ServiceHealthMetrics> = new Map();

  constructor() {
    super();
    this.startHealthMonitoring();
    this.startDegradationMonitoring();
  }

  /**
   * Register a service with resilience configuration
   */
  registerService(serviceName: string, config: ResilienceConfig): void {
    this.services.set(serviceName, {
      serviceName,
      circuitBreaker: {
        enabled: true,
        failureThreshold: 50, // 50% failure rate
        successThreshold: 3,
        timeout: 60000,
        volumeThreshold: 10,
        ...config.circuitBreaker,
      },
      retry: {
        enabled: true,
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        jitter: true,
        ...config.retry,
      },
      timeout: {
        enabled: true,
        duration: 30000,
        ...config.timeout,
      },
      bulkhead: {
        enabled: false,
        maxConcurrentCalls: 10,
        maxQueueSize: 50,
        queueTimeout: 5000,
        ...config.bulkhead,
      },
      fallback: {
        enabled: false,
        strategy: "cache",
        ...config.fallback,
      },
      degradation: {
        enabled: false,
        triggers: [],
        levels: [],
        autoRecover: true,
        recoveryCriteria: {
          healthyDuration: 300000, // 5 minutes
          successRate: 95,
          responseTime: 1000,
        },
        ...config.degradation,
      },
      monitoring: {
        enabled: true,
        tracing: true,
        metrics: true,
        alerts: true,
        logLevel: "info",
        ...config.monitoring,
      },
    });

    // Initialize service state
    this.activeCalls.set(serviceName, 0);
    this.callQueues.set(serviceName, []);
    this.healthMetrics.set(serviceName, {
      successRate: 100,
      averageResponseTime: 0,
      errorRate: 0,
      lastUpdated: Date.now(),
      requestCount: 0,
      errorCount: 0,
    });

    enterpriseLogger.info(
      "Service registered with resilience framework",
      { serviceName, config },
      ["resilience", "registration"]
    );
  }

  /**
   * Execute operation with full resilience protection
   */
  async executeWithResilience<T>(
    serviceName: string,
    operation: () => Promise<T>,
    context: ResilienceContext
  ): Promise<ResilienceResult<T>> {
    const startTime = performance.now();
    const executionPath: ExecutionStep[] = [];
    let attempts = 0;
    let fallbackUsed = false;
    let degradationApplied: string | undefined;

    const config = this.services.get(serviceName);
    if (!config) {
      throw new Error(`Service ${serviceName} not registered with resilience framework`);
    }

    // Start distributed tracing if enabled
    let traceId: string | undefined;
    if (config.monitoring?.tracing) {
      traceId = distributedTracer.startTrace(
        context.operationName,
        serviceName,
        context.traceId,
        {
          correlationId: context.correlationId,
          businessContext: context.businessContext,
        }
      ).context.traceId;
    }

    try {
      // Check degradation state
      const degradationLevel = this.degradationState.get(serviceName);
      if (degradationLevel) {
        degradationApplied = degradationLevel.name;
        
        // Apply degradation actions
        await this.applyDegradationActions(degradationLevel, context);
      }

      // Apply bulkhead if enabled
      if (config.bulkhead?.enabled) {
        await this.applyBulkhead(serviceName, config.bulkhead);
      }

      // Get circuit breaker
      const circuitBreaker = circuitBreakerManager.getCircuitBreaker(
        serviceName,
        config.circuitBreaker
      );

      // Execute with retry logic
      const result = await this.executeWithRetry(
        async () => {
          attempts++;
          
          // Apply timeout if enabled
          if (config.timeout?.enabled) {
            return await this.executeWithTimeout(
              operation,
              config.timeout.duration,
              config.timeout.onTimeout
            );
          }
          
          return await operation();
        },
        config.retry!,
        executionPath
      );

      // Record success
      this.recordSuccess(serviceName, performance.now() - startTime);
      
      if (traceId) {
        distributedTracer.finishTrace(traceId, "ok");
      }

      return {
        success: true,
        data: result,
        executionPath,
        totalDuration: performance.now() - startTime,
        attempts,
        fallbackUsed,
        degradationApplied,
        circuitBreakerState: circuitBreaker.getMetrics().state,
      };

    } catch (error) {
      // Try fallback if configured
      if (config.fallback?.enabled) {
        try {
          const fallbackResult = await this.executeFallback(
            serviceName,
            config.fallback,
            error as Error,
            context
          );
          
          fallbackUsed = true;
          
          executionPath.push({
            step: "fallback",
            status: "success",
            duration: performance.now() - startTime,
            details: { strategy: config.fallback.strategy },
          });

          if (traceId) {
            distributedTracer.addTraceLog(traceId, "warn", "Fallback executed", {
              strategy: config.fallback.strategy,
              originalError: (error as Error).message,
            });
            distributedTracer.finishTrace(traceId, "ok");
          }

          return {
            success: true,
            data: fallbackResult,
            executionPath,
            totalDuration: performance.now() - startTime,
            attempts,
            fallbackUsed,
            degradationApplied,
            circuitBreakerState: circuitBreakerManager.getCircuitBreaker(serviceName).getMetrics().state,
          };

        } catch (fallbackError) {
          executionPath.push({
            step: "fallback",
            status: "failure",
            duration: performance.now() - startTime,
            details: { error: (fallbackError as Error).message },
          });
        }
      }

      // Record failure
      this.recordFailure(serviceName, performance.now() - startTime, error as Error);
      
      if (traceId) {
        distributedTracer.finishTrace(traceId, "error", error as Error);
      }

      return {
        success: false,
        error: error as Error,
        executionPath,
        totalDuration: performance.now() - startTime,
        attempts,
        fallbackUsed,
        degradationApplied,
        circuitBreakerState: circuitBreakerManager.getCircuitBreaker(serviceName).getMetrics().state,
      };

    } finally {
      // Release bulkhead resources
      if (config.bulkhead?.enabled) {
        this.releaseBulkhead(serviceName);
      }
    }
  }

  /**
   * Get service health metrics
   */
  getServiceHealth(serviceName: string): ServiceHealthMetrics | undefined {
    return this.healthMetrics.get(serviceName);
  }

  /**
   * Get all services health
   */
  getAllServiceHealth(): Record<string, ServiceHealthMetrics> {
    const health: Record<string, ServiceHealthMetrics> = {};
    
    for (const [name, metrics] of this.healthMetrics.entries()) {
      health[name] = metrics;
    }
    
    return health;
  }

  /**
   * Trigger manual degradation
   */
  async triggerDegradation(serviceName: string, level: number, reason: string): Promise<void> {
    const config = this.services.get(serviceName);
    if (!config?.degradation?.enabled) return;

    const degradationLevel = config.degradation.levels.find(l => l.level === level);
    if (!degradationLevel) return;

    this.degradationState.set(serviceName, degradationLevel);

    await enterpriseAlertingSystem.createAlert({
      title: `Service Degradation Triggered: ${serviceName}`,
      description: `Service ${serviceName} degraded to level ${level}: ${degradationLevel.name}`,
      severity: level >= 3 ? "critical" : level >= 2 ? "warning" : "info",
      source: "resilience",
      category: "degradation",
      tags: ["degradation", "manual", serviceName],
      metadata: {
        serviceName,
        degradationLevel: level,
        reason,
        features: degradationLevel.features,
      },
    });

    enterpriseLogger.warn(
      "Manual service degradation triggered",
      {
        serviceName,
        level,
        degradationLevel: degradationLevel.name,
        reason,
      },
      ["resilience", "degradation", "manual"]
    );

    this.emit("degradationTriggered", {
      serviceName,
      level: degradationLevel,
      reason,
      manual: true,
    });
  }

  /**
   * Recover from degradation
   */
  async recoverFromDegradation(serviceName: string, reason: string): Promise<void> {
    if (!this.degradationState.has(serviceName)) return;

    const previousLevel = this.degradationState.get(serviceName);
    this.degradationState.delete(serviceName);

    enterpriseLogger.info(
      "Service recovered from degradation",
      {
        serviceName,
        previousLevel: previousLevel?.name,
        reason,
      },
      ["resilience", "degradation", "recovery"]
    );

    this.emit("degradationRecovered", {
      serviceName,
      previousLevel,
      reason,
    });
  }

  // Private methods
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retryConfig: RetryOptions,
    executionPath: ExecutionStep[]
  ): Promise<T> {
    if (!retryConfig.enabled) {
      const startTime = performance.now();
      
      try {
        const result = await operation();
        
        executionPath.push({
          step: "operation",
          status: "success",
          duration: performance.now() - startTime,
        });
        
        return result;
      } catch (error) {
        executionPath.push({
          step: "operation",
          status: "failure",
          duration: performance.now() - startTime,
          details: { error: (error as Error).message },
        });
        
        throw error;
      }
    }

    let lastError: Error;
    
    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      const stepStartTime = performance.now();
      
      try {
        const result = await operation();
        
        executionPath.push({
          step: attempt === 1 ? "operation" : "retry",
          status: "success",
          duration: performance.now() - stepStartTime,
          details: { attempt },
        });
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        executionPath.push({
          step: attempt === 1 ? "operation" : "retry",
          status: "failure",
          duration: performance.now() - stepStartTime,
          details: { attempt, error: lastError.message },
        });

        // Check if error is retryable
        if (retryConfig.retryableErrors && !retryConfig.retryableErrors(lastError)) {
          break;
        }

        // Don't delay after last attempt
        if (attempt < retryConfig.maxAttempts) {
          const delay = this.calculateRetryDelay(attempt, retryConfig);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    onTimeout?: () => void
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        onTimeout?.();
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      operation()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private calculateRetryDelay(attempt: number, config: RetryOptions): number {
    const exponentialDelay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    const cappedDelay = Math.min(exponentialDelay, config.maxDelay);
    
    if (config.jitter) {
      return cappedDelay * (0.5 + Math.random() * 0.5);
    }
    
    return cappedDelay;
  }

  private async applyBulkhead(serviceName: string, config: BulkheadOptions): Promise<void> {
    const activeCalls = this.activeCalls.get(serviceName) || 0;
    
    if (activeCalls >= config.maxConcurrentCalls) {
      const queue = this.callQueues.get(serviceName) || [];
      
      if (queue.length >= config.maxQueueSize) {
        throw new Error(`Bulkhead queue full for service ${serviceName}`);
      }

      return new Promise((resolve, reject) => {
        queue.push({
          resolve,
          reject,
          timestamp: Date.now(),
          timeout: setTimeout(() => {
            reject(new Error(`Request timed out in bulkhead queue for ${serviceName}`));
          }, config.queueTimeout),
        });
      });
    }

    this.activeCalls.set(serviceName, activeCalls + 1);
  }

  private releaseBulkhead(serviceName: string): void {
    const activeCalls = this.activeCalls.get(serviceName) || 0;
    this.activeCalls.set(serviceName, Math.max(0, activeCalls - 1));

    // Process queue
    const queue = this.callQueues.get(serviceName) || [];
    if (queue.length > 0) {
      const call = queue.shift();
      if (call) {
        clearTimeout(call.timeout);
        call.resolve();
      }
    }
  }

  private async executeFallback<T>(
    serviceName: string,
    config: FallbackOptions,
    error: Error,
    context: ResilienceContext
  ): Promise<T> {
    switch (config.strategy) {
      case "cache":
        return this.getCachedFallback(config.cacheKey || serviceName);
      
      case "default":
        if (config.defaultValue !== undefined) {
          return config.defaultValue;
        }
        break;
      
      case "alternative":
        if (config.alternativeService) {
          return await config.alternativeService();
        }
        break;
      
      case "custom":
        if (config.customFallback) {
          return await config.customFallback(error);
        }
        break;
    }

    throw new Error(`No fallback available for strategy: ${config.strategy}`);
  }

  private getCachedFallback<T>(cacheKey: string): T {
    const cached = this.fallbackCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.value;
    }
    
    throw new Error(`No valid cached fallback for key: ${cacheKey}`);
  }

  private async applyDegradationActions(
    level: DegradationLevel,
    context: ResilienceContext
  ): Promise<void> {
    for (const action of level.actions) {
      try {
        if (action.executor) {
          await action.executor(action.parameters);
        } else {
          await this.executeBuiltinDegradationAction(action, context);
        }
      } catch (error) {
        enterpriseLogger.error(
          "Failed to apply degradation action",
          error as Error,
          { action: action.type, level: level.name }
        );
      }
    }
  }

  private async executeBuiltinDegradationAction(
    action: DegradationAction,
    context: ResilienceContext
  ): Promise<void> {
    switch (action.type) {
      case "disable_feature":
        // Implementation depends on your feature flag system
        break;
      
      case "reduce_quality":
        // Reduce quality parameters
        break;
      
      case "limit_requests":
        // Apply rate limiting
        break;
      
      case "use_cache":
        // Force cache usage
        break;
    }
  }

  private recordSuccess(serviceName: string, duration: number): void {
    const metrics = this.healthMetrics.get(serviceName);
    if (metrics) {
      metrics.requestCount++;
      metrics.averageResponseTime = 
        (metrics.averageResponseTime * (metrics.requestCount - 1) + duration) / metrics.requestCount;
      metrics.successRate = ((metrics.requestCount - metrics.errorCount) / metrics.requestCount) * 100;
      metrics.errorRate = (metrics.errorCount / metrics.requestCount) * 100;
      metrics.lastUpdated = Date.now();
    }
  }

  private recordFailure(serviceName: string, duration: number, error: Error): void {
    const metrics = this.healthMetrics.get(serviceName);
    if (metrics) {
      metrics.requestCount++;
      metrics.errorCount++;
      metrics.averageResponseTime = 
        (metrics.averageResponseTime * (metrics.requestCount - 1) + duration) / metrics.requestCount;
      metrics.successRate = ((metrics.requestCount - metrics.errorCount) / metrics.requestCount) * 100;
      metrics.errorRate = (metrics.errorCount / metrics.requestCount) * 100;
      metrics.lastUpdated = Date.now();
    }
  }

  private startHealthMonitoring(): void {
    setInterval(() => {
      this.updateHealthMetrics();
    }, 60000); // Every minute
  }

  private startDegradationMonitoring(): void {
    setInterval(() => {
      this.checkDegradationTriggers();
      this.checkRecoveryCriteria();
    }, 30000); // Every 30 seconds
  }

  private updateHealthMetrics(): void {
    for (const [serviceName, metrics] of this.healthMetrics.entries()) {
      enterpriseLogger.performance(
        "Service health metrics",
        { duration: metrics.averageResponseTime },
        {
          serviceName,
          successRate: metrics.successRate,
          errorRate: metrics.errorRate,
          requestCount: metrics.requestCount,
        }
      );
    }
  }

  private async checkDegradationTriggers(): Promise<void> {
    for (const [serviceName, config] of this.services.entries()) {
      if (!config.degradation?.enabled || this.degradationState.has(serviceName)) {
        continue;
      }

      const metrics = this.healthMetrics.get(serviceName);
      if (!metrics) continue;

      for (const trigger of config.degradation.triggers) {
        if (this.shouldTriggerDegradation(trigger, metrics)) {
          const level = config.degradation.levels.find(l => l.level === 1);
          if (level) {
            this.degradationState.set(serviceName, level);
            
            await enterpriseAlertingSystem.createAlert({
              title: `Automatic Service Degradation: ${serviceName}`,
              description: `Service ${serviceName} automatically degraded due to ${trigger.type} threshold`,
              severity: "warning",
              source: "resilience",
              category: "degradation",
              tags: ["degradation", "automatic", serviceName],
              metadata: {
                serviceName,
                trigger: trigger.type,
                threshold: trigger.threshold,
                currentValue: this.getTriggerValue(trigger, metrics),
              },
            });

            this.emit("degradationTriggered", {
              serviceName,
              level,
              reason: `${trigger.type} threshold exceeded`,
              manual: false,
            });
          }
        }
      }
    }
  }

  private shouldTriggerDegradation(trigger: DegradationTrigger, metrics: ServiceHealthMetrics): boolean {
    const value = this.getTriggerValue(trigger, metrics);
    return value > trigger.threshold;
  }

  private getTriggerValue(trigger: DegradationTrigger, metrics: ServiceHealthMetrics): number {
    switch (trigger.type) {
      case "error_rate":
        return metrics.errorRate;
      case "response_time":
        return metrics.averageResponseTime;
      default:
        return 0;
    }
  }

  private async checkRecoveryCriteria(): Promise<void> {
    for (const [serviceName, level] of this.degradationState.entries()) {
      const config = this.services.get(serviceName);
      if (!config?.degradation?.autoRecover) continue;

      const metrics = this.healthMetrics.get(serviceName);
      if (!metrics) continue;

      const criteria = config.degradation.recoveryCriteria;
      
      if (
        metrics.successRate >= criteria.successRate &&
        metrics.averageResponseTime <= criteria.responseTime &&
        Date.now() - metrics.lastUpdated < criteria.healthyDuration
      ) {
        await this.recoverFromDegradation(serviceName, "automatic recovery");
      }
    }
  }
}

// Types for internal use
interface QueuedCall {
  resolve: () => void;
  reject: (error: Error) => void;
  timestamp: number;
  timeout: NodeJS.Timeout;
}

interface CachedValue {
  value: any;
  timestamp: number;
  ttl: number;
}

interface ServiceHealthMetrics {
  successRate: number;
  averageResponseTime: number;
  errorRate: number;
  lastUpdated: number;
  requestCount: number;
  errorCount: number;
}

// Export singleton instance
export const enterpriseResilienceManager = new EnterpriseResilienceManager();

// Global access
if (typeof globalThis !== "undefined") {
  globalThis.EnterpriseResilienceManager = enterpriseResilienceManager;
}