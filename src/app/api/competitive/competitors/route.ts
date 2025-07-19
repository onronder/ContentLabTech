import { NextRequest, NextResponse } from "next/server";
import {
  withApiAuth,
  createSuccessResponse,
  validateTeamAccess,
  type AuthContext,
} from "@/lib/auth/withApiAuth-definitive";

export const GET = withApiAuth(
  async (request: NextRequest, { user, supabase }: AuthContext) => {
    // Get teamId from query parameters
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");

    if (!teamId) {
      return new Response(
        JSON.stringify({
          error: "Team ID is required",
          code: "INVALID_REQUEST",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate team access with enhanced logging
    const teamAccess = await validateTeamAccess(
      supabase,
      user.id,
      teamId,
      "member"
    );
    if (!teamAccess.hasAccess) {
      return new Response(
        JSON.stringify({
          error: "Access denied",
          code: "TEAM_ACCESS_DENIED",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get team data for queries
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id")
      .eq("id", teamId)
      .single();

    if (teamError || !team) {
      return new Response(
        JSON.stringify({
          error: "Team not found",
          code: "TEAM_NOT_FOUND",
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("🏆 Competitive Competitors API: GET request", {
      userId: user.id,
      teamId: teamId,
      userRole: teamAccess.userRole,
      url: request.url,
    });

    // Fetch competitors
    const { data: competitors, error } = await supabase
      .from("competitors")
      .select("*")
      .eq("team_id", team.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch competitors",
          code: "FETCH_COMPETITORS_ERROR",
          details: error.message,
          status: 500,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return createSuccessResponse({
      competitors: competitors || [],
      count: competitors?.length || 0,
    });
  }
);

export const POST = withApiAuth(
  async (request: NextRequest, { user, supabase }: AuthContext) => {
    // Get teamId from request body
    const body = await request.json();
    const teamId = body.teamId;

    if (!teamId) {
      return new Response(
        JSON.stringify({
          error: "Team ID is required",
          code: "INVALID_REQUEST",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate team access with enhanced logging
    const teamAccess = await validateTeamAccess(
      supabase,
      user.id,
      teamId,
      "member"
    );
    if (!teamAccess.hasAccess) {
      return new Response(
        JSON.stringify({
          error: "Access denied",
          code: "TEAM_ACCESS_DENIED",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get team data
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id")
      .eq("id", teamId)
      .single();

    if (teamError || !team) {
      return new Response(
        JSON.stringify({
          error: "Team not found",
          code: "TEAM_NOT_FOUND",
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("🏆 Competitive Competitors API: POST request", {
      userId: user.id,
      teamId: team.id,
      url: request.url,
    });

    // Validate required fields
    if (!body.name || !body.domain || !body.project_id) {
      return new Response(
        JSON.stringify({
          error: "Name, domain, and project_id are required",
          code: "INVALID_REQUEST",
          status: 400,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create competitor
    const { data: competitor, error } = await supabase
      .from("competitors")
      .insert({
        team_id: team.id,
        project_id: body.project_id, // Required field from schema
        name: body.name,
        website_url: body.domain,
        description: body.description,
        monitoring_enabled: body.monitoring_enabled || false,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Create competitor error:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to create competitor",
          code: "CREATE_COMPETITOR_ERROR",
          details: error.message,
          status: 500,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return createSuccessResponse({ competitor }, 201);
  }
);
