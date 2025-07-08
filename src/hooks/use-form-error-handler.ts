/**
 * Enhanced Form Error Handler Hook
 * Provides comprehensive error handling for forms with UX-focused features
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { productionErrorManager, ErrorCategory, UserMessage } from '@/lib/errors/production-error-manager';
import { AuthenticationError, CSRFError, NetworkError } from '@/lib/auth/authenticated-fetch';

export interface FormError {
  id: string;
  field?: string | undefined;
  category: ErrorCategory;
  timestamp: Date;
  dismissed: boolean;
  retryCount: number;
}

export interface FormErrorState {
  errors: FormError[];
  hasErrors: boolean;
  isRecovering: boolean;
  recoveryProgress: number;
  lastErrorTime: Date | null;
}

export interface FormErrorHandlerOptions {
  maxRetries?: number;
  retryDelay?: number;
  autoHideDelay?: number;
  enableRecovery?: boolean;
  persistErrors?: boolean;
  onRetry?: (error: FormError) => Promise<void>;
  onRecovery?: (success: boolean) => void;
}

/**
 * Production-grade form error handler with advanced recovery
 */
export function useFormErrorHandler(options: FormErrorHandlerOptions = {}) {
  const {
    maxRetries = 3,
    retryDelay = 2000,
    autoHideDelay = 10000,
    enableRecovery = true,
    persistErrors = false,
    onRetry,
    onRecovery
  } = options;

  const [errorState, setErrorState] = useState<FormErrorState>({
    errors: [],
    hasErrors: false,
    isRecovering: false,
    recoveryProgress: 0,
    lastErrorTime: null
  });

  const errorIdCounter = useRef(0);
  const autoHideTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const recoveryTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /**
   * Generate unique error ID
   */
  const generateErrorId = useCallback(() => {
    return `form-error-${Date.now()}-${++errorIdCounter.current}`;
  }, []);

  /**
   * Add error with comprehensive categorization
   */
  const addError = useCallback((
    error: unknown, 
    field?: string, 
    context: Record<string, unknown> = {}
  ) => {
    const errorCategory = productionErrorManager.categorizeError(error, {
      ...context,
      field,
      component: 'form',
      timestamp: new Date().toISOString()
    });

    const formError: FormError = {
      id: generateErrorId(),
      field: field || undefined,
      category: errorCategory,
      timestamp: new Date(),
      dismissed: false,
      retryCount: 0
    };

    setErrorState(prev => ({
      ...prev,
      errors: [...prev.errors, formError],
      hasErrors: true,
      lastErrorTime: new Date()
    }));

    // Log error metrics
    productionErrorManager.logErrorMetrics(errorCategory);

    // Set up auto-hide timer if specified
    if (errorCategory.userMessage.autoHide) {
      const timer = setTimeout(() => {
        dismissError(formError.id);
      }, errorCategory.userMessage.autoHide);
      
      autoHideTimers.current.set(formError.id, timer);
    }

    // Set up automatic recovery if enabled and error supports retry
    if (enableRecovery && errorCategory.retryStrategy.canRetry) {
      scheduleRecovery(formError);
    }

    return formError.id;
  }, [generateErrorId, enableRecovery]);

  /**
   * Remove error by ID
   */
  const removeError = useCallback((errorId: string) => {
    setErrorState(prev => {
      const updatedErrors = prev.errors.filter(e => e.id !== errorId);
      return {
        ...prev,
        errors: updatedErrors,
        hasErrors: updatedErrors.length > 0
      };
    });

    // Clear any associated timers
    const timer = autoHideTimers.current.get(errorId);
    if (timer) {
      clearTimeout(timer);
      autoHideTimers.current.delete(errorId);
    }

    const recoveryTimer = recoveryTimeouts.current.get(errorId);
    if (recoveryTimer) {
      clearTimeout(recoveryTimer);
      recoveryTimeouts.current.delete(errorId);
    }
  }, []);

  /**
   * Dismiss error (mark as dismissed but keep in state)
   */
  const dismissError = useCallback((errorId: string) => {
    setErrorState(prev => ({
      ...prev,
      errors: prev.errors.map(e => 
        e.id === errorId ? { ...e, dismissed: true } : e
      )
    }));

    // Remove from display after brief delay
    setTimeout(() => {
      removeError(errorId);
    }, 300); // Allow dismiss animation
  }, [removeError]);

  /**
   * Clear all errors
   */
  const clearAllErrors = useCallback(() => {
    // Clear all timers
    autoHideTimers.current.forEach(timer => clearTimeout(timer));
    recoveryTimeouts.current.forEach(timer => clearTimeout(timer));
    autoHideTimers.current.clear();
    recoveryTimeouts.current.clear();

    setErrorState({
      errors: [],
      hasErrors: false,
      isRecovering: false,
      recoveryProgress: 0,
      lastErrorTime: null
    });
  }, []);

  /**
   * Retry specific error
   */
  const retryError = useCallback(async (errorId: string) => {
    const error = errorState.errors.find(e => e.id === errorId);
    if (!error || !error.category.retryStrategy.canRetry) {
      return false;
    }

    if (error.retryCount >= maxRetries) {
      console.log(`Max retries exceeded for error ${errorId}`);
      return false;
    }

    setErrorState(prev => ({
      ...prev,
      isRecovering: true,
      recoveryProgress: 0,
      errors: prev.errors.map(e => 
        e.id === errorId 
          ? { ...e, retryCount: e.retryCount + 1 }
          : e
      )
    }));

    try {
      // Progress simulation for better UX
      const progressInterval = setInterval(() => {
        setErrorState(prev => ({
          ...prev,
          recoveryProgress: Math.min(prev.recoveryProgress + 20, 90)
        }));
      }, 200);

      // Execute retry callback if provided
      if (onRetry) {
        await onRetry(error);
      }

      // Simulate recovery delay
      await new Promise(resolve => setTimeout(resolve, retryDelay));

      clearInterval(progressInterval);

      setErrorState(prev => ({
        ...prev,
        isRecovering: false,
        recoveryProgress: 100
      }));

      // Remove the error on successful retry
      removeError(errorId);
      onRecovery?.(true);

      return true;
    } catch (retryError) {
      setErrorState(prev => ({
        ...prev,
        isRecovering: false,
        recoveryProgress: 0
      }));

      // Add new error for retry failure
      addError(retryError, error.field, {
        originalErrorId: errorId,
        retryAttempt: error.retryCount + 1
      });

      onRecovery?.(false);
      return false;
    }
  }, [errorState.errors, maxRetries, retryDelay, onRetry, onRecovery, removeError, addError]);

  /**
   * Schedule automatic recovery for retryable errors
   */
  const scheduleRecovery = useCallback((formError: FormError) => {
    if (!enableRecovery || !formError.category.retryStrategy.canRetry) {
      return;
    }

    const delay = productionErrorManager.getRetryDelay(
      formError.category, 
      formError.retryCount
    );

    const timer = setTimeout(() => {
      retryError(formError.id);
    }, delay);

    recoveryTimeouts.current.set(formError.id, timer);
  }, [enableRecovery, retryError]);

  /**
   * Get errors for specific field
   */
  const getFieldErrors = useCallback((fieldName: string) => {
    return errorState.errors.filter(e => e.field === fieldName && !e.dismissed);
  }, [errorState.errors]);

  /**
   * Get global (non-field-specific) errors
   */
  const getGlobalErrors = useCallback(() => {
    return errorState.errors.filter(e => !e.field && !e.dismissed);
  }, [errorState.errors]);

  /**
   * Check if field has errors
   */
  const hasFieldError = useCallback((fieldName: string) => {
    return getFieldErrors(fieldName).length > 0;
  }, [getFieldErrors]);

  /**
   * Get user-friendly error message for field
   */
  const getFieldErrorMessage = useCallback((fieldName: string): string | null => {
    const fieldErrors = getFieldErrors(fieldName);
    if (fieldErrors.length === 0) return null;

    const latestError = fieldErrors[fieldErrors.length - 1];
    return latestError ? latestError.category.userMessage.message : null;
  }, [getFieldErrors]);

  /**
   * Handle common error types with specific logic
   */
  const handleTypedError = useCallback((error: unknown, field?: string) => {
    let context: Record<string, unknown> = { field };

    if (error instanceof AuthenticationError) {
      context = { ...context, errorType: 'authentication', code: error.code };
    } else if (error instanceof CSRFError) {
      context = { ...context, errorType: 'csrf', requiresRefresh: true };
    } else if (error instanceof NetworkError) {
      context = { ...context, errorType: 'network', status: error.status };
    }

    return addError(error, field, context);
  }, [addError]);

  /**
   * Bulk error handling for form submissions
   */
  const handleSubmissionErrors = useCallback((errors: Array<{
    field?: string;
    error: unknown;
  }>) => {
    clearAllErrors(); // Clear previous errors
    
    const errorIds = errors.map(({ field, error }) => 
      handleTypedError(error, field)
    );

    return errorIds;
  }, [clearAllErrors, handleTypedError]);

  /**
   * Get error summary for display
   */
  const getErrorSummary = useCallback(() => {
    const activeErrors = errorState.errors.filter(e => !e.dismissed);
    const fieldErrors = activeErrors.filter(e => e.field);
    const globalErrors = activeErrors.filter(e => !e.field);

    return {
      total: activeErrors.length,
      fieldErrors: fieldErrors.length,
      globalErrors: globalErrors.length,
      hasRetryableErrors: activeErrors.some(e => e.category.retryStrategy.canRetry),
      mostSevereError: activeErrors.reduce((prev, current) => {
        const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
        const prevSeverity = severityOrder[prev?.category.severity || 'low'];
        const currentSeverity = severityOrder[current.category.severity];
        return currentSeverity > prevSeverity ? current : prev;
      }, activeErrors[0] || null)
    };
  }, [errorState.errors]);

  /**
   * Clean up timers on unmount
   */
  useEffect(() => {
    return () => {
      autoHideTimers.current.forEach(timer => clearTimeout(timer));
      recoveryTimeouts.current.forEach(timer => clearTimeout(timer));
      autoHideTimers.current.clear();
      recoveryTimeouts.current.clear();
    };
  }, []);

  return {
    // State
    ...errorState,
    
    // Error management
    addError,
    removeError,
    dismissError,
    clearAllErrors,
    retryError,
    
    // Field-specific helpers
    getFieldErrors,
    getGlobalErrors,
    hasFieldError,
    getFieldErrorMessage,
    
    // Typed error handling
    handleTypedError,
    handleSubmissionErrors,
    
    // Summary and analytics
    getErrorSummary,
    
    // Convenience getters
    visibleErrors: errorState.errors.filter(e => !e.dismissed),
    criticalErrors: errorState.errors.filter(e => 
      e.category.severity === 'critical' && !e.dismissed
    ),
    retryableErrors: errorState.errors.filter(e => 
      e.category.retryStrategy.canRetry && !e.dismissed
    )
  };
}

/**
 * Hook for simple error toast notifications
 */
export function useErrorToast() {
  const errorHandler = useFormErrorHandler({
    autoHideDelay: 5000,
    enableRecovery: false,
    maxRetries: 0
  });

  const showError = useCallback((
    message: string, 
    options?: { 
      severity?: 'error' | 'warning' | 'info';
      autoHide?: number;
    }
  ) => {
    const error = new Error(message);
    return errorHandler.addError(error, undefined, {
      severity: options?.severity || 'error',
      isToast: true,
      autoHide: options?.autoHide
    });
  }, [errorHandler]);

  const showSuccess = useCallback((message: string) => {
    // Success messages are handled differently
    console.log('✅ Success:', message);
  }, []);

  return {
    showError,
    showSuccess,
    errors: errorHandler.visibleErrors,
    clearAll: errorHandler.clearAllErrors,
    dismiss: errorHandler.dismissError
  };
}

