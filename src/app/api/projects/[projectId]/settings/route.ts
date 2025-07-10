/**
 * Project Settings API
 * Manages project configuration and settings
 */

import { NextRequest } from "next/server";
import {
  withApiAuth,
  createSuccessResponse,
  validateTeamAccess,
  type AuthContext,
} from "@/lib/auth/withApiAuth-v2";

async function handleGet(
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { projectId: string } }
) {
  console.log(
    "⚙️ Project Settings: Fetching settings for project",
    params.projectId
  );

  try {
    // Get project and validate access
    const { data: project, error: projectError } = await context.supabase
      .from("projects")
      .select("*")
      .eq("id", params.projectId)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({
          error: "Project not found",
          code: "PROJECT_NOT_FOUND",
          status: 404,
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate team access
    const teamAccess = await validateTeamAccess(
      context.supabase,
      context.user.id,
      project.team_id,
      "member"
    );
    if (!teamAccess.hasAccess) {
      return new Response(
        JSON.stringify({
          error:
            teamAccess.error ||
            "Insufficient permissions to view project settings",
          code: "INSUFFICIENT_PERMISSIONS",
          status: 403,
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get project analytics settings if they exist
    const { data: analyticsSettings, error: analyticsError } =
      await context.supabase
        .from("project_analytics_settings")
        .select("*")
        .eq("project_id", params.projectId)
        .single();

    if (analyticsError && analyticsError.code !== "PGRST116") {
      console.warn("⚠️ Analytics settings fetch warning:", analyticsError);
    }

    console.log("✅ Project Settings: Successfully fetched settings", {
      projectId: params.projectId,
      hasAnalyticsSettings: !!analyticsSettings,
      userRole: teamAccess.userRole,
    });

    return createSuccessResponse({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        website_url: project.website_url,
        status: project.status,
        team_id: project.team_id,
        owner_id: project.owner_id,
        created_at: project.created_at,
        updated_at: project.updated_at,
      },
      settings: {
        analytics: analyticsSettings || {
          google_analytics_id: null,
          google_search_console_url: null,
          tracking_enabled: false,
          seo_monitoring: true,
          performance_alerts: true,
          weekly_reports: false,
        },
        seo: {
          primary_keywords: project.primary_keywords || [],
          target_audience: project.target_audience || "",
          content_strategy: project.content_strategy || "balanced",
          optimization_level: project.optimization_level || "standard",
        },
        content: {
          default_content_type: "article",
          auto_publish: false,
          content_approval_required: false,
          ai_assistance_enabled: true,
        },
      },
      permissions: {
        canEdit: ["owner", "admin"].includes(teamAccess.userRole || ""),
        canDelete:
          teamAccess.userRole === "owner" ||
          project.owner_id === context.user.id,
        canManageIntegrations: ["owner", "admin"].includes(
          teamAccess.userRole || ""
        ),
        userRole: teamAccess.userRole,
      },
    });
  } catch (error) {
    console.error("❌ Project Settings: Fetch error:", error);
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

async function handlePut(
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { projectId: string } }
) {
  console.log(
    "⚙️ Project Settings: Updating settings for project",
    params.projectId
  );

  try {
    // Get project and validate access
    const { data: project, error: projectError } = await context.supabase
      .from("projects")
      .select("team_id, owner_id")
      .eq("id", params.projectId)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({
          error: "Project not found",
          code: "PROJECT_NOT_FOUND",
          status: 404,
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate team access (need admin or owner role)
    const teamAccess = await validateTeamAccess(
      context.supabase,
      context.user.id,
      project.team_id,
      "admin"
    );
    if (!teamAccess.hasAccess) {
      return new Response(
        JSON.stringify({
          error:
            teamAccess.error ||
            "Insufficient permissions to update project settings",
          code: "INSUFFICIENT_PERMISSIONS",
          status: 403,
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await request.json();
    const { project: projectUpdates, settings } = body;

    // Update project basic information
    if (projectUpdates) {
      const { data: updatedProject, error: updateError } =
        await context.supabase
          .from("projects")
          .update({
            ...projectUpdates,
            updated_at: new Date().toISOString(),
          })
          .eq("id", params.projectId)
          .select()
          .single();

      if (updateError) {
        console.error("❌ Project update error:", updateError);
        return new Response(
          JSON.stringify({
            error: "Failed to update project",
            code: "PROJECT_UPDATE_ERROR",
            status: 500,
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Update analytics settings if provided
    if (settings?.analytics) {
      const { error: analyticsError } = await context.supabase
        .from("project_analytics_settings")
        .upsert({
          project_id: params.projectId,
          ...settings.analytics,
          updated_at: new Date().toISOString(),
        });

      if (analyticsError) {
        console.error("❌ Analytics settings update error:", analyticsError);
      }
    }

    console.log("✅ Project Settings: Successfully updated settings", {
      projectId: params.projectId,
      updatedSections: Object.keys(body),
      updatedBy: context.user.id,
    });

    return createSuccessResponse({
      message: "Project settings updated successfully",
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Project Settings: Update error:", error);
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
