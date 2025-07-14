import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface TeamInvitationEmailProps {
  teamName: string;
  inviterName: string;
  inviterEmail: string;
  role: string;
  inviteUrl: string;
  expiresAt: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const TeamInvitationEmail = ({
  teamName = "ContentLab Team",
  inviterName = "John Doe",
  inviterEmail = "john@example.com",
  role = "member",
  inviteUrl = "http://localhost:3000/invite/token",
  expiresAt = "2024-01-19T00:00:00.000Z",
}: TeamInvitationEmailProps) => {
  const formattedDate = new Date(expiresAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <Html>
      <Head />
      <Preview>
        You&apos;ve been invited to join {teamName} on ContentLab Nexus
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoContainer}>
            <Img
              src={`${baseUrl}/logo.png`}
              width="120"
              height="36"
              alt="ContentLab Nexus"
              style={logo}
            />
          </Section>

          <Section style={content}>
            <Heading style={h1}>You&apos;re invited to join {teamName}</Heading>

            <Text style={text}>
              Hi there! <strong>{inviterName}</strong> ({inviterEmail}) has
              invited you to join <strong>{teamName}</strong> on ContentLab
              Nexus as a <strong>{roleLabel}</strong>.
            </Text>

            <Text style={text}>
              ContentLab Nexus is a powerful platform for content strategy, SEO
              optimization, and collaborative content management. As a{" "}
              {roleLabel}, you&apos;ll be able to:
            </Text>

            <Section style={bulletPoints}>
              {role === "owner" && (
                <>
                  <Text style={bulletPoint}>
                    • Full team management and administration
                  </Text>
                  <Text style={bulletPoint}>
                    • Complete access to all projects and content
                  </Text>
                  <Text style={bulletPoint}>
                    • Advanced analytics and reporting
                  </Text>
                  <Text style={bulletPoint}>
                    • Team member invitation and role management
                  </Text>
                </>
              )}
              {role === "admin" && (
                <>
                  <Text style={bulletPoint}>• Team member management</Text>
                  <Text style={bulletPoint}>
                    • Full access to projects and content
                  </Text>
                  <Text style={bulletPoint}>
                    • Advanced analytics and reporting
                  </Text>
                  <Text style={bulletPoint}>
                    • Content creation and collaboration
                  </Text>
                </>
              )}
              {role === "member" && (
                <>
                  <Text style={bulletPoint}>• Create and edit content</Text>
                  <Text style={bulletPoint}>
                    • Access team projects and analytics
                  </Text>
                  <Text style={bulletPoint}>
                    • Collaborate on content strategy
                  </Text>
                  <Text style={bulletPoint}>• View performance insights</Text>
                </>
              )}
              {role === "viewer" && (
                <>
                  <Text style={bulletPoint}>
                    • View team projects and content
                  </Text>
                  <Text style={bulletPoint}>
                    • Access performance analytics
                  </Text>
                  <Text style={bulletPoint}>• Review content strategies</Text>
                  <Text style={bulletPoint}>• Monitor team progress</Text>
                </>
              )}
            </Section>

            <Section style={buttonContainer}>
              <Button pX={20} pY={12} style={button} href={inviteUrl}>
                Accept Invitation
              </Button>
            </Section>

            <Text style={text}>
              Or copy and paste this URL into your browser:{" "}
              <Link href={inviteUrl} style={link}>
                {inviteUrl}
              </Link>
            </Text>

            <Hr style={hr} />

            <Section style={footer}>
              <Text style={footerText}>
                This invitation will expire on <strong>{formattedDate}</strong>.
              </Text>

              <Text style={footerText}>
                If you don&apos;t want to join this team or think you received
                this email by mistake, you can safely ignore this email.
              </Text>

              <Text style={footerText}>
                Need help? Contact us at{" "}
                <Link href="mailto:support@contentlabnexus.com" style={link}>
                  support@contentlabnexus.com
                </Link>
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default TeamInvitationEmail;

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const logoContainer = {
  padding: "32px 40px",
  backgroundColor: "#ffffff",
  borderBottom: "1px solid #f0f0f0",
};

const logo = {
  margin: "0 auto",
};

const content = {
  padding: "40px 40px 0",
};

const h1 = {
  color: "#1f2937",
  fontSize: "24px",
  fontWeight: "600",
  lineHeight: "32px",
  margin: "0 0 24px",
  textAlign: "center" as const,
};

const text = {
  color: "#374151",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 16px",
};

const bulletPoints = {
  margin: "16px 0 24px",
  padding: "0 0 0 16px",
};

const bulletPoint = {
  color: "#374151",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "0 0 8px",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#3b82f6",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  lineHeight: "100%",
};

const link = {
  color: "#3b82f6",
  textDecoration: "underline",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "32px 0",
};

const footer = {
  margin: "32px 0 0",
};

const footerText = {
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "0 0 12px",
  textAlign: "center" as const,
};
