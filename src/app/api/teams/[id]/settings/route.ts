import { NextRequest, NextResponse } from "next/server";
import {
  withApiAuth,
  createSuccessResponse,
  validateTeamAccess,
  type AuthContext,
} from "@/lib/auth/withApiAuth-definitive";

interface TeamSettingsRequest {
  name?: string;
  description?: string;
  settings?: Record<string, any>;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/teams/[id]/settings - Get team settings
export const GET = withApiAuth(
  async (
    request: NextRequest,
    context: AuthContext,
    { params }: RouteParams
  ) => {
    try {
      const { id: teamId } = await params;

      // Validate team access
      const teamAccess = await validateTeamAccess(
        context.supabase,
        context.user.id,
        teamId
      );

      if (!teamAccess.hasAccess) {
        return NextResponse.json(
          {
            error: "Access denied",
            code: "FORBIDDEN",
          },
          { status: 403 }
        );
      }

      // Get team data
      const { data: team, error } = await context.supabase
        .from("teams")
        .select("*")
        .eq("id", teamId)
        .single();

      if (error) {
        console.error("Failed to fetch team:", error);
        return NextResponse.json(
          {
            error: "Failed to fetch team settings",
            code: "DATABASE_ERROR",
          },
          { status: 500 }
        );
      }

      return createSuccessResponse({
        team: {
          id: team.id,
          name: team.name,
          description: team.description,
          ownerId: team.owner_id,
          settings: team.settings || {},
          createdAt: team.created_at,
          updatedAt: team.updated_at,
        },
        currentUserRole: teamAccess.userRole || "viewer",
        canEdit:
          teamAccess.userRole === "owner" || teamAccess.userRole === "admin",
        canDelete: teamAccess.userRole === "owner",
        canTransferOwnership: teamAccess.userRole === "owner",
      });
    } catch (error) {
      console.error("Failed to get team settings:", error);
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

// PUT /api/teams/[id]/settings - Update team settings
export const PUT = withApiAuth(
  async (
    request: NextRequest,
    context: AuthContext,
    { params }: RouteParams
  ) => {
    try {
      const { id: teamId } = await params;
      const body: TeamSettingsRequest = await request.json();

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
            error: "Only team owners and admins can update settings",
            code: "FORBIDDEN",
          },
          { status: 403 }
        );
      }

      const updates: Record<string, any> = {};

      // Validate and prepare updates
      if (body.name !== undefined) {
        const trimmedName = body.name.trim();
        if (!trimmedName) {
          return NextResponse.json(
            {
              error: "Team name cannot be empty",
              code: "VALIDATION_ERROR",
            },
            { status: 400 }
          );
        }
        updates.name = trimmedName;
      }

      if (body.description !== undefined) {
        updates.description = body.description.trim() || null;
      }

      if (body.settings !== undefined) {
        updates.settings = body.settings;
      }

      if (Object.keys(updates).length === 0) {
        return NextResponse.json(
          {
            error: "No valid fields to update",
            code: "INVALID_REQUEST",
          },
          { status: 400 }
        );
      }

      // Update team
      const { data: team, error: updateError } = await context.supabase
        .from("teams")
        .update(updates)
        .eq("id", teamId)
        .select()
        .single();

      if (updateError) {
        console.error("Failed to update team:", updateError);
        return NextResponse.json(
          {
            error: "Failed to update team settings",
            code: "DATABASE_ERROR",
            details: updateError.message,
          },
          { status: 500 }
        );
      }

      return createSuccessResponse({
        message: "Team settings updated successfully",
        team: {
          id: team.id,
          name: team.name,
          description: team.description,
          settings: team.settings,
          updatedAt: team.updated_at,
        },
      });
    } catch (error) {
      console.error("Failed to update team settings:", error);
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

// DELETE /api/teams/[id]/settings - Delete team
export const DELETE = withApiAuth(
  async (
    request: NextRequest,
    context: AuthContext,
    { params }: RouteParams
  ) => {
    try {
      const { id: teamId } = await params;

      // Only team owner can delete the team
      const { data: team, error: teamError } = await context.supabase
        .from("teams")
        .select("owner_id")
        .eq("id", teamId)
        .single();

      if (teamError || !team) {
        return NextResponse.json(
          {
            error: "Team not found",
            code: "NOT_FOUND",
          },
          { status: 404 }
        );
      }

      if (team.owner_id !== context.user.id) {
        return NextResponse.json(
          {
            error: "Only the team owner can delete the team",
            code: "FORBIDDEN",
          },
          { status: 403 }
        );
      }

      // Delete team (cascade will handle related records)
      const { error: deleteError } = await context.supabase
        .from("teams")
        .delete()
        .eq("id", teamId);

      if (deleteError) {
        console.error("Failed to delete team:", deleteError);
        return NextResponse.json(
          {
            error: "Failed to delete team",
            code: "DATABASE_ERROR",
            details: deleteError.message,
          },
          { status: 500 }
        );
      }

      return createSuccessResponse({
        message: "Team deleted successfully",
      });
    } catch (error) {
      console.error("Failed to delete team:", error);
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
