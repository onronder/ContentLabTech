import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUser,
  createClient,
  validateTeamAccess,
  createErrorResponse,
} from "@/lib/auth/session";
import { jobQueue } from "@/lib/jobs/queue";

interface CreateProjectRequest {
  teamId: string;
  name: string;
  description?: string;
  website_url?: string;
  target_keywords?: string[];
  target_audience?: string;
  content_goals?: string[];
  competitors?: string[];
  settings?: Record<string, unknown>;
}

interface ProjectFilters {
  teamId?: string;
  status?: string;
  search?: string;
  limit: number;
  offset: number;
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return createErrorResponse("Authentication required", 401);
    }

    // Parse request body
    const body: CreateProjectRequest = await request.json();
    const {
      teamId,
      name,
      description,
      website_url,
      target_keywords = [],
      target_audience,
      content_goals = [],
      competitors = [],
      settings = {},
    } = body;

    if (!teamId || !name) {
      return createErrorResponse("Team ID and project name are required", 400);
    }

    // Validate team access (requires admin or owner role)
    const hasAccess = await validateTeamAccess(teamId, "admin");
    if (!hasAccess) {
      return createErrorResponse(
        "Insufficient permissions to create projects",
        403
      );
    }

    const supabase = await createClient();

    // Create project
    const { data: newProject, error: createError } = await supabase
      .from("projects")
      .insert({
        team_id: teamId,
        name,
        description,
        website_url,
        target_keywords,
        target_audience,
        content_goals,
        competitors,
        settings,
        status: "active",
        created_by: user.id,
      })
      .select(
        `
        *,
        team:teams (
          id,
          name,
          description
        )
      `
      )
      .single();

    if (createError) {
      console.error("Error creating project:", createError);
      return createErrorResponse("Failed to create project", 500);
    }

    // Log project creation
    await supabase.from("user_events").insert({
      user_id: user.id,
      event_type: "project_created",
      event_data: {
        project_id: newProject.id,
        team_id: teamId,
        name,
      },
    });

    // Initialize project with competitors if provided
    if (competitors.length > 0) {
      const competitorData = competitors.map(url => ({
        project_id: newProject.id,
        competitor_url: url,
        competitor_name: extractDomainName(url),
        is_active: true,
        added_by: user.id,
      }));

      await supabase.from("competitors").insert(competitorData);
    }

    // Trigger comprehensive analysis for new project
    if (website_url) {
      try {
        await triggerProjectAnalysis({
          projectId: newProject.id,
          userId: user.id,
          teamId,
          websiteUrl: website_url,
          targetKeywords: target_keywords,
          competitorUrls: competitors,
        });
      } catch (analysisError) {
        console.warn('Failed to trigger project analysis:', analysisError);
        // Don't fail project creation if analysis fails
      }
    }

    return NextResponse.json(
      {
        success: true,
        project: newProject,
        analysisTriggered: !!website_url,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("API error:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return createErrorResponse("Authentication required", 401);
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filters: ProjectFilters = {
      limit: Math.min(parseInt(searchParams.get("limit") || "50"), 100),
      offset: parseInt(searchParams.get("offset") || "0"),
    };

    const teamId = searchParams.get("teamId");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    if (teamId) filters.teamId = teamId;
    if (status) filters.status = status;
    if (search) filters.search = search;

    const supabase = await createClient();

    // Get user's team memberships
    const { data: teamMemberships } = await supabase
      .from("team_members")
      .select("team_id, role")
      .eq("user_id", user.id);

    if (!teamMemberships?.length) {
      return NextResponse.json({
        projects: [],
        total: 0,
        filters,
      });
    }

    const accessibleTeamIds = teamMemberships.map(tm => tm.team_id);

    // Build query
    let query = supabase.from("projects").select(`
        id,
        name,
        description,
        website_url,
        target_keywords,
        target_audience,
        content_goals,
        competitors,
        status,
        settings,
        created_at,
        updated_at,
        created_by,
        team:teams (
          id,
          name,
          description,
          owner_id
        ),
        _count:content_items(count)
      `);

    // Apply team filter
    if (filters.teamId) {
      if (!accessibleTeamIds.includes(filters.teamId)) {
        return createErrorResponse("Insufficient permissions", 403);
      }
      query = query.eq("team_id", filters.teamId);
    } else {
      query = query.in("team_id", accessibleTeamIds);
    }

    // Apply other filters
    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    if (filters.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
      );
    }

    // Get total count
    const { count } = await query;

    // Apply pagination and ordering
    query = query
      .order("updated_at", { ascending: false })
      .range(filters.offset, filters.offset + filters.limit - 1);

    const { data: projects, error } = await query;

    if (error) {
      console.error("Error fetching projects:", error);
      return createErrorResponse("Failed to fetch projects", 500);
    }

    // Enhance projects with additional data
    const enhancedProjects = await Promise.all(
      (projects || []).map(async project => {
        // Get content count
        const { count: contentCount } = await supabase
          .from("content_items")
          .select("*", { count: "exact", head: true })
          .eq("project_id", project.id);

        // Get competitor count
        const { count: competitorCount } = await supabase
          .from("competitors")
          .select("*", { count: "exact", head: true })
          .eq("project_id", project.id)
          .eq("is_active", true);

        // Get recent activity
        const { data: recentContent } = await supabase
          .from("content_items")
          .select("created_at")
          .eq("project_id", project.id)
          .order("created_at", { ascending: false })
          .limit(1);

        return {
          ...project,
          stats: {
            contentCount: contentCount || 0,
            competitorCount: competitorCount || 0,
            lastActivity: recentContent?.[0]?.created_at || project.updated_at,
          },
        };
      })
    );

    return NextResponse.json({
      projects: enhancedProjects,
      total: count || 0,
      filters,
    });
  } catch (error) {
    console.error("API error:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

/**
 * Trigger comprehensive analysis for a new project
 */
async function triggerProjectAnalysis(data: {
  projectId: string;
  userId: string;
  teamId: string;
  websiteUrl: string;
  targetKeywords: string[];
  competitorUrls: string[];
}): Promise<void> {
  const { projectId, userId, teamId, websiteUrl, targetKeywords, competitorUrls } = data;

  // Job data structure for all analysis types
  const baseJobData = {
    projectId,
    userId,
    teamId,
    params: {},
  };

  // 1. Content Analysis (Priority: Critical - runs first)
  if (targetKeywords.length > 0) {
    await jobQueue.addJob('content-analysis', {
      ...baseJobData,
      params: {
        websiteUrl,
        targetKeywords,
        competitorUrls,
        analysisDepth: 'comprehensive',
      },
    }, 'critical');
  }

  // 2. SEO Health Check (Priority: High)
  await jobQueue.addJob('seo-health-check', {
    ...baseJobData,
    params: {
      websiteUrl,
      pages: [websiteUrl], // Start with homepage, expand later
      includePerformance: true,
      includeMobile: true,
    },
  }, 'high');

  // 3. Performance Analysis (Priority: High)
  await jobQueue.addJob('performance-analysis', {
    ...baseJobData,
    params: {
      websiteUrl,
      pages: [websiteUrl],
      locations: ['US'], // Default location
      devices: ['desktop', 'mobile'],
    },
  }, 'high');

  // 4. Competitive Intelligence (Priority: Normal - if competitors provided)
  if (competitorUrls.length > 0) {
    await jobQueue.addJob('competitive-intelligence', {
      ...baseJobData,
      params: {
        targetDomain: websiteUrl,
        competitorDomains: competitorUrls,
        keywords: targetKeywords,
        analysisScope: 'comprehensive',
      },
    }, 'normal');
  }

  // 5. Industry Benchmarking (Priority: Normal - runs last)
  await jobQueue.addJob('industry-benchmarking', {
    ...baseJobData,
    params: {
      industry: 'general', // Will be determined by AI analysis
      businessType: 'website',
      targetMetrics: ['seo', 'performance', 'content'],
      region: 'global',
    },
  }, 'normal');

  console.warn(`Triggered comprehensive analysis for project ${projectId}`);
}

// Helper function to extract domain name from URL
function extractDomainName(url: string): string {
  try {
    // Add protocol if missing
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    const domain = new URL(url).hostname;
    return domain.replace("www.", "");
  } catch {
    // If URL parsing fails, return the original string cleaned up
    return url.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0] || url;
  }
}
