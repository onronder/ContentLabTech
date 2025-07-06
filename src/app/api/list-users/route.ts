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

export async function GET() {
  try {
    // List all users in the system
    const { data: users, error: usersError } =
      await supabase.auth.admin.listUsers();

    if (usersError) {
      return NextResponse.json(
        {
          error: "Failed to list users",
          details: usersError.message,
        },
        { status: 500 }
      );
    }

    // Get basic user info
    const userList = users.users.map(user => ({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
    }));

    // Also get teams and team members data
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("*");

    const { data: teamMembers, error: teamMembersError } = await supabase
      .from("team_members")
      .select("*");

    return NextResponse.json({
      users: userList,
      totalUsers: userList.length,
      teams: teams || [],
      totalTeams: teams?.length || 0,
      teamMembers: teamMembers || [],
      totalTeamMembers: teamMembers?.length || 0,
      errors: {
        usersError: null,
        teamsError: teamsError?.message || null,
        teamMembersError: teamMembersError?.message || null,
      },
    });
  } catch (error) {
    console.error("List users API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
