import { NextRequest, NextResponse } from "next/server";
import {
  withApiAuth,
  createSuccessResponse,
  type AuthContext,
} from "@/lib/auth/withApiAuth-definitive";

interface ProfileUpdateRequest {
  displayName?: string;
  avatarUrl?: string;
  timezone?: string;
  locale?: string;
  theme?: string;
}

// GET /api/user/profile - Get user profile
export const GET = withApiAuth(
  async (request: NextRequest, context: AuthContext) => {
    try {
      // Get user preferences
      const { data: preferences, error: prefsError } = await context.supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", context.user.id)
        .single();

      if (prefsError && prefsError.code !== "PGRST116") {
        // PGRST116 means no rows found
        console.error("Failed to fetch user preferences:", prefsError);
        return NextResponse.json(
          {
            error: "Failed to fetch user preferences",
            code: "DATABASE_ERROR",
          },
          { status: 500 }
        );
      }

      // Get user data from auth.users
      const { data: authUser, error: authError } =
        await context.supabase.auth.getUser();

      if (authError) {
        console.error("Failed to fetch auth user:", authError);
        return NextResponse.json(
          {
            error: "Failed to fetch user data",
            code: "AUTH_ERROR",
          },
          { status: 500 }
        );
      }

      // Merge auth user data with preferences
      const profile = {
        id: context.user.id,
        email: context.user.email,
        displayName:
          preferences?.display_name || authUser.user.user_metadata?.name || "",
        avatarUrl:
          preferences?.avatar_url ||
          authUser.user.user_metadata?.avatar_url ||
          "",
        timezone: preferences?.timezone || "UTC",
        locale: preferences?.locale || "en",
        theme: preferences?.theme || "system",
        createdAt: authUser.user.created_at,
        updatedAt: preferences?.updated_at || authUser.user.created_at,
        emailVerified: authUser.user.email_confirmed_at !== null,
        provider: authUser.user.app_metadata?.provider || "email",
      };

      return createSuccessResponse(profile);
    } catch (error) {
      console.error("Failed to get user profile:", error);
      return NextResponse.json(
        {
          error: "Internal server error",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  }
);

// PUT /api/user/profile - Update user profile
export const PUT = withApiAuth(
  async (request: NextRequest, context: AuthContext) => {
    try {
      const body: ProfileUpdateRequest = await request.json();
      const updates: Record<string, any> = {};

      // Validate and prepare updates
      if (body.displayName !== undefined) {
        updates.display_name = body.displayName.trim();
      }
      if (body.avatarUrl !== undefined) {
        updates.avatar_url = body.avatarUrl;
      }
      if (body.timezone !== undefined) {
        updates.timezone = body.timezone;
      }
      if (body.locale !== undefined) {
        updates.locale = body.locale;
      }
      if (body.theme !== undefined) {
        updates.theme = body.theme;
      }

      if (Object.keys(updates).length === 0) {
        return NextResponse.json(
          {
            error: "No valid fields to update",
            code: "INVALID_REQUEST",
          },
          { status: 400 }
        );
      }

      // Upsert user preferences
      const { data: preferences, error: updateError } = await context.supabase
        .from("user_preferences")
        .upsert({
          user_id: context.user.id,
          ...updates,
        })
        .select()
        .single();

      if (updateError) {
        console.error("Failed to update user preferences:", updateError);
        return NextResponse.json(
          {
            error: "Failed to update preferences",
            code: "DATABASE_ERROR",
            details: updateError.message,
          },
          { status: 500 }
        );
      }

      // Update auth metadata if display name changed
      if (body.displayName !== undefined) {
        const { error: metaError } = await context.supabase.auth.updateUser({
          data: { name: body.displayName },
        });

        if (metaError) {
          console.error("Failed to update user metadata:", metaError);
        }
      }

      return createSuccessResponse({
        message: "Profile updated successfully",
        profile: {
          displayName: preferences.display_name,
          avatarUrl: preferences.avatar_url,
          timezone: preferences.timezone,
          locale: preferences.locale,
          theme: preferences.theme,
          updatedAt: preferences.updated_at,
        },
      });
    } catch (error) {
      console.error("Failed to update user profile:", error);
      return NextResponse.json(
        {
          error: "Internal server error",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  }
);

// DELETE /api/user/profile - Delete user account
export const DELETE = withApiAuth(
  async (request: NextRequest, context: AuthContext) => {
    try {
      // Delete user data (cascade will handle related records)
      const { error: deleteError } =
        await context.supabase.auth.admin.deleteUser(context.user.id);

      if (deleteError) {
        console.error("Failed to delete user account:", deleteError);
        return NextResponse.json(
          {
            error: "Failed to delete account",
            code: "DELETE_ERROR",
            details: deleteError.message,
          },
          { status: 500 }
        );
      }

      return createSuccessResponse({
        message: "Account deleted successfully",
      });
    } catch (error) {
      console.error("Failed to delete user account:", error);
      return NextResponse.json(
        {
          error: "Internal server error",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  }
);
