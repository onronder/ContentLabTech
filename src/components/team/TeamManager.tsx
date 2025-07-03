/**
 * Team Manager Component
 * Comprehensive team management interface with role-based access control
 */

"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/context";
import {
  Users,
  Plus,
  Search,
  Shield,
  Crown,
  UserCheck,
  Eye,
  Settings,
  Mail,
  Calendar,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  UserPlus,
  MoreHorizontal,
  Edit,
  Trash2,
  ExternalLink,
} from "lucide-react";

// Components
import { TeamMemberCard } from "./TeamMemberCard";
import { InviteMemberModal } from "./InviteMemberModal";
import { TeamSettings } from "./TeamSettings";
import { TeamStats } from "./TeamStats";

interface TeamMember {
  id: string;
  email: string;
  fullName: string;
  avatar?: string;
  role: "owner" | "admin" | "member" | "viewer";
  isOnline: boolean;
  lastActive: string;
  joinedAt: string;
  permissions?: Record<string, boolean>;
}

interface TeamInfo {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  settings: Record<string, any>;
  createdAt: string;
}

interface TeamData {
  members: TeamMember[];
  currentUser: TeamMember | null;
  team: TeamInfo | null;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    userId: string;
    userName: string;
  }>;
  stats: {
    totalMembers: number;
    onlineMembers: number;
    roles: Record<string, number>;
  };
}

interface TeamFilters {
  role?: string | undefined;
  status?: string | undefined;
  search?: string | undefined;
}

type ViewMode = "members" | "activity" | "settings";

export const TeamManager = () => {
  const { currentTeam, user } = useAuth();
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("members");
  const [filters, setFilters] = useState<TeamFilters>({});
  const [searchTerm, setSearchTerm] = useState("");

  // Load team data when team changes
  useEffect(() => {
    if (currentTeam?.id) {
      loadTeamData();
    }
  }, [currentTeam?.id]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== filters.search) {
        setFilters(prev => ({
          ...prev,
          search: searchTerm || undefined,
        }));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, filters.search]);

  const loadTeamData = async () => {
    if (!currentTeam?.id) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        teamId: currentTeam.id,
      });

      const response = await fetch(`/api/team/members?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to load team data");
      }

      const data = await response.json();
      setTeamData(data);
    } catch (err) {
      console.error("Failed to load team data:", err);
      setError(err instanceof Error ? err.message : "Failed to load team data");
    } finally {
      setLoading(false);
    }
  };

  const handleMemberInvited = (newMember: TeamMember) => {
    if (teamData) {
      setTeamData(prev =>
        prev
          ? {
              ...prev,
              members: [...prev.members, newMember],
              stats: {
                ...prev.stats,
                totalMembers: prev.stats.totalMembers + 1,
                roles: {
                  ...prev.stats.roles,
                  [newMember.role]: (prev.stats.roles[newMember.role] || 0) + 1,
                },
              },
            }
          : null
      );
    }
    setShowInviteModal(false);
  };

  const handleMemberUpdated = (updatedMember: TeamMember) => {
    if (teamData) {
      setTeamData(prev =>
        prev
          ? {
              ...prev,
              members: prev.members.map(m =>
                m.id === updatedMember.id ? updatedMember : m
              ),
            }
          : null
      );
    }
  };

  const handleMemberRemoved = (memberId: string) => {
    if (teamData) {
      const member = teamData.members.find(m => m.id === memberId);
      if (member) {
        setTeamData(prev =>
          prev
            ? {
                ...prev,
                members: prev.members.filter(m => m.id !== memberId),
                stats: {
                  ...prev.stats,
                  totalMembers: prev.stats.totalMembers - 1,
                  roles: {
                    ...prev.stats.roles,
                    [member.role]: Math.max(
                      0,
                      (prev.stats.roles[member.role] || 0) - 1
                    ),
                  },
                },
              }
            : null
        );
      }
    }
  };

  // Filter members based on current filters
  const filteredMembers =
    teamData?.members.filter(member => {
      if (filters.role && member.role !== filters.role) return false;
      if (filters.status) {
        if (filters.status === "online" && !member.isOnline) return false;
        if (filters.status === "offline" && member.isOnline) return false;
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          member.fullName.toLowerCase().includes(searchLower) ||
          member.email.toLowerCase().includes(searchLower)
        );
      }
      return true;
    }) || [];

  const canManageMembers =
    teamData?.currentUser?.role === "owner" ||
    teamData?.currentUser?.role === "admin";

  if (loading && !teamData) {
    return (
      <div className="space-y-8">
        {/* Loading Header */}
        <div className="space-y-4">
          <div className="h-8 w-1/3 animate-pulse rounded-md bg-gray-200" />
          <div className="h-4 w-1/2 animate-pulse rounded-md bg-gray-200" />
        </div>

        {/* Loading Stats */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 animate-pulse rounded bg-gray-200" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Loading Members */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl bg-gray-200"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-2 flex items-center space-x-3">
            <div className="rounded-lg bg-blue-50 p-2">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Team</h1>
              <p className="text-lg text-gray-600">
                Manage team members, roles, and collaboration
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Badge
            variant="outline"
            className="border-blue-200 bg-blue-50 text-blue-700"
          >
            <Shield className="mr-1 h-3 w-3" />
            Role-Based Access
          </Badge>

          {canManageMembers && (
            <Button onClick={() => setShowInviteModal(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Member
            </Button>
          )}
        </div>
      </div>

      {/* Team Stats */}
      {teamData && <TeamStats data={teamData.stats} loading={loading} />}

      {/* Team Content */}
      <Tabs
        value={viewMode}
        onValueChange={value => setViewMode(value as ViewMode)}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="members" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Members</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Activity</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-6">
          {/* Members Controls */}
          <div className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-80 pl-10"
                />
              </div>

              {/* Role Filter */}
              <Select
                value={filters.role || "all"}
                onValueChange={value =>
                  setFilters(prev => ({
                    ...prev,
                    role: value === "all" ? undefined : value,
                  }))
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select
                value={filters.status || "all"}
                onValueChange={value =>
                  setFilters(prev => ({
                    ...prev,
                    status: value === "all" ? undefined : value,
                  }))
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-gray-500">
              {filteredMembers.length} of {teamData?.stats.totalMembers || 0}{" "}
              members
            </div>
          </div>

          {/* Members Grid */}
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 p-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-red-900">
                Failed to load team data
              </h3>
              <p className="mb-4 text-red-700">{error}</p>
              <Button onClick={loadTeamData} variant="outline">
                Try Again
              </Button>
            </div>
          ) : filteredMembers.length === 0 ? (
            <EmptyMembersState
              onInviteMember={() => setShowInviteModal(true)}
              canInvite={canManageMembers}
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredMembers.map(member => (
                <TeamMemberCard
                  key={member.id}
                  member={member}
                  currentUserRole={teamData?.currentUser?.role || "viewer"}
                  canManage={canManageMembers}
                  onUpdate={handleMemberUpdated}
                  onRemove={handleMemberRemoved}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-green-600" />
                <span>Recent Team Activity</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {teamData?.recentActivity &&
              teamData.recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {teamData.recentActivity.map(activity => (
                    <div
                      key={activity.id}
                      className="flex items-center space-x-3 border-b border-gray-100 pb-3 last:border-0"
                    >
                      <div className="rounded-full bg-green-100 p-2">
                        <Activity className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.description}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>{activity.userName}</span>
                          <span>•</span>
                          <span>
                            {new Date(activity.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Activity className="mx-auto mb-2 h-8 w-8" />
                  <p>No recent team activity</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          {teamData?.team && (
            <TeamSettings
              team={teamData.team}
              currentUserRole={teamData.currentUser?.role || "viewer"}
              onTeamUpdated={updatedTeam => {
                setTeamData(prev =>
                  prev ? { ...prev, team: updatedTeam } : null
                );
              }}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Invite Member Modal */}
      <InviteMemberModal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onMemberInvited={handleMemberInvited}
        teamId={currentTeam?.id || ""}
      />
    </div>
  );
};

// Empty Members State Component
const EmptyMembersState = ({
  onInviteMember,
  canInvite,
}: {
  onInviteMember: () => void;
  canInvite: boolean;
}) => (
  <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
    <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-blue-100 p-4">
      <Users className="h-8 w-8 text-blue-600" />
    </div>
    <h3 className="mb-2 text-xl font-semibold text-gray-900">
      No team members found
    </h3>
    <p className="mb-6 text-gray-600">
      {canInvite
        ? "Start building your team by inviting members to collaborate on projects."
        : "No team members match your current filters. Try adjusting your search criteria."}
    </p>
    {canInvite && (
      <div className="space-y-4">
        <Button onClick={onInviteMember} size="lg">
          <UserPlus className="mr-2 h-5 w-5" />
          Invite Team Members
        </Button>
        <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Role-Based Access</span>
          </div>
          <div className="flex items-center space-x-2">
            <Mail className="h-4 w-4" />
            <span>Email Invitations</span>
          </div>
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Activity Tracking</span>
          </div>
        </div>
      </div>
    )}
  </div>
);
