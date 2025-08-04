/**
 * Optimized Projects API
 * Enterprise-grade implementation with connection pooling and caching
 */

import { NextRequest, NextResponse } from "next/server";
import {
  withApiAuth,
  createSuccessResponse,
  validateTeamAccess,
  type AuthContext,
} from "@/lib/auth/withApiAuth-v2";
import { validateInput } from "@/lib/security/validation";
import { enterpriseLogger } from "@/lib/monitoring/enterprise-logger";

// Connection pooling and caching are handled by optimized-queries module

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

async function handlePost(request: NextRequest, context: AuthContext) {
  const { requestId, ipAddress } = context;

  try {
    const body: CreateProjectRequest = await request.json();

    // Input validation
    if (!validateInput(body.name, "text", { minLength: 1, maxLength: 100 })) {
      return NextResponse.json(
        {
          error: "Project name must be between 1 and 100 characters",
          code: "INVALID_PROJECT_NAME",
          requestId,
        },
        { status: 400 }
      );
    }

    if (!validateInput(body.teamId, "uuid")) {
      return NextResponse.json(
        {
          error: "Invalid team ID format",
          code: "INVALID_TEAM_ID",
          requestId,
        },
        { status: 400 }
      );
    }

    enterpriseLogger.info("Project creation request", {
      requestId,
      teamId: body.teamId,
      projectName: body.name,
      userId: context.user.id,
      ipAddress,
    });

    // Validate team access with enhanced error handling
    const teamAccess = await validateTeamAccess(
      context.supabase,
      context.user.id,
      body.teamId,
      "member",
      requestId
    );

    if (!teamAccess.hasAccess) {
      enterpriseLogger.warn("Team access denied for project creation", {
        requestId,
        userId: context.user.id,
        teamId: body.teamId,
        error: teamAccess.error,
        ipAddress,
      });

      return NextResponse.json(
        {
          error: teamAccess.error || "Access denied to team",
          code: "ACCESS_DENIED",
          requestId,
        },
        { status: 403 }
      );
    }

    // Sanitize and validate project data
    const projectData = {
      team_id: body.teamId,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      website_url:
        body.website_url && validateInput(body.website_url, "url")
          ? body.website_url
          : null,
      target_keywords: Array.isArray(body.target_keywords)
        ? body.target_keywords.slice(0, 50)
        : [],
      target_audience: body.target_audience?.trim() || null,
      content_goals: Array.isArray(body.content_goals)
        ? body.content_goals.slice(0, 20)
        : [],
      competitors: Array.isArray(body.competitors)
        ? body.competitors.slice(0, 10)
        : [],
      settings: typeof body.settings === "object" ? body.settings : {},
      status: "active",
      created_by: context.user.id,
    };

    const startTime = Date.now();
    const { data: newProject, error: createError } = await context.supabase
      .from("projects")
      .insert(projectData)
      .select()
      .single();
    const dbDuration = Date.now() - startTime;

    if (createError) {
      enterpriseLogger.error("Project creation database error", createError, {
        requestId,
        code: createError.code,
        userId: context.user.id,
        teamId: body.teamId,
        dbDuration,
      });

      return NextResponse.json(
        {
          error: "Failed to create project",
          code: "DATABASE_ERROR",
          requestId,
          details:
            process.env.NODE_ENV === "development"
              ? createError.message
              : undefined,
        },
        { status: 500 }
      );
    }

    enterpriseLogger.info("Project created successfully", {
      requestId,
      projectId: newProject?.id,
      projectName: newProject?.name,
      userId: context.user.id,
      teamId: body.teamId,
      dbDuration,
    });

    // Add stats to the new project for consistency with GET endpoint
    const projectWithStats = {
      ...newProject,
      stats: {
        contentCount: 0,
        competitorCount: 0,
        lastActivity: newProject?.created_at || new Date().toISOString(),
      },
    };

    return createSuccessResponse(
      {
        project: projectWithStats,
      },
      201,
      undefined,
      requestId
    );
  } catch (error) {
    enterpriseLogger.error(
      "Project creation error",
      error instanceof Error ? error : new Error(String(error)),
      {
        requestId,
        userId: context.user.id,
        ipAddress,
      }
    );

    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        requestId,
      },
      { status: 500 }
    );
  }
}

export const POST = withApiAuth(handlePost);

async function handleGet(request: NextRequest, context: AuthContext) {
  console.log("📥 GET request received for projects");

  try {
    const url = new URL(request.url);
    const teamId = url.searchParams.get("teamId");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search");

    console.log("📊 Query parameters:", {
      teamId,
      limit,
      offset,
      status,
      search,
    });

    // Get user's teams
    const { data: userTeams, error: teamsError } = await context.supabase
      .from("team_members")
      .select(
        `
        team_id,
        role,
        teams!inner (
          id,
          name
        )
      `
      )
      .eq("user_id", context.user.id);

    if (teamsError || !userTeams || userTeams.length === 0) {
      console.log("✅ No accessible teams found");
      return createSuccessResponse({ projects: [] });
    }

    // Filter teams if teamId specified
    let filteredTeams = userTeams;
    if (teamId) {
      const hasAccess = userTeams.some(t => t.team_id === teamId);
      if (!hasAccess) {
        return new Response(
          JSON.stringify({
            error: "Access denied to requested team",
            code: "ACCESS_DENIED",
          }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
      filteredTeams = userTeams.filter(t => t.team_id === teamId);
    }

    // Get projects for accessible teams
    const teamIds = filteredTeams.map(t => t.team_id);
    let projectQuery = context.supabase
      .from("projects")
      .select(
        `
        id,
        name,
        description,
        website_url,
        status,
        created_at,
        updated_at,
        team_id,
        created_by
      `
      )
      .in("team_id", teamIds)
      .order("updated_at", { ascending: false });

    // Apply filters
    if (status) {
      projectQuery = projectQuery.eq("status", status);
    }
    if (search) {
      projectQuery = projectQuery.or(
        `name.ilike.%${search}%,description.ilike.%${search}%`
      );
    }

    // Apply pagination
    projectQuery = projectQuery.range(offset, offset + limit - 1);

    const { data: projects, error: projectsError } = await projectQuery;

    if (projectsError) {
      console.error("❌ Projects fetch error:", projectsError);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch projects",
          code: "DATABASE_ERROR",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Enrich projects with stats
    const enrichedProjects = await Promise.all(
      (projects || []).map(async project => {
        try {
          // Get content count
          const { count: contentCount } = await context.supabase
            .from("content_items")
            .select("*", { count: "exact", head: true })
            .eq("project_id", project.id);

          // Get competitor count
          const { count: competitorCount } = await context.supabase
            .from("competitors")
            .select("*", { count: "exact", head: true })
            .eq("project_id", project.id)
            .eq("is_active", true);

          // Get last activity
          const { data: recentContent } = await context.supabase
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
              lastActivity:
                recentContent?.[0]?.created_at || project.updated_at,
            },
          };
        } catch (error) {
          console.error(`Error enriching project ${project.id}:`, error);
          // Return project with default stats if enrichment fails
          return {
            ...project,
            stats: {
              contentCount: 0,
              competitorCount: 0,
              lastActivity: project.updated_at,
            },
          };
        }
      })
    );

    console.log(
      "✅ Projects fetched successfully:",
      enrichedProjects?.length || 0
    );

    return createSuccessResponse({ projects: enrichedProjects || [] });
  } catch (error) {
    console.error("❌ Projects GET error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export const GET = withApiAuth(handleGet);
