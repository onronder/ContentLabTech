"use client";

/**
 * Premium Sign In Page
 * Modern authentication page with brand storytelling
 */

import { useState } from "react";
import Link from "next/link";

export const dynamic = "force-dynamic";

import { AuthForm, OAuthButtons } from "@/components/auth";
import AuthLayout from "@/components/auth/auth-layout";
import { ErrorBoundary } from "@/components/error-boundary";

export default function SignInPage() {
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

  const testimonial = {
    quote:
      "ContentLab Nexus transformed our content strategy. The AI insights helped us increase organic traffic by 300% in just 3 months.",
    author: "Sarah Chen",
    role: "Head of Marketing",
    company: "TechFlow Inc.",
  };

  return (
    <ErrorBoundary>
      <AuthLayout
        title="Welcome Back"
        subtitle="Sign in to your ContentLab Nexus account and continue optimizing your content strategy"
        testimonial={testimonial}
      >
        <div className="space-y-6">
          <ErrorBoundary>
            <AuthForm
              mode={authMode}
              onModeChange={setAuthMode}
              redirectUrl="/dashboard"
            />
          </ErrorBoundary>

          <ErrorBoundary>
            <OAuthButtons />
          </ErrorBoundary>

          {authMode === "signin" && (
            <div className="text-center">
              <Link
                href="/auth/forgot-password"
                className="text-brand-blue hover:text-brand-blue-600 text-sm font-medium transition-colors"
              >
                Forgot your password?
              </Link>
            </div>
          )}
        </div>
      </AuthLayout>
    </ErrorBoundary>
  );
}
