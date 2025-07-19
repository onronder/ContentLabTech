import { NextRequest, NextResponse } from "next/server";
import {
  withApiAuth,
  createSuccessResponse,
  validateTeamAccess,
  type AuthContext,
} from "@/lib/auth/withApiAuth-definitive";

export const GET = withApiAuth(
  async (request: NextRequest, { user, supabase }: AuthContext) => {
    // Validate team access with enhanced logging
    const teamValidation = await validateTeamAccess(request, user, supabase);
    if (!teamValidation.success) {
      return new Response(
        JSON.stringify({
          error: teamValidation.error,
          code: "TEAM_ACCESS_DENIED",
          status: 403,
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
    const { team } = teamValidation;

    console.log("🏆 Competitive Competitors API: GET request", {
      userId: user.id,
      teamId: team.id,
      teamName: team.name,
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
    // Validate team access with enhanced logging
    const teamValidation = await validateTeamAccess(request, user, supabase);
    if (!teamValidation.success) {
      return new Response(
        JSON.stringify({
          error: teamValidation.error,
          code: "TEAM_ACCESS_DENIED",
          status: 403,
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
    const { team } = teamValidation;

    console.log("🏆 Competitive Competitors API: POST request", {
      userId: user.id,
      teamId: team.id,
      teamName: team.name,
      url: request.url,
    });

    const body = await request.json();

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
