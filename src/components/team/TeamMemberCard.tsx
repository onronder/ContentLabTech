/**
 * Team Member Card Component
 * Individual team member display with role management and actions
 */

"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { fetch } from "@/lib/utils/fetch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Crown,
  Shield,
  User,
  Eye,
  MoreHorizontal,
  Mail,
  Calendar,
  Clock,
  Trash2,
  Edit,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

interface TeamMemberCardProps {
  member: {
    id: string;
    email: string;
    fullName: string;
    avatar?: string;
    role: "owner" | "admin" | "member" | "viewer";
    isOnline: boolean;
    lastActive: string;
    joinedAt: string;
    permissions?: Record<string, boolean>;
    user?: {
      id: string;
      name: string;
      email: string;
      avatar?: string;
      bio?: string;
    };
    isOwner?: boolean;
  };
  currentUserRole: "owner" | "admin" | "member" | "viewer";
  canManage: boolean;
  onUpdate: (member: any) => void;
  onRemove: (memberId: string) => void;
  teamId: string; // Add teamId prop for operations
}

export const TeamMemberCard: React.FC<TeamMemberCardProps> = ({
  member,
  currentUserRole,
  canManage,
  onUpdate,
  onRemove,
  teamId,
}) => {
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [showRoleSelect, setShowRoleSelect] = useState(false);

  // Parse synthetic ID to get user ID
  const getUserId = () => {
    if (member.id.includes("-")) {
      const parts = member.id.split("-");
      return parts.length === 2 ? parts[1] : member.id;
    }
    return member.id;
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="h-4 w-4 text-yellow-600" />;
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

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
        return "border-yellow-200 bg-yellow-50 text-yellow-700";
      case "admin":
        return "border-blue-200 bg-blue-50 text-blue-700";
      case "member":
        return "border-green-200 bg-green-50 text-green-700";
      case "viewer":
        return "border-gray-200 bg-gray-50 text-gray-700";
      default:
        return "border-gray-200 bg-gray-50 text-gray-700";
    }
  };

  const canChangeRole = () => {
    if (!canManage) return false;
    if (member.role === "owner") return false; // Owners can't be demoted except by transfer
    if (currentUserRole === "admin" && member.role === "admin") return false; // Admins can't change other admins
    return true;
  };

  const canRemoveMember = () => {
    if (!canManage) return false;
    if (member.role === "owner") return false; // Owners can't be removed
    if (currentUserRole === "admin" && member.role === "admin") return false; // Admins can't remove other admins
    return true;
  };

  const handleRoleChange = async (newRole: string) => {
    if (!canChangeRole() || newRole === member.role) return;

    setIsUpdatingRole(true);

    try {
      const response = await fetch("/api/team/members", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teamId: teamId,
          userId: getUserId(),
          role: newRole,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update member role");
      }

      const updatedMember = { ...member, role: newRole as any };
      onUpdate(updatedMember);
    } catch (error) {
      console.error("Failed to update member role:", error);
      // TODO: Show error toast
    } finally {
      setIsUpdatingRole(false);
      setShowRoleSelect(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!canRemoveMember()) return;

    try {
      const response = await fetch(
        `/api/team/members?teamId=${teamId}&userId=${getUserId()}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to remove member");
      }

      onRemove(member.id);
    } catch (error) {
      console.error("Failed to remove member:", error);
      // TODO: Show error toast
    } finally {
      setShowRemoveDialog(false);
    }
  };

  const formatLastActive = (lastActive: string) => {
    const date = new Date(lastActive);
    const now = new Date();
    const diffHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (member.isOnline) return "Online now";
    if (diffHours < 1) return "Active recently";
    if (diffHours < 24) return `Active ${diffHours}h ago`;
    if (diffHours < 168) return `Active ${Math.floor(diffHours / 24)}d ago`;
    return `Active ${date.toLocaleDateString()}`;
  };

  return (
    <>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              {/* Avatar */}
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-lg font-semibold text-white">
                  {member.fullName.charAt(0).toUpperCase()}
                </div>
                {/* Online Status */}
                <div
                  className={cn(
                    "absolute -right-1 -bottom-1 h-4 w-4 rounded-full border-2 border-white",
                    member.isOnline ? "bg-green-500" : "bg-gray-400"
                  )}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2">
                  <h3 className="truncate font-semibold text-gray-900">
                    {member.fullName}
                  </h3>
                  <Badge
                    variant="outline"
                    className={cn(
                      "flex items-center space-x-1",
                      getRoleBadgeVariant(member.role)
                    )}
                  >
                    {getRoleIcon(member.role)}
                    <span className="capitalize">{member.role}</span>
                  </Badge>
                </div>
                <p className="truncate text-sm text-gray-600">{member.email}</p>
                <div className="mt-2 flex items-center space-x-4">
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>{formatLastActive(member.lastActive)}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    <span>
                      Joined {new Date(member.joinedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Menu */}
            {canManage && (canChangeRole() || canRemoveMember()) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() =>
                      window.open(`mailto:${member.email}`, "_blank")
                    }
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Send Email
                  </DropdownMenuItem>

                  {canChangeRole() && (
                    <DropdownMenuItem onClick={() => setShowRoleSelect(true)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Change Role
                    </DropdownMenuItem>
                  )}

                  {canRemoveMember() && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setShowRemoveDialog(true)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove Member
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Role Change Section */}
          {showRoleSelect && (
            <div className="mt-4 rounded-lg bg-gray-50 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Change Role
                  </p>
                  <p className="text-xs text-gray-600">
                    Select a new role for this member
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Select
                    value={member.role}
                    onValueChange={handleRoleChange}
                    disabled={isUpdatingRole}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      {currentUserRole === "owner" && (
                        <SelectItem value="admin">Admin</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRoleSelect(false)}
                    disabled={isUpdatingRole}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remove Member Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span>Remove Team Member</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{member.fullName}</strong>{" "}
              from the team? They will lose access to all team projects and
              resources. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
