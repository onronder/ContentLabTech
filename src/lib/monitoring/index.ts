/**
 * Phase 3: Monitoring & Observability - Main Export
 * Comprehensive monitoring system with health checks, metrics, logging, and error tracking
 */

// Core monitoring components
export { logger, log } from "./logger";
export {
  errorTracker,
  trackError,
  setupGlobalErrorHandling,
  withErrorTracking,
} from "./error-tracker";
export { metricsCollector } from "./metrics-collector";
export { healthChecker } from "./health-checker";

// Import for internal use
import { logger } from "./logger";
import {
  setupGlobalErrorHandling,
  errorTracker,
  ErrorContext,
} from "./error-tracker";
import { metricsCollector } from "./metrics-collector";
import { healthChecker } from "./health-checker";
import { setupMonitoringIntegration, getMonitoringStatus } from "./integration";

// Performance monitoring
export {
  withPerformanceMonitoring,
  withDatabaseMonitoring,
  withCacheMonitoring,
  getActiveRequests,
  getRequestAnalytics,
} from "./performance-middleware";

// Integration utilities
export {
  setupMonitoringIntegration,
  withMonitoring,
  monitorApiRoute,
  monitorDatabaseOperation,
  monitorCacheOperation,
  monitorExternalService,
  getMonitoringStatus,
  shutdownMonitoring,
} from "./integration";

// Security and performance optimizations
export {
  createSecurityMiddleware,
  createPerformanceOptimizer,
  createMemoryManager,
  createSecurityAuditor,
} from "./security-optimizer";

// Initialization
export {
  initializeMonitoring,
  autoInitializeMonitoring,
  getInitializationStatus,
  monitoringConfig,
} from "./init";

// React components (for dashboard integration)
export { default as SystemHealthWidget } from "../../components/monitoring/SystemHealthWidget";
export { default as MetricsChart } from "../../components/monitoring/MetricsChart";
export { default as ErrorsWidget } from "../../components/monitoring/ErrorsWidget";
export { MonitoringDashboard } from "../../components/monitoring/MonitoringDashboard";

// Types for external use
export type { LogLevel, LogEntry, LoggerConfig, LogQuery } from "./logger";

export type {
  TrackedError,
  ErrorContext,
  ErrorFingerprint,
  ErrorMetrics,
  ErrorQuery,
} from "./error-tracker";

export type {
  SystemMetrics,
  PerformanceMetric,
  DatabaseMetric,
  CacheMetric,
  TimeWindowMetrics,
} from "./metrics-collector";

export type { HealthCheckResult, SystemHealthStatus } from "./health-checker";

export type {
  RequestContext,
  RequestAnalytics,
} from "./performance-middleware";

/**
 * Quick setup function for common monitoring scenarios
 */
export function setupBasicMonitoring(
  options: {
    enableHealthChecks?: boolean;
    enableMetrics?: boolean;
    enableErrorTracking?: boolean;
    enablePerformanceMonitoring?: boolean;
    logLevel?: "DEBUG" | "INFO" | "WARN" | "ERROR" | "CRITICAL";
  } = {}
) {
  const {
    enableHealthChecks = true,
    enableMetrics = true,
    enableErrorTracking = true,
    enablePerformanceMonitoring = true,
    logLevel = "INFO",
  } = options;

  // Use the directly imported logger
  const monitoringLogger = logger;

  // Update logger configuration
  monitoringLogger.updateConfig({
    level:
      logLevel === "DEBUG"
        ? 0
        : logLevel === "INFO"
          ? 1
          : logLevel === "WARN"
            ? 2
            : logLevel === "ERROR"
              ? 3
              : 4,
  });

  monitoringLogger.info(
    "Basic monitoring setup initiated",
    {
      enableHealthChecks,
      enableMetrics,
      enableErrorTracking,
      enablePerformanceMonitoring,
      logLevel,
    },
    ["setup", "basic-monitoring"]
  );

  // Setup global error handling if enabled
  if (enableErrorTracking) {
    setupGlobalErrorHandling();
    monitoringLogger.info("Global error handling enabled", {}, [
      "setup",
      "error-tracking",
    ]);
  }

  // Setup monitoring integration
  setupMonitoringIntegration();

  monitoringLogger.info("Basic monitoring setup completed", {}, [
    "setup",
    "completed",
  ]);

  return {
    logger: monitoringLogger,
    errorTracker: enableErrorTracking ? errorTracker : null,
    metricsCollector: enableMetrics ? metricsCollector : null,
    healthChecker: enableHealthChecks ? healthChecker : null,
  };
}

/**
 * Monitoring utilities for common operations
 */
export const monitoringUtils = {
  /**
   * Log a performance metric
   */
  logPerformance: (
    operation: string,
    duration: number,
    success = true,
    details?: any
  ) => {
    logger.performance({
      operation,
      duration,
      success,
      details,
    });
  },

  /**
   * Log a security event
   */
  logSecurity: (
    type: "auth" | "access" | "suspicious" | "attack",
    action: string,
    details?: any
  ) => {
    logger.security({
      type,
      action,
      details,
    });
  },

  /**
   * Log a business event
   */
  logBusiness: (
    type: string,
    action: string,
    userId?: string,
    details?: any
  ) => {
    const businessData: {
      type: string;
      action: string;
      userId?: string;
      details?: any;
    } = {
      type,
      action,
    };

    if (userId) {
      businessData.userId = userId;
    }

    if (details) {
      businessData.details = details;
    }

    logger.business(businessData);
  },

  /**
   * Track an error with context
   */
  trackError: (error: Error, context?: Partial<ErrorContext>) => {
    return errorTracker.trackError(error, context);
  },

  /**
   * Get current system health
   */
  getHealth: async () => {
    return await healthChecker.checkSystemHealth();
  },

  /**
   * Get current metrics
   */
  getMetrics: async () => {
    return await metricsCollector.getSystemMetrics();
  },

  /**
   * Get error statistics
   */
  getErrorStats: () => {
    return errorTracker.getErrorMetrics();
  },
};

/**
 * Monitoring constants
 */
export const MONITORING_CONSTANTS = {
  VERSION: "3.0.0",
  PHASE: "Phase 3: Monitoring & Observability",

  // Log levels
  LOG_LEVELS: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    CRITICAL: 4,
  },

  // Health check statuses
  HEALTH_STATUS: {
    HEALTHY: "healthy",
    DEGRADED: "degraded",
    UNHEALTHY: "unhealthy",
  },

  // Error severities
  ERROR_SEVERITY: {
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high",
    CRITICAL: "critical",
  },

  // Error categories
  ERROR_CATEGORIES: {
    RUNTIME: "runtime",
    VALIDATION: "validation",
    NETWORK: "network",
    DATABASE: "database",
    AUTH: "auth",
    BUSINESS: "business",
    UNKNOWN: "unknown",
  },
};

/**
 * Development helpers (only available in development mode)
 */
export const devHelpers =
  process.env.NODE_ENV === "development"
    ? {
        /**
         * Generate test data for monitoring dashboard
         */
        generateTestData: () => {
          // Generate test error
          const testError = new Error("Test error for development");
          errorTracker.trackError(testError, {
            category: "runtime",
            severity: "low",
            additional: { source: "dev-helpers" },
          });

          // Log test performance metric
          logger.performance({
            operation: "test-operation",
            duration: Math.random() * 1000,
            success: Math.random() > 0.1,
            details: { source: "dev-helpers" },
          });

          logger.info("Test data generated for development", {}, [
            "dev-helpers",
          ]);
        },

        /**
         * Clear all monitoring data
         */
        clearAllData: () => {
          metricsCollector.clearMetrics();
          errorTracker.clearAllErrors();
          logger.info("All monitoring data cleared for development", {}, [
            "dev-helpers",
          ]);
        },

        /**
         * Get monitoring system status
         */
        getSystemStatus: async () => {
          return await getMonitoringStatus();
        },
      }
    : {};

// Initialize monitoring on import (only in appropriate environments)
if (typeof window === "undefined" && process.env.NODE_ENV !== "test") {
  import("./init").then(({ autoInitializeMonitoring }) => {
    autoInitializeMonitoring();
  });
}
