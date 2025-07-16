import { NextRequest, NextResponse } from "next/server";
import {
  withApiAuth,
  createSuccessResponse,
  validateTeamAccess,
  type AuthContext,
} from "@/lib/auth/withApiAuth-definitive";
import { sendEmail } from "@/lib/email/send";
import { TeamInvitationEmail } from "../../../../../../emails/team-invitation";

interface InviteTeamMemberRequest {
  email: string;
  role: "owner" | "admin" | "member" | "viewer";
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/teams/[id]/invitations - List team invitations
export const GET = withApiAuth(
  async (
    request: NextRequest,
    context: AuthContext,
    { params }: RouteParams
  ) => {
    try {
      const { id: teamId } = await params;

      // Validate team access (admin or owner only)
      const teamAccess = await validateTeamAccess(
        context.supabase,
        context.user.id,
        teamId,
        "admin"
      );

      if (!teamAccess.hasAccess) {
        return NextResponse.json(
          {
            error: teamAccess.error || "Insufficient permissions",
            code: "INSUFFICIENT_PERMISSIONS",
          },
          { status: 403 }
        );
      }

      // Get team invitations
      const { data: invitations, error } = await context.supabase
        .from("team_invitations")
        .select(
          `
          id,
          team_id,
          email,
          role,
          status,
          invited_by,
          token,
          created_at,
          updated_at,
          expires_at
        `
        )
        .eq("team_id", teamId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch invitations:", {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          teamId,
          userId: context.user.id,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json(
          {
            error: "Failed to fetch invitations",
            code: "DATABASE_ERROR",
            details:
              process.env.NODE_ENV === "development"
                ? error.message
                : undefined,
          },
          { status: 500 }
        );
      }

      // Clean up expired invitations (remove expired ones)
      const now = new Date().toISOString();
      await context.supabase
        .from("team_invitations")
        .delete()
        .eq("team_id", teamId)
        .lt("expires_at", now);

      // Get inviter information for each invitation
      const inviterIds =
        invitations?.map((inv: any) => inv.invited_by).filter(Boolean) || [];
      let inviterProfiles: any[] = [];

      if (inviterIds.length > 0) {
        // Get user information for inviters
        const { data: users, error: usersError } =
          await context.supabase.auth.admin.listUsers();

        if (!usersError && users) {
          inviterProfiles = users.users.filter((user: any) =>
            inviterIds.includes(user.id)
          );
        }
      }

      // Format invitations with inviter information
      const formattedInvitations =
        invitations?.map((invitation: any) => {
          const inviterProfile = inviterProfiles.find(
            u => u.id === invitation.invited_by
          );
          return {
            ...invitation,
            invited_by_user: inviterProfile
              ? {
                  id: inviterProfile.id,
                  email: inviterProfile.email,
                  name:
                    inviterProfile.user_metadata?.full_name ||
                    inviterProfile.user_metadata?.name ||
                    inviterProfile.email,
                }
              : null,
          };
        }) || [];

      return createSuccessResponse({
        invitations: formattedInvitations,
      });
    } catch (error) {
      console.error("Failed to list invitations:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        teamId: "unknown",
        userId: context.user.id,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        {
          error: "Internal server error",
          code: "INTERNAL_ERROR",
          details:
            process.env.NODE_ENV === "development"
              ? error instanceof Error
                ? error.message
                : String(error)
              : undefined,
        },
        { status: 500 }
      );
    }
  }
);

// POST /api/teams/[id]/invitations - Send team invitation
export const POST = withApiAuth(
  async (
    request: NextRequest,
    context: AuthContext,
    { params }: RouteParams
  ) => {
    try {
      const { id: teamId } = await params;
      const body: InviteTeamMemberRequest = await request.json();
      const { email, role } = body;

      // Validate input
      if (!email || !role) {
        return NextResponse.json(
          {
            error: "Email and role are required",
            code: "INVALID_REQUEST",
          },
          { status: 400 }
        );
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          {
            error: "Invalid email format",
            code: "INVALID_EMAIL",
          },
          { status: 400 }
        );
      }

      // Validate team access (admin or owner only)
      const teamAccess = await validateTeamAccess(
        context.supabase,
        context.user.id,
        teamId,
        "admin"
      );

      if (!teamAccess.hasAccess) {
        return NextResponse.json(
          {
            error: teamAccess.error || "Insufficient permissions",
            code: "INSUFFICIENT_PERMISSIONS",
          },
          { status: 403 }
        );
      }

      // Get team details
      const { data: team, error: teamError } = await context.supabase
        .from("teams")
        .select("name")
        .eq("id", teamId)
        .single();

      if (teamError || !team) {
        return NextResponse.json(
          {
            error: "Team not found",
            code: "TEAM_NOT_FOUND",
          },
          { status: 404 }
        );
      }

      // Check if user is already a member by email
      // First, get user ID from email if possible
      let targetUserId = null;
      const { data: users, error: usersError } =
        await context.supabase.auth.admin.listUsers();

      if (!usersError && users) {
        const targetUser = users.users.find((u: any) => u.email === email);
        if (targetUser) {
          targetUserId = targetUser.id;
        }
      }

      // Check if user is already a member
      let existingMember = null;
      if (targetUserId) {
        const { data: member } = await context.supabase
          .from("team_members")
          .select("id")
          .eq("team_id", teamId)
          .eq("user_id", targetUserId)
          .single();

        existingMember = member;
      }

      if (existingMember) {
        return NextResponse.json(
          {
            error: "User is already a team member",
            code: "ALREADY_MEMBER",
          },
          { status: 400 }
        );
      }

      // Check for existing pending invitation
      const { data: existingInvitation } = await context.supabase
        .from("team_invitations")
        .select("id")
        .eq("team_id", teamId)
        .eq("email", email)
        .eq("status", "pending")
        .single();

      if (existingInvitation) {
        return NextResponse.json(
          {
            error: "An invitation has already been sent to this email",
            code: "INVITATION_EXISTS",
          },
          { status: 400 }
        );
      }

      // Create invitation
      const { data: invitation, error: inviteError } = await context.supabase
        .from("team_invitations")
        .insert({
          team_id: teamId,
          email,
          role,
          invited_by: context.user.id,
        })
        .select()
        .single();

      if (inviteError) {
        console.error("Failed to create invitation:", {
          error: inviteError.message,
          code: inviteError.code,
          details: inviteError.details,
          hint: inviteError.hint,
          teamId,
          email,
          role,
          userId: context.user.id,
          timestamp: new Date().toISOString(),
        });
        return NextResponse.json(
          {
            error: "Failed to create invitation",
            code: "DATABASE_ERROR",
            details:
              process.env.NODE_ENV === "development"
                ? inviteError.message
                : undefined,
          },
          { status: 500 }
        );
      }

      // Send invitation email
      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitation.token}`;

      try {
        await sendEmail({
          to: email,
          subject: `You've been invited to join ${team.name} on ContentLab Nexus`,
          react: TeamInvitationEmail({
            teamName: team.name,
            inviterName:
              context.user.user_metadata?.name ||
              context.user.email ||
              "A team member",
            inviterEmail: context.user.email || "",
            role,
            inviteUrl,
            expiresAt: invitation.expires_at,
          }),
        });
      } catch (emailError) {
        console.error("Failed to send invitation email:", emailError);

        // Delete the invitation if email fails
        await context.supabase
          .from("team_invitations")
          .delete()
          .eq("id", invitation.id);

        return NextResponse.json(
          {
            error: "Failed to send invitation email",
            code: "EMAIL_ERROR",
          },
          { status: 500 }
        );
      }

      return createSuccessResponse(
        {
          invitation: {
            id: invitation.id,
            email: invitation.email,
            role: invitation.role,
            status: invitation.status,
            expires_at: invitation.expires_at,
          },
          message: "Invitation sent successfully",
        },
        201
      );
    } catch (error) {
      console.error("Failed to send invitation:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        teamId: "unknown",
        userId: context.user.id,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        {
          error: "Internal server error",
          code: "INTERNAL_ERROR",
          details:
            process.env.NODE_ENV === "development"
              ? error instanceof Error
                ? error.message
                : String(error)
              : undefined,
        },
        { status: 500 }
      );
    }
  }
);

// DELETE /api/teams/[id]/invitations/[invitationId] - Cancel invitation
export const DELETE = withApiAuth(
  async (
    request: NextRequest,
    context: AuthContext,
    { params }: RouteParams
  ) => {
    try {
      const { id: teamId } = await params;
      const url = new URL(request.url);
      const invitationId = url.pathname.split("/").pop();

      if (!invitationId) {
        return NextResponse.json(
          {
            error: "Invitation ID is required",
            code: "INVALID_REQUEST",
          },
          { status: 400 }
        );
      }

      // Validate team access (admin or owner only)
      const teamAccess = await validateTeamAccess(
        context.supabase,
        context.user.id,
        teamId,
        "admin"
      );

      if (!teamAccess.hasAccess) {
        return NextResponse.json(
          {
            error: teamAccess.error || "Insufficient permissions",
            code: "INSUFFICIENT_PERMISSIONS",
          },
          { status: 403 }
        );
      }

      // Cancel the invitation
      const { error } = await context.supabase
        .from("team_invitations")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", invitationId)
        .eq("team_id", teamId)
        .eq("status", "pending");

      if (error) {
        console.error("Failed to cancel invitation:", error);
        return NextResponse.json(
          {
            error: "Failed to cancel invitation",
            code: "DATABASE_ERROR",
            details: error.message,
          },
          { status: 500 }
        );
      }

      return createSuccessResponse({
        message: "Invitation cancelled successfully",
      });
    } catch (error) {
      console.error("Failed to cancel invitation:", error);
      return NextResponse.json(
        {
          error: "Internal server error",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  }
);
