/**
 * Individual Team API
 * Provides CRUD operations for individual teams
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withSimpleAuth, SimpleUser } from "@/lib/auth/simple-api-auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/team/[id] - Get individual team
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teamId } = await params;

  console.log("🏢 Individual Team GET request received");

  // Get user from auth header
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Authorization header required" },
      { status: 401 }
    );
  }

  // Simple token validation (in production, use proper JWT validation)
  const token = authHeader.substring(7);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  try {
    // Check if user has access to this team
    const { data: membership, error: membershipError } = await supabase
      .from("team_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("team_id", teamId)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        {
          error: "Access denied",
          message: "You don't have access to this team",
        },
        { status: 403 }
      );
    }

    // Get team details
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("*")
      .eq("id", teamId)
      .single();

    if (teamError) {
      throw teamError;
    }

    return NextResponse.json({
      success: true,
      team: {
        ...team,
        userRole: membership.role,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching team:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch team",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT /api/team/[id] - Update individual team
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teamId } = await params;

  console.log("🏢 Individual Team PUT request received");

  // Get user from auth header
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Authorization header required" },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, description, settings } = body;

    // Check if user has permission to update this team
    const { data: membership, error: membershipError } = await supabase
      .from("team_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("team_id", teamId)
      .single();

    if (
      membershipError ||
      !membership ||
      !["owner", "admin"].includes(membership.role)
    ) {
      return NextResponse.json(
        {
          error: "Access denied",
          message: "You don't have permission to update this team",
        },
        { status: 403 }
      );
    }

    // Update team
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (settings) updateData.settings = settings;

    const { data: updatedTeam, error: updateError } = await supabase
      .from("teams")
      .update(updateData)
      .eq("id", teamId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      team: updatedTeam,
      message: "Team updated successfully",
    });
  } catch (error) {
    console.error("❌ Error updating team:", error);
    return NextResponse.json(
      {
        error: "Failed to update team",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/team/[id] - Delete individual team
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teamId } = await params;

  console.log("🏢 Individual Team DELETE request received");

  // Get user from auth header
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Authorization header required" },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  try {
    // Check if user is the owner of this team
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("owner_id")
      .eq("id", teamId)
      .single();

    if (teamError) {
      throw teamError;
    }

    if (team.owner_id !== user.id) {
      return NextResponse.json(
        {
          error: "Access denied",
          message: "Only the team owner can delete the team",
        },
        { status: 403 }
      );
    }

    // Delete team members first
    const { error: memberDeleteError } = await supabase
      .from("team_members")
      .delete()
      .eq("team_id", teamId);

    if (memberDeleteError) {
      throw memberDeleteError;
    }

    // Delete team
    const { error: deleteError } = await supabase
      .from("teams")
      .delete()
      .eq("id", teamId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: "Team deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting team:", error);
    return NextResponse.json(
      {
        error: "Failed to delete team",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
