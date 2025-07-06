/**
 * Metrics API Endpoint
 * Provides system performance metrics and analytics
 */

import { NextRequest, NextResponse } from "next/server";
import { metricsCollector } from "@/lib/monitoring/metrics-collector";
import {
  getRequestAnalytics,
  getActiveRequests,
} from "@/lib/monitoring/performance-middleware";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "system";
    // timeRange for future use
    const _timeRange = searchParams.get("timeRange") || "1h";
    const endpoint = searchParams.get("endpoint");
    const method = searchParams.get("method");

    switch (type) {
      case "system":
        const systemMetrics = await metricsCollector.getSystemMetrics();
        return NextResponse.json(systemMetrics, {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "X-Metrics-Type": "system",
            "X-Generated-At": new Date().toISOString(),
          },
        });

      case "summary":
        const summary = metricsCollector.getMetricsSummary();
        return NextResponse.json(summary, {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "X-Metrics-Type": "summary",
          },
        });

      case "time-window":
        const timeWindowMetrics = metricsCollector.getTimeWindowMetrics();
        return NextResponse.json(timeWindowMetrics, {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "X-Metrics-Type": "time-window",
          },
        });

      case "endpoint":
        if (!endpoint) {
          return NextResponse.json(
            { error: "endpoint parameter is required for endpoint metrics" },
            { status: 400 }
          );
        }

        const endpointMetrics = metricsCollector.getMetricsForEndpoint(
          endpoint,
          method || undefined
        );
        return NextResponse.json({
          endpoint,
          method: method || "ALL",
          metrics: endpointMetrics,
          count: endpointMetrics.length,
          averageResponseTime:
            endpointMetrics.length > 0
              ? endpointMetrics.reduce((sum, m) => sum + m.responseTime, 0) /
                endpointMetrics.length
              : 0,
        });

      case "active-requests":
        const activeRequests = getActiveRequests();
        const analytics = getRequestAnalytics();

        return NextResponse.json({
          activeRequests,
          analytics,
          timestamp: new Date().toISOString(),
        });

      case "performance":
        const performanceMetrics = await getPerformanceOverview();
        return NextResponse.json(performanceMetrics);

      default:
        return NextResponse.json(
          {
            error:
              "Invalid metrics type. Valid options: system, summary, time-window, endpoint, active-requests, performance",
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Metrics collection failed:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

async function getPerformanceOverview() {
  const systemMetrics = await metricsCollector.getSystemMetrics();
  const timeWindowMetrics = metricsCollector.getTimeWindowMetrics();
  const analytics = getRequestAnalytics();

  return {
    current: {
      memory: systemMetrics.memory,
      performance: systemMetrics.performance,
      database: systemMetrics.database,
      cache: systemMetrics.cache,
    },
    trends: timeWindowMetrics,
    realtime: {
      activeRequests: analytics.totalActiveRequests,
      averageRequestTime: analytics.averageRequestTime,
      longestRunningRequest: analytics.longestRunningRequest,
      requestsByEndpoint: analytics.requestsByEndpoint,
    },
    alerts: generatePerformanceAlerts(systemMetrics),
    timestamp: new Date().toISOString(),
  };
}

function generatePerformanceAlerts(metrics: Record<string, any>) {
  const alerts = [];

  // Memory alerts
  if (metrics["memory"]?.percentage > 90) {
    alerts.push({
      type: "memory",
      level: "critical",
      message: `Memory usage is at ${metrics["memory"].percentage.toFixed(1)}%`,
      value: metrics["memory"].percentage,
      threshold: 90,
    });
  } else if (metrics["memory"].percentage > 75) {
    alerts.push({
      type: "memory",
      level: "warning",
      message: `Memory usage is at ${metrics["memory"].percentage.toFixed(1)}%`,
      value: metrics["memory"].percentage,
      threshold: 75,
    });
  }

  // Response time alerts
  if (metrics["performance"].p95ResponseTime > 5000) {
    alerts.push({
      type: "response-time",
      level: "critical",
      message: `95th percentile response time is ${metrics["performance"].p95ResponseTime}ms`,
      value: metrics["performance"].p95ResponseTime,
      threshold: 5000,
    });
  } else if (metrics["performance"].p95ResponseTime > 2000) {
    alerts.push({
      type: "response-time",
      level: "warning",
      message: `95th percentile response time is ${metrics["performance"].p95ResponseTime}ms`,
      value: metrics["performance"].p95ResponseTime,
      threshold: 2000,
    });
  }

  // Error rate alerts
  if (metrics["performance"].errorRate > 10) {
    alerts.push({
      type: "error-rate",
      level: "critical",
      message: `Error rate is ${metrics["performance"].errorRate.toFixed(2)}%`,
      value: metrics["performance"].errorRate,
      threshold: 10,
    });
  } else if (metrics["performance"].errorRate > 5) {
    alerts.push({
      type: "error-rate",
      level: "warning",
      message: `Error rate is ${metrics["performance"].errorRate.toFixed(2)}%`,
      value: metrics["performance"].errorRate,
      threshold: 5,
    });
  }

  // Database slow query alerts
  if (metrics["database"].slowQueries > 10) {
    alerts.push({
      type: "slow-queries",
      level: "warning",
      message: `${metrics["database"].slowQueries} slow database queries detected`,
      value: metrics["database"].slowQueries,
      threshold: 10,
    });
  }

  // Cache performance alerts
  if (metrics["cache"].hitRate < 50) {
    alerts.push({
      type: "cache-performance",
      level: "warning",
      message: `Cache hit rate is only ${metrics["cache"].hitRate.toFixed(1)}%`,
      value: metrics["cache"].hitRate,
      threshold: 50,
    });
  }

  return alerts;
}
