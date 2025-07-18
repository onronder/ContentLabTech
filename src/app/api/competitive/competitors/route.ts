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

    // Fetch competitors
    const { data: competitors, error } = await supabase
      .from("competitors")
      .select("*")
      .eq("team_id", team.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch competitors",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: competitors || [],
      count: competitors?.length || 0,
    });
  });
}

export async function POST(request: NextRequest) {
  return authenticatedApiHandler(request, async (user, team) => {
    const supabase = await createClient();
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.domain || !body.project_id) {
      return NextResponse.json(
        { success: false, error: "Name, domain, and project_id are required" },
        { status: 400 }
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
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create competitor",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: competitor,
    });
  });
}
