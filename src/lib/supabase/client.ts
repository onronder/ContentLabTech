/**
 * Supabase client configuration for ContentLab Nexus
 * Provides type-safe database client with RLS support
 */

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import {
  validateEnvironmentConfig,
  validateBrowserSecurity,
} from "./validation";

// Validate configuration on module load
const config = validateEnvironmentConfig();
if (!config.isValid && process.env.NODE_ENV === "production") {
  throw new Error(`Supabase configuration error: ${config.errors.join(", ")}`);
} else if (!config.isValid) {
  console.warn("⚠️ Supabase configuration issues detected:", config.errors);
}

// Browser security check
validateBrowserSecurity();

// Supabase client configuration with legacy JWT keys
export const supabase = createClient<Database>(
  process.env["NEXT_PUBLIC_SUPABASE_URL"] || "https://placeholder.supabase.co",
  process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder_legacy_key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        "X-Client-Info": "contentlab-nexus-client",
      },
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

// Type-safe database types
export type Tables = Database["public"]["Tables"];
export type Enums = Database["public"]["Enums"];

// Table types
export type Team = Tables["teams"]["Row"];
export type TeamInsert = Tables["teams"]["Insert"];
export type TeamUpdate = Tables["teams"]["Update"];

export type TeamMember = Tables["team_members"]["Row"];
export type TeamMemberInsert = Tables["team_members"]["Insert"];
export type TeamMemberUpdate = Tables["team_members"]["Update"];

export type Project = Tables["projects"]["Row"];
export type ProjectInsert = Tables["projects"]["Insert"];
export type ProjectUpdate = Tables["projects"]["Update"];

export type ContentItem = Tables["content_items"]["Row"];
export type ContentItemInsert = Tables["content_items"]["Insert"];
export type ContentItemUpdate = Tables["content_items"]["Update"];

export type Competitor = Tables["competitors"]["Row"];
export type CompetitorInsert = Tables["competitors"]["Insert"];
export type CompetitorUpdate = Tables["competitors"]["Update"];

export type KeywordOpportunity = Tables["keyword_opportunities"]["Row"];
export type KeywordOpportunityInsert =
  Tables["keyword_opportunities"]["Insert"];
export type KeywordOpportunityUpdate =
  Tables["keyword_opportunities"]["Update"];

export type AnalysisResult = Tables["analysis_results"]["Row"];
export type AnalysisResultInsert = Tables["analysis_results"]["Insert"];
export type AnalysisResultUpdate = Tables["analysis_results"]["Update"];

export type ContentAnalytics = Tables["content_analytics"]["Row"];
export type ContentAnalyticsInsert = Tables["content_analytics"]["Insert"];
export type ContentAnalyticsUpdate = Tables["content_analytics"]["Update"];

export type CompetitorAnalytics = Tables["competitor_analytics"]["Row"];
export type CompetitorAnalyticsInsert =
  Tables["competitor_analytics"]["Insert"];
export type CompetitorAnalyticsUpdate =
  Tables["competitor_analytics"]["Update"];

export type ContentRecommendation = Tables["content_recommendations"]["Row"];
export type ContentRecommendationInsert =
  Tables["content_recommendations"]["Insert"];
export type ContentRecommendationUpdate =
  Tables["content_recommendations"]["Update"];

// Enum types
export type UserRole = Enums["user_role"];
export type ProjectStatus = Enums["project_status"];
export type ContentType = Enums["content_type"];
export type ContentStatus = Enums["content_status"];
export type AnalysisType = Enums["analysis_type"];
export type CompetitionLevel = Enums["competition_level"];

// Helper functions for common queries
export const getTeamsByUser = async (userId: string) => {
  const { data, error } = await supabase
    .from("teams")
    .select(
      `
      *,
      team_members!inner(role)
    `
    )
    .eq("team_members.user_id", userId);

  return { data, error };
};

export const getProjectsByTeam = async (teamId: string) => {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("team_id", teamId)
    .eq("status", "active");

  return { data, error };
};

export const getContentByProject = async (projectId: string) => {
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  return { data, error };
};

export const getCompetitorsByProject = async (projectId: string) => {
  const { data, error } = await supabase
    .from("competitors")
    .select("*")
    .eq("project_id", projectId)
    .eq("monitoring_enabled", true);

  return { data, error };
};

export const getKeywordOpportunities = async (projectId: string) => {
  const { data, error } = await supabase
    .from("keyword_opportunities")
    .select("*")
    .eq("project_id", projectId)
    .order("opportunity_score", { ascending: false });

  return { data, error };
};

export const getRecentAnalysisResults = async (
  projectId: string,
  limit = 10
) => {
  const { data, error } = await supabase
    .from("analysis_results")
    .select("*")
    .eq("project_id", projectId)
    .order("generated_at", { ascending: false })
    .limit(limit);

  return { data, error };
};

// Real-time subscriptions
export const subscribeToProjectUpdates = (
  projectId: string,
  callback: (payload: unknown) => void
) => {
  return supabase
    .channel(`project-${projectId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "content_items",
        filter: `project_id=eq.${projectId}`,
      },
      callback
    )
    .subscribe();
};

export const subscribeToTeamUpdates = (
  teamId: string,
  callback: (payload: unknown) => void
) => {
  return supabase
    .channel(`team-${teamId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "projects",
        filter: `team_id=eq.${teamId}`,
      },
      callback
    )
    .subscribe();
};
