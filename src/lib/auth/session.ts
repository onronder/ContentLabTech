/**
 * Authentication Session Management
 * Server-side authentication utilities for API routes
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

/**
 * Create server-side Supabase client with user session
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

/**
 * Get the current authenticated user from the session
 */
export async function getCurrentUser() {
  try {
    const supabase = createClient();
    
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error('Error getting current user:', error);
      return null;
    }

    return user;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}

/**
 * Get the current user's session
 */
export async function getCurrentSession() {
  try {
    const supabase = createClient();
    
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error('Error getting current session:', error);
      return null;
    }

    return session;
  } catch (error) {
    console.error('Failed to get current session:', error);
    return null;
  }
}

/**
 * Validate that user is authenticated and return user data
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('Authentication required');
  }
  
  return user;
}

/**
 * Get user's team memberships
 */
export async function getUserTeams(userId?: string) {
  try {
    const supabase = createClient();
    const user = userId ? { id: userId } : await getCurrentUser();
    
    if (!user) {
      return [];
    }

    const { data: teams, error } = await supabase
      .from('team_members')
      .select(`
        role,
        team:teams (
          id,
          name,
          description,
          owner_id,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error getting user teams:', error);
      return [];
    }

    return teams.map(t => ({
      ...t.team,
      user_role: t.role,
    }));
  } catch (error) {
    console.error('Failed to get user teams:', error);
    return [];
  }
}

/**
 * Check if user has access to a specific team
 */
export async function validateTeamAccess(teamId: string, requiredRole?: string) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return false;
    }

    const supabase = createClient();
    const { data: membership, error } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
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
      'owner': 4,
      'admin': 3,
      'member': 2,
      'viewer': 1,
    };

    const userLevel = roleHierarchy[membership.role as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

    return userLevel >= requiredLevel;
  } catch (error) {
    console.error('Failed to validate team access:', error);
    return false;
  }
}

/**
 * Check if user has access to a specific project
 */
export async function validateProjectAccess(projectId: string, requiredRole?: string) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return false;
    }

    const supabase = createClient();
    
    // Get project's team
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('team_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return false;
    }

    // Validate team access
    return validateTeamAccess(project.team_id, requiredRole);
  } catch (error) {
    console.error('Failed to validate project access:', error);
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
    console.error('Failed to get user profile:', error);
    return null;
  }
}

/**
 * Validate API request authentication
 */
export async function validateApiAuth(request: Request) {
  try {
    // Try to get user from session
    const user = await getCurrentUser();
    
    if (!user) {
      return {
        success: false,
        error: 'Authentication required',
        status: 401,
      };
    }

    return {
      success: true,
      user,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Authentication failed',
      status: 401,
    };
  }
}

/**
 * Helper to create standardized API responses
 */
export function createApiResponse<T>(
  data: T,
  status: number = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Helper to create error responses
 */
export function createErrorResponse(
  message: string,
  status: number = 400,
  details?: any
): Response {
  return new Response(
    JSON.stringify({
      error: message,
      ...(details && { details }),
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}