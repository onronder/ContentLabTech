/**
 * Enterprise-Grade API Middleware
 * Comprehensive middleware stack with security, monitoring, and performance optimizations
 */

import { NextRequest, NextResponse } from "next/server";
import { enterpriseLogger } from "@/lib/monitoring/enterprise-logger";
import { recordRequestMetrics } from "@/lib/monitoring/api-metrics";
import { SimpleRateLimiter } from "@/lib/security/simple-rate-limiter";
import {
  validateInput,
  detectMaliciousPatterns,
} from "@/lib/security/validation";

// Rate limiters for different types of requests
const globalRateLimiter = new SimpleRateLimiter();
globalRateLimiter.addRule("global", {
  identifier: "global",
  limit: 1000, // 1000 requests per IP per 15 minutes
  windowMs: 15 * 60 * 1000, // 15 minutes
});

const authRateLimiter = new SimpleRateLimiter();
authRateLimiter.addRule("auth", {
  identifier: "auth",
  limit: 100, // 100 auth attempts per IP per 15 minutes
  windowMs: 15 * 60 * 1000, // 15 minutes
});

const apiRateLimiter = new SimpleRateLimiter();
apiRateLimiter.addRule("api", {
  identifier: "api",
  limit: 60, // 60 API calls per minute per IP
  windowMs: 60 * 1000, // 1 minute
});

// Blocked IPs and user agents (in production, load from database/config)
const blockedIPs = new Set<string>();
const blockedUserAgents = new Set<string>(["badbot", "scanner", "crawler"]);

// Security headers configuration
const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

// CORS configuration
const corsHeaders = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Requested-With, X-Request-ID",
  "Access-Control-Max-Age": "86400", // 24 hours
  "Access-Control-Allow-Credentials": "true",
};

interface MiddlewareOptions {
  enableRateLimit?: boolean;
  enableSecurity?: boolean;
  enableMonitoring?: boolean;
  enableCORS?: boolean;
  customRateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  allowedOrigins?: string[];
  skipPaths?: string[];
}

/**
 * Comprehensive API middleware
 */
export function createApiMiddleware(options: MiddlewareOptions = {}) {
  const {
    enableRateLimit = true,
    enableSecurity = true,
    enableMonitoring = true,
    enableCORS = true,
    allowedOrigins = ["http://localhost:3000", "https://your-domain.com"],
    skipPaths = ["/api/health", "/api/metrics"],
  } = options;

  return async function apiMiddleware(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<Response>
  ): Promise<Response> {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    const method = request.method;
    const url = request.url;
    const pathname = new URL(url).pathname;

    // Extract client information
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const origin = request.headers.get("origin");

    // Skip middleware for certain paths
    if (skipPaths.some(path => pathname.startsWith(path))) {
      return handler(request);
    }

    try {
      // 1. Security checks
      if (enableSecurity) {
        // Check blocked IPs
        if (blockedIPs.has(ipAddress)) {
          enterpriseLogger.warn("Blocked IP attempted access", {
            requestId,
            ipAddress,
            userAgent,
            url,
          });

          return new NextResponse("Forbidden", {
            status: 403,
            headers: {
              ...securityHeaders,
              "X-Request-ID": requestId,
            },
          });
        }

        // Check blocked user agents
        const isBlockedUserAgent = Array.from(blockedUserAgents).some(blocked =>
          userAgent.toLowerCase().includes(blocked.toLowerCase())
        );

        if (isBlockedUserAgent) {
          enterpriseLogger.warn("Blocked user agent attempted access", {
            requestId,
            userAgent,
            ipAddress,
            url,
          });

          return new NextResponse("Forbidden", {
            status: 403,
            headers: {
              ...securityHeaders,
              "X-Request-ID": requestId,
            },
          });
        }

        // Check for malicious patterns in URL
        const urlCheck = detectMaliciousPatterns(url);
        if (urlCheck.isMalicious && urlCheck.risk === "critical") {
          enterpriseLogger.error(
            "Malicious URL pattern detected",
            new Error(
              `Malicious URL pattern detected: ${urlCheck.detectedPatterns.join(", ")}`
            ),
            {
              requestId,
              url,
              patterns: urlCheck.detectedPatterns,
              risk: urlCheck.risk,
              ipAddress,
              userAgent,
            }
          );

          return new NextResponse("Bad Request", {
            status: 400,
            headers: {
              ...securityHeaders,
              "X-Request-ID": requestId,
            },
          });
        }

        // Validate request headers
        const contentLength = request.headers.get("content-length");
        if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
          // 10MB limit
          enterpriseLogger.warn("Request body too large", {
            requestId,
            contentLength: parseInt(contentLength),
            ipAddress,
            url,
          });

          return new NextResponse("Payload Too Large", {
            status: 413,
            headers: {
              ...securityHeaders,
              "X-Request-ID": requestId,
            },
          });
        }
      }

      // 2. Rate limiting
      if (enableRateLimit) {
        let rateLimiter = globalRateLimiter;

        // Use specific rate limiter for auth endpoints
        if (
          pathname.includes("/auth") ||
          pathname.includes("/login") ||
          pathname.includes("/register")
        ) {
          rateLimiter = authRateLimiter;
        } else if (pathname.startsWith("/api/")) {
          rateLimiter = apiRateLimiter;
        }

        const clientIp =
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          ipAddress ||
          "unknown";

        // Determine which rule to use based on the rate limiter
        let ruleId = "global";
        if (rateLimiter === authRateLimiter) {
          ruleId = "auth";
        } else if (rateLimiter === apiRateLimiter) {
          ruleId = "api";
        }

        const rateLimitResult = await rateLimiter.checkRateLimit(
          ruleId,
          clientIp
        );
        if (!rateLimitResult.allowed) {
          enterpriseLogger.warn("Rate limit exceeded", {
            requestId,
            ipAddress,
            userAgent,
            endpoint: pathname,
            remaining: rateLimitResult.remaining,
            resetTime: rateLimitResult.resetTime,
          });

          const response = new NextResponse("Too Many Requests", {
            status: 429,
            headers: {
              ...securityHeaders,
              "X-Request-ID": requestId,
              "Retry-After": Math.ceil(
                (rateLimitResult.resetTime - Date.now()) / 1000
              ).toString(),
              "X-RateLimit-Limit": (
                rateLimiter.getRule(ruleId)?.limit || 1000
              ).toString(),
              "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
              "X-RateLimit-Reset": new Date(
                rateLimitResult.resetTime
              ).toISOString(),
            },
          });

          if (enableMonitoring) {
            recordRequestMetrics({
              requestId,
              method,
              url,
              statusCode: 429,
              duration: Date.now() - startTime,
              ipAddress,
              userAgent,
              errorType: "RATE_LIMIT_EXCEEDED",
              errorMessage: "Rate limit exceeded",
            });
          }

          return response;
        }
      }

      // 3. CORS handling
      if (enableCORS) {
        // Handle preflight requests
        if (method === "OPTIONS") {
          const corsResponse = new NextResponse(null, {
            status: 200,
            headers: {
              ...corsHeaders,
              ...securityHeaders,
              "X-Request-ID": requestId,
            },
          });

          // Set origin if allowed
          if (origin && allowedOrigins.includes(origin)) {
            corsResponse.headers.set("Access-Control-Allow-Origin", origin);
          }

          return corsResponse;
        }
      }

      // 4. Add request context to headers
      const enhancedRequest = new NextRequest(request, {
        headers: {
          ...Object.fromEntries(request.headers.entries()),
          "x-request-id": requestId,
          "x-client-ip": ipAddress,
          "x-start-time": startTime.toString(),
        },
      });

      // 5. Call the actual handler
      enterpriseLogger.debug("Processing API request", {
        requestId,
        method,
        url: pathname,
        ipAddress,
        userAgent: userAgent.substring(0, 100),
      });

      const response = await handler(enhancedRequest);
      const duration = Date.now() - startTime;

      // 6. Enhance response with security headers and CORS
      const enhancedResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: new Headers(response.headers),
      });

      // Add security headers
      if (enableSecurity) {
        Object.entries(securityHeaders).forEach(([key, value]) => {
          enhancedResponse.headers.set(key, value);
        });
      }

      // Add CORS headers
      if (enableCORS && origin && allowedOrigins.includes(origin)) {
        enhancedResponse.headers.set("Access-Control-Allow-Origin", origin);
        enhancedResponse.headers.set(
          "Access-Control-Allow-Credentials",
          "true"
        );
      }

      // Add request ID
      enhancedResponse.headers.set("X-Request-ID", requestId);

      // Add performance headers
      enhancedResponse.headers.set("X-Response-Time", `${duration}ms`);

      // 7. Record metrics
      if (enableMonitoring) {
        const responseSize = enhancedResponse.headers.get("content-length");

        recordRequestMetrics({
          requestId,
          method,
          url,
          statusCode: response.status,
          duration,
          ipAddress,
          userAgent,
          responseSize: responseSize ? parseInt(responseSize) : undefined,
          errorType:
            response.status >= 400 ? `HTTP_${response.status}` : undefined,
          errorMessage:
            response.status >= 400 ? response.statusText : undefined,
        });

        // Log successful completion
        enterpriseLogger.info("API request completed", {
          requestId,
          method,
          url: pathname,
          statusCode: response.status,
          duration,
          ipAddress,
          responseSize: responseSize ? parseInt(responseSize) : 0,
        });
      }

      return enhancedResponse;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      enterpriseLogger.error(
        "API middleware error",
        error instanceof Error ? error : new Error(errorMessage),
        {
          requestId,
          method,
          url,
          duration,
          ipAddress,
          userAgent,
        }
      );

      // Record error metrics
      if (enableMonitoring) {
        recordRequestMetrics({
          requestId,
          method,
          url,
          statusCode: 500,
          duration,
          ipAddress,
          userAgent,
          errorType: "MIDDLEWARE_ERROR",
          errorMessage,
        });
      }

      return new NextResponse("Internal Server Error", {
        status: 500,
        headers: {
          ...securityHeaders,
          "X-Request-ID": requestId,
          "Content-Type": "application/json",
        },
      });
    }
  };
}

/**
 * Simple middleware wrapper for API routes
 */
export function withApiMiddleware(
  handler: (req: NextRequest) => Promise<Response>,
  options: MiddlewareOptions = {}
) {
  const middleware = createApiMiddleware(options);

  return async function wrappedHandler(
    request: NextRequest
  ): Promise<Response> {
    return middleware(request, handler);
  };
}

/**
 * Block an IP address
 */
export function blockIP(ip: string, reason?: string) {
  blockedIPs.add(ip);
  enterpriseLogger.warn("IP address blocked", { ip, reason });
}

/**
 * Unblock an IP address
 */
export function unblockIP(ip: string) {
  blockedIPs.delete(ip);
  enterpriseLogger.info("IP address unblocked", { ip });
}

/**
 * Get blocked IPs
 */
export function getBlockedIPs(): string[] {
  return Array.from(blockedIPs);
}

/**
 * Block a user agent
 */
export function blockUserAgent(userAgent: string, reason?: string) {
  blockedUserAgents.add(userAgent.toLowerCase());
  enterpriseLogger.warn("User agent blocked", { userAgent, reason });
}

/**
 * Get blocked user agents
 */
export function getBlockedUserAgents(): string[] {
  return Array.from(blockedUserAgents);
}

export default createApiMiddleware;
