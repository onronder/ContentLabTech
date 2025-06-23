"use client";

/**
 * NotificationPreferences Component
 * Manage user notification settings
 */

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

import { useUserProfile } from "@/hooks/auth/use-user-profile";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const NotificationPreferences = () => {
  const { profile, loading, error, updateNotificationPreferences, clearError } =
    useUserProfile();

  const [preferences, setPreferences] = useState({
    email_notifications: true,
    push_notifications: false,
    marketing_emails: false,
    weekly_digest: true,
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Initialize preferences from profile
  useEffect(() => {
    if (profile?.notification_preferences) {
      setPreferences(profile.notification_preferences);
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    const { success, error: updateError } =
      await updateNotificationPreferences(preferences);

    if (updateError) {
      // Error is handled by the hook
    } else if (success) {
      // Success - preferences updated
    }

    setIsUpdating(false);
  };

  const handlePreferenceChange = (key: string, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    clearError();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Manage how you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-48 animate-pulse rounded bg-gray-200" />
                </div>
                <div className="h-6 w-10 animate-pulse rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Choose how you want to receive notifications about your content and
          team activities
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-6">
            {/* Email Notifications */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label
                  htmlFor="email-notifications"
                  className="text-sm font-medium"
                >
                  Email Notifications
                </Label>
                <p className="text-muted-foreground text-sm">
                  Receive important updates and alerts via email
                </p>
              </div>
              <Switch
                id="email-notifications"
                checked={preferences.email_notifications}
                onCheckedChange={checked =>
                  handlePreferenceChange("email_notifications", checked)
                }
                disabled={isUpdating}
              />
            </div>

            {/* Push Notifications */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label
                  htmlFor="push-notifications"
                  className="text-sm font-medium"
                >
                  Push Notifications
                </Label>
                <p className="text-muted-foreground text-sm">
                  Get instant notifications in your browser
                </p>
              </div>
              <Switch
                id="push-notifications"
                checked={preferences.push_notifications}
                onCheckedChange={checked =>
                  handlePreferenceChange("push_notifications", checked)
                }
                disabled={isUpdating}
              />
            </div>

            {/* Marketing Emails */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label
                  htmlFor="marketing-emails"
                  className="text-sm font-medium"
                >
                  Marketing Emails
                </Label>
                <p className="text-muted-foreground text-sm">
                  Receive updates about new features and content marketing tips
                </p>
              </div>
              <Switch
                id="marketing-emails"
                checked={preferences.marketing_emails}
                onCheckedChange={checked =>
                  handlePreferenceChange("marketing_emails", checked)
                }
                disabled={isUpdating}
              />
            </div>

            {/* Weekly Digest */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="weekly-digest" className="text-sm font-medium">
                  Weekly Digest
                </Label>
                <p className="text-muted-foreground text-sm">
                  Get a weekly summary of your content performance and
                  recommendations
                </p>
              </div>
              <Switch
                id="weekly-digest"
                checked={preferences.weekly_digest}
                onCheckedChange={checked =>
                  handlePreferenceChange("weekly_digest", checked)
                }
                disabled={isUpdating}
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Preferences"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
