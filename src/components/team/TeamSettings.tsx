/**
 * Team Settings Component
 * Team configuration and management settings
 */

"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Settings,
  Save,
  Trash2,
  AlertTriangle,
  Shield,
  Bell,
  Users,
  Globe,
  Lock,
  CheckCircle,
} from "lucide-react";

interface TeamSettingsProps {
  team: {
    id: string;
    name: string;
    description: string;
    ownerId: string;
    settings: Record<string, any>;
    createdAt: string;
  };
  currentUserRole: "owner" | "admin" | "member" | "viewer";
  onTeamUpdated: (team: any) => void;
}

export const TeamSettings: React.FC<TeamSettingsProps> = ({
  team,
  currentUserRole,
  onTeamUpdated,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: team.name,
    description: team.description,
    settings: {
      allowMemberInvites: team.settings["allowMemberInvites"] ?? true,
      requireApprovalForInvites: team.settings["requireApprovalForInvites"] ?? false,
      emailNotifications: team.settings["emailNotifications"] ?? true,
      activityNotifications: team.settings["activityNotifications"] ?? true,
      publicProfile: team.settings["publicProfile"] ?? false,
      allowGuestAccess: team.settings["allowGuestAccess"] ?? false,
    },
  });

  const canEditTeam = currentUserRole === "owner" || currentUserRole === "admin";
  const canDeleteTeam = currentUserRole === "owner";

  const handleSave = async () => {
    if (!canEditTeam) return;

    setIsSaving(true);

    try {
      const response = await fetch(`/api/team/${team.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          settings: formData.settings,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update team settings");
      }

      const updatedTeam = await response.json();
      onTeamUpdated(updatedTeam);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save team settings:", error);
      // TODO: Show error toast
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: team.name,
      description: team.description,
      settings: {
        allowMemberInvites: team.settings["allowMemberInvites"] ?? true,
        requireApprovalForInvites: team.settings["requireApprovalForInvites"] ?? false,
        emailNotifications: team.settings["emailNotifications"] ?? true,
        activityNotifications: team.settings["activityNotifications"] ?? true,
        publicProfile: team.settings["publicProfile"] ?? false,
        allowGuestAccess: team.settings["allowGuestAccess"] ?? false,
      },
    });
    setIsEditing(false);
  };

  const handleDeleteTeam = async () => {
    if (!canDeleteTeam) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/team/${team.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete team");
      }

      // Redirect to dashboard or team selection
      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Failed to delete team:", error);
      // TODO: Show error toast
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Team Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-gray-600" />
            <span>Team Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-name">Team Name</Label>
            <Input
              id="team-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              disabled={!isEditing || !canEditTeam}
              placeholder="Enter team name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="team-description">Description</Label>
            <Textarea
              id="team-description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              disabled={!isEditing || !canEditTeam}
              placeholder="Describe your team's purpose and goals"
              rows={3}
            />
          </div>

          <div className="text-sm text-gray-500">
            <p>Created on {new Date(team.createdAt).toLocaleDateString()}</p>
            <p>Team ID: {team.id}</p>
          </div>

          {canEditTeam && (
            <div className="flex items-center space-x-2">
              {isEditing ? (
                <>
                  <Button onClick={handleSave} disabled={isSaving}>
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  Edit Team Info
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-purple-600" />
            <span>Permissions & Access</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow member invitations</Label>
                <p className="text-sm text-gray-600">
                  Let team members invite new people to join the team
                </p>
              </div>
              <Switch
                checked={formData.settings.allowMemberInvites}
                onCheckedChange={(checked) =>
                  setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, allowMemberInvites: checked }
                  }))
                }
                disabled={!isEditing || !canEditTeam}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require approval for invites</Label>
                <p className="text-sm text-gray-600">
                  Team admins must approve new member invitations
                </p>
              </div>
              <Switch
                checked={formData.settings.requireApprovalForInvites}
                onCheckedChange={(checked) =>
                  setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, requireApprovalForInvites: checked }
                  }))
                }
                disabled={!isEditing || !canEditTeam}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow guest access</Label>
                <p className="text-sm text-gray-600">
                  Enable temporary access for external collaborators
                </p>
              </div>
              <Switch
                checked={formData.settings.allowGuestAccess}
                onCheckedChange={(checked) =>
                  setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, allowGuestAccess: checked }
                  }))
                }
                disabled={!isEditing || !canEditTeam}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-yellow-600" />
            <span>Notifications</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email notifications</Label>
                <p className="text-sm text-gray-600">
                  Send email updates for team activities and changes
                </p>
              </div>
              <Switch
                checked={formData.settings.emailNotifications}
                onCheckedChange={(checked) =>
                  setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, emailNotifications: checked }
                  }))
                }
                disabled={!isEditing || !canEditTeam}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Activity notifications</Label>
                <p className="text-sm text-gray-600">
                  Get notified about project updates and member activities
                </p>
              </div>
              <Switch
                checked={formData.settings.activityNotifications}
                onCheckedChange={(checked) =>
                  setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, activityNotifications: checked }
                  }))
                }
                disabled={!isEditing || !canEditTeam}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lock className="h-5 w-5 text-green-600" />
            <span>Privacy</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Public team profile</Label>
                <p className="text-sm text-gray-600">
                  Make team information visible in public directories
                </p>
              </div>
              <Switch
                checked={formData.settings.publicProfile}
                onCheckedChange={(checked) =>
                  setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, publicProfile: checked }
                  }))
                }
                disabled={!isEditing || !canEditTeam}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      {canDeleteTeam && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Danger Zone</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <h4 className="font-semibold text-red-900">Delete Team</h4>
              <p className="text-sm text-red-700 mt-1">
                Permanently delete this team and all associated projects, content, and data. 
                This action cannot be undone.
              </p>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="mt-4">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Team
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <span>Delete Team</span>
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you absolutely sure you want to delete <strong>{team.name}</strong>? 
                      This will permanently delete:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>All team projects and content</li>
                        <li>Team member associations</li>
                        <li>Analytics and performance data</li>
                        <li>Team settings and configurations</li>
                      </ul>
                      <br />
                      <strong>This action cannot be undone.</strong>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteTeam}
                      className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Deleting..." : "Delete Team"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};