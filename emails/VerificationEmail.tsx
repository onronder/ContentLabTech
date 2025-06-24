/**
 * Email Verification Template
 * Professional verification email with ContentLab Nexus branding
 */

import { Text, Button, Section, Row, Column } from "@react-email/components";
import * as React from "react";
import EmailLayout from "./components/EmailLayout";

export interface VerificationEmailProps {
  userName?: string;
  verificationUrl: string;
}

export const VerificationEmail = ({
  userName = "there",
  verificationUrl,
}: VerificationEmailProps) => {
  return (
    <EmailLayout preview="Verify your ContentLab Nexus account to get started">
      <Section>
        <Text style={heading}>Welcome to ContentLab Nexus!</Text>

        <Text style={paragraph}>Hello {userName},</Text>

        <Text style={paragraph}>
          Thank you for signing up for ContentLab Nexus. To complete your
          registration and secure your account, please verify your email address
          by clicking the button below:
        </Text>

        <Section style={buttonContainer}>
          <Button style={button} href={verificationUrl}>
            Verify Email Address
          </Button>
        </Section>

        <Text style={paragraph}>
          If the button doesn&apos;t work, you can copy and paste this link into
          your browser:
        </Text>

        <Text style={linkText}>{verificationUrl}</Text>

        <Section style={securityNotice}>
          <Text style={securityTitle}>🔒 Security Note</Text>
          <Text style={securityText}>
            This verification link will expire in 24 hours for your security. If
            you didn&apos;t create an account with ContentLab Nexus, you can
            safely ignore this email.
          </Text>
        </Section>

        <Text style={paragraph}>
          Once verified, you&apos;ll have access to:
        </Text>

        <Section style={featureList}>
          <Row>
            <Column>
              <Text style={featureItem}>
                📊 Content analytics and performance tracking
              </Text>
              <Text style={featureItem}>👥 Team collaboration tools</Text>
              <Text style={featureItem}>
                ⚡ Advanced content management features
              </Text>
              <Text style={featureItem}>
                🔧 Custom integrations and API access
              </Text>
            </Column>
          </Row>
        </Section>

        <Text style={paragraph}>Welcome aboard!</Text>
      </Section>
    </EmailLayout>
  );
};

// Styles
const heading = {
  fontSize: "28px",
  fontWeight: "700",
  color: "#1f2937",
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
  backgroundColor: "#2563eb",
  background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
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
  color: "#2563eb",
  wordBreak: "break-all" as const,
  margin: "0 0 24px",
  padding: "12px",
  backgroundColor: "#f8fafc",
  borderRadius: "6px",
  border: "1px solid #e2e8f0",
};

const securityNotice = {
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
  padding: "16px",
  margin: "24px 0",
  border: "1px solid #d1d5db",
};

const securityTitle = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#374151",
  margin: "0 0 8px",
};

const securityText = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#6b7280",
  margin: "0",
};

const featureList = {
  margin: "16px 0 24px",
};

const featureItem = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#374151",
  margin: "0 0 8px",
  paddingLeft: "4px",
};

export default VerificationEmail;
