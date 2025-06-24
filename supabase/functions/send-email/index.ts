/**
 * Supabase Edge Function: Email Sending with Resend Integration
 * Production-grade email infrastructure for ContentLab Nexus
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Email templates
function getEmailTemplate(
  template: string,
  data: Record<string, unknown>
): EmailTemplate {
  const baseUrl =
    Deno.env.get("NEXT_PUBLIC_APP_URL") || "https://contentlab-nexus.com";

  switch (template) {
    case "verification":
      return {
        subject: "Verify your ContentLab Nexus account",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>Verify Your Email</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
                .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
                .content { padding: 30px 0; }
                .button { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; text-decoration: none; border-radius: 8px; font-weight: 500; margin: 20px 0; }
                .footer { border-top: 1px solid #eee; padding-top: 20px; font-size: 14px; color: #666; }
                .security-note { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="logo">ContentLab Nexus</div>
                </div>
                
                <div class="content">
                  <h1>Welcome to ContentLab Nexus!</h1>
                  <p>Hello ${data.name || "there"},</p>
                  <p>Thank you for signing up for ContentLab Nexus. To complete your registration and secure your account, please verify your email address by clicking the button below:</p>
                  
                  <div style="text-align: center;">
                    <a href="${data.confirmationUrl}" class="button">Verify Email Address</a>
                  </div>
                  
                  <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                  <p style="word-break: break-all; color: #2563eb;">${data.confirmationUrl}</p>
                  
                  <div class="security-note">
                    <strong>Security Note:</strong> This verification link will expire in 24 hours for your security. If you didn't create an account with ContentLab Nexus, you can safely ignore this email.
                  </div>
                  
                  <p>Once verified, you'll have access to:</p>
                  <ul>
                    <li>Content analytics and performance tracking</li>
                    <li>Team collaboration tools</li>
                    <li>Advanced content management features</li>
                    <li>Custom integrations and API access</li>
                  </ul>
                  
                  <p>Welcome aboard!</p>
                </div>
                
                <div class="footer">
                  <p>Best regards,<br>The ContentLab Nexus Team</p>
                  <p>If you have any questions, contact us at <a href="mailto:${EMAIL_FROM}">${EMAIL_FROM}</a></p>
                  <p><em>This is an automated message. Please do not reply to this email.</em></p>
                </div>
              </div>
            </body>
          </html>
        `,
        text: `
Welcome to ContentLab Nexus!

Hello ${data.name || "there"},

Thank you for signing up for ContentLab Nexus. To complete your registration, please verify your email address by visiting this link:

${data.confirmationUrl}

This verification link will expire in 24 hours for your security.

Once verified, you'll have access to content analytics, team collaboration tools, and much more.

If you have any questions, contact us at ${EMAIL_FROM}

Best regards,
The ContentLab Nexus Team
        `.trim(),
      };

    case "welcome":
      return {
        subject: "Welcome to ContentLab Nexus! 🎉",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>Welcome to ContentLab Nexus</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { text-align: center; padding: 20px 0; }
                .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
                .celebration { font-size: 48px; text-align: center; margin: 20px 0; }
                .content { padding: 20px 0; }
                .button { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; text-decoration: none; border-radius: 8px; font-weight: 500; margin: 20px 0; }
                .feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 30px 0; }
                .feature { padding: 20px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #2563eb; }
                .footer { border-top: 1px solid #eee; padding-top: 20px; font-size: 14px; color: #666; }
                @media (max-width: 600px) { .feature-grid { grid-template-columns: 1fr; } }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="logo">ContentLab Nexus</div>
                  <div class="celebration">🎉</div>
                </div>
                
                <div class="content">
                  <h1>Your account is ready!</h1>
                  <p>Hello ${data.name || "there"},</p>
                  <p>Congratulations! Your email has been verified and your ContentLab Nexus account is now fully activated.</p>
                  
                  <div style="text-align: center;">
                    <a href="${baseUrl}/dashboard" class="button">Go to Dashboard</a>
                  </div>
                  
                  <h2>What's next?</h2>
                  <div class="feature-grid">
                    <div class="feature">
                      <h3>📊 Analytics</h3>
                      <p>Track your content performance with detailed insights and metrics.</p>
                    </div>
                    <div class="feature">
                      <h3>👥 Teams</h3>
                      <p>Invite team members and collaborate on projects together.</p>
                    </div>
                    <div class="feature">
                      <h3>⚡ Integrations</h3>
                      <p>Connect your favorite tools and automate your workflow.</p>
                    </div>
                    <div class="feature">
                      <h3>🔧 Settings</h3>
                      <p>Customize your workspace and notification preferences.</p>
                    </div>
                  </div>
                  
                  <p>Need help getting started? Check out our <a href="${baseUrl}/docs" style="color: #2563eb;">documentation</a> or reach out to our support team.</p>
                </div>
                
                <div class="footer">
                  <p>Best regards,<br>The ContentLab Nexus Team</p>
                  <p>Questions? Contact us at <a href="mailto:${EMAIL_FROM}">${EMAIL_FROM}</a></p>
                </div>
              </div>
            </body>
          </html>
        `,
        text: `
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
        `.trim(),
      };

    case "password-reset":
      return {
        subject: "Reset your ContentLab Nexus password",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>Reset Your Password</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
                .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
                .content { padding: 30px 0; }
                .button { display: inline-block; padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 8px; font-weight: 500; margin: 20px 0; }
                .security-alert { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; margin: 20px 0; }
                .footer { border-top: 1px solid #eee; padding-top: 20px; font-size: 14px; color: #666; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="logo">ContentLab Nexus</div>
                </div>
                
                <div class="content">
                  <h1>Reset Your Password</h1>
                  <p>Hello ${data.name || "there"},</p>
                  <p>We received a request to reset the password for your ContentLab Nexus account. If you made this request, click the button below to set a new password:</p>
                  
                  <div style="text-align: center;">
                    <a href="${data.resetUrl}" class="button">Reset Password</a>
                  </div>
                  
                  <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                  <p style="word-break: break-all; color: #dc2626;">${data.resetUrl}</p>
                  
                  <div class="security-alert">
                    <strong>🔒 Security Information:</strong>
                    <ul>
                      <li>This password reset link will expire in 1 hour</li>
                      <li>If you didn't request this reset, you can safely ignore this email</li>
                      <li>Your password will remain unchanged until you create a new one</li>
                      <li>For security, this link can only be used once</li>
                    </ul>
                  </div>
                  
                  <p>If you continue to have problems or didn't request this reset, please contact our support team immediately.</p>
                </div>
                
                <div class="footer">
                  <p>Best regards,<br>The ContentLab Nexus Security Team</p>
                  <p>Security concerns? Contact us at <a href="mailto:${EMAIL_FROM}">${EMAIL_FROM}</a></p>
                  <p><em>This is an automated security message.</em></p>
                </div>
              </div>
            </body>
          </html>
        `,
        text: `
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
        `.trim(),
      };

    default:
      throw new Error(`Unknown email template: ${template}`);
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
