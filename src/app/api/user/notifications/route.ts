import { NextRequest, NextResponse } from "next/server";
import {
  withApiAuth,
  createSuccessResponse,
  type AuthContext,
} from "@/lib/auth/withApiAuth-definitive";

interface NotificationPreferencesRequest {
  // Email notifications
  emailEnabled?: boolean;
  emailMarketing?: boolean;
  emailUpdates?: boolean;
  emailReports?: boolean;
  emailTeamInvites?: boolean;
  emailMentions?: boolean;
  // In-app notifications
  inAppEnabled?: boolean;
  inAppUpdates?: boolean;
  inAppReports?: boolean;
  inAppTeamActivity?: boolean;
  inAppMentions?: boolean;
  // Frequency settings
  reportFrequency?: "immediate" | "daily" | "weekly" | "monthly";
  digestFrequency?: "immediate" | "daily" | "weekly";
  // Category settings
  contentNotifications?: boolean;
  analyticsNotifications?: boolean;
  competitorNotifications?: boolean;
  systemNotifications?: boolean;
}

// GET /api/user/notifications - Get notification preferences
export const GET = withApiAuth(
  async (request: NextRequest, context: AuthContext) => {
    try {
      const { data: preferences, error } = await context.supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", context.user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Failed to fetch notification preferences:", error);
        return NextResponse.json(
          {
            error: "Failed to fetch notification preferences",
            code: "DATABASE_ERROR",
          },
          { status: 500 }
        );
      }

      // Return default preferences if none exist
      const defaultPreferences = {
        user_id: context.user.id,
        email_enabled: true,
        email_marketing: false,
        email_updates: true,
        email_reports: true,
        email_team_invites: true,
        email_mentions: true,
        in_app_enabled: true,
        in_app_updates: true,
        in_app_reports: true,
        in_app_team_activity: true,
        in_app_mentions: true,
        report_frequency: "weekly",
        digest_frequency: "daily",
        content_notifications: true,
        analytics_notifications: true,
        competitor_notifications: true,
        system_notifications: true,
      };

      return createSuccessResponse({
        preferences: preferences || defaultPreferences,
      });
    } catch (error) {
      console.error("Failed to get notification preferences:", error);
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

// PUT /api/user/notifications - Update notification preferences
export const PUT = withApiAuth(
  async (request: NextRequest, context: AuthContext) => {
    try {
      const body: NotificationPreferencesRequest = await request.json();
      const updates: Record<string, any> = {};

      // Map camelCase to snake_case
      const fieldMappings: Record<string, string> = {
        emailEnabled: "email_enabled",
        emailMarketing: "email_marketing",
        emailUpdates: "email_updates",
        emailReports: "email_reports",
        emailTeamInvites: "email_team_invites",
        emailMentions: "email_mentions",
        inAppEnabled: "in_app_enabled",
        inAppUpdates: "in_app_updates",
        inAppReports: "in_app_reports",
        inAppTeamActivity: "in_app_team_activity",
        inAppMentions: "in_app_mentions",
        reportFrequency: "report_frequency",
        digestFrequency: "digest_frequency",
        contentNotifications: "content_notifications",
        analyticsNotifications: "analytics_notifications",
        competitorNotifications: "competitor_notifications",
        systemNotifications: "system_notifications",
      };

      // Validate and prepare updates
      Object.entries(body).forEach(([key, value]) => {
        const dbField = fieldMappings[key];
        if (dbField && value !== undefined) {
          updates[dbField] = value;
        }
      });

      if (Object.keys(updates).length === 0) {
        return NextResponse.json(
          {
            error: "No valid fields to update",
            code: "INVALID_REQUEST",
          },
          { status: 400 }
        );
      }

      // Validate frequency values
      if (
        updates.report_frequency &&
        !["immediate", "daily", "weekly", "monthly"].includes(
          updates.report_frequency
        )
      ) {
        return NextResponse.json(
          {
            error: "Invalid report frequency",
            code: "VALIDATION_ERROR",
          },
          { status: 400 }
        );
      }

      if (
        updates.digest_frequency &&
        !["immediate", "daily", "weekly"].includes(updates.digest_frequency)
      ) {
        return NextResponse.json(
          {
            error: "Invalid digest frequency",
            code: "VALIDATION_ERROR",
          },
          { status: 400 }
        );
      }

      // Upsert notification preferences
      const { data: preferences, error: updateError } = await context.supabase
        .from("notification_preferences")
        .upsert({
          user_id: context.user.id,
          ...updates,
        })
        .select()
        .single();

      if (updateError) {
        console.error(
          "Failed to update notification preferences:",
          updateError
        );
        return NextResponse.json(
          {
            error: "Failed to update preferences",
            code: "DATABASE_ERROR",
            details: updateError.message,
          },
          { status: 500 }
        );
      }

      return createSuccessResponse({
        message: "Notification preferences updated successfully",
        preferences,
      });
    } catch (error) {
      console.error("Failed to update notification preferences:", error);
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
