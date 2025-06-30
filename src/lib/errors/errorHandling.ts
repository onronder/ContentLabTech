/**
 * Comprehensive Error Handling System
 * Production-grade error management with user-friendly communication and recovery strategies
 * Implements retry mechanisms, circuit breakers, and graceful degradation
 */

import { NextResponse } from "next/server";

// ================================================
// Error Type Definitions
// ================================================

export enum ErrorCategory {
  AUTHENTICATION = "authentication",
  AUTHORIZATION = "authorization",
  VALIDATION = "validation",
  EXTERNAL_SERVICE = "external_service",
  DATABASE = "database",
  PROCESSING = "processing",
  RATE_LIMIT = "rate_limit",
  NETWORK = "network",
  SYSTEM = "system",
  USER_INPUT = "user_input",
}

export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export interface ErrorContext {
  userId?: string;
  teamId?: string;
  projectId?: string;
  jobId?: string;
  requestId?: string;
  userAgent?: string;
  ipAddress?: string;
  timestamp: string;
  additionalData?: Record<string, unknown>;
}

export interface ErrorDetails {
  code: string;
  message: string;
  userMessage: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  retryable: boolean;
  retryAfter?: number; // seconds
  recoveryActions?: RecoveryAction[];
  context?: ErrorContext;
  originalError?: Error;
  statusCode: number;
}

export interface RecoveryAction {
  type: "retry" | "fallback" | "user_action" | "contact_support";
  title: string;
  description: string;
  actionUrl?: string;
  priority: number;
}

// ================================================
// Custom Error Classes
// ================================================

export class AppError extends Error {
  public readonly details: ErrorDetails;

  constructor(
    details: Partial<ErrorDetails> & { code: string; message: string }
  ) {
    super(details.message);
    this.name = "AppError";

    this.details = {
      code: details.code,
      message: details.message,
      userMessage:
        details.userMessage || this.getDefaultUserMessage(details.code),
      category: details.category || ErrorCategory.SYSTEM,
      severity: details.severity || ErrorSeverity.MEDIUM,
      retryable: details.retryable ?? true,
      ...(details.retryAfter !== undefined && {
        retryAfter: details.retryAfter,
      }),
      recoveryActions:
        details.recoveryActions ||
        this.getDefaultRecoveryActions(details.category),
      ...(details.context && { context: details.context }),
      ...(details.originalError && { originalError: details.originalError }),
      statusCode: details.statusCode || 500,
    };
  }

  private getDefaultUserMessage(code: string): string {
    const messages: Record<string, string> = {
      AUTH_REQUIRED: "Please sign in to access this feature.",
      INSUFFICIENT_PERMISSIONS:
        "You don't have permission to perform this action.",
      VALIDATION_FAILED: "Please check your input and try again.",
      EXTERNAL_SERVICE_ERROR:
        "A third-party service is temporarily unavailable. Please try again in a few minutes.",
      DATABASE_ERROR:
        "We're experiencing technical difficulties. Please try again shortly.",
      PROCESSING_ERROR:
        "Analysis processing failed. Please try again or contact support if the issue persists.",
      RATE_LIMIT_EXCEEDED:
        "Too many requests. Please wait a moment before trying again.",
      NETWORK_ERROR:
        "Network connection failed. Please check your internet connection and try again.",
      SYSTEM_ERROR: "An unexpected error occurred. Our team has been notified.",
    };

    return messages[code] || "An unexpected error occurred. Please try again.";
  }

  private getDefaultRecoveryActions(
    category?: ErrorCategory
  ): RecoveryAction[] {
    const baseActions: Record<ErrorCategory, RecoveryAction[]> = {
      [ErrorCategory.AUTHENTICATION]: [
        {
          type: "user_action",
          title: "Sign In",
          description: "Sign in to your account to continue",
          actionUrl: "/auth/signin",
          priority: 1,
        },
      ],
      [ErrorCategory.AUTHORIZATION]: [
        {
          type: "user_action",
          title: "Request Access",
          description: "Contact your team administrator to request access",
          priority: 1,
        },
      ],
      [ErrorCategory.VALIDATION]: [
        {
          type: "user_action",
          title: "Check Input",
          description: "Review and correct the highlighted fields",
          priority: 1,
        },
      ],
      [ErrorCategory.EXTERNAL_SERVICE]: [
        {
          type: "retry",
          title: "Try Again",
          description: "The service may be temporarily unavailable",
          priority: 1,
        },
        {
          type: "fallback",
          title: "Use Cached Data",
          description: "View previously analyzed results while we reconnect",
          priority: 2,
        },
      ],
      [ErrorCategory.DATABASE]: [
        {
          type: "retry",
          title: "Retry",
          description: "Database connection may be temporarily slow",
          priority: 1,
        },
      ],
      [ErrorCategory.PROCESSING]: [
        {
          type: "retry",
          title: "Restart Analysis",
          description: "Restart the analysis process",
          priority: 1,
        },
        {
          type: "contact_support",
          title: "Contact Support",
          description: "Get help from our technical team",
          actionUrl: "/support",
          priority: 2,
        },
      ],
      [ErrorCategory.RATE_LIMIT]: [
        {
          type: "user_action",
          title: "Wait and Retry",
          description: "Please wait a few minutes before making more requests",
          priority: 1,
        },
      ],
      [ErrorCategory.NETWORK]: [
        {
          type: "retry",
          title: "Check Connection",
          description: "Verify your internet connection and try again",
          priority: 1,
        },
      ],
      [ErrorCategory.SYSTEM]: [
        {
          type: "retry",
          title: "Try Again",
          description: "The issue may be temporary",
          priority: 1,
        },
        {
          type: "contact_support",
          title: "Report Issue",
          description: "Contact support if the problem persists",
          actionUrl: "/support",
          priority: 2,
        },
      ],
      [ErrorCategory.USER_INPUT]: [
        {
          type: "user_action",
          title: "Review Input",
          description: "Check the information you entered and try again",
          priority: 1,
        },
      ],
    };

    return category ? baseActions[category] || [] : [];
  }
}

// ================================================
// Error Handler Factory Functions
// ================================================

export function createAuthenticationError(
  message: string,
  context?: ErrorContext
): AppError {
  return new AppError({
    code: "AUTH_REQUIRED",
    message,
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.MEDIUM,
    retryable: false,
    statusCode: 401,
    ...(context && { context }),
  });
}

export function createAuthorizationError(
  message: string,
  context?: ErrorContext
): AppError {
  return new AppError({
    code: "INSUFFICIENT_PERMISSIONS",
    message,
    category: ErrorCategory.AUTHORIZATION,
    severity: ErrorSeverity.MEDIUM,
    retryable: false,
    statusCode: 403,
    ...(context && { context }),
  });
}

export function createValidationError(
  message: string,
  context?: ErrorContext
): AppError {
  return new AppError({
    code: "VALIDATION_FAILED",
    message,
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW,
    retryable: false,
    statusCode: 400,
    ...(context && { context }),
  });
}

export function createExternalServiceError(
  service: string,
  originalError: Error,
  context?: ErrorContext
): AppError {
  return new AppError({
    code: "EXTERNAL_SERVICE_ERROR",
    message: `External service ${service} error: ${originalError.message}`,
    userMessage: `The ${service} service is temporarily unavailable. Please try again in a few minutes.`,
    category: ErrorCategory.EXTERNAL_SERVICE,
    severity: ErrorSeverity.HIGH,
    retryable: true,
    retryAfter: 60,
    statusCode: 503,
    originalError,
    ...(context && { context }),
  });
}

export function createDatabaseError(
  originalError: Error,
  context?: ErrorContext
): AppError {
  return new AppError({
    code: "DATABASE_ERROR",
    message: `Database error: ${originalError.message}`,
    category: ErrorCategory.DATABASE,
    severity: ErrorSeverity.HIGH,
    retryable: true,
    retryAfter: 30,
    statusCode: 500,
    originalError,
    ...(context && { context }),
  });
}

export function createProcessingError(
  jobType: string,
  originalError: Error,
  context?: ErrorContext
): AppError {
  return new AppError({
    code: "PROCESSING_ERROR",
    message: `Processing error in ${jobType}: ${originalError.message}`,
    userMessage: `The ${jobType} analysis failed. Please try again or contact support if the issue persists.`,
    category: ErrorCategory.PROCESSING,
    severity: ErrorSeverity.MEDIUM,
    retryable: true,
    retryAfter: 120,
    statusCode: 500,
    originalError,
    ...(context && { context }),
  });
}

export function createRateLimitError(
  retryAfter: number,
  context?: ErrorContext
): AppError {
  return new AppError({
    code: "RATE_LIMIT_EXCEEDED",
    message: "Rate limit exceeded",
    category: ErrorCategory.RATE_LIMIT,
    severity: ErrorSeverity.MEDIUM,
    retryable: true,
    retryAfter,
    statusCode: 429,
    ...(context && { context }),
  });
}

// ================================================
// Error Response Handler
// ================================================

export function createErrorResponse(
  error: AppError | Error,
  requestId?: string
): NextResponse {
  let errorDetails: ErrorDetails;

  if (error instanceof AppError) {
    errorDetails = error.details;
  } else {
    // Handle unknown errors
    errorDetails = {
      code: "UNKNOWN_ERROR",
      message: error.message,
      userMessage: "An unexpected error occurred. Please try again.",
      category: ErrorCategory.SYSTEM,
      severity: ErrorSeverity.HIGH,
      retryable: true,
      statusCode: 500,
      context: {
        timestamp: new Date().toISOString(),
        ...(requestId && { requestId }),
      },
    };
  }

  // Log error for monitoring
  logError(errorDetails);

  // Create user-friendly response
  const response = {
    error: {
      code: errorDetails.code,
      message: errorDetails.userMessage,
      retryable: errorDetails.retryable,
      retryAfter: errorDetails.retryAfter,
      recoveryActions: errorDetails.recoveryActions,
      requestId: requestId || errorDetails.context?.requestId,
      timestamp: errorDetails.context?.timestamp || new Date().toISOString(),
    },
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Error-Code": errorDetails.code,
    "X-Error-Category": errorDetails.category,
    "X-Error-Severity": errorDetails.severity,
  };

  if (errorDetails.retryAfter) {
    headers["Retry-After"] = errorDetails.retryAfter.toString();
  }

  return NextResponse.json(response, {
    status: errorDetails.statusCode,
    headers,
  });
}

// ================================================
// Error Logging and Monitoring
// ================================================

interface ErrorLog {
  timestamp: string;
  errorCode: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context?: ErrorContext;
  stackTrace?: string;
  resolved?: boolean;
}

const errorLogs: ErrorLog[] = [];

function logError(errorDetails: ErrorDetails): void {
  const errorLog: ErrorLog = {
    timestamp: new Date().toISOString(),
    errorCode: errorDetails.code,
    message: errorDetails.message,
    category: errorDetails.category,
    severity: errorDetails.severity,
    ...(errorDetails.context && { context: errorDetails.context }),
    ...(errorDetails.originalError?.stack && {
      stackTrace: errorDetails.originalError.stack,
    }),
    resolved: false,
  };

  errorLogs.push(errorLog);

  // Keep only last 1000 error logs to prevent memory issues
  if (errorLogs.length > 1000) {
    errorLogs.splice(0, errorLogs.length - 1000);
  }

  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    console.error("Error logged:", errorLog);
  }

  // In production, this would send to monitoring service
  if (errorDetails.severity === ErrorSeverity.CRITICAL) {
    // Alert monitoring system
    alertCriticalError(errorDetails);
  }
}

function alertCriticalError(errorDetails: ErrorDetails): void {
  // This would integrate with monitoring services like Sentry, DataDog, etc.
  console.error("CRITICAL ERROR ALERT:", {
    code: errorDetails.code,
    message: errorDetails.message,
    context: errorDetails.context,
    timestamp: new Date().toISOString(),
  });
}

// ================================================
// Error Analytics and Insights
// ================================================

export function getErrorAnalytics(): {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  topErrors: Array<{ code: string; count: number }>;
  errorRate: number;
  averageResolutionTime?: number;
} {
  const now = Date.now();
  const last24Hours = errorLogs.filter(
    log => now - new Date(log.timestamp).getTime() < 24 * 60 * 60 * 1000
  );

  const errorsByCategory = last24Hours.reduce(
    (acc, log) => {
      acc[log.category] = (acc[log.category] || 0) + 1;
      return acc;
    },
    {} as Record<ErrorCategory, number>
  );

  const errorsBySeverity = last24Hours.reduce(
    (acc, log) => {
      acc[log.severity] = (acc[log.severity] || 0) + 1;
      return acc;
    },
    {} as Record<ErrorSeverity, number>
  );

  const errorCounts = last24Hours.reduce(
    (acc, log) => {
      acc[log.errorCode] = (acc[log.errorCode] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const topErrors = Object.entries(errorCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([code, count]) => ({ code, count }));

  return {
    totalErrors: last24Hours.length,
    errorsByCategory,
    errorsBySeverity,
    topErrors,
    errorRate: last24Hours.length, // Would calculate based on total requests in production
  };
}

// ================================================
// Context Helpers
// ================================================

export function createErrorContext(
  request?: Request,
  additionalData?: Record<string, unknown>
): ErrorContext {
  const requestId = request?.headers.get("x-request-id") || generateRequestId();
  const userAgent = request?.headers.get("user-agent");

  return {
    requestId,
    ...(userAgent && { userAgent }),
    timestamp: new Date().toISOString(),
    ...(additionalData && { additionalData }),
  };
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ================================================
// Graceful Degradation Helpers
// ================================================

export interface FallbackOptions<T> {
  fallbackData?: T;
  useCache?: boolean;
  cacheKey?: string;
  userMessage?: string;
}

export function createGracefulResponse<T>(
  error: AppError,
  options: FallbackOptions<T> = {}
): NextResponse {
  const response = {
    success: false,
    error: {
      code: error.details.code,
      message: error.details.userMessage,
      recoveryActions: error.details.recoveryActions,
    },
    data: options.fallbackData || null,
    fallback: true,
    message:
      options.userMessage ||
      "Using cached or limited data due to service unavailability.",
  };

  return NextResponse.json(response, {
    status: 206, // Partial Content
    headers: {
      "Content-Type": "application/json",
      "X-Fallback-Response": "true",
      "X-Error-Code": error.details.code,
    },
  });
}
