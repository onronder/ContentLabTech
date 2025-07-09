/**
 * Simple Authentication Helper
 * Basic working authentication without complexity
 */

import { supabase } from "@/lib/supabase/client";

/**
 * Get current session with access token
 * Returns null if not authenticated
 */
export async function getAuthSession() {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      return null;
    }

    return session;
  } catch (error) {
    console.error("Failed to get session:", error);
    return null;
  }
}

/**
 * Get authentication headers for API calls
 * Returns empty object if not authenticated
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const session = await getAuthSession();

  if (!session?.access_token) {
    return {};
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  };
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getAuthSession();
  return !!session?.access_token;
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  const session = await getAuthSession();
  return session?.user || null;
}
