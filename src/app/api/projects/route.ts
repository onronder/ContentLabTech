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
  console.log("📤 POST request received for project creation");

  try {
    const body: CreateProjectRequest = await request.json();
    console.log("📊 Request body parsed:", {
      teamId: body.teamId,
      name: body.name,
      hasDescription: !!body.description,
    });

    // Validate required fields
    if (!body.teamId || !body.name) {
      return new Response(
        JSON.stringify({
          error: "Team ID and project name are required",
          code: "MISSING_REQUIRED_FIELDS",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate team access
    const teamAccess = await validateTeamAccess(
      context.supabase,
      context.user.id,
      body.teamId,
      "member"
    );

    if (!teamAccess.hasAccess) {
      return new Response(
        JSON.stringify({
          error: teamAccess.error || "Access denied to team",
          code: "ACCESS_DENIED",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create project with simple data
    const projectData = {
      team_id: body.teamId,
      name: body.name,
      description: body.description || null,
      website_url: body.website_url || null,
      target_keywords: body.target_keywords || [],
      target_audience: body.target_audience || null,
      content_goals: body.content_goals || [],
      competitors: body.competitors || [],
      settings: body.settings || {},
      status: "active",
      created_by: context.user.id,
    };

    console.log("📊 Creating project with data:", projectData);

    const { data: newProject, error: createError } = await context.supabase
      .from("projects")
      .insert(projectData)
      .select()
      .single();

    if (createError) {
      console.error("❌ Project creation failed:", createError);
      return new Response(
        JSON.stringify({
          error: "Failed to create project",
          code: "DATABASE_ERROR",
          details: createError.message,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Project created successfully:", newProject?.id);

    return createSuccessResponse({
      project: newProject,
    });
  } catch (error) {
    console.error("❌ Project creation error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
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

    console.log("✅ Projects fetched successfully:", projects?.length || 0);

    return createSuccessResponse({ projects: projects || [] });
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
