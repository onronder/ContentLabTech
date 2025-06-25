"use client";

/**
 * Premium OAuth Buttons Component
 * Enhanced social authentication buttons with modern design
 */

import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { Loader2 } from "lucide-react";

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

  const handleOAuthSignIn = async (provider: "google") => {
    setError(null);
    setLoadingProvider(provider);

    try {
      const { error: oauthError } = await signInWithOAuth(provider);

      if (oauthError) {
        setError(oauthError.message);
      }
      // On success, user will be redirected to the provider
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setLoadingProvider(null);
    }
  };

  const oauthProviders = [
    {
      id: "google" as const,
      name: "Google",
      icon: FcGoogle,
      className:
        "hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700",
    },
    // Additional providers can be enabled when configured in Supabase
    // {
    //   id: "github" as const,
    //   name: "GitHub",
    //   icon: Github,
    //   className: "hover:bg-gray-900 hover:text-white dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700",
    // },
    // {
    //   id: "linkedin" as const,
    //   name: "LinkedIn",
    //   icon: Linkedin,
    //   className: "hover:bg-blue-700 hover:text-white border-blue-200 dark:border-blue-700",
    // },
  ];

  return (
    <div className={className}>
      {showDivider && (
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <span className="border-border w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background text-muted-foreground px-4 font-medium">
              Or continue with
            </span>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {oauthProviders.map(provider => {
          const Icon = provider.icon;
          const isLoading = loadingProvider === provider.id;

          return (
            <Button
              key={provider.id}
              variant="outline"
              onClick={() => handleOAuthSignIn(provider.id)}
              disabled={loading || loadingProvider !== null}
              className={`h-12 w-full text-base font-medium transition-all duration-200 ${provider.className} ${
                isLoading ? "opacity-50" : "transform hover:scale-[1.02]"
              }`}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Icon className="mr-2 h-5 w-5" />
              )}
              {isLoading ? "Connecting..." : `Continue with ${provider.name}`}
            </Button>
          );
        })}
      </div>

      {error && (
        <Alert
          variant="destructive"
          className="border-error-500 bg-error-50 dark:bg-error-950 mt-4"
        >
          <AlertDescription className="text-error-700 dark:text-error-300">
            {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
