/**
 * Enterprise System Metrics API
 * Comprehensive backend metrics and analytics for system monitoring
 */

import { NextRequest, NextResponse } from "next/server";
import {
  withApiAuth,
  createSuccessResponse,
  validateTeamAccess,
} from "@/lib/auth/withApiAuth-v2";
import { enterpriseLogger } from "@/lib/monitoring/enterprise-logger";
import {
  getAggregatedMetrics,
  getEndpointMetrics,
  getErrorMetrics,
  getSystemHealth,
  getPerformanceRecommendations,
  exportMetrics,
  clearMetrics,
} from "@/lib/monitoring/api-metrics";
import { validateInput } from "@/lib/security/validation";

/**
 * Get system metrics with filtering and time windows
 */
async function handleGet(request: NextRequest, context: any) {
  const { requestId, user } = context;
  const url = new URL(request.url);

  try {
    // Parse query parameters
    const windowMs = parseInt(url.searchParams.get("window") || "3600000"); // Default 1 hour
    const includeEndpoints = url.searchParams.get("endpoints") === "true";
    const includeErrors = url.searchParams.get("errors") === "true";
    const includeRecommendations =
      url.searchParams.get("recommendations") === "true";
    const format = url.searchParams.get("format") || "json";

    // Validate window parameter
    if (windowMs < 60000 || windowMs > 86400000) {
      // 1 minute to 24 hours
      return NextResponse.json(
        {
          error:
            "Invalid time window. Must be between 60000ms (1 minute) and 86400000ms (24 hours)",
          requestId,
        },
        { status: 400 }
      );
    }

    enterpriseLogger.info("System metrics request", {
      requestId,
      userId: user.id,
      windowMs,
      includeEndpoints,
      includeErrors,
      includeRecommendations,
      format,
    });

    // Get metrics data
    const [
      aggregatedMetrics,
      systemHealth,
      endpointMetrics,
      errorMetrics,
      recommendations,
    ] = await Promise.all([
      Promise.resolve(getAggregatedMetrics(windowMs)),
      Promise.resolve(getSystemHealth()),
      includeEndpoints
        ? Promise.resolve(getEndpointMetrics(windowMs))
        : Promise.resolve(null),
      includeErrors
        ? Promise.resolve(getErrorMetrics(windowMs))
        : Promise.resolve(null),
      includeRecommendations
        ? Promise.resolve(getPerformanceRecommendations())
        : Promise.resolve(null),
    ]);

    // Build response
    const metricsResponse: any = {
      timeWindow: {
        windowMs,
        windowHuman: formatDuration(windowMs),
        startTime: new Date(Date.now() - windowMs).toISOString(),
        endTime: new Date().toISOString(),
      },
      system: {
        status: systemHealth.status,
        issues: systemHealth.issues,
      },
      performance: {
        totalRequests: aggregatedMetrics.totalRequests,
        successfulRequests: aggregatedMetrics.successfulRequests,
        failedRequests: aggregatedMetrics.failedRequests,
        errorRate: aggregatedMetrics.errorRate,
        averageResponseTime: aggregatedMetrics.averageResponseTime,
        medianResponseTime: aggregatedMetrics.medianResponseTime,
        p95ResponseTime: aggregatedMetrics.p95ResponseTime,
        p99ResponseTime: aggregatedMetrics.p99ResponseTime,
        requestsPerSecond: aggregatedMetrics.requestsPerSecond,
      },
    };

    // Add optional sections
    if (includeEndpoints && endpointMetrics) {
      // Sort endpoints by total requests (most active first)
      const sortedEndpoints = Object.entries(endpointMetrics)
        .sort(([, a], [, b]) => b.totalRequests - a.totalRequests)
        .slice(0, 20); // Top 20 endpoints

      metricsResponse.endpoints = {
        total: Object.keys(endpointMetrics).length,
        topEndpoints: sortedEndpoints.map(([endpoint, metrics]) => ({
          endpoint,
          ...metrics,
        })),
      };
    }

    if (includeErrors && errorMetrics) {
      metricsResponse.errors = {
        totalErrors: errorMetrics.totalErrors,
        errorsByType: errorMetrics.errorsByType,
        errorsByEndpoint: errorMetrics.errorsByEndpoint,
        recentErrors: errorMetrics.recentErrors.slice(0, 10), // Top 10 recent errors
      };
    }

    if (includeRecommendations && recommendations) {
      metricsResponse.recommendations = recommendations.slice(0, 10); // Top 10 recommendations
    }

    // Handle different response formats
    if (format === "csv") {
      const csv = convertMetricsToCSV(metricsResponse);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="system-metrics-${Date.now()}.csv"`,
          "X-Request-ID": requestId,
        },
      });
    }

    return createSuccessResponse(
      metricsResponse,
      200,
      {
        generatedAt: new Date().toISOString(),
        userId: user.id,
      },
      requestId
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    enterpriseLogger.error("System metrics retrieval error", {
      requestId,
      userId: user.id,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: "Failed to retrieve system metrics",
        requestId,
      },
      { status: 500 }
    );
  }
}

/**
 * Administrative actions for metrics management
 */
async function handlePost(request: NextRequest, context: any) {
  const { requestId, user } = context;

  try {
    const body = await request.json();
    const { action, teamId, ...params } = body;

    // Validate team access for admin actions
    if (teamId && !validateInput(teamId, "uuid")) {
      return NextResponse.json(
        {
          error: "Invalid team ID format",
          requestId,
        },
        { status: 400 }
      );
    }

    if (teamId) {
      const teamAccess = await validateTeamAccess(
        context.supabase,
        user.id,
        teamId,
        "admin",
        requestId
      );

      if (!teamAccess.hasAccess) {
        return NextResponse.json(
          {
            error: "Admin access required for this action",
            requestId,
          },
          { status: 403 }
        );
      }
    }

    enterpriseLogger.info("System metrics admin action", {
      requestId,
      userId: user.id,
      action,
      teamId,
      params,
    });

    switch (action) {
      case "export":
        const windowMs = params.windowMs || 3600000; // Default 1 hour
        const exportData = exportMetrics(windowMs);

        return createSuccessResponse(
          {
            export: exportData,
            exportedBy: user.id,
            exportedAt: new Date().toISOString(),
          },
          200,
          undefined,
          requestId
        );

      case "clear":
        // This is a destructive action - require explicit confirmation
        if (params.confirm !== "yes") {
          return NextResponse.json(
            {
              error:
                'Metrics clearing requires explicit confirmation. Set confirm: "yes"',
              warning:
                "This action will permanently delete all current metrics data",
              requestId,
            },
            { status: 400 }
          );
        }

        const beforeClear = exportMetrics(60000); // Export last minute before clearing
        clearMetrics();

        enterpriseLogger.warn("System metrics cleared by admin", {
          requestId,
          userId: user.id,
          teamId,
          metricsBeforeClear: beforeClear.aggregated,
        });

        return createSuccessResponse(
          {
            message: "System metrics cleared successfully",
            clearedBy: user.id,
            clearedAt: new Date().toISOString(),
            metricsBeforeClear: beforeClear.aggregated,
          },
          200,
          undefined,
          requestId
        );

      case "summary":
        const summaryWindow = params.windowMs || 3600000;
        const summary = {
          system: getSystemHealth(),
          performance: getAggregatedMetrics(summaryWindow),
          recommendations: getPerformanceRecommendations().slice(0, 5),
        };

        return createSuccessResponse(
          {
            summary,
            windowMs: summaryWindow,
          },
          200,
          undefined,
          requestId
        );

      case "alerts":
        // Get potential alerts based on current metrics
        const alerts = generateAlerts();

        return createSuccessResponse(
          {
            alerts,
            alertsGeneratedAt: new Date().toISOString(),
          },
          200,
          undefined,
          requestId
        );

      default:
        return NextResponse.json(
          {
            error: "Unknown action",
            availableActions: ["export", "clear", "summary", "alerts"],
            requestId,
          },
          { status: 400 }
        );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    enterpriseLogger.error("System metrics admin action error", {
      requestId,
      userId: user.id,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: "Failed to execute admin action",
        requestId,
      },
      { status: 500 }
    );
  }
}

/**
 * Format duration in human-readable format
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Convert metrics to CSV format
 */
function convertMetricsToCSV(metrics: any): string {
  const lines = [];

  // Headers
  lines.push("Metric,Value,Timestamp");

  // Performance metrics
  const performance = metrics.performance;
  const timestamp = new Date().toISOString();

  lines.push(`Total Requests,${performance.totalRequests},${timestamp}`);
  lines.push(
    `Successful Requests,${performance.successfulRequests},${timestamp}`
  );
  lines.push(`Failed Requests,${performance.failedRequests},${timestamp}`);
  lines.push(`Error Rate,${performance.errorRate}%,${timestamp}`);
  lines.push(
    `Average Response Time,${performance.averageResponseTime}ms,${timestamp}`
  );
  lines.push(
    `Median Response Time,${performance.medianResponseTime}ms,${timestamp}`
  );
  lines.push(`P95 Response Time,${performance.p95ResponseTime}ms,${timestamp}`);
  lines.push(`P99 Response Time,${performance.p99ResponseTime}ms,${timestamp}`);
  lines.push(
    `Requests Per Second,${performance.requestsPerSecond},${timestamp}`
  );

  return lines.join("\n");
}

/**
 * Generate alerts based on current metrics
 */
function generateAlerts(): Array<{
  type: "warning" | "critical";
  message: string;
  metric: string;
  value: number | string;
  threshold: number | string;
  timestamp: string;
}> {
  const alerts = [];
  const health = getSystemHealth();
  const metrics = getAggregatedMetrics();
  const timestamp = new Date().toISOString();

  // High error rate alert
  if (metrics.errorRate > 10) {
    alerts.push({
      type: "critical" as const,
      message: "Critical error rate detected",
      metric: "error_rate",
      value: `${metrics.errorRate}%`,
      threshold: "10%",
      timestamp,
    });
  } else if (metrics.errorRate > 5) {
    alerts.push({
      type: "warning" as const,
      message: "Elevated error rate detected",
      metric: "error_rate",
      value: `${metrics.errorRate}%`,
      threshold: "5%",
      timestamp,
    });
  }

  // Slow response time alert
  if (metrics.p95ResponseTime > 10000) {
    alerts.push({
      type: "critical" as const,
      message: "Very slow response times detected",
      metric: "p95_response_time",
      value: `${metrics.p95ResponseTime}ms`,
      threshold: "10000ms",
      timestamp,
    });
  } else if (metrics.p95ResponseTime > 5000) {
    alerts.push({
      type: "warning" as const,
      message: "Slow response times detected",
      metric: "p95_response_time",
      value: `${metrics.p95ResponseTime}ms`,
      threshold: "5000ms",
      timestamp,
    });
  }

  // High request volume alert
  if (metrics.requestsPerSecond > 100) {
    alerts.push({
      type: "warning" as const,
      message: "High request volume detected",
      metric: "requests_per_second",
      value: metrics.requestsPerSecond,
      threshold: "100",
      timestamp,
    });
  }

  // System health alerts
  if (health.status === "critical") {
    alerts.push({
      type: "critical" as const,
      message: "System health is critical",
      metric: "system_health",
      value: health.status,
      threshold: "healthy",
      timestamp,
    });
  } else if (health.status === "degraded") {
    alerts.push({
      type: "warning" as const,
      message: "System health is degraded",
      metric: "system_health",
      value: health.status,
      threshold: "healthy",
      timestamp,
    });
  }

  return alerts;
}

export const GET = withApiAuth(handleGet, { logLevel: "debug" });
export const POST = withApiAuth(handlePost, { logLevel: "debug" });
