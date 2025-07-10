/**
 * Persistent Team Manager
 * Ensures teams persist correctly across sessions with automatic recovery
 */

import { supabase } from "@/lib/supabase/client";
import type { Team, TeamMember } from "@/lib/supabase/client";

export interface TeamWithUserRole extends Team {
  userRole: TeamMember["role"];
}

interface TeamPersistenceOptions {
  autoRecovery: boolean;
  retryAttempts: number;
  retryDelay: number;
}

interface TeamPersistenceState {
  teams: TeamWithUserRole[];
  currentTeamId: string | null;
  lastSyncTime: number;
  syncAttempts: number;
}

const DEFAULT_OPTIONS: TeamPersistenceOptions = {
  autoRecovery: true,
  retryAttempts: 3,
  retryDelay: 1000,
};

const STORAGE_KEYS = {
  TEAMS: "contentlab_teams",
  CURRENT_TEAM: "contentlab_current_team_id",
  PERSISTENCE_STATE: "contentlab_team_persistence_state",
  LAST_SYNC: "contentlab_last_team_sync",
} as const;

export class PersistentTeamManager {
  private options: TeamPersistenceOptions;
  private userId: string | null = null;
  private syncInProgress = false;
  private listeners: Set<
    (teams: TeamWithUserRole[], currentTeam: TeamWithUserRole | null) => void
  > = new Set();

  constructor(options: Partial<TeamPersistenceOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Initialize team manager for a user
   */
  async initialize(userId: string): Promise<{
    teams: TeamWithUserRole[];
    currentTeam: TeamWithUserRole | null;
  }> {
    console.log("🏢 Initializing Persistent Team Manager for user:", userId);

    this.userId = userId;

    try {
      // Try to load from cache first
      const cachedData = this.loadFromCache();

      if (cachedData && this.isCacheValid(cachedData)) {
        console.log("✅ Using cached team data");
        const currentTeam =
          cachedData.teams.find(t => t.id === cachedData.currentTeamId) || null;
        return {
          teams: cachedData.teams,
          currentTeam,
        };
      }

      // Cache is invalid or doesn't exist, sync from database
      console.log("🔄 Cache invalid, syncing from database");
      return await this.syncFromDatabase();
    } catch (error) {
      console.error("❌ Error initializing team manager:", error);

      if (this.options.autoRecovery) {
        console.log("🔧 Attempting auto-recovery");
        return await this.attemptRecovery();
      }

      throw error;
    }
  }

  /**
   * Sync teams from database
   */
  async syncFromDatabase(): Promise<{
    teams: TeamWithUserRole[];
    currentTeam: TeamWithUserRole | null;
  }> {
    if (!this.userId) {
      throw new Error("User ID not set");
    }

    if (this.syncInProgress) {
      console.log("⏳ Sync already in progress, waiting...");
      await this.waitForSync();
      const cachedData = this.loadFromCache();
      const currentTeam =
        cachedData?.teams.find(t => t.id === cachedData.currentTeamId) || null;
      return {
        teams: cachedData?.teams || [],
        currentTeam,
      };
    }

    this.syncInProgress = true;

    try {
      console.log("📊 Syncing teams from database for user:", this.userId);

      const { data: userTeams, error } = await supabase
        .from("teams")
        .select(
          `
          *,
          team_members!inner(role, created_at)
        `
        )
        .eq("team_members.user_id", this.userId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const teamsWithRole: TeamWithUserRole[] = (userTeams || []).map(team => ({
        ...team,
        userRole: team.team_members[0]?.role || "member",
      }));

      // Get current team preference
      const savedTeamId = localStorage.getItem(STORAGE_KEYS.CURRENT_TEAM);
      const currentTeamId =
        savedTeamId && teamsWithRole.find(t => t.id === savedTeamId)
          ? savedTeamId
          : teamsWithRole[0]?.id || null;

      const currentTeam =
        teamsWithRole.find(t => t.id === currentTeamId) || null;

      // Save to cache
      this.saveToCache({
        teams: teamsWithRole,
        currentTeamId,
        lastSyncTime: Date.now(),
        syncAttempts: 0,
      });

      // Notify listeners
      this.notifyListeners(teamsWithRole, currentTeam);

      console.log("✅ Teams synced successfully:", {
        teamCount: teamsWithRole.length,
        currentTeamId,
      });

      return {
        teams: teamsWithRole,
        currentTeam,
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Create a new team with automatic persistence
   */
  async createTeam(
    name: string,
    description?: string
  ): Promise<{
    team: TeamWithUserRole | null;
    error: string | null;
  }> {
    if (!this.userId) {
      return { team: null, error: "User not authenticated" };
    }

    try {
      console.log("🏗️ Creating new team:", { name, description });

      // Create team using RPC function
      const { data: teamId, error: functionError } = await supabase.rpc(
        "create_team_with_owner",
        {
          team_name: name,
          team_description: description,
          user_uuid: this.userId,
        }
      );

      if (functionError) {
        throw functionError;
      }

      if (!teamId) {
        throw new Error("Failed to create team");
      }

      // Fetch the created team
      const { data: team, error: fetchError } = await supabase
        .from("teams")
        .select("*")
        .eq("id", teamId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      const teamWithRole: TeamWithUserRole = {
        ...team,
        userRole: "owner" as const,
      };

      // Update cache
      const cachedData = this.loadFromCache();
      if (cachedData) {
        cachedData.teams.unshift(teamWithRole);
        if (!cachedData.currentTeamId) {
          cachedData.currentTeamId = teamWithRole.id;
        }
        this.saveToCache(cachedData);
      }

      // Refresh from database to ensure consistency
      await this.syncFromDatabase();

      return { team: teamWithRole, error: null };
    } catch (error) {
      console.error("❌ Error creating team:", error);
      return {
        team: null,
        error: error instanceof Error ? error.message : "Failed to create team",
      };
    }
  }

  /**
   * Switch to a different team
   */
  async switchTeam(teamId: string): Promise<boolean> {
    try {
      console.log("🔄 Switching to team:", teamId);

      const cachedData = this.loadFromCache();
      if (!cachedData) {
        console.error("❌ No cached data available for team switch");
        return false;
      }

      const team = cachedData.teams.find(t => t.id === teamId);
      if (!team) {
        console.error("❌ Team not found:", teamId);
        return false;
      }

      // Update cache
      cachedData.currentTeamId = teamId;
      this.saveToCache(cachedData);

      // Update localStorage for compatibility
      localStorage.setItem(STORAGE_KEYS.CURRENT_TEAM, teamId);

      // Notify listeners
      this.notifyListeners(cachedData.teams, team);

      console.log("✅ Team switched successfully:", {
        teamId,
        role: team.userRole,
      });
      return true;
    } catch (error) {
      console.error("❌ Error switching team:", error);
      return false;
    }
  }

  /**
   * Force refresh teams from database
   */
  async refreshTeams(): Promise<void> {
    if (!this.userId) {
      throw new Error("User not authenticated");
    }

    console.log("🔄 Force refreshing teams");
    await this.syncFromDatabase();
  }

  /**
   * Add listener for team changes
   */
  addListener(
    listener: (
      teams: TeamWithUserRole[],
      currentTeam: TeamWithUserRole | null
    ) => void
  ): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get current teams and team from cache
   */
  getCurrentState(): {
    teams: TeamWithUserRole[];
    currentTeam: TeamWithUserRole | null;
  } {
    const cachedData = this.loadFromCache();
    if (!cachedData) {
      return { teams: [], currentTeam: null };
    }

    const currentTeam =
      cachedData.teams.find(t => t.id === cachedData.currentTeamId) || null;
    return {
      teams: cachedData.teams,
      currentTeam,
    };
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    console.log("🗑️ Clearing team cache");
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  // Private methods

  private loadFromCache(): TeamPersistenceState | null {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.PERSISTENCE_STATE);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error("❌ Error loading team cache:", error);
      return null;
    }
  }

  private saveToCache(state: TeamPersistenceState): void {
    try {
      localStorage.setItem(
        STORAGE_KEYS.PERSISTENCE_STATE,
        JSON.stringify(state)
      );
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, Date.now().toString());
    } catch (error) {
      console.error("❌ Error saving team cache:", error);
    }
  }

  private isCacheValid(state: TeamPersistenceState): boolean {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    return now - state.lastSyncTime < maxAge;
  }

  private async attemptRecovery(): Promise<{
    teams: TeamWithUserRole[];
    currentTeam: TeamWithUserRole | null;
  }> {
    console.log("🔧 Attempting team persistence recovery");

    // Try to create a default team if none exist
    try {
      if (!this.userId) {
        throw new Error("No user ID for recovery");
      }

      const response = await fetch("/api/fix-persistence", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ userId: this.userId }),
      });

      if (response.ok) {
        console.log("✅ Recovery successful, syncing teams");
        return await this.syncFromDatabase();
      } else {
        throw new Error("Recovery API failed");
      }
    } catch (error) {
      console.error("❌ Recovery failed:", error);
      return { teams: [], currentTeam: null };
    }
  }

  private async waitForSync(): Promise<void> {
    while (this.syncInProgress) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private notifyListeners(
    teams: TeamWithUserRole[],
    currentTeam: TeamWithUserRole | null
  ): void {
    this.listeners.forEach(listener => {
      try {
        listener(teams, currentTeam);
      } catch (error) {
        console.error("❌ Error in team listener:", error);
      }
    });
  }
}

// Singleton instance
export const persistentTeamManager = new PersistentTeamManager();
