import { authenticatedApiHandler } from "@/lib/auth/api-handler";
import { createClient } from "@/lib/supabase/server-auth";
import { NextRequest, NextResponse } from "next/server";

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

    return NextResponse.json({
      success: true,
      data: alerts || [],
      stats,
      count: alerts?.length || 0,
    });
  });
}

export async function POST(request: NextRequest) {
  return authenticatedApiHandler(request, async (user, team) => {
    const supabase = await createClient();
    const body = await request.json();

    // Validate required fields
    if (!body.project_id || !body.alert_type) {
      return NextResponse.json(
        { success: false, error: "project_id and alert_type are required" },
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
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create alert",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: alert,
    });
  });
}
