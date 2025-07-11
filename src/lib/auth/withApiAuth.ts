/**
 * Enhanced API Authentication Wrapper
 * Complete rewrite for production-ready session authentication
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import type { Database } from "@/types/database";

export interface AuthenticatedUser {
  id: string;
  email: string;
  aud: string;
  role: string;
  created_at: string;
}

export interface AuthContext {
  user: AuthenticatedUser;
  supabase: ReturnType<typeof createServerClient<Database>>;
}

/**
 * Enhanced withApiAuth wrapper with comprehensive session validation
 */
export function withApiAuth<T extends any[]>(
  handler: (
    request: NextRequest,
    context: AuthContext,
    ...args: T
  ) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    console.log("🔐 withApiAuth: Starting authentication check", {
      method: request.method,
      url: request.url,
      timestamp: new Date().toISOString(),
    });

    try {
      // Get cookies with proper error handling
      const cookieStore = await cookies();
      const allCookies = cookieStore.getAll();
      const cookieCount = allCookies.length;

      // Find Supabase auth cookies specifically
      const authCookies = allCookies.filter(
        c =>
          c.name.includes("supabase") ||
          c.name.includes("sb-") ||
          c.name.includes("auth")
      );

      console.log("🍪 withApiAuth: Detailed cookie analysis", {
        totalCookies: cookieCount,
        hasCookies: cookieCount > 0,
        authCookiesCount: authCookies.length,
        authCookieNames: authCookies.map(c => c.name),
        allCookieNames: allCookies.map(c => c.name),
        // Show first few characters of auth cookie values for debugging
        authCookieValues: authCookies.map(c => ({
          name: c.name,
          hasValue: !!c.value,
          length: c.value?.length || 0,
          preview: c.value?.substring(0, 20) + "..." || "empty",
        })),
      });

      // Create Supabase client with server-side cookies
      const supabase = createServerClient<Database>(
        process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
        process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]!,
        {
          cookies: {
            get(name: string) {
              const cookie = cookieStore.get(name);
              console.log(
                `🍪 Cookie get: ${name} = ${cookie ? `present (${cookie.value?.length} chars)` : "missing"}`
              );
              if (cookie && name.includes("sb-")) {
                console.log(
                  `🔍 Supabase cookie ${name} preview:`,
                  cookie.value?.substring(0, 50) + "..."
                );
              }
              return cookie?.value;
            },
            set(name: string, value: string, options: any) {
              console.log(
                `🍪 Cookie set: ${name} (${options.httpOnly ? "httpOnly" : "client-accessible"})`
              );
              try {
                cookieStore.set({ name, value, ...options });
              } catch (error) {
                console.warn(`⚠️ Cookie set failed for ${name}:`, error);
              }
            },
            remove(name: string, options: any) {
              console.log(`🍪 Cookie remove: ${name}`);
              try {
                cookieStore.set({ name, value: "", ...options });
              } catch (error) {
                console.warn(`⚠️ Cookie remove failed for ${name}:`, error);
              }
            },
          },
        }
      );

      // Get session with detailed logging
      console.log("🔍 withApiAuth: Attempting to get session from Supabase");
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      console.log("🔍 withApiAuth: Session check result", {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        sessionError: sessionError?.message,
        expiresAt: session?.expires_at,
        tokenType: session?.token_type,
      });

      // Handle session errors
      if (sessionError) {
        console.error("❌ withApiAuth: Session validation error", {
          error: sessionError.message,
          code: sessionError.name,
        });

        return createErrorResponse(
          "Session validation failed",
          401,
          "SESSION_ERROR",
          {
            message: sessionError.message,
            authMethod: "session",
            timestamp: new Date().toISOString(),
          }
        );
      }

      // Check for valid session and user
      if (!session?.user) {
        console.log("❌ withApiAuth: No valid session found", {
          hasSession: !!session,
          hasUser: !!session?.user,
          authMethod: "session",
        });

        return createErrorResponse(
          "Authentication required",
          401,
          "AUTHENTICATION_REQUIRED",
          {
            message: "Please log in to access this resource",
            authMethod: "session",
            timestamp: new Date().toISOString(),
          }
        );
      }

      // Check session expiry
      if (session.expires_at && Date.now() / 1000 > session.expires_at) {
        console.log("❌ withApiAuth: Session expired", {
          expiresAt: session.expires_at,
          currentTime: Date.now() / 1000,
        });

        return createErrorResponse("Session expired", 401, "SESSION_EXPIRED", {
          message: "Your session has expired. Please log in again.",
          authMethod: "session",
          timestamp: new Date().toISOString(),
        });
      }

      console.log("✅ withApiAuth: Authentication successful", {
        userId: session.user.id,
        email: session.user.email,
        authMethod: "session",
        sessionValid: true,
      });

      // Create context for handler
      const context: AuthContext = {
        user: session.user as AuthenticatedUser,
        supabase,
      };

      // Call the handler with authenticated context
      const startTime = Date.now();
      const response = await handler(request, context, ...args);
      const duration = Date.now() - startTime;

      console.log("✅ withApiAuth: Handler completed successfully", {
        duration: `${duration}ms`,
        status: response.status,
        statusText: response.statusText,
      });

      // Ensure response has proper CORS headers for authentication
      const enhancedResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: new Headers(response.headers),
      });

      // Add authentication-related headers
      enhancedResponse.headers.set("Access-Control-Allow-Credentials", "true");

      const origin = request.headers.get("origin");
      if (origin) {
        enhancedResponse.headers.set("Access-Control-Allow-Origin", origin);
      }

      return enhancedResponse;
    } catch (error) {
      console.error("❌ withApiAuth: Unexpected authentication error", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });

      return createErrorResponse(
        "Authentication system error",
        500,
        "AUTH_SYSTEM_ERROR",
        {
          message: "Internal authentication error occurred",
          timestamp: new Date().toISOString(),
        }
      );
    }
  };
}

/**
 * Create standardized error response
 */
function createErrorResponse(
  message: string,
  status: number,
  code: string,
  details?: any
): Response {
  const errorResponse = {
    error: message,
    code,
    status,
    timestamp: new Date().toISOString(),
    ...(details && { details }),
  };

  console.log(`📤 withApiAuth: Error Response: ${status} ${code} - ${message}`);

  return new Response(JSON.stringify(errorResponse), {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Error-Code": code,
      "Access-Control-Allow-Credentials": "true",
    },
  });
}

/**
 * Create standardized success response
 */
export function createSuccessResponse(
  data: any,
  status = 200,
  meta?: any
): Response {
  const successResponse = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    ...(meta && { meta }),
  };

  return new Response(JSON.stringify(successResponse), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}

/**
 * Team access validation helper
 */
export async function validateTeamAccess(
  supabase: AuthContext["supabase"],
  userId: string,
  teamId: string,
  requiredRole?: "owner" | "admin" | "member"
): Promise<{ hasAccess: boolean; userRole?: string; error?: string }> {
  try {
    console.log("🏢 Validating team access", { userId, teamId, requiredRole });

    const { data: membership, error } = await supabase
      .from("team_members")
      .select("role")
      .eq("user_id", userId)
      .eq("team_id", teamId)
      .single();

    if (error || !membership) {
      console.log("❌ Team access denied: Not a member", {
        error: error?.message,
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
        console.log("❌ Team access denied: Insufficient role", {
          userRole: membership.role,
          requiredRole,
          userLevel,
          requiredLevel,
        });
        return {
          hasAccess: false,
          userRole: membership.role,
          error: `Role '${requiredRole}' or higher required, user has '${membership.role}'`,
        };
      }
    }

    console.log("✅ Team access granted", {
      userId,
      teamId,
      userRole: membership.role,
    });

    return {
      hasAccess: true,
      userRole: membership.role,
    };
  } catch (error) {
    console.error("❌ Team access validation error:", error);
    return {
      hasAccess: false,
      error: `Team access validation failed: ${error}`,
    };
  }
}
