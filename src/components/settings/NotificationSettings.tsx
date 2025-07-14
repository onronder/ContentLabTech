"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  Mail,
  Smartphone,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NotificationPreferences {
  user_id: string;
  email_enabled: boolean;
  email_marketing: boolean;
  email_updates: boolean;
  email_reports: boolean;
  email_team_invites: boolean;
  email_mentions: boolean;
  in_app_enabled: boolean;
  in_app_updates: boolean;
  in_app_reports: boolean;
  in_app_team_activity: boolean;
  in_app_mentions: boolean;
  report_frequency: string;
  digest_frequency: string;
  content_notifications: boolean;
  analytics_notifications: boolean;
  competitor_notifications: boolean;
  system_notifications: boolean;
}

export const NotificationSettings: React.FC = () => {
  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load notification preferences
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/user/notifications");

      if (!response.ok) {
        throw new Error("Failed to load notification preferences");
      }

      const data = await response.json();
      setPreferences(data.data.preferences);
    } catch (err) {
      console.error("Failed to load preferences:", err);
      setError("Failed to load notification preferences");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preferences) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch("/api/user/notifications", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emailEnabled: preferences.email_enabled,
          emailMarketing: preferences.email_marketing,
          emailUpdates: preferences.email_updates,
          emailReports: preferences.email_reports,
          emailTeamInvites: preferences.email_team_invites,
          emailMentions: preferences.email_mentions,
          inAppEnabled: preferences.in_app_enabled,
          inAppUpdates: preferences.in_app_updates,
          inAppReports: preferences.in_app_reports,
          inAppTeamActivity: preferences.in_app_team_activity,
          inAppMentions: preferences.in_app_mentions,
          reportFrequency: preferences.report_frequency,
          digestFrequency: preferences.digest_frequency,
          contentNotifications: preferences.content_notifications,
          analyticsNotifications: preferences.analytics_notifications,
          competitorNotifications: preferences.competitor_notifications,
          systemNotifications: preferences.system_notifications,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update preferences");
      }

      setSuccess("Notification preferences updated successfully");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to update preferences:", err);
      setError(
        err instanceof Error ? err.message : "Failed to update preferences"
      );
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: any) => {
    if (!preferences) return;
    setPreferences({ ...preferences, [key]: value });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading preferences...</span>
        </CardContent>
      </Card>
    );
  }

  if (!preferences) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="mx-auto mb-4 h-8 w-8 text-red-500" />
          <p className="text-gray-600">
            Failed to load notification preferences
          </p>
          <Button onClick={loadPreferences} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bell className="h-5 w-5 text-blue-600" />
          <span>Notification Settings</span>
        </CardTitle>
        <CardDescription>
          Configure how and when you receive notifications
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Email Notifications */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Mail className="h-4 w-4 text-gray-600" />
            <h3 className="text-lg font-medium">Email Notifications</h3>
          </div>

          <div className="space-y-4 pl-6">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-enabled">
                  Enable Email Notifications
                </Label>
                <p className="text-sm text-gray-500">
                  Receive notifications via email
                </p>
              </div>
              <Switch
                id="email-enabled"
                checked={preferences.email_enabled}
                onCheckedChange={checked =>
                  updatePreference("email_enabled", checked)
                }
              />
            </div>

            {preferences.email_enabled && (
              <div className="ml-4 space-y-4 border-l-2 border-gray-100 pl-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Product Updates</Label>
                    <p className="text-sm text-gray-500">
                      New features and improvements
                    </p>
                  </div>
                  <Switch
                    checked={preferences.email_updates}
                    onCheckedChange={checked =>
                      updatePreference("email_updates", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Reports & Analytics</Label>
                    <p className="text-sm text-gray-500">
                      Performance reports and insights
                    </p>
                  </div>
                  <Switch
                    checked={preferences.email_reports}
                    onCheckedChange={checked =>
                      updatePreference("email_reports", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Team Invitations</Label>
                    <p className="text-sm text-gray-500">
                      When someone invites you to a team
                    </p>
                  </div>
                  <Switch
                    checked={preferences.email_team_invites}
                    onCheckedChange={checked =>
                      updatePreference("email_team_invites", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Mentions & Comments</Label>
                    <p className="text-sm text-gray-500">
                      When someone mentions you
                    </p>
                  </div>
                  <Switch
                    checked={preferences.email_mentions}
                    onCheckedChange={checked =>
                      updatePreference("email_mentions", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Marketing Communications</Label>
                    <p className="text-sm text-gray-500">
                      Tips, tutorials, and promotional content
                    </p>
                  </div>
                  <Switch
                    checked={preferences.email_marketing}
                    onCheckedChange={checked =>
                      updatePreference("email_marketing", checked)
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* In-App Notifications */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Smartphone className="h-4 w-4 text-gray-600" />
            <h3 className="text-lg font-medium">In-App Notifications</h3>
          </div>

          <div className="space-y-4 pl-6">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="in-app-enabled">
                  Enable In-App Notifications
                </Label>
                <p className="text-sm text-gray-500">
                  Show notifications within the app
                </p>
              </div>
              <Switch
                id="in-app-enabled"
                checked={preferences.in_app_enabled}
                onCheckedChange={checked =>
                  updatePreference("in_app_enabled", checked)
                }
              />
            </div>

            {preferences.in_app_enabled && (
              <div className="ml-4 space-y-4 border-l-2 border-gray-100 pl-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Product Updates</Label>
                    <p className="text-sm text-gray-500">
                      New features and improvements
                    </p>
                  </div>
                  <Switch
                    checked={preferences.in_app_updates}
                    onCheckedChange={checked =>
                      updatePreference("in_app_updates", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Reports & Analytics</Label>
                    <p className="text-sm text-gray-500">
                      Performance reports and insights
                    </p>
                  </div>
                  <Switch
                    checked={preferences.in_app_reports}
                    onCheckedChange={checked =>
                      updatePreference("in_app_reports", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Team Activity</Label>
                    <p className="text-sm text-gray-500">
                      Team member actions and updates
                    </p>
                  </div>
                  <Switch
                    checked={preferences.in_app_team_activity}
                    onCheckedChange={checked =>
                      updatePreference("in_app_team_activity", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Mentions & Comments</Label>
                    <p className="text-sm text-gray-500">
                      When someone mentions you
                    </p>
                  </div>
                  <Switch
                    checked={preferences.in_app_mentions}
                    onCheckedChange={checked =>
                      updatePreference("in_app_mentions", checked)
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Frequency Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Frequency Settings</h3>

          <div className="grid grid-cols-1 gap-4 pl-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Report Frequency</Label>
              <Select
                value={preferences.report_frequency}
                onValueChange={value =>
                  updatePreference("report_frequency", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Digest Frequency</Label>
              <Select
                value={preferences.digest_frequency}
                onValueChange={value =>
                  updatePreference("digest_frequency", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Category Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Notification Categories</h3>

          <div className="grid grid-cols-1 gap-4 pl-6 md:grid-cols-2">
            <div className="flex items-center justify-between">
              <div>
                <Label>Content Notifications</Label>
                <p className="text-sm text-gray-500">
                  Content creation and updates
                </p>
              </div>
              <Switch
                checked={preferences.content_notifications}
                onCheckedChange={checked =>
                  updatePreference("content_notifications", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Analytics Notifications</Label>
                <p className="text-sm text-gray-500">
                  Performance and metrics updates
                </p>
              </div>
              <Switch
                checked={preferences.analytics_notifications}
                onCheckedChange={checked =>
                  updatePreference("analytics_notifications", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Competitor Notifications</Label>
                <p className="text-sm text-gray-500">
                  Competitor analysis and insights
                </p>
              </div>
              <Switch
                checked={preferences.competitor_notifications}
                onCheckedChange={checked =>
                  updatePreference("competitor_notifications", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>System Notifications</Label>
                <p className="text-sm text-gray-500">
                  System status and maintenance
                </p>
              </div>
              <Switch
                checked={preferences.system_notifications}
                onCheckedChange={checked =>
                  updatePreference("system_notifications", checked)
                }
              />
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700">{success}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 border-t pt-4">
          <Button
            onClick={loadPreferences}
            variant="outline"
            disabled={loading || saving}
          >
            Reset
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
