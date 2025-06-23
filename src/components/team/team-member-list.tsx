"use client";

/**
 * TeamMemberList Component
 * Display and manage team members
 */

import { useState, useEffect, useCallback } from "react";
import {
  MoreHorizontal,
  Mail,
  Crown,
  Shield,
  User,
  Eye,
  Trash2,
} from "lucide-react";

import { useAuth } from "@/lib/auth/context";
import { useTeamManagement } from "@/hooks/auth/use-team-management";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TeamMember {
  id: string;
  user_id: string;
  role: "owner" | "admin" | "member" | "viewer";
  joined_at: string;
  user: {
    id: string;
    email: string;
    raw_user_meta_data: {
      full_name?: string;
      avatar_url?: string;
    };
  };
}

interface TeamMemberListProps {
  onInviteUser?: () => void;
}

export const TeamMemberList = ({ onInviteUser }: TeamMemberListProps) => {
  const { currentTeam, canManageTeam, isTeamOwner, user } = useAuth();
  const { getTeamMembers, updateMemberRole, removeMember, loading } =
    useTeamManagement();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    if (!currentTeam?.id) return;

    setLoadingMembers(true);
    setError(null);

    const { members: teamMembers, error: fetchError } = await getTeamMembers(
      currentTeam.id
    );

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setMembers(teamMembers || []);
    }

    setLoadingMembers(false);
  }, [currentTeam?.id, getTeamMembers]);

  useEffect(() => {
    loadMembers();
  }, [currentTeam?.id, loadMembers]);

  const handleRoleChange = async (
    memberId: string,
    newRole: TeamMember["role"]
  ) => {
    if (!currentTeam?.id) return;

    const { success, error: updateError } = await updateMemberRole({
      teamId: currentTeam.id,
      userId: memberId,
      role: newRole,
    });

    if (updateError) {
      setError(updateError);
    } else if (success) {
      await loadMembers();
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!currentTeam?.id) return;

    const { success, error: removeError } = await removeMember(
      currentTeam.id,
      memberId
    );

    if (removeError) {
      setError(removeError);
    } else if (success) {
      await loadMembers();
    }
  };

  const getUserDisplayName = (member: TeamMember) => {
    return (
      member.user.raw_user_meta_data?.full_name ||
      member.user.email.split("@")[0] ||
      "Unknown User"
    );
  };

  const getUserInitials = (member: TeamMember) => {
    const name = getUserDisplayName(member);
    return name
      .split(" ")
      .map(word => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="h-4 w-4" />;
      case "admin":
        return <Shield className="h-4 w-4" />;
      case "member":
        return <User className="h-4 w-4" />;
      case "viewer":
        return <Eye className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
        return "default";
      case "admin":
        return "secondary";
      case "member":
        return "outline";
      case "viewer":
        return "outline";
      default:
        return "outline";
    }
  };

  const canManageMember = (member: TeamMember) => {
    if (!canManageTeam()) return false;
    if (member.user_id === user?.id) return false; // Can't manage yourself
    if (member.role === "owner") return false; // Can't manage owner
    if (!isTeamOwner() && member.role === "admin") return false; // Only owner can manage admins
    return true;
  };

  if (loadingMembers) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                Manage your team members and their roles
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-48 animate-pulse rounded bg-gray-200" />
                </div>
                <div className="h-6 w-16 animate-pulse rounded bg-gray-200" />
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              Manage your team members and their roles ({members.length} member
              {members.length !== 1 ? "s" : ""})
            </CardDescription>
          </div>
          {canManageTeam() && onInviteUser && (
            <Button onClick={onInviteUser}>
              <Mail className="mr-2 h-4 w-4" />
              Invite Member
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {members.map(member => (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex items-center space-x-4">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{getUserInitials(member)}</AvatarFallback>
                </Avatar>

                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <p className="font-medium">{getUserDisplayName(member)}</p>
                    {member.user_id === user?.id && (
                      <Badge variant="outline" className="text-xs">
                        You
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {member.user.email}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Joined {new Date(member.joined_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Badge
                  variant={getRoleBadgeVariant(member.role)}
                  className="flex items-center space-x-1"
                >
                  {getRoleIcon(member.role)}
                  <span className="capitalize">{member.role}</span>
                </Badge>

                {canManageMember(member) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" disabled={loading}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Change Role</DropdownMenuLabel>
                      {member.role !== "admin" && isTeamOwner() && (
                        <DropdownMenuItem
                          onClick={() =>
                            handleRoleChange(member.user_id, "admin")
                          }
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          Make Admin
                        </DropdownMenuItem>
                      )}
                      {member.role !== "member" && (
                        <DropdownMenuItem
                          onClick={() =>
                            handleRoleChange(member.user_id, "member")
                          }
                        >
                          <User className="mr-2 h-4 w-4" />
                          Make Member
                        </DropdownMenuItem>
                      )}
                      {member.role !== "viewer" && (
                        <DropdownMenuItem
                          onClick={() =>
                            handleRoleChange(member.user_id, "viewer")
                          }
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Make Viewer
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleRemoveMember(member.user_id)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove from Team
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))}

          {members.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No team members found.</p>
              {canManageTeam() && onInviteUser && (
                <Button
                  variant="outline"
                  onClick={onInviteUser}
                  className="mt-2"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Invite Your First Member
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
