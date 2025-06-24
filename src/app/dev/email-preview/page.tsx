/**
 * Email Preview Development Page
 * Development-only page for previewing email templates
 */

"use client";

import React, { useState } from "react";
import { render } from "@react-email/render";
import VerificationEmail from "../../../../emails/VerificationEmail";
import WelcomeEmail from "../../../../emails/WelcomeEmail";
import PasswordResetEmail from "../../../../emails/PasswordResetEmail";

// Sample data for previews
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
  "password-reset": {
    userName: "John Doe",
    resetUrl:
      "https://contentlab-nexus.com/auth/reset-password?token=sample-reset-token-456",
  },
};

const templates = [
  {
    id: "verification",
    name: "Email Verification",
    component: VerificationEmail,
  },
  { id: "welcome", name: "Welcome Email", component: WelcomeEmail },
  {
    id: "password-reset",
    name: "Password Reset",
    component: PasswordResetEmail,
  },
];

export default function EmailPreviewPage() {
  const [selectedTemplate, setSelectedTemplate] = useState("verification");
  const [viewMode, setViewMode] = useState<"preview" | "html" | "text">(
    "preview"
  );
  const [customData, setCustomData] = useState("");

  // Get current template data
  const getCurrentData = () => {
    try {
      if (customData.trim()) {
        return {
          ...sampleData[selectedTemplate as keyof typeof sampleData],
          ...JSON.parse(customData),
        };
      }
      return sampleData[selectedTemplate as keyof typeof sampleData];
    } catch {
      return sampleData[selectedTemplate as keyof typeof sampleData];
    }
  };

  // Render template
  const renderTemplate = () => {
    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return null;

    const data = getCurrentData();
    return React.createElement(
      template.component as unknown as React.ComponentType<
        Record<string, unknown>
      >,
      data
    );
  };

  // Get HTML source
  const getHtmlSource = () => {
    try {
      const element = renderTemplate();
      return element ? render(element) : "";
    } catch (error) {
      return `Error rendering template: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  };

  // Get text version
  const getTextVersion = () => {
    const data = getCurrentData();
    switch (selectedTemplate) {
      case "verification":
        return `Welcome to ContentLab Nexus!\n\nHello ${data.userName},\n\nThank you for signing up. Please verify your email: ${data.verificationUrl}`;
      case "welcome":
        return `Welcome to ContentLab Nexus! 🎉\n\nHello ${data.userName},\n\nYour account is ready! Go to: ${data.dashboardUrl}`;
      case "password-reset":
        return `Password Reset Request\n\nHello ${data.userName},\n\nReset your password: ${data.resetUrl}`;
      default:
        return "";
    }
  };

  if (process.env["NODE_ENV"] === "production") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">
            Page Not Available
          </h1>
          <p className="text-gray-600">
            This development page is not available in production.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Email Template Preview
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Development tool for previewing and testing email templates
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Controls */}
          <div className="lg:col-span-1">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Controls
              </h2>

              {/* Template Selection */}
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Email Template
                </label>
                <select
                  value={selectedTemplate}
                  onChange={e => setSelectedTemplate(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* View Mode */}
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  View Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["preview", "html", "text"] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`rounded-md px-3 py-2 text-xs font-medium capitalize ${
                        viewMode === mode
                          ? "border border-blue-200 bg-blue-100 text-blue-700"
                          : "border border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Data */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Custom Data (JSON)
                </label>
                <textarea
                  value={customData}
                  onChange={e => setCustomData(e.target.value)}
                  placeholder='{"userName": "Custom Name"}'
                  rows={4}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Override default template data with custom values
                </p>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="lg:col-span-3">
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {templates.find(t => t.id === selectedTemplate)?.name} -{" "}
                  {viewMode.toUpperCase()}
                </h2>
              </div>

              <div className="p-6">
                {viewMode === "preview" && (
                  <div className="overflow-hidden rounded-lg border border-gray-300">
                    <div
                      className="h-96 w-full overflow-auto bg-gray-50"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      {renderTemplate()}
                    </div>
                  </div>
                )}

                {viewMode === "html" && (
                  <div className="overflow-hidden rounded-lg border border-gray-300">
                    <pre className="h-96 w-full overflow-auto bg-gray-900 p-4 font-mono text-xs text-green-400">
                      {getHtmlSource()}
                    </pre>
                  </div>
                )}

                {viewMode === "text" && (
                  <div className="overflow-hidden rounded-lg border border-gray-300">
                    <pre className="h-96 w-full overflow-auto bg-gray-100 p-4 font-mono text-sm whitespace-pre-wrap text-gray-800">
                      {getTextVersion()}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
