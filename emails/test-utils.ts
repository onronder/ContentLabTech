/**
 * Email Testing Utilities
 * Helper functions for testing email templates and sending
 */

import { render } from "@react-email/render";
import React from "react";
import VerificationEmail from "./VerificationEmail";
import WelcomeEmail from "./WelcomeEmail";
import PasswordResetEmail from "./PasswordResetEmail";

// Types
export interface EmailTestData {
  userName?: string;
  verificationUrl?: string;
  dashboardUrl?: string;
  resetUrl?: string;
}

export interface EmailTestResult {
  template: string;
  subject: string;
  html: string;
  text: string;
  size: {
    html: number;
    text: number;
  };
  renderTime: number;
}

// Email template configurations
const templateConfigs = {
  verification: {
    subject: "Verify your ContentLab Nexus account",
    component: VerificationEmail,
    defaultData: {
      userName: "Test User",
      verificationUrl:
        "https://contentlab-nexus.com/auth/verify?token=test-token",
    },
  },
  welcome: {
    subject: "Welcome to ContentLab Nexus! 🎉",
    component: WelcomeEmail,
    defaultData: {
      userName: "Test User",
      dashboardUrl: "https://contentlab-nexus.com/dashboard",
    },
  },
  "password-reset": {
    subject: "Reset your ContentLab Nexus password",
    component: PasswordResetEmail,
    defaultData: {
      userName: "Test User",
      resetUrl:
        "https://contentlab-nexus.com/auth/reset-password?token=test-reset-token",
    },
  },
};

// Render email template for testing
export async function renderEmailTemplate(
  templateName: keyof typeof templateConfigs,
  data?: EmailTestData
): Promise<EmailTestResult> {
  const startTime = performance.now();

  const config = templateConfigs[templateName];
  if (!config) {
    throw new Error(`Unknown email template: ${templateName}`);
  }

  // Merge default data with provided data
  const templateData = { ...config.defaultData, ...data };

  // Create React element with proper typing
  const element = React.createElement(
    config.component as unknown as React.ComponentType<Record<string, unknown>>,
    templateData
  );

  // Render to HTML
  const html = await render(element);

  // Generate simple text version
  const text = generateTextVersion(templateName, templateData);

  const endTime = performance.now();
  const renderTime = endTime - startTime;

  return {
    template: templateName,
    subject: config.subject,
    html,
    text,
    size: {
      html: new Blob([html]).size,
      text: new Blob([text]).size,
    },
    renderTime,
  };
}

// Generate text version of emails
function generateTextVersion(
  templateName: string,
  data: Record<string, unknown>
): string {
  switch (templateName) {
    case "verification":
      return `
Welcome to ContentLab Nexus!

Hello ${data["userName"] || "there"},

Thank you for signing up for ContentLab Nexus. To complete your registration, please verify your email address by visiting this link:

${data["verificationUrl"]}

This verification link will expire in 24 hours for your security.

Once verified, you'll have access to:
• Content analytics and performance tracking
• Team collaboration tools
• Advanced content management features
• Custom integrations and API access

Welcome aboard!

Best regards,
The ContentLab Nexus Team

If you have any questions, contact us at info@contentlabtech.com
      `.trim();

    case "welcome":
      return `
Welcome to ContentLab Nexus! 🎉

Hello ${data["userName"] || "there"},

Congratulations! Your email has been verified and your ContentLab Nexus account is now fully activated.

Get started: ${data["dashboardUrl"]}

What's next?
• 📊 Analytics: Track your content performance
• 👥 Teams: Collaborate with team members
• ⚡ Integrations: Connect your favorite tools
• 🔧 Settings: Customize your workspace

Need help getting started? Check out our documentation or reach out to our support team.

We're excited to see what you'll create with ContentLab Nexus!

Best regards,
The ContentLab Nexus Team
      `.trim();

    case "password-reset":
      return `
Password Reset Request - ContentLab Nexus

Hello ${data["userName"] || "there"},

We received a request to reset your ContentLab Nexus password. If you made this request, click the link below to create a new password:

${data["resetUrl"]}

SECURITY INFORMATION:
• This password reset link will expire in 1 hour for your security
• If you didn't request a password reset, please ignore this email
• Your password will remain unchanged until you create a new one

PASSWORD SECURITY TIPS:
• Use at least 12 characters with mixed case letters
• Include numbers and special characters
• Avoid using personal information or common words
• Consider using a password manager

If you continue to have problems, please contact our support team.

Best regards,
The ContentLab Nexus Team
      `.trim();

    default:
      return "";
  }
}

// Test all email templates
export async function testAllTemplates(
  data?: EmailTestData
): Promise<EmailTestResult[]> {
  const templates = Object.keys(templateConfigs) as Array<
    keyof typeof templateConfigs
  >;
  const results = await Promise.all(
    templates.map(template => renderEmailTemplate(template, data))
  );
  return results;
}

// Validate email template rendering
export async function validateEmailTemplate(
  templateName: keyof typeof templateConfigs,
  data?: EmailTestData
): Promise<{ isValid: boolean; errors: string[] }> {
  const errors: string[] = [];

  try {
    const result = await renderEmailTemplate(templateName, data);

    // Check if HTML was generated
    if (!result.html || result.html.trim().length === 0) {
      errors.push("No HTML content generated");
    }

    // Check if text was generated
    if (!result.text || result.text.trim().length === 0) {
      errors.push("No text content generated");
    }

    // Check if subject exists
    if (!result.subject || result.subject.trim().length === 0) {
      errors.push("No subject line defined");
    }

    // Check HTML size (warn if too large)
    if (result.size.html > 100000) {
      // 100KB
      errors.push(
        `HTML size is large (${Math.round(result.size.html / 1024)}KB)`
      );
    }

    // Check render time (warn if too slow)
    if (result.renderTime > 1000) {
      // 1 second
      errors.push(`Slow render time (${Math.round(result.renderTime)}ms)`);
    }

    // Basic HTML validation
    if (result.html && !result.html.includes("<!DOCTYPE html>")) {
      errors.push("HTML appears to be malformed (missing DOCTYPE)");
    }
  } catch (error) {
    errors.push(
      `Template rendering failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Send test email (requires environment setup)
export async function sendTestEmail(
  templateName: keyof typeof templateConfigs,
  recipient: string,
  data?: EmailTestData
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
    const supabaseKey = process.env["SUPABASE_SECRET_KEY"];

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase environment variables not configured");
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        to: recipient,
        template: templateName,
        data: { ...templateConfigs[templateName].defaultData, ...data },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Email send failed: ${response.status} - ${error}`);
    }

    const result = await response.json();
    return { success: true, id: result.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Export template configurations for external use
export { templateConfigs };
