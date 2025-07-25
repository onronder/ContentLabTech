/**
 * Enterprise Logging Infrastructure
 * Structured logging with correlation IDs, audit trails, and compliance features
 */

import { logger } from "./logger";
import crypto from "crypto";
import { performance } from "perf_hooks";

// Enhanced log entry with enterprise features
export interface EnterpriseLogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  error?: Error;
  metadata: LogMetadata;
  correlationId: string;
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  businessContext?: BusinessLogContext;
  securityContext?: SecurityLogContext;
  performanceMetrics?: PerformanceLogMetrics;
  complianceContext?: ComplianceLogContext;
  tags: string[];
  fingerprint: string;
  source: LogSource;
  version: string;
  environment: string;
  service: string;
  instance: string;
  region?: string;
  datacenter?: string;
}

export interface LogMetadata {
  [key: string]: any;
  duration?: number;
  statusCode?: number;
  method?: string;
  endpoint?: string;
  userAgent?: string;
  ip?: string;
  referrer?: string;
}

export interface BusinessLogContext {
  customerId?: string;
  tenantId?: string;
  projectId?: string;
  teamId?: string;
  feature?: string;
  workflow?: string;
  userRole?: string;
  subscriptionTier?: string;
  revenueImpact?: number;
  criticalPath?: boolean;
}

export interface SecurityLogContext {
  actionType: "authentication" | "authorization" | "data_access" | "configuration_change" | "security_event";
  resourceType?: string;
  resourceId?: string;
  permission?: string;
  result: "success" | "failure" | "suspicious";
  threatLevel?: "low" | "medium" | "high" | "critical";
  sourceIp?: string;
  userAgent?: string;
  geoLocation?: {
    country?: string;
    region?: string;
    city?: string;
  };
}

export interface PerformanceLogMetrics {
  duration: number;
  cpuUsage?: number;
  memoryUsage?: number;
  diskUsage?: number;
  networkLatency?: number;
  databaseQueryTime?: number;
  cacheHitRatio?: number;
  throughput?: number;
  errorRate?: number;
}

export interface ComplianceLogContext {
  regulation: "GDPR" | "HIPAA" | "SOX" | "PCI_DSS" | "SOC2" | "CCPA" | "Custom";
  dataClassification: "public" | "internal" | "confidential" | "restricted";
  personalDataInvolved: boolean;
  retentionPeriod?: number;
  encryptionUsed: boolean;
  accessReason?: string;
  dataSubjects?: string[];
  legalBasis?: string;
}

export interface LogSource {
  component: string;
  function?: string;
  file?: string;
  line?: number;
  thread?: string;
  process?: string;
}

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "CRITICAL" | "AUDIT" | "SECURITY" | "PERFORMANCE" | "BUSINESS";

// Audit log entry for compliance
export interface AuditLogEntry extends EnterpriseLogEntry {
  auditType: "access" | "modification" | "deletion" | "creation" | "configuration" | "authentication" | "authorization";
  actor: {
    userId: string;
    userRole: string;
    sessionId: string;
    ip: string;
    userAgent: string;
  };
  target: {
    resourceType: string;
    resourceId: string;
    resourceName?: string;
  };
  action: string;
  outcome: "success" | "failure" | "partial";
  beforeState?: any;
  afterState?: any;
  reason?: string;
  approvalRequired?: boolean;
  approvalStatus?: "pending" | "approved" | "rejected";
  approver?: string;
}

// Log configuration
export interface EnterpriseLoggerConfig {
  level: LogLevel;
  outputs: LogOutput[];
  sampling?: SamplingConfig;
  buffering?: BufferingConfig;
  encryption?: EncryptionConfig;
  retention?: RetentionConfig;
  compliance?: ComplianceConfig;
  performance?: PerformanceConfig;
}

export interface LogOutput {
  type: "console" | "file" | "elasticsearch" | "splunk" | "datadog" | "cloudwatch" | "syslog" | "webhook";
  config: Record<string, any>;
  filters?: LogFilter[];
  formatters?: LogFormatter[];
}

export interface SamplingConfig {
  enabled: boolean;
  rate: number; // 0.0 to 1.0
  criticalAlwaysLogged: boolean;
}

export interface BufferingConfig {
  enabled: boolean;
  maxSize: number;
  flushInterval: number;
  flushOnCritical: boolean;
}

export interface EncryptionConfig {
  enabled: boolean;
  algorithm: string;
  keyId: string;
  fieldsToEncrypt: string[];
}

export interface RetentionConfig {
  defaultPeriod: number; // in days
  levelPeriods: Record<LogLevel, number>;
  archiveAfter: number;
  deleteAfter: number;
}

export interface ComplianceConfig {
  enabled: boolean;
  regulations: string[];
  auditEnabled: boolean;
  dataClassificationRequired: boolean;
  personalDataDetection: boolean;
}

export interface PerformanceConfig {
  metricsEnabled: boolean;
  slowLogThreshold: number;
  memoryThreshold: number;
  cpuThreshold: number;
}

export interface LogFilter {
  field: string;
  operator: "equals" | "contains" | "startsWith" | "endsWith" | "regex";
  value: any;
  action: "include" | "exclude";
}

export interface LogFormatter {
  type: "json" | "text" | "csv" | "custom";
  config: Record<string, any>;
}

// Enterprise Logger Class
export class EnterpriseLogger {
  private config: EnterpriseLoggerConfig;
  private buffer: EnterpriseLogEntry[] = [];
  private correlationContext: Map<string, any> = new Map();
  private auditLogger: AuditLogger;
  private securityLogger: SecurityLogger;
  private performanceLogger: PerformanceLogger;
  private complianceLogger: ComplianceLogger;
  private metricsCollector: LogMetricsCollector;
  private encryptionService: LogEncryptionService;

  constructor(config: Partial<EnterpriseLoggerConfig> = {}) {
    this.config = this.mergeConfig(config);
    this.auditLogger = new AuditLogger(this);
    this.securityLogger = new SecurityLogger(this);
    this.performanceLogger = new PerformanceLogger(this);
    this.complianceLogger = new ComplianceLogger(this);
    this.metricsCollector = new LogMetricsCollector();
    this.encryptionService = new LogEncryptionService(this.config.encryption);
    
    this.initializeBuffering();
    this.initializeCorrelationTracking();
  }

  /**
   * Core logging method with enterprise features
   */
  log(
    level: LogLevel,
    message: string,
    error?: Error,
    metadata: LogMetadata = {},
    tags: string[] = [],
    context?: {
      correlationId?: string;
      businessContext?: BusinessLogContext;
      securityContext?: SecurityLogContext;
      performanceMetrics?: PerformanceLogMetrics;
      complianceContext?: ComplianceLogContext;
    }
  ): void {
    const entry = this.createLogEntry(level, message, error, metadata, tags, context);
    
    // Apply sampling
    if (this.shouldSample(entry)) {
      this.processLogEntry(entry);
    }
  }

  /**
   * Audit logging for compliance
   */
  audit(auditData: Partial<AuditLogEntry>): void {
    this.auditLogger.log(auditData);
  }

  /**
   * Security event logging
   */
  security(
    message: string,
    securityContext: SecurityLogContext,
    metadata: LogMetadata = {}
  ): void {
    this.securityLogger.log(message, securityContext, metadata);
  }

  /**
   * Performance logging
   */
  performance(
    operation: string,
    metrics: PerformanceLogMetrics,
    metadata: LogMetadata = {}
  ): void {
    this.performanceLogger.log(operation, metrics, metadata);
  }

  /**
   * Business event logging
   */
  business(
    event: string,
    businessContext: BusinessLogContext,
    metadata: LogMetadata = {}
  ): void {
    this.log("BUSINESS", event, undefined, metadata, ["business"], { businessContext });
  }

  /**
   * Convenience methods
   */
  debug(message: string, metadata?: LogMetadata, tags?: string[]): void {
    this.log("DEBUG", message, undefined, metadata, tags);
  }

  info(message: string, metadata?: LogMetadata, tags?: string[]): void {
    this.log("INFO", message, undefined, metadata, tags);
  }

  warn(message: string, metadata?: LogMetadata, tags?: string[]): void {
    this.log("WARN", message, undefined, metadata, tags);
  }

  error(message: string, error?: Error, metadata?: LogMetadata, tags?: string[]): void {
    this.log("ERROR", message, error, metadata, tags);
  }

  critical(message: string, error?: Error, metadata?: LogMetadata, tags?: string[]): void {
    this.log("CRITICAL", message, error, metadata, tags);
  }

  /**
   * Correlation context management
   */
  setCorrelationContext(correlationId: string, context: any): void {
    this.correlationContext.set(correlationId, context);
  }

  getCorrelationContext(correlationId: string): any {
    return this.correlationContext.get(correlationId);
  }

  clearCorrelationContext(correlationId: string): void {
    this.correlationContext.delete(correlationId);
  }

  /**
   * Flush buffered logs
   */
  flush(): Promise<void> {
    return this.flushBuffer();
  }

  /**
   * Shutdown logger
   */
  async shutdown(): Promise<void> {
    await this.flushBuffer();
    this.metricsCollector.shutdown();
    logger.info("Enterprise logger shutdown completed");
  }

  // Private methods
  private createLogEntry(
    level: LogLevel,
    message: string,
    error?: Error,
    metadata: LogMetadata = {},
    tags: string[] = [],
    context?: any
  ): EnterpriseLogEntry {
    const now = new Date();
    const correlationId = context?.correlationId || this.generateCorrelationId();
    
    const entry: EnterpriseLogEntry = {
      id: crypto.randomUUID(),
      timestamp: now.toISOString(),
      level,
      message,
      error,
      metadata: {
        ...metadata,
        timestamp: now.getTime(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      correlationId,
      traceId: context?.traceId || correlationId,
      spanId: crypto.randomBytes(8).toString("hex"),
      userId: context?.userId || metadata.userId,
      sessionId: context?.sessionId || metadata.sessionId,
      requestId: context?.requestId || metadata.requestId,
      businessContext: context?.businessContext,
      securityContext: context?.securityContext,
      performanceMetrics: context?.performanceMetrics,
      complianceContext: context?.complianceContext,
      tags: [...tags, level.toLowerCase()],
      fingerprint: this.generateFingerprint(message, error),
      source: this.getLogSource(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "production",
      service: process.env.SERVICE_NAME || "contentlab-nexus",
      instance: process.env.INSTANCE_ID || process.pid.toString(),
      region: process.env.AWS_REGION || process.env.REGION,
      datacenter: process.env.DATACENTER,
    };

    return entry;
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
  }

  private generateFingerprint(message: string, error?: Error): string {
    const input = error ? `${error.name}:${error.message}` : message;
    return crypto.createHash("sha256").update(input).digest("hex").substring(0, 16);
  }

  private getLogSource(): LogSource {
    const stack = new Error().stack;
    const lines = stack?.split("\\n") || [];
    
    // Find the first line that's not from this logger
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i];
      if (line && !line.includes("enterprise-logger.ts")) {
        const match = line.match(/at (.+) \\((.+):(\\d+):(\\d+)\\)/);
        if (match) {
          return {
            component: match[1] || "unknown",
            file: match[2] || "unknown",
            line: parseInt(match[3] || "0"),
            process: process.pid.toString(),
          };
        }
      }
    }
    
    return {
      component: "unknown",
      process: process.pid.toString(),
    };
  }

  private shouldSample(entry: EnterpriseLogEntry): boolean {
    if (!this.config.sampling?.enabled) return true;
    
    // Always log critical events
    if (this.config.sampling.criticalAlwaysLogged && 
        (entry.level === "CRITICAL" || entry.level === "ERROR" || entry.level === "SECURITY")) {
      return true;
    }
    
    return Math.random() < this.config.sampling.rate;
  }

  private processLogEntry(entry: EnterpriseLogEntry): void {
    // Encrypt sensitive fields if configured
    if (this.config.encryption?.enabled) {
      entry = this.encryptionService.encrypt(entry);
    }
    
    // Add to buffer or process immediately
    if (this.config.buffering?.enabled) {
      this.addToBuffer(entry);
    } else {
      this.writeToOutputs(entry);
    }
    
    // Update metrics
    this.metricsCollector.recordLog(entry);
    
    // Check for critical events that need immediate flushing
    if (this.config.buffering?.flushOnCritical && 
        (entry.level === "CRITICAL" || entry.level === "ERROR")) {
      this.flushBuffer();
    }
  }

  private addToBuffer(entry: EnterpriseLogEntry): void {
    this.buffer.push(entry);
    
    if (this.buffer.length >= (this.config.buffering?.maxSize || 1000)) {
      this.flushBuffer();
    }
  }

  private async flushBuffer(): Promise<void> {
    if (this.buffer.length === 0) return;
    
    const entries = [...this.buffer];
    this.buffer = [];
    
    try {
      await Promise.all(entries.map(entry => this.writeToOutputs(entry)));
    } catch (error) {
      console.error("Failed to flush log buffer:", error);
      // Re-add entries to buffer on failure
      this.buffer.unshift(...entries);
    }
  }

  private async writeToOutputs(entry: EnterpriseLogEntry): Promise<void> {
    const promises = this.config.outputs.map(async (output) => {
      try {
        // Apply filters
        if (output.filters && !this.passesFilters(entry, output.filters)) {
          return;
        }
        
        // Format entry
        const formatted = this.formatEntry(entry, output.formatters);
        
        // Write to output
        await this.writeToOutput(output, formatted);
      } catch (error) {
        console.error(`Failed to write to output ${output.type}:`, error);
      }
    });
    
    await Promise.allSettled(promises);
  }

  private passesFilters(entry: EnterpriseLogEntry, filters: LogFilter[]): boolean {
    return filters.every(filter => {
      const value = this.getFieldValue(entry, filter.field);
      const matches = this.matchesFilter(value, filter);
      return filter.action === "include" ? matches : !matches;
    });
  }

  private getFieldValue(entry: EnterpriseLogEntry, field: string): any {
    const parts = field.split(".");
    let value: any = entry;
    
    for (const part of parts) {
      if (value && typeof value === "object") {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  private matchesFilter(value: any, filter: LogFilter): boolean {
    if (value === undefined || value === null) return false;
    
    const stringValue = String(value);
    const filterValue = String(filter.value);
    
    switch (filter.operator) {
      case "equals":
        return stringValue === filterValue;
      case "contains":
        return stringValue.includes(filterValue);
      case "startsWith":
        return stringValue.startsWith(filterValue);
      case "endsWith":
        return stringValue.endsWith(filterValue);
      case "regex":
        return new RegExp(filterValue).test(stringValue);
      default:
        return false;
    }
  }

  private formatEntry(entry: EnterpriseLogEntry, formatters?: LogFormatter[]): any {
    if (!formatters || formatters.length === 0) {
      return entry;
    }
    
    let formatted = entry;
    
    for (const formatter of formatters) {
      formatted = this.applyFormatter(formatted, formatter);
    }
    
    return formatted;
  }

  private applyFormatter(entry: any, formatter: LogFormatter): any {
    switch (formatter.type) {
      case "json":
        return JSON.stringify(entry);
      case "text":
        return this.formatAsText(entry);
      case "csv":
        return this.formatAsCSV(entry);
      default:
        return entry;
    }
  }

  private formatAsText(entry: EnterpriseLogEntry): string {
    const timestamp = entry.timestamp;
    const level = entry.level.padEnd(8);
    const service = entry.service;
    const correlationId = entry.correlationId.substring(0, 8);
    const message = entry.message;
    
    return `${timestamp} [${level}] ${service} (${correlationId}) ${message}`;
  }

  private formatAsCSV(entry: EnterpriseLogEntry): string {
    const fields = [
      entry.timestamp,
      entry.level,
      entry.service,
      entry.correlationId,
      entry.message.replace(/"/g, '""'),
    ];
    
    return fields.map(field => `"${field}"`).join(",");
  }

  private async writeToOutput(output: LogOutput, data: any): Promise<void> {
    switch (output.type) {
      case "console":
        console.log(data);
        break;
      case "file":
        // Implement file output
        break;
      case "elasticsearch":
        // Implement Elasticsearch output
        break;
      case "webhook":
        // Implement webhook output
        await this.sendWebhook(output.config.url, data);
        break;
      default:
        console.warn(`Unknown output type: ${output.type}`);
    }
  }

  private async sendWebhook(url: string, data: any): Promise<void> {
    try {
      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error("Failed to send webhook:", error);
    }
  }

  private mergeConfig(userConfig: Partial<EnterpriseLoggerConfig>): EnterpriseLoggerConfig {
    return {
      level: userConfig.level || "INFO",
      outputs: userConfig.outputs || [
        {
          type: "console",
          config: {},
        },
      ],
      sampling: {
        enabled: false,
        rate: 1.0,
        criticalAlwaysLogged: true,
        ...userConfig.sampling,
      },
      buffering: {
        enabled: false,
        maxSize: 1000,
        flushInterval: 5000,
        flushOnCritical: true,
        ...userConfig.buffering,
      },
      encryption: {
        enabled: false,
        algorithm: "aes-256-gcm",
        keyId: "default",
        fieldsToEncrypt: ["metadata.password", "metadata.token", "metadata.secret"],
        ...userConfig.encryption,
      },
      retention: {
        defaultPeriod: 30,
        levelPeriods: {
          DEBUG: 7,
          INFO: 30,
          WARN: 90,
          ERROR: 365,
          CRITICAL: 365,
          AUDIT: 2555, // 7 years
          SECURITY: 2555,
          PERFORMANCE: 30,
          BUSINESS: 365,
        },
        archiveAfter: 90,
        deleteAfter: 2555,
        ...userConfig.retention,
      },
      compliance: {
        enabled: true,
        regulations: ["GDPR", "SOC2"],
        auditEnabled: true,
        dataClassificationRequired: true,
        personalDataDetection: true,
        ...userConfig.compliance,
      },
      performance: {
        metricsEnabled: true,
        slowLogThreshold: 1000,
        memoryThreshold: 0.8,
        cpuThreshold: 0.8,
        ...userConfig.performance,
      },
    };
  }

  private initializeBuffering(): void {
    if (this.config.buffering?.enabled) {
      setInterval(() => {
        this.flushBuffer();
      }, this.config.buffering.flushInterval);
    }
  }

  private initializeCorrelationTracking(): void {
    // Clean up old correlation contexts
    setInterval(() => {
      // Remove contexts older than 1 hour
      const cutoff = Date.now() - 60 * 60 * 1000;
      for (const [key, value] of this.correlationContext.entries()) {
        if (value.timestamp && value.timestamp < cutoff) {
          this.correlationContext.delete(key);
        }
      }
    }, 10 * 60 * 1000); // Every 10 minutes
  }
}

// Specialized loggers
class AuditLogger {
  constructor(private enterpriseLogger: EnterpriseLogger) {}

  log(auditData: Partial<AuditLogEntry>): void {
    const entry: AuditLogEntry = {
      ...this.enterpriseLogger["createLogEntry"]("AUDIT", auditData.action || "audit_event"),
      auditType: auditData.auditType || "access",
      actor: auditData.actor || {
        userId: "unknown",
        userRole: "unknown", 
        sessionId: "unknown",
        ip: "unknown",
        userAgent: "unknown",
      },
      target: auditData.target || {
        resourceType: "unknown",
        resourceId: "unknown",
      },
      action: auditData.action || "unknown",
      outcome: auditData.outcome || "success",
      beforeState: auditData.beforeState,
      afterState: auditData.afterState,
      reason: auditData.reason,
      approvalRequired: auditData.approvalRequired,
      approvalStatus: auditData.approvalStatus,
      approver: auditData.approver,
    };

    this.enterpriseLogger["processLogEntry"](entry);
  }
}

class SecurityLogger {
  constructor(private enterpriseLogger: EnterpriseLogger) {}

  log(message: string, securityContext: SecurityLogContext, metadata: LogMetadata = {}): void {
    this.enterpriseLogger.log(
      "SECURITY",
      message,
      undefined,
      metadata,
      ["security", securityContext.actionType, securityContext.result],
      { securityContext }
    );
  }
}

class PerformanceLogger {
  constructor(private enterpriseLogger: EnterpriseLogger) {}

  log(operation: string, metrics: PerformanceLogMetrics, metadata: LogMetadata = {}): void {
    const level = metrics.duration > 5000 ? "WARN" : "PERFORMANCE";
    
    this.enterpriseLogger.log(
      level,
      `Performance: ${operation}`,
      undefined,
      { ...metadata, operation },
      ["performance", operation],
      { performanceMetrics: metrics }
    );
  }
}

class ComplianceLogger {
  constructor(private enterpriseLogger: EnterpriseLogger) {}

  log(event: string, complianceContext: ComplianceLogContext, metadata: LogMetadata = {}): void {
    this.enterpriseLogger.log(
      "AUDIT",
      event,
      undefined,
      metadata,
      ["compliance", complianceContext.regulation.toLowerCase()],
      { complianceContext }
    );
  }
}

class LogMetricsCollector {
  private metrics: Map<string, any> = new Map();

  recordLog(entry: EnterpriseLogEntry): void {
    this.incrementMetric(`logs.total`);
    this.incrementMetric(`logs.by_level.${entry.level.toLowerCase()}`);
    this.incrementMetric(`logs.by_service.${entry.service}`);
    
    if (entry.businessContext?.feature) {
      this.incrementMetric(`logs.by_feature.${entry.businessContext.feature}`);
    }
    
    if (entry.securityContext) {
      this.incrementMetric(`logs.security.${entry.securityContext.result}`);
    }
  }

  private incrementMetric(key: string, value: number = 1): void {
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + value);
  }

  getMetrics(): Map<string, any> {
    return new Map(this.metrics);
  }

  shutdown(): void {
    this.metrics.clear();
  }
}

class LogEncryptionService {
  constructor(private config?: EncryptionConfig) {}

  encrypt(entry: EnterpriseLogEntry): EnterpriseLogEntry {
    if (!this.config?.enabled) return entry;
    
    const encrypted = { ...entry };
    
    for (const field of this.config.fieldsToEncrypt) {
      const value = this.getNestedValue(encrypted, field);
      if (value) {
        this.setNestedValue(encrypted, field, this.encryptValue(value));
      }
    }
    
    return encrypted;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split(".");
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => current[key] ||= {}, obj);
    target[lastKey] = value;
  }

  private encryptValue(value: any): string {
    // Simplified encryption - in production, use proper encryption
    return `[ENCRYPTED:${Buffer.from(String(value)).toString("base64")}]`;
  }
}

// Export singleton instance
export const enterpriseLogger = new EnterpriseLogger({
  level: process.env.LOG_LEVEL as LogLevel || "INFO",
  outputs: [
    {
      type: "console",
      config: {},
      formatters: process.env.NODE_ENV === "production" 
        ? [{ type: "json", config: {} }]
        : [{ type: "text", config: {} }],
    },
  ],
  sampling: {
    enabled: process.env.NODE_ENV === "production",
    rate: 0.1, // 10% sampling in production
    criticalAlwaysLogged: true,
  },
  buffering: {
    enabled: process.env.NODE_ENV === "production",
    maxSize: 100,
    flushInterval: 5000,
    flushOnCritical: true,
  },
  compliance: {
    enabled: true,
    regulations: ["GDPR", "SOC2"],
    auditEnabled: true,
    dataClassificationRequired: true,
    personalDataDetection: true,
  },
});

// Global access
if (typeof globalThis !== "undefined") {
  globalThis.EnterpriseLogger = enterpriseLogger;
}