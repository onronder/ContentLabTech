/**
 * Enterprise Health Check API Endpoint
 * Comprehensive health monitoring with detailed metrics and status reporting
 */

import { NextRequest, NextResponse } from "next/server";
import { enterpriseHealthMonitor } from "@/lib/monitoring/enterprise-health-monitor";
import { enterpriseLogger } from "@/lib/monitoring/enterprise-logger";
import { enterpriseErrorTracker } from "@/lib/monitoring/enterprise-error-tracker";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/health/enterprise
 * Returns comprehensive system health information
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const correlationId = `health-${startTime}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Log health check request
    enterpriseLogger.info(
      "Enterprise health check requested",
      {
        userAgent: request.headers.get("user-agent"),
        ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
        correlationId,
      },
      ["health-check", "enterprise", "request"]
    );

    // Get comprehensive health status
    const healthStatus = enterpriseHealthMonitor.getSystemHealth();
    const responseTime = Date.now() - startTime;

    // Add response time to performance metrics
    healthStatus.performance.averageResponseTime = responseTime;

    // Log health check completion
    enterpriseLogger.performance(
      "Enterprise health check completed",
      {
        duration: responseTime,
        cpuUsage: 0,
        memoryUsage: 0,
      },
      {
        correlationId,
        overallStatus: healthStatus.overall,
        healthScore: healthStatus.score,
        criticalIssues: healthStatus.criticalIssues.length,
      }
    );

    // Determine HTTP status code based on health
    let statusCode = 200;
    if (healthStatus.overall === "unhealthy") {
      statusCode = 503; // Service Unavailable
    } else if (healthStatus.overall === "degraded") {
      statusCode = 206; // Partial Content
    } else if (healthStatus.overall === "maintenance") {
      statusCode = 503; // Service Unavailable
    }

    // Add response headers
    const headers = {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "X-Health-Score": healthStatus.score.toString(),
      "X-Health-Status": healthStatus.overall,
      "X-Response-Time": responseTime.toString(),
      "X-Correlation-Id": correlationId,
    };

    return NextResponse.json(
      {
        status: "success",
        data: healthStatus,
        metadata: {
          timestamp: new Date().toISOString(),
          correlationId,
          responseTime,
          version: process.env.npm_package_version || "1.0.0",
          environment: process.env.NODE_ENV || "production",
          build: process.env.BUILD_NUMBER || "unknown",
        },
      },
      {
        status: statusCode,
        headers,
      }
    );

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    // Track error with enterprise error tracker
    const errorId = await enterpriseErrorTracker.trackEnterpriseError(
      error as Error,
      {
        correlationId,
        endpoint: "/api/health/enterprise",
        method: "GET",
        businessContext: {
          feature: "health-monitoring",
          criticalPath: true,
        },
      }
    );

    // Log error
    enterpriseLogger.error(
      "Enterprise health check failed",
      error as Error,
      {
        correlationId,
        errorId,
        responseTime,
      },
      ["health-check", "enterprise", "error"]
    );

    return NextResponse.json(
      {
        status: "error",
        error: {
          message: "Health check failed",
          code: "HEALTH_CHECK_ERROR",
          correlationId,
          errorId,
        },
        data: {
          overall: "unhealthy",
          score: 0,
          checks: [],
          summary: {
            total: 0,
            healthy: 0,
            degraded: 0,
            unhealthy: 1,
            unknown: 0,
          },
          criticalIssues: ["Health monitoring system failure"],
        },
        metadata: {
          timestamp: new Date().toISOString(),
          correlationId,
          responseTime,
        },
      },
      {
        status: 503,
        headers: {
          "Content-Type": "application/json",
          "X-Health-Status": "unhealthy",
          "X-Correlation-Id": correlationId,
        },
      }
    );
  }
}

/**
 * POST /api/health/enterprise
 * Trigger manual health checks or maintenance mode
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const correlationId = `health-action-${startTime}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const body = await request.json();
    const { action, parameters } = body;

    enterpriseLogger.info(
      "Enterprise health action requested",
      {
        action,
        parameters,
        correlationId,
        userAgent: request.headers.get("user-agent"),
        ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
      },
      ["health-check", "enterprise", "action", action]
    );

    let result: any = {};

    switch (action) {
      case "maintenance":
        if (parameters?.enable) {
          enterpriseHealthMonitor.enableMaintenanceMode(
            parameters.reason || "Manual maintenance",
            parameters.duration
          );
          result = { maintenanceEnabled: true };
        } else {
          enterpriseHealthMonitor.disableMaintenanceMode();
          result = { maintenanceEnabled: false };
        }
        break;

      case "refresh":
        // Force refresh of specific health checks
        const healthStatus = enterpriseHealthMonitor.getSystemHealth();
        result = { refreshed: true, status: healthStatus.overall };
        break;

      case "status":
        // Get current status without full details
        const currentStatus = enterpriseHealthMonitor.getSystemHealth();
        result = {
          overall: currentStatus.overall,
          score: currentStatus.score,
          criticalIssues: currentStatus.criticalIssues.length,
        };
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const responseTime = Date.now() - startTime;

    enterpriseLogger.info(
      "Enterprise health action completed",
      {
        action,
        result,
        correlationId,
        responseTime,
      },
      ["health-check", "enterprise", "action-complete", action]
    );

    return NextResponse.json(
      {
        status: "success",
        data: result,
        metadata: {
          timestamp: new Date().toISOString(),
          correlationId,
          responseTime,
          action,
        },
      },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Correlation-Id": correlationId,
        },
      }
    );

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    const errorId = await enterpriseErrorTracker.trackEnterpriseError(
      error as Error,
      {
        correlationId,
        endpoint: "/api/health/enterprise",
        method: "POST",
        businessContext: {
          feature: "health-monitoring",
          criticalPath: true,
        },
      }
    );

    enterpriseLogger.error(
      "Enterprise health action failed",
      error as Error,
      {
        correlationId,
        errorId,
        responseTime,
      },
      ["health-check", "enterprise", "action-error"]
    );

    return NextResponse.json(
      {
        status: "error",
        error: {
          message: error instanceof Error ? error.message : "Unknown error",
          code: "HEALTH_ACTION_ERROR",
          correlationId,
          errorId,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          correlationId,
          responseTime,
        },
      },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "X-Correlation-Id": correlationId,
        },
      }
    );
  }
}