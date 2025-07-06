/**
 * Security & Performance Optimizations for Monitoring System
 * Implements security measures and performance optimizations for Phase 3
 */

import { logger } from "./logger";
import { errorTracker } from "./error-tracker";
import crypto from "crypto";

// Security configuration
const SECURITY_CONFIG = {
  maxLogEntrySize: 10000, // 10KB
  maxApiCallsPerMinute: 100,
  sensitiveFields: [
    "password",
    "token",
    "apiKey",
    "secret",
    "authorization",
    "cookie",
    "session",
    "ssn",
    "creditCard",
    "bankAccount",
    "email",
    "phone",
    "address",
    "ip",
    "userAgent",
  ],
  allowedOrigins: process.env["ALLOWED_ORIGINS"]?.split(",") || [],
  monitoringTokens: new Set(process.env["MONITORING_TOKENS"]?.split(",") || []),
};

// Rate limiting storage
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Performance optimization storage
const performanceCache = new Map<string, { data: any; expiry: number }>();

/**
 * Security middleware for monitoring endpoints
 */
function createSecurityMiddleware() {
  return {
    validateOrigin,
    rateLimitCheck,
    sanitizeInput,
    authenticateMonitoringRequest,
    validateContentType,
    preventDataExfiltration,
  };
}

/**
 * Validate request origin
 */
function validateOrigin(origin: string): boolean {
  if (process.env.NODE_ENV === "development") return true;
  if (!origin) return false;

  return (
    SECURITY_CONFIG.allowedOrigins.length === 0 ||
    SECURITY_CONFIG.allowedOrigins.includes(origin)
  );
}

/**
 * Rate limiting for monitoring endpoints
 */
function rateLimitCheck(clientId: string): {
  allowed: boolean;
  remaining: number;
} {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = SECURITY_CONFIG.maxApiCallsPerMinute;

  const entry = rateLimitMap.get(clientId);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(clientId, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    logger.security({
      type: "suspicious",
      action: "rate_limit_exceeded",
      details: { clientId, count: entry.count, maxRequests },
    });
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count };
}

/**
 * Sanitize input data to prevent injection attacks
 */
function sanitizeInput(input: any): any {
  if (typeof input === "string") {
    return sanitizeString(input);
  }

  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item));
  }

  if (typeof input === "object" && input !== null) {
    return sanitizeObject(input);
  }

  return input;
}

function sanitizeString(str: string): string {
  return str
    .replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      "[SCRIPT_REMOVED]"
    )
    .replace(/javascript:/gi, "javascript_removed:")
    .replace(/on\w+\s*=/gi, "event_removed=")
    .replace(/data:(?!image\/)/gi, "data_removed:")
    .slice(0, SECURITY_CONFIG.maxLogEntrySize);
}

function sanitizeObject(obj: any): any {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // Redact sensitive fields
    if (
      SECURITY_CONFIG.sensitiveFields.some(field =>
        key.toLowerCase().includes(field.toLowerCase())
      )
    ) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = sanitizeInput(value);
    }
  }

  return sanitized;
}

/**
 * Authenticate monitoring requests
 */
function authenticateMonitoringRequest(token?: string): boolean {
  if (process.env.NODE_ENV === "development") return true;
  if (!token) return false;

  return SECURITY_CONFIG.monitoringTokens.has(token);
}

/**
 * Validate content type for POST requests
 */
function validateContentType(contentType?: string): boolean {
  const allowedTypes = ["application/json", "text/plain"];
  return !contentType || allowedTypes.some(type => contentType.includes(type));
}

/**
 * Prevent data exfiltration by limiting response size and content
 */
function preventDataExfiltration(data: any): any {
  const maxResponseSize = 1024 * 1024; // 1MB
  const serialized = JSON.stringify(data);

  if (serialized.length > maxResponseSize) {
    logger.security({
      type: "suspicious",
      action: "large_response_blocked",
      details: {
        responseSize: serialized.length,
        maxSize: maxResponseSize,
      },
    });

    return {
      error: "Response too large",
      message: "Data has been truncated for security reasons",
      truncated: true,
      originalSize: serialized.length,
    };
  }

  return data;
}

/**
 * Performance optimization utilities
 */
function createPerformanceOptimizer() {
  return {
    cacheResponse,
    getCachedResponse,
    clearCache,
    compressData,
    batchRequests,
    deferNonCriticalOperations,
  };
}

/**
 * Cache response data with TTL
 */
function cacheResponse(key: string, data: any, ttlMs = 30000): void {
  const expiry = Date.now() + ttlMs;
  performanceCache.set(key, { data, expiry });

  // Cleanup expired entries periodically
  if (performanceCache.size > 1000) {
    cleanupCache();
  }
}

/**
 * Get cached response if valid
 */
function getCachedResponse(key: string): any | null {
  const entry = performanceCache.get(key);
  if (!entry || Date.now() > entry.expiry) {
    performanceCache.delete(key);
    return null;
  }
  return entry.data;
}

/**
 * Clear performance cache
 */
function clearCache(): void {
  performanceCache.clear();
}

/**
 * Cleanup expired cache entries
 */
function cleanupCache(): void {
  const now = Date.now();
  for (const [key, entry] of performanceCache.entries()) {
    if (now > entry.expiry) {
      performanceCache.delete(key);
    }
  }
}

/**
 * Compress data for storage/transmission
 */
function compressData(data: any): string {
  try {
    const jsonString = JSON.stringify(data);
    const buffer = Buffer.from(jsonString, "utf8");

    // Use simple compression for demonstration
    // In production, consider using zlib or similar
    return buffer.toString("base64");
  } catch (error) {
    logger.error(
      "Data compression failed",
      error instanceof Error ? error : new Error(String(error))
    );
    return JSON.stringify(data);
  }
}

/**
 * Batch multiple requests for efficiency
 */
class RequestBatcher {
  private batches = new Map<
    string,
    {
      requests: any[];
      timer: NodeJS.Timeout;
      resolver: (results: any[]) => void;
    }
  >();

  private batchSize = 10;
  private batchDelay = 100; // ms

  async batchRequest<T>(batchKey: string, request: T): Promise<any> {
    return new Promise(resolve => {
      let batch = this.batches.get(batchKey);

      if (!batch) {
        batch = {
          requests: [],
          timer: setTimeout(() => this.executeBatch(batchKey), this.batchDelay),
          resolver: resolve,
        };
        this.batches.set(batchKey, batch);
      }

      batch.requests.push({ request, resolve });

      if (batch.requests.length >= this.batchSize) {
        clearTimeout(batch.timer);
        this.executeBatch(batchKey);
      }
    });
  }

  private async executeBatch(batchKey: string): Promise<void> {
    const batch = this.batches.get(batchKey);
    if (!batch) return;

    this.batches.delete(batchKey);

    try {
      // Execute all requests in parallel
      const results = await Promise.all(
        batch.requests.map(({ request }) => this.processRequest(request))
      );

      // Resolve all promises
      batch.requests.forEach(({ resolve }, index) => {
        resolve(results[index]);
      });
    } catch (error) {
      // Reject all promises
      batch.requests.forEach(({ resolve }) => {
        resolve({ error: "Batch processing failed" });
      });
    }
  }

  private async processRequest(request: any): Promise<any> {
    // Process individual request - implement based on request type
    return request;
  }
}

const requestBatcher = new RequestBatcher();

function batchRequests<T>(batchKey: string, request: T): Promise<any> {
  return requestBatcher.batchRequest(batchKey, request);
}

/**
 * Defer non-critical operations to avoid blocking
 */
function deferNonCriticalOperations(operations: (() => void)[]): void {
  // Use setImmediate to defer to next tick
  setImmediate(() => {
    operations.forEach(op => {
      try {
        op();
      } catch (error) {
        logger.error(
          "Deferred operation failed",
          error instanceof Error ? error : new Error(String(error))
        );
      }
    });
  });
}

/**
 * Memory management utilities
 */
function createMemoryManager() {
  return {
    monitorMemoryUsage,
    gcOptimization,
    memoryLeakDetection,
    cleanupResources,
  };
}

/**
 * Monitor memory usage and trigger cleanup if needed
 */
function monitorMemoryUsage(): void {
  const memUsage = process.memoryUsage();
  const memoryPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;

  if (memoryPercentage > 85) {
    logger.warn(
      "High memory usage detected",
      {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        percentage: memoryPercentage,
      },
      ["performance", "memory"]
    );

    // Trigger cleanup
    deferNonCriticalOperations([
      () => cleanupCache(),
      () => cleanupRateLimitMap(),
      () => global.gc?.(), // Force garbage collection if available
    ]);
  }
}

/**
 * Optimize garbage collection
 */
function gcOptimization(): void {
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  // Clear any circular references
  performanceCache.clear();

  logger.debug("Garbage collection optimization completed", {}, [
    "performance",
    "gc",
  ]);
}

/**
 * Basic memory leak detection
 */
function memoryLeakDetection(): void {
  const thresholds = {
    rateLimitMap: 10000,
    performanceCache: 1000,
  };

  const issues = [];

  if (rateLimitMap.size > thresholds.rateLimitMap) {
    issues.push(`Rate limit map size: ${rateLimitMap.size}`);
  }

  if (performanceCache.size > thresholds.performanceCache) {
    issues.push(`Performance cache size: ${performanceCache.size}`);
  }

  if (issues.length > 0) {
    logger.warn(
      "Potential memory leaks detected",
      {
        issues,
        recommendations: [
          "Consider increasing cleanup frequency",
          "Check for circular references",
        ],
      },
      ["performance", "memory-leak"]
    );

    errorTracker.trackError(new Error("Memory leak detection triggered"), {
      category: "runtime",
      severity: "medium",
      additional: { issues },
    });
  }
}

/**
 * Cleanup resources
 */
function cleanupResources(): void {
  cleanupCache();
  cleanupRateLimitMap();

  logger.debug(
    "Resource cleanup completed",
    {
      cacheSize: performanceCache.size,
      rateLimitSize: rateLimitMap.size,
    },
    ["performance", "cleanup"]
  );
}

/**
 * Cleanup rate limit map
 */
function cleanupRateLimitMap(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

/**
 * Initialize performance monitoring
 */
function initializePerformanceMonitoring(): void {
  // Monitor memory usage every 5 minutes
  setInterval(monitorMemoryUsage, 5 * 60 * 1000);

  // Cleanup resources every 10 minutes
  setInterval(cleanupResources, 10 * 60 * 1000);

  // Memory leak detection every 30 minutes
  setInterval(memoryLeakDetection, 30 * 60 * 1000);

  logger.info(
    "Performance monitoring initialized",
    {
      memoryMonitoringInterval: "5 minutes",
      resourceCleanupInterval: "10 minutes",
      memoryLeakDetectionInterval: "30 minutes",
    },
    ["performance", "initialization"]
  );
}

// Initialize performance monitoring
if (typeof window === "undefined") {
  initializePerformanceMonitoring();
}

/**
 * Security audit utilities
 */
function createSecurityAuditor() {
  return {
    auditLogEntry,
    validateApiAccess,
    detectAnomalousPatterns,
    generateSecurityReport,
  };
}

/**
 * Audit log entry for security compliance
 */
function auditLogEntry(entry: any): boolean {
  const issues = [];

  // Check for potential sensitive data
  const serialized = JSON.stringify(entry);
  SECURITY_CONFIG.sensitiveFields.forEach(field => {
    if (serialized.toLowerCase().includes(field.toLowerCase())) {
      issues.push(`Potential sensitive field: ${field}`);
    }
  });

  // Check entry size
  if (serialized.length > SECURITY_CONFIG.maxLogEntrySize) {
    issues.push(`Entry size exceeds limit: ${serialized.length} bytes`);
  }

  if (issues.length > 0) {
    logger.security({
      type: "suspicious",
      action: "audit_log_entry_failed",
      details: { issues },
    });
    return false;
  }

  return true;
}

/**
 * Validate API access patterns
 */
function validateApiAccess(clientId: string, endpoint: string): boolean {
  // Check for suspicious patterns
  const suspiciousPatterns = [
    "/admin",
    "/config",
    "/debug",
    "/internal",
    "..",
    "%2e%2e",
    "script",
    "eval",
  ];

  const isSuspicious = suspiciousPatterns.some(pattern =>
    endpoint.toLowerCase().includes(pattern.toLowerCase())
  );

  if (isSuspicious) {
    logger.security({
      type: "attack",
      action: "suspicious_endpoint_access",
      details: { clientId, endpoint },
    });
    return false;
  }

  return true;
}

/**
 * Detect anomalous patterns in monitoring data
 */
function detectAnomalousPatterns(): void {
  // Analyze rate limit violations
  const rateLimitViolations = Array.from(rateLimitMap.entries()).filter(
    ([, entry]) => entry.count >= SECURITY_CONFIG.maxApiCallsPerMinute
  ).length;

  if (rateLimitViolations > 5) {
    logger.security({
      type: "attack",
      action: "multiple_rate_limit_violations",
      details: { violations: rateLimitViolations },
    });
  }
}

/**
 * Generate security report
 */
function generateSecurityReport(): any {
  const report = {
    timestamp: new Date().toISOString(),
    rateLimitEntries: rateLimitMap.size,
    cacheEntries: performanceCache.size,
    securityEvents: 0, // Would track security events in real implementation
    recommendations: [
      "Review rate limit configurations",
      "Monitor for unusual access patterns",
      "Regular security audits recommended",
    ],
  };

  logger.info("Security report generated", report, ["security", "audit"]);
  return report;
}

// Export the main optimization functions
export {
  createSecurityMiddleware,
  createPerformanceOptimizer,
  createMemoryManager,
  createSecurityAuditor,
  SECURITY_CONFIG,
};
