/**
 * Main Health Check Endpoint
 * Comprehensive system health monitoring with enhanced service checks
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnvironmentStatus } from "@/lib/config/environment";
import { circuitBreakerManager } from "@/lib/resilience/circuit-breaker";
import { supabase } from "@/lib/supabase/client";
import { healthChecker } from "@/lib/monitoring/health-checker";

interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: HealthCheck;
    environment: HealthCheck;
    circuitBreakers: HealthCheck;
    memory: HealthCheck;
    externalServices: HealthCheck;
  };
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  message: string;
  details?: Record<string, unknown>;
  responseTime?: number;
}

const startTime = Date.now();

export async function GET(request: NextRequest) {
  const checkStartTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const service = searchParams.get("service");
    const format = searchParams.get("format") || "json";

    if (service) {
      // Check specific service using new health checker
      let result;
      switch (service.toLowerCase()) {
        case "redis":
          result = await healthChecker.checkRedis();
          break;
        case "supabase":
          result = await healthChecker.checkSupabase();
          break;
        case "openai":
          result = await healthChecker.checkOpenAI();
          break;
        case "brightdata":
          result = await healthChecker.checkBrightData();
          break;
        default:
          return NextResponse.json(
            {
              error:
                "Invalid service name. Valid options: redis, supabase, openai, brightdata",
            },
            { status: 400 }
          );
      }

      const status =
        result.status === "healthy"
          ? 200
          : result.status === "degraded"
            ? 200
            : 503;

      if (format === "plain") {
        return new NextResponse(result.status.toUpperCase(), {
          status,
          headers: {
            "Content-Type": "text/plain",
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        });
      }

      return NextResponse.json(result, { status });
    }

    // Check comprehensive system health (both old and new)
    const [
      databaseCheck,
      environmentCheck,
      circuitBreakerCheck,
      memoryCheck,
      externalServicesCheck,
      comprehensiveSystemHealth,
    ] = await Promise.allSettled([
      checkDatabase(),
      checkEnvironment(),
      checkCircuitBreakers(),
      checkMemory(),
      checkExternalServices(),
      healthChecker.checkSystemHealth(),
    ]);

    const checks = {
      database: getCheckResult(databaseCheck),
      environment: getCheckResult(environmentCheck),
      circuitBreakers: getCheckResult(circuitBreakerCheck),
      memory: getCheckResult(memoryCheck),
      externalServices: getCheckResult(externalServicesCheck),
    };

    // Get comprehensive health data
    const systemHealth =
      comprehensiveSystemHealth.status === "fulfilled"
        ? comprehensiveSystemHealth.value
        : null;

    // Calculate overall status
    const checkValues = Object.values(checks);
    const unhealthyCount = checkValues.filter(
      c => c.status === "unhealthy"
    ).length;
    const degradedCount = checkValues.filter(
      c => c.status === "degraded"
    ).length;
    const healthyCount = checkValues.filter(c => c.status === "healthy").length;

    let overallStatus: "healthy" | "degraded" | "unhealthy";
    if (
      unhealthyCount > 0 ||
      (systemHealth && systemHealth.overall === "unhealthy")
    ) {
      overallStatus = "unhealthy";
    } else if (
      degradedCount > 0 ||
      (systemHealth && systemHealth.overall === "degraded")
    ) {
      overallStatus = "degraded";
    } else {
      overallStatus = "healthy";
    }

    const result: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - startTime,
      version: process.env["npm_package_version"] || "unknown",
      environment: process.env["NODE_ENV"] || "unknown",
      checks,
      summary: {
        total: checkValues.length,
        healthy: healthyCount,
        degraded: degradedCount,
        unhealthy: unhealthyCount,
      },
    };

    // Add comprehensive health data if available
    if (systemHealth) {
      (result as unknown as Record<string, unknown>)["detailedHealth"] =
        systemHealth;
    }

    // Set appropriate HTTP status code
    const statusCode =
      overallStatus === "healthy"
        ? 200
        : overallStatus === "degraded"
          ? 200
          : 503;

    if (format === "plain") {
      return new NextResponse(overallStatus.toUpperCase(), {
        status: statusCode,
        headers: {
          "Content-Type": "text/plain",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    return NextResponse.json(result, {
      status: statusCode,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Health-Check-Duration": `${Date.now() - checkStartTime}ms`,
        "X-Uptime": `${Date.now() - startTime}ms`,
      },
    });
  } catch (error) {
    console.error("Health check failed:", error);

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        uptime: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
        checks: {},
        summary: { total: 0, healthy: 0, degraded: 0, unhealthy: 1 },
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  }
}

async function checkDatabase(): Promise<HealthCheck> {
  const startTime = Date.now();

  try {
    // Test basic database connectivity
    const { error } = await supabase.from("teams").select("count").limit(1);

    const responseTime = Date.now() - startTime;

    if (error) {
      return {
        status: "unhealthy",
        message: `Database connectivity failed: ${error.message}`,
        responseTime,
        details: { error: error.message },
      };
    }

    if (responseTime > 5000) {
      return {
        status: "degraded",
        message: "Database response time is slow",
        responseTime,
        details: { threshold: "5000ms" },
      };
    }

    return {
      status: "healthy",
      message: "Database connectivity verified",
      responseTime,
    };
  } catch (error) {
    return {
      status: "unhealthy",
      message: `Database check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      responseTime: Date.now() - startTime,
    };
  }
}

async function checkEnvironment(): Promise<HealthCheck> {
  try {
    const envStatus = getEnvironmentStatus();

    if (envStatus.status === "critical") {
      return {
        status: "unhealthy",
        message: envStatus.summary,
        details: {
          criticalMissing: envStatus.details.criticalMissing,
          errors: envStatus.details.errors,
        },
      };
    }

    if (envStatus.status === "degraded") {
      return {
        status: "degraded",
        message: envStatus.summary,
        details: {
          optionalMissing: envStatus.details.optionalMissing,
          warnings: envStatus.details.warnings,
          featureFlags: envStatus.featureFlags,
        },
      };
    }

    return {
      status: "healthy",
      message: envStatus.summary,
      details: {
        featureFlags: envStatus.featureFlags,
      },
    };
  } catch (error) {
    return {
      status: "unhealthy",
      message: `Environment check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

async function checkCircuitBreakers(): Promise<HealthCheck> {
  try {
    const cbStatus = circuitBreakerManager.getOverallHealthStatus();

    if (cbStatus.summary.unavailable > 0) {
      return {
        status: "degraded",
        message: `${cbStatus.summary.unavailable} external services unavailable`,
        details: {
          services: Object.entries(cbStatus.services)
            .filter(([, status]) => !status.healthy)
            .reduce(
              (acc, [name, status]) => ({ ...acc, [name]: status.status }),
              {}
            ),
        },
      };
    }

    if (cbStatus.summary.degraded > 0) {
      return {
        status: "degraded",
        message: `${cbStatus.summary.degraded} external services degraded`,
        details: {
          services: Object.entries(cbStatus.services)
            .filter(
              ([, status]) => status.healthy && status.metrics.failureCount > 0
            )
            .reduce(
              (acc, [name, status]) => ({ ...acc, [name]: status.status }),
              {}
            ),
        },
      };
    }

    return {
      status: "healthy",
      message: "All external services available",
      details: {
        totalServices: cbStatus.summary.total,
        healthyServices: cbStatus.summary.healthy,
      },
    };
  } catch (error) {
    return {
      status: "unhealthy",
      message: `Circuit breaker check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

async function checkMemory(): Promise<HealthCheck> {
  try {
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const memoryLimitMB = 512; // Adjust based on your deployment
    const memoryPercentage = (memoryUsageMB / memoryLimitMB) * 100;

    if (memoryPercentage > 90) {
      return {
        status: "unhealthy",
        message: "Memory usage critical",
        details: {
          currentMB: memoryUsageMB,
          limitMB: memoryLimitMB,
          percentage: Math.round(memoryPercentage),
          fullUsage: memoryUsage,
        },
      };
    }

    if (memoryPercentage > 75) {
      return {
        status: "degraded",
        message: "Memory usage high",
        details: {
          currentMB: memoryUsageMB,
          limitMB: memoryLimitMB,
          percentage: Math.round(memoryPercentage),
        },
      };
    }

    return {
      status: "healthy",
      message: "Memory usage normal",
      details: {
        currentMB: memoryUsageMB,
        limitMB: memoryLimitMB,
        percentage: Math.round(memoryPercentage),
      },
    };
  } catch (error) {
    return {
      status: "unhealthy",
      message: `Memory check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

async function checkExternalServices(): Promise<HealthCheck> {
  // This is a placeholder - you would implement actual service checks here
  const services = [
    { name: "OpenAI", required: false },
    { name: "BrightData", required: false },
    { name: "Google Analytics", required: false },
  ];

  const availableServices = services.filter(service => {
    // Check if the service credentials are available
    switch (service.name) {
      case "OpenAI":
        return Boolean(process.env["OPENAI_API_KEY"]);
      case "BrightData":
        return Boolean(process.env["BRIGHTDATA_CUSTOMER_ID"]);
      case "Google Analytics":
        return Boolean(process.env["GOOGLE_ANALYTICS_CLIENT_ID"]);
      default:
        return false;
    }
  });

  const requiredServices = services.filter(s => s.required);
  const unavailableRequired = requiredServices.filter(
    s => !availableServices.find(a => a.name === s.name)
  );

  if (unavailableRequired.length > 0) {
    return {
      status: "unhealthy",
      message: "Required external services unavailable",
      details: {
        unavailable: unavailableRequired.map(s => s.name),
        available: availableServices.map(s => s.name),
      },
    };
  }

  if (availableServices.length < services.length) {
    return {
      status: "degraded",
      message: "Some optional external services unavailable",
      details: {
        available: availableServices.map(s => s.name),
        total: services.length,
      },
    };
  }

  return {
    status: "healthy",
    message: "All external service credentials configured",
    details: {
      available: availableServices.map(s => s.name),
    },
  };
}

function getCheckResult(
  settledResult: PromiseSettledResult<HealthCheck>
): HealthCheck {
  if (settledResult.status === "fulfilled") {
    return settledResult.value;
  } else {
    return {
      status: "unhealthy",
      message: `Check failed: ${settledResult.reason}`,
    };
  }
}
