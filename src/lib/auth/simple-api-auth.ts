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
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return { user: null, error: "No Bearer token provided" };
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return { user: null, error: "Invalid token" };
    }

    return {
      user: {
        id: user.id,
        email: user.email || "",
      },
      error: null,
    };
  } catch (error) {
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
    const authResult = await authenticateRequest(request);

    if (!authResult.user) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return handler(request, authResult.user);
  };
}
