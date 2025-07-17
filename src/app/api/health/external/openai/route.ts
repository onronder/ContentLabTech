/**
 * OpenAI Health Check Endpoint
 * Comprehensive health check for OpenAI integration
 * Addresses high error rate (6.63%) by testing all OpenAI functionality
 */

import { NextRequest, NextResponse } from "next/server";
import { circuitBreakerManager } from "@/lib/resilience/circuit-breaker";
import { timeoutFetch } from "@/lib/resilience/timeout-fetch";
import { healthCheck as openaiHealthCheck } from "@/lib/openai";
import { enhancedOpenAIService } from "@/lib/openai-enhanced";

interface OpenAIHealthCheck {
  status: "healthy" | "degraded" | "unhealthy" | "not_configured";
  timestamp: string;
  responseTime: number;
  summary: {
    main_service: "healthy" | "degraded" | "unhealthy" | "not_configured";
    enhanced_service: "healthy" | "degraded" | "unhealthy" | "not_configured";
    circuit_breaker_state: string;
    error_rate: number;
    last_24h_errors?: number;
  };
  services: {
    openai_main: {
      status: "healthy" | "degraded" | "unhealthy" | "not_configured";
      responseTime?: number;
      error?: string;
      api_key_configured: boolean;
      test_completion_successful?: boolean;
    };
    openai_enhanced: {
      status: "healthy" | "degraded" | "unhealthy" | "not_configured";
      responseTime?: number;
      error?: string;
      api_key_configured: boolean;
      metrics?: any;
    };
  };
  recommendations: string[];
}

export async function GET(_request: NextRequest) {
  const startTime = Date.now();
  const recommendations: string[] = [];

  try {
    // Check environment variables
    const openaiApiKey = process.env["OPENAI_API_KEY"];
    const openaiOrganization = process.env["OPENAI_ORGANIZATION"];
    const openaiProject = process.env["OPENAI_PROJECT_ID"];

    if (!openaiApiKey) {
      recommendations.push(
        "Configure OPENAI_API_KEY environment variable for AI-powered content analysis"
      );
    }

    if (!openaiOrganization && !openaiProject) {
      recommendations.push(
        "Consider configuring OPENAI_ORGANIZATION or OPENAI_PROJECT_ID for better organization and billing tracking"
      );
    }

    // Initialize service health checks
    const services = {
      openai_main: {
        status: "not_configured" as const,
        api_key_configured: !!openaiApiKey,
      },
      openai_enhanced: {
        status: "not_configured" as const,
        api_key_configured: !!openaiApiKey,
      },
    };

    // Test main OpenAI service
    if (openaiApiKey) {
      try {
        const mainStartTime = Date.now();
        const isHealthy = await openaiHealthCheck();
        const mainResponseTime = Date.now() - mainStartTime;

        services.openai_main = {
          status: isHealthy
            ? mainResponseTime > 15000
              ? "degraded"
              : "healthy"
            : "unhealthy",
          responseTime: mainResponseTime,
          api_key_configured: true,
          test_completion_successful: isHealthy,
        } as any;

        if (!isHealthy) {
          (services.openai_main as any).error =
            "Health check failed - API may be down or rate limited";
          recommendations.push(
            "Main OpenAI service is failing - check API key validity and rate limits"
          );
        }
      } catch (error) {
        services.openai_main = {
          status: "unhealthy",
          error: error instanceof Error ? error.message : "Unknown error",
          api_key_configured: true,
          test_completion_successful: false,
        } as any;
        recommendations.push(
          "Main OpenAI service threw an exception - check network connectivity and API configuration"
        );
      }
    } else {
      recommendations.push(
        "Primary OpenAI service not configured - add OPENAI_API_KEY to environment variables"
      );
    }

    // Test enhanced OpenAI service
    if (openaiApiKey) {
      try {
        const enhancedStartTime = Date.now();
        const enhancedHealth = await enhancedOpenAIService.healthCheck();
        const enhancedResponseTime = Date.now() - enhancedStartTime;

        services.openai_enhanced = {
          status: enhancedHealth.status,
          responseTime: enhancedResponseTime,
          api_key_configured: true,
          metrics: enhancedHealth.metrics,
        } as any;

        if (enhancedHealth.status === "unhealthy") {
          (services.openai_enhanced as any).error =
            enhancedHealth.recommendations.join(", ") ||
            "Enhanced service unhealthy";
          recommendations.push(
            "Enhanced OpenAI service is unhealthy - this reduces system resilience"
          );
        }

        // Add recommendations from enhanced service
        recommendations.push(...enhancedHealth.recommendations);
      } catch (error) {
        services.openai_enhanced = {
          status: "unhealthy",
          error: error instanceof Error ? error.message : "Unknown error",
          api_key_configured: true,
        } as any;
        recommendations.push(
          "Enhanced OpenAI service failed - check service configuration and error handling"
        );
      }
    }

    // Get circuit breaker state
    const circuitBreakerState = circuitBreakerManager
      .getCircuitBreaker("openai-enhanced")
      .getMetrics().state;

    if (circuitBreakerState === "OPEN") {
      recommendations.push(
        "OpenAI circuit breaker is OPEN - service is temporarily disabled due to failures"
      );
    } else if (circuitBreakerState === "HALF_OPEN") {
      recommendations.push(
        "OpenAI circuit breaker is HALF_OPEN - service is being tested for recovery"
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

    if (!openaiApiKey) {
      overallStatus = "not_configured";
      recommendations.push(
        "No OpenAI services are configured - AI features cannot function"
      );
    } else if (
      (services.openai_main as any).status === "healthy" &&
      (services.openai_enhanced as any).status !== "unhealthy"
    ) {
      overallStatus = "healthy";
    } else if (
      (services.openai_main as any).status === "degraded" ||
      ((services.openai_main as any).status === "unhealthy" &&
        (services.openai_enhanced as any).status === "healthy")
    ) {
      overallStatus = "degraded";
      if ((services.openai_main as any).status === "unhealthy") {
        recommendations.push(
          "Main OpenAI service is down but enhanced service is available as fallback"
        );
      }
    } else {
      overallStatus = "unhealthy";
      recommendations.push(
        "Critical: All OpenAI services are failing - immediate intervention required"
      );
    }

    // Add specific recommendations for high error rate
    if (estimatedErrorRate > 10) {
      recommendations.push(
        "High error rate detected - consider implementing request queuing and better retry logic"
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

    if (avgResponseTime > 30000) {
      recommendations.push(
        "High response times detected - consider optimizing prompts and using faster models"
      );
    }

    // Token usage recommendations
    const enhancedMetrics = (services.openai_enhanced as any).metrics;
    if (enhancedMetrics?.tokenUsage?.averageTokensPerRequest > 2000) {
      recommendations.push(
        "High token usage detected - optimize prompts to reduce costs"
      );
    }

    if (enhancedMetrics?.tokenUsage?.estimatedCost > 10) {
      recommendations.push(
        "High estimated costs - consider using more cost-effective models like gpt-4o-mini"
      );
    }

    const result: OpenAIHealthCheck = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      summary: {
        main_service: services.openai_main.status,
        enhanced_service: services.openai_enhanced.status,
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
    const result: OpenAIHealthCheck = {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      summary: {
        main_service: "unhealthy",
        enhanced_service: "unhealthy",
        circuit_breaker_state: "unknown",
        error_rate: 100,
      },
      services: {
        openai_main: {
          status: "unhealthy",
          error: error instanceof Error ? error.message : "Unknown error",
          api_key_configured: !!process.env["OPENAI_API_KEY"],
        },
        openai_enhanced: {
          status: "unhealthy",
          error: "Health check failed",
          api_key_configured: !!process.env["OPENAI_API_KEY"],
        },
      },
      recommendations: [
        "Critical health check failure - investigate OpenAI service configuration immediately",
        "Error rate is 100% - all OpenAI functionality is offline",
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
