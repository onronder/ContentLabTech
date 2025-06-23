"use client";

/**
 * Team Management Hook
 * Handles team operations integrated with Supabase Auth
 */

import { useState } from "react";

import { useAuth } from "@/lib/auth/context";
import { supabase } from "@/lib/supabase/client";
import type { Team, TeamMember } from "@/lib/supabase/client";

interface CreateTeamParams {
  name: string;
  description?: string;
}

interface InviteUserParams {
  teamId: string;
  email: string;
  role?: TeamMember["role"];
}

interface UpdateMemberRoleParams {
  teamId: string;
  userId: string;
  role: TeamMember["role"];
}

export const useTeamManagement = () => {
  const {
    user,
    teams,
    currentTeam,
    currentTeamRole,
    teamsLoading,
    switchTeam,
    refreshTeams,
    canManageTeam,
    isTeamOwner,
  } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create a new team
  const createTeam = async ({
    name,
    description,
  }: CreateTeamParams): Promise<{
    team: Team | null;
    error: string | null;
  }> => {
    if (!user) {
      return { team: null, error: "User must be authenticated" };
    }

    setLoading(true);
    setError(null);

    try {
      const { data: teamId, error: functionError } = await supabase.rpc(
        "create_team_with_owner",
        {
          team_name: name,
          team_description: description,
          user_uuid: user.id,
        }
      );

      if (functionError) {
        setError(functionError.message);
        return { team: null, error: functionError.message };
      }

      if (!teamId) {
        setError("Failed to create team");
        return { team: null, error: "Failed to create team" };
      }

      // Fetch the created team
      const { data: team, error: fetchError } = await supabase
        .from("teams")
        .select("*")
        .eq("id", teamId)
        .single();

      if (fetchError) {
        setError(fetchError.message);
        return { team: null, error: fetchError.message };
      }

      // Refresh teams to include the new team
      await refreshTeams();

      return { team, error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create team";
      setError(errorMessage);
      return { team: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Invite user to team
  const inviteUser = async ({
    teamId,
    email,
    role = "member",
  }: InviteUserParams): Promise<{ success: boolean; error: string | null }> => {
    if (!user || !canManageTeam()) {
      return { success: false, error: "Insufficient permissions" };
    }

    setLoading(true);
    setError(null);

    try {
      const { error: inviteError } = await supabase.rpc("invite_user_to_team", {
        team_uuid: teamId,
        user_email: email,
        user_role: role,
      });

      if (inviteError) {
        setError(inviteError.message);
        return { success: false, error: inviteError.message };
      }

      return { success: true, error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to invite user";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Update team member role
  const updateMemberRole = async ({
    teamId,
    userId,
    role,
  }: UpdateMemberRoleParams): Promise<{
    success: boolean;
    error: string | null;
  }> => {
    if (!user || !canManageTeam()) {
      return { success: false, error: "Insufficient permissions" };
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from("team_members")
        .update({ role })
        .eq("team_id", teamId)
        .eq("user_id", userId);

      if (updateError) {
        setError(updateError.message);
        return { success: false, error: updateError.message };
      }

      // Refresh teams if we updated current team
      if (teamId === currentTeam?.id) {
        await refreshTeams();
      }

      return { success: true, error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update member role";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Remove team member
  const removeMember = async (
    teamId: string,
    userId: string
  ): Promise<{ success: boolean; error: string | null }> => {
    if (!user || !canManageTeam()) {
      return { success: false, error: "Insufficient permissions" };
    }

    setLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", teamId)
        .eq("user_id", userId);

      if (deleteError) {
        setError(deleteError.message);
        return { success: false, error: deleteError.message };
      }

      return { success: true, error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to remove member";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Transfer team ownership
  const transferOwnership = async (
    teamId: string,
    newOwnerId: string
  ): Promise<{ success: boolean; error: string | null }> => {
    if (!user || !isTeamOwner()) {
      return {
        success: false,
        error: "Only team owners can transfer ownership",
      };
    }

    setLoading(true);
    setError(null);

    try {
      const { error: transferError } = await supabase.rpc(
        "transfer_team_ownership",
        {
          team_uuid: teamId,
          new_owner_uuid: newOwnerId,
        }
      );

      if (transferError) {
        setError(transferError.message);
        return { success: false, error: transferError.message };
      }

      // Refresh teams to reflect the new ownership
      await refreshTeams();

      return { success: true, error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to transfer ownership";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Get team members
  const getTeamMembers = async (teamId: string) => {
    const { data: members, error } = await supabase
      .from("team_members")
      .select(
        `
        *,
        user:user_id (
          id,
          email,
          raw_user_meta_data
        )
      `
      )
      .eq("team_id", teamId)
      .order("joined_at", { ascending: false });

    return { members, error };
  };

  // Leave team
  const leaveTeam = async (
    teamId: string
  ): Promise<{ success: boolean; error: string | null }> => {
    if (!user) {
      return { success: false, error: "User must be authenticated" };
    }

    // Prevent team owner from leaving without transferring ownership
    if (isTeamOwner() && currentTeam?.id === teamId) {
      return {
        success: false,
        error: "Team owners must transfer ownership before leaving",
      };
    }

    setLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", teamId)
        .eq("user_id", user.id);

      if (deleteError) {
        setError(deleteError.message);
        return { success: false, error: deleteError.message };
      }

      // Refresh teams to remove the left team
      await refreshTeams();

      return { success: true, error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to leave team";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return {
    // State
    teams,
    currentTeam,
    currentTeamRole,
    teamsLoading,
    loading,
    error,

    // Permissions
    canManageTeam,
    isTeamOwner,

    // Methods
    createTeam,
    inviteUser,
    updateMemberRole,
    removeMember,
    transferOwnership,
    getTeamMembers,
    leaveTeam,
    switchTeam,
    refreshTeams,

    // Helpers
    clearError: () => setError(null),
  };
};
