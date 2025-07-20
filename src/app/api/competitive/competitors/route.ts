import { NextRequest } from "next/server";
import {
  withApiAuth,
  createSuccessResponse,
  validateTeamAccess,
  type AuthContext,
} from "@/lib/auth/withApiAuth-definitive";

export const GET = withApiAuth(
  async (request: NextRequest, { user, supabase }: AuthContext) => {
    console.log("🔍 [COMPETITORS API] GET request received");

    // Log request details
    console.log("🔍 [COMPETITORS API] Request details:", {
      method: "GET",
      url: request.url,
      headers: {
        "content-type": request.headers.get("content-type"),
        "user-agent": request.headers.get("user-agent"),
        referer: request.headers.get("referer"),
      },
      userId: user.id,
    });

    // Get teamId from query parameters
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");

    if (!teamId) {
      console.error("❌ [COMPETITORS API] Missing teamId in query parameters");
      return new Response(
        JSON.stringify({
          error: "Team ID is required",
          code: "INVALID_REQUEST",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate team access with enhanced logging
    const teamAccess = await validateTeamAccess(
      supabase,
      user.id,
      teamId,
      "member"
    );
    if (!teamAccess.hasAccess) {
      return new Response(
        JSON.stringify({
          error: "Access denied",
          code: "TEAM_ACCESS_DENIED",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get team data for queries
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id")
      .eq("id", teamId)
      .single();

    if (teamError || !team) {
      return new Response(
        JSON.stringify({
          error: "Team not found",
          code: "TEAM_NOT_FOUND",
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("✅ [COMPETITORS API] GET - Authentication successful:", {
      userId: user.id,
      teamId: teamId,
      userRole: teamAccess.userRole,
      url: request.url,
    });

    // Fetch competitors with detailed logging
    console.log("🔍 [COMPETITORS API] Fetching competitors for team:", team.id);

    const { data: competitors, error } = await supabase
      .from("competitors")
      .select("*")
      .eq("team_id", team.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ [COMPETITORS API] Database error:", {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return new Response(
        JSON.stringify({
          error: "Failed to fetch competitors",
          code: "FETCH_COMPETITORS_ERROR",
          details: error.message,
          status: 500,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("✅ [COMPETITORS API] GET successful:", {
      competitorsCount: competitors?.length || 0,
      teamId: team.id,
    });

    return createSuccessResponse({
      competitors: competitors || [],
      count: competitors?.length || 0,
    });
  }
);

export const POST = withApiAuth(
  async (request: NextRequest, { user, supabase }: AuthContext) => {
    console.log("🔍 [COMPETITORS API] POST request received");

    try {
      // Log request headers for debugging
      console.log("🔍 [COMPETITORS API] Headers:", {
        "content-type": request.headers.get("content-type"),
        cookie: request.headers.get("cookie") ? "Present" : "Missing",
        "user-agent": request.headers.get("user-agent"),
        referer: request.headers.get("referer"),
      });

      // Parse and log request body
      const body = await request.json();
      console.log("🔍 [COMPETITORS API] Request body received:", {
        hasName: !!body.name,
        hasDomain: !!body.domain,
        hasWebsiteUrl: !!body.website_url,
        hasIndustry: !!body.industry,
        hasDescription: !!body.description,
        descriptionLength: body.description?.length || 0,
        // Don't log sensitive data in full
        name: body.name ? `${body.name.substring(0, 20)}...` : "Missing",
        domain: body.domain || "Missing",
        website_url: body.website_url || "Missing",
        industry: body.industry || "Missing",
      });

      // For backwards compatibility, check multiple possible team ID sources
      const teamId = body.teamId || body.team_id;

      // If no teamId provided, try to get from user's active team membership
      let resolvedTeamId = teamId;
      if (!resolvedTeamId) {
        console.log(
          "🔍 [COMPETITORS API] No teamId provided, fetching user team membership"
        );

        const { data: teamMember, error: teamMemberError } = await supabase
          .from("team_members")
          .select("team_id, role")
          .eq("user_id", user.id)
          .single();

        if (teamMemberError || !teamMember) {
          console.error(
            "❌ [COMPETITORS API] No active team membership found:",
            teamMemberError?.message
          );
          return new Response(
            JSON.stringify({
              error: "No active team membership found",
              code: "NO_TEAM_MEMBERSHIP",
              details:
                "User must be a member of an active team to add competitors",
            }),
            { status: 403, headers: { "Content-Type": "application/json" } }
          );
        }

        resolvedTeamId = teamMember.team_id;
        console.log(
          "✅ [COMPETITORS API] Resolved team ID from membership:",
          resolvedTeamId
        );
      }

      if (!resolvedTeamId) {
        console.error("❌ [COMPETITORS API] Team ID could not be resolved");
        return new Response(
          JSON.stringify({
            error: "Team ID is required",
            code: "INVALID_REQUEST",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Validate team access with enhanced logging
      console.log("🔍 [COMPETITORS API] Validating team access for:", {
        userId: user.id,
        teamId: resolvedTeamId,
      });

      const teamAccess = await validateTeamAccess(
        supabase,
        user.id,
        resolvedTeamId,
        "member"
      );

      if (!teamAccess.hasAccess) {
        console.error("❌ [COMPETITORS API] Team access denied:", {
          userId: user.id,
          teamId: resolvedTeamId,
          userRole: teamAccess.userRole,
          hasAccess: teamAccess.hasAccess,
        });
        return new Response(
          JSON.stringify({
            error: "Access denied",
            code: "TEAM_ACCESS_DENIED",
            details: "User does not have access to this team",
          }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }

      console.log("✅ [COMPETITORS API] Team access validated:", {
        userId: user.id,
        teamId: resolvedTeamId,
        userRole: teamAccess.userRole,
      });

      // Get team data
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .select("id, name")
        .eq("id", resolvedTeamId)
        .single();

      if (teamError || !team) {
        console.error("❌ [COMPETITORS API] Team not found:", {
          teamId: resolvedTeamId,
          error: teamError?.message,
        });
        return new Response(
          JSON.stringify({
            error: "Team not found",
            code: "TEAM_NOT_FOUND",
            details: teamError?.message,
          }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      console.log("✅ [COMPETITORS API] Team found:", {
        teamId: team.id,
        teamName: team.name,
      });

      console.log("✅ [COMPETITORS API] POST - Authentication successful:", {
        userId: user.id,
        teamId: team.id,
        teamName: team.name,
        userRole: teamAccess.userRole,
        url: request.url,
      });

      // Validate required fields based on AddCompetitorModal
      const { name, domain, website_url, industry, description } = body;

      if (!name || !domain || !website_url || !industry) {
        console.error("❌ [COMPETITORS API] Missing required fields:", {
          name: !!name,
          domain: !!domain,
          website_url: !!website_url,
          industry: !!industry,
        });

        return new Response(
          JSON.stringify({
            success: false,
            error: "Missing required fields",
            code: "VALIDATION_ERROR",
            details: {
              name: !name ? "Company name is required" : null,
              domain: !domain ? "Domain is required" : null,
              website_url: !website_url ? "Website URL is required" : null,
              industry: !industry ? "Industry selection is required" : null,
            },
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      console.log("✅ [COMPETITORS API] Field validation passed");

      // Prepare competitor data
      const competitorData = {
        name,
        domain,
        website_url,
        industry,
        description: description || null,
        team_id: team.id,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        monitoring_enabled: body.monitoring_enabled || false,
      };

      console.log("🔍 [COMPETITORS API] Inserting competitor:", {
        ...competitorData,
        description: competitorData.description
          ? `${competitorData.description.substring(0, 30)}...`
          : null,
      });

      // Check if competitors table exists and create competitor
      const { data: competitor, error } = await supabase
        .from("competitors")
        .insert(competitorData)
        .select()
        .single();

      if (error) {
        console.error("❌ [COMPETITORS API] Insert failed:", {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });

        // Handle specific database errors
        if (error.code === "42P01") {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Competitors table does not exist",
              code: "TABLE_MISSING",
              details: "Database setup required",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            success: false,
            error: "Failed to create competitor",
            code: "CREATE_COMPETITOR_ERROR",
            details: error.message,
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      console.log("✅ [COMPETITORS API] Competitor created successfully:", {
        id: competitor.id,
        name: competitor.name,
        teamId: competitor.team_id,
      });

      return new Response(
        JSON.stringify({
          success: true,
          data: competitor,
          message: "Competitor added successfully",
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("❌ [COMPETITORS API] Unexpected error:", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: "Internal server error",
          code: "INTERNAL_ERROR",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
);
