"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Trash2,
  Crown,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth/context";

interface TeamSettings {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface TeamSettingsData {
  team: TeamSettings;
  currentUserRole: string;
  canEdit: boolean;
  canDelete: boolean;
  canTransferOwnership: boolean;
}

export const TeamSettingsSection: React.FC = () => {
  const { currentTeam } = useAuth();
  const [teamData, setTeamData] = useState<TeamSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form data
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");

  // Dialog states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (currentTeam?.id) {
      loadTeamSettings();
    }
  }, [currentTeam?.id]);

  const loadTeamSettings = async () => {
    if (!currentTeam?.id) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/teams/${currentTeam.id}/settings`);

      if (!response.ok) {
        throw new Error("Failed to load team settings");
      }

      const data = await response.json();
      const teamSettings = data.data;

      setTeamData(teamSettings);
      setTeamName(teamSettings.team.name || "");
      setTeamDescription(teamSettings.team.description || "");
    } catch (err) {
      console.error("Failed to load team settings:", err);
      setError("Failed to load team settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentTeam?.id || !teamData?.canEdit) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`/api/teams/${currentTeam.id}/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: teamName,
          description: teamDescription,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update team settings");
      }

      setSuccess("Team settings updated successfully");
      await loadTeamSettings(); // Reload to get updated data

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to update team settings:", err);
      setError(
        err instanceof Error ? err.message : "Failed to update team settings"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!currentTeam?.id || !teamData?.canDelete) return;

    try {
      setDeleting(true);
      const response = await fetch(`/api/teams/${currentTeam.id}/settings`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete team");
      }

      // Redirect to dashboard or teams page after deletion
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Failed to delete team:", err);
      setError(err instanceof Error ? err.message : "Failed to delete team");
      setDeleting(false);
    }
  };

  if (!currentTeam) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Users className="mx-auto mb-4 h-8 w-8 text-gray-400" />
          <p className="text-gray-600">No team selected</p>
          <p className="mt-2 text-sm text-gray-500">
            Please select a team from the team switcher to manage settings
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading team settings...</span>
        </CardContent>
      </Card>
    );
  }

  if (!teamData) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="mx-auto mb-4 h-8 w-8 text-red-500" />
          <p className="text-gray-600">Failed to load team settings</p>
          <Button onClick={loadTeamSettings} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span>Team Information</span>
          </CardTitle>
          <CardDescription>
            Manage your team&apos;s basic information and settings
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team Name</Label>
              <Input
                id="team-name"
                placeholder="Enter team name"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                disabled={!teamData.canEdit}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="team-description">Description</Label>
              <Textarea
                id="team-description"
                placeholder="Enter team description (optional)"
                value={teamDescription}
                onChange={e => setTeamDescription(e.target.value)}
                disabled={!teamData.canEdit}
                rows={3}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Team Information</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Team ID
                </Label>
                <p className="font-mono text-sm text-gray-900">
                  {teamData.team.id}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Your Role
                </Label>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-900 capitalize">
                    {teamData.currentUserRole}
                  </span>
                  {teamData.currentUserRole === "owner" && (
                    <Crown className="h-3 w-3 text-yellow-500" />
                  )}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Created
                </Label>
                <p className="text-sm text-gray-900">
                  {new Date(teamData.team.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">
                  Last Updated
                </Label>
                <p className="text-sm text-gray-900">
                  {new Date(teamData.team.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          {teamData.canEdit && (
            <div className="flex justify-end space-x-3 border-t pt-4">
              <Button
                onClick={loadTeamSettings}
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
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      {(teamData.canDelete || teamData.canTransferOwnership) && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions that affect your team
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {teamData.canTransferOwnership && (
              <div className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 p-4">
                <div>
                  <h4 className="font-medium text-orange-900">
                    Transfer Ownership
                  </h4>
                  <p className="text-sm text-orange-700">
                    Transfer team ownership to another team member
                  </p>
                </div>
                <Dialog
                  open={showTransferDialog}
                  onOpenChange={setShowTransferDialog}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-orange-300 text-orange-700 hover:bg-orange-100"
                    >
                      <Crown className="mr-2 h-4 w-4" />
                      Transfer
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Transfer Team Ownership</DialogTitle>
                      <DialogDescription>
                        This feature is coming soon. You&apos;ll be able to
                        transfer ownership to another team admin.
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {teamData.canDelete && (
              <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4">
                <div>
                  <h4 className="font-medium text-red-900">Delete Team</h4>
                  <p className="text-sm text-red-700">
                    Permanently delete this team and all its data
                  </p>
                </div>
                <Dialog
                  open={showDeleteDialog}
                  onOpenChange={setShowDeleteDialog}
                >
                  <DialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Team
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete Team</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to delete &quot;
                        {teamData.team.name}&quot;? This action cannot be undone
                        and will permanently delete all team data, projects, and
                        content.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                        <p className="text-sm text-red-800">
                          <strong>This will permanently delete:</strong>
                        </p>
                        <ul className="mt-2 space-y-1 text-sm text-red-700">
                          <li>• All team projects and content</li>
                          <li>• Team member associations</li>
                          <li>• Analytics and performance data</li>
                          <li>• All team settings and preferences</li>
                        </ul>
                      </div>

                      <div className="flex justify-end space-x-3">
                        <Button
                          variant="outline"
                          onClick={() => setShowDeleteDialog(false)}
                          disabled={deleting}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleDeleteTeam}
                          disabled={deleting}
                        >
                          {deleting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Team
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
    </div>
  );
};
