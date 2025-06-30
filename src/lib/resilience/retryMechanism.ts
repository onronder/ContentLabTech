/**
 * Retry Mechanism with Circuit Breaker
 * Production-grade retry logic with exponential backoff and circuit breaker patterns
 * Implements intelligent failure handling and system protection
 */

import {
  AppError,
  ErrorCategory,
  ErrorSeverity /*, createExternalServiceError*/,
} from "../errors/errorHandling";

// ================================================
// Retry Configuration
// ================================================

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  jitter: boolean; // Add random jitter to prevent thundering herd
  retryCondition?: (error: Error) => boolean;
}

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening circuit
  recoveryTimeout: number; // Time to wait before attempting recovery (ms)
  monitoringWindow: number; // Window for monitoring failures (ms)
  minimumCalls: number; // Minimum calls before circuit can open
}

// ================================================
// Circuit Breaker Implementation
// ================================================

enum CircuitState {
  CLOSED = "closed", // Normal operation
  OPEN = "open", // Failing fast
  HALF_OPEN = "half_open", // Testing recovery
}

interface CircuitBreakerMetrics {
  totalCalls: number;
  failureCount: number;
  successCount: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private metrics: CircuitBreakerMetrics = {
    totalCalls: 0,
    failureCount: 0,
    successCount: 0,
  };
  private nextAttemptTime = 0;

  constructor(
    private readonly name: string,
    private readonly config: CircuitBreakerConfig
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        throw new AppError({
          code: "CIRCUIT_BREAKER_OPEN",
          message: `Circuit breaker ${this.name} is open`,
          userMessage:
            "This service is temporarily unavailable. Please try again later.",
          category: ErrorCategory.EXTERNAL_SERVICE,
          severity: ErrorSeverity.HIGH,
          retryable: true,
          retryAfter: Math.ceil((this.nextAttemptTime - Date.now()) / 1000),
          statusCode: 503,
        });
      }

      // Transition to half-open for testing
      this.state = CircuitState.HALF_OPEN;
    }

    this.metrics.totalCalls++;

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.metrics.successCount++;
    this.metrics.lastSuccessTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      // Recovery successful, close circuit
      this.state = CircuitState.CLOSED;
      this.resetMetrics();
    }
  }

  private onFailure(): void {
    this.metrics.failureCount++;
    this.metrics.lastFailureTime = Date.now();

    if (this.shouldOpenCircuit()) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
    }
  }

  private shouldOpenCircuit(): boolean {
    if (this.metrics.totalCalls < this.config.minimumCalls) {
      return false;
    }

    const recentCalls = this.getRecentCalls();
    if (recentCalls < this.config.minimumCalls) {
      return false;
    }

    const failureRate = this.metrics.failureCount / recentCalls;
    return failureRate >= this.config.failureThreshold;
  }

  private getRecentCalls(): number {
    // In a real implementation, this would track calls within the monitoring window
    // For simplicity, we're using total calls
    return this.metrics.totalCalls;
  }

  private resetMetrics(): void {
    this.metrics = {
      totalCalls: 0,
      failureCount: 0,
      successCount: 0,
    };
  }

  getState(): CircuitState {
    return this.state;
  }

  getMetrics(): CircuitBreakerMetrics & { state: CircuitState } {
    return {
      ...this.metrics,
      state: this.state,
    };
  }
}

// ================================================
// Retry Manager
// ================================================

export class RetryManager {
  private circuitBreakers = new Map<string, CircuitBreaker>();

  /**
   * Execute operation with retry logic and circuit breaker protection
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig,
    circuitBreakerName?: string,
    circuitBreakerConfig?: CircuitBreakerConfig
  ): Promise<T> {
    const wrappedOperation = circuitBreakerName
      ? this.wrapWithCircuitBreaker(
          operation,
          circuitBreakerName,
          circuitBreakerConfig
        )
      : operation;

    return this.retryWithBackoff(wrappedOperation, config);
  }

  private wrapWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    name: string,
    config?: CircuitBreakerConfig
  ): () => Promise<T> {
    let circuitBreaker = this.circuitBreakers.get(name);

    if (!circuitBreaker) {
      const defaultConfig: CircuitBreakerConfig = {
        failureThreshold: 0.5, // 50% failure rate
        recoveryTimeout: 60000, // 1 minute
        monitoringWindow: 60000, // 1 minute
        minimumCalls: 10,
      };

      circuitBreaker = new CircuitBreaker(name, config || defaultConfig);
      this.circuitBreakers.set(name, circuitBreaker);
    }

    return () => circuitBreaker!.execute(operation);
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    config: RetryConfig
  ): Promise<T> {
    let lastError: Error;
    let delay = config.initialDelay;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Check if we should retry this error
        if (config.retryCondition && !config.retryCondition(lastError)) {
          throw lastError;
        }

        // Don't retry on last attempt
        if (attempt === config.maxAttempts) {
          break;
        }

        // Calculate delay with jitter
        const actualDelay = config.jitter
          ? delay + Math.random() * delay * 0.1 // Add up to 10% jitter
          : delay;

        await this.sleep(Math.min(actualDelay, config.maxDelay));

        // Increase delay for next attempt
        delay *= config.backoffMultiplier;
      }
    }

    throw lastError!;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get circuit breaker status for monitoring
   */
  getCircuitBreakerStatus(): Record<
    string,
    CircuitBreakerMetrics & { state: CircuitState }
  > {
    const status: Record<
      string,
      CircuitBreakerMetrics & { state: CircuitState }
    > = {};

    for (const [name, breaker] of this.circuitBreakers.entries()) {
      status[name] = breaker.getMetrics();
    }

    return status;
  }

  /**
   * Reset circuit breaker (useful for testing or manual recovery)
   */
  resetCircuitBreaker(name: string): boolean {
    const breaker = this.circuitBreakers.get(name);
    if (breaker) {
      // Create new circuit breaker to reset state
      const newBreaker = new CircuitBreaker(name, {
        failureThreshold: 0.5,
        recoveryTimeout: 60000,
        monitoringWindow: 60000,
        minimumCalls: 10,
      });
      this.circuitBreakers.set(name, newBreaker);
      return true;
    }
    return false;
  }
}

// ================================================
// Default Configurations
// ================================================

export const DEFAULT_RETRY_CONFIGS: Record<string, RetryConfig> = {
  // Database operations
  database: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 5000,
    backoffMultiplier: 2,
    jitter: true,
    retryCondition: error => {
      // Retry on connection errors, timeouts, but not on constraint violations
      const message = error.message.toLowerCase();
      return (
        message.includes("connection") ||
        message.includes("timeout") ||
        message.includes("network") ||
        !message.includes("constraint")
      );
    },
  },

  // External API calls
  external_api: {
    maxAttempts: 4,
    initialDelay: 2000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true,
    retryCondition: error => {
      // Retry on 5xx errors, timeouts, but not on 4xx client errors
      if (error instanceof AppError) {
        return error.details.retryable;
      }
      const message = error.message.toLowerCase();
      return (
        !message.includes("400") &&
        !message.includes("401") &&
        !message.includes("403") &&
        !message.includes("404")
      );
    },
  },

  // File operations
  file_operations: {
    maxAttempts: 2,
    initialDelay: 500,
    maxDelay: 2000,
    backoffMultiplier: 2,
    jitter: false,
    retryCondition: error => {
      const message = error.message.toLowerCase();
      return (
        message.includes("busy") ||
        message.includes("locked") ||
        message.includes("temporary")
      );
    },
  },

  // Analytics processing
  analytics_processing: {
    maxAttempts: 3,
    initialDelay: 5000,
    maxDelay: 60000,
    backoffMultiplier: 3,
    jitter: true,
    retryCondition: error => {
      // Retry on processing errors but not on validation errors
      if (error instanceof AppError) {
        return error.details.category !== ErrorCategory.VALIDATION;
      }
      return true;
    },
  },

  // OpenAI API calls
  openai_api: {
    maxAttempts: 5,
    initialDelay: 1000,
    maxDelay: 32000,
    backoffMultiplier: 2,
    jitter: true,
    retryCondition: error => {
      const message = error.message.toLowerCase();
      // Retry on rate limits and server errors, not on token limits or invalid requests
      return (
        message.includes("rate limit") ||
        message.includes("timeout") ||
        message.includes("server error") ||
        (!message.includes("token") && !message.includes("invalid"))
      );
    },
  },
};

export const DEFAULT_CIRCUIT_BREAKER_CONFIGS: Record<
  string,
  CircuitBreakerConfig
> = {
  // External services
  external_service: {
    failureThreshold: 0.5, // 50% failure rate
    recoveryTimeout: 60000, // 1 minute
    monitoringWindow: 60000, // 1 minute
    minimumCalls: 5,
  },

  // Database
  database: {
    failureThreshold: 0.7, // 70% failure rate (more tolerant)
    recoveryTimeout: 30000, // 30 seconds
    monitoringWindow: 60000, // 1 minute
    minimumCalls: 10,
  },

  // OpenAI API
  openai_api: {
    failureThreshold: 0.6, // 60% failure rate
    recoveryTimeout: 120000, // 2 minutes
    monitoringWindow: 300000, // 5 minutes
    minimumCalls: 3,
  },

  // Analytics processing
  analytics_processing: {
    failureThreshold: 0.4, // 40% failure rate (less tolerant)
    recoveryTimeout: 180000, // 3 minutes
    monitoringWindow: 600000, // 10 minutes
    minimumCalls: 5,
  },
};

// ================================================
// Singleton Retry Manager
// ================================================

export const retryManager = new RetryManager();

// ================================================
// Convenience Functions
// ================================================

/**
 * Retry database operations with appropriate configuration
 */
export async function retryDatabaseOperation<T>(
  operation: () => Promise<T>,
  customConfig?: Partial<RetryConfig>
): Promise<T> {
  const config = {
    ...DEFAULT_RETRY_CONFIGS["database"],
    ...customConfig,
  } as RetryConfig;
  return retryManager.executeWithRetry(
    operation,
    config,
    "database",
    DEFAULT_CIRCUIT_BREAKER_CONFIGS["database"]
  );
}

/**
 * Retry external API calls with appropriate configuration
 */
export async function retryExternalAPI<T>(
  apiName: string,
  operation: () => Promise<T>,
  customConfig?: Partial<RetryConfig>
): Promise<T> {
  const config = {
    ...DEFAULT_RETRY_CONFIGS["external_api"],
    ...customConfig,
  } as RetryConfig;
  return retryManager.executeWithRetry(
    operation,
    config,
    `external_api_${apiName}`,
    DEFAULT_CIRCUIT_BREAKER_CONFIGS["external_service"]
  );
}

/**
 * Retry OpenAI API calls with appropriate configuration
 */
export async function retryOpenAICall<T>(
  operation: () => Promise<T>,
  customConfig?: Partial<RetryConfig>
): Promise<T> {
  const config = {
    ...DEFAULT_RETRY_CONFIGS["openai_api"],
    ...customConfig,
  } as RetryConfig;
  return retryManager.executeWithRetry(
    operation,
    config,
    "openai_api",
    DEFAULT_CIRCUIT_BREAKER_CONFIGS["openai_api"]
  );
}

/**
 * Retry analytics processing with appropriate configuration
 */
export async function retryAnalyticsProcessing<T>(
  jobType: string,
  operation: () => Promise<T>,
  customConfig?: Partial<RetryConfig>
): Promise<T> {
  const config = {
    ...DEFAULT_RETRY_CONFIGS["analytics_processing"],
    ...customConfig,
  } as RetryConfig;
  return retryManager.executeWithRetry(
    operation,
    config,
    `analytics_${jobType}`,
    DEFAULT_CIRCUIT_BREAKER_CONFIGS["analytics_processing"]
  );
}

// ================================================
// Monitoring and Health Checks
// ================================================

export interface SystemHealthStatus {
  circuitBreakers: Record<
    string,
    CircuitBreakerMetrics & { state: CircuitState }
  >;
  healthScore: number; // 0-100
  degradedServices: string[];
  recommendations: string[];
}

export function getSystemHealthStatus(): SystemHealthStatus {
  const circuitBreakers = retryManager.getCircuitBreakerStatus();
  const totalBreakers = Object.keys(circuitBreakers).length;

  if (totalBreakers === 0) {
    return {
      circuitBreakers,
      healthScore: 100,
      degradedServices: [],
      recommendations: [],
    };
  }

  const openBreakers = Object.entries(circuitBreakers).filter(
    ([, metrics]) => metrics.state === CircuitState.OPEN
  );

  const halfOpenBreakers = Object.entries(circuitBreakers).filter(
    ([, metrics]) => metrics.state === CircuitState.HALF_OPEN
  );

  const degradedServices = [
    ...openBreakers.map(([name]) => name),
    ...halfOpenBreakers.map(([name]) => name),
  ];

  const healthScore = Math.max(
    0,
    100 - openBreakers.length * 30 - halfOpenBreakers.length * 15
  );

  const recommendations: string[] = [];
  if (openBreakers.length > 0) {
    recommendations.push(
      `${openBreakers.length} service(s) are currently unavailable. Check external dependencies.`
    );
  }
  if (halfOpenBreakers.length > 0) {
    recommendations.push(
      `${halfOpenBreakers.length} service(s) are recovering. Monitor closely.`
    );
  }
  if (healthScore < 80) {
    recommendations.push(
      "System health is degraded. Consider scaling or checking external services."
    );
  }

  return {
    circuitBreakers,
    healthScore,
    degradedServices,
    recommendations,
  };
}
