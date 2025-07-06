"use client";

/**
 * Fixed Auth Form - Production Solution
 * Properly integrates with auth context for session management
 * Handles sign-in with proper redirect flow
 */

import { useState, useRef } from "react";
import { Eye, EyeOff, Mail, Lock, Loader2, User } from "lucide-react";

import { useAuth } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AuthFormFixedProps {
  mode?: "signin" | "signup";
  onModeChange?: (mode: "signin" | "signup") => void;
  redirectUrl?: string;
}

export const AuthFormFixed = ({
  mode = "signin",
  onModeChange,
  redirectUrl = "/dashboard",
}: AuthFormFixedProps) => {
  const { signIn, signUp, loading: authLoading } = useAuth();

  // Single source of truth for loading state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionRef = useRef(false);

  // Form data
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
  });

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Simple input handler
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Basic validation
  const isFormValid = () => {
    if (mode === "signup") {
      return (
        formData.email.trim() !== "" &&
        formData.password.trim() !== "" &&
        formData.confirmPassword.trim() !== "" &&
        formData.fullName.trim() !== "" &&
        formData.password === formData.confirmPassword
      );
    }
    return formData.email.trim() !== "" && formData.password.trim() !== "";
  };

  // Calculate actual loading state
  const actuallyLoading = authLoading || isSubmitting;

  // Robust form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (submissionRef.current || actuallyLoading) {
      return;
    }

    // Clear previous states
    setError(null);
    setSuccess(null);

    // Validate form
    if (!isFormValid()) {
      setError("Please fill in all required fields");
      return;
    }

    // Set submission flags
    submissionRef.current = true;
    setIsSubmitting(true);

    try {
      if (mode === "signup") {
        // Password confirmation check
        if (formData.password !== formData.confirmPassword) {
          setError("Passwords do not match");
          return;
        }

        const { user, error: signUpError } = await signUp(
          formData.email,
          formData.password,
          {
            data: {
              full_name: formData.fullName,
            },
          }
        );

        if (signUpError) {
          setError(signUpError.message);
        } else if (user) {
          setSuccess(
            "Account created successfully! Please check your email to verify your account."
          );
        }
      } else {
        const { user, error: signInError } = await signIn(
          formData.email,
          formData.password
        );

        if (signInError) {
          setError(signInError.message);
        } else if (user) {
          // Success - use router for proper redirect
          console.log("Sign in successful, user:", user);
          console.log("Redirecting to:", redirectUrl);

          // Small delay to ensure auth context updates
          setTimeout(() => {
            console.log("Executing redirect...");
            window.location.href = redirectUrl;
          }, 500);
          return; // Don't reset submission state on success redirect
        } else {
          console.log("Sign in response - no user and no error");
          setError("Invalid credentials. Please try again.");
        }
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error("[AuthFormFixed] Error:", err);
    } finally {
      // Reset submission state
      submissionRef.current = false;
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    const newMode = mode === "signin" ? "signup" : "signin";
    onModeChange?.(newMode);

    // Reset form state
    setError(null);
    setSuccess(null);
    setFormData({
      email: "",
      password: "",
      confirmPassword: "",
      fullName: "",
    });
    submissionRef.current = false;
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {mode === "signup" && (
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-foreground font-medium">
              Full Name *
            </Label>
            <div className="relative">
              <User className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
              <Input
                id="fullName"
                type="text"
                autoComplete="name"
                value={formData.fullName}
                onChange={e => handleInputChange("fullName", e.target.value)}
                placeholder="Enter your full name"
                className="h-12 pl-10"
                disabled={actuallyLoading}
                required
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email" className="text-foreground font-medium">
            Email Address *
          </Label>
          <div className="relative">
            <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={e => handleInputChange("email", e.target.value)}
              placeholder="Enter your email address"
              className="h-12 pl-10"
              disabled={actuallyLoading}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-foreground font-medium">
            Password *
          </Label>
          <div className="relative">
            <Lock className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              value={formData.password}
              onChange={e => handleInputChange("password", e.target.value)}
              placeholder="Enter your password"
              className="h-12 pr-10 pl-10"
              disabled={actuallyLoading}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transform"
              disabled={actuallyLoading}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {mode === "signup" && (
          <div className="space-y-2">
            <Label
              htmlFor="confirmPassword"
              className="text-foreground font-medium"
            >
              Confirm Password *
            </Label>
            <div className="relative">
              <Lock className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={e =>
                  handleInputChange("confirmPassword", e.target.value)
                }
                placeholder="Confirm your password"
                className="h-12 pr-10 pl-10"
                disabled={actuallyLoading}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transform"
                disabled={actuallyLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">
              {success}
            </AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          className="h-12 w-full text-base font-semibold"
          disabled={actuallyLoading || !isFormValid()}
        >
          {actuallyLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {mode === "signin" ? "Signing In..." : "Creating Account..."}
            </>
          ) : mode === "signin" ? (
            "Sign In to Your Account"
          ) : (
            "Create Your Account"
          )}
        </Button>
      </form>

      <div className="text-center">
        <button
          type="button"
          onClick={toggleMode}
          className="text-muted-foreground hover:text-primary font-medium"
          disabled={actuallyLoading}
        >
          {mode === "signin"
            ? "Don't have an account? Create one"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
};
