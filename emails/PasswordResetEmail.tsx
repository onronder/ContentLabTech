/**
 * Password Reset Email Template
 * Secure password reset email with ContentLab Nexus branding
 */

import { Text, Button, Section } from "@react-email/components";
import EmailLayout from "./components/EmailLayout";

export interface PasswordResetEmailProps {
  userName?: string;
  resetUrl: string;
}

export const PasswordResetEmail = ({
  userName = "there",
  resetUrl,
}: PasswordResetEmailProps) => {
  return (
    <EmailLayout preview="Reset your ContentLab Nexus password securely">
      <Section>
        <Text style={heading}>Password Reset Request</Text>

        <Text style={paragraph}>Hello {userName},</Text>

        <Text style={paragraph}>
          We received a request to reset your ContentLab Nexus password. If you
          made this request, click the button below to create a new password:
        </Text>

        <Section style={buttonContainer}>
          <Button style={button} href={resetUrl}>
            Reset Password
          </Button>
        </Section>

        <Text style={paragraph}>
          If the button doesn&apos;t work, you can copy and paste this link into
          your browser:
        </Text>

        <Text style={linkText}>{resetUrl}</Text>

        <Section style={securityNotice}>
          <Text style={securityTitle}>🔒 Security Information</Text>
          <Text style={securityText}>
            This password reset link will expire in 1 hour for your security. If
            you didn&apos;t request a password reset, please ignore this email
            and your password will remain unchanged.
          </Text>
        </Section>

        <Section style={tipsSection}>
          <Text style={tipsTitle}>💡 Password Security Tips</Text>
          <Text style={tipItem}>
            • Use at least 12 characters with mixed case letters
          </Text>
          <Text style={tipItem}>• Include numbers and special characters</Text>
          <Text style={tipItem}>
            • Avoid using personal information or common words
          </Text>
          <Text style={tipItem}>• Consider using a password manager</Text>
        </Section>

        <Text style={paragraph}>
          If you continue to have problems, please contact our support team.
        </Text>
      </Section>
    </EmailLayout>
  );
};

// Styles
const heading = {
  fontSize: "28px",
  fontWeight: "700",
  color: "#dc2626",
  margin: "0 0 24px",
  textAlign: "center" as const,
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#374151",
  margin: "0 0 16px",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#dc2626",
  background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
  border: "none",
  cursor: "pointer",
};

const linkText = {
  fontSize: "14px",
  color: "#dc2626",
  wordBreak: "break-all" as const,
  margin: "0 0 24px",
  padding: "12px",
  backgroundColor: "#fef2f2",
  borderRadius: "6px",
  border: "1px solid #fecaca",
};

const securityNotice = {
  backgroundColor: "#fef3c7",
  borderRadius: "8px",
  padding: "16px",
  margin: "24px 0",
  border: "1px solid #fcd34d",
};

const securityTitle = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#92400e",
  margin: "0 0 8px",
};

const securityText = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#a16207",
  margin: "0",
};

const tipsSection = {
  backgroundColor: "#dbeafe",
  borderRadius: "8px",
  padding: "16px",
  margin: "24px 0",
  border: "1px solid #bfdbfe",
};

const tipsTitle = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#1e40af",
  margin: "0 0 12px",
};

const tipItem = {
  fontSize: "13px",
  lineHeight: "18px",
  color: "#1e40af",
  margin: "0 0 4px",
  paddingLeft: "4px",
};

export default PasswordResetEmail;
