"use client";

/**
 * Authentication Context for ContentLab Nexus
 * Provides Supabase Auth state management across the application
 * Enhanced with better error handling and loading state management
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useMemo,
  memo,
} from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase/client";
import type { Team, TeamMember } from "@/lib/supabase/client";
import {
  getFromLocalStorage,
  setToLocalStorage,
  removeFromLocalStorage,
  getWindowOrigin,
} from "@/lib/utils/browser";

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

  // Enhanced debugging and recovery
  resetAuthState: () => void;
  getDebugInfo: () => Record<string, any>;
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

// Production-safe debug logging
const debugLog = (message: string, data?: any) => {
  if (process.env.NODE_ENV === "development") {
    console.log(`[AuthContext Debug] ${message}`, data);
  }
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  // Authentication state
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(
    null
  );

  // Teams state
  const [teams, setTeams] = useState<TeamWithUserRole[]>([]);
  const [currentTeam, setCurrentTeam] = useState<TeamWithUserRole | null>(null);
  const [currentTeamRole, setCurrentTeamRole] = useState<
    TeamMember["role"] | null
  >(null);
  const [teamsLoading, setTeamsLoading] = useState(false);

  // Optimized team state debug logging
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      debugLog("Team state changed", {
        currentTeamId: currentTeam?.id,
        currentTeamRole,
        teamsCount: teams.length,
      });
    }
  }, [currentTeam?.id, currentTeamRole, teams.length]);

  // Declare loadUserTeams before it's used - FIXED: Remove circular dependency
  const loadUserTeams = useCallback(
    async (userId: string) => {
      setTeamsLoading(true);
      try {
        debugLog("Loading user teams", { userId });

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
          console.error("[AuthContext] Error loading teams:", error);
          return;
        }

        const teamsWithRole: TeamWithUserRole[] = (userTeams || []).map(
          team => ({
            ...team,
            userRole: team.team_members[0]?.role || "member",
          })
        );

        debugLog("Setting teams state", { count: teamsWithRole.length });

        setTeams(teamsWithRole);
        debugLog("Teams loaded", { count: teamsWithRole.length });

        // Set current team from localStorage or first team
        const savedTeamId = getFromLocalStorage("currentTeamId");
        const targetTeam = savedTeamId
          ? teamsWithRole.find(team => team.id === savedTeamId)
          : teamsWithRole[0];

        if (targetTeam) {
          debugLog("Setting current team", { teamId: targetTeam.id });

          setCurrentTeam(targetTeam);
          setCurrentTeamRole(targetTeam.userRole);
          setToLocalStorage("currentTeamId", targetTeam.id);
          debugLog("Current team set", {
            teamId: targetTeam.id,
            role: targetTeam.userRole,
          });
          debugLog("Team set successfully", {
            teamId: targetTeam.id,
            role: targetTeam.userRole,
          });
        } else {
          debugLog("No team available to set", {
            teamsAvailable: teamsWithRole.length,
          });
        }
      } catch (error) {
        console.error("[AuthContext] Error in loadUserTeams:", error);
      } finally {
        setTeamsLoading(false);
      }
    },
    [] // FIXED: Removed teams dependency that caused circular updates
  );

  // Optimized teams loading effect - FIXED: Remove loadUserTeams dependency to prevent loops
  useEffect(() => {
    if (user?.id && !teamsLoading && teams.length === 0) {
      debugLog("Loading teams for user", { userId: user.id });
      loadUserTeams(user.id);
    }
  }, [user?.id, teamsLoading, teams.length]); // FIXED: Removed loadUserTeams dependency

  // Memoized configuration validation
  const validateSupabaseConfig = useMemo(() => {
    const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
    const key = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

    if (!url || !key) {
      const error = "Missing Supabase configuration";
      console.error("[AuthContext]", error);
      setInitializationError(error);
      return false;
    }

    // FIXED: Support different Supabase key formats (both JWT and sb_publishable_)
    if (
      !key.startsWith("eyJ") &&
      !key.startsWith("sb_publishable_") &&
      !key.startsWith("sb_")
    ) {
      const error = "Invalid anon key format";
      console.error("[AuthContext]", error, {
        keyPrefix: key.substring(0, 10),
      });
      setInitializationError(error);
      return false;
    }

    return true;
  }, []);

  // Enhanced auth state reset
  const resetAuthState = useCallback(() => {
    debugLog("Resetting auth state");
    setUser(null);
    setSession(null);
    setLoading(false);
    setTeams([]);
    setCurrentTeam(null);
    setCurrentTeamRole(null);
    setInitializationError(null);
    removeFromLocalStorage("currentTeamId");
  }, []);

  // Debug info getter
  const getDebugInfo = useCallback(() => {
    return {
      user: user ? { id: user.id, email: user.email } : null,
      session: session ? { expires_at: session.expires_at } : null,
      loading,
      teamsLoading,
      teamsCount: teams.length,
      currentTeam: currentTeam
        ? { id: currentTeam.id, name: currentTeam.name }
        : null,
      initializationError,
      timestamp: new Date().toISOString(),
    };
  }, [
    user,
    session,
    loading,
    teamsLoading,
    teams.length,
    currentTeam,
    initializationError,
  ]);

  // Simplified auth state initialization
  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        debugLog("Initializing auth state");

        // Quick validation - don't block initialization
        if (!validateSupabaseConfig) {
          if (mounted) {
            setLoading(false);
          }
          return;
        }

        // Start loading immediately
        setLoading(true);

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (mounted) {
          if (error) {
            console.error("[AuthContext] Error getting session:", error);
            setInitializationError(error.message);
          } else {
            setSession(session);
            setUser(session?.user ?? null);
            debugLog("Initial session loaded", { hasSession: !!session });
          }
          setLoading(false);
        }
      } catch (error) {
        console.error("[AuthContext] Failed to initialize auth:", error);
        if (mounted) {
          setInitializationError("Failed to initialize authentication");
          setLoading(false);
        }
      }
    }

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (mounted) {
        debugLog("Auth state change", { event, hasSession: !!session });

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        setInitializationError(null);

        if (event === "SIGNED_IN" && session?.user) {
          await loadUserTeams(session.user.id);
        } else if (event === "SIGNED_OUT") {
          setTeams([]);
          setCurrentTeam(null);
          setCurrentTeamRole(null);
          removeFromLocalStorage("currentTeamId");
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [validateSupabaseConfig]);

  // Enhanced authentication methods with better error handling
  const signUp = useCallback(
    async (
      email: string,
      password: string,
      options?: { data?: Record<string, unknown> }
    ) => {
      try {
        debugLog("Sign up attempt", { email });

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            ...options,
            emailRedirectTo: `${getWindowOrigin()}/auth/callback`,
          },
        });

        if (error) {
          debugLog("Sign up error", error);
        } else {
          debugLog("Sign up success", { userId: data.user?.id });
        }

        return { user: data.user, error };
      } catch (error) {
        console.error("[AuthContext] Sign up error:", error);
        return { user: null, error: error as AuthError };
      }
    },
    []
  );

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      debugLog("Sign in attempt", { email });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        debugLog("Sign in error", error);
      } else {
        debugLog("Sign in success", { userId: data.user?.id });
      }

      return { user: data.user, error };
    } catch (error) {
      console.error("[AuthContext] Sign in error:", error);
      return { user: null, error: error as AuthError };
    }
  }, []);

  const signInWithOAuth = useCallback(async (provider: "google") => {
    try {
      debugLog("OAuth sign in attempt", { provider });

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${getWindowOrigin()}/auth/callback`,
        },
      });

      if (error) {
        debugLog("OAuth sign in error", error);
      }

      return { error };
    } catch (error) {
      console.error("[AuthContext] OAuth sign in error:", error);
      return { error: error as AuthError };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      debugLog("Sign out attempt");

      const { error } = await supabase.auth.signOut();

      if (error) {
        debugLog("Sign out error", error);
      } else {
        debugLog("Sign out success");
      }

      return { error };
    } catch (error) {
      console.error("[AuthContext] Sign out error:", error);
      return { error: error as AuthError };
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      debugLog("Password reset attempt", { email });

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getWindowOrigin()}/auth/reset-password`,
      });

      if (error) {
        debugLog("Password reset error", error);
      } else {
        debugLog("Password reset success");
      }

      return { error };
    } catch (error) {
      console.error("[AuthContext] Password reset error:", error);
      return { error: error as AuthError };
    }
  }, []);

  const switchTeam = useCallback(
    async (teamId: string): Promise<boolean> => {
      try {
        debugLog("Team switch attempt", { teamId });

        const team = teams.find(t => t.id === teamId);
        if (!team) {
          console.error("[AuthContext] Team not found:", teamId);
          return false;
        }

        setCurrentTeam(team);
        setCurrentTeamRole(team.userRole);
        setToLocalStorage("currentTeamId", teamId);
        debugLog("Team switch success", { teamId, role: team.userRole });
        return true;
      } catch (error) {
        console.error("[AuthContext] Team switch error:", error);
        return false;
      }
    },
    [teams]
  );

  const refreshTeams = useCallback(async () => {
    if (user?.id) {
      await loadUserTeams(user.id);
    }
  }, [user?.id]); // FIXED: Removed loadUserTeams dependency to prevent loops

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!currentTeamRole) return false;

      // Define role-based permissions
      const rolePermissions: Record<TeamMember["role"], string[]> = {
        owner: ["*"], // All permissions
        admin: [
          "manage_content",
          "manage_projects",
          "view_analytics",
          "invite_members",
        ],
        member: ["manage_content", "view_analytics"],
        viewer: ["view_analytics"],
      };

      const userPermissions = rolePermissions[currentTeamRole] || [];
      return (
        userPermissions.includes("*") || userPermissions.includes(permission)
      );
    },
    [currentTeamRole]
  );

  const canManageTeam = useCallback((): boolean => {
    return currentTeamRole === "owner" || currentTeamRole === "admin";
  }, [currentTeamRole]);

  const isTeamOwner = useCallback((): boolean => {
    return currentTeamRole === "owner";
  }, [currentTeamRole]);

  const contextValue: AuthContextType = useMemo(
    () => ({
      // State
      user,
      session,
      loading,
      teams,
      currentTeam,
      currentTeamRole,
      teamsLoading,

      // Methods
      signUp,
      signIn,
      signInWithOAuth,
      signOut,
      resetPassword,
      switchTeam,
      refreshTeams,
      hasPermission,
      canManageTeam,
      isTeamOwner,

      // Enhanced debugging and recovery
      resetAuthState,
      getDebugInfo,
    }),
    [
      user,
      session,
      loading,
      teams,
      currentTeam,
      currentTeamRole,
      teamsLoading,
      signUp,
      signIn,
      signInWithOAuth,
      signOut,
      resetPassword,
      switchTeam,
      refreshTeams,
      hasPermission,
      canManageTeam,
      isTeamOwner,
      resetAuthState,
      getDebugInfo,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};
