"use client";

/**
 * InviteMemberDialog Component
 * Modal dialog for inviting new team members
 */

import { useState } from "react";
import { Loader2, Mail } from "lucide-react";

import { useTeamManagement } from "@/hooks/auth/use-team-management";
import { useAuth } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const InviteMemberDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: InviteMemberDialogProps) => {
  const { currentTeam, isTeamOwner } = useAuth();
  const { inviteUser, loading } = useTeamManagement();

  const [formData, setFormData] = useState({
    email: "",
    role: "member" as "admin" | "member" | "viewer",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.email.trim()) {
      setError("Email address is required");
      return;
    }

    if (!formData.email.includes("@") || !formData.email.includes(".")) {
      setError("Please enter a valid email address");
      return;
    }

    if (!currentTeam?.id) {
      setError("No team selected");
      return;
    }

    const { success: inviteSuccess, error: inviteError } = await inviteUser({
      teamId: currentTeam.id,
      email: formData.email.trim().toLowerCase(),
      role: formData.role,
    });

    if (inviteError) {
      setError(inviteError);
    } else if (inviteSuccess) {
      setSuccess(`Invitation sent to ${formData.email}`);
      // Reset form after success
      setTimeout(() => {
        setFormData({ email: "", role: "member" });
        setSuccess(null);
        onOpenChange(false);
        onSuccess?.();
      }, 2000);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({ email: "", role: "member" });
      setError(null);
      setSuccess(null);
      onOpenChange(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join <strong>{currentTeam?.name}</strong>.
            They&apos;ll receive an email with instructions to join your team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <div className="relative">
                <Mail className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={e => handleInputChange("email", e.target.value)}
                  placeholder="colleague@company.com"
                  className="pl-10"
                  disabled={loading || success !== null}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={value => handleInputChange("role", value)}
                disabled={loading || success !== null}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {isTeamOwner() && (
                    <SelectItem value="admin">
                      <div className="flex flex-col">
                        <span className="font-medium">Admin</span>
                        <span className="text-muted-foreground text-xs">
                          Can manage team members and projects
                        </span>
                      </div>
                    </SelectItem>
                  )}
                  <SelectItem value="member">
                    <div className="flex flex-col">
                      <span className="font-medium">Member</span>
                      <span className="text-muted-foreground text-xs">
                        Can create and edit content
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div className="flex flex-col">
                      <span className="font-medium">Viewer</span>
                      <span className="text-muted-foreground text-xs">
                        Can view content and analytics
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.email.trim() || success !== null}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Invitation...
                </>
              ) : success ? (
                "Invitation Sent!"
              ) : (
                "Send Invitation"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
