/**
 * Advanced Loading State Manager
 * Comprehensive loading state management with progress tracking and recovery
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { productionErrorManager, ErrorCategory } from '@/lib/errors/production-error-manager';

export interface LoadingStep {
  id: string;
  label: string;
  weight: number; // Relative weight for progress calculation
  status: 'pending' | 'active' | 'completed' | 'failed';
  startTime?: Date | undefined;
  endTime?: Date | undefined;
  error?: ErrorCategory | undefined;
}

export interface LoadingState {
  isLoading: boolean;
  isSubmitting: boolean;
  isValidating: boolean;
  isSaving: boolean;
  progress: number; // 0-100
  currentStep: string;
  currentStepIndex: number;
  totalSteps: number;
  steps: LoadingStep[];
  startTime: Date | null;
  estimatedTimeRemaining: number | null; // milliseconds
  errors: ErrorCategory[];
  hasErrors: boolean;
  canRetry: boolean;
}

export interface LoadingStateManagerOptions {
  enableProgress?: boolean;
  enableTimeEstimation?: boolean;
  steps?: Omit<LoadingStep, 'status' | 'startTime' | 'endTime'>[];
  timeoutMs?: number;
  onTimeout?: () => void;
  onStepComplete?: (step: LoadingStep) => void;
  onStepFailed?: (step: LoadingStep, error: ErrorCategory) => void;
  onComplete?: (duration: number) => void;
  onError?: (error: ErrorCategory) => void;
}

/**
 * Advanced loading state manager with progress tracking
 */
export function useLoadingStateManager(options: LoadingStateManagerOptions = {}) {
  const {
    enableProgress = true,
    enableTimeEstimation = true,
    steps = [],
    timeoutMs = 30000, // 30 seconds default timeout
    onTimeout,
    onStepComplete,
    onStepFailed,
    onComplete,
    onError
  } = options;

  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    isSubmitting: false,
    isValidating: false,
    isSaving: false,
    progress: 0,
    currentStep: '',
    currentStepIndex: -1,
    totalSteps: steps.length,
    steps: steps.map(step => ({ ...step, status: 'pending' as const })),
    startTime: null,
    estimatedTimeRemaining: null,
    errors: [],
    hasErrors: false,
    canRetry: false
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stepStartTimes = useRef<Map<string, number>>(new Map());
  const averageStepDurations = useRef<Map<string, number>>(new Map());

  /**
   * Calculate progress based on completed steps and their weights
   */
  const calculateProgress = useCallback((steps: LoadingStep[]): number => {
    if (!enableProgress || steps.length === 0) return 0;

    const totalWeight = steps.reduce((sum, step) => sum + step.weight, 0);
    const completedWeight = steps
      .filter(step => step.status === 'completed')
      .reduce((sum, step) => sum + step.weight, 0);

    // Add partial progress for current active step
    const activeStep = steps.find(step => step.status === 'active');
    let activeStepProgress = 0;
    
    if (activeStep && activeStep.startTime) {
      const duration = Date.now() - activeStep.startTime.getTime();
      const averageDuration = averageStepDurations.current.get(activeStep.id) || 2000;
      activeStepProgress = Math.min(duration / averageDuration, 0.9) * activeStep.weight;
    }

    return Math.min(((completedWeight + activeStepProgress) / totalWeight) * 100, 100);
  }, [enableProgress]);

  /**
   * Estimate remaining time based on step history
   */
  const estimateRemainingTime = useCallback((steps: LoadingStep[]): number | null => {
    if (!enableTimeEstimation || steps.length === 0) return null;

    const remainingSteps = steps.filter(step => 
      step.status === 'pending' || step.status === 'active'
    );

    let totalEstimatedTime = 0;

    for (const step of remainingSteps) {
      const averageDuration = averageStepDurations.current.get(step.id) || 2000;
      
      if (step.status === 'active' && step.startTime) {
        const elapsed = Date.now() - step.startTime.getTime();
        totalEstimatedTime += Math.max(averageDuration - elapsed, 0);
      } else {
        totalEstimatedTime += averageDuration;
      }
    }

    return totalEstimatedTime;
  }, [enableTimeEstimation]);

  /**
   * Update step status and recalculate progress
   */
  const updateStep = useCallback((
    stepId: string, 
    status: LoadingStep['status'], 
    error?: ErrorCategory
  ) => {
    setLoadingState(prev => {
      const updatedSteps = prev.steps.map(step => {
        if (step.id === stepId) {
          const updatedStep = { ...step, status };

          if (status === 'active') {
            updatedStep.startTime = new Date();
            stepStartTimes.current.set(stepId, Date.now());
          } else if (status === 'completed' || status === 'failed') {
            updatedStep.endTime = new Date();
            
            if (step.startTime) {
              const duration = Date.now() - step.startTime.getTime();
              averageStepDurations.current.set(stepId, duration);
            }
          }

          if (status === 'failed' && error) {
            updatedStep.error = error;
          }

          return updatedStep;
        }
        return step;
      });

      const progress = calculateProgress(updatedSteps);
      const estimatedTimeRemaining = estimateRemainingTime(updatedSteps);
      
      const currentActiveStep = updatedSteps.find(s => s.status === 'active');
      const currentStepIndex = currentActiveStep 
        ? updatedSteps.findIndex(s => s.id === currentActiveStep.id)
        : -1;

      return {
        ...prev,
        steps: updatedSteps,
        progress,
        estimatedTimeRemaining,
        currentStep: currentActiveStep?.label || '',
        currentStepIndex,
        hasErrors: updatedSteps.some(s => s.status === 'failed'),
        canRetry: updatedSteps.some(s => s.status === 'failed' && s.error?.retryStrategy.canRetry)
      };
    });

    // Trigger callbacks
    const step = loadingState.steps.find(s => s.id === stepId);
    if (step) {
      if (status === 'completed') {
        onStepComplete?.(step);
      } else if (status === 'failed' && error) {
        onStepFailed?.(step, error);
      }
    }
  }, [loadingState.steps, calculateProgress, estimateRemainingTime, onStepComplete, onStepFailed]);

  /**
   * Start loading process
   */
  const startLoading = useCallback((type: 'loading' | 'submitting' | 'validating' | 'saving' = 'loading') => {
    setLoadingState(prev => {
      const newState = {
        ...prev,
        [type === 'loading' ? 'isLoading' : 
         type === 'submitting' ? 'isSubmitting' :
         type === 'validating' ? 'isValidating' : 'isSaving']: true,
        progress: 0,
        startTime: new Date(),
        errors: [],
        hasErrors: false,
        canRetry: false,
        steps: prev.steps.map(step => ({ ...step, status: 'pending' as const }))
      };

      return newState;
    });

    // Set timeout
    if (timeoutMs > 0) {
      timeoutRef.current = setTimeout(() => {
        console.warn('Loading operation timed out');
        onTimeout?.();
        stopLoading();
      }, timeoutMs);
    }

    // Start first step if steps are defined
    if (steps.length > 0) {
      updateStep(steps[0]!.id, 'active');
    }
  }, [steps, timeoutMs, onTimeout, updateStep]);

  /**
   * Stop loading process
   */
  const stopLoading = useCallback((type?: 'loading' | 'submitting' | 'validating' | 'saving') => {
    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setLoadingState(prev => {
      const duration = prev.startTime ? Date.now() - prev.startTime.getTime() : 0;
      
      // Trigger completion callback
      if (!prev.hasErrors && duration > 0) {
        onComplete?.(duration);
      }

      const newState = { ...prev };
      
      if (type) {
        // Stop specific loading type
        switch (type) {
          case 'loading':
            newState.isLoading = false;
            break;
          case 'submitting':
            newState.isSubmitting = false;
            break;
          case 'validating':
            newState.isValidating = false;
            break;
          case 'saving':
            newState.isSaving = false;
            break;
        }
      } else {
        // Stop all loading types
        newState.isLoading = false;
        newState.isSubmitting = false;
        newState.isValidating = false;
        newState.isSaving = false;
      }

      return newState;
    });
  }, [onComplete]);

  /**
   * Complete current step and move to next
   */
  const completeCurrentStep = useCallback(() => {
    const currentStep = loadingState.steps.find(step => step.status === 'active');
    if (!currentStep) return;

    updateStep(currentStep.id, 'completed');

    // Start next step
    const currentIndex = loadingState.steps.findIndex(step => step.id === currentStep.id);
    const nextStep = loadingState.steps[currentIndex + 1];
    
    if (nextStep) {
      updateStep(nextStep.id, 'active');
    } else {
      // All steps completed
      setLoadingState(prev => ({ ...prev, progress: 100 }));
      setTimeout(() => stopLoading(), 500); // Brief delay to show 100%
    }
  }, [loadingState.steps, updateStep, stopLoading]);

  /**
   * Fail current step with error
   */
  const failCurrentStep = useCallback((error: unknown) => {
    const currentStep = loadingState.steps.find(step => step.status === 'active');
    if (!currentStep) return;

    const errorCategory = productionErrorManager.categorizeError(error, {
      step: currentStep.id,
      stepLabel: currentStep.label
    });

    updateStep(currentStep.id, 'failed', errorCategory);
    
    setLoadingState(prev => ({
      ...prev,
      errors: [...prev.errors, errorCategory]
    }));

    onError?.(errorCategory);
    productionErrorManager.logErrorMetrics(errorCategory);
  }, [loadingState.steps, updateStep, onError]);

  /**
   * Update progress manually (for custom progress tracking)
   */
  const updateProgress = useCallback((progress: number, stepLabel?: string) => {
    setLoadingState(prev => ({
      ...prev,
      progress: Math.min(100, Math.max(0, progress)),
      ...(stepLabel && { currentStep: stepLabel })
    }));
  }, []);

  /**
   * Add error without failing step
   */
  const addError = useCallback((error: unknown, context?: Record<string, unknown>) => {
    const errorCategory = productionErrorManager.categorizeError(error, {
      ...context,
      loadingState: 'active'
    });

    setLoadingState(prev => ({
      ...prev,
      errors: [...prev.errors, errorCategory],
      hasErrors: true,
      canRetry: prev.canRetry || errorCategory.retryStrategy.canRetry
    }));

    onError?.(errorCategory);
    productionErrorManager.logErrorMetrics(errorCategory);
  }, [onError]);

  /**
   * Clear all errors
   */
  const clearErrors = useCallback(() => {
    setLoadingState(prev => ({
      ...prev,
      errors: [],
      hasErrors: false,
      canRetry: false
    }));
  }, []);

  /**
   * Retry failed operations
   */
  const retry = useCallback(async () => {
    const failedSteps = loadingState.steps.filter(step => step.status === 'failed');
    
    if (failedSteps.length === 0) return;

    // Reset failed steps to pending
    setLoadingState(prev => ({
      ...prev,
      steps: prev.steps.map(step => {
        if (step.status === 'failed') {
          const { error, ...stepWithoutError } = step;
          return { ...stepWithoutError, status: 'pending' as const };
        }
        return step;
      }),
      errors: [],
      hasErrors: false,
      canRetry: false
    }));

    // Restart from first failed step
    const firstFailedIndex = loadingState.steps.findIndex(step => step.status === 'failed');
    if (firstFailedIndex >= 0) {
      updateStep(loadingState.steps[firstFailedIndex]!.id, 'active');
    }
  }, [loadingState.steps, updateStep]);

  /**
   * Get loading summary for display
   */
  const getLoadingSummary = useCallback(() => {
    return {
      isAnyLoading: loadingState.isLoading || loadingState.isSubmitting || 
                   loadingState.isValidating || loadingState.isSaving,
      activeOperations: [
        loadingState.isLoading && 'Loading',
        loadingState.isSubmitting && 'Submitting',
        loadingState.isValidating && 'Validating',
        loadingState.isSaving && 'Saving'
      ].filter(Boolean) as string[],
      completedSteps: loadingState.steps.filter(s => s.status === 'completed').length,
      failedSteps: loadingState.steps.filter(s => s.status === 'failed').length,
      duration: loadingState.startTime 
        ? Date.now() - loadingState.startTime.getTime() 
        : 0
    };
  }, [loadingState]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    ...loadingState,
    
    // Control functions
    startLoading,
    stopLoading,
    updateProgress,
    
    // Step management
    completeCurrentStep,
    failCurrentStep,
    updateStep,
    
    // Error management
    addError,
    clearErrors,
    retry,
    
    // Summary and helpers
    getLoadingSummary,
    
    // Convenience getters
    isAnyLoading: loadingState.isLoading || loadingState.isSubmitting || 
                 loadingState.isValidating || loadingState.isSaving,
    completionPercentage: Math.round(loadingState.progress),
    currentStepLabel: loadingState.currentStep,
    remainingSteps: loadingState.totalSteps - loadingState.currentStepIndex - 1,
    formattedTimeRemaining: loadingState.estimatedTimeRemaining 
      ? `${Math.ceil(loadingState.estimatedTimeRemaining / 1000)}s`
      : null
  };
}

/**
 * Simple loading hook for basic operations
 */
export function useSimpleLoading() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async <T>(
    operation: () => Promise<T>,
    options?: {
      onStart?: () => void;
      onSuccess?: (result: T) => void;
      onError?: (error: Error) => void;
      onFinally?: () => void;
    }
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);
    options?.onStart?.();

    try {
      const result = await operation();
      options?.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Operation failed');
      setError(error.message);
      options?.onError?.(error);
      return null;
    } finally {
      setLoading(false);
      options?.onFinally?.();
    }
  }, []);

  return {
    loading,
    error,
    execute,
    setError,
    clearError: () => setError(null)
  };
}

