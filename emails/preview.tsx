/**
 * Email Preview Utility
 * Development tool for previewing email templates
 */

import * as React from "react";
import VerificationEmail from "./VerificationEmail";
import WelcomeEmail from "./WelcomeEmail";
import PasswordResetEmail from "./PasswordResetEmail";

// Sample data for email previews
const sampleData = {
  verification: {
    userName: "John Doe",
    verificationUrl:
      "https://contentlab-nexus.com/auth/verify?token=sample-token-123&type=signup",
  },
  welcome: {
    userName: "John Doe",
    dashboardUrl: "https://contentlab-nexus.com/dashboard",
  },
  passwordReset: {
    userName: "John Doe",
    resetUrl:
      "https://contentlab-nexus.com/auth/reset-password?token=sample-reset-token-456",
  },
};

// Email preview components
export const VerificationEmailPreview = () => (
  <VerificationEmail {...sampleData.verification} />
);

export const WelcomeEmailPreview = () => (
  <WelcomeEmail {...sampleData.welcome} />
);

export const PasswordResetEmailPreview = () => (
  <PasswordResetEmail {...sampleData.passwordReset} />
);

// Preview selector component
interface EmailPreviewSelectorProps {
  onTemplateChange: (template: string) => void;
  selectedTemplate: string;
}

export const EmailPreviewSelector = ({
  onTemplateChange,
  selectedTemplate,
}: EmailPreviewSelectorProps) => {
  const templates = [
    { id: "verification", name: "Email Verification" },
    { id: "welcome", name: "Welcome Email" },
    { id: "password-reset", name: "Password Reset" },
  ];

  return (
    <div style={selectorStyle}>
      <h3 style={titleStyle}>Email Template Preview</h3>
      <div style={buttonGroupStyle}>
        {templates.map(template => (
          <button
            key={template.id}
            onClick={() => onTemplateChange(template.id)}
            style={{
              ...buttonStyle,
              ...(selectedTemplate === template.id ? activeButtonStyle : {}),
            }}
          >
            {template.name}
          </button>
        ))}
      </div>
    </div>
  );
};

// Main preview component
export const EmailPreview = () => {
  const [selectedTemplate, setSelectedTemplate] =
    React.useState("verification");

  const renderTemplate = () => {
    switch (selectedTemplate) {
      case "verification":
        return <VerificationEmailPreview />;
      case "welcome":
        return <WelcomeEmailPreview />;
      case "password-reset":
        return <PasswordResetEmailPreview />;
      default:
        return <VerificationEmailPreview />;
    }
  };

  return (
    <div style={containerStyle}>
      <EmailPreviewSelector
        selectedTemplate={selectedTemplate}
        onTemplateChange={setSelectedTemplate}
      />
      <div style={previewContainerStyle}>{renderTemplate()}</div>
    </div>
  );
};

// Styles
const containerStyle = {
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  padding: "20px",
  backgroundColor: "#f8fafc",
  minHeight: "100vh",
};

const selectorStyle = {
  backgroundColor: "#ffffff",
  padding: "20px",
  borderRadius: "8px",
  marginBottom: "20px",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
};

const titleStyle = {
  margin: "0 0 16px",
  color: "#1f2937",
  fontSize: "18px",
  fontWeight: "600",
};

const buttonGroupStyle = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap" as const,
};

const buttonStyle = {
  padding: "8px 16px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  backgroundColor: "#ffffff",
  color: "#374151",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "500",
  transition: "all 0.2s ease",
};

const activeButtonStyle = {
  backgroundColor: "#2563eb",
  color: "#ffffff",
  borderColor: "#2563eb",
};

const previewContainerStyle = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  padding: "20px",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  overflow: "auto",
};

export default EmailPreview;
