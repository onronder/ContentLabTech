"use client";

/**
 * Authentication Context for ContentLab Nexus
 * Provides Supabase Auth state management across the application
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase/client";
import type { Team, TeamMember } from "@/lib/supabase/client";

// Team with user role information
export type TeamWithUserRole = Team & {
  userRole: TeamMember["role"];
};

export interface AuthContextType {
  // Authentication state
  user: User | null;
  session: Session | null;
  loading: boolean;

  // User teams and current team
  teams: TeamWithUserRole[];
  currentTeam: TeamWithUserRole | null;
  currentTeamRole: TeamMember["role"] | null;
  teamsLoading: boolean;

  // Authentication methods
  signUp: (
    email: string,
    password: string,
    options?: { data?: Record<string, unknown> }
  ) => Promise<{ user: User | null; error: AuthError | null }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ user: User | null; error: AuthError | null }>;
  signInWithOAuth: (provider: "google") => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;

  // Team management
  switchTeam: (teamId: string) => Promise<boolean>;
  refreshTeams: () => Promise<void>;

  // Permissions
  hasPermission: (permission: string) => boolean;
  canManageTeam: () => boolean;
  isTeamOwner: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  // Authentication state
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Teams state
  const [teams, setTeams] = useState<TeamWithUserRole[]>([]);
  const [currentTeam, setCurrentTeam] = useState<TeamWithUserRole | null>(null);
  const [currentTeamRole, setCurrentTeamRole] = useState<
    TeamMember["role"] | null
  >(null);
  const [teamsLoading, setTeamsLoading] = useState(false);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    async function getInitialSession() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (mounted) {
        if (error) {
          console.error("Error getting session:", error);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
        setLoading(false);
      }
    }

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (event === "SIGNED_IN" && session?.user) {
          await loadUserTeams(session.user.id);
        } else if (event === "SIGNED_OUT") {
          setTeams([]);
          setCurrentTeam(null);
          setCurrentTeamRole(null);
          localStorage.removeItem("currentTeamId");
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Load user teams when user signs in
  const loadUserTeams = async (userId: string) => {
    setTeamsLoading(true);
    try {
      const { data: userTeams, error } = await supabase
        .from("teams")
        .select(
          `
          *,
          team_members!inner(role)
        `
        )
        .eq("team_members.user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading teams:", error);
        return;
      }

      const teamsWithRole =
        userTeams?.map(team => ({
          ...team,
          userRole: team.team_members[0]?.role,
        })) || [];

      setTeams(teamsWithRole);

      // Set current team from localStorage or default to first team
      const savedTeamId = localStorage.getItem("currentTeamId");
      const teamToSet = savedTeamId
        ? teamsWithRole.find(t => t.id === savedTeamId) || teamsWithRole[0]
        : teamsWithRole[0];

      if (teamToSet) {
        setCurrentTeam(teamToSet);
        setCurrentTeamRole(teamToSet.userRole);
        localStorage.setItem("currentTeamId", teamToSet.id);
      }
    } catch (error) {
      console.error("Error loading teams:", error);
    } finally {
      setTeamsLoading(false);
    }
  };

  // Authentication methods
  const signUp = async (
    email: string,
    password: string,
    options?: { data?: Record<string, unknown> }
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: options?.data || {},
      },
    });

    return { user: data.user, error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { user: data.user, error };
  };

  const signInWithOAuth = async (provider: "google") => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (!error) {
      // Clear local state
      setTeams([]);
      setCurrentTeam(null);
      setCurrentTeamRole(null);
      localStorage.removeItem("currentTeamId");
    }

    return { error };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    return { error };
  };

  // Team management methods
  const switchTeam = async (teamId: string): Promise<boolean> => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return false;

    setCurrentTeam(team);
    setCurrentTeamRole(team.userRole);
    localStorage.setItem("currentTeamId", teamId);
    return true;
  };

  const refreshTeams = async () => {
    if (user?.id) {
      await loadUserTeams(user.id);
    }
  };

  // Permission methods
  const hasPermission = (permission: string): boolean => {
    if (!currentTeamRole) return false;

    // Define role hierarchy
    const rolePermissions = {
      owner: [
        "manage_team",
        "manage_projects",
        "manage_content",
        "view_analytics",
      ],
      admin: ["manage_projects", "manage_content", "view_analytics"],
      member: ["manage_content", "view_analytics"],
      viewer: ["view_analytics"],
    };

    return rolePermissions[currentTeamRole]?.includes(permission) || false;
  };

  const canManageTeam = (): boolean => {
    return currentTeamRole === "owner" || currentTeamRole === "admin";
  };

  const isTeamOwner = (): boolean => {
    return currentTeamRole === "owner";
  };

  const value: AuthContextType = {
    // Authentication state
    user,
    session,
    loading,

    // Teams state
    teams,
    currentTeam,
    currentTeamRole,
    teamsLoading,

    // Authentication methods
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    resetPassword,

    // Team management
    switchTeam,
    refreshTeams,

    // Permissions
    hasPermission,
    canManageTeam,
    isTeamOwner,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
