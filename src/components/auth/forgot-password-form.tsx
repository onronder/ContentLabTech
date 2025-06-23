"use client";

/**
 * ForgotPasswordForm Component
 * Password reset form using Supabase Auth
 */

import { useState } from "react";
import { ArrowLeft, Mail, Loader2 } from "lucide-react";

import { useSupabaseAuth } from "@/hooks/auth/use-supabase-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ForgotPasswordFormProps {
  onBackToSignIn?: () => void;
}

export const ForgotPasswordForm = ({
  onBackToSignIn,
}: ForgotPasswordFormProps) => {
  const { resetPassword, loading } = useSupabaseAuth();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    const { error: resetError } = await resetPassword(email);

    if (resetError) {
      setError(resetError.message);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">
            Check Your Email
          </CardTitle>
          <CardDescription className="text-center">
            We&apos;ve sent a password reset link to your email address.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-muted-foreground text-sm">
                We&apos;ve sent a password reset link to:
              </p>
              <p className="font-medium">{email}</p>
            </div>

            <div className="space-y-2">
              <p className="text-muted-foreground text-sm">
                Click the link in the email to reset your password. The link
                will expire in 24 hours.
              </p>
              <p className="text-muted-foreground text-sm">
                Don&apos;t see the email? Check your spam folder.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={onBackToSignIn}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center text-2xl font-bold">
          Forgot Password
        </CardTitle>
        <CardDescription className="text-center">
          Enter your email address and we&apos;ll send you a link to reset your
          password.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="Enter your email address"
                className="pl-10"
                disabled={loading}
                required
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending Reset Link...
              </>
            ) : (
              "Send Reset Link"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onBackToSignIn}
            className="text-muted-foreground hover:text-foreground flex items-center justify-center gap-2 text-sm transition-colors"
            disabled={loading}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </button>
        </div>
      </CardContent>
    </Card>
  );
};
