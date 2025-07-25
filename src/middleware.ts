/**
 * Next.js Middleware for Route Protection & Security
 * Handles authentication, CSRF protection, rate limiting, and security headers
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { enterpriseLogger } from "./lib/monitoring/enterprise-logger";

// Rate limiting store (in-memory for development, use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Security configuration
const SECURITY_CONFIG = {
  // Rate limiting
  RATE_LIMIT_REQUESTS: parseInt(
    process.env["API_RATE_LIMIT_REQUESTS"] || "100"
  ),
  RATE_LIMIT_WINDOW:
    parseInt(process.env["API_RATE_LIMIT_WINDOW"] || "3600") * 1000, // Convert to milliseconds

  // CSRF protection
  CSRF_TOKEN_LENGTH: 32,

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

function getClientIp(request: NextRequest): string {
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

  // Fallback for development/localhost
  return "127.0.0.1";
}

function checkRateLimit(ip: string): boolean {
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
}

function generateCSRFToken(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < SECURITY_CONFIG.CSRF_TOKEN_LENGTH; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function validateCSRFToken(request: NextRequest): boolean {
  const method = request.method;

  // Only check CSRF for state-changing methods
  if (!["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    return true;
  }

  // Skip CSRF check for API auth callbacks and authenticated API routes
  if (request.nextUrl.pathname.startsWith("/auth/callback")) {
    return true;
  }

  // Skip CSRF for all API routes (they use production-grade authentication)
  if (request.nextUrl.pathname.startsWith("/api/")) {
    enterpriseLogger.debug(
      `CSRF skipped for API route: ${request.nextUrl.pathname}`,
      {
        pathname: request.nextUrl.pathname,
        method: request.method,
      }
    );
    return true;
  }

  const tokenFromHeader = request.headers.get("x-csrf-token");
  const tokenFromCookie = request.cookies.get("csrf-token")?.value;

  return tokenFromHeader === tokenFromCookie && !!tokenFromHeader;
}

function addSecurityHeaders(response: NextResponse): NextResponse {
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

  // Enhanced Permissions Policy - eliminates browser warnings
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

  return response;
}

export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  const clientIp = getClientIp(request);
  const userAgent = request.headers.get("user-agent") || "unknown";
  const { pathname } = request.nextUrl;

  // Apply rate limiting (except for static assets)
  if (!pathname.startsWith("/_next/") && !pathname.startsWith("/api/auth/")) {
    if (!checkRateLimit(clientIp)) {
      enterpriseLogger.warn("Rate limit exceeded", {
        clientIp,
        pathname,
        userAgent,
        rateLimitRequests: SECURITY_CONFIG.RATE_LIMIT_REQUESTS,
      });
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: {
          "Retry-After": "3600",
          "X-RateLimit-Limit": SECURITY_CONFIG.RATE_LIMIT_REQUESTS.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": new Date(
            Date.now() + SECURITY_CONFIG.RATE_LIMIT_WINDOW
          ).toISOString(),
        },
      });
    }
  }

  // CSRF Protection - disabled for auth pages to prevent blocking
  if (!pathname.startsWith("/auth/") && !validateCSRFToken(request)) {
    enterpriseLogger.warn("CSRF token validation failed", {
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

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Generate and set CSRF token for new sessions
  if (!request.cookies.get("csrf-token")) {
    const csrfToken = generateCSRFToken();
    response.cookies.set("csrf-token", csrfToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 24 hours
    });
  }

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
    data: { session },
  } = await supabase.auth.getSession();

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
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // If user is not authenticated and trying to access a protected route
  if (!session && !isPublicRoute) {
    enterpriseLogger.info("Unauthenticated access to protected route", {
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
    enterpriseLogger.debug("Authenticated user redirected from auth page", {
      pathname,
      userId: session.user?.id,
    });
    const redirectResponse = NextResponse.redirect(
      new URL("/dashboard", request.url)
    );
    return addSecurityHeaders(redirectResponse);
  }

  // If user is authenticated and on root path, redirect to dashboard
  if (session && pathname === "/") {
    enterpriseLogger.debug(
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

  // Add comprehensive security headers to all responses
  const secureResponse = addSecurityHeaders(response);

  // Add performance and security metrics
  const processingTime = Date.now() - startTime;
  secureResponse.headers.set("X-Response-Time", `${processingTime}ms`);

  // Log security events for monitoring
  if (processingTime > 1000) {
    enterpriseLogger.warn("Slow middleware request", {
      clientIp,
      pathname,
      userAgent,
      processingTime,
      isProduction: process.env.NODE_ENV === "production",
    });
  }

  // Log successful authentication events
  if (session) {
    enterpriseLogger.debug("Middleware authentication successful", {
      userId: session.user?.id,
      pathname,
      processingTime,
    });
  }

  return secureResponse;
}

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
