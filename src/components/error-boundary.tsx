"use client";

/**
 * Error Boundary Component
 * Catches React hydration errors and component crashes
 */

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?:
    | React.ComponentType<{ error?: Error; retry: () => void }>
    | undefined;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log hydration and component errors
    console.error("Component error caught by ErrorBoundary:", {
      error,
      errorInfo,
      componentStack: errorInfo.componentStack,
    });

    // Check if this is a hydration error
    if (
      error.message.includes("hydration") ||
      error.message.includes("server HTML") ||
      error.message.includes("client-side exception")
    ) {
      console.error("🚨 Hydration error detected:", error.message);
    }

    this.setState({ error, errorInfo });
  }

  retry = () => {
    this.setState({ hasError: false });
  };

  override render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        const fallbackProps = {
          retry: this.retry,
          ...(this.state.error && { error: this.state.error }),
        };
        return <FallbackComponent {...fallbackProps} />;
      }

      // Default error UI
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 text-center shadow-lg">
            <div className="mb-4 flex justify-center">
              <AlertTriangle className="h-12 w-12 text-red-500" />
            </div>

            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              Something went wrong
            </h2>

            <p className="mb-6 text-gray-600">
              We&apos;re sorry, but something unexpected happened. This might be
              a temporary issue.
            </p>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="mb-6 rounded-md bg-red-50 p-4 text-left">
                <p className="font-mono text-sm break-all text-red-800">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Button onClick={this.retry} className="w-full" variant="default">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>

              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="w-full"
              >
                Reload Page
              </Button>
            </div>

            {process.env.NODE_ENV === "development" && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500">
                  Debug Information
                </summary>
                <pre className="mt-2 overflow-auto rounded bg-gray-100 p-2 text-xs">
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?:
    | React.ComponentType<{ error?: Error; retry: () => void }>
    | undefined
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};
