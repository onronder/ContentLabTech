import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server-auth";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get active sessions (sessions that haven't expired)
    const { data: sessions, error: sessionsError } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("user_id", user.id)
      .gt("expires_at", new Date().toISOString())
      .order("last_activity", { ascending: false });

    if (sessionsError) {
      console.error("Sessions fetch error:", sessionsError);
    }

    // Get login history
    const { data: loginHistory, error: historyError } = await supabase
      .from("login_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (historyError) {
      console.error("Login history fetch error:", historyError);
    }

    // Format login history
    const formattedHistory = (loginHistory || []).map((log: any) => ({
      id: log.id,
      login_type: log.login_type,
      success: log.success,
      ip_address: log.ip_address || "Unknown",
      user_agent: log.user_agent || "Unknown",
      created_at: log.created_at,
      error_message: log.error_message,
    }));

    return NextResponse.json({
      data: {
        activeSessions: sessions || [],
        loginHistory: formattedHistory,
      },
    });
  } catch (error) {
    console.error("Sessions fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Revoke all other sessions by setting expiry to past
    const { error } = await supabase
      .from("user_sessions")
      .update({ expires_at: new Date(Date.now() - 1000).toISOString() })
      .eq("user_id", user.id)
      .gt("expires_at", new Date().toISOString()); // Only update non-expired sessions

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the action in login history
    await supabase.from("login_history").insert({
      user_id: user.id,
      login_type: "session_revoke",
      success: true,
      ip_address: null,
      user_agent: null,
      device_info: {
        action: "sessions_revoked",
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      message: "All other sessions revoked successfully",
    });
  } catch (error) {
    console.error("Session revocation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
