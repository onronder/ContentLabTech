/**
 * Environment Variable Helper for Supabase
 * Handles the inconsistency between SUPABASE_SECRET_KEY and SUPABASE_SERVICE_ROLE_KEY
 */

/**
 * Get the Supabase service role key from environment
 * Checks both SUPABASE_SERVICE_ROLE_KEY and SUPABASE_SECRET_KEY for compatibility
 */
export function getSupabaseServiceRoleKey(): string {
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "Supabase service role key is required. " +
        "Please set either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY environment variable."
    );
  }

  return serviceRoleKey;
}

/**
 * Get all required Supabase environment variables
 */
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required");
  }

  if (!anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is required");
  }

  return {
    url,
    anonKey,
    serviceRoleKey,
  };
}
