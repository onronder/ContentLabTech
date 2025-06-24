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
  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SECRET_KEY")!;

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

export function requireAuth(user: AuthUser | null): Response | null {
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}
