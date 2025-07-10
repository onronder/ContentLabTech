/**
 * Definitive Backend Authentication Wrapper
 * Surgical fix focused exclusively on backend session validation
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "./session";
import { createClient } from "./session";
import type { User } from "@supabase/supabase-js";

export interface AuthContext {
  user: User;
  supabase: any;
}

/**
 * Definitive authentication wrapper with comprehensive backend session validation
 */
export function withApiAuth<T extends any[]>(
  handler: (
    request: NextRequest,
    context: AuthContext,
    ...args: T
  ) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    const startTime = Date.now();

    console.log("🔐 Definitive Auth: Starting authentication", {
      method: request.method,
      url: request.url,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get("user-agent")?.substring(0, 50),
      origin: request.headers.get("origin"),
      referer: request.headers.get("referer"),
    });

    try {
      // Use session utilities for authentication
      const user = await getCurrentUser();
      const supabase = await createClient();

      console.log("🔍 Definitive Auth: Validation result", {
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
      });

      if (!user) {
        console.log("❌ Definitive Auth: Authentication failed", {
          method: request.method,
          url: request.url,
          validationError: validationResult.error,
          validationMethod: validationResult.method,
        });

        return NextResponse.json(
          {
            error: "Authentication required",
            code: "AUTHENTICATION_REQUIRED",
            status: 401,
            timestamp: new Date().toISOString(),
          },
          {
            status: 401,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }

      console.log("✅ Definitive Auth: Authentication successful", {
        userId: user.id,
        email: user.email,
        validationTime: Date.now() - startTime + "ms",
      });

      // Create auth context
      const context: AuthContext = {
        user,
        supabase,
      };

      // Call the authenticated handler
      console.log("🚀 Definitive Auth: Calling authenticated handler");
      const handlerStartTime = Date.now();
      const response = await handler(request, context, ...args);
      const handlerDuration = Date.now() - handlerStartTime;
      const totalDuration = Date.now() - startTime;

      console.log("✅ Definitive Auth: Handler completed successfully", {
        authDuration: handlerStartTime - startTime + "ms",
        handlerDuration: handlerDuration + "ms",
        totalDuration: totalDuration + "ms",
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
      console.error("❌ Definitive Auth: Critical authentication error", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        method: request.method,
        url: request.url,
        duration: Date.now() - startTime + "ms",
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
            duration: Date.now() - startTime + "ms",
            debugError: error instanceof Error ? error.message : String(error),
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
 * Team access validation (simplified for this context)
 */
export async function validateTeamAccess(
  supabase: any,
  userId: string,
  teamId: string,
  requiredRole?: "owner" | "admin" | "member"
): Promise<{ hasAccess: boolean; userRole?: string; error?: string }> {
  try {
    console.log("🏢 Definitive Auth: Team access check", {
      userId,
      teamId,
      requiredRole,
    });

    const { data: membership, error } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", userId)
      .single();

    if (error || !membership) {
      console.log("❌ Team access denied: No membership found", {
        error: error?.message,
      });
      return {
        hasAccess: false,
        error: "Team membership not found",
      };
    }

    if (!requiredRole) {
      return {
        hasAccess: true,
        userRole: membership.role,
      };
    }

    const roleHierarchy = {
      owner: 4,
      admin: 3,
      member: 2,
      viewer: 1,
    };

    const userLevel =
      roleHierarchy[membership.role as keyof typeof roleHierarchy] || 0;
    const requiredLevel =
      roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

    const hasAccess = userLevel >= requiredLevel;
    console.log("✅ Team access validated", {
      hasAccess,
      userRole: membership.role,
      requiredRole,
    });

    return {
      hasAccess,
      userRole: membership.role,
    };
  } catch (error) {
    console.error("Error validating team access:", error);
    return {
      hasAccess: false,
      error: "Failed to validate team access",
    };
  }
}
