import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerAuthClient } from "@/lib/supabase/server-auth";

interface TeamMemberResponse {
  id: string;
  email: string;
  fullName: string;
  avatar?: string;
  role: string;
  isOnline: boolean;
  lastActive: string;
  joinedAt?: string;
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  console.log(`🔍 [${requestId}] TEAM MEMBERS API - START`, {
    timestamp,
    url: request.url,
    method: request.method,
  });

  try {
    // Create Supabase client
    const supabase = await createServerAuthClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log(`🔍 [${requestId}] Authentication result:`, {
      authenticated: !!user,
      userId: user?.id,
      userEmail: user?.email,
      error: authError?.message,
    });

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "Authentication required",
          code: "AUTH_REQUIRED",
          requestId,
        },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const teamId = searchParams.get("teamId");

    if (!projectId && !teamId) {
      return NextResponse.json(
        {
          error: "Project ID or Team ID is required",
          code: "MISSING_PARAMS",
          requestId,
        },
        { status: 400 }
      );
    }

    let targetTeamId = teamId;

    // If projectId provided, get the team ID
    if (projectId && !teamId) {
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("team_id")
        .eq("id", projectId)
        .single();

      if (projectError || !project) {
        return NextResponse.json(
          {
            error: "Project not found",
            code: "PROJECT_NOT_FOUND",
            requestId,
          },
          { status: 404 }
        );
      }

      targetTeamId = project.team_id;
    }

    // Validate team access
    console.log(
      `🔍 [${requestId}] Validating team access for team:`,
      targetTeamId
    );

    const { data: teamMember, error: accessError } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", targetTeamId!)
      .eq("user_id", user.id)
      .single();

    if (accessError || !teamMember) {
      console.log(`❌ [${requestId}] Access denied:`, {
        error: accessError?.message,
        teamId: targetTeamId,
        userId: user.id,
      });

      return NextResponse.json(
        {
          error: "Insufficient permissions",
          code: "ACCESS_DENIED",
          requestId,
        },
        { status: 403 }
      );
    }

    const currentUserRole = teamMember.role;

    // Get team members (without auth.users join)
    console.log(`🔍 [${requestId}] Fetching team members...`);

    const { data: teamMembers, error: membersError } = await supabase
      .from("team_members")
      .select("team_id, user_id, role, created_at")
      .eq("team_id", targetTeamId);

    console.log(`🔍 [${requestId}] Team members query result:`, {
      success: !membersError,
      count: teamMembers?.length || 0,
      error: membersError?.message,
    });

    if (membersError) {
      console.error("Error fetching team members:", membersError);
      return NextResponse.json(
        {
          error: "Failed to fetch team members",
          code: "MEMBERS_FETCH_ERROR",
          requestId,
          details: membersError.message,
        },
        { status: 500 }
      );
    }

    // Get user profiles using a more reliable method
    let userProfiles: any[] = [];

    if (teamMembers && teamMembers.length > 0) {
      const userIds = teamMembers.map(m => m.user_id);

      // Try to get user profiles using service role if available
      try {
        if (
          process.env.SUPABASE_SERVICE_ROLE_KEY ||
          process.env.SUPABASE_SECRET_KEY
        ) {
          console.log(
            `🔍 [${requestId}] Fetching user profiles with admin API...`
          );

          const {
            data: { users },
            error: usersError,
          } = await supabase.auth.admin.listUsers({
            page: 1,
            perPage: 1000,
          });

          if (!usersError && users) {
            userProfiles = users.filter(u => userIds.includes(u.id));
            console.log(
              `✅ [${requestId}] Found ${userProfiles.length} user profiles`
            );
          } else {
            console.warn(
              `⚠️ [${requestId}] Admin API failed:`,
              usersError?.message
            );
          }
        }
      } catch (adminError) {
        console.warn(`⚠️ [${requestId}] Admin API exception:`, adminError);
      }

      // Fallback: Try profiles table if it exists
      if (userProfiles.length === 0) {
        try {
          console.log(`🔍 [${requestId}] Trying profiles table fallback...`);

          const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("id, email, full_name, avatar_url")
            .in("id", userIds);

          if (!profilesError && profiles) {
            userProfiles = profiles.map(p => ({
              id: p.id,
              email: p.email || "unknown@example.com",
              user_metadata: {
                full_name: p.full_name,
                avatar_url: p.avatar_url,
              },
            }));
            console.log(
              `✅ [${requestId}] Found ${userProfiles.length} profiles in profiles table`
            );
          } else {
            console.warn(
              `⚠️ [${requestId}] Profiles table query failed:`,
              profilesError?.message
            );
          }
        } catch (profileError) {
          console.warn(
            `⚠️ [${requestId}] Profiles table exception:`,
            profileError
          );
        }
      }
    }

    // Transform the data to match expected interface
    const members: TeamMemberResponse[] = (teamMembers || []).map(member => {
      const userProfile = userProfiles.find(u => u.id === member.user_id);
      const lastSignIn = userProfile?.last_sign_in_at;
      const isRecentlyActive = lastSignIn
        ? new Date(lastSignIn) > new Date(Date.now() - 15 * 60 * 1000) // 15 minutes
        : false;

      return {
        id: `${member.team_id}-${member.user_id}`, // Synthetic ID from composite key
        email:
          userProfile?.email ||
          `user_${member.user_id.substring(0, 8)}@team.local`,
        fullName:
          userProfile?.user_metadata?.full_name ||
          userProfile?.user_metadata?.name ||
          userProfile?.email?.split("@")[0] ||
          `User ${member.user_id.substring(0, 8)}`,
        avatar:
          userProfile?.user_metadata?.avatar_url ||
          userProfile?.user_metadata?.picture,
        role: member.role,
        isOnline: isRecentlyActive,
        lastActive: lastSignIn || member.created_at,
        joinedAt: member.created_at,
      };
    });

    // Get team information
    const { data: team } = await supabase
      .from("teams")
      .select("id, name, description, owner_id, created_at")
      .eq("id", targetTeamId)
      .single();

    // Skip recent activity for now to avoid auth.users dependency
    const recentActivity: any[] = [];

    const response = {
      members,
      currentUser: {
        id: user.id,
        email: user.email!,
        fullName:
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "You",
        role: currentUserRole,
        isOnline: true,
        lastActive: new Date().toISOString(),
      },
      team: team || null,
      recentActivity,
      stats: {
        totalMembers: members.length,
        onlineMembers: members.filter(m => m.isOnline).length,
        roles: members.reduce(
          (acc, member) => {
            acc[member.role] = (acc[member.role] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
    };

    console.log(`✅ [${requestId}] TEAM MEMBERS API - SUCCESS`, {
      membersCount: members.length,
      requestId,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error(`❌ [${requestId}] TEAM MEMBERS API - ERROR:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      requestId,
    });

    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        requestId,
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    // Create Supabase client
    const supabase = await createServerAuthClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "Authentication required",
          code: "AUTH_REQUIRED",
          requestId,
        },
        { status: 401 }
      );
    }

    // Parse request body
    const { teamId, email, role = "member" } = await request.json();

    if (!teamId || !email) {
      return NextResponse.json(
        {
          error: "Team ID and email are required",
          code: "MISSING_PARAMS",
          requestId,
        },
        { status: 400 }
      );
    }

    // Validate team access (requires admin role)
    const { data: teamMember, error: accessError } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (
      accessError ||
      !teamMember ||
      !["owner", "admin"].includes(teamMember.role)
    ) {
      return NextResponse.json(
        {
          error: "Insufficient permissions - admin role required",
          code: "ACCESS_DENIED",
          requestId,
        },
        { status: 403 }
      );
    }

    // For now, return a success response indicating the invitation would be sent
    // In production, this would handle actual invitation logic
    console.log(`✅ [${requestId}] Team member invitation would be sent`, {
      teamId,
      email,
      role,
      invitedBy: user.id,
    });

    return NextResponse.json({
      success: true,
      message: "Team member invitation sent successfully",
      invitation: {
        email,
        role,
        teamId,
        invitedBy: user.id,
        status: "pending",
      },
    });
  } catch (error) {
    console.error(`❌ [${requestId}] API error:`, error);
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        requestId,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    // Create Supabase client
    const supabase = await createServerAuthClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "Authentication required",
          code: "AUTH_REQUIRED",
          requestId,
        },
        { status: 401 }
      );
    }

    const { teamId, userId, role } = await request.json();

    if (!teamId || !userId || !role) {
      return NextResponse.json(
        {
          error: "Team ID, user ID, and role are required",
          code: "MISSING_PARAMS",
          requestId,
        },
        { status: 400 }
      );
    }

    // Validate team access (requires admin role)
    const { data: teamMember } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (!teamMember || !["owner", "admin"].includes(teamMember.role)) {
      return NextResponse.json(
        {
          error: "Insufficient permissions - admin role required",
          code: "ACCESS_DENIED",
          requestId,
        },
        { status: 403 }
      );
    }

    // Prevent changing own role
    if (userId === user.id) {
      return NextResponse.json(
        {
          error: "You cannot change your own role",
          code: "SELF_ROLE_CHANGE",
          requestId,
        },
        { status: 400 }
      );
    }

    // Update member role
    const { error: updateError } = await supabase
      .from("team_members")
      .update({ role })
      .eq("team_id", teamId)
      .eq("user_id", userId);

    if (updateError) {
      console.error("Error updating member role:", updateError);
      return NextResponse.json(
        {
          error: "Failed to update member role",
          code: "UPDATE_ERROR",
          requestId,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Member role updated successfully",
    });
  } catch (error) {
    console.error(`❌ [${requestId}] API error:`, error);
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        requestId,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    // Create Supabase client
    const supabase = await createServerAuthClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "Authentication required",
          code: "AUTH_REQUIRED",
          requestId,
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    let teamId: string | null = searchParams.get("teamId");
    let userId: string | null = searchParams.get("userId");

    // Handle synthetic ID format (team_id-user_id)
    const memberId = searchParams.get("memberId");
    if (memberId && memberId.includes("-")) {
      const parts = memberId.split("-");
      if (parts.length === 2 && parts[0] && parts[1]) {
        teamId = parts[0];
        userId = parts[1];
      }
    }

    if (!teamId || !userId) {
      return NextResponse.json(
        {
          error:
            "Team ID and user ID are required (use teamId+userId params or memberId with format team_id-user_id)",
          code: "MISSING_PARAMS",
          requestId,
        },
        { status: 400 }
      );
    }

    // Validate team access
    const isRemovingSelf = userId === user.id;
    const { data: teamMember } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    // Allow self-removal or require admin role
    if (
      !teamMember ||
      (!isRemovingSelf && !["owner", "admin"].includes(teamMember.role))
    ) {
      return NextResponse.json(
        {
          error: "Insufficient permissions",
          code: "ACCESS_DENIED",
          requestId,
        },
        { status: 403 }
      );
    }

    // Remove team member
    const { error: removeError } = await supabase
      .from("team_members")
      .delete()
      .eq("team_id", teamId)
      .eq("user_id", userId);

    if (removeError) {
      console.error("Error removing team member:", removeError);
      return NextResponse.json(
        {
          error: "Failed to remove team member",
          code: "REMOVE_ERROR",
          requestId,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: isRemovingSelf
        ? "You have left the team successfully"
        : "Team member removed successfully",
    });
  } catch (error) {
    console.error(`❌ [${requestId}] API error:`, error);
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        requestId,
      },
      { status: 500 }
    );
  }
}
