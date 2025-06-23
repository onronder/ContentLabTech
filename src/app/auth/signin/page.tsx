"use client";

/**
 * Sign In Page
 * Authentication page with social sign-in options
 */

import { useState } from "react";

export const dynamic = "force-dynamic";
import Link from "next/link";

import { AuthForm, OAuthButtons } from "@/components/auth";

export default function SignInPage() {
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            ContentLab Nexus
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Your content marketing analytics platform
          </p>
        </div>

        <div className="space-y-6">
          <AuthForm
            mode={authMode}
            onModeChange={setAuthMode}
            redirectUrl="/dashboard"
          />

          <OAuthButtons />

          {authMode === "signin" && (
            <div className="text-center">
              <Link
                href="/auth/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Forgot your password?
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
