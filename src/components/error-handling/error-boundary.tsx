/**
 * Enhanced Error Boundary System
 * Comprehensive error handling with fallback components and recovery mechanisms
 */

"use client";

import React, { Component, ReactNode, ErrorInfo } from "react";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: "page" | "component" | "feature";
  showDetails?: boolean;
  maxRetries?: number;
}

// Error logging service
class ErrorLogger {
  static logError(error: Error, errorInfo: ErrorInfo, context?: Record<string, unknown>) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "unknown",
      url: typeof window !== "undefined" ? window.location.href : "unknown",
      context,
    };

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.group("🚨 Error Boundary Caught Error");
      console.error("Error:", error);
      console.error("Error Info:", errorInfo);
      console.error("Context:", context);
      console.groupEnd();
    }

    // In production, you would send this to your error tracking service
    // Example: Sentry, LogRocket, DataDog, etc.
    if (process.env.NODE_ENV === "production") {
      // Send to error tracking service
      this.sendToErrorService(errorData);
    }

    return errorData;
  }

  private static async sendToErrorService(errorData: Record<string, unknown>) {
    try {
      // This would be replaced with your actual error tracking service
      await fetch("/api/errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(errorData),
      });
    } catch (err) {
      console.error("Failed to send error to tracking service:", err);
    }
  }
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: Date.now().toString(36) + Math.random().toString(36).substr(2),
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, level = "component" } = this.props;

    // Log the error
    ErrorLogger.logError(error, errorInfo, {
      level,
      retryCount: this.state.retryCount,
      props: this.props,
    });

    // Update state with error info
    this.setState({ errorInfo });

    // Call custom error handler
    onError?.(error, errorInfo);
  }

  override componentWillUnmount() {
    // Clean up any pending retry timeouts
    this.retryTimeouts.forEach(clearTimeout);
  }

  private handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount >= maxRetries) {
      console.warn("Maximum retry attempts reached");
      return;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: retryCount + 1,
    });

    // Auto-retry with exponential backoff for certain errors
    if (this.isRetryableError(this.state.error)) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10 seconds
      const timeout = setTimeout(() => {
        this.forceUpdate();
      }, delay);
      this.retryTimeouts.push(timeout);
    }
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
    });
  };

  private handleGoHome = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/dashboard";
    }
  };

  private isRetryableError(error: Error | null): boolean {
    if (!error) return false;
    
    // Network errors, temporary failures, etc.
    const retryableErrors = [
      "ChunkLoadError",
      "Loading chunk",
      "Loading CSS chunk",
      "NetworkError",
      "Failed to fetch",
    ];

    return retryableErrors.some(pattern => 
      error.message.includes(pattern) || error.name.includes(pattern)
    );
  }

  private getErrorSeverity(): "low" | "medium" | "high" | "critical" {
    const { error, retryCount } = this.state;
    const { level = "component" } = this.props;

    if (!error) return "low";

    // Critical errors
    if (level === "page" || error.name === "ChunkLoadError") {
      return "critical";
    }

    // High severity errors
    if (retryCount >= 2 || error.message.includes("Cannot read property")) {
      return "high";
    }

    // Medium severity errors
    if (error.name === "TypeError" || error.name === "ReferenceError") {
      return "medium";
    }

    return "low";
  }

  private renderFallbackUI() {
    const { fallback, level = "component", showDetails = false } = this.props;
    const { error, errorId, retryCount } = this.state;
    const severity = this.getErrorSeverity();

    // Custom fallback component
    if (fallback) {
      return fallback;
    }

    // Default fallback based on level and severity
    if (level === "page" || severity === "critical") {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="max-w-md w-full mx-auto p-6">
            <div className="text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Something went wrong
              </h1>
              <p className="text-muted-foreground mb-6">
                We encountered an unexpected error. Please try refreshing the page or go back to the dashboard.
              </p>
              
              <div className="space-y-3">
                <Button 
                  onClick={this.handleRetry} 
                  className="w-full"
                  disabled={retryCount >= 3}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {retryCount >= 3 ? "Max retries reached" : "Try Again"}
                </Button>
                
                <Button 
                  onClick={this.handleGoHome} 
                  variant="outline" 
                  className="w-full"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Go to Dashboard
                </Button>
              </div>

              {showDetails && error && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-sm text-muted-foreground">
                    Error Details (ID: {errorId})
                  </summary>
                  <pre className="mt-2 text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Component-level fallback
    return (
      <div className="border border-red-200 bg-red-50 rounded-lg p-4 my-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">This component encountered an error</p>
              <p className="text-sm text-muted-foreground">
                Error ID: {errorId}
              </p>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={this.handleRetry}
                  disabled={retryCount >= 3}
                >
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Retry
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={this.handleReset}
                >
                  Reset
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  override render() {
    if (this.state.hasError) {
      return this.renderFallbackUI();
    }

    return this.props.children;
  }
}

// Specialized error boundaries for different contexts
export const PageErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="page" showDetails={process.env.NODE_ENV === "development"}>
    {children}
  </ErrorBoundary>
);

export const FeatureErrorBoundary: React.FC<{ 
  children: ReactNode; 
  featureName: string;
}> = ({ children, featureName }) => (
  <ErrorBoundary 
    level="feature"
    onError={(error, errorInfo) => {
      ErrorLogger.logError(error, errorInfo, { feature: featureName });
    }}
    fallback={
      <div className="border border-orange-200 bg-orange-50 rounded-lg p-4 my-4">
        <Alert>
          <Bug className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">
                The {featureName} feature is temporarily unavailable
              </p>
              <p className="text-sm text-muted-foreground">
                Please try refreshing the page or check back later.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);

export const ComponentErrorBoundary: React.FC<{ 
  children: ReactNode;
  componentName?: string;
}> = ({ children, componentName }) => (
  <ErrorBoundary 
    level="component"
    onError={(error, errorInfo) => {
      ErrorLogger.logError(error, errorInfo, { component: componentName });
    }}
  >
    {children}
  </ErrorBoundary>
);

// Higher-order component for wrapping components with error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Partial<ErrorBoundaryProps>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Hook for reporting errors manually
export function useErrorReporting() {
  const reportError = React.useCallback((error: Error, context?: Record<string, unknown>) => {
    ErrorLogger.logError(error, { componentStack: "Manual report" }, context);
  }, []);

  return { reportError };
}

export default ErrorBoundary;