/**
 * Simple API Authentication
 * Basic middleware that actually works
 */

import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Simple user type
 */
export interface SimpleUser {
  id: string;
  email: string;
}

/**
 * Simple auth result
 */
export interface SimpleAuthResult {
  user: SimpleUser | null;
  error: string | null;
}

/**
 * Get user from Bearer token
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<SimpleAuthResult> {
  console.log("🔐 Starting authentication flow...");

  const authHeader = request.headers.get("authorization");
  console.log("🔐 Authorization header:", authHeader ? "PRESENT" : "MISSING");

  if (!authHeader) {
    console.log("❌ No authorization header found");
    return { user: null, error: "No Bearer token provided" };
  }

  if (!authHeader.startsWith("Bearer ")) {
    console.log(
      "❌ Authorization header format invalid:",
      authHeader.substring(0, 20) + "..."
    );
    return { user: null, error: "No Bearer token provided" };
  }

  const token = authHeader.replace("Bearer ", "");
  console.log("🎫 Bearer token extracted:", token.substring(0, 10) + "...");

  try {
    console.log("🔄 Validating token with Supabase...");
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error) {
      console.log("❌ Supabase token validation error:", {
        code: error.code,
        message: error.message,
        name: error.name,
      });
      return { user: null, error: "Invalid token" };
    }

    if (!user) {
      console.log("❌ No user returned from token validation");
      return { user: null, error: "Invalid token" };
    }

    console.log("✅ Token validation successful");
    console.log("👤 User ID from token:", user.id);
    console.log("📧 User email from token:", user.email || "NO_EMAIL");

    return {
      user: {
        id: user.id,
        email: user.email || "",
      },
      error: null,
    };
  } catch (error) {
    console.log("❌ Authentication exception:", {
      error: error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : "No stack trace",
    });
    return { user: null, error: "Authentication failed" };
  }
}

/**
 * Simple API wrapper
 */
export function withSimpleAuth(
  handler: (request: NextRequest, user: SimpleUser) => Promise<Response>
) {
  return async (request: NextRequest): Promise<Response> => {
    console.log("🛡️ withSimpleAuth: Starting authentication wrapper...");

    const authResult = await authenticateRequest(request);

    if (!authResult.user) {
      console.log("❌ Authentication failed, returning 401");
      console.log("🔐 Auth error:", authResult.error);
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log("✅ Authentication successful, calling handler");
    console.log("👤 Authenticated user:", {
      id: authResult.user.id,
      email: authResult.user.email,
    });

    return handler(request, authResult.user);
  };
}
