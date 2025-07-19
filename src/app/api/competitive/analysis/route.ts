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

    console.log("📊 Competitive Analysis API: GET request", {
      userId: user.id,
      teamId: team.id,
      teamName: team.name,
      url: request.url,
    });

    // Verify team membership
    const { data: membership, error: membershipError } = await supabase
      .from("team_members")
      .select("*")
      .eq("user_id", user.id)
      .eq("team_id", team.id)
      .single();

    if (membershipError || !membership) {
      console.error("Team membership error:", membershipError);
      return NextResponse.json(
        {
          success: false,
          error: "Team membership validation failed",
          code: "NO_MEMBERSHIP",
        },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const analysisType = searchParams.get("analysisType");
    const competitorId = searchParams.get("competitorId");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Validate projectId if provided
    if (projectId) {
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .eq("team_id", team.id)
        .single();

      if (projectError || !project) {
        return NextResponse.json(
          { success: false, error: "Project not found or access denied" },
          { status: 404 }
        );
      }
    }

    // Build query for analysis results
    let query = supabase
      .from("competitor_analysis_results")
      .select("*")
      .eq("team_id", team.id)
      .order("generated_at", { ascending: false })
      .limit(limit);

    if (projectId) {
      query = query.eq("project_id", projectId);
    }

    if (analysisType) {
      query = query.eq("analysis_type", analysisType);
    }

    if (competitorId) {
      query = query.eq("competitor_id", competitorId);
    }

    const { data: analyses, error } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch analyses",
          details: error.message,
        },
        { status: 500 }
      );
    }

    // Get analysis statistics
    const { data: analysisStats } = await supabase
      .from("competitor_analysis_results")
      .select("analysis_type, confidence_score, generated_at")
      .eq("team_id", team.id);

    const stats = {
      total: analysisStats?.length || 0,
      byType:
        analysisStats?.reduce(
          (acc, analysis) => {
            acc[analysis.analysis_type] =
              (acc[analysis.analysis_type] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ) || {},
      avgConfidence: analysisStats?.length
        ? analysisStats.reduce((sum, a) => sum + (a.confidence_score || 0), 0) /
          analysisStats.length
        : 0,
      recent:
        analysisStats?.filter(
          a =>
            new Date(a.generated_at) >
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        )?.length || 0,
    };

    return createSuccessResponse({
      analyses: analyses || [],
      stats,
      count: analyses?.length || 0,
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

    console.log("📊 Competitive Analysis API: POST request", {
      userId: user.id,
      teamId: team.id,
      teamName: team.name,
      url: request.url,
    });
    const body = await request.json();

    // Validate required fields
    if (!body.project_id || !body.competitor_id || !body.analysis_type) {
      return NextResponse.json(
        {
          success: false,
          error: "project_id, competitor_id, and analysis_type are required",
        },
        { status: 400 }
      );
    }

    // Verify project belongs to team
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", body.project_id)
      .eq("team_id", team.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { success: false, error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    // Verify competitor belongs to team
    const { data: competitor, error: competitorError } = await supabase
      .from("competitors")
      .select("id")
      .eq("id", body.competitor_id)
      .eq("team_id", team.id)
      .single();

    if (competitorError || !competitor) {
      return NextResponse.json(
        { success: false, error: "Competitor not found or access denied" },
        { status: 404 }
      );
    }

    // Create analysis result
    const { data: analysis, error } = await supabase
      .from("competitor_analysis_results")
      .insert({
        team_id: team.id,
        project_id: body.project_id,
        competitor_id: body.competitor_id,
        analysis_type: body.analysis_type,
        analysis_data: body.analysis_data || {},
        confidence_score: body.confidence_score,
        expires_at: body.expires_at,
      })
      .select()
      .single();

    if (error) {
      console.error("Create analysis error:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create analysis",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return createSuccessResponse({ analysis }, 201);
  }
);
