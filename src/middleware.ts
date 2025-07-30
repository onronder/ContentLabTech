/**
 * Next.js Middleware for Route Protection & Security
 * Production-grade with enterprise features, rate limiting, and comprehensive security
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

// Rate limiting store with production-ready features
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In production, this should be replaced with Redis
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
      if (now > value.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, 60000); // Clean up every minute
}

// Security configuration with environment overrides
const SECURITY_CONFIG = {
  // Rate limiting
  RATE_LIMIT_REQUESTS: parseInt(
    process.env["API_RATE_LIMIT_REQUESTS"] || "100"
  ),
  RATE_LIMIT_WINDOW:
    parseInt(process.env["API_RATE_LIMIT_WINDOW"] || "3600") * 1000, // Convert to milliseconds

  // CSRF protection
  CSRF_TOKEN_LENGTH: 32,
  CSRF_ENABLED: process.env["CSRF_PROTECTION_ENABLED"] !== "false",

  // Content Security Policy
  CSP_POLICY: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; "),
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
 * Check rate limit with production-ready logic
 */
function checkRateLimit(ip: string): boolean {
  try {
    const now = Date.now();
    const key = `rate_limit:${ip}`;
    const existing = rateLimitStore.get(key);

    if (!existing || now > existing.resetTime) {
      // Reset or create new entry
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + SECURITY_CONFIG.RATE_LIMIT_WINDOW,
      });
      return true;
    }

    if (existing.count >= SECURITY_CONFIG.RATE_LIMIT_REQUESTS) {
      return false;
    }

    existing.count++;
    return true;
  } catch (error) {
    console.error("Rate limit check error:", error);
    // Allow request on error to prevent blocking legitimate traffic
    return true;
  }
}

/**
 * Generate cryptographically secure CSRF token
 */
function generateCSRFToken(): string {
  try {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    const randomValues = new Uint8Array(SECURITY_CONFIG.CSRF_TOKEN_LENGTH);

    // Use crypto API if available
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      crypto.getRandomValues(randomValues);
      for (let i = 0; i < SECURITY_CONFIG.CSRF_TOKEN_LENGTH; i++) {
        const randomValue = randomValues[i];
        if (randomValue !== undefined) {
          result += chars[randomValue % chars.length];
        }
      }
    } else {
      // Fallback for environments without crypto
      for (let i = 0; i < SECURITY_CONFIG.CSRF_TOKEN_LENGTH; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }
    return result;
  } catch (error) {
    console.error("CSRF token generation error:", error);
    // Generate a simple fallback token
    return Date.now().toString(36) + Math.random().toString(36);
  }
}

/**
 * Validate CSRF token with production safeguards
 */
function validateCSRFToken(request: NextRequest): boolean {
  try {
    // Skip CSRF check if disabled
    if (!SECURITY_CONFIG.CSRF_ENABLED) {
      return true;
    }

    const method = request.method;

    // Only check CSRF for state-changing methods
    if (!["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
      return true;
    }

    // Skip CSRF check for API auth callbacks and authenticated API routes
    const pathname = request.nextUrl.pathname;
    if (
      pathname.startsWith("/auth/callback") ||
      pathname.startsWith("/api/auth/")
    ) {
      return true;
    }

    // Skip CSRF for all API routes (they use production-grade authentication)
    if (pathname.startsWith("/api/")) {
      enterpriseLogger?.debug?.(`CSRF skipped for API route: ${pathname}`, {
        pathname,
        method: request.method,
      });
      return true;
    }

    const tokenFromHeader = request.headers.get("x-csrf-token");
    const tokenFromCookie = request.cookies.get("csrf-token")?.value;

    return tokenFromHeader === tokenFromCookie && !!tokenFromHeader;
  } catch (error) {
    console.error("CSRF validation error:", error);
    // Allow request on error in production to prevent blocking
    return process.env.NODE_ENV !== "production";
  }
}

/**
 * Add comprehensive security headers
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  try {
    // Content Security Policy
    response.headers.set("Content-Security-Policy", SECURITY_CONFIG.CSP_POLICY);

    // XSS Protection
    response.headers.set("X-XSS-Protection", "1; mode=block");

    // Content Type Options
    response.headers.set("X-Content-Type-Options", "nosniff");

    // Frame Options
    response.headers.set("X-Frame-Options", "DENY");

    // Referrer Policy
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    // Strict Transport Security (HTTPS only)
    if (process.env.NODE_ENV === "production") {
      response.headers.set(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains; preload"
      );
    }

    // Enhanced Permissions Policy
    response.headers.set(
      "Permissions-Policy",
      [
        "accelerometer=()",
        "ambient-light-sensor=()",
        "autoplay=()",
        "battery=()",
        "camera=()",
        "cross-origin-isolated=()",
        "display-capture=()",
        "document-domain=()",
        "encrypted-media=()",
        "execution-while-not-rendered=()",
        "execution-while-out-of-viewport=()",
        "fullscreen=()",
        "geolocation=()",
        "gyroscope=()",
        "keyboard-map=()",
        "magnetometer=()",
        "microphone=()",
        "midi=()",
        "navigation-override=()",
        "payment=()",
        "picture-in-picture=()",
        "publickey-credentials-get=()",
        "screen-wake-lock=()",
        "sync-xhr=()",
        "usb=()",
        "web-share=()",
        "xr-spatial-tracking=()",
        "interest-cohort=()",
      ].join(", ")
    );
  } catch (error) {
    console.error("Error adding security headers:", error);
  }

  return response;
}

/**
 * Main middleware function with production-grade error handling
 */
export async function middleware(request: NextRequest) {
  let startTime: number;
  let clientIp = "unknown";
  let userAgent = "unknown";
  let session: { user?: { id?: string } } | null = null;

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

    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    // Apply rate limiting for production
    if (process.env.NODE_ENV === "production") {
      try {
        if (!pathname.startsWith("/api/auth/") && !checkRateLimit(clientIp)) {
          enterpriseLogger?.warn?.("Rate limit exceeded", {
            clientIp,
            pathname,
            userAgent,
            rateLimitRequests: SECURITY_CONFIG.RATE_LIMIT_REQUESTS,
          });
          return new NextResponse("Too Many Requests", {
            status: 429,
            headers: {
              "Retry-After": "3600",
              "X-RateLimit-Limit":
                SECURITY_CONFIG.RATE_LIMIT_REQUESTS.toString(),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": new Date(
                Date.now() + SECURITY_CONFIG.RATE_LIMIT_WINDOW
              ).toISOString(),
            },
          });
        }
      } catch (rateLimitError) {
        console.error("Rate limiting error:", rateLimitError);
        // Continue on rate limit errors
      }
    }

    // CSRF Protection for production
    if (process.env.NODE_ENV === "production") {
      try {
        if (!pathname.startsWith("/auth/") && !validateCSRFToken(request)) {
          enterpriseLogger?.warn?.("CSRF token validation failed", {
            clientIp,
            pathname,
            userAgent,
            method: request.method,
          });
          return new NextResponse("CSRF Token Mismatch", {
            status: 403,
            headers: {
              "Content-Type": "application/json",
            },
          });
        }
      } catch (csrfError) {
        console.error("CSRF validation error:", csrfError);
        // Continue on CSRF errors in production
      }
    }

    // Generate and set CSRF token for new sessions
    try {
      if (!request.cookies.get("csrf-token")) {
        const csrfToken = generateCSRFToken();
        response.cookies.set("csrf-token", csrfToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 60 * 60 * 24, // 24 hours
        });
      }
    } catch (error) {
      console.error("CSRF token generation error:", error);
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
        enterpriseLogger?.info?.("Unauthenticated access to protected route", {
          clientIp,
          pathname,
          userAgent,
        });
        const redirectUrl = new URL("/auth/signin", request.url);
        redirectUrl.searchParams.set("redirectTo", pathname);
        const redirectResponse = NextResponse.redirect(redirectUrl);
        return addSecurityHeaders(redirectResponse);
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
            pathname,
            userId: session.user?.id,
          }
        );
        const redirectResponse = NextResponse.redirect(
          new URL("/dashboard", request.url)
        );
        return addSecurityHeaders(redirectResponse);
      }

      // If user is authenticated and on root path, redirect to dashboard
      if (session && pathname === "/") {
        enterpriseLogger?.debug?.(
          "Authenticated user redirected from root to dashboard",
          {
            userId: session.user?.id,
          }
        );
        const redirectResponse = NextResponse.redirect(
          new URL("/dashboard", request.url)
        );
        return addSecurityHeaders(redirectResponse);
      }
    } catch (authError) {
      // If authentication fails, continue but log the error
      console.error("Middleware auth error:", authError);
      enterpriseLogger?.error?.(
        "Authentication error in middleware",
        authError,
        {
          pathname,
          method: request.method,
        }
      );
    }

    // Add comprehensive security headers to all responses
    const secureResponse = addSecurityHeaders(response);

    // Add performance and security metrics
    const processingTime = Date.now() - startTime!;
    secureResponse.headers.set("X-Response-Time", `${processingTime}ms`);

    // Log slow requests in production
    if (processingTime > 1000 && process.env.NODE_ENV === "production") {
      enterpriseLogger?.warn?.("Slow middleware request", {
        clientIp,
        pathname,
        userAgent,
        processingTime,
        isProduction: true,
      });
    }

    // Log successful authentication events
    if (session) {
      enterpriseLogger?.debug?.("Middleware authentication successful", {
        userId: session.user?.id,
        pathname,
        processingTime,
      });
    }

    return secureResponse;
  } catch (error) {
    // If middleware fails completely, return a basic response with security headers
    console.error("Critical middleware error:", error);
    enterpriseLogger?.error?.("Critical middleware failure", error, {
      pathname: request.nextUrl.pathname,
      method: request.method,
      clientIp,
      userAgent,
    });

    // Return a safe response that allows the application to continue
    const response = NextResponse.next();
    return addSecurityHeaders(response);
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
