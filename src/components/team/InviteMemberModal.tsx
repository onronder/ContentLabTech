/**
 * Invite Member Modal Component
 * Modal for inviting new team members with role selection
 */

"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { fetch } from "@/lib/utils/fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus,
  Mail,
  Shield,
  User,
  Eye,
  Crown,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";

interface InviteMemberModalProps {
  open: boolean;
  onClose: () => void;
  onMemberInvited: (member: any) => void;
  teamId?: string;
}

interface InviteForm {
  email: string;
  role: "admin" | "member" | "viewer";
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  open,
  onClose,
  onMemberInvited,
  teamId,
}) => {
  const [form, setForm] = useState<InviteForm>({
    email: "",
    role: "member",
  });
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!teamId) {
      setError("Team ID is required");
      return;
    }

    if (!form.email) {
      setError("Email address is required");
      return;
    }

    if (!isValidEmail(form.email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsInviting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/team/members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teamId,
          email: form.email,
          role: form.role,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to invite member");
      }

      const data = await response.json();

      if (data.invitationSent) {
        setSuccess(
          `Invitation sent to ${form.email}. They will receive an email with instructions to join the team.`
        );
      } else if (data.member) {
        setSuccess(`${form.email} has been added to the team successfully!`);
        onMemberInvited(data.member);
      }

      // Reset form
      setForm({
        email: "",
        role: "member",
      });

      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 2000);
    } catch (err) {
      console.error("Failed to invite member:", err);
      setError(err instanceof Error ? err.message : "Failed to invite member");
    } finally {
      setIsInviting(false);
    }
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case "admin":
        return "Can manage team members, projects, and settings";
      case "member":
        return "Can access and contribute to team projects";
      case "viewer":
        return "Can view team projects and content (read-only)";
      default:
        return "";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="h-4 w-4 text-blue-600" />;
      case "member":
        return <User className="h-4 w-4 text-green-600" />;
      case "viewer":
        return <Eye className="h-4 w-4 text-gray-600" />;
      default:
        return <User className="h-4 w-4 text-gray-600" />;
    }
  };

  const handleClose = () => {
    if (!isInviting) {
      setForm({
        email: "",
        role: "member",
      });
      setError(null);
      setSuccess(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            <span>Invite Team Member</span>
          </DialogTitle>
          <DialogDescription>
            Send an invitation to add a new member to your team. They&apos;ll
            receive an email with instructions to join.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="member@example.com"
                value={form.email}
                onChange={e =>
                  setForm(prev => ({ ...prev, email: e.target.value }))
                }
                className="pl-10"
                disabled={isInviting}
                required
              />
            </div>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={form.role}
              onValueChange={value =>
                setForm(prev => ({ ...prev, role: value as any }))
              }
              disabled={isInviting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">
                  <div className="flex items-center space-x-2">
                    <Eye className="h-4 w-4 text-gray-600" />
                    <span>Viewer</span>
                  </div>
                </SelectItem>
                <SelectItem value="member">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-green-600" />
                    <span>Member</span>
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <span>Admin</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Role Description */}
            <div className="flex items-start space-x-2 rounded-lg bg-gray-50 p-3">
              {getRoleIcon(form.role)}
              <div>
                <p className="text-sm font-medium text-gray-900 capitalize">
                  {form.role} Role
                </p>
                <p className="text-xs text-gray-600">
                  {getRoleDescription(form.role)}
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-2 rounded-lg border border-red-200 bg-red-50 p-3">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-center space-x-2 rounded-lg border border-green-200 bg-green-50 p-3">
              <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          {/* Role Permissions Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900">
              Role Permissions
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">View projects and content</span>
                <div className="flex space-x-1">
                  <Badge variant="outline" className="px-1 py-0 text-xs">
                    Viewer
                  </Badge>
                  <Badge variant="outline" className="px-1 py-0 text-xs">
                    Member
                  </Badge>
                  <Badge variant="outline" className="px-1 py-0 text-xs">
                    Admin
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Create and edit content</span>
                <div className="flex space-x-1">
                  <Badge variant="outline" className="px-1 py-0 text-xs">
                    Member
                  </Badge>
                  <Badge variant="outline" className="px-1 py-0 text-xs">
                    Admin
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Manage team members</span>
                <div className="flex space-x-1">
                  <Badge variant="outline" className="px-1 py-0 text-xs">
                    Admin
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isInviting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isInviting || !form.email}
          >
            {isInviting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending Invitation...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Send Invitation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
