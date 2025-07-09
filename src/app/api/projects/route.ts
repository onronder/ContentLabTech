import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  withApiAuth,
  createApiSuccessResponse,
  createApiErrorResponse,
  validateTeamAccess,
} from "@/lib/auth/api-auth";
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

export const POST = withApiAuth(async (request: NextRequest, user) => {
  try {
    console.log("🚀 Projects API POST - Starting request handling");
    console.log("👤 Authenticated user:", { id: user.id, email: user.email });
    
    // Parse request body
    const body: CreateProjectRequest = await request.json();
    console.log("📝 Request body parsed:", {
      teamId: body.teamId,
      name: body.name,
      hasDescription: !!body.description,
      hasWebsiteUrl: !!body.website_url,
      keywordsCount: body.target_keywords?.length || 0,
      goalsCount: body.content_goals?.length || 0,
      competitorsCount: body.competitors?.length || 0
    });
    
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
      console.log("❌ Missing required fields:", { teamId: !!teamId, name: !!name });
      return createApiErrorResponse(
        "Team ID and project name are required",
        400,
        "INVALID_REQUEST"
      );
    }

    // Validate team access (requires admin or owner role)
    console.log("🔍 Validating team access:", { userId: user.id, teamId, requiredRole: "admin" });
    const teamAccess = await validateTeamAccess(user.id, teamId, "admin");
    console.log("🔐 Team access result:", teamAccess);
    
    if (!teamAccess.hasAccess) {
      console.log("🚫 Team access denied:", teamAccess.error);
      return createApiErrorResponse(
        teamAccess.error || "Insufficient permissions to create projects",
        403,
        "INSUFFICIENT_PERMISSIONS"
      );
    }

    console.log("🔧 Initializing Supabase client");
    const supabase = createClient(
      process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
      process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Create project
    console.log("💾 Creating project in database");
    const insertData = {
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
    };
    console.log("📊 Project data to insert:", insertData);
    
    const { data: newProject, error: createError } = await supabase
      .from("projects")
      .insert(insertData)
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

    console.log("💾 Database operation result:", {
      hasProject: !!newProject,
      hasError: !!createError,
      errorMessage: createError?.message,
      errorCode: createError?.code
    });

    if (createError) {
      console.error("❌ Error creating project:", createError);
      return createApiErrorResponse(
        `Failed to create project: ${createError.message}`,
        500,
        "CREATE_PROJECT_ERROR"
      );
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
        console.warn("Failed to trigger project analysis:", analysisError);
        // Don't fail project creation if analysis fails
      }
    }

    return createApiSuccessResponse(
      {
        project: newProject,
        analysisTriggered: !!website_url,
      },
      201
    );
  } catch (error) {
    console.error("API error:", error);
    return createApiErrorResponse(
      "Internal server error",
      500,
      "CREATE_PROJECT_ERROR"
    );
  }
});

export const GET = withApiAuth(async (request: NextRequest, user) => {
  try {
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

    const supabase = createClient(
      process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
      process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get user's team memberships
    const { data: teamMemberships } = await supabase
      .from("team_members")
      .select("team_id, role")
      .eq("user_id", user.id);

    if (!teamMemberships?.length) {
      return createApiSuccessResponse({
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
        return createApiErrorResponse(
          "Insufficient permissions",
          403,
          "TEAM_ACCESS_DENIED"
        );
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
      return createApiErrorResponse(
        "Failed to fetch projects",
        500,
        "FETCH_PROJECTS_ERROR"
      );
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

    return createApiSuccessResponse({
      projects: enhancedProjects,
      total: count || 0,
      filters,
    });
  } catch (error) {
    console.error("API error:", error);
    return createApiErrorResponse(
      "Internal server error",
      500,
      "FETCH_PROJECTS_ERROR"
    );
  }
});

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
  const {
    projectId,
    userId,
    teamId,
    websiteUrl,
    targetKeywords,
    competitorUrls,
  } = data;

  // Job data structure for all analysis types
  const baseJobData = {
    projectId,
    userId,
    teamId,
    params: {},
  };

  // 1. Content Analysis (Priority: Critical - runs first)
  if (targetKeywords.length > 0) {
    await jobQueue.addJob(
      "content-analysis",
      {
        ...baseJobData,
        params: {
          websiteUrl,
          targetKeywords,
          competitorUrls,
          analysisDepth: "comprehensive",
        },
      },
      "critical"
    );
  }

  // 2. SEO Health Check (Priority: High)
  await jobQueue.addJob(
    "seo-health-check",
    {
      ...baseJobData,
      params: {
        websiteUrl,
        pages: [websiteUrl], // Start with homepage, expand later
        includePerformance: true,
        includeMobile: true,
      },
    },
    "high"
  );

  // 3. Performance Analysis (Priority: High)
  await jobQueue.addJob(
    "performance-analysis",
    {
      ...baseJobData,
      params: {
        websiteUrl,
        pages: [websiteUrl],
        locations: ["US"], // Default location
        devices: ["desktop", "mobile"],
      },
    },
    "high"
  );

  // 4. Competitive Intelligence (Priority: Normal - if competitors provided)
  if (competitorUrls.length > 0) {
    await jobQueue.addJob(
      "competitive-intelligence",
      {
        ...baseJobData,
        params: {
          targetDomain: websiteUrl,
          competitorDomains: competitorUrls,
          keywords: targetKeywords,
          analysisScope: "comprehensive",
        },
      },
      "normal"
    );
  }

  // 5. Industry Benchmarking (Priority: Normal - runs last)
  await jobQueue.addJob(
    "industry-benchmarking",
    {
      ...baseJobData,
      params: {
        industry: "general", // Will be determined by AI analysis
        businessType: "website",
        targetMetrics: ["seo", "performance", "content"],
        region: "global",
      },
    },
    "normal"
  );

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
