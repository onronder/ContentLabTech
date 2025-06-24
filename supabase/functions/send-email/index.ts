/**
 * Supabase Edge Function: Email Sending with Resend Integration
 * Production-grade email infrastructure for ContentLab Nexus
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { render } from "https://esm.sh/@react-email/render@0.0.12";
import React from "https://esm.sh/react@18.2.0";

// Import React Email templates
import VerificationEmail from "../../../emails/VerificationEmail.tsx";
import WelcomeEmail from "../../../emails/WelcomeEmail.tsx";
import PasswordResetEmail from "../../../emails/PasswordResetEmail.tsx";

// Types
interface EmailRequest {
  to: string;
  template: "verification" | "welcome" | "password-reset" | "team-invitation";
  data: Record<string, unknown>;
  userId?: string;
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface ResendResponse {
  id: string;
  from: string;
  to: string[];
  created_at: string;
}

// Environment validation
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SECRET_KEY = Deno.env.get("SUPABASE_SECRET_KEY");
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "info@contentlabtech.com";

if (!RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY environment variable is required");
}

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  throw new Error("Supabase environment variables are required");
}

// Initialize Supabase client for logging
const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// React Email template rendering
function getEmailTemplate(
  template: string,
  data: Record<string, unknown>
): EmailTemplate {
  const baseUrl =
    Deno.env.get("NEXT_PUBLIC_APP_URL") || "https://contentlab-nexus.com";

  let subject: string;
  let component: React.ReactElement;

  switch (template) {
    case "verification":
      subject = "Verify your ContentLab Nexus account";
      component = React.createElement(VerificationEmail, {
        userName: data.name as string,
        verificationUrl: data.confirmationUrl as string,
      });
      break;

    case "welcome":
      subject = "Welcome to ContentLab Nexus! 🎉";
      component = React.createElement(WelcomeEmail, {
        userName: data.name as string,
        dashboardUrl: `${baseUrl}/dashboard`,
      });
      break;

    case "password-reset":
      subject = "Reset your ContentLab Nexus password";
      component = React.createElement(PasswordResetEmail, {
        userName: data.name as string,
        resetUrl: data.resetUrl as string,
      });
      break;

    default:
      throw new Error(`Unknown email template: ${template}`);
  }

  // Render React component to HTML
  const html = render(component);

  // Generate plain text version (simplified)
  const text = generatePlainText(template, data, baseUrl);

  return { subject, html, text };
}

// Generate plain text versions of emails
function generatePlainText(
  template: string,
  data: Record<string, unknown>,
  baseUrl: string
): string {
  switch (template) {
    case "verification":
      return `
Welcome to ContentLab Nexus!

Hello ${data.name || "there"},

Thank you for signing up for ContentLab Nexus. To complete your registration, please verify your email address by visiting this link:

${data.confirmationUrl}

This verification link will expire in 24 hours for your security.

Once verified, you'll have access to content analytics, team collaboration tools, and much more.

If you have any questions, contact us at ${EMAIL_FROM}

Best regards,
The ContentLab Nexus Team
      `.trim();

    case "welcome":
      return `
Welcome to ContentLab Nexus! 🎉

Hello ${data.name || "there"},

Congratulations! Your email has been verified and your ContentLab Nexus account is now fully activated.

Get started: ${baseUrl}/dashboard

What's next?
- 📊 Analytics: Track your content performance
- 👥 Teams: Collaborate with team members  
- ⚡ Integrations: Connect your favorite tools
- 🔧 Settings: Customize your workspace

Need help? Contact us at ${EMAIL_FROM}

Best regards,
The ContentLab Nexus Team
      `.trim();

    case "password-reset":
      return `
Reset Your Password - ContentLab Nexus

Hello ${data.name || "there"},

We received a request to reset your password. If you made this request, use this link to set a new password:

${data.resetUrl}

SECURITY INFORMATION:
- This link expires in 1 hour
- If you didn't request this, ignore this email
- Your current password remains unchanged
- This link can only be used once

Security concerns? Contact us at ${EMAIL_FROM}

The ContentLab Nexus Security Team
      `.trim();

    default:
      return "";
  }
}

// Rate limiting (simple in-memory store)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(
  identifier: string,
  limit = 5,
  windowMs = 60000
): boolean {
  const now = Date.now();
  const key = `email_${identifier}`;
  const existing = rateLimitStore.get(key);

  if (!existing || now > existing.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (existing.count >= limit) {
    return false;
  }

  existing.count++;
  return true;
}

// Email sending function
async function sendEmail(request: EmailRequest): Promise<ResendResponse> {
  const template = getEmailTemplate(request.template, request.data);

  const emailData = {
    from: EMAIL_FROM,
    to: [request.to],
    subject: template.subject,
    html: template.html,
    text: template.text,
  };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(emailData),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${response.status} - ${error}`);
  }

  return await response.json();
}

// Logging function
async function logEmailEvent(
  type: "sent" | "failed" | "rate_limited",
  details: Record<string, unknown>
) {
  try {
    await supabase.from("email_logs").insert({
      event_type: type,
      details,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to log email event:", error);
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

    // Parse request body
    let emailRequest: EmailRequest;
    try {
      emailRequest = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate request
    if (!emailRequest.to || !emailRequest.template || !emailRequest.data) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: to, template, data",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailRequest.to)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Rate limiting
    if (!checkRateLimit(emailRequest.to)) {
      await logEmailEvent("rate_limited", {
        to: emailRequest.to,
        template: emailRequest.template,
        user_id: emailRequest.userId,
      });

      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded. Please try again later.",
          retry_after: 60,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": "60",
          },
        }
      );
    }

    // Send email
    const result = await sendEmail(emailRequest);

    // Log successful send
    await logEmailEvent("sent", {
      to: emailRequest.to,
      template: emailRequest.template,
      user_id: emailRequest.userId,
      resend_id: result.id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent successfully",
        id: result.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Email sending error:", error);

    // Log failed send
    await logEmailEvent("failed", {
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        error: "Failed to send email",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
