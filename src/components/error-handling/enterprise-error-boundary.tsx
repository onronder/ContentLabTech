/**
 * Enterprise Error Boundary System
 * Advanced error handling with recovery mechanisms, business impact tracking, and alerting
 */

"use client";

import React, { Component, ReactNode, ErrorInfo } from "react";
import { AlertTriangle, RefreshCw, Home, Bug, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { enterpriseErrorTracker } from "@/lib/monitoring/enterprise-error-tracker";
import { logger } from "@/lib/monitoring/logger";

interface EnterpriseErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
  recoveryAttempted: boolean;
  businessImpact: BusinessImpactSummary | null;
  correlationId: string;
  lastErrorTime: number;
}

interface BusinessImpactSummary {
  severity: "low" | "medium" | "high" | "critical";
  usersAffected: number;
  estimatedDowntime: number;
  revenueImpact: number;
  criticalFeatures: string[];
}

interface EnterpriseErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (
    error: Error,
    errorInfo: ErrorInfo,
    businessImpact: BusinessImpactSummary
  ) => void;
  level?: "page" | "component" | "feature" | "critical";
  showDetails?: boolean;
  maxRetries?: number;
  businessContext?: {
    feature: string;
    userTier: string;
    criticalPath: boolean;
    revenueImpact: number;
  };
  recoveryOptions?: RecoveryOption[];
}

interface RecoveryOption {
  id: string;
  name: string;
  description: string;
  automated: boolean;
  action: () => Promise<void>;
  conditions?: (error: Error) => boolean;
}

// Error classification service
class ErrorClassificationService {
  static classifyError(
    error: Error,
    context?: any
  ): {
    category: string;
    severity: "low" | "medium" | "high" | "critical";
    businessImpact: BusinessImpactSummary;
    recoverable: boolean;
    securityRelevant: boolean;
  } {
    const message = error.message.toLowerCase();
    const stack = error.stack || "";
    const name = error.name;

    // Security classification
    const securityRelevant = this.isSecurityRelevant(error);

    // Severity classification
    const severity = this.calculateSeverity(error, context);

    // Category classification
    const category = this.categorizeError(error);

    // Recoverability assessment
    const recoverable = this.isRecoverable(error);

    // Business impact calculation
    const businessImpact = this.calculateBusinessImpact(
      error,
      context,
      severity
    );

    return {
      category,
      severity,
      businessImpact,
      recoverable,
      securityRelevant,
    };
  }

  private static isSecurityRelevant(error: Error): boolean {
    const securityKeywords = [
      "unauthorized",
      "forbidden",
      "csrf",
      "xss",
      "injection",
      "security",
      "breach",
      "attack",
      "malicious",
      "suspicious",
    ];

    const message = error.message.toLowerCase();
    return securityKeywords.some(keyword => message.includes(keyword));
  }

  private static calculateSeverity(
    error: Error,
    context?: any
  ): "low" | "medium" | "high" | "critical" {
    const message = error.message.toLowerCase();
    const name = error.name;

    // Critical errors
    if (name === "ChunkLoadError" || message.includes("chunk"))
      return "critical";
    if (name === "TypeError" && message.includes("cannot read property"))
      return "critical";
    if (name === "ReferenceError") return "critical";
    if (message.includes("network error") && context?.criticalPath)
      return "critical";
    if (context?.userTier === "enterprise") return "critical";

    // High severity
    if (name === "TypeError" || name === "ReferenceError") return "high";
    if (message.includes("timeout") || message.includes("connection"))
      return "high";
    if (context?.userTier === "premium") return "high";
    if (context?.revenueImpact > 1000) return "high";

    // Medium severity
    if (message.includes("validation") || message.includes("parse"))
      return "medium";
    if (name === "SyntaxError") return "medium";
    if (context?.revenueImpact > 100) return "medium";

    return "low";
  }

  private static categorizeError(error: Error): string {
    const message = error.message.toLowerCase();
    const name = error.name;

    if (name === "ChunkLoadError" || message.includes("loading"))
      return "infrastructure";
    if (name === "TypeError" || name === "ReferenceError") return "runtime";
    if (message.includes("network") || message.includes("fetch"))
      return "network";
    if (message.includes("auth") || message.includes("permission"))
      return "auth";
    if (message.includes("validation") || message.includes("invalid"))
      return "validation";
    if (message.includes("security") || message.includes("breach"))
      return "security";

    return "unknown";
  }

  private static isRecoverable(error: Error): boolean {
    const recoverableTypes = ["ChunkLoadError", "NetworkError"];
    const recoverableMessages = ["loading", "chunk", "network", "timeout"];

    return (
      recoverableTypes.includes(error.name) ||
      recoverableMessages.some(msg => error.message.toLowerCase().includes(msg))
    );
  }

  private static calculateBusinessImpact(
    error: Error,
    context?: any,
    severity?: string
  ): BusinessImpactSummary {
    const baseSeverity = severity || "low";

    return {
      severity: baseSeverity as "low" | "medium" | "high" | "critical",
      usersAffected: this.estimateUsersAffected(error, context, baseSeverity),
      estimatedDowntime: this.estimateDowntime(error, context, baseSeverity),
      revenueImpact:
        context?.revenueImpact ||
        this.estimateRevenueImpact(error, context, baseSeverity),
      criticalFeatures: this.identifyCriticalFeatures(error, context),
    };
  }

  private static estimateUsersAffected(
    error: Error,
    context?: any,
    severity?: string
  ): number {
    const multipliers = { low: 1, medium: 10, high: 100, critical: 1000 };
    const base =
      context?.userTier === "enterprise"
        ? 500
        : context?.userTier === "premium"
          ? 50
          : 5;
    return base * (multipliers[severity as keyof typeof multipliers] || 1);
  }

  private static estimateDowntime(
    error: Error,
    context?: any,
    severity?: string
  ): number {
    if (severity === "critical") return 300; // 5 minutes
    if (severity === "high") return 60; // 1 minute
    if (severity === "medium") return 10; // 10 seconds
    return 0;
  }

  private static estimateRevenueImpact(
    error: Error,
    context?: any,
    severity?: string
  ): number {
    const multipliers = { low: 1, medium: 10, high: 100, critical: 1000 };
    const base =
      context?.userTier === "enterprise"
        ? 100
        : context?.userTier === "premium"
          ? 10
          : 1;
    return base * (multipliers[severity as keyof typeof multipliers] || 1);
  }

  private static identifyCriticalFeatures(
    error: Error,
    context?: any
  ): string[] {
    const features: string[] = [];

    if (context?.feature) features.push(context.feature);
    if (context?.criticalPath) features.push("critical-user-journey");
    if (error.message.includes("auth")) features.push("authentication");
    if (error.message.includes("payment")) features.push("payment-processing");

    return features;
  }
}

export class EnterpriseErrorBoundary extends Component<
  EnterpriseErrorBoundaryProps,
  EnterpriseErrorBoundaryState
> {
  private retryTimeouts: NodeJS.Timeout[] = [];
  private recoveryActions: Map<string, RecoveryOption> = new Map();

  constructor(props: EnterpriseErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      recoveryAttempted: false,
      businessImpact: null,
      correlationId: this.generateCorrelationId(),
      lastErrorTime: 0,
    };

    // Initialize recovery actions
    this.initializeRecoveryActions();
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeRecoveryActions(): void {
    const defaultRecoveryActions: RecoveryOption[] = [
      {
        id: "reload-page",
        name: "Reload Page",
        description: "Refresh the entire page",
        automated: false,
        action: async () => {
          window.location.reload();
        },
      },
      {
        id: "clear-cache",
        name: "Clear Cache",
        description: "Clear browser cache and reload",
        automated: false,
        action: async () => {
          if ("caches" in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
          }
          localStorage.clear();
          sessionStorage.clear();
          window.location.reload();
        },
      },
      {
        id: "fallback-mode",
        name: "Fallback Mode",
        description: "Switch to simplified interface",
        automated: true,
        action: async () => {
          // Implement fallback mode
          this.setState({ recoveryAttempted: true });
        },
        conditions: (error: Error) => error.name === "ChunkLoadError",
      },
    ];

    // Merge with custom recovery options
    const allActions = [
      ...defaultRecoveryActions,
      ...(this.props.recoveryOptions || []),
    ];
    allActions.forEach(action => {
      this.recoveryActions.set(action.id, action);
    });
  }

  static getDerivedStateFromError(
    error: Error
  ): Partial<EnterpriseErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: Date.now().toString(36) + Math.random().toString(36).substr(2),
      lastErrorTime: Date.now(),
    };
  }

  override async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, level = "component", businessContext } = this.props;

    // Classify the error
    const classification = ErrorClassificationService.classifyError(
      error,
      businessContext
    );

    // Track with enterprise error tracker
    try {
      await enterpriseErrorTracker.trackEnterpriseError(error, {
        endpoint: window.location.pathname,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "production",
        traceContext: {
          traceId: this.state.correlationId,
          spanId: this.state.errorId!,
          baggage: {
            level,
            component: this.constructor.name,
          },
          sampled: true,
          flags: 1,
        },
        businessImpact: {
          usersAffected: classification.businessImpact.usersAffected,
          revenueImpact: classification.businessImpact.revenueImpact,
          criticalUserJourneys: classification.businessImpact.criticalFeatures,
          serviceDowntime: classification.businessImpact.estimatedDowntime,
          slaViolation: classification.severity === "critical",
        },
      });
    } catch (trackingError) {
      logger.error(
        "Failed to track error with enterprise tracker",
        trackingError as Error
      );
    }

    // Update state with business impact
    this.setState({
      errorInfo,
      businessImpact: classification.businessImpact,
    });

    // Call custom error handler
    onError?.(error, errorInfo, classification.businessImpact);

    // Attempt automated recovery for recoverable errors
    if (classification.recoverable && !this.state.recoveryAttempted) {
      await this.attemptAutomatedRecovery(error);
    }

    // Log comprehensive error information
    logger.error(
      "Enterprise Error Boundary caught error",
      error,
      {
        errorId: this.state.errorId,
        correlationId: this.state.correlationId,
        level,
        classification,
        businessContext,
        componentStack: errorInfo.componentStack,
      },
      ["error-boundary", "enterprise", classification.severity]
    );
  }

  private async attemptAutomatedRecovery(error: Error): Promise<void> {
    for (const [actionId, action] of this.recoveryActions.entries()) {
      if (
        action.automated &&
        (!action.conditions || action.conditions(error))
      ) {
        try {
          logger.info("Attempting automated recovery", {
            actionId,
            errorId: this.state.errorId,
          });
          await action.action();
          this.setState({ recoveryAttempted: true });
          break;
        } catch (recoveryError) {
          logger.error("Automated recovery failed", recoveryError as Error, {
            actionId,
          });
        }
      }
    }
  }

  override componentWillUnmount() {
    // Clean up any pending retry timeouts
    this.retryTimeouts.forEach(clearTimeout);
  }

  private handleRetry = async () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount, error } = this.state;

    if (retryCount >= maxRetries) {
      logger.warn("Maximum retry attempts reached", {
        errorId: this.state.errorId,
        retryCount,
      });
      return;
    }

    // Reset state for retry
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: retryCount + 1,
      recoveryAttempted: false,
    });

    // Log retry attempt
    logger.info("Error boundary retry attempted", {
      errorId: this.state.errorId,
      retryCount: retryCount + 1,
      maxRetries,
    });
  };

  private handleRecoveryAction = async (actionId: string) => {
    const action = this.recoveryActions.get(actionId);
    if (!action) return;

    try {
      logger.info("Manual recovery action initiated", {
        actionId,
        errorId: this.state.errorId,
      });

      await action.action();

      logger.info("Manual recovery action completed", {
        actionId,
        errorId: this.state.errorId,
      });
    } catch (recoveryError) {
      logger.error("Manual recovery action failed", recoveryError as Error, {
        actionId,
        originalErrorId: this.state.errorId,
      });
    }
  };

  private getSeverityColor(severity: string): string {
    const colors = {
      low: "bg-blue-100 text-blue-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-orange-100 text-orange-800",
      critical: "bg-red-100 text-red-800",
    };
    return colors[severity as keyof typeof colors] || colors.low;
  }

  private renderBusinessImpact(): ReactNode {
    const { businessImpact } = this.state;
    if (!businessImpact) return null;

    return (
      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Shield className="h-4 w-4" />
            Business Impact Assessment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Severity</span>
            <Badge className={this.getSeverityColor(businessImpact.severity)}>
              {businessImpact.severity.toUpperCase()}
            </Badge>
          </div>

          {businessImpact.usersAffected > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">
                Users Affected
              </span>
              <span className="text-sm font-medium">
                {businessImpact.usersAffected.toLocaleString()}
              </span>
            </div>
          )}

          {businessImpact.estimatedDowntime > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">
                Est. Downtime
              </span>
              <span className="text-sm font-medium">
                {businessImpact.estimatedDowntime}s
              </span>
            </div>
          )}

          {businessImpact.revenueImpact > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">
                Revenue Impact
              </span>
              <span className="text-sm font-medium">
                ${businessImpact.revenueImpact.toLocaleString()}
              </span>
            </div>
          )}

          {businessImpact.criticalFeatures.length > 0 && (
            <div className="space-y-1">
              <span className="text-muted-foreground text-sm">
                Affected Features
              </span>
              <div className="flex flex-wrap gap-1">
                {businessImpact.criticalFeatures.map((feature, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  private renderRecoveryActions(): ReactNode {
    const availableActions = Array.from(this.recoveryActions.values()).filter(
      action => !action.automated
    );

    if (availableActions.length === 0) return null;

    return (
      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Zap className="h-4 w-4" />
            Recovery Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {availableActions.map(action => (
              <Button
                key={action.id}
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => this.handleRecoveryAction(action.id)}
              >
                {action.name}
                <span className="text-muted-foreground ml-2 text-xs">
                  {action.description}
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  private renderErrorDetails(): ReactNode {
    const { error, errorInfo, errorId, correlationId } = this.state;
    const { showDetails = process.env.NODE_ENV === "development" } = this.props;

    if (!showDetails || !error) return null;

    return (
      <details className="mt-4">
        <summary className="text-muted-foreground mb-2 cursor-pointer text-sm">
          Technical Details
        </summary>
        <div className="space-y-3 text-xs">
          <div>
            <strong>Error ID:</strong> {errorId}
          </div>
          <div>
            <strong>Correlation ID:</strong> {correlationId}
          </div>
          <div>
            <strong>Error Type:</strong> {error.name}
          </div>
          <div>
            <strong>Message:</strong> {error.message}
          </div>
          <div>
            <strong>Stack Trace:</strong>
            <pre className="bg-muted mt-1 max-h-32 overflow-auto rounded p-2 text-xs">
              {error.stack}
            </pre>
          </div>
          {errorInfo && (
            <div>
              <strong>Component Stack:</strong>
              <pre className="bg-muted mt-1 max-h-32 overflow-auto rounded p-2 text-xs">
                {errorInfo.componentStack}
              </pre>
            </div>
          )}
        </div>
      </details>
    );
  }

  private renderFallbackUI(): ReactNode {
    const { fallback, level = "component" } = this.props;
    const { error, retryCount, businessImpact } = this.state;

    // Custom fallback component
    if (fallback) {
      return fallback;
    }

    // Critical page-level error
    if (
      level === "page" ||
      level === "critical" ||
      businessImpact?.severity === "critical"
    ) {
      return (
        <div className="bg-background flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-md">
            <Card>
              <CardHeader className="text-center">
                <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
                <CardTitle className="text-xl">System Error</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-center">
                  We encountered a critical error that prevented the application
                  from functioning properly.
                </p>

                {this.renderBusinessImpact()}

                <div className="space-y-2">
                  <Button
                    onClick={this.handleRetry}
                    className="w-full"
                    disabled={retryCount >= 3}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {retryCount >= 3 ? "Max retries reached" : "Try Again"}
                  </Button>

                  <Button
                    onClick={() => (window.location.href = "/dashboard")}
                    variant="outline"
                    className="w-full"
                  >
                    <Home className="mr-2 h-4 w-4" />
                    Go to Dashboard
                  </Button>
                </div>

                {this.renderRecoveryActions()}
                {this.renderErrorDetails()}
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    // Component-level error
    return (
      <div className="my-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-3">
              <div>
                <p className="font-medium">Component Error</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  This component encountered an error and couldn&apos;t render
                  properly.
                </p>
              </div>

              {businessImpact && (
                <div className="text-xs">
                  <Badge
                    className={this.getSeverityColor(businessImpact.severity)}
                  >
                    {businessImpact.severity.toUpperCase()} IMPACT
                  </Badge>
                </div>
              )}

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
              </div>

              {this.renderErrorDetails()}
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
export const CriticalErrorBoundary: React.FC<{
  children: ReactNode;
  businessContext?: any;
}> = ({ children, businessContext }) => (
  <EnterpriseErrorBoundary
    level="critical"
    businessContext={businessContext}
    showDetails={process.env.NODE_ENV === "development"}
    maxRetries={1}
  >
    {children}
  </EnterpriseErrorBoundary>
);

export const PageErrorBoundary: React.FC<{
  children: ReactNode;
  businessContext?: any;
}> = ({ children, businessContext }) => (
  <EnterpriseErrorBoundary
    level="page"
    businessContext={businessContext}
    showDetails={process.env.NODE_ENV === "development"}
  >
    {children}
  </EnterpriseErrorBoundary>
);

export const FeatureErrorBoundary: React.FC<{
  children: ReactNode;
  featureName: string;
  businessContext?: any;
}> = ({ children, featureName, businessContext }) => (
  <EnterpriseErrorBoundary
    level="feature"
    businessContext={{ ...businessContext, feature: featureName }}
    fallback={
      <Alert className="my-4">
        <Bug className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">Feature Temporarily Unavailable</p>
            <p className="text-muted-foreground text-sm">
              The {featureName} feature is experiencing issues. Please try again
              later.
            </p>
          </div>
        </AlertDescription>
      </Alert>
    }
  >
    {children}
  </EnterpriseErrorBoundary>
);

// Higher-order component for wrapping with enterprise error boundary
export function withEnterpriseErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Partial<EnterpriseErrorBoundaryProps>
) {
  const WrappedComponent = (props: P) => (
    <EnterpriseErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </EnterpriseErrorBoundary>
  );

  WrappedComponent.displayName = `withEnterpriseErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

export default EnterpriseErrorBoundary;
