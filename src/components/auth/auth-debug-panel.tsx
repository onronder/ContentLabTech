"use client";

/**
 * Auth Debug Panel Component
 * Development-only component for diagnosing authentication and form issues
 */

import { useState, useEffect } from "react";
import { AlertCircle, RefreshCw, Settings, Eye, EyeOff } from "lucide-react";

import { useAuth } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AuthDebugPanelProps {
  formLoading?: boolean;
  inputsDisabled?: boolean;
  isFormValid?: boolean;
  formData?: Record<string, any>;
  className?: string;
}

export const AuthDebugPanel = ({
  formLoading = false,
  inputsDisabled = false,
  isFormValid = false,
  formData = {},
  className = "",
}: AuthDebugPanelProps) => {
  const { loading: authLoading, getDebugInfo, resetAuthState } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [debugInfo, setDebugInfo] = useState<Record<string, any>>({});

  // Only show in development
  const isDevelopment = process.env.NODE_ENV === "development";

  useEffect(() => {
    if (isDevelopment && getDebugInfo) {
      setDebugInfo(getDebugInfo());
    }
  }, [isDevelopment, getDebugInfo, authLoading, formLoading]);

  // Auto-refresh debug info
  useEffect(() => {
    if (!isDevelopment) return;

    const interval = setInterval(() => {
      if (getDebugInfo) {
        setDebugInfo(getDebugInfo());
      }
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [isDevelopment, getDebugInfo]);

  if (!isDevelopment) {
    return null;
  }

  const handleResetAuth = () => {
    if (resetAuthState) {
      resetAuthState();
    }
  };

  const handleRefreshDebugInfo = () => {
    if (getDebugInfo) {
      setDebugInfo(getDebugInfo());
    }
  };

  const getStatusColor = (isTrue: boolean) => {
    return isTrue ? "text-red-600 font-bold" : "text-green-600";
  };

  const getStatusText = (isTrue: boolean) => {
    return isTrue ? "TRUE" : "false";
  };

  return (
    <div
      className={`rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 p-4 dark:bg-blue-950 ${className}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-blue-800 dark:text-blue-200">
            Auth Debug Panel (Development Only)
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefreshDebugInfo}
            className="h-8 px-2"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 px-2"
          >
            {isExpanded ? (
              <EyeOff className="h-3 w-3" />
            ) : (
              <Eye className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Critical Status Overview */}
      <div className="mb-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
        <div className="rounded border bg-white p-2 dark:bg-gray-800">
          <div className="font-medium text-gray-700 dark:text-gray-300">
            Auth Loading
          </div>
          <div className={getStatusColor(authLoading)}>
            {getStatusText(authLoading)}
          </div>
        </div>
        <div className="rounded border bg-white p-2 dark:bg-gray-800">
          <div className="font-medium text-gray-700 dark:text-gray-300">
            Form Loading
          </div>
          <div className={getStatusColor(formLoading)}>
            {getStatusText(formLoading)}
          </div>
        </div>
        <div className="rounded border bg-white p-2 dark:bg-gray-800">
          <div className="font-medium text-gray-700 dark:text-gray-300">
            Inputs Disabled
          </div>
          <div className={getStatusColor(inputsDisabled)}>
            {getStatusText(inputsDisabled)}
          </div>
        </div>
        <div className="rounded border bg-white p-2 dark:bg-gray-800">
          <div className="font-medium text-gray-700 dark:text-gray-300">
            Form Valid
          </div>
          <div className={getStatusColor(!isFormValid)}>
            {getStatusText(isFormValid)}
          </div>
        </div>
      </div>

      {/* Warning for stuck states */}
      {(authLoading || formLoading) && (
        <Alert className="mb-4 border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            <div className="flex items-center justify-between">
              <span>
                Loading state detected! This might be blocking input fields.
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleResetAuth}
                className="ml-2 h-7 px-2 text-xs"
              >
                Reset Auth State
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Expanded Debug Info */}
      {isExpanded && (
        <div className="space-y-3">
          <div className="rounded border bg-white p-3 dark:bg-gray-800">
            <h4 className="mb-2 font-medium text-gray-700 dark:text-gray-300">
              Auth Context Debug Info
            </h4>
            <pre className="max-h-32 overflow-auto text-xs text-gray-600 dark:text-gray-400">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>

          {Object.keys(formData).length > 0 && (
            <div className="rounded border bg-white p-3 dark:bg-gray-800">
              <h4 className="mb-2 font-medium text-gray-700 dark:text-gray-300">
                Form Data
              </h4>
              <pre className="max-h-32 overflow-auto text-xs text-gray-600 dark:text-gray-400">
                {JSON.stringify(
                  Object.fromEntries(
                    Object.entries(formData).map(([key, value]) => [
                      key,
                      typeof value === "string" && key.includes("password")
                        ? "***hidden***"
                        : value,
                    ])
                  ),
                  null,
                  2
                )}
              </pre>
            </div>
          )}

          <div className="rounded border bg-white p-3 dark:bg-gray-800">
            <h4 className="mb-2 font-medium text-gray-700 dark:text-gray-300">
              Environment Check
            </h4>
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <div>
                Supabase URL:{" "}
                {process.env["NEXT_PUBLIC_SUPABASE_URL"]
                  ? "✓ Set"
                  : "✗ Missing"}
              </div>
              <div>
                Supabase Key:{" "}
                {process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
                  ? "✓ Set"
                  : "✗ Missing"}
              </div>
              <div>Node Env: {process.env.NODE_ENV}</div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleResetAuth}
              className="h-8 px-3 text-xs"
            >
              <Settings className="mr-1 h-3 w-3" />
              Reset Auth State
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.location.reload()}
              className="h-8 px-3 text-xs"
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Reload Page
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
