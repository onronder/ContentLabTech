import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, createClient } from "@/lib/auth/session";

interface OptimizeContentRequest {
  contentId: string;
  analysisType: "full" | "seo" | "keywords" | "competitor";
  options?: {
    includeCompetitorAnalysis?: boolean;
    generateRecommendations?: boolean;
    targetKeywords?: string[];
    competitorUrls?: string[];
  };
}

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body: OptimizeContentRequest = await request.json();
    const { contentId, analysisType, options = {} } = body;

    if (!contentId) {
      return NextResponse.json(
        { error: "Content ID is required" },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = await createClient();

    // Get content item and verify access
    const { data: content, error: contentError } = await supabase
      .from("content_items")
      .select(
        `
        *,
        project:projects (
          id,
          team_id,
          target_keywords
        )
      `
      )
      .eq("id", contentId)
      .single();

    if (contentError || !content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    // Check user access to project's team
    const { data: teamMember } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", content.project.team_id)
      .eq("user_id", user.id)
      .single();

    if (!teamMember) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Call Supabase Edge Function for AI analysis
    const { data: result, error: edgeFunctionError } =
      await supabase.functions.invoke("ai-content-optimization", {
        body: {
          contentId,
          analysisType,
          options: {
            ...options,
            targetKeywords:
              options.targetKeywords || content.project.target_keywords || [],
          },
        },
      });

    if (edgeFunctionError) {
      console.error("Edge function error:", edgeFunctionError);
      return NextResponse.json(
        { error: "Failed to analyze content" },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get("contentId");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!contentId) {
      return NextResponse.json(
        { error: "Content ID is required" },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = await createClient();

    // Get recent optimization sessions for this content
    const { data: sessions, error } = await supabase
      .from("optimization_sessions")
      .select(
        `
        id,
        session_type,
        optimization_score,
        processing_time_ms,
        tokens_used,
        cost_usd,
        status,
        started_at,
        completed_at,
        output_data
      `
      )
      .eq("content_id", contentId)
      .order("started_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch optimization history" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sessions: sessions || [],
      contentId,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
