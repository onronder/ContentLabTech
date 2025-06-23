/**
 * Database utilities for Supabase Edge Functions
 * Provides typed database client and common queries
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function createDatabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SECRET_KEY")!;

  return createClient(supabaseUrl, supabaseKey);
}

export interface Project {
  id: string;
  team_id: string;
  name: string;
  description?: string;
  website_url?: string;
  target_keywords: string[];
  status: "active" | "paused" | "archived" | "deleted";
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ContentItem {
  id: string;
  project_id: string;
  title: string;
  content?: string;
  url: string;
  content_type:
    | "article"
    | "blog_post"
    | "landing_page"
    | "product_page"
    | "category_page"
    | "other";
  status: "draft" | "published" | "archived" | "deleted";
  seo_score?: number;
  readability_score?: number;
  word_count?: number;
  meta_title?: string;
  meta_description?: string;
  focus_keywords: string[];
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Competitor {
  id: string;
  project_id: string;
  name: string;
  website_url: string;
  description?: string;
  market_share?: number;
  monitoring_enabled: boolean;
  last_analyzed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface KeywordOpportunity {
  id: string;
  project_id: string;
  keyword: string;
  search_volume?: number;
  difficulty_score?: number;
  opportunity_score?: number;
  current_ranking?: number;
  target_ranking?: number;
  competition_level: "low" | "medium" | "high" | "very_high";
  trend_data: Record<string, unknown>;
  last_updated_at: string;
  created_at: string;
}

// Common database queries
export async function getProjectById(
  supabase: ReturnType<typeof createDatabaseClient>,
  projectId: string
): Promise<Project | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error) {
    console.error("Error fetching project:", error);
    return null;
  }

  return data;
}

export async function getContentItemById(
  supabase: ReturnType<typeof createDatabaseClient>,
  contentId: string
): Promise<ContentItem | null> {
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("id", contentId)
    .single();

  if (error) {
    console.error("Error fetching content item:", error);
    return null;
  }

  return data;
}

export async function getUserTeamAccess(
  supabase: ReturnType<typeof createDatabaseClient>,
  userId: string,
  teamId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_team_access", {
    team_uuid: teamId,
    user_uuid: userId,
  });

  if (error) {
    console.error("Error checking team access:", error);
    return false;
  }

  return data === true;
}

export async function createAnalysisResult(
  supabase: ReturnType<typeof createDatabaseClient>,
  projectId: string,
  analysisType: string,
  results: Record<string, unknown>,
  contentId?: string,
  competitorId?: string,
  confidenceScore?: number,
  expiresAt?: string
) {
  const { data, error } = await supabase
    .from("analysis_results")
    .insert({
      project_id: projectId,
      content_id: contentId,
      competitor_id: competitorId,
      analysis_type: analysisType,
      results,
      confidence_score: confidenceScore,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating analysis result:", error);
    throw new Error("Failed to save analysis result");
  }

  return data;
}
