/**
 * Production-Grade API Authentication Wrapper - Version 2
 * Simplified approach using proven session utilities
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, createClient } from "./session";
import type { User } from "@supabase/supabase-js";
import { enterpriseLogger } from "@/lib/monitoring/enterprise-logger";
import { SimpleRateLimiter } from "@/lib/security/simple-rate-limiter";
import { validateInput } from "@/lib/security/validation";

export type AuthenticatedUser = User;

export interface AuthContext {
  user: AuthenticatedUser;
  supabase: Awaited<ReturnType<typeof createClient>>;
  requestId: string;
  ipAddress: string;
}

// Initialize rate limiter for authentication endpoints
const authRateLimiter = new SimpleRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per window per IP
  keyGenerator: req =>
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "unknown",
});

/**
 * Simple, reliable API authentication using existing session utilities
 */
export function withApiAuth<T extends any[]>(
  handler: (
    request: NextRequest,
    context: AuthContext,
    ...args: T
  ) => Promise<Response>,
  options: {
    requiresAuth?: boolean;
    rateLimitBypass?: boolean;
    logLevel?: "debug" | "info" | "warn" | "error";
  } = {}
) {
  const {
    requiresAuth = true,
    rateLimitBypass = false,
    logLevel = "info",
  } = options;

  return async (request: NextRequest, ...args: T): Promise<Response> => {
    const requestId = crypto.randomUUID();
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Performance optimization: only log detailed info in development or if explicitly requested
    const shouldLogDetails =
      process.env.NODE_ENV === "development" || logLevel === "debug";

    if (shouldLogDetails) {
      enterpriseLogger.info("Authentication request started", {
        requestId,
        method: request.method,
        url: request.url,
        ipAddress,
        userAgent: request.headers.get("user-agent")?.substring(0, 50),
      });
    }

    try {
      // Apply rate limiting (unless bypassed)
      if (!rateLimitBypass) {
        const rateLimitResult = await authRateLimiter.isAllowed(
          request,
          requestId
        );
        if (!rateLimitResult.allowed) {
          enterpriseLogger.warn("Authentication rate limit exceeded", {
            requestId,
            ipAddress,
            remaining: rateLimitResult.remaining,
            resetTime: rateLimitResult.resetTime,
          });

          return NextResponse.json(
            {
              error: "Too many authentication requests",
              code: "RATE_LIMIT_EXCEEDED",
              status: 429,
              requestId,
              retryAfter: Math.ceil(
                (rateLimitResult.resetTime - Date.now()) / 1000
              ),
            },
            {
              status: 429,
              headers: {
                "Content-Type": "application/json",
                "Retry-After": Math.ceil(
                  (rateLimitResult.resetTime - Date.now()) / 1000
                ).toString(),
                "X-RateLimit-Limit": rateLimitResult.limit.toString(),
                "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
                "X-RateLimit-Reset": new Date(
                  rateLimitResult.resetTime
                ).toISOString(),
              },
            }
          );
        }
      }

      let user = null;
      let supabase = null;

      // Try Bearer token authentication first
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7);

        // Validate token format
        if (!validateInput(token, "jwt")) {
          enterpriseLogger.warn("Invalid Bearer token format", {
            requestId,
            ipAddress,
          });
          return NextResponse.json(
            {
              error: "Invalid authentication token format",
              code: "INVALID_TOKEN_FORMAT",
              status: 401,
              requestId,
            },
            { status: 401 }
          );
        }

        if (shouldLogDetails) {
          enterpriseLogger.debug("Attempting Bearer token authentication", {
            requestId,
          });
        }

        try {
          // Create supabase client with the access token
          const { createClient } = await import("@/lib/supabase/server-auth");
          supabase = await createClient();

          // Set timeout for auth operations to prevent hanging
          const authTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Authentication timeout")), 10000)
          );

          const authPromise = supabase.auth.getUser(token);

          const {
            data: { user: bearerUser },
            error,
          } = await Promise.race([authPromise, authTimeout]);

          if (!error && bearerUser) {
            user = bearerUser;
            if (shouldLogDetails) {
              enterpriseLogger.info("Bearer token authentication successful", {
                requestId,
                userId: bearerUser.id,
              });
            }
          }
        } catch (bearerError) {
          enterpriseLogger.warn("Bearer token authentication failed", {
            requestId,
            error:
              bearerError instanceof Error
                ? bearerError.message
                : String(bearerError),
          });
        }
      }

      // Fallback to session-based authentication
      if (!user) {
        if (shouldLogDetails) {
          enterpriseLogger.debug("Attempting session-based authentication", {
            requestId,
          });
        }

        try {
          const sessionTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Session timeout")), 10000)
          );

          const sessionPromise = getCurrentUser();
          user = await Promise.race([sessionPromise, sessionTimeout]);

          if (user) {
            if (shouldLogDetails) {
              enterpriseLogger.info("Session-based authentication successful", {
                requestId,
                userId: user.id,
              });
            }
            // Create supabase client for session-based auth
            supabase = await createClient();
          }
        } catch (sessionError) {
          enterpriseLogger.warn("Session-based authentication failed", {
            requestId,
            error:
              sessionError instanceof Error
                ? sessionError.message
                : String(sessionError),
          });
        }
      }

      if (!user && requiresAuth) {
        enterpriseLogger.warn("Authentication required but no user found", {
          requestId,
          method: request.method,
          url: request.url,
          ipAddress,
          hasBearerToken: !!authHeader?.startsWith("Bearer "),
        });

        return NextResponse.json(
          {
            error: "Authentication required",
            code: "AUTHENTICATION_REQUIRED",
            status: 401,
            requestId,
            timestamp: new Date().toISOString(),
            details: {
              message: "Please log in to access this resource",
              authMethod: "session_or_bearer",
            },
          },
          {
            status: 401,
            headers: {
              "Content-Type": "application/json",
              "WWW-Authenticate": "Bearer",
              "X-Request-ID": requestId,
            },
          }
        );
      }

      if (user && shouldLogDetails) {
        enterpriseLogger.info("User authenticated successfully", {
          requestId,
          userId: user.id,
          email: user.email,
          method: request.method,
        });
      }

      // Supabase client should already be created above
      if (!supabase) {
        if (shouldLogDetails) {
          enterpriseLogger.debug("Creating fallback Supabase client", {
            requestId,
          });
        }
        supabase = await createClient();
      }

      // Create auth context
      const context: AuthContext = {
        user: user!,
        supabase,
        requestId,
        ipAddress,
      };

      // Call the handler with timeout protection
      if (shouldLogDetails) {
        enterpriseLogger.debug("Calling authenticated handler", { requestId });
      }

      const startTime = Date.now();
      const handlerTimeout = new Promise(
        (_, reject) =>
          setTimeout(() => reject(new Error("Handler timeout")), 30000) // 30 second timeout
      );

      const handlerPromise = handler(request, context, ...args);
      const response = await Promise.race([handlerPromise, handlerTimeout]);
      const duration = Date.now() - startTime;

      // Log performance metrics
      if (duration > 5000) {
        enterpriseLogger.warn("Slow API response detected", {
          requestId,
          duration,
          method: request.method,
          url: request.url,
        });
      } else if (shouldLogDetails) {
        enterpriseLogger.info("Handler completed successfully", {
          requestId,
          duration,
          status: response.status,
        });
      }

      // Ensure proper CORS and security headers
      const enhancedResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: new Headers(response.headers),
      });

      // Add security headers
      enhancedResponse.headers.set("Access-Control-Allow-Credentials", "true");
      enhancedResponse.headers.set("X-Request-ID", requestId);
      enhancedResponse.headers.set("X-Content-Type-Options", "nosniff");
      enhancedResponse.headers.set("X-Frame-Options", "DENY");
      enhancedResponse.headers.set("X-XSS-Protection", "1; mode=block");

      const origin = request.headers.get("origin");
      if (origin) {
        enhancedResponse.headers.set("Access-Control-Allow-Origin", origin);
      }

      return enhancedResponse;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const isTimeout = errorMessage.includes("timeout");
      const status = isTimeout ? 408 : 500;

      enterpriseLogger.error("Authentication system error", {
        requestId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        method: request.method,
        url: request.url,
        ipAddress,
        isTimeout,
      });

      return NextResponse.json(
        {
          error: isTimeout ? "Request timeout" : "Authentication system error",
          code: isTimeout ? "REQUEST_TIMEOUT" : "AUTH_SYSTEM_ERROR",
          status,
          requestId,
          timestamp: new Date().toISOString(),
          details: {
            message: isTimeout
              ? "The request took too long to process. Please try again."
              : "Internal authentication error occurred",
          },
        },
        {
          status,
          headers: {
            "Content-Type": "application/json",
            "X-Request-ID": requestId,
          },
        }
      );
    }
  };
}

/**
 * Create standardized success response with enhanced security headers
 */
export function createSuccessResponse(
  data: any,
  status = 200,
  meta?: any,
  requestId?: string
): Response {
  const successResponse = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    ...(meta && { meta }),
    ...(requestId && { requestId }),
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Credentials": "true",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
  };

  if (requestId) {
    headers["X-Request-ID"] = requestId;
  }

  return new Response(JSON.stringify(successResponse), {
    status,
    headers,
  });
}

/**
 * Team access validation helper using the auth context
 */
export async function validateTeamAccess(
  supabase: AuthContext["supabase"],
  userId: string,
  teamId: string,
  requiredRole?: "owner" | "admin" | "member",
  requestId?: string
): Promise<{ hasAccess: boolean; userRole?: string; error?: string }> {
  try {
    // Input validation
    if (!validateInput(userId, "uuid") || !validateInput(teamId, "uuid")) {
      enterpriseLogger.warn("Invalid team access validation inputs", {
        requestId,
        userId: !!userId,
        teamId: !!teamId,
      });
      return {
        hasAccess: false,
        error: "Invalid user or team identifier",
      };
    }

    enterpriseLogger.debug("Checking team access", {
      requestId,
      userId,
      teamId,
      requiredRole,
    });

    // Add timeout to prevent hanging database queries
    const queryTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database query timeout")), 10000)
    );

    const queryPromise = supabase
      .from("team_members")
      .select("role")
      .eq("user_id", userId)
      .eq("team_id", teamId)
      .single();

    const { data: membership, error } = await Promise.race([
      queryPromise,
      queryTimeout,
    ]);

    if (error) {
      enterpriseLogger.warn("Team access database error", {
        requestId,
        error: error.message,
        code: error.code,
        userId,
        teamId,
      });

      if (error.code === "PGRST116") {
        return {
          hasAccess: false,
          error: "User is not a member of this team",
        };
      }

      return {
        hasAccess: false,
        error: `Team access validation failed: ${error.message}`,
      };
    }

    if (!membership) {
      enterpriseLogger.info("No team membership found", {
        requestId,
        userId,
        teamId,
      });
      return {
        hasAccess: false,
        error: "User is not a member of this team",
      };
    }

    // Check role hierarchy if required
    if (requiredRole) {
      const roleHierarchy = { owner: 3, admin: 2, member: 1, viewer: 0 };
      const userLevel =
        roleHierarchy[membership.role as keyof typeof roleHierarchy] ?? 0;
      const requiredLevel = roleHierarchy[requiredRole];

      if (userLevel < requiredLevel) {
        enterpriseLogger.warn("Insufficient team role", {
          requestId,
          userRole: membership.role,
          requiredRole,
          userLevel,
          requiredLevel,
          userId,
          teamId,
        });
        return {
          hasAccess: false,
          userRole: membership.role,
          error: `Role '${requiredRole}' or higher required, user has '${membership.role}'`,
        };
      }
    }

    enterpriseLogger.info("Team access granted", {
      requestId,
      userId,
      teamId,
      userRole: membership.role,
    });

    return {
      hasAccess: true,
      userRole: membership.role,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isTimeout = errorMessage.includes("timeout");

    enterpriseLogger.error("Team access validation error", {
      requestId,
      error: errorMessage,
      isTimeout,
      userId,
      teamId,
    });

    return {
      hasAccess: false,
      error: isTimeout
        ? "Team access validation timed out. Please try again."
        : `Team access validation failed: ${errorMessage}`,
    };
  }
}
