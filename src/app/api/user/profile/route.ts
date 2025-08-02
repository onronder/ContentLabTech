import { NextRequest, NextResponse } from "next/server";
import {
  withApiAuth,
  createSuccessResponse,
  type AuthContext,
} from "@/lib/auth/withApiAuth-v2";

async function handleGet(request: NextRequest, context: AuthContext) {
  console.log("📥 GET request received for user profile");

  try {
    // Try to get existing profile
    const { data: profile, error } = await context.supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", context.user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("❌ Profile fetch error:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch profile",
          code: "DATABASE_ERROR",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // If no profile exists, create one
    if (!profile) {
      console.log("📄 Creating new profile for user:", context.user.id);

      const { data: newProfile, error: createError } = await context.supabase
        .from("user_preferences")
        .insert({
          user_id: context.user.id,
          display_name:
            context.user.user_metadata?.full_name || context.user.email || "",
          avatar_url: context.user.user_metadata?.avatar_url || null,
        })
        .select()
        .single();

      if (createError) {
        console.error("❌ Profile creation error:", createError);
        return new Response(
          JSON.stringify({
            error: "Failed to create profile",
            code: "PROFILE_CREATE_ERROR",
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      console.log("✅ Profile created successfully");
      return createSuccessResponse(newProfile);
    }

    console.log("✅ Profile fetched successfully");
    return createSuccessResponse(profile);
  } catch (error) {
    console.error("❌ Profile GET error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export const GET = withApiAuth(handleGet);

async function handlePut(request: NextRequest, context: AuthContext) {
  console.log("📝 PUT request received for user profile");

  try {
    const body = await request.json();
    const { display_name, timezone, locale, theme } = body;

    // Validate input
    if (display_name && typeof display_name !== "string") {
      return new Response(
        JSON.stringify({
          error: "Invalid display_name",
          code: "INVALID_INPUT",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: profile, error } = await context.supabase
      .from("user_preferences")
      .upsert({
        user_id: context.user.id,
        display_name,
        timezone,
        locale,
        theme,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Profile update error:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to update profile",
          code: "UPDATE_ERROR",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Profile updated successfully");
    return createSuccessResponse(profile);
  } catch (error) {
    console.error("❌ Profile PUT error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export const PUT = withApiAuth(handlePut);
