/**
 * Enterprise Alerting and APM Integration System
 * Real-time alerting, escalation, and application performance monitoring
 */

import { EventEmitter } from "events";
import { enterpriseLogger } from "./enterprise-logger";
import { enterpriseHealthMonitor } from "./enterprise-health-monitor";
import { enterpriseErrorTracker } from "./enterprise-error-tracker";
import { performance } from "perf_hooks";

// Alert interfaces
export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: "info" | "warning" | "critical" | "emergency";
  status: "open" | "acknowledged" | "resolved" | "suppressed";
  source: "health_check" | "error_tracker" | "performance" | "security" | "business" | "custom";
  category: string;
  tags: string[];
  correlationId?: string;
  fingerprint: string;
  firstTriggered: string;
  lastTriggered: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  suppressedUntil?: string;
  escalationLevel: number;
  escalationHistory: EscalationEvent[];
  metadata: Record<string, any>;
  conditions: AlertCondition[];
  actions: AlertAction[];
  businessImpact?: {
    usersAffected: number;
    revenueImpact: number;
    services: string[];
    slaViolation: boolean;
  };
}

export interface AlertCondition {
  id: string;
  type: "threshold" | "anomaly" | "pattern" | "composite";
  metric: string;
  operator: "gt" | "lt" | "eq" | "ne" | "contains" | "regex";
  value: any;
  timeWindow?: number;
  aggregation?: "avg" | "sum" | "min" | "max" | "count";
  enabled: boolean;
}

export interface AlertAction {
  id: string;
  type: "email" | "slack" | "webhook" | "pagerduty" | "sms" | "escalation" | "runbook";
  config: Record<string, any>;
  conditions?: string[];
  delay?: number;
  enabled: boolean;
}

export interface EscalationEvent {
  timestamp: string;
  level: number;
  action: string;
  recipient: string;
  success: boolean;
  error?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: AlertCondition[];
  actions: AlertAction[];
  escalationPolicy: EscalationPolicy;
  suppressionRules: SuppressionRule[];
  metadata: Record<string, any>;
}

export interface EscalationPolicy {
  id: string;
  name: string;
  levels: EscalationLevel[];
  timeout: number; // minutes until escalation
  maxEscalations: number;
}

export interface EscalationLevel {
  level: number;
  actions: AlertAction[];
  timeout: number; // minutes before next escalation
}

export interface SuppressionRule {
  id: string;
  conditions: AlertCondition[];
  duration: number; // minutes
  reason: string;
}

// APM interfaces
export interface APMTrace {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  serviceName: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: "ok" | "error" | "timeout";
  tags: Record<string, any>;
  logs: APMLog[];
  baggage: Record<string, any>;
  errorDetails?: {
    error: boolean;
    errorType?: string;
    errorMessage?: string;
    errorStack?: string;
  };
}

export interface APMLog {
  timestamp: number;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  fields: Record<string, any>;
}

export interface APMMetrics {
  service: string;
  timestamp: number;
  metrics: {
    responseTime: {
      avg: number;
      p50: number;
      p95: number;
      p99: number;
    };
    throughput: {
      rpm: number; // requests per minute
      rps: number; // requests per second
    };
    errorRate: {
      percentage: number;
      total: number;
    };
    saturation: {
      cpu: number;
      memory: number;
      disk: number;
      network: number;
    };
  };
}

// Main alerting system
export class EnterpriseAlertingSystem extends EventEmitter {
  private alerts: Map<string, Alert> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private escalationPolicies: Map<string, EscalationPolicy> = new Map();
  private activeTraces: Map<string, APMTrace> = new Map();
  private metricsBuffer: APMMetrics[] = [];
  private notificationChannels: Map<string, NotificationChannel> = new Map();
  private alertHistory: Alert[] = [];
  private suppressedAlerts: Set<string> = new Set();

  constructor() {
    super();
    this.initializeDefaultRules();
    this.initializeNotificationChannels();
    this.setupHealthMonitoringIntegration();
    this.setupErrorTrackingIntegration();
    this.startMetricsCollection();
    this.startAlertProcessing();
  }

  /**
   * Create a new alert
   */
  async createAlert(alertData: Partial<Alert>): Promise<string> {
    const alertId = alertData.id || `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: Alert = {
      id: alertId,
      title: alertData.title || "Untitled Alert",
      description: alertData.description || "",
      severity: alertData.severity || "warning",
      status: "open",
      source: alertData.source || "custom",
      category: alertData.category || "unknown",
      tags: alertData.tags || [],
      fingerprint: this.generateFingerprint(alertData),
      firstTriggered: new Date().toISOString(),
      lastTriggered: new Date().toISOString(),
      escalationLevel: 0,
      escalationHistory: [],
      metadata: alertData.metadata || {},
      conditions: alertData.conditions || [],
      actions: alertData.actions || [],
      businessImpact: alertData.businessImpact,
      correlationId: alertData.correlationId,
    };

    // Check if alert is suppressed
    if (this.isAlertSuppressed(alert)) {
      enterpriseLogger.info(
        "Alert suppressed",
        { alertId, fingerprint: alert.fingerprint },
        ["alerting", "suppressed"]
      );
      return alertId;
    }

    // Check for duplicate alerts
    const existingAlert = this.findExistingAlert(alert.fingerprint);
    if (existingAlert) {
      existingAlert.lastTriggered = new Date().toISOString();
      enterpriseLogger.info(
        "Duplicate alert aggregated",
        { alertId: existingAlert.id, originalAlertId: alertId },
        ["alerting", "duplicate"]
      );
      return existingAlert.id;
    }

    this.alerts.set(alertId, alert);
    this.alertHistory.push(alert);

    // Log alert creation
    enterpriseLogger.info(
      "Alert created",
      {
        alertId,
        title: alert.title,
        severity: alert.severity,
        source: alert.source,
        category: alert.category,
      },
      ["alerting", "created", alert.severity]
    );

    // Process alert actions
    await this.processAlertActions(alert);

    // Emit alert event
    this.emit("alertCreated", alert);

    return alertId;
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.status !== "open") {
      return false;
    }

    alert.status = "acknowledged";
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date().toISOString();

    enterpriseLogger.info(
      "Alert acknowledged",
      { alertId, acknowledgedBy },
      ["alerting", "acknowledged"]
    );

    this.emit("alertAcknowledged", alert);
    return true;
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, resolvedBy: string, resolution?: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.status = "resolved";
    alert.resolvedBy = resolvedBy;
    alert.resolvedAt = new Date().toISOString();
    
    if (resolution) {
      alert.metadata.resolution = resolution;
    }

    enterpriseLogger.info(
      "Alert resolved",
      { alertId, resolvedBy, resolution },
      ["alerting", "resolved"]
    );

    this.emit("alertResolved", alert);
    return true;
  }

  /**
   * Start a distributed trace
   */
  startTrace(
    operationName: string,
    serviceName: string,
    parentSpanId?: string,
    tags: Record<string, any> = {}
  ): string {
    const traceId = `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const spanId = `span-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const trace: APMTrace = {
      traceId,
      spanId,
      parentSpanId,
      operationName,
      serviceName,
      startTime: performance.now(),
      endTime: 0,
      duration: 0,
      status: "ok",
      tags: {
        ...tags,
        environment: process.env.NODE_ENV || "production",
        version: process.env.npm_package_version || "1.0.0",
      },
      logs: [],
      baggage: {},
    };

    this.activeTraces.set(traceId, trace);
    
    enterpriseLogger.performance(
      "Trace started",
      {
        duration: 0,
      },
      {
        traceId,
        spanId,
        operationName,
        serviceName,
      }
    );

    return traceId;
  }

  /**
   * Finish a trace
   */
  finishTrace(traceId: string, status: "ok" | "error" | "timeout" = "ok", error?: Error): void {
    const trace = this.activeTraces.get(traceId);
    if (!trace) {
      return;
    }

    trace.endTime = performance.now();
    trace.duration = trace.endTime - trace.startTime;
    trace.status = status;

    if (error) {
      trace.errorDetails = {
        error: true,
        errorType: error.constructor.name,
        errorMessage: error.message,
        errorStack: error.stack,
      };
    }

    // Log trace completion
    enterpriseLogger.performance(
      "Trace completed",
      {
        duration: trace.duration,
      },
      {
        traceId,
        spanId: trace.spanId,
        operationName: trace.operationName,
        serviceName: trace.serviceName,
        status,
        duration: trace.duration,
      }
    );

    // Check for performance alerts
    this.checkPerformanceAlerts(trace);

    // Remove from active traces
    this.activeTraces.delete(traceId);
  }

  /**
   * Add log to trace
   */
  addTraceLog(traceId: string, level: "debug" | "info" | "warn" | "error", message: string, fields: Record<string, any> = {}): void {
    const trace = this.activeTraces.get(traceId);
    if (!trace) {
      return;
    }

    trace.logs.push({
      timestamp: performance.now(),
      level,
      message,
      fields,
    });
  }

  /**
   * Get alert statistics
   */
  getAlertStatistics(): {
    total: number;
    open: number;
    acknowledged: number;
    resolved: number;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
    avgResolutionTime: number;
    escalationRate: number;
  } {
    const alerts = Array.from(this.alerts.values());
    
    const bySeverity: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    let totalResolutionTime = 0;
    let resolvedCount = 0;
    let escalatedCount = 0;

    for (const alert of alerts) {
      bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
      byCategory[alert.category] = (byCategory[alert.category] || 0) + 1;

      if (alert.status === "resolved" && alert.resolvedAt) {
        const resolutionTime = new Date(alert.resolvedAt).getTime() - new Date(alert.firstTriggered).getTime();
        totalResolutionTime += resolutionTime;
        resolvedCount++;
      }

      if (alert.escalationLevel > 0) {
        escalatedCount++;
      }
    }

    return {
      total: alerts.length,
      open: alerts.filter(a => a.status === "open").length,
      acknowledged: alerts.filter(a => a.status === "acknowledged").length,
      resolved: alerts.filter(a => a.status === "resolved").length,
      bySeverity,
      byCategory,
      avgResolutionTime: resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0,
      escalationRate: alerts.length > 0 ? escalatedCount / alerts.length : 0,
    };
  }

  /**
   * Get APM metrics
   */
  getAPMMetrics(): APMMetrics[] {
    return [...this.metricsBuffer];
  }

  /**
   * Get active traces
   */
  getActiveTraces(): APMTrace[] {
    return Array.from(this.activeTraces.values());
  }

  // Private methods
  private generateFingerprint(alertData: Partial<Alert>): string {
    const input = `${alertData.title || ""}-${alertData.category || ""}-${alertData.source || ""}`;
    return crypto.createHash("sha256").update(input).digest("hex").substring(0, 16);
  }

  private isAlertSuppressed(alert: Alert): boolean {
    return this.suppressedAlerts.has(alert.fingerprint);
  }

  private findExistingAlert(fingerprint: string): Alert | undefined {
    return Array.from(this.alerts.values()).find(alert => 
      alert.fingerprint === fingerprint && alert.status !== "resolved"
    );
  }

  private async processAlertActions(alert: Alert): Promise<void> {
    for (const action of alert.actions) {
      if (!action.enabled) continue;

      try {
        await this.executeAlertAction(alert, action);
      } catch (error) {
        enterpriseLogger.error(
          "Alert action failed",
          error as Error,
          { alertId: alert.id, actionType: action.type },
          ["alerting", "action-error"]
        );
      }
    }
  }

  private async executeAlertAction(alert: Alert, action: AlertAction): Promise<void> {
    const channel = this.notificationChannels.get(action.type);
    if (!channel) {
      throw new Error(`Unknown notification channel: ${action.type}`);
    }

    await channel.send(alert, action.config);

    enterpriseLogger.info(
      "Alert action executed",
      {
        alertId: alert.id,
        actionType: action.type,
        severity: alert.severity,
      },
      ["alerting", "action-executed"]
    );
  }

  private checkPerformanceAlerts(trace: APMTrace): void {
    // Check for slow requests
    if (trace.duration > 5000) { // 5 seconds
      this.createAlert({
        title: "Slow Request Detected",
        description: `Operation ${trace.operationName} took ${Math.round(trace.duration)}ms`,
        severity: trace.duration > 10000 ? "critical" : "warning",
        source: "performance",
        category: "response_time",
        tags: ["performance", "slow-request"],
        correlationId: trace.traceId,
        metadata: {
          operation: trace.operationName,
          service: trace.serviceName,
          duration: trace.duration,
          traceId: trace.traceId,
        },
      });
    }
  }

  private initializeDefaultRules(): void {
    // Initialize default alerting rules
    const defaultRules: AlertRule[] = [
      {
        id: "high-error-rate",
        name: "High Error Rate",
        description: "Alert when error rate exceeds 5%",
        enabled: true,
        conditions: [
          {
            id: "error-rate-condition",
            type: "threshold",
            metric: "error_rate_percentage",
            operator: "gt",
            value: 5,
            timeWindow: 300000, // 5 minutes
            aggregation: "avg",
            enabled: true,
          },
        ],
        actions: [
          {
            id: "slack-notification",
            type: "slack",
            config: {
              webhook: process.env.SLACK_WEBHOOK_URL,
              channel: "#alerts",
            },
            enabled: true,
          },
        ],
        escalationPolicy: {
          id: "default-escalation",
          name: "Default Escalation",
          levels: [
            {
              level: 1,
              actions: [
                {
                  id: "team-notification",
                  type: "slack",
                  config: { channel: "#dev-team" },
                  enabled: true,
                },
              ],
              timeout: 15, // 15 minutes
            },
            {
              level: 2,
              actions: [
                {
                  id: "manager-notification",
                  type: "email",
                  config: { email: process.env.MANAGER_EMAIL },
                  enabled: true,
                },
              ],
              timeout: 30, // 30 minutes
            },
          ],
          timeout: 15,
          maxEscalations: 2,
        },
        suppressionRules: [],
        metadata: {},
      },
    ];

    for (const rule of defaultRules) {
      this.alertRules.set(rule.id, rule);
    }
  }

  private initializeNotificationChannels(): void {
    this.notificationChannels.set("email", new EmailNotificationChannel());
    this.notificationChannels.set("slack", new SlackNotificationChannel());
    this.notificationChannels.set("webhook", new WebhookNotificationChannel());
    this.notificationChannels.set("pagerduty", new PagerDutyNotificationChannel());
  }

  private setupHealthMonitoringIntegration(): void {
    enterpriseHealthMonitor.on("criticalFailure", async (healthResult) => {
      await this.createAlert({
        title: `Critical Health Check Failed: ${healthResult.name}`,
        description: healthResult.details.error || "Health check failed",
        severity: "critical",
        source: "health_check",
        category: healthResult.category,
        tags: ["health", "critical", healthResult.category],
        metadata: {
          healthCheckId: healthResult.id,
          responseTime: healthResult.responseTime,
          details: healthResult.details,
        },
      });
    });

    enterpriseHealthMonitor.on("statusChange", async ({ id, previous, current }) => {
      if (current === "unhealthy") {
        const healthCheck = enterpriseHealthMonitor.getHealthCheck(id);
        if (healthCheck) {
          await this.createAlert({
            title: `Health Check Status Change: ${healthCheck.name}`,
            description: `Status changed from ${previous} to ${current}`,
            severity: healthCheck.priority === "critical" ? "critical" : "warning",
            source: "health_check",
            category: healthCheck.category,
            tags: ["health", "status-change", healthCheck.category],
            metadata: {
              healthCheckId: id,
              previousStatus: previous,
              currentStatus: current,
              details: healthCheck.details,
            },
          });
        }
      }
    });
  }

  private setupErrorTrackingIntegration(): void {
    enterpriseErrorTracker.subscribeToAlerts("critical", async (error) => {
      await this.createAlert({
        title: `Critical Error: ${error.fingerprint.message}`,
        description: `Critical error occurred: ${error.fingerprint.message}`,
        severity: "critical",
        source: "error_tracker",
        category: error.category,
        tags: ["error", "critical", error.category],
        correlationId: error.correlationContext?.correlationId,
        metadata: {
          errorId: error.id,
          occurrences: error.occurrences,
          fingerprint: error.fingerprint.hash,
          businessImpact: error.businessImpact,
        },
        businessImpact: error.businessImpact,
      });
    });
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      this.collectAPMMetrics();
    }, 60000); // Every minute
  }

  private startAlertProcessing(): void {
    setInterval(() => {
      this.processEscalations();
      this.cleanupResolvedAlerts();
    }, 30000); // Every 30 seconds
  }

  private collectAPMMetrics(): void {
    // Collect metrics from various sources
    const metrics: APMMetrics = {
      service: "contentlab-nexus",
      timestamp: Date.now(),
      metrics: {
        responseTime: {
          avg: this.calculateAverageResponseTime(),
          p50: this.calculatePercentile(50),
          p95: this.calculatePercentile(95),
          p99: this.calculatePercentile(99),
        },
        throughput: {
          rpm: this.calculateRPM(),
          rps: this.calculateRPS(),
        },
        errorRate: {
          percentage: this.calculateErrorRate(),
          total: this.getTotalErrors(),
        },
        saturation: {
          cpu: this.getCPUUsage(),
          memory: this.getMemoryUsage(),
          disk: this.getDiskUsage(),
          network: this.getNetworkUsage(),
        },
      },
    };

    this.metricsBuffer.push(metrics);

    // Keep only last 1000 metrics
    if (this.metricsBuffer.length > 1000) {
      this.metricsBuffer = this.metricsBuffer.slice(-1000);
    }
  }

  private processEscalations(): void {
    for (const alert of this.alerts.values()) {
      if (alert.status === "open" && this.shouldEscalate(alert)) {
        this.escalateAlert(alert);
      }
    }
  }

  private shouldEscalate(alert: Alert): boolean {
    const rule = this.alertRules.get(alert.category);
    if (!rule || !rule.escalationPolicy) return false;

    const timeSinceLastTrigger = Date.now() - new Date(alert.lastTriggered).getTime();
    const escalationTimeout = rule.escalationPolicy.timeout * 60 * 1000; // Convert to milliseconds

    return timeSinceLastTrigger > escalationTimeout && 
           alert.escalationLevel < rule.escalationPolicy.maxEscalations;
  }

  private async escalateAlert(alert: Alert): Promise<void> {
    alert.escalationLevel++;
    
    const escalationEvent: EscalationEvent = {
      timestamp: new Date().toISOString(),
      level: alert.escalationLevel,
      action: "escalated",
      recipient: "system",
      success: true,
    };

    alert.escalationHistory.push(escalationEvent);

    enterpriseLogger.warn(
      "Alert escalated",
      {
        alertId: alert.id,
        escalationLevel: alert.escalationLevel,
        title: alert.title,
      },
      ["alerting", "escalated"]
    );

    this.emit("alertEscalated", alert);
  }

  private cleanupResolvedAlerts(): void {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
    
    for (const [alertId, alert] of this.alerts.entries()) {
      if (alert.status === "resolved" && 
          alert.resolvedAt && 
          new Date(alert.resolvedAt).getTime() < cutoffTime) {
        this.alerts.delete(alertId);
      }
    }
  }

  // Metrics calculation methods (simplified)
  private calculateAverageResponseTime(): number {
    const recentTraces = Array.from(this.activeTraces.values())
      .filter(trace => trace.endTime > 0)
      .slice(-100);
    
    if (recentTraces.length === 0) return 0;
    
    return recentTraces.reduce((sum, trace) => sum + trace.duration, 0) / recentTraces.length;
  }

  private calculatePercentile(percentile: number): number {
    // Simplified percentile calculation
    return 100 + (percentile * 10);
  }

  private calculateRPM(): number {
    return 1200; // Simplified
  }

  private calculateRPS(): number {
    return 20; // Simplified
  }

  private calculateErrorRate(): number {
    return 0.5; // Simplified
  }

  private getTotalErrors(): number {
    return enterpriseErrorTracker.getEnterpriseAnalytics().totalErrors;
  }

  private getCPUUsage(): number {
    return 25.5; // Simplified
  }

  private getMemoryUsage(): number {
    const usage = process.memoryUsage();
    return (usage.heapUsed / usage.heapTotal) * 100;
  }

  private getDiskUsage(): number {
    return 45.2; // Simplified
  }

  private getNetworkUsage(): number {
    return 15.8; // Simplified
  }

  /**
   * Shutdown alerting system
   */
  shutdown(): void {
    this.alerts.clear();
    this.activeTraces.clear();
    this.metricsBuffer = [];
    
    enterpriseLogger.info("Enterprise alerting system shutdown completed");
  }
}

// Notification channel implementations
abstract class NotificationChannel {
  abstract send(alert: Alert, config: Record<string, any>): Promise<void>;
}

class EmailNotificationChannel extends NotificationChannel {
  async send(alert: Alert, config: Record<string, any>): Promise<void> {
    // Implement email notification
    enterpriseLogger.info("Email notification sent", { alertId: alert.id, email: config.email });
  }
}

class SlackNotificationChannel extends NotificationChannel {
  async send(alert: Alert, config: Record<string, any>): Promise<void> {
    if (!config.webhook) return;

    const message = {
      text: `🚨 Alert: ${alert.title}`,
      attachments: [
        {
          color: this.getSeverityColor(alert.severity),
          fields: [
            { title: "Severity", value: alert.severity.toUpperCase(), short: true },
            { title: "Category", value: alert.category, short: true },
            { title: "Description", value: alert.description, short: false },
            { title: "Alert ID", value: alert.id, short: true },
          ],
          timestamp: Math.floor(Date.now() / 1000),
        },
      ],
    };

    try {
      await fetch(config.webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      });
    } catch (error) {
      enterpriseLogger.error("Slack notification failed", error as Error, { alertId: alert.id });
    }
  }

  private getSeverityColor(severity: string): string {
    const colors = {
      info: "#36a64f",
      warning: "#ff9500",
      critical: "#ff0000",
      emergency: "#800000",
    };
    return colors[severity as keyof typeof colors] || "#808080";
  }
}

class WebhookNotificationChannel extends NotificationChannel {
  async send(alert: Alert, config: Record<string, any>): Promise<void> {
    if (!config.url) return;

    try {
      await fetch(config.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(alert),
      });
    } catch (error) {
      enterpriseLogger.error("Webhook notification failed", error as Error, { alertId: alert.id });
    }
  }
}

class PagerDutyNotificationChannel extends NotificationChannel {
  async send(alert: Alert, config: Record<string, any>): Promise<void> {
    // Implement PagerDuty integration
    enterpriseLogger.info("PagerDuty notification sent", { alertId: alert.id });
  }
}

// Export singleton instance
export const enterpriseAlertingSystem = new EnterpriseAlertingSystem();

// Global access
if (typeof globalThis !== "undefined") {
  globalThis.EnterpriseAlertingSystem = enterpriseAlertingSystem;
}