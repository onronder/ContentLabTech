import { ReactElement } from "react";
import { render } from "@react-email/render";

interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  react?: ReactElement;
}

/**
 * Send email using the configured email provider
 * For now, this is a stub implementation - you would integrate with
 * your email service provider (SendGrid, AWS SES, Resend, etc.)
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    let emailHtml = options.html;
    let emailText = options.text;

    // If React component is provided, render it to HTML
    if (options.react) {
      emailHtml = await render(options.react);
      if (!emailText) {
        // Basic text extraction from HTML (you might want to use a proper library)
        emailText = emailHtml
          .replace(/<[^>]*>/g, "")
          .replace(/\s+/g, " ")
          .trim();
      }
    }

    // In a real implementation, you would integrate with your email provider
    // For example, with Resend:
    //
    // import { Resend } from 'resend';
    // const resend = new Resend(process.env.RESEND_API_KEY);
    //
    // await resend.emails.send({
    //   from: 'ContentLab <noreply@contentlabnexus.com>',
    //   to: options.to,
    //   subject: options.subject,
    //   html: emailHtml,
    //   text: emailText,
    // });

    // For now, we'll just log the email (development mode)
    if (process.env.NODE_ENV === "development") {
      console.log("📧 Email would be sent:", {
        to: options.to,
        subject: options.subject,
        html: emailHtml?.substring(0, 200) + "...",
      });
    }

    // In production, you would uncomment the email provider integration above
    // and remove this development logging
  } catch (error) {
    console.error("Failed to send email:", error);
    throw new Error("Failed to send email");
  }
}
