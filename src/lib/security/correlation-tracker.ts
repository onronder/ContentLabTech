/**
 * Request Correlation and Tracking System
 * Production-grade request correlation for security auditing and debugging
 */

import { NextRequest } from "next/server";
import { webcrypto } from "crypto";

export interface CorrelationContext {
  correlationId: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  requestId: string;
  sessionId?: string;
  userId?: string;
  clientIp: string;
  userAgent: string;
  timestamp: number;
  pathname: string;
  method: string;
  referer?: string;
  origin?: string;
}

export interface SecurityEventContext {
  eventType:
    | "auth_failure"
    | "rate_limit"
    | "csrf_violation"
    | "suspicious_request"
    | "validation_error";
  threatLevel: "low" | "medium" | "high" | "critical";
  blocked: boolean;
  reason: string;
  metadata?: Record<string, unknown>;
}

export interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

export class CorrelationTracker {
  private static instance: CorrelationTracker;
  private contexts: Map<string, CorrelationContext> = new Map();
  private securityEvents: Map<string, SecurityEventContext[]> = new Map();
  private performanceMetrics: Map<string, PerformanceMetrics> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up old contexts every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000
    );
  }

  static getInstance(): CorrelationTracker {
    if (!CorrelationTracker.instance) {
      CorrelationTracker.instance = new CorrelationTracker();
    }
    return CorrelationTracker.instance;
  }

  /**
   * Generate cryptographically secure correlation ID
   */
  static generateCorrelationId(): string {
    try {
      const array = new Uint8Array(16);
      webcrypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, "0")).join(
        ""
      );
    } catch {
      return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * Generate trace ID (for distributed tracing)
   */
  static generateTraceId(): string {
    try {
      const array = new Uint8Array(16);
      webcrypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, "0")).join(
        ""
      );
    } catch {
      return `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * Generate span ID (for request spans)
   */
  static generateSpanId(): string {
    try {
      const array = new Uint8Array(8);
      webcrypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, "0")).join(
        ""
      );
    } catch {
      return `span-${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * Create correlation context from request
   */
  createContext(
    request: NextRequest,
    clientIp: string,
    sessionInfo?: { sessionId?: string; userId?: string }
  ): CorrelationContext {
    const correlationId = CorrelationTracker.generateCorrelationId();
    const traceId =
      request.headers.get("x-trace-id") || CorrelationTracker.generateTraceId();
    const spanId = CorrelationTracker.generateSpanId();
    const parentSpanId = request.headers.get("x-parent-span-id");
    const requestId = request.headers.get("x-request-id") || correlationId;

    const context: CorrelationContext = {
      correlationId,
      traceId,
      spanId,
      parentSpanId: parentSpanId || undefined,
      requestId,
      sessionId: sessionInfo?.sessionId,
      userId: sessionInfo?.userId,
      clientIp,
      userAgent: request.headers.get("user-agent") || "unknown",
      timestamp: Date.now(),
      pathname: request.nextUrl.pathname,
      method: request.method,
      referer: request.headers.get("referer") || undefined,
      origin: request.headers.get("origin") || undefined,
    };

    // Store context
    this.contexts.set(correlationId, context);

    // Initialize performance metrics
    this.performanceMetrics.set(correlationId, {
      startTime: Date.now(),
    });

    return context;
  }

  /**
   * Get correlation context by ID
   */
  getContext(correlationId: string): CorrelationContext | undefined {
    return this.contexts.get(correlationId);
  }

  /**
   * Update context with additional information
   */
  updateContext(
    correlationId: string,
    updates: Partial<CorrelationContext>
  ): void {
    const existing = this.contexts.get(correlationId);
    if (existing) {
      this.contexts.set(correlationId, { ...existing, ...updates });
    }
  }

  /**
   * Log security event
   */
  logSecurityEvent(correlationId: string, event: SecurityEventContext): void {
    const events = this.securityEvents.get(correlationId) || [];
    events.push({
      ...event,
      metadata: {
        ...event.metadata,
        timestamp: Date.now(),
      },
    });
    this.securityEvents.set(correlationId, events);

    // Log to enterprise logger if available
    const context = this.getContext(correlationId);
    if (context) {
      this.logToEnterpriseLogger(context, event);
    }
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(
    correlationId: string,
    metrics: Partial<PerformanceMetrics>
  ): void {
    const existing = this.performanceMetrics.get(correlationId);
    if (existing) {
      const updated = { ...existing, ...metrics };

      // Calculate duration if endTime is set
      if (updated.endTime && !updated.duration) {
        updated.duration = updated.endTime - updated.startTime;
      }

      this.performanceMetrics.set(correlationId, updated);
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(correlationId: string): PerformanceMetrics | undefined {
    return this.performanceMetrics.get(correlationId);
  }

  /**
   * Get security events for correlation ID
   */
  getSecurityEvents(correlationId: string): SecurityEventContext[] {
    return this.securityEvents.get(correlationId) || [];
  }

  /**
   * Complete request tracking
   */
  completeRequest(correlationId: string): {
    context: CorrelationContext | undefined;
    securityEvents: SecurityEventContext[];
    performanceMetrics: PerformanceMetrics | undefined;
  } {
    const context = this.contexts.get(correlationId);
    const securityEvents = this.securityEvents.get(correlationId) || [];
    const performanceMetrics = this.performanceMetrics.get(correlationId);

    // Update end time if not set
    if (performanceMetrics && !performanceMetrics.endTime) {
      this.updatePerformanceMetrics(correlationId, {
        endTime: Date.now(),
      });
    }

    return {
      context,
      securityEvents,
      performanceMetrics: this.performanceMetrics.get(correlationId),
    };
  }

  /**
   * Generate fingerprint for request (for anomaly detection)
   */
  generateRequestFingerprint(context: CorrelationContext): string {
    const fingerprintData = [
      context.clientIp,
      context.userAgent,
      context.pathname,
      context.method,
      context.origin || "",
    ].join("|");

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < fingerprintData.length; i++) {
      const char = fingerprintData.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36);
  }

  /**
   * Detect anomalous requests
   */
  detectAnomalies(correlationId: string): {
    isAnomalous: boolean;
    reasons: string[];
    riskScore: number;
  } {
    const context = this.contexts.get(correlationId);
    const securityEvents = this.securityEvents.get(correlationId) || [];

    if (!context) {
      return { isAnomalous: false, reasons: [], riskScore: 0 };
    }

    const reasons: string[] = [];
    let riskScore = 0;

    // Check for multiple security events
    if (securityEvents.length > 3) {
      reasons.push("Multiple security violations");
      riskScore += 30;
    }

    // Check for critical security events
    const criticalEvents = securityEvents.filter(
      e => e.threatLevel === "critical"
    );
    if (criticalEvents.length > 0) {
      reasons.push("Critical security events detected");
      riskScore += 50;
    }

    // Check user agent patterns
    const suspiciousUserAgents = ["curl", "wget", "python-requests", "bot"];
    if (
      suspiciousUserAgents.some(ua =>
        context.userAgent.toLowerCase().includes(ua)
      )
    ) {
      reasons.push("Suspicious user agent");
      riskScore += 20;
    }

    // Check for rapid requests from same IP
    const recentContexts = Array.from(this.contexts.values()).filter(
      c => c.clientIp === context.clientIp && c.timestamp > Date.now() - 60000 // Last minute
    );

    if (recentContexts.length > 20) {
      reasons.push("High request frequency from IP");
      riskScore += 25;
    }

    // Check performance metrics for unusual patterns
    const metrics = this.performanceMetrics.get(correlationId);
    if (metrics && metrics.duration && metrics.duration > 30000) {
      reasons.push("Unusually long request duration");
      riskScore += 15;
    }

    return {
      isAnomalous: riskScore > 50,
      reasons,
      riskScore: Math.min(riskScore, 100),
    };
  }

  /**
   * Log to enterprise logger
   */
  private logToEnterpriseLogger(
    context: CorrelationContext,
    event: SecurityEventContext
  ): void {
    try {
      // Dynamic import to avoid circular dependencies
      import("../monitoring/enterprise-logger")
        .then(({ enterpriseLogger }) => {
          enterpriseLogger.security(
            `Security event: ${event.eventType}`,
            {
              actionType: "security_event",
              result: event.blocked ? "failure" : "suspicious",
              threatLevel: event.threatLevel,
              sourceIp: context.clientIp,
              userAgent: context.userAgent,
            },
            {
              correlationId: context.correlationId,
              traceId: context.traceId,
              spanId: context.spanId,
              pathname: context.pathname,
              method: context.method,
              reason: event.reason,
              metadata: event.metadata,
            }
          );
        })
        .catch(() => {
          // Fallback to console if enterprise logger not available
          console.warn(`[Security Event] ${event.eventType}: ${event.reason}`, {
            correlationId: context.correlationId,
            clientIp: context.clientIp,
            pathname: context.pathname,
          });
        });
    } catch (error) {
      console.error("Failed to log security event:", error);
    }
  }

  /**
   * Cleanup old contexts
   */
  private cleanup(): void {
    const cutoff = Date.now() - 60 * 60 * 1000; // 1 hour

    for (const [id, context] of this.contexts.entries()) {
      if (context.timestamp < cutoff) {
        this.contexts.delete(id);
        this.securityEvents.delete(id);
        this.performanceMetrics.delete(id);
      }
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    activeContexts: number;
    totalSecurityEvents: number;
    avgResponseTime: number;
    topThreats: { type: string; count: number }[];
  } {
    const allEvents = Array.from(this.securityEvents.values()).flat();
    const allMetrics = Array.from(this.performanceMetrics.values());

    // Calculate average response time
    const completedRequests = allMetrics.filter(m => m.duration);
    const avgResponseTime =
      completedRequests.length > 0
        ? completedRequests.reduce((sum, m) => sum + (m.duration || 0), 0) /
          completedRequests.length
        : 0;

    // Count threat types
    const threatCounts = new Map<string, number>();
    allEvents.forEach(event => {
      const count = threatCounts.get(event.eventType) || 0;
      threatCounts.set(event.eventType, count + 1);
    });

    const topThreats = Array.from(threatCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      activeContexts: this.contexts.size,
      totalSecurityEvents: allEvents.length,
      avgResponseTime,
      topThreats,
    };
  }

  /**
   * Shutdown and cleanup
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.contexts.clear();
    this.securityEvents.clear();
    this.performanceMetrics.clear();
  }
}

// Export singleton instance
export const correlationTracker = CorrelationTracker.getInstance();

// Graceful shutdown
if (typeof process !== "undefined") {
  process.on("SIGTERM", () => {
    correlationTracker.shutdown();
  });

  process.on("SIGINT", () => {
    correlationTracker.shutdown();
  });
}
