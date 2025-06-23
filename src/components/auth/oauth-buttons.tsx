"use client";

/**
 * OAuth Buttons Component
 * Social authentication buttons for Google and GitHub using Supabase Auth
 */

import { useState } from "react";
import { FcGoogle } from "react-icons/fc";

import { useSupabaseAuth } from "@/hooks/auth/use-supabase-auth";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface OAuthButtonsProps {
  className?: string;
  showDivider?: boolean;
}

export const OAuthButtons = ({
  className = "",
  showDivider = true,
}: OAuthButtonsProps) => {
  const { signInWithOAuth, loading } = useSupabaseAuth();
  const [error, setError] = useState<string | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoadingProvider("google");

    try {
      const { error: oauthError } = await signInWithOAuth("google");

      if (oauthError) {
        setError(oauthError.message);
      }
      // On success, user will be redirected to Google
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className={className}>
      {showDivider && (
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background text-muted-foreground px-2">
              Or continue with
            </span>
          </div>
        </div>
      )}

      <Button
        variant="outline"
        onClick={handleGoogleSignIn}
        disabled={loading || loadingProvider === "google"}
        className="w-full"
      >
        <FcGoogle className="mr-2 h-4 w-4" />
        Continue with Google
      </Button>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};
