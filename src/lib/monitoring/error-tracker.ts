/**
 * Error Tracking Infrastructure
 * Comprehensive error tracking with deduplication and context preservation
 */

import { logger } from "./logger";
import crypto from "crypto";

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  traceId?: string;
  endpoint?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  timestamp: string;
  environment: string;
  version?: string;
  additional?: Record<string, any>;
}

export interface ErrorFingerprint {
  hash: string;
  type: string;
  message: string;
  stack?: string;
  location?: string;
}

export interface TrackedError {
  id: string;
  fingerprint: ErrorFingerprint;
  context: ErrorContext;
  occurrences: number;
  firstSeen: string;
  lastSeen: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  tags: string[];
  severity: "low" | "medium" | "high" | "critical";
  category:
    | "runtime"
    | "validation"
    | "network"
    | "database"
    | "auth"
    | "business"
    | "unknown";
}

export interface ErrorMetrics {
  totalErrors: number;
  uniqueErrors: number;
  errorRate: number;
  topErrors: TrackedError[];
  errorsByCategory: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  recentErrors: TrackedError[];
  errorTrends: {
    hourly: number[];
    daily: number[];
  };
}

export interface ErrorQuery {
  timeRange?: {
    start: Date;
    end: Date;
  };
  severity?: string[];
  category?: string[];
  resolved?: boolean;
  userId?: string;
  endpoint?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export class ErrorTracker {
  private errors: Map<string, TrackedError> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private readonly MAX_ERRORS = 10000;
  private readonly CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes
  private readonly ERROR_RETENTION = 7 * 24 * 60 * 60 * 1000; // 7 days
  private cleanupTimer?: NodeJS.Timeout;

  constructor() {
    this.cleanupTimer = setInterval(
      () => this.cleanupOldErrors(),
      this.CLEANUP_INTERVAL
    );
  }

  trackError(
    error: Error,
    context: Partial<ErrorContext> & {
      category?:
        | "runtime"
        | "validation"
        | "network"
        | "database"
        | "auth"
        | "business"
        | "unknown";
      severity?: "low" | "medium" | "high" | "critical";
      tags?: string[];
    } = {}
  ): string {
    const errorId = crypto.randomUUID();
    const fingerprint = this.generateFingerprint(error);

    // Extract additional properties
    const { category, severity, tags, ...contextWithoutExtras } = context;

    const fullContext: ErrorContext = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      version: process.env["npm_package_version"] || "1.0.0",
      ...contextWithoutExtras,
    };

    // Check for existing error with same fingerprint
    const existingError = this.findExistingError(fingerprint);

    if (existingError) {
      // Update existing error
      existingError.occurrences++;
      existingError.lastSeen = fullContext.timestamp;

      // Update context with latest information
      if (fullContext.userId) existingError.context.userId = fullContext.userId;
      if (fullContext.endpoint)
        existingError.context.endpoint = fullContext.endpoint;

      this.errors.set(existingError.id, existingError);

      // Log occurrence
      logger.error(
        "Error occurred (tracked)",
        error,
        {
          errorId: existingError.id,
          fingerprint: fingerprint.hash,
          occurrences: existingError.occurrences,
          ...fullContext,
        },
        ["error-tracking", "duplicate"]
      );

      return existingError.id;
    }

    // Create new tracked error
    const trackedError: TrackedError = {
      id: errorId,
      fingerprint,
      context: fullContext,
      occurrences: 1,
      firstSeen: fullContext.timestamp,
      lastSeen: fullContext.timestamp,
      resolved: false,
      tags: tags || this.generateTags(error, fullContext),
      severity: severity || this.calculateSeverity(error, fullContext),
      category: category || this.categorizeError(error, fullContext),
    };

    this.errors.set(errorId, trackedError);
    this.updateErrorCounts(fingerprint.hash);

    // Log new error
    logger.error(
      "New error tracked",
      error,
      {
        errorId,
        fingerprint: fingerprint.hash,
        severity: trackedError.severity,
        category: trackedError.category,
        ...fullContext,
      },
      ["error-tracking", "new"]
    );

    // Auto-cleanup if too many errors
    if (this.errors.size > this.MAX_ERRORS) {
      this.cleanupOldErrors();
    }

    return errorId;
  }

  getError(errorId: string): TrackedError | undefined {
    return this.errors.get(errorId);
  }

  getErrorByFingerprint(fingerprint: string): TrackedError | undefined {
    return Array.from(this.errors.values()).find(
      error => error.fingerprint.hash === fingerprint
    );
  }

  queryErrors(query: ErrorQuery = {}): TrackedError[] {
    let filteredErrors = Array.from(this.errors.values());

    // Time range filter
    if (query.timeRange) {
      const start = query.timeRange.start.getTime();
      const end = query.timeRange.end.getTime();
      filteredErrors = filteredErrors.filter(error => {
        const errorTime = new Date(error.lastSeen).getTime();
        return errorTime >= start && errorTime <= end;
      });
    }

    // Severity filter
    if (query.severity && query.severity.length > 0) {
      filteredErrors = filteredErrors.filter(error =>
        query.severity!.includes(error.severity)
      );
    }

    // Category filter
    if (query.category && query.category.length > 0) {
      filteredErrors = filteredErrors.filter(error =>
        query.category!.includes(error.category)
      );
    }

    // Resolved filter
    if (query.resolved !== undefined) {
      filteredErrors = filteredErrors.filter(
        error => error.resolved === query.resolved
      );
    }

    // User filter
    if (query.userId) {
      filteredErrors = filteredErrors.filter(
        error => error.context.userId === query.userId
      );
    }

    // Endpoint filter
    if (query.endpoint) {
      filteredErrors = filteredErrors.filter(
        error => error.context.endpoint === query.endpoint
      );
    }

    // Search filter
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      filteredErrors = filteredErrors.filter(
        error =>
          error.fingerprint.message.toLowerCase().includes(searchLower) ||
          error.fingerprint.type.toLowerCase().includes(searchLower) ||
          error.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Sort by last seen (most recent first)
    filteredErrors.sort(
      (a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
    );

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 50;
    return filteredErrors.slice(offset, offset + limit);
  }

  resolveError(errorId: string, resolvedBy?: string): boolean {
    const error = this.errors.get(errorId);
    if (!error) return false;

    error.resolved = true;
    error.resolvedAt = new Date().toISOString();
    if (resolvedBy) {
      error.resolvedBy = resolvedBy;
    }

    this.errors.set(errorId, error);

    logger.info(
      "Error resolved",
      {
        errorId,
        resolvedBy,
        fingerprint: error.fingerprint.hash,
        occurrences: error.occurrences,
      },
      ["error-tracking", "resolved"]
    );

    return true;
  }

  unresolveError(errorId: string): boolean {
    const error = this.errors.get(errorId);
    if (!error) return false;

    error.resolved = false;
    delete error.resolvedBy;
    delete error.resolvedAt;

    this.errors.set(errorId, error);

    logger.info(
      "Error unresolved",
      {
        errorId,
        fingerprint: error.fingerprint.hash,
      },
      ["error-tracking", "unresolved"]
    );

    return true;
  }

  getErrorMetrics(): ErrorMetrics {
    const errors = Array.from(this.errors.values());
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const recentErrors = errors.filter(
      error => now - new Date(error.lastSeen).getTime() < oneHour
    );

    // Calculate error rate (errors per hour)
    const errorRate = recentErrors.length;

    // Top errors by occurrences
    const topErrors = [...errors]
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 10);

    // Errors by category
    const errorsByCategory: Record<string, number> = {};
    errors.forEach(error => {
      errorsByCategory[error.category] =
        (errorsByCategory[error.category] || 0) + 1;
    });

    // Errors by severity
    const errorsBySeverity: Record<string, number> = {};
    errors.forEach(error => {
      errorsBySeverity[error.severity] =
        (errorsBySeverity[error.severity] || 0) + 1;
    });

    // Recent errors (last 24 hours)
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const recentErrorsList = errors
      .filter(error => new Date(error.lastSeen).getTime() > oneDayAgo)
      .sort(
        (a, b) =>
          new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
      )
      .slice(0, 20);

    return {
      totalErrors: errors.reduce((sum, error) => sum + error.occurrences, 0),
      uniqueErrors: errors.length,
      errorRate,
      topErrors,
      errorsByCategory,
      errorsBySeverity,
      recentErrors: recentErrorsList,
      errorTrends: this.calculateErrorTrends(),
    };
  }

  private generateFingerprint(error: Error): ErrorFingerprint {
    const message = error.message || "Unknown error";
    const type = error.constructor.name;
    const stack = error.stack || "";

    // Extract location from stack trace
    const location = this.extractLocationFromStack(stack);

    // Create a hash based on error type, message, and location
    const hashInput = `${type}:${message}:${location}`;
    const hash = crypto
      .createHash("sha256")
      .update(hashInput)
      .digest("hex")
      .substring(0, 16);

    return {
      hash,
      type,
      message,
      stack,
      location,
    };
  }

  private extractLocationFromStack(stack: string): string {
    const lines = stack.split("\n");
    for (const line of lines) {
      // Look for file:line:column pattern
      const match =
        line.match(/\((.+):(\d+):(\d+)\)/) || line.match(/at (.+):(\d+):(\d+)/);
      if (match) {
        const [, file, lineNum] = match;
        if (file) {
          const fileName = file.split("/").pop() || file;
          return `${fileName}:${lineNum}`;
        }
      }
    }
    return "unknown";
  }

  private findExistingError(
    fingerprint: ErrorFingerprint
  ): TrackedError | undefined {
    return Array.from(this.errors.values()).find(
      error => error.fingerprint.hash === fingerprint.hash
    );
  }

  private updateErrorCounts(fingerprintHash: string): void {
    const count = this.errorCounts.get(fingerprintHash) || 0;
    this.errorCounts.set(fingerprintHash, count + 1);
  }

  private generateTags(error: Error, context: ErrorContext): string[] {
    const tags: string[] = [];

    // Add error type tag
    tags.push(error.constructor.name);

    // Add context-based tags
    if (context.endpoint) {
      tags.push(`endpoint:${context.endpoint}`);
    }
    if (context.method) {
      tags.push(`method:${context.method}`);
    }
    if (context.userId) {
      tags.push("user-error");
    }
    if (context.environment) {
      tags.push(`env:${context.environment}`);
    }

    // Add message-based tags
    const message = error.message.toLowerCase();
    if (message.includes("timeout")) tags.push("timeout");
    if (message.includes("connection")) tags.push("connection");
    if (message.includes("permission") || message.includes("unauthorized"))
      tags.push("auth");
    if (message.includes("validation")) tags.push("validation");
    if (message.includes("network")) tags.push("network");

    return tags;
  }

  private calculateSeverity(
    error: Error,
    context: ErrorContext
  ): "low" | "medium" | "high" | "critical" {
    const message = error.message.toLowerCase();
    const type = error.constructor.name;

    // Critical errors
    if (type === "TypeError" && message.includes("cannot read property"))
      return "critical";
    if (type === "ReferenceError") return "critical";
    if (message.includes("database") && message.includes("connection"))
      return "critical";
    if (message.includes("out of memory")) return "critical";
    if (message.includes("security") || message.includes("breach"))
      return "critical";

    // High severity errors
    if (type === "Error" && message.includes("500")) return "high";
    if (message.includes("timeout") && context.endpoint?.includes("api"))
      return "high";
    if (message.includes("authentication") || message.includes("authorization"))
      return "high";
    if (message.includes("payment") || message.includes("billing"))
      return "high";

    // Medium severity errors
    if (message.includes("validation")) return "medium";
    if (message.includes("404") || message.includes("not found"))
      return "medium";
    if (message.includes("rate limit")) return "medium";

    // Default to low
    return "low";
  }

  private categorizeError(
    error: Error,
    context: ErrorContext
  ): TrackedError["category"] {
    const message = error.message.toLowerCase();
    const type = error.constructor.name;

    if (
      type === "TypeError" ||
      type === "ReferenceError" ||
      type === "SyntaxError"
    ) {
      return "runtime";
    }

    if (message.includes("validation") || message.includes("invalid")) {
      return "validation";
    }

    if (
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("timeout")
    ) {
      return "network";
    }

    if (
      message.includes("database") ||
      message.includes("sql") ||
      message.includes("query")
    ) {
      return "database";
    }

    if (
      message.includes("auth") ||
      message.includes("login") ||
      message.includes("token")
    ) {
      return "auth";
    }

    if (context.endpoint && context.endpoint.includes("api")) {
      return "business";
    }

    return "unknown";
  }

  private calculateErrorTrends(): { hourly: number[]; daily: number[] } {
    const now = Date.now();
    const hourly: number[] = new Array(24).fill(0);
    const daily: number[] = new Array(7).fill(0);

    const errors = Array.from(this.errors.values());

    errors.forEach(error => {
      const errorTime = new Date(error.lastSeen).getTime();
      const hoursDiff = Math.floor((now - errorTime) / (60 * 60 * 1000));
      const daysDiff = Math.floor((now - errorTime) / (24 * 60 * 60 * 1000));

      if (hoursDiff < 24 && hoursDiff >= 0) {
        const hourIndex = 23 - hoursDiff;
        if (hourIndex >= 0 && hourIndex < 24) {
          (hourly[hourIndex] as number) += error.occurrences;
        }
      }

      if (daysDiff < 7 && daysDiff >= 0) {
        const dayIndex = 6 - daysDiff;
        if (dayIndex >= 0 && dayIndex < 7) {
          (daily[dayIndex] as number) += error.occurrences;
        }
      }
    });

    return { hourly, daily };
  }

  private cleanupOldErrors(): void {
    const cutoffTime = Date.now() - this.ERROR_RETENTION;
    const toDelete: string[] = [];

    for (const [id, error] of this.errors.entries()) {
      const errorTime = new Date(error.lastSeen).getTime();
      if (errorTime < cutoffTime) {
        toDelete.push(id);
      }
    }

    toDelete.forEach(id => {
      const error = this.errors.get(id);
      if (error) {
        this.errorCounts.delete(error.fingerprint.hash);
        this.errors.delete(id);
      }
    });

    if (toDelete.length > 0) {
      logger.info(
        "Cleaned up old errors",
        {
          deletedCount: toDelete.length,
          remainingCount: this.errors.size,
        },
        ["error-tracking", "cleanup"]
      );
    }
  }

  clearAllErrors(): void {
    this.errors.clear();
    this.errorCounts.clear();
    logger.info("All errors cleared", {}, ["error-tracking", "clear"]);
  }

  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}

// Global error tracker instance
export const errorTracker = new ErrorTracker();

// Global error handler
export function setupGlobalErrorHandling(): void {
  // Handle uncaught exceptions
  process.on("uncaughtException", error => {
    const errorId = errorTracker.trackError(error, {
      category: "runtime",
      severity: "critical",
      tags: ["uncaught-exception"],
    });

    logger.critical(
      "Uncaught exception",
      error,
      {
        errorId,
        pid: process.pid,
      },
      ["uncaught-exception"]
    );

    // In production, you might want to exit gracefully
    // process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason, promise) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    const errorId = errorTracker.trackError(error, {
      category: "runtime",
      severity: "high",
      tags: ["unhandled-rejection"],
    });

    logger.error(
      "Unhandled promise rejection",
      error,
      {
        errorId,
        promise: promise.toString(),
      },
      ["unhandled-rejection"]
    );
  });

  // Handle warning events
  process.on("warning", warning => {
    if (warning.name === "DeprecationWarning") {
      logger.warn(
        "Deprecation warning",
        {
          name: warning.name,
          message: warning.message,
          stack: warning.stack,
        },
        ["deprecation"]
      );
    }
  });
}

// Error tracking middleware for Next.js
export function withErrorTracking<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  context: Partial<ErrorContext> = {}
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await operation(...args);
    } catch (error) {
      if (error instanceof Error) {
        const errorId = errorTracker.trackError(error, context);

        // Add error ID to error object for debugging
        (error as any).errorId = errorId;
      }

      throw error;
    }
  };
}

// Convenience function for manual error tracking
export function trackError(
  error: Error,
  context: Partial<ErrorContext> = {}
): string {
  return errorTracker.trackError(error, context);
}

// Error boundary helper for React components
export function createErrorBoundary(componentName: string) {
  return {
    componentDidCatch: (error: Error, errorInfo: any) => {
      const errorId = errorTracker.trackError(error, {
        endpoint: componentName,
        category: "runtime",
        additional: errorInfo,
      });

      logger.error(
        "React error boundary caught error",
        error,
        {
          errorId,
          componentName,
          errorInfo,
        },
        ["react-error-boundary"]
      );
    },
  };
}
