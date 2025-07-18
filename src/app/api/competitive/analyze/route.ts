import { authenticatedApiHandler } from "@/lib/auth/api-handler";
import { createClient } from "@/lib/supabase/server-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  return authenticatedApiHandler(request, async (user, team) => {
    const supabase = await createClient();

    // Debug logging
    console.log("User:", user.id, "Team:", team.id);

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

    const body = await request.json();

    // Validate required fields
    if (!body.project_id || !body.analysis_type) {
      return NextResponse.json(
        { success: false, error: "project_id and analysis_type are required" },
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

    // If competitor_id is provided, verify it belongs to team
    if (body.competitor_id) {
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
    }

    // Create analysis job/request
    const analysisData = {
      project_id: body.project_id,
      analysis_type: body.analysis_type,
      competitor_id: body.competitor_id,
      target_keywords: body.keywords || [],
      analysis_params: {
        includeContentGaps: body.includeContentGaps || false,
        includeTechnicalSeo: body.includeTechnicalSeo || false,
        analysisDepth: body.analysisDepth || "standard",
        competitorUrls: body.competitorUrls || [],
      },
      status: "pending",
      requested_by: user.id,
      team_id: team.id,
    };

    // For now, return a mock response since we don't have the actual analysis engine
    // In a real implementation, this would queue the analysis job
    const mockAnalysisResult = {
      id: `analysis_${Date.now()}`,
      project_id: body.project_id,
      analysis_type: body.analysis_type,
      status: "completed",
      results: {
        competitors:
          body.competitorUrls?.map((url: string) => ({
            url,
            rankings: { average_position: Math.floor(Math.random() * 50) + 1 },
            traffic: { estimated_monthly: Math.floor(Math.random() * 100000) },
            content: { pages_analyzed: Math.floor(Math.random() * 500) + 50 },
            keywords: {
              total_keywords: Math.floor(Math.random() * 1000) + 100,
            },
          })) || [],
        summary: {
          total_competitors: body.competitorUrls?.length || 0,
          analysis_date: new Date().toISOString(),
          confidence_score: Math.floor(Math.random() * 30) + 70,
        },
      },
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    };

    // Store the analysis result in the database
    const { data: analysis, error } = await supabase
      .from("competitor_analysis_results")
      .insert({
        team_id: team.id,
        project_id: body.project_id,
        competitor_id: body.competitor_id,
        analysis_type: body.analysis_type,
        analysis_data: mockAnalysisResult.results,
        confidence_score: mockAnalysisResult.results.summary.confidence_score,
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

    return NextResponse.json({
      success: true,
      data: {
        analysis_id: analysis.id,
        status: "completed",
        results: mockAnalysisResult.results,
        message: "Analysis completed successfully",
      },
    });
  });
}

export async function GET(request: NextRequest) {
  return authenticatedApiHandler(request, async (user, team) => {
    const supabase = await createClient();

    // Debug logging
    console.log("User:", user.id, "Team:", team.id);

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
    const analysisId = searchParams.get("analysisId");

    if (analysisId) {
      // Get specific analysis
      const { data: analysis, error } = await supabase
        .from("competitor_analysis_results")
        .select("*")
        .eq("id", analysisId)
        .eq("team_id", team.id)
        .single();

      if (error) {
        console.error("Database error:", error);
        return NextResponse.json(
          {
            success: false,
            error: "Analysis not found",
            details: error.message,
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: analysis,
      });
    }

    // Get all analyses for project or team
    let query = supabase
      .from("competitor_analysis_results")
      .select("*")
      .eq("team_id", team.id)
      .order("generated_at", { ascending: false });

    if (projectId) {
      query = query.eq("project_id", projectId);
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

    return NextResponse.json({
      success: true,
      data: analyses || [],
      count: analyses?.length || 0,
    });
  });
}
