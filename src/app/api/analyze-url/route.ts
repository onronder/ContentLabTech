/**
 * Enterprise-Grade URL Analysis API
 * Comprehensive URL analysis with security validation and circuit breaker pattern
 */

import { NextRequest, NextResponse } from "next/server";
import {
  withApiAuth,
  createSuccessResponse,
  type AuthContext,
} from "@/lib/auth/withApiAuth-v2";
import { enterpriseLogger } from "@/lib/monitoring/enterprise-logger";
import { validateInput } from "@/lib/security/validation";
import { SimpleRateLimiter } from "@/lib/security/simple-rate-limiter";
import { CircuitBreaker } from "@/lib/resilience/circuit-breaker";

// Rate limiter for URL analysis (more restrictive due to external API costs)
const urlAnalysisRateLimiter = new SimpleRateLimiter();

// Add a custom rule for URL analysis
urlAnalysisRateLimiter.addRule("url-analysis", {
  identifier: "url-analysis",
  limit: 10, // 10 requests per minute per IP
  windowMs: 60 * 1000, // 1 minute
});

// Circuit breaker for external API calls
const externalApiCircuitBreaker = new CircuitBreaker(
  "url-analysis-external-api",
  {
    failureThreshold: 5,
    recoveryTimeout: 30000,
    monitoringPeriod: 60000,
    halfOpenMaxAttempts: 3,
    successThreshold: 2,
  }
);

interface AnalyzeUrlRequest {
  url: string;
  analysisType?: "seo" | "performance" | "content" | "comprehensive";
  options?: {
    includeScreenshot?: boolean;
    includeTechnicalSeo?: boolean;
    includeContentAnalysis?: boolean;
    includePerformanceMetrics?: boolean;
    depth?: "basic" | "detailed" | "comprehensive";
  };
}

interface UrlAnalysisResult {
  url: string;
  status: "success" | "error" | "partial";
  timestamp: string;
  analysis: {
    seo?: {
      title?: string;
      description?: string;
      keywords?: string[];
      headings?: { level: number; text: string }[];
      images?: { src: string; alt?: string; title?: string }[];
      links?: { href: string; text: string; type: "internal" | "external" }[];
      technicalSeo?: {
        metaTags?: Record<string, string>;
        structuredData?: any[];
        robotsMeta?: string;
        canonicalUrl?: string;
      };
    };
    performance?: {
      loadTime?: number;
      firstContentfulPaint?: number;
      largestContentfulPaint?: number;
      cumulativeLayoutShift?: number;
      firstInputDelay?: number;
      score?: number;
    };
    content?: {
      wordCount?: number;
      readabilityScore?: number;
      sentiment?: "positive" | "negative" | "neutral";
      topics?: string[];
      quality?: number;
    };
    technical?: {
      statusCode?: number;
      responseTime?: number;
      contentType?: string;
      contentLength?: number;
      security?: {
        https?: boolean;
        hsts?: boolean;
        contentSecurityPolicy?: boolean;
      };
    };
  };
  recommendations?: string[];
  errors?: string[];
  warnings?: string[];
}

/**
 * Validate and sanitize URL
 */
function validateAndSanitizeUrl(url: string): {
  isValid: boolean;
  sanitizedUrl?: string;
  error?: string;
} {
  try {
    // Basic validation
    if (!validateInput(url, "url")) {
      return { isValid: false, error: "Invalid URL format" };
    }

    const urlObj = new URL(url);

    // Security checks
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return {
        isValid: false,
        error: "Only HTTP and HTTPS protocols are allowed",
      };
    }

    // Block localhost and private IPs for security
    const hostname = urlObj.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname.startsWith("127.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) ||
      hostname === "::1"
    ) {
      return {
        isValid: false,
        error: "Local and private network URLs are not allowed",
      };
    }

    // Length check
    if (url.length > 2048) {
      return { isValid: false, error: "URL too long (max 2048 characters)" };
    }

    return { isValid: true, sanitizedUrl: urlObj.toString() };
  } catch (error) {
    return { isValid: false, error: "Invalid URL format" };
  }
}

/**
 * Perform basic URL analysis (mock implementation - replace with real analysis)
 */
async function performUrlAnalysis(
  url: string,
  analysisType: string,
  options: any,
  requestId: string
): Promise<UrlAnalysisResult> {
  const startTime = Date.now();

  try {
    // Use circuit breaker for external API calls
    const circuitResult = await externalApiCircuitBreaker.execute(async () => {
      // Mock analysis - replace with actual implementation
      const response = await fetch(url, {
        method: "HEAD",
        headers: {
          "User-Agent": "ContentLab-Nexus-Analyzer/1.0",
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      const analysis: UrlAnalysisResult = {
        url,
        status: response.ok ? "success" : "partial",
        timestamp: new Date().toISOString(),
        analysis: {
          technical: {
            statusCode: response.status,
            responseTime: Date.now() - startTime,
            contentType: response.headers.get("content-type") || undefined,
            contentLength:
              parseInt(response.headers.get("content-length") || "0") ||
              undefined,
            security: {
              https: url.startsWith("https://"),
              hsts: !!response.headers.get("strict-transport-security"),
              contentSecurityPolicy: !!response.headers.get(
                "content-security-policy"
              ),
            },
          },
        },
        recommendations: [],
        errors: [],
        warnings: [],
      };

      // Add recommendations based on analysis
      if (!analysis.analysis.technical?.security?.https) {
        analysis.recommendations?.push(
          "Consider using HTTPS for better security"
        );
      }

      if (!analysis.analysis.technical?.security?.hsts) {
        analysis.recommendations?.push(
          "Enable HSTS (HTTP Strict Transport Security)"
        );
      }

      if (response.status >= 400) {
        analysis.errors?.push(
          `HTTP ${response.status}: ${response.statusText}`
        );
        analysis.status = "error";
      }

      return analysis;
    });

    // Handle circuit breaker result
    if (!circuitResult.success) {
      throw (
        circuitResult.error || new Error("Circuit breaker prevented execution")
      );
    }

    const analysisResult = circuitResult.data!;

    enterpriseLogger.info("URL analysis completed", {
      requestId,
      url,
      analysisType,
      status: analysisResult.status,
      duration: Date.now() - startTime,
    });

    return analysisResult;
  } catch (error) {
    enterpriseLogger.error(
      "URL analysis failed",
      error instanceof Error ? error : new Error(String(error)),
      {
        requestId,
        url,
        duration: Date.now() - startTime,
      }
    );

    return {
      url,
      status: "error",
      timestamp: new Date().toISOString(),
      analysis: {},
      errors: [error instanceof Error ? error.message : "Analysis failed"],
    };
  }
}

async function handlePost(request: NextRequest, context: AuthContext) {
  const { requestId, ipAddress } = context;

  try {
    // Apply rate limiting
    const clientIp =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      ipAddress ||
      "unknown";

    const rateLimitResult = await urlAnalysisRateLimiter.checkRateLimit(
      "url-analysis",
      clientIp
    );

    if (!rateLimitResult.allowed) {
      enterpriseLogger.warn("URL analysis rate limit exceeded", {
        requestId,
        ipAddress: clientIp,
        remaining: rateLimitResult.remaining,
      });

      const rule = urlAnalysisRateLimiter.getRule("url-analysis");
      return NextResponse.json(
        {
          error: "Rate limit exceeded for URL analysis",
          code: "RATE_LIMIT_EXCEEDED",
          requestId,
          retryAfter: Math.ceil(
            (rateLimitResult.resetTime - Date.now()) / 1000
          ),
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(
              (rateLimitResult.resetTime - Date.now()) / 1000
            ).toString(),
            "X-RateLimit-Limit": (rule?.limit || 10).toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
          },
        }
      );
    }

    const body: AnalyzeUrlRequest = await request.json();
    const { url, analysisType = "comprehensive", options = {} } = body;

    // Validate and sanitize URL
    const urlValidation = validateAndSanitizeUrl(url);
    if (!urlValidation.isValid) {
      enterpriseLogger.warn("Invalid URL for analysis", {
        requestId,
        url,
        error: urlValidation.error,
        ipAddress,
      });

      return NextResponse.json(
        {
          error: urlValidation.error || "Invalid URL",
          code: "INVALID_URL",
          requestId,
        },
        { status: 400 }
      );
    }

    enterpriseLogger.info("URL analysis request", {
      requestId,
      url: urlValidation.sanitizedUrl,
      analysisType,
      userId: context.user.id,
      ipAddress,
    });

    // Perform the analysis
    const analysisResult = await performUrlAnalysis(
      urlValidation.sanitizedUrl!,
      analysisType,
      options,
      requestId
    );

    return createSuccessResponse(
      {
        analysis: analysisResult,
      },
      200,
      {
        analysisType,
        circuitBreakerState: externalApiCircuitBreaker.getMetrics().state,
      },
      requestId
    );
  } catch (error) {
    enterpriseLogger.error(
      "URL analysis error",
      error instanceof Error ? error : new Error(String(error)),
      {
        requestId,
        userId: context.user.id,
        ipAddress,
      }
    );

    return NextResponse.json(
      {
        error: "Internal server error during URL analysis",
        code: "INTERNAL_ERROR",
        requestId,
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
async function handleGet(request: NextRequest, context: AuthContext) {
  const { requestId } = context;

  try {
    const circuitBreakerState = externalApiCircuitBreaker.getMetrics().state;
    const metrics = externalApiCircuitBreaker.getMetrics();

    return createSuccessResponse(
      {
        service: "URL Analysis API",
        status: circuitBreakerState === "OPEN" ? "degraded" : "healthy",
        circuitBreaker: {
          state: circuitBreakerState,
          metrics: {
            successCount: metrics.successCount,
            failureCount: metrics.failureCount,
            totalRequests: metrics.totalRequests,
            isAvailable: metrics.isAvailable,
          },
        },
        capabilities: [
          "SEO Analysis",
          "Performance Metrics",
          "Content Analysis",
          "Technical SEO",
        ],
      },
      200,
      undefined,
      requestId
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to retrieve service status",
        code: "SERVICE_STATUS_ERROR",
        requestId,
      },
      { status: 500 }
    );
  }
}

export const POST = withApiAuth(handlePost);
export const GET = withApiAuth(handleGet);
