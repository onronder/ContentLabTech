/**
 * Production-Grade API Authentication Wrapper - Version 2
 * Simplified approach using proven session utilities
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, createClient } from "./session";
import type { User } from "@supabase/supabase-js";

export type AuthenticatedUser = User;

export interface AuthContext {
  user: AuthenticatedUser;
  supabase: Awaited<ReturnType<typeof createClient>>;
}

/**
 * Simple, reliable API authentication using existing session utilities
 */
export function withApiAuth<T extends any[]>(
  handler: (
    request: NextRequest,
    context: AuthContext,
    ...args: T
  ) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    console.log("🔐 withApiAuth v2: Starting authentication", {
      method: request.method,
      url: request.url,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get("user-agent")?.substring(0, 50),
    });

    try {
      let user = null;
      let supabase = null;

      // Try Bearer token authentication first
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        console.log(
          "🔍 withApiAuth v2: Attempting Bearer token authentication"
        );

        try {
          // Create supabase client with the access token
          const { createClient } = await import("@/lib/supabase/server-auth");
          supabase = await createClient();

          // Set the token on the client and get user
          const {
            data: { user: bearerUser },
            error,
          } = await supabase.auth.getUser(token);

          if (!error && bearerUser) {
            user = bearerUser;
            console.log(
              "✅ withApiAuth v2: Bearer token authentication successful"
            );
          }
        } catch (bearerError) {
          console.log(
            "❌ withApiAuth v2: Bearer token authentication failed:",
            bearerError
          );
        }
      }

      // Fallback to session-based authentication
      if (!user) {
        console.log(
          "🔍 withApiAuth v2: Attempting session-based authentication"
        );
        user = await getCurrentUser();

        if (user) {
          console.log(
            "✅ withApiAuth v2: Session-based authentication successful"
          );
          // Create supabase client for session-based auth
          supabase = await createClient();
        }
      }

      if (!user) {
        console.log("❌ withApiAuth v2: No authenticated user found", {
          method: request.method,
          url: request.url,
          hasBearerToken: !!authHeader?.startsWith("Bearer "),
        });

        return NextResponse.json(
          {
            error: "Authentication required",
            code: "AUTHENTICATION_REQUIRED",
            status: 401,
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
            },
          }
        );
      }

      console.log("✅ withApiAuth v2: User authenticated successfully", {
        userId: user.id,
        email: user.email,
        method: request.method,
        url: request.url,
      });

      // Supabase client should already be created above
      if (!supabase) {
        console.log("🔧 withApiAuth v2: Creating fallback Supabase client");
        supabase = await createClient();
      }

      // Create auth context
      const context: AuthContext = {
        user,
        supabase,
      };

      // Call the handler
      console.log("🚀 withApiAuth v2: Calling authenticated handler");
      const startTime = Date.now();
      const response = await handler(request, context, ...args);
      const duration = Date.now() - startTime;

      console.log("✅ withApiAuth v2: Handler completed successfully", {
        duration: `${duration}ms`,
        status: response.status,
        userId: user.id,
      });

      // Ensure proper CORS headers
      const enhancedResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: new Headers(response.headers),
      });

      enhancedResponse.headers.set("Access-Control-Allow-Credentials", "true");

      const origin = request.headers.get("origin");
      if (origin) {
        enhancedResponse.headers.set("Access-Control-Allow-Origin", origin);
      }

      return enhancedResponse;
    } catch (error) {
      console.error("❌ withApiAuth v2: Authentication error", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        method: request.method,
        url: request.url,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          error: "Authentication system error",
          code: "AUTH_SYSTEM_ERROR",
          status: 500,
          timestamp: new Date().toISOString(),
          details: {
            message: "Internal authentication error occurred",
          },
        },
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
  };
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
 * Team access validation helper using the auth context
 */
export async function validateTeamAccess(
  supabase: AuthContext["supabase"],
  userId: string,
  teamId: string,
  requiredRole?: "owner" | "admin" | "member"
): Promise<{ hasAccess: boolean; userRole?: string; error?: string }> {
  try {
    console.log("🏢 validateTeamAccess: Checking access", {
      userId,
      teamId,
      requiredRole,
    });

    const { data: membership, error } = await supabase
      .from("team_members")
      .select("role")
      .eq("user_id", userId)
      .eq("team_id", teamId)
      .single();

    if (error) {
      console.log("❌ validateTeamAccess: Database error", {
        error: error.message,
        code: error.code,
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
      console.log("❌ validateTeamAccess: No membership found");
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
        console.log("❌ validateTeamAccess: Insufficient role", {
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

    console.log("✅ validateTeamAccess: Access granted", {
      userId,
      teamId,
      userRole: membership.role,
    });

    return {
      hasAccess: true,
      userRole: membership.role,
    };
  } catch (error) {
    console.error("❌ validateTeamAccess: Unexpected error", error);
    return {
      hasAccess: false,
      error: `Team access validation failed: ${error}`,
    };
  }
}
