/**
 * Optimized Database Query Service
 * Fixes N+1 problems and implements efficient query patterns with connection pooling
 */

import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { withDatabaseConnection } from "./connection-pool";
import { enterpriseLogger } from "@/lib/monitoring/enterprise-logger";

type Tables = Database["public"]["Tables"];
type Team = Tables["teams"]["Row"];
type Project = Tables["projects"]["Row"];
type ContentItem = Tables["content_items"]["Row"];
type Competitor = Tables["competitors"]["Row"];
type TeamMember = Tables["team_members"]["Row"];

// =====================================================
// OPTIMIZED TEAM QUERIES
// =====================================================

interface TeamWithMembersAndProjects extends Team {
  team_members: (TeamMember & {
    user: {
      id: string;
      email: string;
      raw_user_meta_data: Record<string, any>;
    };
  })[];
  projects: (Project & {
    content_count: number;
    competitor_count: number;
    latest_content: ContentItem | null;
  })[];
  project_count: number;
  member_count: number;
}

export const getTeamsWithFullDetailsForUser = async (
  userId: string
): Promise<TeamWithMembersAndProjects[]> => {
  return withDatabaseConnection(async (client: SupabaseClient<Database>) => {
    // Single optimized query that joins everything needed
    const { data, error } = await client
      .from("teams")
      .select(
        `
        *,
        team_members!inner (
          *,
          user:auth.users!team_members_user_id_fkey (
            id,
            email,
            raw_user_meta_data
          )
        ),
        projects (
          *,
          content_items (count),
          competitors (count)
        )
      `
      )
      .eq("team_members.user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      enterpriseLogger.error(
        "Error fetching teams with details",
        new Error(error.message),
        { userId }
      );
      throw new Error(`Failed to fetch teams: ${error.message}`);
    }

    // Transform the nested data to include computed fields
    return (data || []).map(team => {
      const teamObj = team as any;
      return {
        ...teamObj,
        project_count: teamObj.projects?.length || 0,
        member_count: teamObj.team_members?.length || 0,
        projects: (teamObj.projects || []).map((project: any) => ({
          ...project,
          content_count: project.content_items?.[0]?.count || 0,
          competitor_count: project.competitors?.[0]?.count || 0,
          latest_content: null, // Would need separate query for this
        })),
      } as TeamWithMembersAndProjects;
    });
  });
};

export const getTeamsByUserOptimized = async (
  userId: string
): Promise<(Team & { role: string; member_count: number })[]> => {
  return withDatabaseConnection(async (client: SupabaseClient<Database>) => {
    const { data, error } = await client
      .from("teams")
      .select(
        `
        *,
        team_members!inner (
          role,
          user_id
        ),
        member_count:team_members (count)
      `
      )
      .eq("team_members.user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch user teams: ${error.message}`);
    }

    return (data || []).map(team => ({
      ...team,
      role: (team.team_members as any)[0]?.role || "member",
      member_count: (team as any).member_count?.[0]?.count || 0,
    }));
  });
};

// =====================================================
// OPTIMIZED PROJECT QUERIES
// =====================================================

interface ProjectWithDetails extends Project {
  team: {
    id: string;
    name: string;
  };
  content_items: ContentItem[];
  competitors: Competitor[];
  analytics_summary: {
    total_pageviews: number;
    total_organic_traffic: number;
    avg_seo_score: number;
    content_count: number;
  };
  user_role: string;
}

export const getProjectsWithDetailsForTeam = async (
  teamId: string,
  userId: string,
  filters?: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }
): Promise<ProjectWithDetails[]> => {
  return withDatabaseConnection(async (client: SupabaseClient<Database>) => {
    // Build the query with proper joins to avoid N+1
    let query = client
      .from("projects")
      .select(
        `
        *,
        team:teams!inner (
          id,
          name
        ),
        content_items (
          id,
          title,
          url,
          status,
          seo_score,
          published_at
        ),
        competitors (
          id,
          name,
          website_url,
          monitoring_enabled
        ),
        team_members!teams_team_members_team_id_fkey (
          user_id,
          role
        )
      `
      )
      .eq("team_id", teamId)
      .eq("team_members.user_id", userId);

    // Apply filters
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    if (filters?.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
      );
    }

    // Apply pagination
    if (filters?.limit || filters?.offset) {
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);
    }

    query = query.order("updated_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch projects: ${error.message}`);
    }

    // Transform data and calculate analytics
    return Promise.all(
      (data || []).map(async project => {
        // Get analytics summary for this project (separate optimized query)
        const analyticsSummary = await getProjectAnalyticsSummary(
          client,
          project.id
        );

        return {
          ...project,
          analytics_summary: analyticsSummary,
          user_role: (project as any).team_members?.[0]?.role || "viewer",
        };
      })
    );
  });
};

const getProjectAnalyticsSummary = async (
  client: SupabaseClient<Database>,
  projectId: string
): Promise<{
  total_pageviews: number;
  total_organic_traffic: number;
  avg_seo_score: number;
  content_count: number;
}> => {
  // Optimized analytics aggregation query
  const { data, error } = await client.rpc("get_project_performance_summary", {
    project_uuid: projectId,
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
  });

  if (error || !data?.[0]) {
    return {
      total_pageviews: 0,
      total_organic_traffic: 0,
      avg_seo_score: 0,
      content_count: 0,
    };
  }

  return {
    total_pageviews: data[0].total_pageviews || 0,
    total_organic_traffic: data[0].total_organic_traffic || 0,
    avg_seo_score: data[0].avg_seo_score || 0,
    content_count: data[0].total_content || 0,
  };
};

// =====================================================
// OPTIMIZED CONTENT QUERIES
// =====================================================

interface ContentWithAnalytics extends ContentItem {
  project: {
    id: string;
    name: string;
    team_id: string;
  };
  recent_analytics: {
    pageviews: number;
    organic_traffic: number;
    conversions: number;
    bounce_rate: number;
  }[];
  performance_trend: "up" | "down" | "stable";
  recommendations_count: number;
}

export const getContentWithAnalyticsForProject = async (
  projectId: string,
  filters?: {
    status?: string;
    content_type?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }
): Promise<ContentWithAnalytics[]> => {
  return withDatabaseConnection(async (client: SupabaseClient<Database>) => {
    // Single query with joins for content and recent analytics
    let query = client
      .from("content_items")
      .select(
        `
        *,
        project:projects!inner (
          id,
          name,
          team_id
        ),
        content_analytics!left (
          pageviews,
          organic_traffic,
          conversions,
          bounce_rate,
          date
        ),
        recommendations_count:content_recommendations (count)
      `
      )
      .eq("project_id", projectId)
      .gte(
        "content_analytics.date",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      )
      .order("content_analytics.date", { ascending: false });

    // Apply filters
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    if (filters?.content_type) {
      query = query.eq("content_type", filters.content_type);
    }

    if (filters?.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,url.ilike.%${filters.search}%`
      );
    }

    // Apply pagination
    if (filters?.limit || filters?.offset) {
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);
    }

    query = query.order("updated_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch content: ${error.message}`);
    }

    // Transform data and calculate trends
    return (data || []).map(content => {
      const analytics = (content as any).content_analytics || [];
      const recentAnalytics = analytics.slice(0, 30); // Last 30 days

      // Calculate performance trend
      const performanceTrend = calculatePerformanceTrend(recentAnalytics);

      return {
        ...content,
        recent_analytics: recentAnalytics,
        performance_trend: performanceTrend,
        recommendations_count:
          (content as any).recommendations_count?.[0]?.count || 0,
      };
    });
  });
};

const calculatePerformanceTrend = (
  analytics: any[]
): "up" | "down" | "stable" => {
  if (analytics.length < 14) return "stable"; // Need at least 2 weeks of data

  const firstWeek = analytics.slice(-14, -7);
  const secondWeek = analytics.slice(-7);

  const firstWeekAvg =
    firstWeek.reduce((sum, a) => sum + (a.organic_traffic || 0), 0) /
    firstWeek.length;
  const secondWeekAvg =
    secondWeek.reduce((sum, a) => sum + (a.organic_traffic || 0), 0) /
    secondWeek.length;

  const changePercentage =
    ((secondWeekAvg - firstWeekAvg) / firstWeekAvg) * 100;

  if (changePercentage > 5) return "up";
  if (changePercentage < -5) return "down";
  return "stable";
};

// =====================================================
// OPTIMIZED COMPETITOR QUERIES
// =====================================================

interface CompetitorWithTracking extends Competitor {
  latest_tracking: {
    estimated_traffic: number;
    domain_authority: number;
    backlinks_count: number;
    organic_keywords: number;
  } | null;
  tracking_trend: "up" | "down" | "stable";
  alert_count: number;
}

export const getCompetitorsWithTrackingForProject = async (
  projectId: string,
  teamId: string
): Promise<CompetitorWithTracking[]> => {
  return withDatabaseConnection(async (client: SupabaseClient<Database>) => {
    const { data, error } = await client
      .from("competitors")
      .select(
        `
        *,
        latest_tracking:competitor_tracking (
          estimated_traffic,
          domain_authority,
          backlinks_count,
          organic_keywords,
          tracking_date
        ),
        alert_count:competitor_alerts (count)
      `
      )
      .eq("project_id", projectId)
      .eq("team_id", teamId)
      .order("competitor_tracking.tracking_date", { ascending: false })
      .limit(1, { foreignTable: "competitor_tracking" })
      .order("updated_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch competitors: ${error.message}`);
    }

    return (data || []).map(competitor => {
      const tracking = (competitor as any).latest_tracking?.[0] || null;

      return {
        ...competitor,
        latest_tracking: tracking,
        tracking_trend: "stable", // Would need historical data to calculate
        alert_count: (competitor as any).alert_count?.[0]?.count || 0,
      };
    });
  });
};

// =====================================================
// OPTIMIZED DASHBOARD QUERIES
// =====================================================

export const getDashboardsWithWidgetsForProject = async (
  projectId?: string,
  userId?: string,
  filters?: {
    isShared?: boolean;
    isTemplate?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }
): Promise<any[]> => {
  return withDatabaseConnection(async (client: SupabaseClient<Database>) => {
    let query = client.from("custom_dashboards").select(`
        *,
        project:projects (
          id,
          name,
          team_id
        ),
        creator:auth.users!created_by (
          email,
          raw_user_meta_data
        ),
        widgets:dashboard_widgets (
          id,
          widget_id,
          widget_type,
          widget_title,
          widget_config,
          position_config,
          is_visible
        )
      `);

    // Apply project filter if provided
    if (projectId) {
      query = query.eq("project_id", projectId);
    } else if (userId) {
      // Get user's accessible projects and filter
      const { data: teamMemberships } = await client
        .from("team_members")
        .select("team_id")
        .eq("user_id", userId);

      if (teamMemberships?.length) {
        const teamIds = teamMemberships.map(tm => tm.team_id);
        const { data: projects } = await client
          .from("projects")
          .select("id")
          .in("team_id", teamIds);

        if (projects?.length) {
          const projectIds = projects.map(p => p.id);
          query = query.in("project_id", projectIds);
        } else {
          return []; // No accessible projects
        }
      } else {
        return []; // No team memberships
      }
    }

    // Apply other filters
    if (filters?.isShared !== undefined) {
      query = query.eq("is_shared", filters.isShared);
    }

    if (filters?.isTemplate !== undefined) {
      query = query.eq("is_template", filters.isTemplate);
    }

    if (filters?.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
      );
    }

    // Apply pagination
    if (filters?.limit || filters?.offset) {
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);
    }

    query = query.order("updated_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch dashboards: ${error.message}`);
    }

    return data || [];
  });
};

// =====================================================
// BULK OPERATIONS FOR EFFICIENCY
// =====================================================

export const bulkCreateContentItems = async (
  items: Omit<
    Tables["content_items"]["Insert"],
    "id" | "created_at" | "updated_at"
  >[]
): Promise<ContentItem[]> => {
  return withDatabaseConnection(async (client: SupabaseClient<Database>) => {
    const { data, error } = await client
      .from("content_items")
      .insert(items)
      .select();

    if (error) {
      throw new Error(`Failed to bulk create content items: ${error.message}`);
    }

    return data || [];
  });
};

export const bulkUpdateContentAnalytics = async (
  analytics: Tables["content_analytics"]["Insert"][]
): Promise<void> => {
  return withDatabaseConnection(async (client: SupabaseClient<Database>) => {
    // Use upsert for analytics to handle duplicates
    const { error } = await client.from("content_analytics").upsert(analytics, {
      onConflict: "content_id,date",
      ignoreDuplicates: false,
    });

    if (error) {
      throw new Error(`Failed to bulk update analytics: ${error.message}`);
    }
  });
};

// =====================================================
// QUERY PERFORMANCE MONITORING
// =====================================================

interface QueryMetrics {
  queryName: string;
  executionTime: number;
  rowsReturned: number;
  cacheHit?: boolean;
}

const queryMetrics: QueryMetrics[] = [];

export const withQueryMetrics = async <T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> => {
  const startTime = Date.now();

  try {
    const result = await queryFn();
    const executionTime = Date.now() - startTime;

    // Log slow queries (>1000ms)
    if (executionTime > 1000) {
      enterpriseLogger.warn(`Slow query detected: ${queryName}`, {
        executionTime,
        timestamp: new Date().toISOString(),
        queryName,
      });
    }

    queryMetrics.push({
      queryName,
      executionTime,
      rowsReturned: Array.isArray(result) ? result.length : 1,
    });

    // Keep only last 100 metrics
    if (queryMetrics.length > 100) {
      queryMetrics.splice(0, queryMetrics.length - 100);
    }

    return result;
  } catch (error) {
    const executionTime = Date.now() - startTime;
    enterpriseLogger.error(
      `Query failed: ${queryName}`,
      error instanceof Error ? error : new Error(String(error)),
      {
        executionTime,
        queryName,
      }
    );
    throw error;
  }
};

export const getQueryMetrics = (): QueryMetrics[] => {
  return [...queryMetrics];
};

export const getSlowQueries = (thresholdMs = 1000): QueryMetrics[] => {
  return queryMetrics.filter(metric => metric.executionTime > thresholdMs);
};
