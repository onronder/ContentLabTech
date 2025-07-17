/**
 * Authenticated API Handler
 * Wrapper for API routes that require authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server-auth";

export type ApiHandlerFunction = (
  user: any,
  team: any,
  request: NextRequest
) => Promise<NextResponse>;

export async function authenticatedApiHandler(
  request: NextRequest,
  handler: ApiHandlerFunction
): Promise<NextResponse> {
  try {
    // Create authenticated Supabase client
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    // Get user's current team
    const { data: teamMember, error: teamError } = await supabase
      .from("team_members")
      .select(
        `
        team_id,
        role,
        teams!inner (
          id,
          name,
          tier,
          settings
        )
      `
      )
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (teamError || !teamMember) {
      return NextResponse.json(
        {
          success: false,
          error: "No active team membership found",
          code: "NO_TEAM",
        },
        { status: 403 }
      );
    }

    // Extract team data
    const team = {
      id: teamMember.team_id,
      name: teamMember.teams?.name || "Unknown",
      tier: teamMember.teams?.tier || "free",
      settings: teamMember.teams?.settings || {},
      userRole: teamMember.role,
    };

    // Call the handler with authenticated context
    return await handler(user, team, request);
  } catch (error) {
    console.error("Error in authenticatedApiHandler:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

/**
 * Helper to create standardized error responses
 */
export function createApiErrorResponse(
  message: string,
  status = 500,
  code?: string
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: code || "ERROR",
      metadata: {
        timestamp: new Date(),
        version: "1.0.0",
      },
    },
    { status }
  );
}

/**
 * Helper to create standardized success responses
 */
export function createApiSuccessResponse<T = any>(
  data: T,
  metadata?: Record<string, any>
): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    metadata: {
      timestamp: new Date(),
      version: "1.0.0",
      ...metadata,
    },
  });
}
