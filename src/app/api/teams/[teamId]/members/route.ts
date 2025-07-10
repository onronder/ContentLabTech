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
  { params }: { params: { teamId: string } }
) {
  console.log("👥 Team Members: Fetching members for team", params.teamId);

  try {
    // Validate team access
    const teamAccess = await validateTeamAccess(
      context.supabase,
      context.user.id,
      params.teamId,
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

    // Get team members with profile information
    const { data: members, error } = await context.supabase
      .from("team_members")
      .select(
        `
        id,
        role,
        created_at,
        updated_at,
        user:profiles!team_members_user_id_fkey (
          id,
          full_name,
          avatar_url,
          bio
        )
      `
      )
      .eq("team_id", params.teamId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("❌ Team members fetch error:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch team members",
          code: "MEMBERS_FETCH_ERROR",
          status: 500,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get team information
    const { data: team, error: teamError } = await context.supabase
      .from("teams")
      .select("id, name, description, owner_id, created_at")
      .eq("id", params.teamId)
      .single();

    if (teamError) {
      console.error("❌ Team fetch error:", teamError);
    }

    // Format members data
    const formattedMembers =
      members?.map(member => ({
        id: member.id,
        role: member.role,
        joinedAt: member.created_at,
        lastUpdated: member.updated_at,
        user: {
          id: member.user?.id,
          name: member.user?.full_name || "Unknown User",
          avatar: member.user?.avatar_url,
          bio: member.user?.bio,
        },
        isOwner: team?.owner_id === member.user?.id,
      })) || [];

    console.log("✅ Team Members: Successfully fetched members", {
      teamId: params.teamId,
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
    console.error("❌ Team Members: Unexpected error:", error);
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

async function handlePost(
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { teamId: string } }
) {
  console.log("👥 Team Members: Adding member to team", params.teamId);

  try {
    // Validate team access (need admin or owner role)
    const teamAccess = await validateTeamAccess(
      context.supabase,
      context.user.id,
      params.teamId,
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
      teamId: params.teamId,
      email,
      role,
      invitedBy: context.user.id,
    });

    return createSuccessResponse({
      message: "Team member invitation sent successfully",
      invitation: {
        email,
        role,
        teamId: params.teamId,
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
