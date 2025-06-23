/**
 * Admin Operations Edge Function
 * Uses new Supabase secret key system for administrative tasks
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Environment validation
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseSecretKey = Deno.env.get("SUPABASE_SECRET_KEY");

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error("Missing required environment variables");
}

if (!supabaseSecretKey.startsWith("sb_secret_")) {
  throw new Error("Invalid secret key format");
}

// Create admin client with secret key
const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface AdminRequest {
  action: "create_user" | "delete_user" | "update_user" | "list_users";
  payload?: Record<string, unknown>;
}

Deno.serve(async req => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authenticate request using JWT token (not API key)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");

    // Verify user token using publishable key client
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Invalid authentication token");
    }

    // Check if user has admin privileges
    const { data: adminUser, error: adminCheckError } = await supabaseAdmin
      .from("admin_users")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (adminCheckError || !adminUser) {
      throw new Error("Insufficient privileges");
    }

    // Parse request body
    const requestData: AdminRequest = await req.json();

    let result;

    switch (requestData.action) {
      case "create_user":
        result = await supabaseAdmin.auth.admin.createUser({
          email: requestData.payload.email,
          password: requestData.payload.password,
          user_metadata: requestData.payload.metadata,
          email_confirm: true,
        });
        break;

      case "delete_user":
        result = await supabaseAdmin.auth.admin.deleteUser(
          requestData.payload.userId
        );
        break;

      case "update_user":
        result = await supabaseAdmin.auth.admin.updateUserById(
          requestData.payload.userId,
          {
            user_metadata: requestData.payload.metadata,
          }
        );
        break;

      case "list_users":
        result = await supabaseAdmin.auth.admin.listUsers({
          page: requestData.payload?.page || 1,
          perPage: requestData.payload?.perPage || 50,
        });
        break;

      default:
        throw new Error("Invalid action");
    }

    // Log admin action for audit
    await supabaseAdmin.from("audit_logs").insert({
      action: requestData.action,
      performed_by: user.id,
      details: requestData.payload,
      timestamp: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ success: true, data: result.data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Admin operation error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
      }),
      {
        status: error.message.includes("Invalid") ? 401 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
