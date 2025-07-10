/**
 * User Profile API
 * Manages user profile data and preferences
 */

import { NextRequest } from "next/server";
import {
  withApiAuth,
  createSuccessResponse,
  type AuthContext,
} from "@/lib/auth/withApiAuth";

async function handleGet(request: NextRequest, context: AuthContext) {
  console.log("👤 User Profile: Fetching profile for user", context.user.id);

  try {
    // Get user profile from database
    const { data: profile, error } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("❌ Profile fetch error:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch profile",
          code: "PROFILE_FETCH_ERROR",
          status: 500,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get user teams
    const { data: teamMemberships, error: teamsError } = await context.supabase
      .from("team_members")
      .select(
        `
        role,
        created_at,
        team:teams (
          id,
          name,
          description,
          owner_id
        )
      `
      )
      .eq("user_id", context.user.id);

    if (teamsError) {
      console.error("❌ Teams fetch error:", teamsError);
    }

    const teams =
      teamMemberships?.map(tm => ({
        ...tm.team,
        userRole: tm.role,
        joinedAt: tm.created_at,
      })) || [];

    console.log("✅ User Profile: Successfully fetched profile", {
      userId: context.user.id,
      hasProfile: !!profile,
      teamsCount: teams.length,
    });

    return createSuccessResponse({
      user: {
        id: context.user.id,
        email: context.user.email,
        created_at: context.user.created_at,
        last_sign_in_at: context.user.last_sign_in_at,
      },
      profile: profile || {
        id: context.user.id,
        full_name: context.user.user_metadata?.full_name || null,
        avatar_url: context.user.user_metadata?.avatar_url || null,
        bio: null,
        website: null,
        location: null,
        preferences: {},
        created_at: context.user.created_at,
        updated_at: context.user.created_at,
      },
      teams,
      stats: {
        totalTeams: teams.length,
        ownedTeams: teams.filter(t => t.owner_id === context.user.id).length,
        adminTeams: teams.filter(t => t.userRole === "admin").length,
      },
    });
  } catch (error) {
    console.error("❌ User Profile: Unexpected error:", error);
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

async function handlePut(request: NextRequest, context: AuthContext) {
  console.log("👤 User Profile: Updating profile for user", context.user.id);

  try {
    const body = await request.json();
    const { full_name, bio, website, location, preferences } = body;

    // Update or create profile
    const { data: profile, error } = await context.supabase
      .from("profiles")
      .upsert({
        id: context.user.id,
        full_name,
        bio,
        website,
        location,
        preferences: preferences || {},
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Profile update error:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to update profile",
          code: "PROFILE_UPDATE_ERROR",
          status: 500,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("✅ User Profile: Successfully updated profile", {
      userId: context.user.id,
      updatedFields: Object.keys(body),
    });

    return createSuccessResponse({ profile });
  } catch (error) {
    console.error("❌ User Profile: Update error:", error);
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
export const PUT = withApiAuth(handlePut);
