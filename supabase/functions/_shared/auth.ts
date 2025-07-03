/**
 * Authentication utilities for Supabase Edge Functions
 * Handles JWT verification and user context
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthUser {
  id: string;
  email?: string;
  role?: string;
}

export async function getAuthUser(req: Request): Promise<AuthUser | null> {
  // Try Authorization header first (for user JWTs)
  const authHeader = req.headers.get("Authorization");

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");

    // Only process if it's a JWT (user token), not an API key
    // JWTs contain dots, new API keys start with 'sb_'
    if (token.includes(".") && !token.startsWith("sb_")) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SECRET_KEY")!;

        // Validate that we have proper secret key format
        if (!supabaseKey.startsWith("sb_secret_")) {
          console.error("Invalid secret key format for Edge Function");
          return null;
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const {
          data: { user },
          error,
        } = await supabase.auth.getUser(token);

        if (error || !user) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role,
        };
      } catch (error) {
        console.error("Auth error:", error);
        return null;
      }
    }
  }

  return null;
}

export function requireAuth(user: AuthUser | null): Response | null {
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}
