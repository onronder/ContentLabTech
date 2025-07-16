/**
 * API Authentication Context
 * Provides authentication error handling and user feedback
 */

"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useAuth } from "./context";
import { useRouter } from "next/navigation";

interface ApiAuthContextType {
  handleAuthError: (error: Error) => void;
  isAuthenticated: boolean;
  user: any;
}

const ApiAuthContext = createContext<ApiAuthContextType | undefined>(undefined);

export const useApiAuth = () => {
  const context = useContext(ApiAuthContext);
  if (!context) {
    throw new Error("useApiAuth must be used within an ApiAuthProvider");
  }
  return context;
};

interface ApiAuthProviderProps {
  children: ReactNode;
}

export const ApiAuthProvider: React.FC<ApiAuthProviderProps> = ({
  children,
}) => {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleAuthError = (error: Error) => {
    console.error("🔐 API Authentication Error:", error);

    // Check if it's an authentication error
    if (error.message.includes("Authentication required")) {
      // Show user-friendly message
      console.warn("🔐 User session expired or invalid - redirecting to login");

      // Optional: Show toast notification
      // toast.error("Your session has expired. Please log in again.");

      // Sign out user and redirect to login
      signOut();
      router.push("/auth/login");
    } else {
      // Handle other API errors
      console.error("🚨 API Error:", error);

      // Optional: Show generic error toast
      // toast.error("An error occurred. Please try again.");
    }
  };

  const value: ApiAuthContextType = {
    handleAuthError,
    isAuthenticated: !!user,
    user,
  };

  return (
    <ApiAuthContext.Provider value={value}>{children}</ApiAuthContext.Provider>
  );
};
