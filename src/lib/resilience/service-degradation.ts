/**
 * Service Degradation Manager
 * Provides graceful degradation when external services are unavailable
 */

export enum ServiceStatus {
  HEALTHY = "healthy",
  DEGRADED = "degraded",
  UNAVAILABLE = "unavailable"
}

export interface ServiceState {
  status: ServiceStatus;
  lastCheck: Date;
  consecutiveFailures: number;
  lastError?: string;
  degradedFeatures?: string[];
}

export interface DegradationConfig {
  maxFailures: number;
  checkInterval: number;
  degradedThreshold: number;
  unavailableThreshold: number;
  enabledFeatures: string[];
  degradedFeatures: string[];
  fallbackData?: Record<string, unknown>;
}

export class ServiceDegradationManager {
  private services: Map<string, ServiceState> = new Map();
  private configs: Map<string, DegradationConfig> = new Map();
  private checkIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeDefaultConfigs();
  }

  private initializeDefaultConfigs(): void {
    // OpenAI Service Configuration
    this.configs.set("openai", {
      maxFailures: 3,
      checkInterval: 30000, // 30 seconds
      degradedThreshold: 2,
      unavailableThreshold: 5,
      enabledFeatures: [
        "content-analysis",
        "keyword-strategy",
        "competitor-analysis",
        "content-improvements"
      ],
      degradedFeatures: [
        "content-analysis", // Reduced complexity
        "keyword-strategy"  // Basic recommendations only
      ],
      fallbackData: {
        contentAnalysis: {
          overallScore: 75,
          recommendations: [
            {
              type: "content",
              priority: "medium",
              impact: "medium",
              effort: "low",
              title: "Basic SEO Optimization",
              description: "AI analysis temporarily unavailable. Please review content manually for SEO best practices."
            }
          ]
        }
      }
    });

    // SERPAPI Service Configuration
    this.configs.set("serpapi", {
      maxFailures: 2,
      checkInterval: 60000, // 1 minute
      degradedThreshold: 1,
      unavailableThreshold: 3,
      enabledFeatures: [
        "competitor-rankings",
        "keyword-research",
        "search-analytics",
        "trending-keywords"
      ],
      degradedFeatures: [
        "competitor-rankings" // Limited data only
      ],
      fallbackData: {
        searchResults: {
          organicResults: [],
          totalResults: 0,
          message: "Search data temporarily unavailable"
        }
      }
    });

    // Supabase Service Configuration
    this.configs.set("supabase", {
      maxFailures: 2,
      checkInterval: 15000, // 15 seconds
      degradedThreshold: 1,
      unavailableThreshold: 3,
      enabledFeatures: [
        "database-queries",
        "realtime-updates",
        "file-storage",
        "auth-operations"
      ],
      degradedFeatures: [
        "realtime-updates", // Disable realtime, use polling
        "file-storage"      // Disable file uploads
      ]
    });

    // Initialize service states
    for (const [serviceName] of this.configs) {
      this.services.set(serviceName, {
        status: ServiceStatus.HEALTHY,
        lastCheck: new Date(),
        consecutiveFailures: 0
      });
    }
  }

  /**
   * Record a service failure
   */
  recordFailure(serviceName: string, error: string): void {
    const state = this.services.get(serviceName);
    const config = this.configs.get(serviceName);

    if (!state || !config) {
      console.warn(`Unknown service: ${serviceName}`);
      return;
    }

    state.consecutiveFailures++;
    state.lastError = error;
    state.lastCheck = new Date();

    // Update service status based on failure count
    if (state.consecutiveFailures >= config.unavailableThreshold) {
      state.status = ServiceStatus.UNAVAILABLE;
      state.degradedFeatures = [];
    } else if (state.consecutiveFailures >= config.degradedThreshold) {
      state.status = ServiceStatus.DEGRADED;
      state.degradedFeatures = config.degradedFeatures;
    }

    this.services.set(serviceName, state);
    this.logServiceStatusChange(serviceName, state);
  }

  /**
   * Record a service success
   */
  recordSuccess(serviceName: string): void {
    const state = this.services.get(serviceName);
    
    if (!state) {
      console.warn(`Unknown service: ${serviceName}`);
      return;
    }

    const wasUnhealthy = state.status !== ServiceStatus.HEALTHY;
    
    state.consecutiveFailures = 0;
    state.status = ServiceStatus.HEALTHY;
    state.lastError = undefined;
    state.degradedFeatures = undefined;
    state.lastCheck = new Date();

    this.services.set(serviceName, state);

    if (wasUnhealthy) {
      this.logServiceStatusChange(serviceName, state);
    }
  }

  /**
   * Get current service status
   */
  getServiceStatus(serviceName: string): ServiceStatus {
    const state = this.services.get(serviceName);
    return state?.status || ServiceStatus.UNAVAILABLE;
  }

  /**
   * Check if a feature is available
   */
  isFeatureAvailable(serviceName: string, featureName: string): boolean {
    const state = this.services.get(serviceName);
    const config = this.configs.get(serviceName);

    if (!state || !config) {
      return false;
    }

    if (state.status === ServiceStatus.UNAVAILABLE) {
      return false;
    }

    if (state.status === ServiceStatus.DEGRADED) {
      return config.degradedFeatures.includes(featureName);
    }

    return config.enabledFeatures.includes(featureName);
  }

  /**
   * Get fallback data for a service
   */
  getFallbackData(serviceName: string, dataType: string): unknown {
    const config = this.configs.get(serviceName);
    return config?.fallbackData?.[dataType] || null;
  }

  /**
   * Get service health summary
   */
  getHealthSummary(): Record<string, {
    status: ServiceStatus;
    consecutiveFailures: number;
    lastCheck: Date;
    lastError?: string;
    availableFeatures: string[];
  }> {
    const summary: Record<string, {
      status: ServiceStatus;
      consecutiveFailures: number;
      lastCheck: Date;
      lastError?: string;
      availableFeatures: string[];
    }> = {};

    for (const [serviceName, state] of this.services) {
      const config = this.configs.get(serviceName);
      let availableFeatures: string[] = [];

      if (config) {
        if (state.status === ServiceStatus.HEALTHY) {
          availableFeatures = config.enabledFeatures;
        } else if (state.status === ServiceStatus.DEGRADED) {
          availableFeatures = config.degradedFeatures;
        }
      }

      summary[serviceName] = {
        status: state.status,
        consecutiveFailures: state.consecutiveFailures,
        lastCheck: state.lastCheck,
        lastError: state.lastError,
        availableFeatures
      };
    }

    return summary;
  }

  /**
   * Start health monitoring for all services
   */
  startHealthMonitoring(): void {
    for (const [serviceName, config] of this.configs) {
      this.startServiceMonitoring(serviceName, config);
    }
  }

  /**
   * Stop health monitoring for all services
   */
  stopHealthMonitoring(): void {
    for (const [serviceName, interval] of this.checkIntervals) {
      clearInterval(interval);
      this.checkIntervals.delete(serviceName);
    }
  }

  /**
   * Get degradation recommendations
   */
  getDegradationRecommendations(serviceName: string): {
    userMessage: string;
    alternativeActions: string[];
    estimatedRecovery: string;
  } {
    const state = this.services.get(serviceName);
    
    if (!state) {
      return {
        userMessage: "Service status unknown",
        alternativeActions: [],
        estimatedRecovery: "Unknown"
      };
    }

    switch (state.status) {
      case ServiceStatus.DEGRADED:
        return {
          userMessage: `${serviceName} is experiencing issues. Some features may be limited.`,
          alternativeActions: [
            "Try refreshing the page",
            "Use basic features instead of advanced ones",
            "Check back in a few minutes"
          ],
          estimatedRecovery: "2-5 minutes"
        };

      case ServiceStatus.UNAVAILABLE:
        return {
          userMessage: `${serviceName} is temporarily unavailable. Please try again later.`,
          alternativeActions: [
            "Use offline features",
            "Save your work and try again later",
            "Contact support if the issue persists"
          ],
          estimatedRecovery: "5-15 minutes"
        };

      default:
        return {
          userMessage: `${serviceName} is operating normally`,
          alternativeActions: [],
          estimatedRecovery: "N/A"
        };
    }
  }

  private startServiceMonitoring(serviceName: string, config: DegradationConfig): void {
    // Clear existing interval if any
    const existingInterval = this.checkIntervals.get(serviceName);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Start new monitoring interval
    const interval = setInterval(() => {
      this.performHealthCheck(serviceName);
    }, config.checkInterval);

    this.checkIntervals.set(serviceName, interval);
  }

  private async performHealthCheck(serviceName: string): Promise<void> {
    try {
      let isHealthy = false;

      // Perform service-specific health checks
      switch (serviceName) {
        case "openai":
          const { healthCheck: openaiHealthCheck } = await import("../openai");
          isHealthy = await openaiHealthCheck();
          break;

        case "serpapi":
          const { healthCheck: serpapiHealthCheck } = await import("../serpapi");
          isHealthy = await serpapiHealthCheck();
          break;

        case "supabase":
          const { supabase } = await import("../supabase/client");
          const { data } = await supabase.from("profiles").select("id").limit(1);
          isHealthy = data !== null;
          break;

        default:
          console.warn(`No health check defined for service: ${serviceName}`);
          return;
      }

      if (isHealthy) {
        this.recordSuccess(serviceName);
      } else {
        this.recordFailure(serviceName, "Health check failed");
      }
    } catch (error) {
      this.recordFailure(serviceName, error instanceof Error ? error.message : "Unknown error");
    }
  }

  private logServiceStatusChange(serviceName: string, state: ServiceState): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] Service ${serviceName} status changed to ${state.status}`;
    
    if (state.lastError) {
      console.warn(`${logMessage} - Error: ${state.lastError}`);
    } else {
      console.info(`${logMessage} - Service recovered`);
    }

    // In production, you would send this to your monitoring system
    // Example: sendToMonitoring(serviceName, state);
  }
}

// Export singleton instance
export const serviceDegradationManager = new ServiceDegradationManager();

// Start monitoring on module load
if (typeof window === "undefined") {
  // Only start monitoring on server-side
  serviceDegradationManager.startHealthMonitoring();
}