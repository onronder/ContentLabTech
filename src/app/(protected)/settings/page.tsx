"use client";

/**
 * Settings Page
 * User and team settings management interface
 */

import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Bell, Shield, Users, Settings } from "lucide-react";
import {
  UserProfileSection,
  NotificationSettings,
  SecuritySection,
  TeamSettingsSection,
} from "@/components/settings";
import { useAuth } from "@/lib/auth/context";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <div className="mb-2 flex items-center space-x-3">
            <div className="rounded-lg bg-blue-50 p-2">
              <Settings className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
              <p className="text-lg text-gray-600">
                Manage your account, preferences, and team settings
              </p>
            </div>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger
              value="profile"
              className="flex items-center space-x-2"
            >
              <User className="h-4 w-4" />
              <span>Profile</span>
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="flex items-center space-x-2"
            >
              <Bell className="h-4 w-4" />
              <span>Notifications</span>
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="flex items-center space-x-2"
            >
              <Shield className="h-4 w-4" />
              <span>Security</span>
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Team</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <UserProfileSection />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <NotificationSettings />
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <SecuritySection />
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            <TeamSettingsSection />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
