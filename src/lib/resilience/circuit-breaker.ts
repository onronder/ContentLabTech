/**
 * Circuit Breaker Implementation
 * Prevents cascading failures by monitoring external service health
 * Implements the Circuit Breaker pattern with automatic recovery
 */

export enum CircuitState {
  CLOSED = "CLOSED",     // Normal operation
  OPEN = "OPEN",         // Circuit is open, requests fail fast
  HALF_OPEN = "HALF_OPEN" // Testing if service has recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number;     // Number of failures to open circuit
  recoveryTimeout: number;      // Time to wait before trying to close circuit (ms)
  monitoringPeriod: number;     // Time window for failure counting (ms)
  halfOpenMaxAttempts: number;  // Max attempts in half-open state
  successThreshold: number;     // Successes needed to close circuit from half-open
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  totalRequests: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  stateChangedAt: number;
  isAvailable: boolean;
}

export interface CircuitBreakerResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  fromCircuitBreaker: boolean;
  state: CircuitState;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private totalRequests = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private stateChangedAt = Date.now();
  private halfOpenAttempts = 0;

  constructor(
    private name: string,
    private config: CircuitBreakerConfig
  ) {
    // Validate configuration
    if (config.failureThreshold <= 0) {
      throw new Error("Failure threshold must be greater than 0");
    }
    if (config.recoveryTimeout <= 0) {
      throw new Error("Recovery timeout must be greater than 0");
    }
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<CircuitBreakerResult<T>> {
    this.totalRequests++;

    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === CircuitState.OPEN && this.shouldAttemptReset()) {
      this.state = CircuitState.HALF_OPEN;
      this.halfOpenAttempts = 0;
      this.stateChangedAt = Date.now();
      console.log(`[CircuitBreaker:${this.name}] Transitioning to HALF_OPEN`);
    }

    // If circuit is OPEN, fail fast
    if (this.state === CircuitState.OPEN) {
      const error = new Error(`Circuit breaker is OPEN for ${this.name}`);
      
      if (fallback) {
        try {
          const fallbackResult = await fallback();
          return {
            success: true,
            data: fallbackResult,
            fromCircuitBreaker: true,
            state: this.state,
          };
        } catch (fallbackError) {
          return {
            success: false,
            error: fallbackError as Error,
            fromCircuitBreaker: true,
            state: this.state,
          };
        }
      }

      return {
        success: false,
        error,
        fromCircuitBreaker: true,
        state: this.state,
      };
    }

    // Execute the operation
    try {
      const result = await this.executeWithTimeout(operation);
      this.onSuccess();
      
      return {
        success: true,
        data: result,
        fromCircuitBreaker: false,
        state: this.state,
      };
    } catch (error) {
      this.onFailure(error as Error);

      if (fallback) {
        try {
          const fallbackResult = await fallback();
          return {
            success: true,
            data: fallbackResult,
            fromCircuitBreaker: true,
            state: this.state,
          };
        } catch (fallbackError) {
          return {
            success: false,
            error: fallbackError as Error,
            fromCircuitBreaker: true,
            state: this.state,
          };
        }
      }

      return {
        success: false,
        error: error as Error,
        fromCircuitBreaker: false,
        state: this.state,
      };
    }
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs = 10000
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      operation()
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.successCount++;
    this.lastSuccessTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenAttempts++;
      
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.stateChangedAt = Date.now();
        console.log(`[CircuitBreaker:${this.name}] Circuit CLOSED - service recovered`);
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success in normal operation
      this.failureCount = 0;
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(error: Error): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    console.warn(`[CircuitBreaker:${this.name}] Operation failed:`, error.message);

    if (this.state === CircuitState.HALF_OPEN) {
      // Return to OPEN state on any failure in HALF_OPEN
      this.state = CircuitState.OPEN;
      this.stateChangedAt = Date.now();
      console.log(`[CircuitBreaker:${this.name}] Returning to OPEN state from HALF_OPEN`);
    } else if (this.state === CircuitState.CLOSED) {
      // Check if we should open the circuit
      if (this.shouldOpenCircuit()) {
        this.state = CircuitState.OPEN;
        this.stateChangedAt = Date.now();
        console.warn(`[CircuitBreaker:${this.name}] Circuit OPENED - failure threshold reached`);
      }
    }
  }

  /**
   * Check if circuit should be opened
   */
  private shouldOpenCircuit(): boolean {
    const now = Date.now();
    const windowStart = now - this.config.monitoringPeriod;

    // Count recent failures (simplified - in production you'd want more sophisticated tracking)
    return this.failureCount >= this.config.failureThreshold;
  }

  /**
   * Check if circuit should attempt to reset from OPEN to HALF_OPEN
   */
  private shouldAttemptReset(): boolean {
    const now = Date.now();
    return now - this.stateChangedAt >= this.config.recoveryTimeout;
  }

  /**
   * Get current metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalRequests: this.totalRequests,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      stateChangedAt: this.stateChangedAt,
      isAvailable: this.state !== CircuitState.OPEN,
    };
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    healthy: boolean;
    status: string;
    metrics: CircuitBreakerMetrics;
  } {
    const metrics = this.getMetrics();
    const healthy = metrics.state !== CircuitState.OPEN;

    let status = "Healthy";
    if (metrics.state === CircuitState.OPEN) {
      status = "Service Unavailable - Circuit Open";
    } else if (metrics.state === CircuitState.HALF_OPEN) {
      status = "Testing Service Recovery";
    } else if (metrics.failureCount > 0) {
      status = "Healthy with Recent Failures";
    }

    return {
      healthy,
      status,
      metrics,
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenAttempts = 0;
    this.stateChangedAt = Date.now();
    console.log(`[CircuitBreaker:${this.name}] Manually reset to CLOSED state`);
  }

  /**
   * Get service name
   */
  getName(): string {
    return this.name;
  }
}

/**
 * Circuit Breaker Manager
 * Manages multiple circuit breakers for different services
 */
export class CircuitBreakerManager {
  private circuitBreakers = new Map<string, CircuitBreaker>();

  /**
   * Create or get a circuit breaker for a service
   */
  getCircuitBreaker(
    serviceName: string,
    config?: Partial<CircuitBreakerConfig>
  ): CircuitBreaker {
    if (!this.circuitBreakers.has(serviceName)) {
      const defaultConfig: CircuitBreakerConfig = {
        failureThreshold: 5,
        recoveryTimeout: 60000,      // 1 minute
        monitoringPeriod: 60000,     // 1 minute
        halfOpenMaxAttempts: 3,
        successThreshold: 2,
      };

      const finalConfig = { ...defaultConfig, ...config };
      const circuitBreaker = new CircuitBreaker(serviceName, finalConfig);
      this.circuitBreakers.set(serviceName, circuitBreaker);
    }

    return this.circuitBreakers.get(serviceName)!;
  }

  /**
   * Get all circuit breakers
   */
  getAllCircuitBreakers(): Map<string, CircuitBreaker> {
    return new Map(this.circuitBreakers);
  }

  /**
   * Get health status for all services
   */
  getOverallHealthStatus(): {
    healthy: boolean;
    services: Record<string, ReturnType<CircuitBreaker["getHealthStatus"]>>;
    summary: {
      total: number;
      healthy: number;
      degraded: number;
      unavailable: number;
    };
  } {
    const services: Record<string, ReturnType<CircuitBreaker["getHealthStatus"]>> = {};
    let healthy = 0;
    let degraded = 0;
    let unavailable = 0;

    for (const [name, circuitBreaker] of this.circuitBreakers) {
      const status = circuitBreaker.getHealthStatus();
      services[name] = status;

      if (status.healthy) {
        if (status.metrics.failureCount > 0) {
          degraded++;
        } else {
          healthy++;
        }
      } else {
        unavailable++;
      }
    }

    const total = this.circuitBreakers.size;
    const overallHealthy = unavailable === 0;

    return {
      healthy: overallHealthy,
      services,
      summary: {
        total,
        healthy,
        degraded,
        unavailable,
      },
    };
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const circuitBreaker of this.circuitBreakers.values()) {
      circuitBreaker.reset();
    }
  }
}

// Export singleton instance
export const circuitBreakerManager = new CircuitBreakerManager();