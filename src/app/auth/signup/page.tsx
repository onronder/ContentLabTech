"use client";

/**
 * Premium Sign Up Page
 * Modern registration page with value proposition
 */

import { useState } from "react";

export const dynamic = "force-dynamic";

import { AuthForm, OAuthButtons } from "@/components/auth";
import AuthLayout from "@/components/auth/auth-layout";

export default function SignUpPage() {
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");

  const testimonial = {
    quote:
      "The competitive intelligence features are game-changing. We discovered content gaps we never knew existed and capitalized on them immediately.",
    author: "Marcus Rodriguez",
    role: "Content Director",
    company: "GrowthLabs",
  };

  return (
    <AuthLayout
      title="Start Your Journey"
      subtitle="Join thousands of content creators and marketers who use ContentLab Nexus to dominate their market"
      testimonial={testimonial}
    >
      <div className="space-y-6">
        <AuthForm
          mode={authMode}
          onModeChange={setAuthMode}
          redirectUrl="/onboarding"
        />

        <OAuthButtons />

        <div className="text-muted-foreground text-center text-xs">
          By creating an account, you agree to our{" "}
          <a
            href="/terms"
            className="text-brand-blue hover:text-brand-blue-600 font-medium transition-colors"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href="/privacy"
            className="text-brand-blue hover:text-brand-blue-600 font-medium transition-colors"
          >
            Privacy Policy
          </a>
        </div>
      </div>
    </AuthLayout>
  );
}
