"use client";

/**
 * Auth Callback Page
 * Handles OAuth redirects from Supabase Auth
 */

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLoading } from "@/components/auth";

export const dynamic = "force-dynamic";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Dynamic import to avoid SSR issues
        const { supabase } = await import("@/lib/supabase/client");
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth callback error:", error);
          router.push("/auth/signin?error=callback_error");
          return;
        }

        if (data.session) {
          // Check if this is a new user (first sign in)
          const isNewUser = searchParams.get("type") === "signup";

          if (isNewUser) {
            router.push("/onboarding");
          } else {
            router.push("/dashboard");
          }
        } else {
          router.push("/auth/signin");
        }
      } catch (error) {
        console.error("Unexpected error in auth callback:", error);
        router.push("/auth/signin?error=unexpected_error");
      }
    };

    handleAuthCallback();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <AuthLoading message="Completing sign in..." />
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthLoading message="Loading..." />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
