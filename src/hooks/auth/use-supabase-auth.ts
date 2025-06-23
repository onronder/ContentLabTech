"use client";

/**
 * Supabase Auth Hook
 * Core authentication state management using Supabase Auth
 */

import { useAuth } from "@/lib/auth/context";

export const useSupabaseAuth = () => {
  const {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    resetPassword,
  } = useAuth();

  return {
    // State
    user,
    session,
    loading,
    isAuthenticated: !!user,

    // Methods
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    resetPassword,
  };
};
