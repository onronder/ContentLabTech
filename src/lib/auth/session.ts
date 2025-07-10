/**
 * Authentication Session Management
 * Server-side authentication utilities for API routes
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Create server-side Supabase client with user session
 */
export async function createClient() {
  console.log("🔍 createClient: Starting client creation");

  // Environment variables debug
  console.log("🔍 Environment Check:", {
    SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    NODE_ENV: process.env.NODE_ENV,
    URL_VALUE: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + "...",
  });

  try {
    const cookieStore = await cookies();
    console.log("🔍 createClient: Cookie store obtained", {
      available: !!cookieStore,
    });

    const client = createServerClient<Database>(
      process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
      process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]!,
      {
        cookies: {
          get(name: string) {
            const value = cookieStore.get(name)?.value;
            if (name.includes("supabase")) {
              console.log("🔍 createClient: Getting Supabase cookie", {
                name,
                hasValue: !!value,
                valueLength: value?.length || 0,
              });
            }
            return value;
          },
          set(name: string, value: string, options: CookieOptions) {
            if (name.includes("supabase")) {
              console.log("🔍 createClient: Setting Supabase cookie", {
                name,
                valueLength: value.length,
                options,
              });
            }
            try {
              cookieStore.set({ name, value, ...options });
            } catch (error) {
              console.error("❌ createClient: Cookie setting error", {
                name,
                error,
              });
              // The `set` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
          remove(name: string, options: CookieOptions) {
            if (name.includes("supabase")) {
              console.log("🔍 createClient: Removing Supabase cookie", {
                name,
              });
            }
            try {
              cookieStore.set({ name, value: "", ...options });
            } catch (error) {
              console.error("❌ createClient: Cookie removal error", {
                name,
                error,
              });
              // The `delete` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    console.log("✅ createClient: Client created successfully");
    return client;
  } catch (exception) {
    console.error("💥 createClient: Exception caught", {
      error: exception instanceof Error ? exception.message : exception,
      stack: exception instanceof Error ? exception.stack : undefined,
    });
    throw exception;
  }
}

/**
 * Get the current authenticated user from the session
 */
export async function getCurrentUser() {
  console.log("🔍 getCurrentUser: Starting session retrieval");

  try {
    console.log("🔍 getCurrentUser: Creating Supabase client...");
    const supabase = await createClient();
    console.log("🔍 getCurrentUser: Supabase client created", {
      client: !!supabase,
    });

    console.log("🔍 getCurrentUser: Calling supabase.auth.getUser()...");
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    console.log("🔍 getCurrentUser: Auth getUser result", {
      user: user
        ? {
            id: user.id,
            email: user.email,
            aud: user.aud,
            role: user.role,
            email_confirmed_at: user.email_confirmed_at,
            last_sign_in_at: user.last_sign_in_at,
          }
        : null,
      error: error
        ? {
            message: error.message,
            status: error.status,
            code: error.code,
          }
        : null,
    });

    if (error) {
      console.error("❌ getCurrentUser: Auth error", {
        message: error.message,
        status: error.status,
        code: error.code,
        details: error,
      });
      return null;
    }

    if (!user) {
      console.log("⚠️ getCurrentUser: No user found in session");
      return null;
    }

    console.log("✅ getCurrentUser: User retrieved successfully", {
      id: user.id,
      email: user.email,
      hasSession: true,
    });
    return user;
  } catch (exception) {
    console.error("💥 getCurrentUser: Exception caught", {
      error: exception instanceof Error ? exception.message : exception,
      stack: exception instanceof Error ? exception.stack : undefined,
      type: typeof exception,
    });
    return null;
  }
}

/**
 * Get the current user's session
 */
export async function getCurrentSession() {
  console.log("🔍 getCurrentSession: Starting session retrieval");

  try {
    const supabase = await createClient();
    console.log("🔍 getCurrentSession: Supabase client created");

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    console.log("🔍 getCurrentSession: Session result", {
      session: session
        ? {
            access_token: session.access_token ? "present" : "missing",
            refresh_token: session.refresh_token ? "present" : "missing",
            expires_at: session.expires_at,
            expires_in: session.expires_in,
            user: session.user
              ? { id: session.user.id, email: session.user.email }
              : null,
          }
        : null,
      error: error ? error.message : null,
    });

    if (error) {
      console.error("❌ getCurrentSession: Session error", error);
      return null;
    }

    if (session) {
      console.log("✅ getCurrentSession: Session retrieved successfully");
    } else {
      console.log("⚠️ getCurrentSession: No active session found");
    }

    return session;
  } catch (error) {
    console.error("💥 getCurrentSession: Exception caught", error);
    return null;
  }
}

/**
 * Validate that user is authenticated and return user data
 */
export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  return user;
}

/**
 * Get user's team memberships
 */
export async function getUserTeams(userId?: string) {
  try {
    const supabase = await createClient();
    const user = userId ? { id: userId } : await getCurrentUser();

    if (!user) {
      return [];
    }

    const { data: teams, error } = await supabase
      .from("team_members")
      .select(
        `
        role,
        team:teams (
          id,
          name,
          description,
          owner_id,
          created_at,
          updated_at
        )
      `
      )
      .eq("user_id", user.id);

    if (error) {
      console.error("Error getting user teams:", error);
      return [];
    }

    return teams.map(t => ({
      ...t.team,
      user_role: t.role,
    }));
  } catch (error) {
    console.error("Failed to get user teams:", error);
    return [];
  }
}

/**
 * Check if user has access to a specific team
 */
export async function validateTeamAccess(
  teamId: string,
  requiredRole?: string
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return false;
    }

    const supabase = await createClient();
    const { data: membership, error } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (error || !membership) {
      return false;
    }

    // If no specific role required, just check membership
    if (!requiredRole) {
      return true;
    }

    // Role hierarchy: owner > admin > member > viewer
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

    return userLevel >= requiredLevel;
  } catch (error) {
    console.error("Failed to validate team access:", error);
    return false;
  }
}

/**
 * Check if user has access to a specific project
 */
export async function validateProjectAccess(
  projectId: string,
  requiredRole?: string
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return false;
    }

    const supabase = await createClient();

    // Get project's team
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("team_id")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return false;
    }

    // Validate team access
    return validateTeamAccess(project.team_id, requiredRole);
  } catch (error) {
    console.error("Failed to validate project access:", error);
    return false;
  }
}

/**
 * Get user profile with teams
 */
export async function getUserProfile() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return null;
    }

    const teams = await getUserTeams(user.id);

    return {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
      created_at: user.created_at,
      teams,
    };
  } catch (error) {
    console.error("Failed to get user profile:", error);
    return null;
  }
}

/**
 * Validate API request authentication
 */
export async function validateApiAuth() {
  try {
    // Try to get user from session
    const user = await getCurrentUser();

    if (!user) {
      return {
        success: false,
        error: "Authentication required",
        status: 401,
      };
    }

    return {
      success: true,
      user,
    };
  } catch {
    return {
      success: false,
      error: "Authentication failed",
      status: 401,
    };
  }
}

/**
 * Helper to create standardized API responses
 */
export function createApiResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * Helper to create error responses
 */
export function createErrorResponse(
  message: string,
  status = 400,
  details?: Record<string, unknown>
): Response {
  return new Response(
    JSON.stringify({
      error: message,
      ...(details && { details }),
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}
