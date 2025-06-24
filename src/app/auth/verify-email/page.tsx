"use client";

/**
 * Email Verification Page
 * Production-grade email verification handler with comprehensive error handling
 */

import { useEffect, useState, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Mail,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

type VerificationState =
  | "loading"
  | "success"
  | "error"
  | "expired"
  | "invalid";

interface VerificationResult {
  state: VerificationState;
  message: string;
  canRetry: boolean;
  canResend: boolean;
}

function EmailVerificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [result, setResult] = useState<VerificationResult>({
    state: "loading",
    message: "Verifying your email address...",
    canRetry: false,
    canResend: false,
  });

  const [isRetrying, setIsRetrying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Extract URL parameters
  const token = searchParams.get("token");
  const type = searchParams.get("type") || "signup";
  const redirectTo = searchParams.get("redirect_to") || "/dashboard";
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const verifyEmail = useCallback(
    async (retryAttempt = false) => {
      if (retryAttempt) {
        setIsRetrying(true);
      }

      try {
        // Handle URL errors first
        if (error) {
          const errorMap: Record<string, VerificationResult> = {
            access_denied: {
              state: "error",
              message: "Email verification was cancelled or denied.",
              canRetry: false,
              canResend: true,
            },
            server_error: {
              state: "error",
              message:
                "Server error occurred during verification. Please try again.",
              canRetry: true,
              canResend: true,
            },
            temporarily_unavailable: {
              state: "error",
              message:
                "Email verification is temporarily unavailable. Please try again later.",
              canRetry: true,
              canResend: false,
            },
          };

          setResult(
            errorMap[error] || {
              state: "error",
              message:
                errorDescription ||
                "An unexpected error occurred during email verification.",
              canRetry: true,
              canResend: true,
            }
          );
          return;
        }

        // Validate required parameters
        if (!token) {
          setResult({
            state: "invalid",
            message:
              "No verification token found in the URL. Please check your email link.",
            canRetry: false,
            canResend: true,
          });
          return;
        }

        // Attempt verification
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: type as
            | "signup"
            | "recovery"
            | "invite"
            | "magiclink"
            | "email_change",
        });

        if (verifyError) {
          // Handle specific Supabase errors
          if (verifyError.message.includes("expired")) {
            setResult({
              state: "expired",
              message:
                "The verification link has expired. Please request a new one.",
              canRetry: false,
              canResend: true,
            });
          } else if (verifyError.message.includes("invalid")) {
            setResult({
              state: "invalid",
              message:
                "The verification link is invalid. Please request a new one.",
              canRetry: false,
              canResend: true,
            });
          } else if (verifyError.message.includes("already")) {
            setResult({
              state: "success",
              message:
                "Your email is already verified! You can continue to your dashboard.",
              canRetry: false,
              canResend: false,
            });
          } else {
            setResult({
              state: "error",
              message:
                "Email verification failed. Please try again or request a new link.",
              canRetry: true,
              canResend: true,
            });
          }
          return;
        }

        // Success case
        if (data.user) {
          setResult({
            state: "success",
            message:
              "Email successfully verified! Welcome to ContentLab Nexus.",
            canRetry: false,
            canResend: false,
          });

          // Track successful verification
          if (
            typeof window !== "undefined" &&
            (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
          ) {
            (window as unknown as { gtag: (...args: unknown[]) => void }).gtag(
              "event",
              "email_verified",
              {
                event_category: "authentication",
                event_label: type,
              }
            );
          }

          // Redirect after success
          setTimeout(() => {
            router.push(redirectTo);
          }, 2000);
        } else {
          setResult({
            state: "error",
            message:
              "Verification completed but user data is missing. Please contact support.",
            canRetry: true,
            canResend: false,
          });
        }
      } catch (err) {
        console.error("Email verification error:", err);
        setResult({
          state: "error",
          message:
            "Network error occurred. Please check your connection and try again.",
          canRetry: true,
          canResend: false,
        });
      } finally {
        if (retryAttempt) {
          setIsRetrying(false);
        }
      }
    },
    [token, type, error, errorDescription, router, redirectTo]
  );

  const handleRetry = () => {
    setResult(prev => ({
      ...prev,
      state: "loading",
      message: "Retrying verification...",
    }));
    verifyEmail(true);
  };

  const handleResendVerification = async () => {
    setIsResending(true);

    try {
      // Get current user email for resend
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email) {
        const { error: resendError } = await supabase.auth.resend({
          type: "signup",
          email: user.email,
        });

        if (resendError) {
          setResult(prev => ({
            ...prev,
            message:
              "Failed to resend verification email. Please try again later.",
          }));
        } else {
          setResult(prev => ({
            ...prev,
            message: "New verification email sent! Please check your inbox.",
          }));
        }
      } else {
        router.push("/auth/signin?message=please_sign_in_to_resend");
      }
    } catch (err) {
      console.error("Resend error:", err);
      setResult(prev => ({
        ...prev,
        message: "Failed to resend verification email due to network error.",
      }));
    } finally {
      setIsResending(false);
    }
  };

  const handleGoToDashboard = () => {
    router.push(redirectTo);
  };

  const handleGoToSignIn = () => {
    router.push("/auth/signin");
  };

  // Run verification on mount
  useEffect(() => {
    verifyEmail();
  }, [verifyEmail]);

  const getStateIcon = () => {
    switch (result.state) {
      case "loading":
        return <Loader2 className="h-12 w-12 animate-spin text-blue-500" />;
      case "success":
        return <CheckCircle className="h-12 w-12 text-green-500" />;
      case "error":
      case "expired":
      case "invalid":
        return <XCircle className="h-12 w-12 text-red-500" />;
      default:
        return <Mail className="h-12 w-12 text-gray-400" />;
    }
  };

  const getStateTitle = () => {
    switch (result.state) {
      case "loading":
        return "Verifying Email";
      case "success":
        return "Email Verified!";
      case "expired":
        return "Link Expired";
      case "invalid":
        return "Invalid Link";
      case "error":
        return "Verification Failed";
      default:
        return "Email Verification";
    }
  };

  const getAlertVariant = () => {
    switch (result.state) {
      case "success":
        return "default";
      case "error":
      case "expired":
      case "invalid":
        return "destructive";
      default:
        return "default";
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex justify-center">
            {getStateIcon()}
          </div>
          <CardTitle className="text-2xl font-bold">
            {getStateTitle()}
          </CardTitle>
          <CardDescription>
            {result.state === "loading"
              ? "Please wait while we verify your email address."
              : "Email verification status for your ContentLab Nexus account."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert variant={getAlertVariant()}>
            <AlertDescription className="text-center">
              {result.message}
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            {result.state === "success" && (
              <Button
                onClick={handleGoToDashboard}
                className="w-full"
                size="lg"
              >
                Continue to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}

            {result.canRetry && (
              <Button
                onClick={handleRetry}
                disabled={isRetrying}
                variant="outline"
                className="w-full"
              >
                {isRetrying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again
                  </>
                )}
              </Button>
            )}

            {result.canResend && (
              <Button
                onClick={handleResendVerification}
                disabled={isResending}
                variant="outline"
                className="w-full"
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Resend Verification Email
                  </>
                )}
              </Button>
            )}

            {(result.state === "error" ||
              result.state === "invalid" ||
              result.state === "expired") && (
              <Button
                onClick={handleGoToSignIn}
                variant="ghost"
                className="w-full"
              >
                Back to Sign In
              </Button>
            )}
          </div>

          {result.state === "loading" && (
            <div className="text-muted-foreground text-center text-sm">
              This may take a few moments...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function EmailVerificationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <EmailVerificationContent />
    </Suspense>
  );
}
