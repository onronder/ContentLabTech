/**
 * Production Error Management System
 * Comprehensive error handling with UX-focused categorization
 */

export interface ErrorCategory {
  type: ErrorType;
  severity: ErrorSeverity;
  code: string;
  userMessage: UserMessage;
  retryStrategy: RetryStrategy;
  context: Record<string, unknown>;
}

export interface UserMessage {
  title: string;
  message: string;
  action: string;
  icon: string;
  severity: 'error' | 'warning' | 'info';
  canDismiss: boolean;
  autoHide?: number; // milliseconds
}

export interface RetryStrategy {
  canRetry: boolean;
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  retryCondition?: (error: unknown) => boolean;
}

export enum ErrorType {
  AUTHENTICATION_EXPIRED = 'authentication_expired',
  AUTHENTICATION_INVALID = 'authentication_invalid',
  NETWORK_CONNECTIVITY = 'network_connectivity',
  VALIDATION_FAILED = 'validation_failed',
  PERMISSION_DENIED = 'permission_denied',
  SERVER_OVERLOAD = 'server_overload',
  CSRF_TOKEN_INVALID = 'csrf_token_invalid',
  RATE_LIMITED = 'rate_limited',
  RESOURCE_NOT_FOUND = 'resource_not_found',
  UNKNOWN_ERROR = 'unknown_error'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Production Error Manager Class
 */
export class ProductionErrorManager {
  private static instance: ProductionErrorManager;
  private errorHistory: ErrorCategory[] = [];
  private maxHistorySize = 100;

  private constructor() {}

  public static getInstance(): ProductionErrorManager {
    if (!ProductionErrorManager.instance) {
      ProductionErrorManager.instance = new ProductionErrorManager();
    }
    return ProductionErrorManager.instance;
  }

  /**
   * Categorize errors by type and severity with UX context
   */
  categorizeError(error: unknown, context: Record<string, unknown> = {}): ErrorCategory {
    console.log('🔍 Categorizing error:', error);

    let errorCategory: ErrorCategory;

    if (error instanceof Error) {
      errorCategory = this.categorizeKnownError(error, context);
    } else if (typeof error === 'string') {
      errorCategory = this.categorizeStringError(error, context);
    } else if (typeof error === 'object' && error !== null) {
      errorCategory = this.categorizeObjectError(error as Record<string, unknown>, context);
    } else {
      errorCategory = this.createUnknownErrorCategory(error, context);
    }

    // Add to history for pattern analysis
    this.addToHistory(errorCategory);

    return errorCategory;
  }

  /**
   * Categorize known Error instances
   */
  private categorizeKnownError(error: Error, context: Record<string, unknown> = {}): ErrorCategory {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Authentication errors
    if (message.includes('expired') || message.includes('invalid_token') || message.includes('unauthorized')) {
      return {
        type: ErrorType.AUTHENTICATION_EXPIRED,
        severity: ErrorSeverity.HIGH,
        code: 'AUTH_EXPIRED',
        userMessage: {
          title: 'Session Expired',
          message: 'Your session has expired for security reasons.',
          action: 'The page will refresh automatically to restore your session.',
          icon: '🔄',
          severity: 'warning',
          canDismiss: false,
          autoHide: 3000
        },
        retryStrategy: {
          canRetry: true,
          maxRetries: 1,
          retryDelay: 2000,
          backoffMultiplier: 1,
          retryCondition: () => true
        },
        context
      };
    }

    // Network connectivity errors
    if (message.includes('network') || message.includes('fetch') || message.includes('connection') || name.includes('networkerror')) {
      return {
        type: ErrorType.NETWORK_CONNECTIVITY,
        severity: ErrorSeverity.MEDIUM,
        code: 'NETWORK_ERROR',
        userMessage: {
          title: 'Connection Issue',
          message: 'Unable to connect to our servers.',
          action: 'Please check your internet connection. We\'ll retry automatically.',
          icon: '🌐',
          severity: 'error',
          canDismiss: true,
          autoHide: 5000
        },
        retryStrategy: {
          canRetry: true,
          maxRetries: 3,
          retryDelay: 2000,
          backoffMultiplier: 1.5,
          retryCondition: () => true
        },
        context
      };
    }

    // Validation errors
    if (message.includes('validation') || message.includes('required') || message.includes('invalid format')) {
      return {
        type: ErrorType.VALIDATION_FAILED,
        severity: ErrorSeverity.LOW,
        code: 'VALIDATION_ERROR',
        userMessage: {
          title: 'Invalid Input',
          message: 'Please check the highlighted fields and try again.',
          action: 'Correct the errors and resubmit the form.',
          icon: '⚠️',
          severity: 'warning',
          canDismiss: true
        },
        retryStrategy: {
          canRetry: false,
          maxRetries: 0,
          retryDelay: 0,
          backoffMultiplier: 1
        },
        context
      };
    }

    // Permission errors
    if (message.includes('permission') || message.includes('forbidden') || message.includes('access denied')) {
      return {
        type: ErrorType.PERMISSION_DENIED,
        severity: ErrorSeverity.HIGH,
        code: 'PERMISSION_DENIED',
        userMessage: {
          title: 'Access Denied',
          message: 'You don\'t have permission to perform this action.',
          action: 'Contact your administrator if you believe this is an error.',
          icon: '🚫',
          severity: 'error',
          canDismiss: true
        },
        retryStrategy: {
          canRetry: false,
          maxRetries: 0,
          retryDelay: 0,
          backoffMultiplier: 1
        },
        context
      };
    }

    // CSRF errors
    if (message.includes('csrf') || message.includes('token mismatch')) {
      return {
        type: ErrorType.CSRF_TOKEN_INVALID,
        severity: ErrorSeverity.MEDIUM,
        code: 'CSRF_INVALID',
        userMessage: {
          title: 'Security Check Failed',
          message: 'Security validation failed. Please refresh the page.',
          action: 'The page will refresh automatically to restore security.',
          icon: '🛡️',
          severity: 'warning',
          canDismiss: false,
          autoHide: 3000
        },
        retryStrategy: {
          canRetry: true,
          maxRetries: 1,
          retryDelay: 1000,
          backoffMultiplier: 1,
          retryCondition: () => true
        },
        context
      };
    }

    // Rate limiting
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return {
        type: ErrorType.RATE_LIMITED,
        severity: ErrorSeverity.MEDIUM,
        code: 'RATE_LIMITED',
        userMessage: {
          title: 'Request Limit Reached',
          message: 'Too many requests. Please wait a moment.',
          action: 'We\'ll automatically retry in a few seconds.',
          icon: '⏱️',
          severity: 'warning',
          canDismiss: true,
          autoHide: 5000
        },
        retryStrategy: {
          canRetry: true,
          maxRetries: 2,
          retryDelay: 5000,
          backoffMultiplier: 2,
          retryCondition: () => true
        },
        context
      };
    }

    // Default to unknown error
    return this.createUnknownErrorCategory(error, context);
  }

  /**
   * Categorize string errors
   */
  private categorizeStringError(error: string, context: Record<string, unknown> = {}): ErrorCategory {
    const errorObj = new Error(error);
    return this.categorizeKnownError(errorObj, context);
  }

  /**
   * Categorize object errors (like fetch response errors)
   */
  private categorizeObjectError(error: Record<string, unknown>, context: Record<string, unknown> = {}): ErrorCategory {
    const status = error['status'] as number;
    const message = (error['message'] || error['error'] || 'Unknown error') as string;

    // HTTP status code based categorization
    if (status === 401) {
      return this.categorizeKnownError(new Error('Authentication expired'), context);
    } else if (status === 403) {
      return this.categorizeKnownError(new Error('Permission denied'), context);
    } else if (status === 404) {
      return {
        type: ErrorType.RESOURCE_NOT_FOUND,
        severity: ErrorSeverity.MEDIUM,
        code: 'NOT_FOUND',
        userMessage: {
          title: 'Resource Not Found',
          message: 'The requested resource could not be found.',
          action: 'Please refresh the page or contact support.',
          icon: '🔍',
          severity: 'error',
          canDismiss: true
        },
        retryStrategy: {
          canRetry: false,
          maxRetries: 0,
          retryDelay: 0,
          backoffMultiplier: 1
        },
        context
      };
    } else if (status === 429) {
      return this.categorizeKnownError(new Error('Rate limit exceeded'), context);
    } else if (status >= 500) {
      return {
        type: ErrorType.SERVER_OVERLOAD,
        severity: ErrorSeverity.HIGH,
        code: 'SERVER_ERROR',
        userMessage: {
          title: 'Server Issue',
          message: 'Our servers are experiencing issues.',
          action: 'We\'re working to fix this. Please try again in a moment.',
          icon: '🔧',
          severity: 'error',
          canDismiss: true,
          autoHide: 10000
        },
        retryStrategy: {
          canRetry: true,
          maxRetries: 2,
          retryDelay: 3000,
          backoffMultiplier: 2,
          retryCondition: () => true
        },
        context
      };
    }

    // Fallback to message analysis
    return this.categorizeKnownError(new Error(message), context);
  }

  /**
   * Create unknown error category
   */
  private createUnknownErrorCategory(error: unknown, context: Record<string, unknown> = {}): ErrorCategory {
    return {
      type: ErrorType.UNKNOWN_ERROR,
      severity: ErrorSeverity.MEDIUM,
      code: 'UNKNOWN_ERROR',
      userMessage: {
        title: 'Unexpected Error',
        message: 'Something unexpected happened.',
        action: 'Please try again. If the problem persists, contact support.',
        icon: '❓',
        severity: 'error',
        canDismiss: true
      },
      retryStrategy: {
        canRetry: true,
        maxRetries: 1,
        retryDelay: 2000,
        backoffMultiplier: 1,
        retryCondition: () => false // Manual retry only
      },
      context: {
        ...context,
        originalError: String(error)
      }
    };
  }

  /**
   * Generate user-friendly messages based on error category
   */
  generateUserMessage(errorCategory: ErrorCategory): UserMessage {
    return errorCategory.userMessage;
  }

  /**
   * Determine if error should be retried
   */
  shouldRetry(errorCategory: ErrorCategory, attemptCount: number = 0): boolean {
    const strategy = errorCategory.retryStrategy;
    
    if (!strategy.canRetry || attemptCount >= strategy.maxRetries) {
      return false;
    }

    if (strategy.retryCondition) {
      return strategy.retryCondition(errorCategory);
    }

    return true;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  getRetryDelay(errorCategory: ErrorCategory, attemptCount: number = 0): number {
    const strategy = errorCategory.retryStrategy;
    return strategy.retryDelay * Math.pow(strategy.backoffMultiplier, attemptCount);
  }

  /**
   * Track error patterns for analytics
   */
  logErrorMetrics(errorCategory: ErrorCategory): void {
    console.log('📊 Error Metrics:', {
      type: errorCategory.type,
      severity: errorCategory.severity,
      code: errorCategory.code,
      timestamp: new Date().toISOString(),
      context: errorCategory.context
    });

    // In production, send to analytics service
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('error_occurred', {
        error_type: errorCategory.type,
        error_severity: errorCategory.severity,
        error_code: errorCategory.code,
        user_message: errorCategory.userMessage.title,
        can_retry: errorCategory.retryStrategy.canRetry,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Add error to history for pattern analysis
   */
  private addToHistory(errorCategory: ErrorCategory): void {
    this.errorHistory.push(errorCategory);
    
    // Keep history size manageable
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get error patterns for analysis
   */
  getErrorPatterns(): {
    mostCommon: ErrorType[];
    recentErrors: ErrorCategory[];
    criticalErrors: ErrorCategory[];
  } {
    const recentErrors = this.errorHistory.slice(-10);
    const criticalErrors = this.errorHistory.filter(e => e.severity === ErrorSeverity.CRITICAL);
    
    // Count error types
    const typeCounts: Record<string, number> = {};
    this.errorHistory.forEach(error => {
      typeCounts[error.type] = (typeCounts[error.type] || 0) + 1;
    });
    
    const mostCommon = Object.entries(typeCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([type]) => type as ErrorType)
      .slice(0, 5);

    return {
      mostCommon,
      recentErrors,
      criticalErrors
    };
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorHistory = [];
  }
}

// Export singleton instance
export const productionErrorManager = ProductionErrorManager.getInstance();

// Note: Types are already exported above