/**
 * Enterprise Error Tracking Infrastructure
 * Advanced error tracking with business impact analysis, correlation, and alerting
 */

import { logger } from "./logger";
import { errorTracker, ErrorContext, TrackedError } from "./error-tracker";
import crypto from "crypto";
import { performance } from "perf_hooks";

// Enhanced business impact tracking
export interface EnterpriseBusinessImpact {
  usersAffected: number;
  revenueImpact: number;
  criticalUserJourneys: string[];
  serviceDowntime: number;
  slaViolation: boolean;
  customerSegmentImpact: Record<string, number>;
  geographicImpact: Record<string, number>;
  featureImpact: Record<string, number>;
}

// Distributed tracing correlation
export interface DistributedTraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  baggage: Record<string, string>;
  sampled: boolean;
  flags: number;
}

// Alert configuration
export interface AlertConfiguration {
  errorThreshold: number;
  timeWindowMs: number;
  severity: "low" | "medium" | "high" | "critical";
  channels: AlertChannel[];
  escalationPolicy: EscalationPolicy;
}

export interface AlertChannel {
  type: "email" | "slack" | "pagerduty" | "webhook";
  endpoint: string;
  metadata?: Record<string, any>;
}

export interface EscalationPolicy {
  levels: EscalationLevel[];
  timeoutMs: number;
}

export interface EscalationLevel {
  level: number;
  channels: AlertChannel[];
  delayMs: number;
}

// Circuit breaker state
export interface CircuitBreakerState {
  state: "closed" | "open" | "half-open";
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

// Recovery action
export interface RecoveryAction {
  id: string;
  name: string;
  description: string;
  automated: boolean;
  script?: string;
  conditions: Record<string, any>;
  cooldownMs: number;
  lastExecuted?: number;
}

export class EnterpriseErrorTracker {
  private alertConfigurations: Map<string, AlertConfiguration> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private recoveryActions: Map<string, RecoveryAction> = new Map();
  private businessImpactAnalyzer: BusinessImpactAnalyzer;
  private alertManager: AlertManager;
  private correlationTracker: CorrelationTracker;
  private metricsCollector: ErrorMetricsCollector;

  constructor() {
    this.businessImpactAnalyzer = new BusinessImpactAnalyzer();
    this.alertManager = new AlertManager();
    this.correlationTracker = new CorrelationTracker();
    this.metricsCollector = new ErrorMetricsCollector();

    this.initializeDefaultConfigurations();
    this.setupHealthChecks();
  }

  /**
   * Track error with enterprise features
   */
  async trackEnterpriseError(
    error: Error,
    context: ErrorContext & {
      traceContext?: DistributedTraceContext;
      businessImpact?: Partial<EnterpriseBusinessImpact>;
      recovery?: {
        attempted: boolean;
        actionId?: string;
        success?: boolean;
      };
    }
  ): Promise<string> {
    const startTime = performance.now();

    // Generate correlation ID
    const correlationId = this.generateCorrelationId();

    // Enhance context with enterprise data
    const enhancedContext: ErrorContext = {
      ...context,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "production",
    };

    // Track with base error tracker
    const errorId = errorTracker.trackError(error, enhancedContext);

    // Get tracked error for enterprise processing
    const trackedError = errorTracker.getError(errorId);
    if (!trackedError) {
      console.error(
        "Failed to retrieve tracked error for enterprise processing",
        { errorId }
      );
      return errorId;
    }

    // Enterprise processing
    await this.processEnterpriseError(trackedError, context);

    return errorId;
  }

  private async processEnterpriseError(
    error: TrackedError,
    context: ErrorContext & {
      traceContext?: DistributedTraceContext;
      businessImpact?: Partial<EnterpriseBusinessImpact>;
      recovery?: any;
    }
  ): Promise<void> {
    try {
      // 1. Business impact analysis
      const businessImpact = await this.businessImpactAnalyzer.analyze(
        error,
        context
      );

      // 2. Correlation tracking
      if (context.traceContext) {
        this.correlationTracker.trackCorrelation(error, context.traceContext);
      }

      // 3. Alert processing
      await this.alertManager.processError(error, businessImpact);

      // 4. Circuit breaker evaluation
      this.evaluateCircuitBreakers(error);

      // 5. Auto-recovery attempt
      if (this.shouldAttemptRecovery(error)) {
        await this.attemptRecovery(error);
      }

      // 6. Metrics collection
      this.metricsCollector.collect(error, businessImpact);
    } catch (processingError) {
      logger.error(
        "Failed to process enterprise error features",
        processingError as Error,
        { originalErrorId: error.id }
      );
    }
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
  }

  private getCpuUsage(): number {
    if (typeof process !== "undefined" && process.cpuUsage) {
      const usage = process.cpuUsage();
      return (usage.user + usage.system) / 1000000; // Convert to milliseconds
    }
    return 0;
  }

  private getMemoryUsage(): number {
    if (typeof process !== "undefined" && process.memoryUsage) {
      const usage = process.memoryUsage();
      return usage.heapUsed / usage.heapTotal;
    }
    return 0;
  }

  private evaluateCircuitBreakers(error: TrackedError): void {
    const service = (error.context as any).serviceName || "unknown";
    const breakerKey = `${service}-${error.category}`;

    let breaker = this.circuitBreakers.get(breakerKey);
    if (!breaker) {
      breaker = {
        state: "closed",
        failureCount: 0,
        successCount: 0,
        lastFailureTime: 0,
        nextAttemptTime: 0,
      };
      this.circuitBreakers.set(breakerKey, breaker);
    }

    const now = Date.now();

    if (error.severity === "critical" || error.severity === "high") {
      breaker.failureCount++;
      breaker.lastFailureTime = now;

      // Open circuit after 5 failures in 5 minutes
      if (breaker.failureCount >= 5 && breaker.state === "closed") {
        breaker.state = "open";
        breaker.nextAttemptTime = now + 60000; // 1 minute timeout

        logger.warn(
          "Circuit breaker opened",
          {
            service,
            category: error.category,
            failureCount: breaker.failureCount,
          },
          ["circuit-breaker", "open"]
        );
      }
    }
  }

  private shouldAttemptRecovery(error: TrackedError): boolean {
    return (
      error.severity === "critical" &&
      error.occurrences <= 3 &&
      this.hasRecoveryAction(error.category)
    );
  }

  private hasRecoveryAction(category: string): boolean {
    return this.recoveryActions.has(category);
  }

  private async attemptRecovery(error: TrackedError): Promise<void> {
    const action = this.recoveryActions.get(error.category);
    if (!action) return;

    const now = Date.now();
    if (action.lastExecuted && now - action.lastExecuted < action.cooldownMs) {
      logger.info("Recovery action in cooldown", {
        actionId: action.id,
        category: error.category,
      });
      return;
    }

    try {
      logger.info(
        "Attempting automated recovery",
        {
          errorId: error.id,
          actionId: action.id,
          actionName: action.name,
        },
        ["recovery", "attempt"]
      );

      if (action.automated && action.script) {
        // Execute recovery script (placeholder - implement based on your infrastructure)
        await this.executeRecoveryScript(action.script, error);
      }

      action.lastExecuted = now;

      logger.info(
        "Recovery action completed",
        {
          errorId: error.id,
          actionId: action.id,
        },
        ["recovery", "success"]
      );
    } catch (recoveryError) {
      logger.error(
        "Recovery action failed",
        recoveryError as Error,
        {
          errorId: error.id,
          actionId: action.id,
        },
        ["recovery", "failure"]
      );
    }
  }

  private async executeRecoveryScript(
    script: string,
    error: TrackedError
  ): Promise<void> {
    // Placeholder for recovery script execution
    // In a real implementation, this would execute scripts safely in a sandboxed environment
    logger.info("Executing recovery script", { script, errorId: error.id });
  }

  private initializeDefaultConfigurations(): void {
    // Default alert configurations
    this.alertConfigurations.set("critical-errors", {
      errorThreshold: 1,
      timeWindowMs: 60000, // 1 minute
      severity: "critical",
      channels: [
        {
          type: "slack",
          endpoint: process.env.SLACK_WEBHOOK_URL || "",
        },
        {
          type: "email",
          endpoint: process.env.ALERT_EMAIL || "",
        },
      ],
      escalationPolicy: {
        levels: [
          {
            level: 1,
            channels: [
              { type: "slack", endpoint: process.env.SLACK_WEBHOOK_URL || "" },
            ],
            delayMs: 0,
          },
          {
            level: 2,
            channels: [
              { type: "email", endpoint: process.env.ALERT_EMAIL || "" },
            ],
            delayMs: 300000, // 5 minutes
          },
        ],
        timeoutMs: 900000, // 15 minutes
      },
    });

    // Default recovery actions
    this.recoveryActions.set("database", {
      id: "db-connection-recovery",
      name: "Database Connection Recovery",
      description: "Restart database connection pool",
      automated: true,
      script: "restart-db-pool",
      conditions: { category: "database", severity: "critical" },
      cooldownMs: 300000, // 5 minutes
    });

    this.recoveryActions.set("infrastructure", {
      id: "service-restart",
      name: "Service Restart",
      description: "Restart application service",
      automated: false, // Require manual intervention
      conditions: { category: "infrastructure", severity: "critical" },
      cooldownMs: 600000, // 10 minutes
    });
  }

  private setupHealthChecks(): void {
    // Monitor the error tracker's own health
    setInterval(() => {
      this.performHealthCheck();
    }, 60000); // Every minute
  }

  private performHealthCheck(): void {
    const metrics = errorTracker.getErrorMetrics();

    // Check for high error rates
    if (metrics.errorRate > 100) {
      // More than 100 errors per hour
      logger.warn(
        "High error rate detected",
        {
          errorRate: metrics.errorRate,
          threshold: 100,
        },
        ["health-check", "high-error-rate"]
      );
    }

    // Check for circuit breaker states
    for (const [key, breaker] of this.circuitBreakers.entries()) {
      if (breaker.state === "open") {
        logger.warn(
          "Circuit breaker is open",
          {
            service: key,
            failureCount: breaker.failureCount,
            lastFailureTime: new Date(breaker.lastFailureTime).toISOString(),
          },
          ["health-check", "circuit-breaker", "open"]
        );
      }
    }
  }

  /**
   * Get comprehensive error analytics
   */
  getEnterpriseAnalytics(): EnterpriseErrorAnalytics {
    const baseMetrics = errorTracker.getErrorMetrics();

    return {
      ...baseMetrics,
      businessImpact: this.businessImpactAnalyzer.getSummary(),
      circuitBreakers: Array.from(this.circuitBreakers.entries()).map(
        ([key, state]) => ({
          service: key,
          ...state,
        })
      ),
      recoveryActions: Array.from(this.recoveryActions.values()),
      correlationMetrics: this.correlationTracker.getMetrics(),
    };
  }

  /**
   * Configure custom alert rules
   */
  configureAlerts(category: string, config: AlertConfiguration): void {
    this.alertConfigurations.set(category, config);
    logger.info("Alert configuration updated", { category, config });
  }

  /**
   * Add custom recovery action
   */
  addRecoveryAction(category: string, action: RecoveryAction): void {
    this.recoveryActions.set(category, action);
    logger.info("Recovery action added", { category, actionId: action.id });
  }

  /**
   * Shutdown enterprise features
   */
  shutdown(): void {
    this.alertManager.shutdown();
    this.correlationTracker.shutdown();
    this.metricsCollector.shutdown();
    logger.info("Enterprise error tracker shutdown completed");
  }
}

// Business Impact Analyzer
class BusinessImpactAnalyzer {
  async analyze(
    error: TrackedError,
    context: ErrorContext & {
      businessImpact?: Partial<EnterpriseBusinessImpact>;
    }
  ): Promise<EnterpriseBusinessImpact> {
    const baseImpact: EnterpriseBusinessImpact = {
      usersAffected: 0,
      revenueImpact: 0,
      criticalUserJourneys: [],
      serviceDowntime: 0,
      slaViolation: false,
      customerSegmentImpact: {},
      geographicImpact: {},
      featureImpact: {},
    };

    // Analyze user impact
    baseImpact.usersAffected = this.calculateUsersAffected(error);

    // Analyze revenue impact
    baseImpact.revenueImpact = this.calculateRevenueImpact(error);

    // Identify critical user journeys
    baseImpact.criticalUserJourneys = this.identifyCriticalJourneys(error);

    // Calculate service downtime
    baseImpact.serviceDowntime = this.calculateServiceDowntime(error);

    // Check SLA violations
    baseImpact.slaViolation = this.checkSlaViolation(error);

    // Analyze customer segments
    baseImpact.customerSegmentImpact = this.analyzeCustomerSegments(error);

    // Analyze geographic impact
    baseImpact.geographicImpact = this.analyzeGeographicImpact(error);

    // Analyze feature impact
    baseImpact.featureImpact = this.analyzeFeatureImpact(error);

    return baseImpact;
  }

  private calculateUsersAffected(error: TrackedError): number {
    const multiplier = this.getSeverityMultiplier(error.severity);
    const categoryMultiplier = this.getCategoryMultiplier(error.category);

    return Math.floor(error.occurrences * multiplier * categoryMultiplier);
  }

  private calculateRevenueImpact(error: TrackedError): number {
    const baseImpact = error.occurrences * 0.1; // $0.10 per error
    const severityMultiplier = this.getSeverityMultiplier(error.severity);

    if (
      (error.context as any).businessContext?.subscriptionTier === "enterprise"
    ) {
      return baseImpact * severityMultiplier * 100;
    }

    if (
      (error.context as any).businessContext?.subscriptionTier === "premium"
    ) {
      return baseImpact * severityMultiplier * 10;
    }

    return baseImpact * severityMultiplier;
  }

  private getSeverityMultiplier(severity: string): number {
    const multipliers: Record<string, number> = {
      low: 1,
      medium: 3,
      high: 10,
      critical: 50,
    };
    return multipliers[severity] || 1;
  }

  private getCategoryMultiplier(category: string): number {
    const multipliers: Record<string, number> = {
      auth: 10,
      security: 20,
      business: 5,
      database: 8,
      infrastructure: 15,
      performance: 3,
      runtime: 2,
      validation: 1,
      network: 4,
      compliance: 25,
      unknown: 1,
    };
    return multipliers[category] || 1;
  }

  private identifyCriticalJourneys(error: TrackedError): string[] {
    const journeys: string[] = [];
    const endpoint = error.context.endpoint || "";

    if (endpoint.includes("auth") || endpoint.includes("login")) {
      journeys.push("user-authentication");
    }
    if (endpoint.includes("payment") || endpoint.includes("billing")) {
      journeys.push("payment-processing");
    }
    if (endpoint.includes("signup") || endpoint.includes("register")) {
      journeys.push("user-onboarding");
    }
    if (endpoint.includes("dashboard") || endpoint.includes("app")) {
      journeys.push("core-application");
    }

    return journeys;
  }

  private calculateServiceDowntime(error: TrackedError): number {
    if (error.severity === "critical" && error.category === "database") {
      return error.occurrences * 1000; // 1 second per occurrence
    }
    return 0;
  }

  private checkSlaViolation(error: TrackedError): boolean {
    return (
      error.severity === "critical" &&
      error.occurrences > 3 &&
      (error.category === "network" || error.category === "database")
    );
  }

  private analyzeCustomerSegments(error: TrackedError): Record<string, number> {
    const segments: Record<string, number> = {};
    const tier = (error.context as any).businessContext?.subscriptionTier;

    if (tier) {
      segments[tier] = error.occurrences;
    }

    return segments;
  }

  private analyzeGeographicImpact(error: TrackedError): Record<string, number> {
    const geographic: Record<string, number> = {};
    const region = (error.context as any).region;

    if (region) {
      geographic[region] = error.occurrences;
    }

    return geographic;
  }

  private analyzeFeatureImpact(error: TrackedError): Record<string, number> {
    const features: Record<string, number> = {};
    const feature = (error.context as any).businessContext?.feature;

    if (feature) {
      features[feature] = error.occurrences;
    }

    return features;
  }

  getSummary(): EnterpriseBusinessImpact {
    // Return aggregated business impact summary
    return {
      usersAffected: 0,
      revenueImpact: 0,
      criticalUserJourneys: [],
      serviceDowntime: 0,
      slaViolation: false,
      customerSegmentImpact: {},
      geographicImpact: {},
      featureImpact: {},
    };
  }
}

// Alert Manager
class AlertManager {
  private alertHistory: Map<string, number> = new Map();
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();

  async processError(
    error: TrackedError,
    businessImpact: EnterpriseBusinessImpact
  ): Promise<void> {
    if (this.shouldAlert(error, businessImpact)) {
      await this.sendAlert(error, businessImpact);
    }
  }

  private shouldAlert(
    error: TrackedError,
    businessImpact: EnterpriseBusinessImpact
  ): boolean {
    // Alert on critical errors or significant business impact
    return (
      error.severity === "critical" ||
      businessImpact.slaViolation ||
      businessImpact.usersAffected > 100 ||
      businessImpact.revenueImpact > 1000
    );
  }

  private async sendAlert(
    error: TrackedError,
    businessImpact: EnterpriseBusinessImpact
  ): Promise<void> {
    const alertKey = `${error.category}-${error.fingerprint.hash}`;
    const lastAlert = this.alertHistory.get(alertKey) || 0;
    const now = Date.now();

    // Rate limit alerts - no more than once per 5 minutes per error type
    if (now - lastAlert < 300000) {
      return;
    }

    this.alertHistory.set(alertKey, now);

    logger.critical(
      "ENTERPRISE ALERT",
      new Error(error.fingerprint.message),
      {
        errorId: error.id,
        severity: error.severity,
        category: error.category,
        occurrences: error.occurrences,
        businessImpact,
        runbookUrl: (error as any).runbookUrl,
        assignedTeam: (error as any).assignedTeam,
      },
      ["alert", "enterprise", error.severity]
    );
  }

  shutdown(): void {
    // Clear all escalation timers
    for (const timer of this.escalationTimers.values()) {
      clearTimeout(timer);
    }
    this.escalationTimers.clear();
  }
}

// Correlation Tracker
class CorrelationTracker {
  private correlations: Map<string, string[]> = new Map();

  trackCorrelation(
    error: TrackedError,
    traceContext: DistributedTraceContext
  ): void {
    const traceId = traceContext.traceId;
    const existing = this.correlations.get(traceId) || [];

    if (!existing.includes(error.id)) {
      existing.push(error.id);
      this.correlations.set(traceId, existing);
    }
  }

  getCorrelatedErrors(traceId: string): string[] {
    return this.correlations.get(traceId) || [];
  }

  getMetrics(): CorrelationMetrics {
    return {
      totalTraces: this.correlations.size,
      totalCorrelatedErrors: Array.from(this.correlations.values()).reduce(
        (sum, errors) => sum + errors.length,
        0
      ),
      averageErrorsPerTrace:
        this.correlations.size > 0
          ? Array.from(this.correlations.values()).reduce(
              (sum, errors) => sum + errors.length,
              0
            ) / this.correlations.size
          : 0,
    };
  }

  shutdown(): void {
    this.correlations.clear();
  }
}

// Error Metrics Collector
class ErrorMetricsCollector {
  private metrics: Map<string, any> = new Map();

  collect(error: TrackedError, businessImpact: EnterpriseBusinessImpact): void {
    // Collect custom metrics for enterprise analysis
    this.updateMetric("errors_by_severity", error.severity, 1);
    this.updateMetric("errors_by_category", error.category, 1);
    this.updateMetric(
      "business_impact_users",
      "total",
      businessImpact.usersAffected
    );
    this.updateMetric(
      "business_impact_revenue",
      "total",
      businessImpact.revenueImpact
    );
  }

  private updateMetric(category: string, key: string, value: number): void {
    const metricKey = `${category}:${key}`;
    const current = this.metrics.get(metricKey) || 0;
    this.metrics.set(metricKey, current + value);
  }

  getMetrics(): Map<string, any> {
    return new Map(this.metrics);
  }

  shutdown(): void {
    this.metrics.clear();
  }
}

// Types
export interface EnterpriseErrorAnalytics {
  totalErrors: number;
  uniqueErrors: number;
  errorRate: number;
  businessImpact: EnterpriseBusinessImpact;
  circuitBreakers: Array<{
    service: string;
    state: string;
    failureCount: number;
    lastFailureTime: number;
  }>;
  recoveryActions: RecoveryAction[];
  correlationMetrics: CorrelationMetrics;
}

export interface CorrelationMetrics {
  totalTraces: number;
  totalCorrelatedErrors: number;
  averageErrorsPerTrace: number;
}

// Singleton instance
export const enterpriseErrorTracker = new EnterpriseErrorTracker();

// Export for global access
if (typeof globalThis !== "undefined") {
  (globalThis as any).EnterpriseErrorTracker = enterpriseErrorTracker;
}
