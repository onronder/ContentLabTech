/**
 * Welcome Email Template
 * Celebration email after successful verification
 */

import { Text, Button, Section, Row, Column } from "@react-email/components";
import EmailLayout from "./components/EmailLayout";

export interface WelcomeEmailProps {
  userName?: string;
  dashboardUrl: string;
}

export const WelcomeEmail = ({
  userName = "there",
  dashboardUrl,
}: WelcomeEmailProps) => {
  return (
    <EmailLayout preview="Welcome to ContentLab Nexus! Your account is ready.">
      <Section>
        <Section style={celebrationHeader}>
          <Text style={celebrationEmoji}>🎉</Text>
          <Text style={heading}>Your account is ready!</Text>
        </Section>

        <Text style={paragraph}>Hello {userName},</Text>

        <Text style={paragraph}>
          Congratulations! Your email has been verified and your ContentLab
          Nexus account is now fully activated. You&apos;re all set to start
          building amazing content experiences.
        </Text>

        <Section style={buttonContainer}>
          <Button style={button} href={dashboardUrl}>
            Go to Dashboard
          </Button>
        </Section>

        <Text style={sectionTitle}>What&apos;s next?</Text>

        <Section style={featureGrid}>
          <Row>
            <Column style={featureColumn}>
              <Section style={featureCard}>
                <Text style={featureIcon}>📊</Text>
                <Text style={featureTitle}>Analytics</Text>
                <Text style={featureDescription}>
                  Track your content performance with detailed insights and
                  metrics.
                </Text>
              </Section>
            </Column>
            <Column style={featureColumn}>
              <Section style={featureCard}>
                <Text style={featureIcon}>👥</Text>
                <Text style={featureTitle}>Teams</Text>
                <Text style={featureDescription}>
                  Invite team members and collaborate on projects together.
                </Text>
              </Section>
            </Column>
          </Row>
          <Row>
            <Column style={featureColumn}>
              <Section style={featureCard}>
                <Text style={featureIcon}>⚡</Text>
                <Text style={featureTitle}>Integrations</Text>
                <Text style={featureDescription}>
                  Connect your favorite tools and automate your workflow.
                </Text>
              </Section>
            </Column>
            <Column style={featureColumn}>
              <Section style={featureCard}>
                <Text style={featureIcon}>🔧</Text>
                <Text style={featureTitle}>Settings</Text>
                <Text style={featureDescription}>
                  Customize your workspace and notification preferences.
                </Text>
              </Section>
            </Column>
          </Row>
        </Section>

        <Section style={helpSection}>
          <Text style={helpTitle}>Need help getting started?</Text>
          <Text style={helpText}>
            Check out our{" "}
            <Button
              style={linkButton}
              href={`${dashboardUrl.replace("/dashboard", "")}/docs`}
            >
              documentation
            </Button>{" "}
            or reach out to our support team.
          </Text>
        </Section>

        <Text style={paragraph}>
          We&apos;re excited to see what you&apos;ll create with ContentLab
          Nexus!
        </Text>
      </Section>
    </EmailLayout>
  );
};

// Styles
const celebrationHeader = {
  textAlign: "center" as const,
  margin: "0 0 32px",
};

const celebrationEmoji = {
  fontSize: "48px",
  margin: "0 0 16px",
  textAlign: "center" as const,
};

const heading = {
  fontSize: "28px",
  fontWeight: "700",
  color: "#1f2937",
  margin: "0",
  textAlign: "center" as const,
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#374151",
  margin: "0 0 16px",
};

const sectionTitle = {
  fontSize: "20px",
  fontWeight: "600",
  color: "#1f2937",
  margin: "32px 0 16px",
  textAlign: "center" as const,
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

const linkButton = {
  color: "#2563eb",
  textDecoration: "underline",
  backgroundColor: "transparent",
  border: "none",
  padding: "0",
  fontSize: "inherit",
  fontWeight: "500",
  cursor: "pointer",
};

const featureGrid = {
  margin: "24px 0",
};

const featureColumn = {
  width: "50%",
  padding: "8px",
};

const featureCard = {
  backgroundColor: "#f8fafc",
  borderRadius: "8px",
  padding: "16px",
  textAlign: "center" as const,
  border: "1px solid #e2e8f0",
  margin: "0 0 16px",
};

const featureIcon = {
  fontSize: "24px",
  margin: "0 0 8px",
};

const featureTitle = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#1f2937",
  margin: "0 0 8px",
};

const featureDescription = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#6b7280",
  margin: "0",
};

const helpSection = {
  backgroundColor: "#dbeafe",
  borderRadius: "8px",
  padding: "20px",
  margin: "32px 0",
  textAlign: "center" as const,
  border: "1px solid #bfdbfe",
};

const helpTitle = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#1e40af",
  margin: "0 0 8px",
};

const helpText = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#1e40af",
  margin: "0",
};

export default WelcomeEmail;
