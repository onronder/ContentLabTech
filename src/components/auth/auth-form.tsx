"use client";

/**
 * Premium AuthForm Component
 * Enhanced authentication form with progressive validation and modern design
 * Phase 1.1: Added comprehensive debugging and loading state improvements
 */

import { useState, useEffect, useCallback } from "react";
import { Eye, EyeOff, Mail, Lock, Loader2, Check, X, User } from "lucide-react";

import { useSupabaseAuth } from "@/hooks/auth/use-supabase-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { AuthDebugPanel } from "./auth-debug-panel";

interface FieldValidation {
  isValid: boolean;
  errors: string[];
}

interface AuthFormProps {
  mode?: "signin" | "signup";
  onModeChange?: (mode: "signin" | "signup") => void;
  redirectUrl?: string;
}

// Development debugging helper
const isDevelopment = process.env.NODE_ENV === "development";

const debugLog = (message: string, data?: any) => {
  if (isDevelopment) {
    console.log(`[AuthForm Debug] ${message}`, data);
  }
};

export const AuthForm = ({
  mode = "signin",
  onModeChange,
  redirectUrl = "/dashboard",
}: AuthFormProps) => {
  const { signIn, signUp, loading: authLoading } = useSupabaseAuth();
  const [formLoading, setFormLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{
    authLoading: boolean;
    formLoading: boolean;
    inputsDisabled: boolean;
    lastUpdate: string;
  }>({
    authLoading: false,
    formLoading: false,
    inputsDisabled: false,
    lastUpdate: new Date().toISOString(),
  });

  // Simplified loading state management
  const updateLoadingState = useCallback(
    (newFormLoading: boolean, source: string) => {
      debugLog(`Loading state change from ${source}`, {
        oldFormLoading: formLoading,
        newFormLoading,
        authLoading,
      });
      setFormLoading(newFormLoading);
    },
    [formLoading, authLoading]
  );

  // Simplified safety mechanism: shorter timeout, immediate reset
  useEffect(() => {
    if (formLoading) {
      const timeout = setTimeout(() => {
        console.warn("[AuthForm] Form loading timeout - resetting");
        setFormLoading(false);
      }, 5000); // Reduced to 5 seconds

      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [formLoading]);

  // Simplified debug info updater
  useEffect(() => {
    const inputsDisabled = authLoading || formLoading;
    setDebugInfo({
      authLoading,
      formLoading,
      inputsDisabled,
      lastUpdate: new Date().toISOString(),
    });
  }, [authLoading, formLoading]);

  // Immediate loading state reset on mount
  useEffect(() => {
    setFormLoading(false);
  }, []);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldValidation, setFieldValidation] = useState<
    Record<string, FieldValidation>
  >({});
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isFormValid, setIsFormValid] = useState(false);

  // Validation rules
  const validationRules = {
    email: [
      {
        test: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        message: "Please enter a valid email address",
      },
    ],
    password: [
      {
        test: (value: string) => value.length >= 8,
        message: "Password must be at least 8 characters long",
      },
      {
        test: (value: string) => /[A-Z]/.test(value),
        message: "Password must contain at least one uppercase letter",
      },
      {
        test: (value: string) => /[a-z]/.test(value),
        message: "Password must contain at least one lowercase letter",
      },
      {
        test: (value: string) => /\d/.test(value),
        message: "Password must contain at least one number",
      },
    ],
    fullName: [
      {
        test: (value: string) => value.trim().length >= 2,
        message: "Full name must be at least 2 characters long",
      },
    ],
  };

  // Calculate password strength
  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/\d/.test(password)) strength += 15;
    if (/[^A-Za-z0-9]/.test(password)) strength += 10;
    return Math.min(strength, 100);
  };

  // Validate field
  const validateField = (field: string, value: string): FieldValidation => {
    try {
      const rules = validationRules[field as keyof typeof validationRules];
      if (!rules) return { isValid: true, errors: [] };

      const errors: string[] = [];
      rules.forEach(rule => {
        if (!rule.test(value)) {
          errors.push(rule.message);
        }
      });

      return { isValid: errors.length === 0, errors };
    } catch (error) {
      console.error("[AuthForm] Error in validateField:", error);
      return { isValid: true, errors: [] };
    }
  };

  // Enhanced input change handler with error protection
  const handleInputChange = useCallback(
    (field: string, value: string) => {
      try {
        debugLog(`Input change for ${field}`, {
          value: value.substring(0, 10) + "...",
        });

        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);

        // Only validate after user has typed something substantial
        if (value.length > 0) {
          const validation = validateField(field, value);
          setFieldValidation(prev => ({ ...prev, [field]: validation }));

          // Calculate password strength
          if (field === "password") {
            setPasswordStrength(calculatePasswordStrength(value));
          }

          // Validate confirm password
          if (field === "confirmPassword" || field === "password") {
            const passwordValue =
              field === "password" ? value : formData.password;
            const confirmValue =
              field === "confirmPassword" ? value : formData.confirmPassword;

            if (mode === "signup" && confirmValue) {
              const isMatching = passwordValue === confirmValue;
              setFieldValidation(prev => ({
                ...prev,
                confirmPassword: {
                  isValid: isMatching,
                  errors: isMatching ? [] : ["Passwords do not match"],
                },
              }));
            }
          }
        } else {
          // Clear validation for empty fields
          setFieldValidation(prev => ({
            ...prev,
            [field]: { isValid: true, errors: [] },
          }));
        }
      } catch (error) {
        console.error("[AuthForm] Error in handleInputChange:", error);
        // Don't block input on validation errors
      }
    },
    [formData, mode]
  );

  // Simplified form validity check
  useEffect(() => {
    const requiredFields =
      mode === "signup"
        ? ["email", "password", "confirmPassword", "fullName"]
        : ["email", "password"];

    // Basic validation: just check if required fields have values
    const isValid = requiredFields.every(field => {
      const value = formData[field as keyof typeof formData];
      return value && value.trim() !== "";
    });

    setIsFormValid(isValid);
  }, [formData, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    updateLoadingState(true, "form-submit");

    debugLog("Form submission started", { mode, isFormValid });

    if (!isFormValid) {
      setError("Please fix all validation errors before submitting");
      updateLoadingState(false, "validation-error");
      return;
    }

    try {
      if (mode === "signup") {
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
          debugLog("Sign up error", signUpError);
        } else if (user) {
          setSuccess(
            "Account created successfully! Please check your email to verify your account."
          );
          debugLog("Sign up success", { userId: user.id });
        }
      } else {
        const { user, error: signInError } = await signIn(
          formData.email,
          formData.password
        );

        if (signInError) {
          setError(signInError.message);
          debugLog("Sign in error", signInError);
        } else if (user) {
          debugLog("Sign in success", { userId: user.id });
          window.location.href = redirectUrl;
        }
      }
    } catch (err) {
      const errorMessage = "An unexpected error occurred. Please try again.";
      setError(errorMessage);
      console.error("[AuthForm] Auth error:", err);
      debugLog("Unexpected auth error", err);
    } finally {
      updateLoadingState(false, "form-submit-complete");
    }
  };

  const toggleMode = () => {
    const newMode = mode === "signin" ? "signup" : "signin";
    debugLog("Mode toggle", { from: mode, to: newMode });
    onModeChange?.(newMode);
    setError(null);
    setSuccess(null);
    setFormData({
      email: "",
      password: "",
      confirmPassword: "",
      fullName: "",
    });
    setFieldValidation({});
    setPasswordStrength(0);
    updateLoadingState(false, "mode-toggle");
  };

  // Get password strength color and label
  const getPasswordStrengthInfo = (strength: number) => {
    if (strength < 25) return { color: "bg-error-500", label: "Weak" };
    if (strength < 50) return { color: "bg-warning-500", label: "Fair" };
    if (strength < 75) return { color: "bg-brand-amber", label: "Good" };
    return { color: "bg-success-500", label: "Strong" };
  };

  const passwordStrengthInfo = getPasswordStrengthInfo(passwordStrength);

  // Calculate if inputs should be disabled
  const inputsDisabled = authLoading || formLoading;

  return (
    <div className="space-y-6">
      {/* Enhanced Debug Panel */}
      <AuthDebugPanel
        formLoading={formLoading}
        inputsDisabled={inputsDisabled}
        isFormValid={isFormValid}
        formData={formData}
        className="mb-4"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {mode === "signup" && (
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-foreground font-medium">
              Full Name *
            </Label>
            <div className="group relative">
              <User className="text-muted-foreground group-focus-within:text-brand-blue pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 transform transition-colors" />
              <Input
                id="fullName"
                type="text"
                autoComplete="name"
                value={formData.fullName}
                onChange={e => handleInputChange("fullName", e.target.value)}
                placeholder="Enter your full name"
                className={`relative z-20 h-12 border-2 pl-10 transition-all duration-200 ${
                  fieldValidation["fullName"]?.isValid === false
                    ? "border-error-500 focus:border-error-500"
                    : formData.fullName && fieldValidation["fullName"]?.isValid
                      ? "border-success-500 focus:border-success-500"
                      : "border-border focus:border-brand-blue"
                }`}
                disabled={inputsDisabled}
              />
              {formData.fullName && fieldValidation["fullName"]?.isValid && (
                <Check className="text-success-500 pointer-events-none absolute top-1/2 right-3 z-10 h-4 w-4 -translate-y-1/2 transform" />
              )}
            </div>
            {fieldValidation["fullName"]?.errors.map((error, index) => (
              <p
                key={index}
                className="text-error-500 flex items-center text-xs"
              >
                <X className="mr-1 h-3 w-3" />
                {error}
              </p>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email" className="text-foreground font-medium">
            Email Address *
          </Label>
          <div className="group relative">
            <Mail className="text-muted-foreground group-focus-within:text-brand-blue pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 transform transition-colors" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={e => handleInputChange("email", e.target.value)}
              placeholder="Enter your email address"
              className={`relative z-20 h-12 border-2 pl-10 transition-all duration-200 ${
                fieldValidation["email"]?.isValid === false
                  ? "border-error-500 focus:border-error-500"
                  : formData.email && fieldValidation["email"]?.isValid
                    ? "border-success-500 focus:border-success-500"
                    : "border-border focus:border-brand-blue"
              }`}
              disabled={inputsDisabled}
            />
            {formData.email && fieldValidation["email"]?.isValid && (
              <Check className="text-success-500 pointer-events-none absolute top-1/2 right-3 z-10 h-4 w-4 -translate-y-1/2 transform" />
            )}
          </div>
          {fieldValidation["email"]?.errors.map((error, index) => (
            <p key={index} className="text-error-500 flex items-center text-xs">
              <X className="mr-1 h-3 w-3" />
              {error}
            </p>
          ))}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-foreground font-medium">
            Password *
          </Label>
          <div className="group relative">
            <Lock className="text-muted-foreground group-focus-within:text-brand-blue pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 transform transition-colors" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              value={formData.password}
              onChange={e => handleInputChange("password", e.target.value)}
              placeholder="Enter your password"
              className={`relative z-20 h-12 border-2 pr-10 pl-10 transition-all duration-200 ${
                fieldValidation["password"]?.isValid === false
                  ? "border-error-500 focus:border-error-500"
                  : formData.password && fieldValidation["password"]?.isValid
                    ? "border-success-500 focus:border-success-500"
                    : "border-border focus:border-brand-blue"
              }`}
              disabled={inputsDisabled}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 z-30 -translate-y-1/2 transform transition-colors"
              disabled={inputsDisabled}
              style={{ pointerEvents: inputsDisabled ? "none" : "auto" }}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          {mode === "signup" && formData.password && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Password strength</span>
                <span
                  className={`font-medium ${
                    passwordStrength < 25
                      ? "text-error-500"
                      : passwordStrength < 50
                        ? "text-warning-500"
                        : passwordStrength < 75
                          ? "text-brand-amber"
                          : "text-success-500"
                  }`}
                >
                  {passwordStrengthInfo.label}
                </span>
              </div>
              <Progress value={passwordStrength} className="h-2" />
            </div>
          )}

          {fieldValidation["password"]?.errors.map((error, index) => (
            <p key={index} className="text-error-500 flex items-center text-xs">
              <X className="mr-1 h-3 w-3" />
              {error}
            </p>
          ))}
        </div>

        {mode === "signup" && (
          <div className="space-y-2">
            <Label
              htmlFor="confirmPassword"
              className="text-foreground font-medium"
            >
              Confirm Password *
            </Label>
            <div className="group relative">
              <Lock className="text-muted-foreground group-focus-within:text-brand-blue pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 transform transition-colors" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={e =>
                  handleInputChange("confirmPassword", e.target.value)
                }
                placeholder="Confirm your password"
                className={`relative z-20 h-12 border-2 pr-10 pl-10 transition-all duration-200 ${
                  fieldValidation["confirmPassword"]?.isValid === false
                    ? "border-error-500 focus:border-error-500"
                    : formData.confirmPassword &&
                        fieldValidation["confirmPassword"]?.isValid
                      ? "border-success-500 focus:border-success-500"
                      : "border-border focus:border-brand-blue"
                }`}
                disabled={inputsDisabled}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 z-30 -translate-y-1/2 transform transition-colors"
                disabled={inputsDisabled}
                style={{ pointerEvents: inputsDisabled ? "none" : "auto" }}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
              {formData.confirmPassword &&
                fieldValidation["confirmPassword"]?.isValid && (
                  <Check className="text-success-500 absolute top-1/2 right-10 h-4 w-4 -translate-y-1/2 transform" />
                )}
            </div>
            {fieldValidation["confirmPassword"]?.errors.map((error, index) => (
              <p
                key={index}
                className="text-error-500 flex items-center text-xs"
              >
                <X className="mr-1 h-3 w-3" />
                {error}
              </p>
            ))}
          </div>
        )}

        {error && (
          <Alert
            variant="destructive"
            className="border-error-500 bg-error-50 dark:bg-error-950"
          >
            <X className="h-4 w-4" />
            <AlertDescription className="text-error-700 dark:text-error-300">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-success-500 bg-success-50 dark:bg-success-950">
            <Check className="text-success-600 h-4 w-4" />
            <AlertDescription className="text-success-700 dark:text-success-300">
              {success}
            </AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          className={`h-12 w-full text-base font-semibold transition-all duration-200 ${
            isFormValid && !inputsDisabled
              ? "bg-gradient-primary transform hover:scale-[1.02] hover:opacity-90"
              : ""
          }`}
          disabled={inputsDisabled || !isFormValid}
        >
          {inputsDisabled ? (
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
          className="text-muted-foreground hover:text-brand-blue font-medium transition-colors"
          disabled={inputsDisabled}
        >
          {mode === "signin"
            ? "Don't have an account? Create one"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
};
