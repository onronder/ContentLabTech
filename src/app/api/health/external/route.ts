/**
 * External Services Health Check Endpoint
 * Tests connectivity to all external APIs and services
 */

import { NextRequest, NextResponse } from "next/server";
import { circuitBreakerManager } from "@/lib/resilience/circuit-breaker";
import { timeoutFetch } from "@/lib/resilience/timeout-fetch";

interface ExternalServiceCheck {
  name: string;
  status: "healthy" | "degraded" | "unhealthy" | "not_configured";
  responseTime?: number;
  error?: string;
  circuitBreakerState?: string;
  lastChecked: string;
}

interface ExternalServicesHealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    notConfigured: number;
  };
  services: ExternalServiceCheck[];
}

export async function GET(_request: NextRequest) {
  const startTime = Date.now();

  try {
    // Define all external services to check
    const servicesToCheck = [
      {
        name: "SerpAPI",
        check: checkSerpAPI,
        required: true,
      },
      {
        name: "OpenAI",
        check: checkOpenAI,
        required: true,
      },
      {
        name: "BrightData",
        check: checkBrightData,
        required: false,
      },
      {
        name: "Google Analytics",
        check: checkGoogleAnalytics,
        required: false,
      },
      {
        name: "Supabase",
        check: checkSupabase,
        required: true,
      },
    ];

    // Run all checks in parallel
    const checkPromises = servicesToCheck.map(async service => {
      try {
        return await service.check();
      } catch (error) {
        return {
          name: service.name,
          status: "unhealthy" as const,
          error: error instanceof Error ? error.message : "Unknown error",
          lastChecked: new Date().toISOString(),
        };
      }
    });

    const results = await Promise.allSettled(checkPromises);
    const services: ExternalServiceCheck[] = results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        return {
          name: servicesToCheck[index]?.name || "Unknown",
          status: "unhealthy" as const,
          error: `Check failed: ${result.reason}`,
          lastChecked: new Date().toISOString(),
        };
      }
    });

    // Calculate summary
    const summary = {
      total: services.length,
      healthy: services.filter(s => s.status === "healthy").length,
      degraded: services.filter(s => s.status === "degraded").length,
      unhealthy: services.filter(s => s.status === "unhealthy").length,
      notConfigured: services.filter(s => s.status === "not_configured").length,
    };

    // Determine overall status
    let overallStatus: "healthy" | "degraded" | "unhealthy";
    const requiredServices = servicesToCheck.filter(s => s.required);
    const requiredUnhealthy = services.filter(
      s =>
        requiredServices.some(rs => rs.name === s.name) &&
        (s.status === "unhealthy" || s.status === "not_configured")
    );

    if (requiredUnhealthy.length > 0) {
      overallStatus = "unhealthy";
    } else if (summary.unhealthy > 0 || summary.degraded > 0) {
      overallStatus = "degraded";
    } else {
      overallStatus = "healthy";
    }

    const result: ExternalServicesHealthCheck = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      summary,
      services,
    };

    const statusCode =
      overallStatus === "healthy"
        ? 200
        : overallStatus === "degraded"
          ? 200
          : 503;

    return NextResponse.json(result, {
      status: statusCode,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Health-Check-Duration": `${Date.now() - startTime}ms`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        summary: {
          total: 0,
          healthy: 0,
          degraded: 0,
          unhealthy: 1,
          notConfigured: 0,
        },
        services: [],
        error: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
      }
    );
  }
}

async function checkOpenAI(): Promise<ExternalServiceCheck> {
  const apiKey = process.env["OPENAI_API_KEY"];

  if (!apiKey) {
    return {
      name: "OpenAI",
      status: "not_configured",
      error: "OPENAI_API_KEY not configured",
      lastChecked: new Date().toISOString(),
    };
  }

  const startTime = Date.now();

  try {
    // Test with a lightweight completion request
    const testPayload = {
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Hello" }],
      max_tokens: 5,
    };

    const result = await timeoutFetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testPayload),
        timeout: 15000,
        circuitBreaker: "openai-health",
      }
    );

    const responseTime = Date.now() - startTime;

    if (!result.success) {
      // Check for specific error types
      let errorMessage = result.error
        ? result.error.message
        : "API request failed";
      let status: "unhealthy" | "degraded" = "unhealthy";

      if (result.error && typeof result.error === "object") {
        const error = result.error as any;
        if (error.status === 429) {
          errorMessage = "Rate limit exceeded";
          status = "degraded"; // Rate limiting is degraded, not completely unhealthy
        } else if (error.status === 401) {
          errorMessage = "Invalid API key";
        } else if (error.status === 402) {
          errorMessage = "Quota exceeded";
        } else if (error.status >= 500) {
          errorMessage = "OpenAI server error";
          status = "degraded"; // Server errors might be temporary
        }
      }

      return {
        name: "OpenAI",
        status,
        responseTime,
        error: errorMessage,
        circuitBreakerState: circuitBreakerManager
          .getCircuitBreaker("openai-health")
          .getMetrics().state,
        lastChecked: new Date().toISOString(),
      };
    }

    // Check response data
    const data = result.data;
    if (data && typeof data === "object" && "error" in data) {
      return {
        name: "OpenAI",
        status: "unhealthy",
        responseTime,
        error: `API Error: ${data.error}`,
        circuitBreakerState: circuitBreakerManager
          .getCircuitBreaker("openai-health")
          .getMetrics().state,
        lastChecked: new Date().toISOString(),
      };
    }

    // Determine status based on response time and data quality
    let status: "healthy" | "degraded" | "unhealthy";
    if (responseTime > 30000) {
      status = "unhealthy"; // Very slow
    } else if (responseTime > 15000) {
      status = "degraded"; // Slow but working
    } else {
      status = "healthy";
    }

    // Check if we got a valid completion response
    if (
      data &&
      typeof data === "object" &&
      "choices" in data &&
      Array.isArray(data.choices) &&
      data.choices.length > 0
    ) {
      // Valid response structure
      status = status === "unhealthy" ? "degraded" : status; // Upgrade status if we got valid data
    }

    return {
      name: "OpenAI",
      status,
      responseTime,
      circuitBreakerState: circuitBreakerManager
        .getCircuitBreaker("openai-health")
        .getMetrics().state,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      name: "OpenAI",
      status: "unhealthy",
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown error",
      circuitBreakerState: circuitBreakerManager
        .getCircuitBreaker("openai-health")
        .getMetrics().state,
      lastChecked: new Date().toISOString(),
    };
  }
}

async function checkBrightData(): Promise<ExternalServiceCheck> {
  const customerId = process.env["BRIGHTDATA_CUSTOMER_ID"];
  const zone = process.env["BRIGHTDATA_ZONE"];
  const password = process.env["BRIGHTDATA_PASSWORD"];

  if (!customerId || !zone || !password) {
    return {
      name: "BrightData",
      status: "not_configured",
      error: "BrightData credentials not fully configured",
      lastChecked: new Date().toISOString(),
    };
  }

  // For BrightData, we'll just verify the configuration is present
  // Testing actual SERP requests would be expensive and slow
  return {
    name: "BrightData",
    status: "healthy",
    responseTime: 0,
    circuitBreakerState: circuitBreakerManager
      .getCircuitBreaker("brightdata")
      .getMetrics().state,
    lastChecked: new Date().toISOString(),
  };
}

async function checkGoogleAnalytics(): Promise<ExternalServiceCheck> {
  const clientId = process.env["GOOGLE_ANALYTICS_CLIENT_ID"];
  const clientSecret = process.env["GOOGLE_ANALYTICS_CLIENT_SECRET"];

  if (!clientId || !clientSecret) {
    return {
      name: "Google Analytics",
      status: "not_configured",
      error: "Google Analytics credentials not configured",
      lastChecked: new Date().toISOString(),
    };
  }

  // For Google Analytics, we'll just verify the configuration is present
  // Testing actual API calls requires OAuth flow
  return {
    name: "Google Analytics",
    status: "healthy",
    responseTime: 0,
    circuitBreakerState: circuitBreakerManager
      .getCircuitBreaker("google-analytics")
      .getMetrics().state,
    lastChecked: new Date().toISOString(),
  };
}

async function checkSerpAPI(): Promise<ExternalServiceCheck> {
  const apiKey = process.env["SERPAPI_API_KEY"];

  if (!apiKey) {
    return {
      name: "SerpAPI",
      status: "not_configured",
      error: "SERPAPI_API_KEY not configured",
      lastChecked: new Date().toISOString(),
    };
  }

  const startTime = Date.now();

  try {
    // Test SerpAPI with a lightweight query
    const testUrl = `https://serpapi.com/search?engine=google&q=test&api_key=${apiKey}&num=1`;
    const result = await timeoutFetch(testUrl, {
      timeout: 15000, // SerpAPI can be slower than other services
      circuitBreaker: "serpapi-health",
    });

    const responseTime = Date.now() - startTime;

    if (!result.success) {
      return {
        name: "SerpAPI",
        status: "unhealthy",
        responseTime,
        error: result.error ? result.error.message : "API request failed",
        circuitBreakerState: circuitBreakerManager
          .getCircuitBreaker("serpapi-health")
          .getMetrics().state,
        lastChecked: new Date().toISOString(),
      };
    }

    // Check response for rate limiting or quota issues
    const data = result.data;
    if (data && typeof data === "object" && "error" in data) {
      return {
        name: "SerpAPI",
        status: "unhealthy",
        responseTime,
        error: `API Error: ${data.error}`,
        circuitBreakerState: circuitBreakerManager
          .getCircuitBreaker("serpapi-health")
          .getMetrics().state,
        lastChecked: new Date().toISOString(),
      };
    }

    // Determine status based on response time and data quality
    let status: "healthy" | "degraded" | "unhealthy";
    if (responseTime > 10000) {
      status = "degraded"; // Very slow but working
    } else if (responseTime > 5000) {
      status = "degraded"; // Slow but acceptable
    } else {
      status = "healthy";
    }

    return {
      name: "SerpAPI",
      status,
      responseTime,
      circuitBreakerState: circuitBreakerManager
        .getCircuitBreaker("serpapi-health")
        .getMetrics().state,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      name: "SerpAPI",
      status: "unhealthy",
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown error",
      circuitBreakerState: circuitBreakerManager
        .getCircuitBreaker("serpapi-health")
        .getMetrics().state,
      lastChecked: new Date().toISOString(),
    };
  }
}

async function checkSupabase(): Promise<ExternalServiceCheck> {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const key = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

  if (!url || !key) {
    return {
      name: "Supabase",
      status: "not_configured",
      error: "Supabase credentials not configured",
      lastChecked: new Date().toISOString(),
    };
  }

  const startTime = Date.now();

  try {
    // Test Supabase API endpoint
    const result = await timeoutFetch(`${url}/rest/v1/`, {
      headers: {
        apikey: key,
      },
      timeout: 5000,
      circuitBreaker: "supabase",
    });

    const responseTime = Date.now() - startTime;

    if (!result.success) {
      return {
        name: "Supabase",
        status: "unhealthy",
        responseTime,
        error: result.error ? result.error.message : "Unknown error",
        circuitBreakerState: circuitBreakerManager
          .getCircuitBreaker("supabase")
          .getMetrics().state,
        lastChecked: new Date().toISOString(),
      };
    }

    return {
      name: "Supabase",
      status: responseTime > 3000 ? "degraded" : "healthy",
      responseTime,
      circuitBreakerState: circuitBreakerManager
        .getCircuitBreaker("supabase")
        .getMetrics().state,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      name: "Supabase",
      status: "unhealthy",
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown error",
      circuitBreakerState: circuitBreakerManager
        .getCircuitBreaker("supabase")
        .getMetrics().state,
      lastChecked: new Date().toISOString(),
    };
  }
}
