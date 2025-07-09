/**
 * Production-Grade API Authentication Middleware
 * Consistent authentication handling across all API routes
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentUser } from "./session";

// Service role client for token validation
const supabaseServiceRole = createClient(
  process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
  process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export interface AuthenticatedUser {
  id: string;
  email: string;
  aud: string;
  role: string;
  created_at: string;
}

export interface AuthResult {
  user: AuthenticatedUser | null;
  error: string | null;
  method: "bearer" | "session" | "none";
}

/**
 * Production-grade authentication that tries multiple methods
 */
export async function authenticateApiRequest(
  request: NextRequest
): Promise<AuthResult> {
  console.log("🔐 API Authentication starting...");

  // Method 1: Bearer Token (Preferred for API calls)
  const authHeader = request.headers.get("authorization");
  console.log("🔍 Auth header analysis:", {
    hasAuthHeader: !!authHeader,
    startsWithBearer: authHeader?.startsWith("Bearer "),
    headerValue: authHeader ? `${authHeader.substring(0, 20)}...` : null
  });
  
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    console.log(`🎫 Validating Bearer token (${token.substring(0, 20)}...)`);

    try {
      const {
        data: { user },
        error,
      } = await supabaseServiceRole.auth.getUser(token);

      console.log("🔍 Bearer token validation result:", {
        hasUser: !!user,
        hasError: !!error,
        errorMessage: error?.message,
        userId: user?.id
      });

      if (!error && user) {
        console.log(`✅ Bearer auth successful: ${user.id}`);
        return {
          user: user as AuthenticatedUser,
          error: null,
          method: "bearer",
        };
      } else {
        console.log(
          `❌ Bearer token invalid: ${error?.message || "Unknown error"}`
        );
      }
    } catch (error) {
      console.log(`💥 Bearer token error: ${error}`);
    }
  } else {
    console.log("❌ No valid Bearer token in Authorization header");
  }

  // Method 2: Session-based Authentication (Fallback)
  console.log("🍪 Trying session authentication...");
  try {
    const user = await getCurrentUser();
    console.log("🔍 Session auth result:", {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email
    });
    
    if (user) {
      console.log(`✅ Session auth successful: ${user.id}`);
      return {
        user: user as AuthenticatedUser,
        error: null,
        method: "session",
      };
    } else {
      console.log("❌ No user found in session");
    }
  } catch (error) {
    console.log(`💥 Session auth error: ${error}`);
  }

  // Authentication failed
  console.log("🚫 All authentication methods failed");
  return {
    user: null,
    error: "Authentication required",
    method: "none",
  };
}

/**
 * Middleware wrapper for authenticated API routes
 */
export function withApiAuth<T extends any[]>(
  handler: (
    request: NextRequest,
    user: AuthenticatedUser,
    ...args: T
  ) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    const authResult = await authenticateApiRequest(request);

    if (!authResult.user) {
      console.log("🚫 API access denied - authentication failed");
      return createApiErrorResponse(
        "Authentication required",
        401,
        "AUTHENTICATION_REQUIRED",
        {
          message: "Please log in to access this resource",
          authMethod: authResult.method,
        }
      );
    }

    console.log(
      `✅ API access granted via ${authResult.method} for user ${authResult.user.id}`
    );

    try {
      return await handler(request, authResult.user, ...args);
    } catch (error) {
      console.error("💥 API handler error:", error);
      return createApiErrorResponse(
        "Internal server error",
        500,
        "INTERNAL_ERROR",
        {
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        }
      );
    }
  };
}

/**
 * Team access validation
 */
export async function validateTeamAccess(
  userId: string,
  teamId: string,
  requiredRole?: "owner" | "admin" | "member"
): Promise<{ hasAccess: boolean; userRole?: string; error?: string }> {
  try {
    const { data: membership, error } = await supabaseServiceRole
      .from("team_members")
      .select("role")
      .eq("user_id", userId)
      .eq("team_id", teamId)
      .single();

    if (error || !membership) {
      return {
        hasAccess: false,
        error: "User is not a member of this team",
      };
    }

    // Check role hierarchy if required
    if (requiredRole) {
      const roleHierarchy = { owner: 3, admin: 2, member: 1 };
      const userLevel =
        roleHierarchy[membership.role as keyof typeof roleHierarchy] || 0;
      const requiredLevel = roleHierarchy[requiredRole];

      if (userLevel < requiredLevel) {
        return {
          hasAccess: false,
          userRole: membership.role,
          error: `Role '${requiredRole}' or higher required, user has '${membership.role}'`,
        };
      }
    }

    return {
      hasAccess: true,
      userRole: membership.role,
    };
  } catch (error) {
    console.error("Team access validation error:", error);
    return {
      hasAccess: false,
      error: `Team access validation failed: ${error}`,
    };
  }
}

/**
 * Standardized API error response
 */
export function createApiErrorResponse(
  message: string,
  status: number,
  code = "API_ERROR",
  details?: any
): Response {
  const errorResponse = {
    error: message,
    code,
    status,
    timestamp: new Date().toISOString(),
    ...(details && { details }),
  };

  console.log(`📤 API Error Response: ${status} ${code} - ${message}`);

  return new Response(JSON.stringify(errorResponse), {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Error-Code": code,
    },
  });
}

/**
 * Standardized API success response
 */
export function createApiSuccessResponse(
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
    headers: { "Content-Type": "application/json" },
  });
}
