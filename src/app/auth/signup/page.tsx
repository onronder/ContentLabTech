"use client";

/**
 * Sign Up Page
 * User registration page with social sign-up options
 */

import { useState } from "react";

export const dynamic = "force-dynamic";

import { AuthForm, OAuthButtons } from "@/components/auth";

export default function SignUpPage() {
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Join ContentLab Nexus
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Start optimizing your content marketing today
          </p>
        </div>

        <div className="space-y-6">
          <AuthForm
            mode={authMode}
            onModeChange={setAuthMode}
            redirectUrl="/onboarding"
          />

          <OAuthButtons />

          <div className="text-center text-xs text-gray-500">
            By signing up, you agree to our{" "}
            <a href="/terms" className="text-blue-600 hover:text-blue-500">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-blue-600 hover:text-blue-500">
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
