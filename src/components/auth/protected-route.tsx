"use client";

/**
 * ProtectedRoute Component
 * Route protection using Supabase Auth state
 */

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/lib/auth/context";
import { AuthLoading } from "./auth-loading";

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
  requireTeam?: boolean;
}

export const ProtectedRoute = ({
  children,
  fallback,
  redirectTo = "/auth/signin",
}: ProtectedRouteProps) => {
  const { loading, user } = useAuth();
  const isAuthenticated = !!user;
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [loading, isAuthenticated, router, redirectTo]);

  // Show loading state while auth is being determined
  if (loading) {
    return fallback || <AuthLoading message="Checking authentication..." />;
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return fallback || <AuthLoading message="Redirecting..." />;
  }

  // Render protected content if authenticated
  return <>{children}</>;
};
