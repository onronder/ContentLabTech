/**
 * Enterprise API Metrics Collection System
 * Comprehensive metrics collection for production monitoring
 */

import { enterpriseLogger } from "./enterprise-logger";

// Metrics storage interfaces
interface RequestMetrics {
  requestId: string;
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  timestamp: number;
  userId?: string;
  ipAddress: string;
  userAgent?: string;
  responseSize?: number;
  errorType?: string;
  errorMessage?: string;
}

interface AggregatedMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  medianResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  requestsPerSecond: number;
  lastCalculated: number;
}

interface EndpointMetrics {
  [endpoint: string]: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    lastAccessed: number;
  };
}

interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsByEndpoint: Record<string, number>;
  recentErrors: Array<{
    timestamp: number;
    error: string;
    endpoint: string;
    count: number;
  }>;
}

// In-memory storage for metrics (in production, use Redis or similar)
class MetricsStore {
  private requests: RequestMetrics[] = [];
  private readonly maxStoredRequests = 10000; // Keep last 10k requests
  private readonly metricsWindowMs = 60 * 60 * 1000; // 1 hour window

  addRequest(metrics: RequestMetrics) {
    this.requests.push(metrics);

    // Clean up old requests to prevent memory leaks
    if (this.requests.length > this.maxStoredRequests) {
      this.requests = this.requests.slice(-this.maxStoredRequests);
    }

    // Remove requests older than window
    const cutoff = Date.now() - this.metricsWindowMs;
    this.requests = this.requests.filter(req => req.timestamp > cutoff);
  }

  getRecentRequests(windowMs: number = this.metricsWindowMs): RequestMetrics[] {
    const cutoff = Date.now() - windowMs;
    return this.requests.filter(req => req.timestamp > cutoff);
  }

  clear() {
    this.requests = [];
  }

  getSize(): number {
    return this.requests.length;
  }
}

// Global metrics store
const metricsStore = new MetricsStore();

/**
 * Record API request metrics
 */
export function recordRequestMetrics(
  metrics: Omit<RequestMetrics, "timestamp">
) {
  const requestMetrics: RequestMetrics = {
    ...metrics,
    timestamp: Date.now(),
  };

  metricsStore.addRequest(requestMetrics);

  // Log slow requests
  if (metrics.duration > 5000) {
    enterpriseLogger.warn("Slow API request detected", {
      requestId: metrics.requestId,
      method: metrics.method,
      url: metrics.url,
      duration: metrics.duration,
      statusCode: metrics.statusCode,
    });
  }

  // Log errors
  if (metrics.statusCode >= 400) {
    enterpriseLogger.error(
      "API request error",
      new Error(
        `${metrics.errorType || "HTTP Error"}: ${metrics.errorMessage || "Unknown error"}`
      ),
      {
        requestId: metrics.requestId,
        method: metrics.method,
        url: metrics.url,
        statusCode: metrics.statusCode,
        errorType: metrics.errorType,
        duration: metrics.duration,
      }
    );
  }
}

/**
 * Calculate aggregated metrics
 */
export function getAggregatedMetrics(
  windowMs: number = 60 * 60 * 1000
): AggregatedMetrics {
  const recentRequests = metricsStore.getRecentRequests(windowMs);

  if (recentRequests.length === 0) {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      medianResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      errorRate: 0,
      requestsPerSecond: 0,
      lastCalculated: Date.now(),
    };
  }

  const totalRequests = recentRequests.length;
  const successfulRequests = recentRequests.filter(
    req => req.statusCode < 400
  ).length;
  const failedRequests = totalRequests - successfulRequests;

  // Calculate response time statistics
  const responseTimes = recentRequests
    .map(req => req.duration)
    .sort((a, b) => a - b);
  const averageResponseTime =
    responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  const medianResponseTime =
    responseTimes[Math.floor(responseTimes.length / 2)];
  const p95ResponseTime =
    responseTimes[Math.floor(responseTimes.length * 0.95)];
  const p99ResponseTime =
    responseTimes[Math.floor(responseTimes.length * 0.99)];

  const errorRate = (failedRequests / totalRequests) * 100;
  const requestsPerSecond = totalRequests / (windowMs / 1000);

  return {
    totalRequests,
    successfulRequests,
    failedRequests,
    averageResponseTime: Math.round(averageResponseTime),
    medianResponseTime: medianResponseTime || 0,
    p95ResponseTime: p95ResponseTime || 0,
    p99ResponseTime: p99ResponseTime || 0,
    errorRate: Math.round(errorRate * 100) / 100,
    requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
    lastCalculated: Date.now(),
  };
}

/**
 * Get metrics by endpoint
 */
export function getEndpointMetrics(
  windowMs: number = 60 * 60 * 1000
): EndpointMetrics {
  const recentRequests = metricsStore.getRecentRequests(windowMs);
  const endpointMap: EndpointMetrics = {};

  for (const request of recentRequests) {
    const endpoint = normalizeEndpoint(request.url);

    if (!endpointMap[endpoint]) {
      endpointMap[endpoint] = {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        lastAccessed: 0,
      };
    }

    const metrics = endpointMap[endpoint];
    const prevTotal = metrics.totalRequests;
    const prevAvg = metrics.averageResponseTime;

    metrics.totalRequests++;
    metrics.averageResponseTime =
      (prevAvg * prevTotal + request.duration) / metrics.totalRequests;
    metrics.lastAccessed = Math.max(metrics.lastAccessed, request.timestamp);

    // Calculate error rate
    const endpointRequests = recentRequests.filter(
      req => normalizeEndpoint(req.url) === endpoint
    );
    const endpointErrors = endpointRequests.filter(
      req => req.statusCode >= 400
    ).length;
    metrics.errorRate = (endpointErrors / endpointRequests.length) * 100;
  }

  // Round values
  Object.values(endpointMap).forEach(metrics => {
    metrics.averageResponseTime = Math.round(metrics.averageResponseTime);
    metrics.errorRate = Math.round(metrics.errorRate * 100) / 100;
  });

  return endpointMap;
}

/**
 * Get error analysis
 */
export function getErrorMetrics(
  windowMs: number = 60 * 60 * 1000
): ErrorMetrics {
  const recentRequests = metricsStore.getRecentRequests(windowMs);
  const errors = recentRequests.filter(req => req.statusCode >= 400);

  const errorsByType: Record<string, number> = {};
  const errorsByEndpoint: Record<string, number> = {};
  const errorCounts: Record<string, { count: number; lastSeen: number }> = {};

  for (const error of errors) {
    // Count by error type
    const errorType = error.errorType || `HTTP_${error.statusCode}`;
    errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;

    // Count by endpoint
    const endpoint = normalizeEndpoint(error.url);
    errorsByEndpoint[endpoint] = (errorsByEndpoint[endpoint] || 0) + 1;

    // Track unique error messages
    const errorKey = `${errorType}:${endpoint}`;
    if (!errorCounts[errorKey]) {
      errorCounts[errorKey] = { count: 0, lastSeen: 0 };
    }
    errorCounts[errorKey].count++;
    errorCounts[errorKey].lastSeen = Math.max(
      errorCounts[errorKey].lastSeen,
      error.timestamp
    );
  }

  // Create recent errors array
  const recentErrors = Object.entries(errorCounts)
    .map(([key, data]) => {
      const [errorType, endpoint] = key.split(":");
      return {
        timestamp: data.lastSeen,
        error: errorType || "unknown",
        endpoint: endpoint || "unknown",
        count: data.count,
      };
    })
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 50); // Keep top 50 recent errors

  return {
    totalErrors: errors.length,
    errorsByType,
    errorsByEndpoint,
    recentErrors,
  };
}

/**
 * Get system health status
 */
export function getSystemHealth(): {
  status: "healthy" | "degraded" | "critical";
  metrics: AggregatedMetrics;
  issues: string[];
} {
  const metrics = getAggregatedMetrics();
  const issues: string[] = [];
  let status: "healthy" | "degraded" | "critical" = "healthy";

  // Check error rate
  if (metrics.errorRate > 10) {
    status = "critical";
    issues.push(`High error rate: ${metrics.errorRate}%`);
  } else if (metrics.errorRate > 5) {
    status = "degraded";
    issues.push(`Elevated error rate: ${metrics.errorRate}%`);
  }

  // Check response times
  if (metrics.p95ResponseTime > 10000) {
    status = "critical";
    issues.push(`Very slow response times: P95 ${metrics.p95ResponseTime}ms`);
  } else if (metrics.p95ResponseTime > 5000) {
    if (status === "healthy") status = "degraded";
    issues.push(`Slow response times: P95 ${metrics.p95ResponseTime}ms`);
  }

  // Check request volume
  if (metrics.requestsPerSecond > 100) {
    if (status === "healthy") status = "degraded";
    issues.push(`High request volume: ${metrics.requestsPerSecond} req/s`);
  }

  return { status, metrics, issues };
}

/**
 * Get performance recommendations
 */
export function getPerformanceRecommendations(): string[] {
  const metrics = getAggregatedMetrics();
  const endpointMetrics = getEndpointMetrics();
  const errorMetrics = getErrorMetrics();
  const recommendations: string[] = [];

  // Response time recommendations
  if (metrics.averageResponseTime > 2000) {
    recommendations.push(
      "Consider optimizing database queries and adding caching"
    );
  }

  if (metrics.p95ResponseTime > 5000) {
    recommendations.push("Investigate slow endpoints and add request timeouts");
  }

  // Error rate recommendations
  if (metrics.errorRate > 5) {
    recommendations.push(
      "Review error logs and implement better error handling"
    );
  }

  // Endpoint-specific recommendations
  const slowEndpoints = Object.entries(endpointMetrics)
    .filter(([_, metrics]) => metrics.averageResponseTime > 3000)
    .sort(([_, a], [__, b]) => b.averageResponseTime - a.averageResponseTime)
    .slice(0, 3);

  if (slowEndpoints.length > 0) {
    recommendations.push(
      `Optimize slow endpoints: ${slowEndpoints.map(([endpoint]) => endpoint).join(", ")}`
    );
  }

  // High error endpoints
  const errorEndpoints = Object.entries(endpointMetrics)
    .filter(([_, metrics]) => metrics.errorRate > 10)
    .sort(([_, a], [__, b]) => b.errorRate - a.errorRate)
    .slice(0, 3);

  if (errorEndpoints.length > 0) {
    recommendations.push(
      `Fix high-error endpoints: ${errorEndpoints.map(([endpoint]) => endpoint).join(", ")}`
    );
  }

  // General recommendations
  if (metrics.requestsPerSecond > 50) {
    recommendations.push(
      "Consider implementing request rate limiting and load balancing"
    );
  }

  if (errorMetrics.totalErrors > 100) {
    recommendations.push(
      "Investigate frequent error patterns and improve validation"
    );
  }

  return recommendations;
}

/**
 * Normalize endpoint for grouping
 */
function normalizeEndpoint(url: string): string {
  try {
    const urlObj = new URL(url);
    let pathname = urlObj.pathname;

    // Replace UUIDs with placeholder
    pathname = pathname.replace(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      "/:id"
    );

    // Replace other IDs with placeholder
    pathname = pathname.replace(/\/\d+/g, "/:id");

    return pathname;
  } catch {
    return url;
  }
}

/**
 * Clear all metrics (for testing or reset)
 */
export function clearMetrics() {
  metricsStore.clear();
  enterpriseLogger.info("API metrics cleared");
}

/**
 * Get raw metrics data (for export or analysis)
 */
export function exportMetrics(windowMs: number = 60 * 60 * 1000) {
  return {
    requests: metricsStore.getRecentRequests(windowMs),
    aggregated: getAggregatedMetrics(windowMs),
    endpoints: getEndpointMetrics(windowMs),
    errors: getErrorMetrics(windowMs),
    health: getSystemHealth(),
    recommendations: getPerformanceRecommendations(),
    exportedAt: new Date().toISOString(),
    storeSize: metricsStore.getSize(),
  };
}

// Auto-cleanup interval to prevent memory leaks
setInterval(
  () => {
    const oldSize = metricsStore.getSize();
    // The cleanup happens automatically in addRequest, but we can log it
    if (oldSize > 8000) {
      enterpriseLogger.debug("Metrics store size", { size: oldSize });
    }
  },
  5 * 60 * 1000
); // Check every 5 minutes
