/**
 * Retry Manager with Exponential Backoff
 * Provides sophisticated retry logic for external service calls
 */

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryableErrors: (error: Error) => boolean;
  onRetry?: (error: Error, attempt: number, nextDelay: number) => void;
  onMaxAttemptsReached?: (error: Error, attempts: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
  retryHistory: {
    attempt: number;
    error: string;
    delay: number;
    timestamp: Date;
  }[];
}

export class RetryManager {
  private defaultConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffMultiplier: 2,
    jitter: true,
    retryableErrors: this.isRetryableError.bind(this),
  };

  private serviceConfigs: Map<string, RetryConfig> = new Map();

  constructor() {
    this.initializeServiceConfigs();
  }

  private initializeServiceConfigs(): void {
    // OpenAI Configuration - More aggressive retries for transient failures
    this.serviceConfigs.set("openai", {
      maxAttempts: 4,
      baseDelay: 2000, // 2 seconds
      maxDelay: 16000, // 16 seconds
      backoffMultiplier: 2,
      jitter: true,
      retryableErrors: (error: Error) => {
        const errorMessage = error.message.toLowerCase();
        return (
          errorMessage.includes("timeout") ||
          errorMessage.includes("rate limit") ||
          errorMessage.includes("server error") ||
          errorMessage.includes("502") ||
          errorMessage.includes("503") ||
          errorMessage.includes("504") ||
          errorMessage.includes("connection") ||
          errorMessage.includes("network")
        );
      },
      onRetry: (error: Error, attempt: number, nextDelay: number) => {
        console.warn(`OpenAI retry attempt ${attempt} after ${nextDelay}ms: ${error.message}`);
      }
    });

    // SERPAPI Configuration - Conservative retries for search API
    this.serviceConfigs.set("serpapi", {
      maxAttempts: 3,
      baseDelay: 3000, // 3 seconds
      maxDelay: 15000, // 15 seconds
      backoffMultiplier: 2,
      jitter: true,
      retryableErrors: (error: Error) => {
        const errorMessage = error.message.toLowerCase();
        return (
          errorMessage.includes("timeout") ||
          errorMessage.includes("rate limit") ||
          errorMessage.includes("server error") ||
          errorMessage.includes("502") ||
          errorMessage.includes("503") ||
          errorMessage.includes("504") ||
          (errorMessage.includes("429") && !errorMessage.includes("quota")) // Rate limit but not quota exceeded
        );
      },
      onRetry: (error: Error, attempt: number, nextDelay: number) => {
        console.warn(`SERPAPI retry attempt ${attempt} after ${nextDelay}ms: ${error.message}`);
      }
    });

    // Supabase Configuration - Fast retries for database operations
    this.serviceConfigs.set("supabase", {
      maxAttempts: 3,
      baseDelay: 500, // 500ms
      maxDelay: 5000, // 5 seconds
      backoffMultiplier: 2.5,
      jitter: true,
      retryableErrors: (error: Error) => {
        const errorMessage = error.message.toLowerCase();
        return (
          errorMessage.includes("timeout") ||
          errorMessage.includes("connection") ||
          errorMessage.includes("network") ||
          errorMessage.includes("temporarily unavailable") ||
          errorMessage.includes("502") ||
          errorMessage.includes("503") ||
          errorMessage.includes("504")
        );
      },
      onRetry: (error: Error, attempt: number, nextDelay: number) => {
        console.warn(`Supabase retry attempt ${attempt} after ${nextDelay}ms: ${error.message}`);
      }
    });

    // Redis Configuration - Quick retries for cache operations
    this.serviceConfigs.set("redis", {
      maxAttempts: 2,
      baseDelay: 100, // 100ms
      maxDelay: 1000, // 1 second
      backoffMultiplier: 3,
      jitter: false, // Faster, predictable retries for cache
      retryableErrors: (error: Error) => {
        const errorMessage = error.message.toLowerCase();
        return (
          errorMessage.includes("connection") ||
          errorMessage.includes("timeout") ||
          errorMessage.includes("econnreset") ||
          errorMessage.includes("econnrefused")
        );
      },
      onRetry: (error: Error, attempt: number, nextDelay: number) => {
        console.warn(`Redis retry attempt ${attempt} after ${nextDelay}ms: ${error.message}`);
      }
    });

    // External APIs Configuration - General web service retries
    this.serviceConfigs.set("external-api", {
      maxAttempts: 3,
      baseDelay: 1500, // 1.5 seconds
      maxDelay: 12000, // 12 seconds
      backoffMultiplier: 2,
      jitter: true,
      retryableErrors: (error: Error) => {
        const errorMessage = error.message.toLowerCase();
        return (
          errorMessage.includes("timeout") ||
          errorMessage.includes("network") ||
          errorMessage.includes("502") ||
          errorMessage.includes("503") ||
          errorMessage.includes("504") ||
          errorMessage.includes("econnreset") ||
          errorMessage.includes("enotfound")
        );
      },
      onRetry: (error: Error, attempt: number, nextDelay: number) => {
        console.warn(`External API retry attempt ${attempt} after ${nextDelay}ms: ${error.message}`);
      }
    });
  }

  /**
   * Execute an operation with retry logic
   */
  async executeWithRetry<T>(
    serviceName: string,
    operation: () => Promise<T>,
    customConfig?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const config = this.getEffectiveConfig(serviceName, customConfig);
    const startTime = Date.now();
    const retryHistory: RetryResult<T>["retryHistory"] = [];

    let lastError: Error = new Error("Unknown error");
    let attempt = 0;

    while (attempt < config.maxAttempts) {
      attempt++;

      try {
        const result = await operation();
        
        return {
          success: true,
          result,
          attempts: attempt,
          totalTime: Date.now() - startTime,
          retryHistory
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Check if this error is retryable
        if (!config.retryableErrors(lastError)) {
          return {
            success: false,
            error: lastError,
            attempts: attempt,
            totalTime: Date.now() - startTime,
            retryHistory
          };
        }

        // If this is the last attempt, don't retry
        if (attempt >= config.maxAttempts) {
          break;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, config);
        
        // Add to retry history
        retryHistory.push({
          attempt,
          error: lastError.message,
          delay,
          timestamp: new Date()
        });

        // Call retry callback if provided
        config.onRetry?.(lastError, attempt, delay);

        // Wait before retrying
        await this.sleep(delay);
      }
    }

    // All attempts failed
    config.onMaxAttemptsReached?.(lastError, attempt);

    return {
      success: false,
      error: lastError,
      attempts: attempt,
      totalTime: Date.now() - startTime,
      retryHistory
    };
  }

  /**
   * Execute multiple operations with retry, returning successful results
   */
  async executeMultipleWithRetry<T>(
    serviceName: string,
    operations: (() => Promise<T>)[],
    customConfig?: Partial<RetryConfig> & {
      failFast?: boolean; // Stop on first failure
      minSuccessCount?: number; // Minimum successful operations required
    }
  ): Promise<{
    successful: T[];
    failed: Error[];
    totalAttempts: number;
    totalTime: number;
  }> {
    const startTime = Date.now();
    const successful: T[] = [];
    const failed: Error[] = [];
    let totalAttempts = 0;

    for (let i = 0; i < operations.length; i++) {
      const result = await this.executeWithRetry(serviceName, operations[i], customConfig);
      totalAttempts += result.attempts;

      if (result.success && result.result !== undefined) {
        successful.push(result.result);
      } else if (result.error) {
        failed.push(result.error);
        
        // Stop if failFast is enabled
        if (customConfig?.failFast) {
          break;
        }
      }

      // Check if we've met minimum success requirement
      if (customConfig?.minSuccessCount && successful.length >= customConfig.minSuccessCount) {
        break;
      }
    }

    return {
      successful,
      failed,
      totalAttempts,
      totalTime: Date.now() - startTime
    };
  }

  /**
   * Create a retry wrapper for a function
   */
  createRetryWrapper<T extends unknown[], R>(
    serviceName: string,
    fn: (...args: T) => Promise<R>,
    customConfig?: Partial<RetryConfig>
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      const result = await this.executeWithRetry(
        serviceName,
        () => fn(...args),
        customConfig
      );

      if (result.success && result.result !== undefined) {
        return result.result;
      }

      throw result.error || new Error("Retry operation failed");
    };
  }

  /**
   * Get retry statistics for a service
   */
  getRetryStats(serviceName: string): {
    config: RetryConfig;
    estimatedMaxTime: number;
    estimatedTotalDelays: number;
  } {
    const config = this.getEffectiveConfig(serviceName);
    let totalDelay = 0;
    let currentDelay = config.baseDelay;

    // Calculate estimated total time if all retries are used
    for (let attempt = 1; attempt < config.maxAttempts; attempt++) {
      totalDelay += currentDelay;
      currentDelay = Math.min(
        currentDelay * config.backoffMultiplier,
        config.maxDelay
      );
    }

    return {
      config,
      estimatedMaxTime: totalDelay,
      estimatedTotalDelays: totalDelay
    };
  }

  /**
   * Test retry configuration with a mock operation
   */
  async testRetryConfig(
    serviceName: string,
    failureCount: number = 2,
    customConfig?: Partial<RetryConfig>
  ): Promise<RetryResult<string>> {
    let attemptCount = 0;

    const mockOperation = async (): Promise<string> => {
      attemptCount++;
      if (attemptCount <= failureCount) {
        throw new Error(`Mock failure attempt ${attemptCount}`);
      }
      return `Success after ${attemptCount} attempts`;
    };

    return this.executeWithRetry(serviceName, mockOperation, customConfig);
  }

  private getEffectiveConfig(
    serviceName: string,
    customConfig?: Partial<RetryConfig>
  ): RetryConfig {
    const serviceConfig = this.serviceConfigs.get(serviceName) || this.defaultConfig;
    
    if (!customConfig) {
      return serviceConfig;
    }

    return {
      ...serviceConfig,
      ...customConfig,
      // Merge retryableErrors function if both exist
      retryableErrors: customConfig.retryableErrors || serviceConfig.retryableErrors
    };
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    // Calculate base delay with exponential backoff
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    
    // Apply maximum delay cap
    delay = Math.min(delay, config.maxDelay);
    
    // Add jitter if enabled (±25% randomization)
    if (config.jitter) {
      const jitterRange = delay * 0.25;
      const jitterOffset = (Math.random() - 0.5) * 2 * jitterRange;
      delay += jitterOffset;
      delay = Math.max(delay, 0); // Ensure non-negative
    }
    
    return Math.round(delay);
  }

  private isRetryableError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    
    // Common retryable error patterns
    const retryablePatterns = [
      "timeout",
      "network",
      "connection",
      "502", "503", "504", // Server errors
      "econnreset",
      "econnrefused",
      "enotfound",
      "rate limit",
      "temporarily unavailable"
    ];

    return retryablePatterns.some(pattern => errorMessage.includes(pattern));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update service configuration
   */
  updateServiceConfig(serviceName: string, config: Partial<RetryConfig>): void {
    const currentConfig = this.serviceConfigs.get(serviceName) || this.defaultConfig;
    this.serviceConfigs.set(serviceName, { ...currentConfig, ...config });
  }

  /**
   * Get all service configurations
   */
  getAllConfigs(): Record<string, RetryConfig> {
    const configs: Record<string, RetryConfig> = {};
    for (const [serviceName, config] of this.serviceConfigs) {
      configs[serviceName] = config;
    }
    return configs;
  }
}

// Export singleton instance
export const retryManager = new RetryManager();

// Utility function for quick retries
export async function withRetry<T>(
  serviceName: string,
  operation: () => Promise<T>,
  config?: Partial<RetryConfig>
): Promise<T> {
  const result = await retryManager.executeWithRetry(serviceName, operation, config);
  
  if (result.success && result.result !== undefined) {
    return result.result;
  }
  
  throw result.error || new Error("Retry operation failed");
}

// Decorator for automatic retry
export function retry(serviceName: string, config?: Partial<RetryConfig>) {
  return function <T extends unknown[], R>(
    target: unknown,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<(...args: T) => Promise<R>>
  ) {
    const method = descriptor.value;
    if (!method) return;

    descriptor.value = async function (...args: T): Promise<R> {
      const result = await retryManager.executeWithRetry(
        serviceName,
        () => method.apply(this, args),
        config
      );

      if (result.success && result.result !== undefined) {
        return result.result;
      }

      throw result.error || new Error("Retry operation failed");
    };
  };
}