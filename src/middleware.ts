/**
 * Next.js Middleware for Route Protection & Security
 * Production-grade with enterprise features, comprehensive security, and monitoring
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { simpleRateLimiter } from "./lib/security/simple-rate-limiter";
import { InputValidator } from "./lib/security/input-validator";
import { csrfProtection } from "./lib/security/csrf-protection";
import { securityHeaders } from "./lib/security/security-headers";
import { correlationTracker } from "./lib/security/correlation-tracker";

// Safe enterprise logger initialization
interface SafeLogger {
  warn?: (message: string, ...args: unknown[]) => void;
  info?: (message: string, ...args: unknown[]) => void;
  debug?: (message: string, ...args: unknown[]) => void;
  error?: (message: string, error?: unknown, ...args: unknown[]) => void;
}

// Create a safe wrapper around console
const enterpriseLogger: SafeLogger = {
  warn: (message: string, ...args: unknown[]) =>
    console.warn("[WARN]", message, ...args),
  info: (message: string, ...args: unknown[]) =>
    console.info("[INFO]", message, ...args),
  debug: (message: string, ...args: unknown[]) =>
    console.debug("[DEBUG]", message, ...args),
  error: (message: string, error?: unknown, ...args: unknown[]) =>
    console.error("[ERROR]", message, error, ...args),
};

// Attempt to load the actual enterprise logger
if (typeof process !== "undefined" && process.env.NODE_ENV !== "test") {
  import("./lib/monitoring/enterprise-logger")
    .then(({ enterpriseLogger: logger }) => {
      if (logger) {
        Object.assign(enterpriseLogger, {
          warn: logger.warn?.bind(logger),
          info: logger.info?.bind(logger),
          debug: logger.debug?.bind(logger),
          error: logger.error?.bind(logger),
        });
      }
    })
    .catch(() => {
      console.warn(
        "Enterprise logger initialization failed, using console fallback"
      );
    });
}

// Middleware error class for better error handling
class MiddlewareError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode = 500,
    public correlationId?: string
  ) {
    super(message);
    this.name = "MiddlewareError";
  }
}

// Legacy fallback for rate limiting (Redis is now primary)
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const fallbackRateLimitStore = new Map<string, RateLimitEntry>();

// Security configuration with environment overrides
const SECURITY_CONFIG = {
  // Request validation
  MAX_REQUEST_SIZE: parseInt(process.env["MAX_REQUEST_SIZE"] || "10485760"), // 10MB
  MAX_HEADER_SIZE: parseInt(process.env["MAX_HEADER_SIZE"] || "8192"), // 8KB
  MAX_URL_LENGTH: parseInt(process.env["MAX_URL_LENGTH"] || "2048"),

  // Rate limiting rules
  RATE_LIMITS: {
    api: {
      requests: parseInt(process.env["API_RATE_LIMIT_REQUESTS"] || "100"),
      window: parseInt(process.env["API_RATE_LIMIT_WINDOW"] || "60") * 1000,
    },
    auth: {
      requests: parseInt(process.env["AUTH_RATE_LIMIT_REQUESTS"] || "5"),
      window: parseInt(process.env["AUTH_RATE_LIMIT_WINDOW"] || "900") * 1000, // 15 minutes
    },
    heavy: {
      requests: parseInt(process.env["HEAVY_RATE_LIMIT_REQUESTS"] || "10"),
      window: parseInt(process.env["HEAVY_RATE_LIMIT_WINDOW"] || "60") * 1000,
    },
  },

  // Feature flags
  ENABLE_REQUEST_VALIDATION:
    process.env["ENABLE_REQUEST_VALIDATION"] !== "false",
  ENABLE_ANOMALY_DETECTION: process.env["ENABLE_ANOMALY_DETECTION"] !== "false",
  ENABLE_CORRELATION_TRACKING:
    process.env["ENABLE_CORRELATION_TRACKING"] !== "false",
};

/**
 * Get client IP with multiple fallbacks
 */
function getClientIp(request: NextRequest): string {
  try {
    // Try various headers in order of preference
    const forwarded = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const cfConnectingIp = request.headers.get("cf-connecting-ip"); // Cloudflare
    const xClientIp = request.headers.get("x-client-ip");
    const remoteAddr = request.headers.get("remote-addr");

    // x-forwarded-for can contain multiple IPs, take the first one
    if (forwarded) {
      const firstIp = forwarded.split(",")[0];
      if (firstIp && firstIp.trim()) {
        return firstIp.trim();
      }
    }

    // Try other headers
    if (cfConnectingIp) return cfConnectingIp;
    if (realIp) return realIp;
    if (xClientIp) return xClientIp;
    if (remoteAddr) return remoteAddr;
  } catch (error) {
    console.error("Error getting client IP:", error);
  }

  // Fallback for development/localhost
  return "127.0.0.1";
}

/**
 * Determine rate limiting rule based on request
 */
function determineRateLimitRule(pathname: string, method: string): string {
  // Authentication endpoints
  if (pathname.startsWith("/auth/") || pathname.startsWith("/api/auth/")) {
    return "auth";
  }

  // Heavy operations
  if (
    pathname.includes("/upload") ||
    pathname.includes("/export") ||
    pathname.includes("/analyze") ||
    pathname.includes("/generate")
  ) {
    return "heavy";
  }

  // WebSocket connections
  if (
    pathname.startsWith("/api/websocket") ||
    pathname.startsWith("/api/realtime")
  ) {
    return "websocket";
  }

  // Default API rate limiting
  return "api";
}

/**
 * Check rate limit using fallback system
 */
async function checkRateLimit(
  ruleName: string,
  identifier: string,
  correlationId?: string
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  try {
    const result = await simpleRateLimiter.checkRateLimit(ruleName, identifier);

    if (!result.allowed && correlationId) {
      correlationTracker.logSecurityEvent(correlationId, {
        eventType: "rate_limit",
        threatLevel: "medium",
        blocked: true,
        reason: `Rate limit exceeded for ${ruleName}: ${identifier}`,
        metadata: { ruleName, identifier, limit: result.totalHits },
      });
    }

    return {
      allowed: result.allowed,
      remaining: result.remaining,
      resetTime: result.resetTime,
    };
  } catch (error) {
    console.error("Rate limit error:", error);
    // Fallback to basic rate limiting
    return fallbackRateLimit(identifier);
  }
}

/**
 * Fallback rate limiting when Redis is unavailable
 */
function fallbackRateLimit(identifier: string): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const key = `fallback:${identifier}`;
  const existing = fallbackRateLimitStore.get(key);
  const limit = 50; // Conservative fallback limit
  const window = 60 * 1000; // 1 minute

  if (!existing || now > existing.resetTime) {
    fallbackRateLimitStore.set(key, {
      count: 1,
      resetTime: now + window,
    });
    return { allowed: true, remaining: limit - 1, resetTime: now + window };
  }

  existing.count++;
  const remaining = Math.max(0, limit - existing.count);

  return {
    allowed: existing.count <= limit,
    remaining,
    resetTime: existing.resetTime,
  };
}

/**
 * Handle middleware errors with proper correlation tracking
 */
function handleMiddlewareError(
  error: Error,
  correlationId: string,
  pathname: string
): NextResponse {
  const isProduction = process.env.NODE_ENV === "production";

  // Log error with correlation tracking
  correlationTracker.logSecurityEvent(correlationId, {
    eventType: "validation_error",
    threatLevel: "medium",
    blocked: false,
    reason: error.message,
    metadata: {
      error: error.name,
      stack: isProduction ? undefined : error.stack,
    },
  });

  if (error instanceof MiddlewareError) {
    return NextResponse.json(
      {
        error: isProduction ? "Request failed" : error.message,
        code: error.code,
        correlationId,
        timestamp: new Date().toISOString(),
      },
      {
        status: error.statusCode,
        headers: {
          "X-Correlation-ID": correlationId,
          "X-Request-ID": correlationId,
        },
      }
    );
  }

  // Generic error response
  const response = NextResponse.json(
    {
      error: isProduction ? "Internal server error" : error.message,
      code: "MIDDLEWARE_ERROR",
      correlationId,
      timestamp: new Date().toISOString(),
    },
    {
      status: 500,
      headers: {
        "X-Correlation-ID": correlationId,
        "X-Request-ID": correlationId,
      },
    }
  );

  return response;
}

/**
 * Main middleware function with production-grade error handling
 */
export async function middleware(request: NextRequest) {
  let correlationId = "";
  let startTime: number;
  let clientIp = "unknown";
  let userAgent = "unknown";
  let session: { user?: { id?: string } } | null = null;
  let context: any;

  try {
    startTime = Date.now();
    const { pathname } = request.nextUrl;

    // Skip middleware for static assets and certain paths
    if (
      pathname.startsWith("/_next/") ||
      pathname.startsWith("/api/health") ||
      pathname.includes(".") ||
      pathname === "/favicon.ico"
    ) {
      return NextResponse.next();
    }

    // Get client info safely
    try {
      clientIp = getClientIp(request);
      userAgent = request.headers.get("user-agent") || "unknown";
    } catch (error) {
      console.warn("Failed to get client info:", error);
    }

    // Create correlation context for request tracking
    if (SECURITY_CONFIG.ENABLE_CORRELATION_TRACKING) {
      context = correlationTracker.createContext(request, clientIp);
      correlationId = context.correlationId;
    } else {
      correlationId = `mw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Validate request format and content
    if (SECURITY_CONFIG.ENABLE_REQUEST_VALIDATION) {
      const validationResult = InputValidator.validateRequest(request);
      if (!validationResult.valid) {
        correlationTracker.logSecurityEvent(correlationId, {
          eventType: "validation_error",
          threatLevel: "high",
          blocked: true,
          reason: `Request validation failed: ${validationResult.errors.map(e => e.message).join(", ")}`,
          metadata: { errors: validationResult.errors },
        });

        return NextResponse.json(
          {
            error: "Invalid request format",
            code: "VALIDATION_ERROR",
            correlationId,
            errors: validationResult.errors,
          },
          {
            status: 400,
            headers: {
              "X-Correlation-ID": correlationId,
              "X-Request-ID": correlationId,
            },
          }
        );
      }
    }

    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    // Apply intelligent rate limiting
    const rateLimitRule = determineRateLimitRule(pathname, request.method);
    const rateLimitResult = await checkRateLimit(
      rateLimitRule,
      clientIp,
      correlationId
    );

    if (!rateLimitResult.allowed) {
      enterpriseLogger?.warn?.("Rate limit exceeded", {
        correlationId,
        clientIp,
        pathname,
        userAgent,
        rule: rateLimitRule,
      });

      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          code: "RATE_LIMIT_EXCEEDED",
          correlationId,
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
            "X-RateLimit-Limit": "100",
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": new Date(
              rateLimitResult.resetTime
            ).toISOString(),
            "X-Correlation-ID": correlationId,
            "X-Request-ID": correlationId,
          },
        }
      );
    }

    // Enhanced CSRF Protection
    if (csrfProtection.needsProtection(request)) {
      const csrfResult = await csrfProtection.validateToken(request, response);

      if (!csrfResult.valid) {
        correlationTracker.logSecurityEvent(correlationId, {
          eventType: "csrf_violation",
          threatLevel: "high",
          blocked: true,
          reason: csrfResult.reason || "CSRF token validation failed",
        });

        enterpriseLogger?.warn?.("CSRF token validation failed", {
          correlationId,
          clientIp,
          pathname,
          userAgent,
          method: request.method,
          reason: csrfResult.reason,
        });

        return NextResponse.json(
          {
            error: "CSRF token validation failed",
            code: "CSRF_ERROR",
            correlationId,
            reason: csrfResult.reason,
          },
          {
            status: 403,
            headers: {
              "X-Correlation-ID": correlationId,
              "X-Request-ID": correlationId,
            },
          }
        );
      }

      // Handle token rotation
      if (csrfResult.newToken) {
        response.headers.set("X-New-CSRF-Token", csrfResult.newToken);
      }
    } else {
      // Initialize CSRF protection for new sessions
      if (!request.cookies.get("csrf-token")) {
        await csrfProtection.initializeProtection(response);
      }
    }

    // Authentication check with proper error handling
    try {
      const supabase = createServerClient(
        process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
        process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!,
        {
          cookies: {
            get(name: string) {
              return request.cookies.get(name)?.value;
            },
            set(name: string, value: string, options: CookieOptions) {
              request.cookies.set({
                name,
                value,
                ...options,
              });
              response = NextResponse.next({
                request: {
                  headers: request.headers,
                },
              });
              response.cookies.set({
                name,
                value,
                ...options,
              });
            },
            remove(name: string, options: CookieOptions) {
              request.cookies.set({
                name,
                value: "",
                ...options,
              });
              response = NextResponse.next({
                request: {
                  headers: request.headers,
                },
              });
              response.cookies.set({
                name,
                value: "",
                ...options,
              });
            },
          },
        }
      );

      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();
      session = authSession;

      // Update correlation context with session info
      if (context && session) {
        correlationTracker.updateContext(correlationId, {
          sessionId: "session",
          userId: session.user?.id,
        });
      }

      // Public routes that don't require authentication
      const publicRoutes = [
        "/",
        "/auth/signin",
        "/auth/signup",
        "/auth/forgot-password",
        "/auth/reset-password",
        "/auth/callback",
        "/terms",
        "/privacy",
        "/api/auth/callback",
      ];

      // Check if the current route is public
      const isPublicRoute = publicRoutes.some(route =>
        pathname.startsWith(route)
      );

      // If user is not authenticated and trying to access a protected route
      if (!session && !isPublicRoute) {
        correlationTracker.logSecurityEvent(correlationId, {
          eventType: "auth_failure",
          threatLevel: "low",
          blocked: false,
          reason: "Unauthenticated access to protected route",
          metadata: { pathname, method: request.method },
        });

        enterpriseLogger?.info?.("Unauthenticated access to protected route", {
          correlationId,
          clientIp,
          pathname,
          userAgent,
        });

        const redirectUrl = new URL("/auth/signin", request.url);
        redirectUrl.searchParams.set("redirectTo", pathname);
        const redirectResponse = NextResponse.redirect(redirectUrl);

        // Apply security headers with correlation ID
        await securityHeaders.applyHeaders(redirectResponse, correlationId);
        return redirectResponse;
      }

      // If user is authenticated and trying to access auth pages, redirect to dashboard
      if (
        session &&
        pathname.startsWith("/auth/") &&
        pathname !== "/auth/callback"
      ) {
        enterpriseLogger?.debug?.(
          "Authenticated user redirected from auth page",
          {
            correlationId,
            pathname,
            userId: session.user?.id,
          }
        );

        const redirectResponse = NextResponse.redirect(
          new URL("/dashboard", request.url)
        );

        await securityHeaders.applyHeaders(redirectResponse, correlationId);
        return redirectResponse;
      }

      // If user is authenticated and on root path, redirect to dashboard
      if (session && pathname === "/") {
        enterpriseLogger?.debug?.(
          "Authenticated user redirected from root to dashboard",
          {
            correlationId,
            userId: session.user?.id,
          }
        );

        const redirectResponse = NextResponse.redirect(
          new URL("/dashboard", request.url)
        );

        await securityHeaders.applyHeaders(redirectResponse, correlationId);
        return redirectResponse;
      }
    } catch (authError) {
      // If authentication fails, continue but log the error
      console.error("Middleware auth error:", authError);

      correlationTracker.logSecurityEvent(correlationId, {
        eventType: "auth_failure",
        threatLevel: "medium",
        blocked: false,
        reason: "Authentication error in middleware",
        metadata: {
          error:
            authError instanceof Error ? authError.message : String(authError),
        },
      });

      enterpriseLogger?.error?.(
        "Authentication error in middleware",
        authError,
        {
          correlationId,
          pathname,
          method: request.method,
        }
      );
    }

    // Apply comprehensive security headers
    await securityHeaders.applyHeaders(response, correlationId);

    // Add performance and security metrics
    const processingTime = Date.now() - startTime!;
    response.headers.set("X-Response-Time", `${processingTime}ms`);
    response.headers.set("X-Correlation-ID", correlationId);
    response.headers.set("X-Request-ID", correlationId);

    // Update performance metrics
    if (context) {
      correlationTracker.updatePerformanceMetrics(correlationId, {
        endTime: Date.now(),
        duration: processingTime,
      });
    }

    // Log slow requests
    if (processingTime > 1000) {
      correlationTracker.logSecurityEvent(correlationId, {
        eventType: "suspicious_request",
        threatLevel: "low",
        blocked: false,
        reason: "Slow request processing",
        metadata: { processingTime },
      });

      enterpriseLogger?.warn?.("Slow middleware request", {
        correlationId,
        clientIp,
        pathname,
        userAgent,
        processingTime,
      });
    }

    // Check for anomalous behavior
    if (SECURITY_CONFIG.ENABLE_ANOMALY_DETECTION && context) {
      const anomaly = correlationTracker.detectAnomalies(correlationId);
      if (anomaly.isAnomalous) {
        correlationTracker.logSecurityEvent(correlationId, {
          eventType: "suspicious_request",
          threatLevel: anomaly.riskScore > 75 ? "high" : "medium",
          blocked: false,
          reason: `Anomalous behavior detected: ${anomaly.reasons.join(", ")}`,
          metadata: { riskScore: anomaly.riskScore, reasons: anomaly.reasons },
        });

        enterpriseLogger?.warn?.("Anomalous request detected", {
          correlationId,
          clientIp,
          pathname,
          riskScore: anomaly.riskScore,
          reasons: anomaly.reasons,
        });
      }
    }

    // Log successful processing
    if (session) {
      enterpriseLogger?.debug?.("Middleware processing successful", {
        correlationId,
        userId: session.user?.id,
        pathname,
        processingTime,
      });
    }

    return response;
  } catch (error) {
    // If middleware fails completely, handle gracefully
    console.error("Critical middleware error:", error);

    const fallbackCorrelationId =
      correlationId ||
      `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Log critical error
    if (correlationId) {
      correlationTracker.logSecurityEvent(correlationId, {
        eventType: "validation_error",
        threatLevel: "critical",
        blocked: false,
        reason: "Critical middleware failure",
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack:
            process.env.NODE_ENV !== "production"
              ? error instanceof Error
                ? error.stack
                : undefined
              : undefined,
        },
      });
    }

    enterpriseLogger?.error?.("Critical middleware failure", error, {
      correlationId: fallbackCorrelationId,
      pathname: request.nextUrl.pathname,
      method: request.method,
      clientIp,
      userAgent,
    });

    // Return error response or safe fallback
    if (error instanceof MiddlewareError) {
      return handleMiddlewareError(
        error,
        fallbackCorrelationId,
        request.nextUrl.pathname
      );
    }

    // Return a safe response that allows the application to continue
    const response = NextResponse.next();
    response.headers.set("X-Correlation-ID", fallbackCorrelationId);
    response.headers.set("X-Request-ID", fallbackCorrelationId);

    try {
      await securityHeaders.applyHeaders(response, fallbackCorrelationId);
    } catch (headerError) {
      console.error("Failed to apply security headers:", headerError);
      // Apply minimal headers as fallback
      response.headers.set("X-Content-Type-Options", "nosniff");
      response.headers.set("X-Frame-Options", "DENY");
    }

    return response;
  }
}

/**
 * Middleware configuration - match all routes except static assets
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
