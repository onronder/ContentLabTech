/**
 * Email Layout Component
 * Base layout for all ContentLab Nexus emails
 */

import {
  Html,
  Head,
  Font,
  Preview,
  Body,
  Container,
  Section,
  Row,
  Column,
  Text,
  Link,
  Hr,
} from "@react-email/components";

export interface EmailLayoutProps {
  preview: string;
  children: any;
  footerText?: string;
}

export const EmailLayout = ({
  preview,
  children,
  footerText = "This is an automated message from ContentLab Nexus. Please do not reply to this email.",
}: EmailLayoutProps) => {
  return (
    <Html>
      <Head>
        <Font
          fontFamily="Inter"
          fallbackFontFamily="Helvetica"
          webFont={{
            url: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
            format: "woff2",
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Row>
              <Column>
                <Text style={logo}>ContentLab Nexus</Text>
              </Column>
            </Row>
          </Section>

          {/* Main Content */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Section style={footer}>
            <Hr style={hr} />
            <Row>
              <Column>
                <Text style={footerTextStyle}>
                  Best regards,
                  <br />
                  The ContentLab Nexus Team
                </Text>
                <Text style={supportText}>
                  Need help? Contact us at{" "}
                  <Link href="mailto:info@contentlabtech.com" style={link}>
                    info@contentlabtech.com
                  </Link>
                </Text>
                <Text style={disclaimerText}>{footerText}</Text>
              </Column>
            </Row>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const header = {
  padding: "20px 40px",
  borderBottom: "1px solid #e6ebf1",
};

const logo = {
  fontSize: "24px",
  fontWeight: "700",
  color: "#2563eb",
  margin: "0",
  textAlign: "center" as const,
};

const content = {
  padding: "40px 40px 0",
};

const footer = {
  padding: "20px 40px",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
};

const footerTextStyle = {
  color: "#8898aa",
  fontSize: "14px",
  lineHeight: "16px",
  margin: "16px 0",
};

const supportText = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  margin: "8px 0",
};

const disclaimerText = {
  color: "#8898aa",
  fontSize: "11px",
  lineHeight: "14px",
  margin: "8px 0",
  fontStyle: "italic",
};

const link = {
  color: "#2563eb",
  textDecoration: "underline",
};

export default EmailLayout;
