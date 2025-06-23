"use client";

/**
 * Settings Page
 * Team and application settings
 */

import { useState } from "react";

import { AppLayout } from "@/components/layout";
import { TeamMemberList, InviteMemberDialog } from "@/components/team";
import { useAuth } from "@/lib/auth/context";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const { currentTeam } = useAuth();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your team settings and preferences.
            {currentTeam && ` Currently managing: ${currentTeam.name}`}
          </p>
        </div>

        {currentTeam ? (
          <div className="space-y-8">
            <TeamMemberList onInviteUser={() => setInviteDialogOpen(true)} />
          </div>
        ) : (
          <div className="bg-card text-card-foreground rounded-lg border p-8">
            <div className="space-y-4 text-center">
              <h2 className="text-xl font-semibold">No Team Selected</h2>
              <p className="text-muted-foreground">
                Please select a team from the team switcher to manage settings.
              </p>
            </div>
          </div>
        )}

        <InviteMemberDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          onSuccess={() => setInviteDialogOpen(false)}
        />
      </div>
    </AppLayout>
  );
}
