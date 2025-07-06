/**
 * Supabase Auth Webhook Handler
 * Automatically triggers email flows based on auth events
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Types
interface AuthEvent {
  type: "user.created" | "user.confirmed" | "user.password_reset_requested";
  data: {
    id: string;
    email: string;
    name?: string;
    confirmation_token?: string;
    recovery_token?: string;
    created_at: string;
    confirmed_at?: string;
  };
}

interface EmailPayload {
  to: string;
  template: "verification" | "welcome" | "password-reset";
  data: Record<string, unknown>;
  userId?: string;
}

// Environment validation
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SECRET_KEY = Deno.env.get("SUPABASE_SECRET_KEY");
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET");
const APP_URL =
  Deno.env.get("NEXT_PUBLIC_APP_URL") || "https://contentlab-nexus.com";

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  throw new Error("Supabase environment variables are required");
}

if (!WEBHOOK_SECRET) {
  throw new Error("WEBHOOK_SECRET environment variable is required");
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Verify webhook signature
function verifyWebhookSignature(
  payload: string,
  signature: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _secret: string
): boolean {
  try {
    // In a real implementation, you'd use crypto.subtle.importKey and verify HMAC
    // For now, we'll do a simple comparison (in production, use proper HMAC verification)
    const expectedSignature = `sha256=${signature}`;
    return signature === expectedSignature;
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return false;
  }
}

// Send email via Edge Function
async function sendEmail(payload: EmailPayload): Promise<void> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SECRET_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Email sending failed: ${response.status} - ${error}`);
  }
}

// Get user profile data
async function getUserProfile(userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .single();

  return profile;
}

// Process auth events
async function processAuthEvent(event: AuthEvent): Promise<void> {
  console.warn(
    `Processing auth event: ${event.type} for user ${event.data.id}`
  );

  switch (event.type) {
    case "user.created":
      // Send verification email (handled by Supabase Auth automatically)
      // This webhook can be used for additional welcome flows or analytics
      console.warn(`New user created: ${event.data.email}`);

      // Log user creation event
      await supabase.from("user_events").insert({
        user_id: event.data.id,
        event_type: "user_created",
        event_data: {
          email: event.data.email,
          created_at: event.data.created_at,
        },
        timestamp: new Date().toISOString(),
      });
      break;

    case "user.confirmed":
      // Send welcome email after email verification
      const profile = await getUserProfile(event.data.id);
      const userName = profile?.full_name || event.data.name || "there";

      await sendEmail({
        to: event.data.email,
        template: "welcome",
        data: {
          name: userName,
          dashboardUrl: `${APP_URL}/dashboard`,
        },
        userId: event.data.id,
      });

      // Log email verification event
      await supabase.from("user_events").insert({
        user_id: event.data.id,
        event_type: "email_verified",
        event_data: {
          email: event.data.email,
          confirmed_at: event.data.confirmed_at,
        },
        timestamp: new Date().toISOString(),
      });
      break;

    case "user.password_reset_requested":
      // Send password reset email
      const userProfile = await getUserProfile(event.data.id);
      const resetUserName =
        userProfile?.full_name || event.data.name || "there";

      await sendEmail({
        to: event.data.email,
        template: "password-reset",
        data: {
          name: resetUserName,
          resetUrl: `${APP_URL}/auth/reset-password?token=${event.data.recovery_token}`,
        },
        userId: event.data.id,
      });

      // Log password reset request
      await supabase.from("user_events").insert({
        user_id: event.data.id,
        event_type: "password_reset_requested",
        event_data: {
          email: event.data.email,
          token: event.data.recovery_token,
        },
        timestamp: new Date().toISOString(),
      });
      break;

    default:
      console.warn(`Unhandled auth event type: ${event.type}`);
  }
}

// Main handler
serve(async req => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get webhook signature
    const signature = req.headers.get("x-webhook-signature");
    if (!signature) {
      return new Response(
        JSON.stringify({ error: "Missing webhook signature" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get request body
    const body = await req.text();

    // Verify webhook signature
    if (!verifyWebhookSignature(body, signature, WEBHOOK_SECRET)) {
      return new Response(
        JSON.stringify({ error: "Invalid webhook signature" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse webhook payload
    let authEvent: AuthEvent;
    try {
      authEvent = JSON.parse(body);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate required fields
    if (
      !authEvent.type ||
      !authEvent.data ||
      !authEvent.data.id ||
      !authEvent.data.email
    ) {
      return new Response(
        JSON.stringify({ error: "Missing required fields in webhook payload" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Process the auth event
    await processAuthEvent(authEvent);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Auth event processed successfully",
        event_type: authEvent.type,
        user_id: authEvent.data.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Auth webhook error:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to process auth event",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
