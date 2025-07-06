import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create server-side Supabase client
const supabase = createClient(
  process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
  process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function GET(request: NextRequest) {
  try {
    // Get user ID from query params or headers for debugging
    const { searchParams } = new URL(request.url);
    const debugUserId = searchParams.get("userId");

    if (!debugUserId) {
      return NextResponse.json(
        {
          error: "Please provide userId as query parameter for debugging",
          example: "/api/debug-team-membership?userId=your-user-id",
        },
        { status: 400 }
      );
    }

    const userId = debugUserId;

    // Get user info from auth.users table
    const { data: userData, error: userError } = await supabase
      .from("auth.users")
      .select("id, email")
      .eq("id", userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        {
          error: "User not found in auth.users table",
          userError: userError?.message,
        },
        { status: 404 }
      );
    }

    const userEmail = userData.email;

    // Checking team membership for user

    // 1. Check teams table structure and data
    const { data: allTeams, error: teamsError } = await supabase
      .from("teams")
      .select("*");

    // 2. Check team_members table structure and data
    const { data: allTeamMembers, error: teamMembersError } = await supabase
      .from("team_members")
      .select("*");

    // 3. Check specific user's team memberships
    const { data: userTeams, error: userTeamsError } = await supabase
      .from("teams")
      .select(
        `
        *,
        team_members!inner(role)
      `
      )
      .eq("team_members.user_id", userId);

    // 4. Check if user exists in team_members table at all
    const { data: userMemberships, error: membershipError } = await supabase
      .from("team_members")
      .select("*")
      .eq("user_id", userId);

    return NextResponse.json({
      debug: {
        userId,
        userEmail,
        totalTeams: allTeams?.length || 0,
        totalTeamMembers: allTeamMembers?.length || 0,
        userTeamsCount: userTeams?.length || 0,
        userMembershipsCount: userMemberships?.length || 0,
      },
      data: {
        allTeams: allTeams || [],
        allTeamMembers: allTeamMembers || [],
        userTeams: userTeams || [],
        userMemberships: userMemberships || [],
      },
      errors: {
        teamsError: teamsError?.message || null,
        teamMembersError: teamMembersError?.message || null,
        userTeamsError: userTeamsError?.message || null,
        membershipError: membershipError?.message || null,
      },
    });
  } catch (error) {
    console.error("Debug API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get user ID from request body for debugging
    const { userId: debugUserId } = await request.json();

    if (!debugUserId) {
      return NextResponse.json(
        {
          error: "Please provide userId in request body for debugging",
        },
        { status: 400 }
      );
    }

    const userId = debugUserId;

    // Get user info from auth.users table
    const { data: userData, error: userError } = await supabase
      .from("auth.users")
      .select("id, email")
      .eq("id", userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        {
          error: "User not found in auth.users table",
          userError: userError?.message,
        },
        { status: 404 }
      );
    }

    const userEmail = userData.email;

    // Creating default team for user

    // First, check if user already has any teams
    const { data: existingMemberships } = await supabase
      .from("team_members")
      .select("*")
      .eq("user_id", userId);

    if (existingMemberships && existingMemberships.length > 0) {
      return NextResponse.json({
        message: "User already has team memberships",
        memberships: existingMemberships,
      });
    }

    // Create a default team using the RPC function
    const { data: teamId, error: createError } = await supabase.rpc(
      "create_team_with_owner",
      {
        team_name: `${userEmail?.split("@")[0]}'s Team`,
        team_description: "Default team created automatically",
        user_uuid: userId,
      }
    );

    if (createError) {
      return NextResponse.json(
        {
          error: "Failed to create default team",
          details: createError.message,
        },
        { status: 500 }
      );
    }

    // Verify the team was created and user is a member
    const { data: createdTeam, error: verifyError } = await supabase
      .from("teams")
      .select(
        `
        *,
        team_members(*)
      `
      )
      .eq("id", teamId)
      .single();

    if (verifyError) {
      return NextResponse.json(
        {
          error: "Failed to verify team creation",
          details: verifyError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Default team created successfully",
      team: createdTeam,
      teamId,
    });
  } catch (error) {
    console.error("Fix API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
