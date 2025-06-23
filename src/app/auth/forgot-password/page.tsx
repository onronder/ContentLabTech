"use client";

/**
 * Forgot Password Page
 * Password reset request page
 */

import { useRouter } from "next/navigation";

import { ForgotPasswordForm } from "@/components/auth";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const handleBackToSignIn = () => {
    router.push("/auth/signin");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            ContentLab Nexus
          </h2>
          <p className="mt-2 text-sm text-gray-600">Reset your password</p>
        </div>

        <ForgotPasswordForm onBackToSignIn={handleBackToSignIn} />
      </div>
    </div>
  );
}
