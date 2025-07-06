/**
 * Monitoring System Initialization
 * Initializes all Phase 3 monitoring components and integrates with existing systems
 */

import { setupMonitoringIntegration } from "./integration";
import { logger } from "./logger";
import { errorTracker } from "./error-tracker";
import { metricsCollector } from "./metrics-collector";
import { healthChecker } from "./health-checker";

// Global flag to prevent double initialization
let isInitialized = false;

/**
 * Initialize the complete Phase 3 monitoring system
 */
export function initializeMonitoring() {
  if (isInitialized) {
    logger.debug("Monitoring system already initialized, skipping...");
    return;
  }

  try {
    logger.info(
      "Initializing Phase 3 Monitoring & Observability System",
      {
        version: "3.0.0",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
      },
      ["initialization", "phase-3"]
    );

    // Initialize core monitoring integration
    setupMonitoringIntegration();

    // Log system capabilities
    logger.info(
      "Monitoring system capabilities enabled",
      {
        healthChecking: true,
        metricsCollection: true,
        errorTracking: true,
        performanceMonitoring: true,
        structuredLogging: true,
        alerting: true,
        dashboard: true,
      },
      ["initialization", "capabilities"]
    );

    // Perform initial health check
    performInitialHealthCheck();

    // Mark as initialized
    isInitialized = true;

    logger.info(
      "Phase 3 Monitoring & Observability System initialized successfully",
      {
        initializationTime: Date.now(),
      },
      ["initialization", "success"]
    );
  } catch (error) {
    logger.error(
      "Failed to initialize monitoring system",
      error instanceof Error ? error : new Error(String(error)),
      {
        phase: "initialization",
      },
      ["initialization", "error"]
    );

    // Don't throw - allow application to continue with degraded monitoring
    console.error(
      "Monitoring initialization failed, continuing with degraded monitoring"
    );
  }
}

/**
 * Perform initial health check to verify all systems are working
 */
async function performInitialHealthCheck() {
  try {
    logger.info("Performing initial system health check...", {}, [
      "initialization",
      "health-check",
    ]);

    const healthStatus = await healthChecker.checkSystemHealth();

    logger.info(
      "Initial health check completed",
      {
        overall: healthStatus.overall,
        serviceCount: healthStatus.services.length,
        healthyServices: healthStatus.services.filter(
          s => s.status === "healthy"
        ).length,
        degradedServices: healthStatus.services.filter(
          s => s.status === "degraded"
        ).length,
        unhealthyServices: healthStatus.services.filter(
          s => s.status === "unhealthy"
        ).length,
      },
      ["initialization", "health-check"]
    );

    // Track any unhealthy services as initial errors
    const unhealthyServices = healthStatus.services.filter(
      s => s.status === "unhealthy"
    );
    if (unhealthyServices.length > 0) {
      unhealthyServices.forEach(service => {
        const error = new Error(
          `Service ${service.service} is unhealthy during initialization: ${service.error || "Unknown error"}`
        );
        errorTracker.trackError(error, {
          category: "network",
          severity: "high",
          endpoint: service.service,
          additional: {
            phase: "initialization",
            serviceStatus: service.status,
            responseTime: service.responseTime,
          },
        });
      });

      logger.warn(
        "Some services are unhealthy during initialization",
        {
          unhealthyServices: unhealthyServices.map(s => s.service),
        },
        ["initialization", "health-warning"]
      );
    }
  } catch (error) {
    logger.error(
      "Initial health check failed",
      error instanceof Error ? error : new Error(String(error)),
      {
        phase: "initialization",
      },
      ["initialization", "health-check-error"]
    );
  }
}

/**
 * Get initialization status
 */
export function getInitializationStatus() {
  return {
    isInitialized,
    timestamp: new Date().toISOString(),
    components: {
      logger: !!logger,
      errorTracker: !!errorTracker,
      metricsCollector: !!metricsCollector,
      healthChecker: !!healthChecker,
    },
  };
}

/**
 * Initialize monitoring only in appropriate environments
 */
export function autoInitializeMonitoring() {
  // Initialize immediately in production
  if (process.env.NODE_ENV === "production") {
    initializeMonitoring();
    return;
  }

  // Initialize in development with a small delay to allow for hot reloading
  if (process.env.NODE_ENV === "development") {
    setTimeout(() => {
      initializeMonitoring();
    }, 1000);
    return;
  }

  // Skip initialization in test environment unless explicitly requested
  if (
    process.env.NODE_ENV === "test" &&
    process.env["INIT_MONITORING"] !== "true"
  ) {
    logger.debug("Skipping monitoring initialization in test environment");
    return;
  }

  // Default initialization for other environments
  initializeMonitoring();
}

// Export logger configuration for easy access
export const monitoringConfig = {
  logger: {
    level: process.env.NODE_ENV === "production" ? "INFO" : "DEBUG",
    enableConsole: true,
    enableRemote: process.env.NODE_ENV === "production",
    remoteEndpoint: process.env["LOG_ENDPOINT"],
  },
  healthChecker: {
    checkInterval: 5 * 60 * 1000, // 5 minutes
    timeout: 10000, // 10 seconds
    retryAttempts: 3,
  },
  metricsCollector: {
    maxMetricsPerType: 1000,
    cleanupInterval: 5 * 60 * 1000, // 5 minutes
    timeWindows: {
      fiveMinutes: 5 * 60 * 1000,
      oneHour: 60 * 60 * 1000,
      twentyFourHours: 24 * 60 * 60 * 1000,
    },
  },
  errorTracker: {
    maxErrors: 10000,
    cleanupInterval: 10 * 60 * 1000, // 10 minutes
    errorRetention: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
};

// Auto-initialize if not in a test environment
if (typeof window === "undefined" && process.env.NODE_ENV !== "test") {
  autoInitializeMonitoring();
}
