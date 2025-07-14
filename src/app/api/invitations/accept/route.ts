import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server-auth";
import { getCurrentUser } from "@/lib/auth/session";

interface AcceptInvitationRequest {
  token: string;
}

// POST /api/invitations/accept - Accept a team invitation
export async function POST(request: NextRequest) {
  try {
    const body: AcceptInvitationRequest = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        {
          error: "Invitation token is required",
          code: "INVALID_REQUEST",
        },
        { status: 400 }
      );
    }

    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        {
          error: "Authentication required",
          code: "AUTHENTICATION_REQUIRED",
        },
        { status: 401 }
      );
    }

    // Create Supabase client
    const supabase = await createClient();

    // Accept the invitation using the database function
    const { data, error } = await supabase.rpc("accept_team_invitation", {
      invitation_token: token,
      user_id: user.id,
    });

    if (error) {
      console.error("Failed to accept invitation:", error);
      return NextResponse.json(
        {
          error: "Failed to accept invitation",
          code: "DATABASE_ERROR",
          details: error.message,
        },
        { status: 500 }
      );
    }

    if (!data.success) {
      return NextResponse.json(
        {
          error: data.error || "Failed to accept invitation",
          code: "INVITATION_ERROR",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        team_id: data.team_id,
        role: data.role,
        message: "Invitation accepted successfully",
      },
    });
  } catch (error) {
    console.error("Failed to accept invitation:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

// GET /api/invitations/accept?token=xxx - Get invitation details
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        {
          error: "Invitation token is required",
          code: "INVALID_REQUEST",
        },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = await createClient();

    // Get invitation details
    const { data: invitation, error } = await supabase
      .from("team_invitations")
      .select(
        `
        id,
        email,
        role,
        status,
        expires_at,
        team:teams(
          id,
          name,
          description
        ),
        invited_by
      `
      )
      .eq("token", token)
      .single();

    if (error || !invitation) {
      return NextResponse.json(
        {
          error: "Invalid invitation token",
          code: "INVALID_TOKEN",
        },
        { status: 404 }
      );
    }

    // Check if invitation is valid
    if (invitation.status !== "pending") {
      return NextResponse.json(
        {
          error: `Invitation has already been ${invitation.status}`,
          code: "INVITATION_NOT_PENDING",
        },
        { status: 400 }
      );
    }

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      // Update status to expired
      await supabase
        .from("team_invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);

      return NextResponse.json(
        {
          error: "Invitation has expired",
          code: "INVITATION_EXPIRED",
        },
        { status: 400 }
      );
    }

    // Get inviter details
    const { data: inviter } = await supabase.auth.admin.getUserById(
      invitation.invited_by
    );

    return NextResponse.json({
      success: true,
      data: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expires_at: invitation.expires_at,
        team: invitation.team,
        inviter: {
          email: inviter?.user?.email || "Unknown",
          name:
            inviter?.user?.user_metadata?.name ||
            inviter?.user?.email ||
            "Unknown",
        },
      },
    });
  } catch (error) {
    console.error("Failed to get invitation details:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
