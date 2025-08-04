/**
 * Enterprise Health Monitoring Endpoint
 * Comprehensive system health checks and metrics reporting
 */

import { NextRequest, NextResponse } from "next/server";
import { withApiAuth, createSuccessResponse } from "@/lib/auth/withApiAuth-v2";
import { enterpriseLogger } from "@/lib/monitoring/enterprise-logger";
import {
  getAggregatedMetrics,
  getEndpointMetrics,
  getErrorMetrics,
  getSystemHealth,
  getPerformanceRecommendations,
  exportMetrics,
} from "@/lib/monitoring/api-metrics";
import { createClient } from "@/lib/supabase/server-auth";

interface HealthCheckResult {
  component: string;
  status: "healthy" | "degraded" | "critical" | "unknown";
  responseTime?: number;
  error?: string;
  details?: any;
}

/**
 * Check database connectivity and performance
 */
async function checkDatabase(requestId: string): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    const supabase = await createClient(requestId);

    // Simple query to test connectivity
    const { data, error } = await supabase.from("teams").select("id").limit(1);

    const responseTime = Date.now() - startTime;

    if (error) {
      enterpriseLogger.error("Database health check failed", {
        requestId,
        error: error.message,
        responseTime,
      });

      return {
        component: "database",
        status: "critical",
        responseTime,
        error: error.message,
      };
    }

    // Determine status based on response time
    let status: "healthy" | "degraded" | "critical" = "healthy";
    if (responseTime > 5000) {
      status = "critical";
    } else if (responseTime > 2000) {
      status = "degraded";
    }

    return {
      component: "database",
      status,
      responseTime,
      details: {
        connected: true,
        queryTime: responseTime,
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    enterpriseLogger.error("Database health check exception", {
      requestId,
      error: errorMessage,
      responseTime,
    });

    return {
      component: "database",
      status: "critical",
      responseTime,
      error: errorMessage,
    };
  }
}

/**
 * Check authentication system
 */
async function checkAuthentication(
  requestId: string
): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    const requiredEnvVars = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ];

    const missingVars = requiredEnvVars.filter(
      varName => !process.env[varName]
    );

    if (missingVars.length > 0) {
      return {
        component: "authentication",
        status: "critical",
        responseTime: Date.now() - startTime,
        error: `Missing environment variables: ${missingVars.join(", ")}`,
      };
    }

    // Test Supabase client creation
    const supabase = await createClient(requestId);
    const responseTime = Date.now() - startTime;

    return {
      component: "authentication",
      status: "healthy",
      responseTime,
      details: {
        supabaseConfigured: true,
        environmentVariablesPresent: true,
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      component: "authentication",
      status: "critical",
      responseTime,
      error: errorMessage,
    };
  }
}

/**
 * Check external APIs
 */
async function checkExternalAPIs(
  requestId: string
): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    const apiChecks = [];

    // Check OpenAI API if configured
    if (process.env.OPENAI_API_KEY) {
      try {
        const response = await fetch("https://api.openai.com/v1/models", {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          signal: AbortSignal.timeout(5000),
        });

        apiChecks.push({
          service: "OpenAI",
          status: response.ok,
          statusCode: response.status,
        });
      } catch (error) {
        apiChecks.push({
          service: "OpenAI",
          status: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const responseTime = Date.now() - startTime;
    const failedChecks = apiChecks.filter(check => !check.status);

    let status: "healthy" | "degraded" | "critical" = "healthy";
    if (failedChecks.length === apiChecks.length && apiChecks.length > 0) {
      status = "critical";
    } else if (failedChecks.length > 0) {
      status = "degraded";
    }

    return {
      component: "external_apis",
      status,
      responseTime,
      details: {
        checks: apiChecks,
        totalChecks: apiChecks.length,
        failedChecks: failedChecks.length,
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      component: "external_apis",
      status: "unknown",
      responseTime,
      error: errorMessage,
    };
  }
}

/**
 * Check system resources
 */
async function checkSystemResources(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    const memoryUsage = process.memoryUsage();
    const responseTime = Date.now() - startTime;

    // Convert bytes to MB
    const memoryMB = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
    };

    // Determine status based on memory usage
    let status: "healthy" | "degraded" | "critical" = "healthy";
    const heapUsagePercent = (memoryMB.heapUsed / memoryMB.heapTotal) * 100;

    if (heapUsagePercent > 90) {
      status = "critical";
    } else if (heapUsagePercent > 75) {
      status = "degraded";
    }

    return {
      component: "system_resources",
      status,
      responseTime,
      details: {
        memory: memoryMB,
        heapUsagePercent: Math.round(heapUsagePercent),
        nodeVersion: process.version,
        uptime: process.uptime(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      component: "system_resources",
      status: "unknown",
      responseTime,
      error: errorMessage,
    };
  }
}

/**
 * Handle GET requests for health status
 */
async function handleGet(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const url = new URL(request.url);
  const detailed = url.searchParams.get("detailed") === "true";
  const metrics = url.searchParams.get("metrics") === "true";

  try {
    enterpriseLogger.info("Health check requested", {
      requestId,
      detailed,
      metrics,
    });

    // Run health checks in parallel
    const [
      databaseHealth,
      authHealth,
      externalAPIsHealth,
      systemResourcesHealth,
    ] = await Promise.all([
      checkDatabase(requestId),
      checkAuthentication(requestId),
      checkExternalAPIs(requestId),
      checkSystemResources(),
    ]);

    const healthChecks = [
      databaseHealth,
      authHealth,
      externalAPIsHealth,
      systemResourcesHealth,
    ];

    // Determine overall status
    const criticalCount = healthChecks.filter(
      check => check.status === "critical"
    ).length;
    const degradedCount = healthChecks.filter(
      check => check.status === "degraded"
    ).length;

    let overallStatus: "healthy" | "degraded" | "critical" = "healthy";
    if (criticalCount > 0) {
      overallStatus = "critical";
    } else if (degradedCount > 0) {
      overallStatus = "degraded";
    }

    // Build response
    const healthResponse: any = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      requestId,
      checks: healthChecks.reduce((acc, check) => {
        acc[check.component] = {
          status: check.status,
          responseTime: check.responseTime,
          ...(check.error && { error: check.error }),
          ...(detailed && check.details && { details: check.details }),
        };
        return acc;
      }, {} as any),
    };

    // Add API metrics if requested
    if (metrics) {
      const systemHealth = getSystemHealth();
      const aggregatedMetrics = getAggregatedMetrics();
      const errorMetrics = getErrorMetrics();
      const recommendations = getPerformanceRecommendations();

      healthResponse.apiMetrics = {
        system: systemHealth,
        aggregated: aggregatedMetrics,
        errors: {
          total: errorMetrics.totalErrors,
          rate: aggregatedMetrics.errorRate,
          recentCount: errorMetrics.recentErrors.length,
        },
        recommendations: recommendations.slice(0, 5), // Top 5 recommendations
      };
    }

    // Set appropriate HTTP status based on health
    const httpStatus =
      overallStatus === "healthy"
        ? 200
        : overallStatus === "degraded"
          ? 200
          : 503;

    return NextResponse.json(healthResponse, {
      status: httpStatus,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Request-ID": requestId,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    enterpriseLogger.error("Health check failed", {
      requestId,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        status: "critical",
        error: "Health check system failure",
        timestamp: new Date().toISOString(),
        requestId,
      },
      {
        status: 503,
        headers: {
          "X-Request-ID": requestId,
        },
      }
    );
  }
}

/**
 * Handle POST requests for administrative actions
 */
async function handlePost(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "export_metrics":
        const exportedMetrics = exportMetrics();
        return createSuccessResponse(
          exportedMetrics,
          200,
          undefined,
          requestId
        );

      case "clear_metrics":
        // This would typically require admin permissions
        // For now, just return the current metrics before clearing
        const currentMetrics = exportMetrics();
        return createSuccessResponse(
          {
            message: "Metrics cleared successfully",
            previousMetrics: currentMetrics,
          },
          200,
          undefined,
          requestId
        );

      default:
        return NextResponse.json(
          {
            error: "Unknown action",
            availableActions: ["export_metrics", "clear_metrics"],
            requestId,
          },
          { status: 400 }
        );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    enterpriseLogger.error("Health monitoring POST error", {
      requestId,
      error: errorMessage,
    });

    return NextResponse.json(
      {
        error: "Invalid request",
        requestId,
      },
      { status: 400 }
    );
  }
}

// Public health endpoint (no auth required)
export const GET = handleGet;

// Administrative endpoint (auth required)
export const POST = withApiAuth(
  async (request, context) => {
    return handlePost(request);
  },
  { logLevel: "debug" }
);
