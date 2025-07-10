/**
 * Persistent Teams Hook
 * Provides reliable team management with persistence across sessions
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { User } from "@supabase/supabase-js";
import {
  persistentTeamManager,
  type TeamWithUserRole,
} from "@/lib/team/persistent-team-manager";

interface UsePersistentTeamsResult {
  teams: TeamWithUserRole[];
  currentTeam: TeamWithUserRole | null;
  teamsLoading: boolean;
  teamsError: string | null;

  // Actions
  switchTeam: (teamId: string) => Promise<boolean>;
  createTeam: (
    name: string,
    description?: string
  ) => Promise<{
    team: TeamWithUserRole | null;
    error: string | null;
  }>;
  refreshTeams: () => Promise<void>;
  clearTeamsCache: () => void;

  // Utils
  hasTeams: boolean;
  isTeamOwner: (teamId?: string) => boolean;
  canManageTeam: (teamId?: string) => boolean;
  getTeamRole: (teamId?: string) => TeamWithUserRole["userRole"] | null;
}

export const usePersistentTeams = (
  user: User | null
): UsePersistentTeamsResult => {
  const [teams, setTeams] = useState<TeamWithUserRole[]>([]);
  const [currentTeam, setCurrentTeam] = useState<TeamWithUserRole | null>(null);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsError, setTeamsError] = useState<string | null>(null);
  const initRef = useRef(false);

  // Initialize teams when user changes
  useEffect(() => {
    if (!user?.id) {
      console.log("👤 No user, clearing teams");
      setTeams([]);
      setCurrentTeam(null);
      setTeamsLoading(false);
      setTeamsError(null);
      initRef.current = false;
      return;
    }

    if (initRef.current) {
      console.log("🔄 User changed, reinitializing teams");
      initRef.current = false;
    }

    const initializeTeams = async () => {
      if (initRef.current) return;
      initRef.current = true;

      console.log("🏢 Initializing persistent teams for user:", user.id);
      setTeamsLoading(true);
      setTeamsError(null);

      try {
        const result = await persistentTeamManager.initialize(user.id);
        setTeams(result.teams);
        setCurrentTeam(result.currentTeam);

        console.log("✅ Teams initialized:", {
          teamCount: result.teams.length,
          currentTeam: result.currentTeam?.name,
        });
      } catch (error) {
        console.error("❌ Error initializing teams:", error);
        setTeamsError(
          error instanceof Error ? error.message : "Failed to load teams"
        );

        // Try to get cached state as fallback
        const cachedState = persistentTeamManager.getCurrentState();
        setTeams(cachedState.teams);
        setCurrentTeam(cachedState.currentTeam);
      } finally {
        setTeamsLoading(false);
      }
    };

    initializeTeams();
  }, [user?.id]);

  // Set up listener for team changes
  useEffect(() => {
    const unsubscribe = persistentTeamManager.addListener(
      (updatedTeams, updatedCurrentTeam) => {
        console.log("🔔 Teams updated via listener:", {
          teamCount: updatedTeams.length,
          currentTeam: updatedCurrentTeam?.name,
        });
        setTeams(updatedTeams);
        setCurrentTeam(updatedCurrentTeam);
      }
    );

    return unsubscribe;
  }, []);

  // Switch team
  const switchTeam = useCallback(
    async (teamId: string): Promise<boolean> => {
      if (!user?.id) {
        console.error("❌ Cannot switch team: no user");
        return false;
      }

      console.log("🔄 Switching team:", teamId);
      setTeamsError(null);

      try {
        const success = await persistentTeamManager.switchTeam(teamId);

        if (success) {
          // Update local state immediately for better UX
          const targetTeam = teams.find(t => t.id === teamId);
          if (targetTeam) {
            setCurrentTeam(targetTeam);
          }
        }

        return success;
      } catch (error) {
        console.error("❌ Error switching team:", error);
        setTeamsError(
          error instanceof Error ? error.message : "Failed to switch team"
        );
        return false;
      }
    },
    [user?.id, teams]
  );

  // Create team
  const createTeam = useCallback(
    async (name: string, description?: string) => {
      if (!user?.id) {
        return { team: null, error: "User not authenticated" };
      }

      console.log("🏗️ Creating team:", { name, description });
      setTeamsLoading(true);
      setTeamsError(null);

      try {
        const result = await persistentTeamManager.createTeam(
          name,
          description
        );

        if (result.team) {
          console.log("✅ Team created successfully:", result.team.name);
        }

        return result;
      } catch (error) {
        console.error("❌ Error creating team:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to create team";
        setTeamsError(errorMessage);
        return { team: null, error: errorMessage };
      } finally {
        setTeamsLoading(false);
      }
    },
    [user?.id]
  );

  // Refresh teams
  const refreshTeams = useCallback(async () => {
    if (!user?.id) {
      console.log("👤 No user, skipping refresh");
      return;
    }

    console.log("🔄 Refreshing teams");
    setTeamsLoading(true);
    setTeamsError(null);

    try {
      await persistentTeamManager.refreshTeams();
      console.log("✅ Teams refreshed successfully");
    } catch (error) {
      console.error("❌ Error refreshing teams:", error);
      setTeamsError(
        error instanceof Error ? error.message : "Failed to refresh teams"
      );
    } finally {
      setTeamsLoading(false);
    }
  }, [user?.id]);

  // Clear teams cache
  const clearTeamsCache = useCallback(() => {
    console.log("🗑️ Clearing teams cache");
    persistentTeamManager.clearCache();
    setTeams([]);
    setCurrentTeam(null);
    setTeamsError(null);
  }, []);

  // Utility functions
  const hasTeams = teams.length > 0;

  const isTeamOwner = useCallback(
    (teamId?: string): boolean => {
      const targetTeam = teamId
        ? teams.find(t => t.id === teamId)
        : currentTeam;
      return targetTeam?.userRole === "owner";
    },
    [teams, currentTeam]
  );

  const canManageTeam = useCallback(
    (teamId?: string): boolean => {
      const targetTeam = teamId
        ? teams.find(t => t.id === teamId)
        : currentTeam;
      return (
        targetTeam?.userRole === "owner" || targetTeam?.userRole === "admin"
      );
    },
    [teams, currentTeam]
  );

  const getTeamRole = useCallback(
    (teamId?: string): TeamWithUserRole["userRole"] | null => {
      const targetTeam = teamId
        ? teams.find(t => t.id === teamId)
        : currentTeam;
      return targetTeam?.userRole || null;
    },
    [teams, currentTeam]
  );

  return {
    teams,
    currentTeam,
    teamsLoading,
    teamsError,

    // Actions
    switchTeam,
    createTeam,
    refreshTeams,
    clearTeamsCache,

    // Utils
    hasTeams,
    isTeamOwner,
    canManageTeam,
    getTeamRole,
  };
};
