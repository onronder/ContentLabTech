/**
 * Authentication Session Management
 * Server-side authentication utilities for API routes
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { createClient as createServerAuthClient } from "@/lib/supabase/server-auth";

/**
 * Create server-side Supabase client with user session
 * @deprecated Use createServerAuthClient from @/lib/supabase/server-auth instead
 */
export async function createClient() {
  console.log("🔍 createClient: Starting client creation");

  // Environment variables debug
  console.log("🔍 Environment Check:", {
    SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    NODE_ENV: process.env.NODE_ENV,
    URL_VALUE: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + "...",
  });

  try {
    const cookieStore = await cookies();
    console.log("🔍 createClient: Cookie store obtained", {
      available: !!cookieStore,
    });

    // Get all cookies for debugging
    const allCookies = cookieStore.getAll();
    const supabaseCookies = allCookies.filter(cookie =>
      cookie.name.includes("supabase")
    );

    console.log("🔍 createClient: All Supabase cookies found", {
      count: supabaseCookies.length,
      cookies: supabaseCookies.map(c => ({
        name: c.name,
        hasValue: !!c.value,
        valueLength: c.value?.length || 0,
        valueStart: c.value?.substring(0, 20) + "...",
      })),
    });

    const client = createServerClient<Database>(
      process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
      process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!,
      {
        cookies: {
          get(name: string) {
            const cookie = cookieStore.get(name);
            const value = cookie?.value;
            if (name.includes("supabase")) {
              console.log("🍪 createClient: Getting Supabase cookie", {
                name,
                hasValue: !!value,
                valueLength: value?.length || 0,
                cookieFound: !!cookie,
              });
            }
            return value;
          },
          set(name: string, value: string, options: CookieOptions) {
            if (name.includes("supabase")) {
              enterpriseLogger.debug("Setting Supabase cookie", {
                name,
                valueLength: value.length,
                options: {
                  ...options,
                  httpOnly: options.httpOnly ?? true,
                  secure:
                    options.secure ?? process.env.NODE_ENV === "production",
                  sameSite: options.sameSite ?? "lax",
                  path: options.path ?? "/",
                },
              });
            }
            try {
              cookieStore.set({
                name,
                value,
                ...options,
                httpOnly: options.httpOnly ?? true,
                secure: options.secure ?? process.env.NODE_ENV === "production",
                sameSite: options.sameSite ?? "lax",
                path: options.path ?? "/",
              });
            } catch (error) {
              console.error("❌ createClient: Cookie setting error", {
                name,
                error: error instanceof Error ? error.message : error,
              });
            }
          },
          remove(name: string, options: CookieOptions) {
            if (name.includes("supabase")) {
              console.log("🍪 createClient: Removing Supabase cookie", {
                name,
                options,
              });
            }
            try {
              cookieStore.set({
                name,
                value: "",
                ...options,
                expires: new Date(0),
                maxAge: 0,
              });
            } catch (error) {
              console.error("❌ createClient: Cookie removal error", {
                name,
                error: error instanceof Error ? error.message : error,
              });
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
 * Enhanced with production-grade cookie debugging
 */
export async function getCurrentUser() {
  console.log("🔍 getCurrentUser: Starting session retrieval");

  // Enhanced cookie debugging
  try {
    // First, let's check what cookies we can access
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const supabaseCookies = allCookies.filter(
      cookie =>
        cookie.name.includes("sb-") ||
        cookie.name.includes("supabase") ||
        cookie.name.includes("auth-token")
    );

    console.log("🍪 getCurrentUser: Cookie Analysis", {
      totalCookies: allCookies.length,
      supabaseCookiesFound: supabaseCookies.length,
      cookieNames: allCookies.map(c => c.name),
      supabaseCookieDetails: supabaseCookies.map(c => ({
        name: c.name,
        hasValue: !!c.value,
        valueLength: c.value.length,
        valueStart: c.value.substring(0, 30) + "...",
      })),
    });

    // Check if we have any authentication-related cookies
    if (supabaseCookies.length === 0) {
      console.warn(
        "⚠️ getCurrentUser: No Supabase authentication cookies found"
      );
      console.log(
        "🔍 Available cookies:",
        allCookies.map(c => c.name)
      );
    }

    console.log("🔍 getCurrentUser: Creating Supabase client...");
    // Use the new server auth client
    const supabase = await createServerAuthClient();
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
        cookieContext: {
          totalCookies: allCookies.length,
          supabaseCookies: supabaseCookies.length,
          hasCookies: allCookies.length > 0,
        },
      });
      return null;
    }

    if (!user) {
      console.log("⚠️ getCurrentUser: No user found in session", {
        cookieContext: {
          totalCookies: allCookies.length,
          supabaseCookies: supabaseCookies.length,
          hasCookies: allCookies.length > 0,
          cookieNames: allCookies.map(c => c.name),
        },
      });
      return null;
    }

    console.log("✅ getCurrentUser: User retrieved successfully", {
      id: user.id,
      email: user.email,
      hasSession: true,
      cookieContext: {
        supabaseCookies: supabaseCookies.length,
        totalCookies: allCookies.length,
      },
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
    // Use the new server auth client
    const supabase = await createServerAuthClient();
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
    // Use the new server auth client
    const supabase = await createServerAuthClient();
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

    // Use the new server auth client
    const supabase = await createServerAuthClient();
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

    // Use the new server auth client
    const supabase = await createServerAuthClient();

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
