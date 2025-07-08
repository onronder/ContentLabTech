/**
 * Comprehensive Error Tracking System
 * Real-time error monitoring with context capture and intelligent aggregation
 */

import { useCallback, useEffect, useRef, useState } from 'react';

interface ErrorContext {
  userId?: string;
  sessionId: string;
  userAgent: string;
  url: string;
  timestamp: number;
  buildVersion?: string;
  component?: string;
  action?: string;
  formData?: Record<string, unknown>;
  previousErrors?: string[];
  performanceMetrics?: {
    memoryUsage?: number;
    renderTime?: number;
    networkLatency?: number;
  };
}

interface ErrorDetails {
  id: string;
  message: string;
  stack?: string;
  type: 'javascript' | 'network' | 'validation' | 'authentication' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  count: number;
  firstOccurrence: number;
  lastOccurrence: number;
  context: ErrorContext;
  resolved: boolean;
  recoveryAttempts: number;
}

interface ErrorAggregation {
  errorsByType: Record<string, number>;
  errorsByComponent: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  totalErrors: number;
  uniqueErrors: number;
  errorRate: number;
  resolvedErrors: number;
}

class ErrorTracker {
  private static instance: ErrorTracker;
  private errors: Map<string, ErrorDetails> = new Map();
  private sessionId: string;
  private errorQueue: ErrorDetails[] = [];
  private isOnline = navigator.onLine;
  private retryInterval: NodeJS.Timeout | null = null;
  private subscribers: Set<(error: ErrorDetails) => void> = new Set();

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.setupGlobalErrorHandlers();
    this.setupNetworkHandlers();
    this.setupUnhandledRejectionHandler();
    this.startPeriodicSync();
  }

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupGlobalErrorHandlers(): void {
    window.addEventListener('error', (event) => {
      this.captureError({
        message: event.message,
        stack: event.error?.stack,
        type: 'javascript',
        severity: this.determineSeverity(event.error),
        source: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });
  }

  private setupNetworkHandlers(): void {
    // Monitor fetch failures
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (!response.ok) {
          this.captureError({
            message: `Network request failed: ${response.status} ${response.statusText}`,
            type: 'network',
            severity: response.status >= 500 ? 'high' : 'medium',
            context: {
              url: args[0]?.toString(),
              status: response.status,
              method: args[1]?.method || 'GET',
            },
          });
        }
        return response;
      } catch (error) {
        this.captureError({
          message: `Network request error: ${error}`,
          type: 'network',
          severity: 'high',
          context: {
            url: args[0]?.toString(),
            method: args[1]?.method || 'GET',
          },
        });
        throw error;
      }
    };

    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncErrorQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  private setupUnhandledRejectionHandler(): void {
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        message: `Unhandled promise rejection: ${event.reason}`,
        stack: event.reason?.stack,
        type: 'javascript',
        severity: 'high',
      });
    });
  }

  private determineSeverity(error: Error): ErrorDetails['severity'] {
    if (!error) return 'low';
    
    const message = error.message?.toLowerCase() || '';
    const stack = error.stack?.toLowerCase() || '';

    // Critical errors
    if (message.includes('chunk') || message.includes('loading')) return 'critical';
    if (message.includes('network') || message.includes('fetch')) return 'high';
    if (stack.includes('authentication') || stack.includes('auth')) return 'high';
    
    // Medium errors
    if (message.includes('validation') || message.includes('form')) return 'medium';
    if (stack.includes('useeffect') || stack.includes('usestate')) return 'medium';
    
    return 'low';
  }

  captureError(errorInput: {
    message: string;
    stack?: string;
    type: ErrorDetails['type'];
    severity?: ErrorDetails['severity'];
    component?: string;
    action?: string;
    context?: Record<string, unknown>;
    source?: Record<string, unknown>;
  }): void {
    const errorId = this.generateErrorId(errorInput.message, errorInput.stack);
    const timestamp = Date.now();

    const context: ErrorContext = {
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp,
      component: errorInput.component,
      action: errorInput.action,
      buildVersion: process.env.NEXT_PUBLIC_BUILD_VERSION,
      performanceMetrics: this.getPerformanceMetrics(),
      previousErrors: Array.from(this.errors.keys()).slice(-5),
      ...errorInput.context,
    };

    const existingError = this.errors.get(errorId);
    
    if (existingError) {
      // Update existing error
      existingError.count++;
      existingError.lastOccurrence = timestamp;
      existingError.context = context;
    } else {
      // Create new error
      const newError: ErrorDetails = {
        id: errorId,
        message: errorInput.message,
        stack: errorInput.stack,
        type: errorInput.type,
        severity: errorInput.severity || this.determineSeverityFromMessage(errorInput.message),
        count: 1,
        firstOccurrence: timestamp,
        lastOccurrence: timestamp,
        context,
        resolved: false,
        recoveryAttempts: 0,
      };

      this.errors.set(errorId, newError);
      this.notifySubscribers(newError);
      
      // Add to queue for syncing
      this.errorQueue.push(newError);
    }

    // Auto-sync if online
    if (this.isOnline) {
      this.syncErrorQueue();
    }

    // Attempt automatic recovery for certain error types
    this.attemptErrorRecovery(errorId);
  }

  private generateErrorId(message: string, stack?: string): string {
    const content = `${message}${stack?.split('\n')[0] || ''}`;
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private determineSeverityFromMessage(message: string): ErrorDetails['severity'] {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('critical') || lowerMessage.includes('fatal')) return 'critical';
    if (lowerMessage.includes('error') || lowerMessage.includes('failed')) return 'high';
    if (lowerMessage.includes('warning') || lowerMessage.includes('deprecated')) return 'medium';
    
    return 'low';
  }

  private getPerformanceMetrics() {
    try {
      return {
        memoryUsage: (performance as any).memory?.usedJSHeapSize,
        renderTime: performance.now(),
        networkLatency: this.estimateNetworkLatency(),
      };
    } catch {
      return undefined;
    }
  }

  private estimateNetworkLatency(): number {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return navigation ? navigation.responseStart - navigation.requestStart : 0;
  }

  private async syncErrorQueue(): Promise<void> {
    if (!this.isOnline || this.errorQueue.length === 0) return;

    try {
      // Simulate API call - replace with actual endpoint
      await fetch('/api/monitoring/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errors: this.errorQueue,
          sessionId: this.sessionId,
          timestamp: Date.now(),
        }),
      });

      // Clear queue on successful sync
      this.errorQueue = [];
    } catch (error) {
      console.warn('Failed to sync errors:', error);
      // Keep errors in queue for retry
    }
  }

  private startPeriodicSync(): void {
    this.retryInterval = setInterval(() => {
      if (this.isOnline && this.errorQueue.length > 0) {
        this.syncErrorQueue();
      }
    }, 30000); // Sync every 30 seconds
  }

  private attemptErrorRecovery(errorId: string): void {
    const error = this.errors.get(errorId);
    if (!error || error.recoveryAttempts >= 3) return;

    error.recoveryAttempts++;

    // Recovery strategies based on error type
    switch (error.type) {
      case 'network':
        // Retry network requests
        setTimeout(() => this.triggerNetworkRetry(error), 1000 * error.recoveryAttempts);
        break;
      case 'authentication':
        // Trigger re-authentication
        this.triggerReAuthentication();
        break;
      case 'performance':
        // Clear caches, reload if necessary
        this.clearPerformanceCaches();
        break;
    }
  }

  private triggerNetworkRetry(error: ErrorDetails): void {
    // Implementation would depend on your specific network layer
    console.log('Attempting network retry for:', error.message);
  }

  private triggerReAuthentication(): void {
    // Trigger auth refresh
    window.dispatchEvent(new CustomEvent('auth:refresh-required'));
  }

  private clearPerformanceCaches(): void {
    try {
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
    } catch (error) {
      console.warn('Cache clearing failed:', error);
    }
  }

  // Public API methods
  getErrors(): ErrorDetails[] {
    return Array.from(this.errors.values()).sort((a, b) => b.lastOccurrence - a.lastOccurrence);
  }

  getErrorAggregation(): ErrorAggregation {
    const errors = Array.from(this.errors.values());
    
    return {
      errorsByType: this.aggregateBy(errors, 'type'),
      errorsByComponent: this.aggregateBy(errors, error => error.context.component || 'unknown'),
      errorsBySeverity: this.aggregateBy(errors, 'severity'),
      totalErrors: errors.reduce((sum, error) => sum + error.count, 0),
      uniqueErrors: errors.length,
      errorRate: this.calculateErrorRate(errors),
      resolvedErrors: errors.filter(error => error.resolved).length,
    };
  }

  private aggregateBy<T>(items: T[], key: keyof T | ((item: T) => string)): Record<string, number> {
    return items.reduce((acc, item) => {
      const value = typeof key === 'function' ? key(item) : String(item[key]);
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateErrorRate(errors: ErrorDetails[]): number {
    const totalActions = this.getTotalUserActions(); // Would need to implement
    const totalErrors = errors.reduce((sum, error) => sum + error.count, 0);
    return totalActions > 0 ? (totalErrors / totalActions) * 100 : 0;
  }

  private getTotalUserActions(): number {
    // This would track user interactions - simplified for now
    return 1000; // Placeholder
  }

  markErrorResolved(errorId: string): void {
    const error = this.errors.get(errorId);
    if (error) {
      error.resolved = true;
    }
  }

  subscribe(callback: (error: ErrorDetails) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(error: ErrorDetails): void {
    this.subscribers.forEach(callback => {
      try {
        callback(error);
      } catch (err) {
        console.warn('Error in error tracking subscriber:', err);
      }
    });
  }

  clearErrors(): void {
    this.errors.clear();
    this.errorQueue = [];
  }

  exportErrors(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      timestamp: Date.now(),
      errors: Array.from(this.errors.values()),
      aggregation: this.getErrorAggregation(),
    }, null, 2);
  }
}

// React hooks for error tracking
export function useErrorTracking() {
  const tracker = ErrorTracker.getInstance();
  const [errors, setErrors] = useState<ErrorDetails[]>([]);
  const [aggregation, setAggregation] = useState<ErrorAggregation | null>(null);

  useEffect(() => {
    const updateErrors = () => {
      setErrors(tracker.getErrors());
      setAggregation(tracker.getErrorAggregation());
    };

    updateErrors();
    const unsubscribe = tracker.subscribe(updateErrors);

    return unsubscribe;
  }, [tracker]);

  const captureError = useCallback((errorInput: Parameters<typeof tracker.captureError>[0]) => {
    tracker.captureError(errorInput);
  }, [tracker]);

  const markResolved = useCallback((errorId: string) => {
    tracker.markErrorResolved(errorId);
    setErrors(tracker.getErrors());
    setAggregation(tracker.getErrorAggregation());
  }, [tracker]);

  const exportData = useCallback(() => {
    return tracker.exportErrors();
  }, [tracker]);

  return {
    errors,
    aggregation,
    captureError,
    markResolved,
    exportData,
    clearErrors: tracker.clearErrors.bind(tracker),
  };
}

// Error boundary helper function for integration
export function createErrorTrackingHandler(componentName?: string) {
  return (error: Error, errorInfo?: { componentStack?: string }) => {
    const tracker = ErrorTracker.getInstance();
    tracker.captureError({
      message: error.message,
      stack: error.stack || undefined,
      type: 'javascript',
      severity: 'high',
      component: componentName,
      context: {
        componentStack: errorInfo?.componentStack,
        errorBoundary: true,
      },
    });
  };
}

// Initialize global error tracker
export const errorTracker = ErrorTracker.getInstance();

// Export types
export type { ErrorDetails, ErrorContext, ErrorAggregation };