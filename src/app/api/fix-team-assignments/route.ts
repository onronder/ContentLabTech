import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create server-side Supabase client with service role
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

interface FixResult {
  success: boolean;
  message: string;
  details?: unknown;
}

export async function GET() {
  try {
    // Starting diagnostic check

    // 1. Get all users
    const { data: authUsers, error: usersError } =
      await supabase.auth.admin.listUsers();
    if (usersError) {
      throw new Error(`Failed to list users: ${usersError.message}`);
    }

    // 2. Get all teams
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("*");
    if (teamsError) {
      throw new Error(`Failed to get teams: ${teamsError.message}`);
    }

    // 3. Get all team members
    const { data: teamMembers, error: teamMembersError } = await supabase
      .from("team_members")
      .select("*");
    if (teamMembersError) {
      throw new Error(
        `Failed to get team members: ${teamMembersError.message}`
      );
    }

    // 4. Find users without team assignments
    const usersWithoutTeams = authUsers.users.filter(
      user => !teamMembers?.some(member => member.user_id === user.id)
    );

    // 5. Find teams where owner is not in team_members
    const teamsWithMissingOwners =
      teams?.filter(
        team =>
          !teamMembers?.some(
            member =>
              member.team_id === team.id && member.user_id === team.owner_id
          )
      ) || [];

    const analysis = {
      totalUsers: authUsers.users.length,
      totalTeams: teams?.length || 0,
      totalTeamMembers: teamMembers?.length || 0,
      usersWithoutTeams: usersWithoutTeams.length,
      teamsWithMissingOwners: teamsWithMissingOwners.length,
      usersWithoutTeamsList: usersWithoutTeams.map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
      })),
      teamsWithMissingOwnersList: teamsWithMissingOwners.map(t => ({
        id: t.id,
        name: t.name,
        owner_id: t.owner_id,
        created_at: t.created_at,
      })),
    };

    return NextResponse.json({
      analysis,
      needsFix:
        analysis.usersWithoutTeams > 0 || analysis.teamsWithMissingOwners > 0,
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze team assignments",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Starting fix process

    const body = await request.json();
    const { userId } = body;

    const fixes: FixResult[] = [];

    // If a specific userId is provided, fix only that user
    if (userId) {
      // Fixing team assignment for specific user

      // Get user info
      const { data: authUser, error: userError } =
        await supabase.auth.admin.getUserById(userId);
      if (userError || !authUser.user) {
        throw new Error(
          `Failed to get user: ${userError?.message || "User not found"}`
        );
      }

      // Check if user already has team membership
      const { data: existingMemberships, error: membershipError } =
        await supabase.from("team_members").select("*").eq("user_id", userId);

      if (membershipError) {
        throw new Error(
          `Failed to check team memberships: ${membershipError.message}`
        );
      }

      if (existingMemberships && existingMemberships.length > 0) {
        return NextResponse.json({
          summary: {
            totalFixes: 0,
            successful: 0,
            failed: 0,
            usersFixed: 0,
            teamsFixed: 0,
          },
          fixes: [
            {
              success: true,
              message: `User ${authUser.user.email} already has team memberships`,
              details: { existingMemberships },
            },
          ],
        });
      }

      // Create team for this user
      const user = authUser.user;
      const teamName = `${user.email?.split("@")[0] || "User"}'s Team`;

      // Creating team for user

      const { data: teamId, error: createError } = await supabase.rpc(
        "create_team_with_owner",
        {
          team_name: teamName,
          team_description: "Default team created automatically",
          user_uuid: user.id,
        }
      );

      if (createError) {
        fixes.push({
          success: false,
          message: `Failed to create team for ${user.email}`,
          details: createError.message,
        });
      } else {
        fixes.push({
          success: true,
          message: `Created team "${teamName}" for ${user.email}`,
          details: { teamId, userId: user.id },
        });
      }

      return NextResponse.json({
        summary: {
          totalFixes: 1,
          successful: fixes.filter(f => f.success).length,
          failed: fixes.filter(f => !f.success).length,
          usersFixed: fixes.filter(f => f.success).length,
          teamsFixed: 0,
        },
        fixes,
      });
    }

    // Original logic for fixing all users
    // 1. Get all users
    const { data: authUsers, error: usersError } =
      await supabase.auth.admin.listUsers();
    if (usersError) {
      throw new Error(`Failed to list users: ${usersError.message}`);
    }

    // 2. Get current team members
    const { data: teamMembers, error: teamMembersError } = await supabase
      .from("team_members")
      .select("*");
    if (teamMembersError) {
      throw new Error(
        `Failed to get team members: ${teamMembersError.message}`
      );
    }

    // 3. Find users without team assignments
    const usersWithoutTeams = authUsers.users.filter(
      user => !teamMembers?.some(member => member.user_id === user.id)
    );

    // Processing users without teams

    // 4. Create default teams for users without teams
    for (const user of usersWithoutTeams) {
      try {
        const teamName = `${user.email?.split("@")[0] || "User"}'s Team`;

        // Creating team for user

        const { data: teamId, error: createError } = await supabase.rpc(
          "create_team_with_owner",
          {
            team_name: teamName,
            team_description: "Default team created automatically",
            user_uuid: user.id,
          }
        );

        if (createError) {
          fixes.push({
            success: false,
            message: `Failed to create team for ${user.email}`,
            details: createError.message,
          });
          continue;
        }

        fixes.push({
          success: true,
          message: `Created team "${teamName}" for ${user.email}`,
          details: { teamId, userId: user.id },
        });
      } catch (error) {
        fixes.push({
          success: false,
          message: `Error creating team for ${user.email}`,
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // 5. Fix teams where owner is not in team_members
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("*");
    if (teamsError) {
      throw new Error(`Failed to get teams: ${teamsError.message}`);
    }

    // Refresh team members after creating new teams
    const { data: updatedTeamMembers, error: updatedTeamMembersError } =
      await supabase.from("team_members").select("*");
    if (updatedTeamMembersError) {
      throw new Error(
        `Failed to get updated team members: ${updatedTeamMembersError.message}`
      );
    }

    const teamsWithMissingOwners =
      teams?.filter(
        team =>
          !updatedTeamMembers?.some(
            member =>
              member.team_id === team.id && member.user_id === team.owner_id
          )
      ) || [];

    // Processing teams with missing owner memberships

    for (const team of teamsWithMissingOwners) {
      try {
        // Adding owner membership for team

        const { error: insertError } = await supabase
          .from("team_members")
          .insert({
            team_id: team.id,
            user_id: team.owner_id,
            role: "owner",
          });

        if (insertError) {
          fixes.push({
            success: false,
            message: `Failed to add owner membership for team ${team.name}`,
            details: insertError.message,
          });
          continue;
        }

        fixes.push({
          success: true,
          message: `Added owner membership for team ${team.name}`,
          details: { teamId: team.id, ownerId: team.owner_id },
        });
      } catch (error) {
        fixes.push({
          success: false,
          message: `Error fixing team ownership for ${team.name}`,
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successfulFixes = fixes.filter(fix => fix.success).length;
    const failedFixes = fixes.filter(fix => !fix.success).length;

    return NextResponse.json({
      summary: {
        totalFixes: fixes.length,
        successful: successfulFixes,
        failed: failedFixes,
        usersFixed: usersWithoutTeams.length,
        teamsFixed: teamsWithMissingOwners.length,
      },
      fixes,
    });
  } catch (error) {
    console.error("Fix error:", error);
    return NextResponse.json(
      {
        error: "Failed to fix team assignments",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
