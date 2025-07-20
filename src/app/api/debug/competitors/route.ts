import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server-auth";

/**
 * Debug endpoint to check competitors and team memberships
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Not authenticated", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Get user's team memberships
    const { data: memberships, error: membershipError } = await supabase
      .from("team_members")
      .select("team_id, role, teams!inner(id, name)")
      .eq("user_id", user.id);

    if (membershipError) {
      return NextResponse.json(
        { error: "Failed to fetch team memberships", details: membershipError },
        { status: 500 }
      );
    }

    // Get all competitors for user's teams
    const teamIds = memberships?.map(m => m.team_id) || [];

    let allCompetitors = [];
    if (teamIds.length > 0) {
      const { data: competitors, error: competitorsError } = await supabase
        .from("competitors")
        .select("*")
        .in("team_id", teamIds);

      if (competitorsError) {
        return NextResponse.json(
          { error: "Failed to fetch competitors", details: competitorsError },
          { status: 500 }
        );
      }

      allCompetitors = competitors || [];
    }

    // Check if the specific competitor exists
    const { data: specificCompetitor, error: specificError } = await supabase
      .from("competitors")
      .select("*")
      .eq("id", "e35d40dd-44ab-4050-b0ce-a03d8c98d1c2")
      .single();

    // Get localStorage teamId from request headers if available
    const url = new URL(request.url);
    const requestedTeamId = url.searchParams.get("teamId");

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      teamMemberships: memberships || [],
      requestedTeamId,
      allCompetitors,
      specificCompetitor: {
        found: !specificError,
        data: specificCompetitor || null,
        error: specificError?.message || null,
      },
      debug: {
        userTeamIds: teamIds,
        competitorCount: allCompetitors.length,
        specificCompetitorTeamId: specificCompetitor?.team_id || null,
        userHasAccessToSpecificCompetitor: teamIds.includes(
          specificCompetitor?.team_id
        ),
      },
    });
  } catch (error) {
    console.error("Error in debug competitors endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error },
      { status: 500 }
    );
  }
}
