import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server-auth";

/**
 * Debug endpoint to ensure user has at least one team membership
 * This creates a default team if the user doesn't have any
 */
export async function POST(request: NextRequest) {
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

    // Check if user has any team memberships
    const { data: existingMemberships, error: membershipError } = await supabase
      .from("team_members")
      .select("team_id, role, teams!inner(id, name)")
      .eq("user_id", user.id);

    if (membershipError) {
      console.error("Error checking team memberships:", membershipError);
      return NextResponse.json(
        { error: "Failed to check team memberships", details: membershipError },
        { status: 500 }
      );
    }

    // If user already has team memberships, return them
    if (existingMemberships && existingMemberships.length > 0) {
      return NextResponse.json({
        message: "User already has team memberships",
        teams: existingMemberships,
        currentTeamId: existingMemberships[0].team_id,
      });
    }

    // User has no teams, create a default team
    console.log(`Creating default team for user ${user.email}`);

    // Use the database function to create team with owner
    const { data: newTeam, error: createError } = await supabase.rpc(
      "create_team_with_owner",
      {
        p_name: `${user.email?.split("@")[0] || "User"}'s Team`,
        p_owner_id: user.id,
      }
    );

    if (createError) {
      console.error("Error creating default team:", createError);
      return NextResponse.json(
        { error: "Failed to create default team", details: createError },
        { status: 500 }
      );
    }

    // Fetch the newly created team membership
    const { data: newMembership, error: fetchError } = await supabase
      .from("team_members")
      .select("team_id, role, teams!inner(id, name)")
      .eq("user_id", user.id)
      .eq("team_id", newTeam.id)
      .single();

    if (fetchError || !newMembership) {
      console.error("Error fetching new team membership:", fetchError);
      return NextResponse.json(
        { error: "Team created but failed to fetch membership" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Default team created successfully",
      team: newMembership,
      currentTeamId: newMembership.team_id,
    });
  } catch (error) {
    console.error("Unexpected error in ensure-team endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check current team memberships
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

    // Get all team memberships
    const { data: memberships, error: membershipError } = await supabase
      .from("team_members")
      .select("team_id, role, teams!inner(id, name, created_at)")
      .eq("user_id", user.id);

    if (membershipError) {
      return NextResponse.json(
        { error: "Failed to fetch team memberships", details: membershipError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      userId: user.id,
      email: user.email,
      teams: memberships || [],
      count: memberships?.length || 0,
    });
  } catch (error) {
    console.error("Error in ensure-team GET:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error },
      { status: 500 }
    );
  }
}
