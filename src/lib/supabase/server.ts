/**
 * Server-side Supabase Client with Secret Key
 * For administrative operations and Edge Functions
 * CRITICAL: Never expose secret key in client-side code
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Lazy-loaded Supabase admin client to avoid build-time env var requirements
let _supabaseAdmin: ReturnType<typeof createClient<Database>> | null = null;

function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    // Validate environment variables
    const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
    const supabaseSecretKey = process.env["SUPABASE_SECRET_KEY"];

    if (!supabaseUrl || !supabaseSecretKey) {
      throw new Error(
        "Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY"
      );
    }

    // Validate secret key format
    if (!supabaseSecretKey.startsWith("sb_secret_")) {
      throw new Error(
        "Invalid secret key format. Expected format: sb_secret_..."
      );
    }

    // Server-side Supabase client with secret key (administrative privileges)
    _supabaseAdmin = createClient<Database>(supabaseUrl, supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          "X-Client-Info": "contentlab-nexus-server",
        },
      },
    });
  }

  return _supabaseAdmin;
}

// Export for backward compatibility
export const supabaseAdmin = new Proxy(
  {} as ReturnType<typeof createClient<Database>>,
  {
    get(target, prop) {
      return getSupabaseAdmin()[prop as keyof typeof target];
    },
  }
);

// Helper function to validate server-side usage
export const validateServerSideUsage = () => {
  if (typeof window !== "undefined") {
    throw new Error(
      "SECURITY VIOLATION: Server-side Supabase client cannot be used in browser environment"
    );
  }
};

// Administrative functions using secret key
export const adminOperations = {
  // Create user with admin privileges
  createUser: async (userData: {
    email: string;
    password: string;
    user_metadata?: Record<string, unknown>;
  }) => {
    validateServerSideUsage();

    const { data, error } = await getSupabaseAdmin().auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      ...(userData.user_metadata && { user_metadata: userData.user_metadata }),
      email_confirm: true, // Auto-confirm email for admin-created users
    });

    return { data, error };
  },

  // Delete user with admin privileges
  deleteUser: async (userId: string) => {
    validateServerSideUsage();

    const { data, error } =
      await getSupabaseAdmin().auth.admin.deleteUser(userId);

    return { data, error };
  },

  // List all users (admin only)
  listUsers: async (page = 1, perPage = 50) => {
    validateServerSideUsage();

    const { data, error } = await getSupabaseAdmin().auth.admin.listUsers({
      page,
      perPage,
    });

    return { data, error };
  },

  // Update user metadata (admin only)
  updateUserMetadata: async (
    userId: string,
    metadata: Record<string, unknown>
  ) => {
    validateServerSideUsage();

    const { data, error } = await getSupabaseAdmin().auth.admin.updateUserById(
      userId,
      {
        user_metadata: metadata,
      }
    );

    return { data, error };
  },

  // Generate link for password reset (admin only)
  generateRecoveryLink: async (email: string) => {
    validateServerSideUsage();

    const { data, error } = await getSupabaseAdmin().auth.admin.generateLink({
      type: "recovery",
      email,
    });

    return { data, error };
  },

  // Generate signup link (admin only)
  generateSignupLink: async (email: string, password: string) => {
    validateServerSideUsage();

    const { data, error } = await getSupabaseAdmin().auth.admin.generateLink({
      type: "signup",
      email,
      password,
    });

    return { data, error };
  },

  // Generate magic link (admin only)
  generateMagicLink: async (email: string) => {
    validateServerSideUsage();

    const { data, error } = await getSupabaseAdmin().auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    return { data, error };
  },
};

// Team management functions using secret key
export const adminTeamOperations = {
  // Force create team with owner (bypasses RLS)
  forceCreateTeam: async (teamData: {
    name: string;
    description?: string;
    owner_id: string;
  }) => {
    validateServerSideUsage();

    const { data: team, error: teamError } = await getSupabaseAdmin()
      .from("teams")
      .insert({
        name: teamData.name,
        description: teamData.description,
        owner_id: teamData.owner_id,
      })
      .select()
      .single();

    if (teamError) return { data: null, error: teamError };

    // Add owner as team member
    const { error: memberError } = await getSupabaseAdmin()
      .from("team_members")
      .insert({
        team_id: team.id,
        user_id: teamData.owner_id,
        role: "owner",
      });

    if (memberError) {
      // Cleanup: delete team if member creation fails
      await getSupabaseAdmin().from("teams").delete().eq("id", team.id);
      return { data: null, error: memberError };
    }

    return { data: team, error: null };
  },

  // Force delete team (bypasses RLS)
  forceDeleteTeam: async (teamId: string) => {
    validateServerSideUsage();

    // Delete team members first
    await getSupabaseAdmin()
      .from("team_members")
      .delete()
      .eq("team_id", teamId);

    // Delete team
    const { data, error } = await getSupabaseAdmin()
      .from("teams")
      .delete()
      .eq("id", teamId)
      .select();

    return { data, error };
  },
};

// Audit logging using secret key
export const auditLogger = {
  log: async (action: string, details: Record<string, unknown>) => {
    validateServerSideUsage();

    const { error } = await getSupabaseAdmin().from("audit_logs").insert({
      action,
      details,
      timestamp: new Date().toISOString(),
    });

    if (error) {
      console.error("Failed to log audit event:", error);
    }
  },
};

export default supabaseAdmin;
export { getSupabaseAdmin };
