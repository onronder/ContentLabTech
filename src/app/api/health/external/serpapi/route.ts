/**
 * SerpAPI Health Check Endpoint
 * Comprehensive health check for SerpAPI integration
 * Addresses high error rate (9.46%) by testing all SerpAPI functionality
 */

import { NextRequest, NextResponse } from "next/server";
import { circuitBreakerManager } from "@/lib/resilience/circuit-breaker";
import { timeoutFetch } from "@/lib/resilience/timeout-fetch";
import { healthCheck as serpHealthCheck } from "@/lib/serpapi";
import { serpApiService } from "@/lib/external-apis/serp-api";
import { brightDataSerpService } from "@/lib/external-apis/brightdata-serp";

interface SerpApiHealthCheck {
  status: "healthy" | "degraded" | "unhealthy" | "not_configured";
  timestamp: string;
  responseTime: number;
  summary: {
    main_service: "healthy" | "degraded" | "unhealthy" | "not_configured";
    alternative_service:
      | "healthy"
      | "degraded"
      | "unhealthy"
      | "not_configured";
    brightdata_proxy: "healthy" | "degraded" | "unhealthy" | "not_configured";
    circuit_breaker_state: string;
    error_rate: number;
    last_24h_errors?: number;
  };
  services: {
    serpapi_main: {
      status: "healthy" | "degraded" | "unhealthy" | "not_configured";
      responseTime?: number;
      error?: string;
      api_key_configured: boolean;
      test_search_successful?: boolean;
    };
    serpapi_alternative: {
      status: "healthy" | "degraded" | "unhealthy" | "not_configured";
      responseTime?: number;
      error?: string;
      api_key_configured: boolean;
      queue_status?: string;
    };
    brightdata_proxy: {
      status: "healthy" | "degraded" | "unhealthy" | "not_configured";
      responseTime?: number;
      error?: string;
      proxy_configured: boolean;
      fallback_available?: boolean;
    };
  };
  recommendations: string[];
}

export async function GET(_request: NextRequest) {
  const startTime = Date.now();
  const recommendations: string[] = [];

  try {
    // Check environment variables
    const serpApiKey = process.env["SERPAPI_API_KEY"];
    const brightDataCustomerId = process.env["BRIGHTDATA_CUSTOMER_ID"];
    const brightDataZone = process.env["BRIGHTDATA_ZONE"];
    const brightDataPassword = process.env["BRIGHTDATA_PASSWORD"];

    if (!serpApiKey) {
      recommendations.push(
        "Configure SERPAPI_API_KEY environment variable for primary search functionality"
      );
    }

    if (!brightDataCustomerId || !brightDataZone || !brightDataPassword) {
      recommendations.push(
        "Configure BrightData proxy credentials for enhanced reliability and fallback support"
      );
    }

    // Initialize service health checks
    const services = {
      serpapi_main: {
        status: "not_configured" as const,
        api_key_configured: !!serpApiKey,
      },
      serpapi_alternative: {
        status: "not_configured" as const,
        api_key_configured: !!serpApiKey,
      },
      brightdata_proxy: {
        status: "not_configured" as const,
        proxy_configured: !!(
          brightDataCustomerId &&
          brightDataZone &&
          brightDataPassword
        ),
      },
    };

    // Test main SerpAPI service
    if (serpApiKey) {
      try {
        const mainStartTime = Date.now();
        const isHealthy = await serpHealthCheck();
        const mainResponseTime = Date.now() - mainStartTime;

        services.serpapi_main = {
          status: isHealthy
            ? mainResponseTime > 5000
              ? "degraded"
              : "healthy"
            : "unhealthy",
          responseTime: mainResponseTime,
          api_key_configured: true,
          test_search_successful: isHealthy,
        } as any;

        if (!isHealthy) {
          (services.serpapi_main as any).error =
            "Health check failed - API may be down or rate limited";
          recommendations.push(
            "Main SerpAPI service is failing - check API key validity and rate limits"
          );
        }
      } catch (error) {
        services.serpapi_main = {
          status: "unhealthy",
          error: error instanceof Error ? error.message : "Unknown error",
          api_key_configured: true,
          test_search_successful: false,
        } as any;
        recommendations.push(
          "Main SerpAPI service threw an exception - check network connectivity and API configuration"
        );
      }
    } else {
      recommendations.push(
        "Primary SerpAPI service not configured - add SERPAPI_API_KEY to environment variables"
      );
    }

    // Test alternative SerpAPI service
    if (serpApiKey) {
      try {
        const altStartTime = Date.now();
        const altHealth = await serpApiService.healthCheck();
        const altResponseTime = Date.now() - altStartTime;

        services.serpapi_alternative = {
          status: altHealth.status,
          responseTime: altResponseTime,
          api_key_configured: true,
          queue_status: "operational", // Assume operational if no errors
        } as any;

        if (altHealth.status === "unhealthy") {
          (services.serpapi_alternative as any).error =
            altHealth.error || "Alternative service unhealthy";
          recommendations.push(
            "Alternative SerpAPI service is unhealthy - this reduces system resilience"
          );
        }
      } catch (error) {
        services.serpapi_alternative = {
          status: "unhealthy",
          error: error instanceof Error ? error.message : "Unknown error",
          api_key_configured: true,
          queue_status: "error",
        } as any;
        recommendations.push(
          "Alternative SerpAPI service failed - check service configuration and queue management"
        );
      }
    }

    // Test BrightData proxy service
    if (brightDataCustomerId && brightDataZone && brightDataPassword) {
      try {
        const proxyStartTime = Date.now();
        const proxyHealth = await brightDataSerpService.healthCheck();
        const proxyResponseTime = Date.now() - proxyStartTime;

        services.brightdata_proxy = {
          status: proxyHealth.status,
          responseTime: proxyResponseTime,
          proxy_configured: true,
          fallback_available: !!serpApiKey,
        } as any;

        if (proxyHealth.status === "unhealthy") {
          (services.brightdata_proxy as any).error =
            proxyHealth.error || "Proxy service unhealthy";
          recommendations.push(
            "BrightData proxy service is unhealthy - this may impact search reliability"
          );
        }

        if (
          proxyHealth.proxyStatus === "error" &&
          proxyHealth.apiStatus === "unavailable"
        ) {
          recommendations.push(
            "Both proxy and API fallback are unavailable - critical issue requiring immediate attention"
          );
        }
      } catch (error) {
        services.brightdata_proxy = {
          status: "unhealthy",
          error: error instanceof Error ? error.message : "Unknown error",
          proxy_configured: true,
          fallback_available: !!serpApiKey,
        } as any;
        recommendations.push(
          "BrightData proxy service threw an exception - check proxy configuration and credentials"
        );
      }
    }

    // Get circuit breaker state
    const circuitBreakerState = circuitBreakerManager
      .getCircuitBreaker("serpapi-request")
      .getMetrics().state;

    if (circuitBreakerState === "OPEN") {
      recommendations.push(
        "SerpAPI circuit breaker is OPEN - service is temporarily disabled due to failures"
      );
    } else if (circuitBreakerState === "HALF_OPEN") {
      recommendations.push(
        "SerpAPI circuit breaker is HALF_OPEN - service is being tested for recovery"
      );
    }

    // Calculate error rate estimation
    const failureCount = Object.values(services).filter(
      (s: any) => s.status === "unhealthy"
    ).length;
    const totalServices = Object.values(services).length;
    const estimatedErrorRate = (failureCount / totalServices) * 100;

    // Determine overall status
    let overallStatus: "healthy" | "degraded" | "unhealthy" | "not_configured";

    if (!serpApiKey && !services.brightdata_proxy.proxy_configured) {
      overallStatus = "not_configured";
      recommendations.push(
        "No SerpAPI services are configured - application cannot perform search operations"
      );
    } else if (
      (services.serpapi_main as any).status === "healthy" &&
      (services.brightdata_proxy as any).status !== "unhealthy"
    ) {
      overallStatus = "healthy";
    } else if (
      (services.serpapi_main as any).status === "degraded" ||
      ((services.serpapi_main as any).status === "unhealthy" &&
        (services.brightdata_proxy as any).status === "healthy")
    ) {
      overallStatus = "degraded";
      if ((services.serpapi_main as any).status === "unhealthy") {
        recommendations.push(
          "Main SerpAPI service is down but BrightData proxy is available as fallback"
        );
      }
    } else {
      overallStatus = "unhealthy";
      recommendations.push(
        "Critical: All SerpAPI services are failing - immediate intervention required"
      );
    }

    // Add specific recommendations for high error rate
    if (estimatedErrorRate > 10) {
      recommendations.push(
        "High error rate detected - consider implementing exponential backoff and request queuing"
      );
    }

    if (estimatedErrorRate > 5) {
      recommendations.push(
        "Error rate exceeds threshold (5%) - monitor API quotas and rate limits"
      );
    }

    // Performance recommendations
    const avgResponseTime =
      Object.values(services)
        .filter((s: any) => s.responseTime)
        .reduce((sum, s: any) => sum + (s.responseTime || 0), 0) /
      Object.values(services).filter((s: any) => s.responseTime).length;

    if (avgResponseTime > 10000) {
      recommendations.push(
        "High response times detected - consider implementing caching and request optimization"
      );
    }

    const result: SerpApiHealthCheck = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      summary: {
        main_service: services.serpapi_main.status,
        alternative_service: services.serpapi_alternative.status,
        brightdata_proxy: services.brightdata_proxy.status,
        circuit_breaker_state: circuitBreakerState,
        error_rate: estimatedErrorRate,
      },
      services,
      recommendations,
    };

    const statusCode =
      overallStatus === "healthy"
        ? 200
        : overallStatus === "degraded"
          ? 200
          : overallStatus === "not_configured"
            ? 424
            : 503;

    return NextResponse.json(result, {
      status: statusCode,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Health-Check-Duration": `${Date.now() - startTime}ms`,
        "X-Error-Rate": `${estimatedErrorRate.toFixed(2)}%`,
      },
    });
  } catch (error) {
    const result: SerpApiHealthCheck = {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      summary: {
        main_service: "unhealthy",
        alternative_service: "unhealthy",
        brightdata_proxy: "unhealthy",
        circuit_breaker_state: "unknown",
        error_rate: 100,
      },
      services: {
        serpapi_main: {
          status: "unhealthy",
          error: error instanceof Error ? error.message : "Unknown error",
          api_key_configured: !!process.env["SERPAPI_API_KEY"],
        },
        serpapi_alternative: {
          status: "unhealthy",
          error: "Health check failed",
          api_key_configured: !!process.env["SERPAPI_API_KEY"],
        },
        brightdata_proxy: {
          status: "unhealthy",
          error: "Health check failed",
          proxy_configured: !!(
            process.env["BRIGHTDATA_CUSTOMER_ID"] &&
            process.env["BRIGHTDATA_ZONE"] &&
            process.env["BRIGHTDATA_PASSWORD"]
          ),
        },
      },
      recommendations: [
        "Critical health check failure - investigate SerpAPI service configuration immediately",
        "Error rate is 100% - all SerpAPI functionality is offline",
        ...recommendations,
      ],
    };

    return NextResponse.json(result, {
      status: 503,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Error-Rate": "100%",
      },
    });
  }
}
