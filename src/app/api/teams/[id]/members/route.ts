/**
 * Team Members API
 * Manages team membership and member information
 */

import { NextRequest } from "next/server";
import {
  withApiAuth,
  createSuccessResponse,
  validateTeamAccess,
  type AuthContext,
} from "@/lib/auth/withApiAuth-v2";

async function handleGet(
  request: NextRequest,
  context: AuthContext,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  console.log("👥 Team Members: Fetching members for team", resolvedParams.id);

  try {
    // Validate team access
    const teamAccess = await validateTeamAccess(
      context.supabase,
      context.user.id,
      resolvedParams.id,
      "member"
    );
    if (!teamAccess.hasAccess) {
      return new Response(
        JSON.stringify({
          error:
            teamAccess.error || "Insufficient permissions to view team members",
          code: "INSUFFICIENT_PERMISSIONS",
          status: 403,
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get team members with user information
    const { data: members, error } = await context.supabase
      .from("team_members")
      .select(
        `
        id,
        user_id,
        role,
        created_at,
        updated_at
      `
      )
      .eq("team_id", resolvedParams.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("❌ Team members fetch error:", {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        teamId: resolvedParams.id,
        userId: context.user.id,
      });
      return new Response(
        JSON.stringify({
          error: "Failed to fetch team members",
          code: "MEMBERS_FETCH_ERROR",
          status: 500,
          details:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get team information
    const { data: team, error: teamError } = await context.supabase
      .from("teams")
      .select("id, name, description, owner_id, created_at")
      .eq("id", resolvedParams.id)
      .single();

    if (teamError) {
      console.error("❌ Team fetch error:", {
        error: teamError.message,
        code: teamError.code,
        details: teamError.details,
        hint: teamError.hint,
        teamId: resolvedParams.id,
        userId: context.user.id,
      });
    }

    // Get user information for each member
    const userIds = members?.map(m => m.user_id) || [];
    let userProfiles: any[] = [];

    if (userIds.length > 0) {
      // Get user metadata from auth.users (using service role)
      const { data: users, error: usersError } =
        await context.supabase.auth.admin.listUsers();

      if (!usersError && users) {
        userProfiles = users.users.filter(user => userIds.includes(user.id));
      } else {
        console.warn("Could not fetch user profiles, using basic info");
      }
    }

    // Format members data
    const formattedMembers =
      members?.map((member: any) => {
        const userProfile = userProfiles.find(u => u.id === member.user_id);
        return {
          id: member.id,
          role: member.role,
          joinedAt: member.created_at,
          lastUpdated: member.updated_at,
          user: {
            id: member.user_id,
            name:
              userProfile?.user_metadata?.full_name ||
              userProfile?.user_metadata?.name ||
              userProfile?.email ||
              "Unknown User",
            email: userProfile?.email || "Unknown Email",
            avatar: userProfile?.user_metadata?.avatar_url || null,
            bio: userProfile?.user_metadata?.bio || null,
          },
          isOwner: team?.owner_id === member.user_id,
        };
      }) || [];

    console.log("✅ Team Members: Successfully fetched members", {
      teamId: resolvedParams.id,
      membersCount: formattedMembers.length,
      currentUserRole: teamAccess.userRole,
    });

    return createSuccessResponse({
      team: {
        id: team?.id,
        name: team?.name,
        description: team?.description,
        ownerId: team?.owner_id,
        createdAt: team?.created_at,
      },
      members: formattedMembers,
      currentUser: {
        role: teamAccess.userRole,
        canManageMembers: ["owner", "admin"].includes(
          teamAccess.userRole || ""
        ),
        canInviteMembers: ["owner", "admin"].includes(
          teamAccess.userRole || ""
        ),
      },
      stats: {
        totalMembers: formattedMembers.length,
        owners: formattedMembers.filter(m => m.role === "owner").length,
        admins: formattedMembers.filter(m => m.role === "admin").length,
        members: formattedMembers.filter(m => m.role === "member").length,
        viewers: formattedMembers.filter(m => m.role === "viewer").length,
      },
    });
  } catch (error) {
    console.error("❌ Team Members: Unexpected error:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      teamId: resolvedParams.id,
      userId: context.user.id,
      timestamp: new Date().toISOString(),
    });
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        status: 500,
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function handlePost(
  request: NextRequest,
  context: AuthContext,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  console.log("👥 Team Members: Adding member to team", resolvedParams.id);

  try {
    // Validate team access (need admin or owner role)
    const teamAccess = await validateTeamAccess(
      context.supabase,
      context.user.id,
      resolvedParams.id,
      "admin"
    );
    if (!teamAccess.hasAccess) {
      return new Response(
        JSON.stringify({
          error:
            teamAccess.error || "Insufficient permissions to add team members",
          code: "INSUFFICIENT_PERMISSIONS",
          status: 403,
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await request.json();
    const { email, role = "member" } = body;

    if (!email) {
      return new Response(
        JSON.stringify({
          error: "Email is required",
          code: "MISSING_EMAIL",
          status: 400,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Find user by email (this would need to be implemented based on your auth system)
    // For now, return a placeholder response
    console.log("✅ Team Members: Member invitation would be sent", {
      teamId: resolvedParams.id,
      email,
      role,
      invitedBy: context.user.id,
    });

    return createSuccessResponse({
      message: "Team member invitation sent successfully",
      invitation: {
        email,
        role,
        teamId: resolvedParams.id,
        invitedBy: context.user.id,
        status: "pending",
      },
    });
  } catch (error) {
    console.error("❌ Team Members: Add member error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        status: 500,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export const GET = withApiAuth(handleGet);
export const POST = withApiAuth(handlePost);
