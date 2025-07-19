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

    console.log("🎯 Competitive Alerts API: GET request", {
      userId: user.id,
      teamId: teamId,
      userRole: teamAccess.userRole,
      url: request.url,
    });

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");
    const alertType = searchParams.get("alertType");
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

    // Build query for alerts
    let query = supabase
      .from("competitor_alerts")
      .select("*")
      .eq("team_id", team.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (projectId) {
      query = query.eq("project_id", projectId);
    }

    if (status && status !== "all") {
      query = query.eq("is_active", status === "active");
    }

    if (alertType) {
      query = query.eq("alert_type", alertType);
    }

    const { data: alerts, error } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch alerts",
          details: error.message,
        },
        { status: 500 }
      );
    }

    // Get alert statistics
    const { data: alertStats } = await supabase
      .from("competitor_alerts")
      .select("alert_type, is_active, last_triggered")
      .eq("team_id", team.id);

    const stats = {
      total: alertStats?.length || 0,
      active: alertStats?.filter(a => a.is_active)?.length || 0,
      byType:
        alertStats?.reduce(
          (acc, alert) => {
            acc[alert.alert_type] = (acc[alert.alert_type] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ) || {},
      recentlyTriggered:
        alertStats?.filter(
          a =>
            a.last_triggered &&
            new Date(a.last_triggered) >
              new Date(Date.now() - 24 * 60 * 60 * 1000)
        )?.length || 0,
    };

    return createSuccessResponse({
      alerts: alerts || [],
      stats,
      count: alerts?.length || 0,
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

    console.log("🎯 Competitive Alerts API: POST request", {
      userId: user.id,
      teamId: team.id,
      teamName: team.name,
      url: request.url,
    });
    const body = await request.json();

    // Validate required fields
    if (!body.project_id || !body.alert_type) {
      return new Response(
        JSON.stringify({
          error: "project_id and alert_type are required",
          code: "INVALID_REQUEST",
          status: 400,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
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
      return new Response(
        JSON.stringify({
          error: "Project not found or access denied",
          code: "PROJECT_NOT_FOUND",
          status: 404,
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create alert
    const { data: alert, error } = await supabase
      .from("competitor_alerts")
      .insert({
        team_id: team.id,
        project_id: body.project_id,
        competitor_id: body.competitor_id,
        alert_type: body.alert_type,
        keyword: body.keyword,
        threshold: body.threshold,
        frequency: body.frequency || "daily",
        is_active: body.is_active !== false,
        alert_config: body.alert_config || {},
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Create alert error:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to create alert",
          code: "CREATE_ALERT_ERROR",
          details: error.message,
          status: 500,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return createSuccessResponse({ alert }, 201);
  }
);
