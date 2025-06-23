"use client";

/**
 * Profile Page
 * User profile management page
 */

import { AppLayout } from "@/components/layout";
import {
  ProfileForm,
  NotificationPreferences,
  AccountSettings,
} from "@/components/profile";

export const dynamic = "force-dynamic";

export default function ProfilePage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">
            Manage your personal information, preferences, and account settings.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="space-y-8">
            <ProfileForm />
            <NotificationPreferences />
          </div>

          <div>
            <AccountSettings />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
