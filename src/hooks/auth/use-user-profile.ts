"use client";

/**
 * User Profile Hook
 * Manages user profile data that extends Supabase Auth
 */

import { useState, useEffect, useCallback } from "react";

import { useSupabaseAuth } from "./use-supabase-auth";
import { supabase } from "@/lib/supabase/client";

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  notification_preferences?: {
    email_notifications: boolean;
    push_notifications: boolean;
    marketing_emails: boolean;
    weekly_digest: boolean;
  };
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

interface UpdateProfileParams {
  full_name?: string;
  avatar_url?: string;
  notification_preferences?: UserProfile["notification_preferences"];
}

interface UploadAvatarResult {
  avatarUrl: string | null;
  error: string | null;
}

export const useUserProfile = () => {
  const { user, isAuthenticated } = useSupabaseAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load profile from auth.users metadata and any extended profile data
  const loadProfile = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Get user metadata from Supabase Auth
      const { data: authUser, error: authError } =
        await supabase.auth.getUser();

      if (authError) {
        setError(authError.message);
        return;
      }

      // Create profile from auth user data
      const userProfile: UserProfile = {
        id: authUser.user.id,
        email: authUser.user.email || "",
        full_name:
          authUser.user.user_metadata?.["full_name"] ||
          authUser.user.user_metadata?.["name"],
        avatar_url: authUser.user.user_metadata?.["avatar_url"],
        notification_preferences: authUser.user.user_metadata?.[
          "notification_preferences"
        ] || {
          email_notifications: true,
          push_notifications: false,
          marketing_emails: false,
          weekly_digest: true,
        },
        onboarding_completed:
          authUser.user.user_metadata?.["onboarding_completed"] || false,
        created_at: authUser.user.created_at,
        updated_at: authUser.user.updated_at || authUser.user.created_at,
      };

      setProfile(userProfile);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load profile";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load user profile when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      loadProfile();
    } else {
      setProfile(null);
    }
  }, [isAuthenticated, user, loadProfile]);

  // Update user profile
  const updateProfile = async (
    updates: UpdateProfileParams
  ): Promise<{ success: boolean; error: string | null }> => {
    if (!user) {
      return { success: false, error: "User must be authenticated" };
    }

    setLoading(true);
    setError(null);

    try {
      // Update user metadata in Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          ...updates,
        },
      });

      if (updateError) {
        setError(updateError.message);
        return { success: false, error: updateError.message };
      }

      // Reload profile to reflect changes
      await loadProfile();

      return { success: true, error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update profile";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Upload avatar image
  const uploadAvatar = async (file: File): Promise<UploadAvatarResult> => {
    if (!user) {
      return { avatarUrl: null, error: "User must be authenticated" };
    }

    setLoading(true);
    setError(null);

    try {
      // Validate file
      if (!file.type.startsWith("image/")) {
        return { avatarUrl: null, error: "File must be an image" };
      }

      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        return { avatarUrl: null, error: "File size must be less than 5MB" };
      }

      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        setError(uploadError.message);
        return { avatarUrl: null, error: uploadError.message };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const avatarUrl = urlData.publicUrl;

      // Update user profile with new avatar URL
      const { success, error: updateError } = await updateProfile({
        avatar_url: avatarUrl,
      });

      if (!success) {
        return { avatarUrl: null, error: updateError };
      }

      return { avatarUrl, error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to upload avatar";
      setError(errorMessage);
      return { avatarUrl: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Update notification preferences
  const updateNotificationPreferences = async (
    preferences: UserProfile["notification_preferences"]
  ): Promise<{ success: boolean; error: string | null }> => {
    return updateProfile({ notification_preferences: preferences });
  };

  // Mark onboarding as completed
  const completeOnboarding = async (): Promise<{
    success: boolean;
    error: string | null;
  }> => {
    const result = await updateProfile({
      notification_preferences: {
        ...profile?.notification_preferences,
        onboarding_completed: true,
      } as UserProfile["notification_preferences"],
    });

    // Also update the local state
    if (result.success && profile) {
      setProfile({
        ...profile,
        onboarding_completed: true,
      });
    }

    return result;
  };

  // Delete user account
  const deleteAccount = async (): Promise<{
    success: boolean;
    error: string | null;
  }> => {
    if (!user) {
      return { success: false, error: "User must be authenticated" };
    }

    setLoading(true);
    setError(null);

    try {
      // Note: Actual user deletion should be handled server-side for security
      // This would typically call an edge function that handles:
      // 1. Data cleanup/anonymization
      // 2. User deletion from auth.users
      // For now, we'll just sign out the user

      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        setError(signOutError.message);
        return { success: false, error: signOutError.message };
      }

      return { success: true, error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete account";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return {
    // State
    profile,
    loading,
    error,

    // Computed
    isOnboardingCompleted: profile?.onboarding_completed || false,
    hasAvatar: !!profile?.avatar_url,
    displayName: profile?.full_name || profile?.email?.split("@")[0] || "User",

    // Methods
    loadProfile,
    updateProfile,
    uploadAvatar,
    updateNotificationPreferences,
    completeOnboarding,
    deleteAccount,

    // Helpers
    clearError: () => setError(null),
  };
};
