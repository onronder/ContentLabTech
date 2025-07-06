"use client";

/**
 * Simple Auth Hook - Failsafe Implementation
 * Clean auth state without complex loading management
 * No race conditions, no timeouts, no complex state
 */

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { AuthError } from "@supabase/supabase-js";

export const useSimpleAuth = () => {
  const [isLoading, setIsLoading] = useState(false);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      return {
        user: data.user,
        error,
      };
    } catch (_err) {
      return {
        user: null,
        error: {
          message: "An unexpected error occurred",
        } as AuthError,
      };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    options?: { data?: Record<string, unknown> }
  ) => {
    setIsLoading(true);

    try {
      const signUpData: {
        email: string;
        password: string;
        options?: { data?: object };
      } = {
        email,
        password,
      };

      if (options) {
        signUpData.options = options;
      }

      const { data, error } = await supabase.auth.signUp(signUpData);

      return {
        user: data.user,
        error,
      };
    } catch (_err) {
      return {
        user: null,
        error: {
          message: "An unexpected error occurred",
        } as AuthError,
      };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    signIn,
    signUp,
    loading: isLoading,
  };
};
