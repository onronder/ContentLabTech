import { NextRequest, NextResponse } from "next/server";
import {
  withApiAuth,
  createSuccessResponse,
  type AuthContext,
} from "@/lib/auth/withApiAuth-definitive";

// GET /api/user/sessions - Get active sessions
export const GET = withApiAuth(
  async (request: NextRequest, context: AuthContext) => {
    try {
      // Get active sessions
      const { data: sessions, error: sessionsError } = await context.supabase
        .from("user_sessions")
        .select("*")
        .eq("user_id", context.user.id)
        .gte("expires_at", new Date().toISOString())
        .order("last_activity", { ascending: false });

      if (sessionsError) {
        console.error("Failed to fetch sessions:", sessionsError);
        return NextResponse.json(
          {
            error: "Failed to fetch sessions",
            code: "DATABASE_ERROR",
          },
          { status: 500 }
        );
      }

      // Get login history
      const { data: loginHistory, error: historyError } = await context.supabase
        .from("login_history")
        .select("*")
        .eq("user_id", context.user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (historyError) {
        console.error("Failed to fetch login history:", historyError);
        return NextResponse.json(
          {
            error: "Failed to fetch login history",
            code: "DATABASE_ERROR",
          },
          { status: 500 }
        );
      }

      return createSuccessResponse({
        activeSessions: sessions || [],
        loginHistory: loginHistory || [],
      });
    } catch (error) {
      console.error("Failed to get sessions:", error);
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

// DELETE /api/user/sessions/:id - Revoke a specific session
export const DELETE = withApiAuth(
  async (request: NextRequest, context: AuthContext) => {
    try {
      const url = new URL(request.url);
      const sessionId = url.pathname.split("/").pop();

      if (!sessionId || sessionId === "sessions") {
        // Revoke all sessions except current
        const { error } = await context.supabase
          .from("user_sessions")
          .delete()
          .eq("user_id", context.user.id)
          .neq(
            "session_token",
            request.headers.get("authorization")?.replace("Bearer ", "")
          );

        if (error) {
          console.error("Failed to revoke sessions:", error);
          return NextResponse.json(
            {
              error: "Failed to revoke sessions",
              code: "DATABASE_ERROR",
            },
            { status: 500 }
          );
        }

        return createSuccessResponse({
          message: "All other sessions revoked successfully",
        });
      } else {
        // Revoke specific session
        const { error } = await context.supabase
          .from("user_sessions")
          .delete()
          .eq("id", sessionId)
          .eq("user_id", context.user.id);

        if (error) {
          console.error("Failed to revoke session:", error);
          return NextResponse.json(
            {
              error: "Failed to revoke session",
              code: "DATABASE_ERROR",
            },
            { status: 500 }
          );
        }

        return createSuccessResponse({
          message: "Session revoked successfully",
        });
      }
    } catch (error) {
      console.error("Failed to revoke sessions:", error);
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
