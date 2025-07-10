import { NextRequest } from "next/server";
import {
  withApiAuth,
  createSuccessResponse,
  validateTeamAccess,
  type AuthContext,
} from "@/lib/auth/withApiAuth-definitive";

interface ProjectSettings {
  name?: string;
  description?: string;
  domain?: string;
  analytics_enabled?: boolean;
  monitoring_enabled?: boolean;
  seo_tracking?: boolean;
}

export const GET = withApiAuth(
  async (
    request: NextRequest,
    context: AuthContext,
    { params }: { params: { id: string } }
  ) => {
    try {
      const projectId = params.id;

      // Get project with team info
      const { data: project, error: projectError } = await context.supabase
        .from("projects")
        .select("*, team:teams!inner(*)")
        .eq("id", projectId)
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

      // Validate team access (requires admin or higher)
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
              "Insufficient permissions to view project settings",
            code: "INSUFFICIENT_PERMISSIONS",
            status: 403,
          }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }

      return createSuccessResponse({
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          domain: project.domain,
          analytics_enabled: project.analytics_enabled,
          monitoring_enabled: project.monitoring_enabled,
          seo_tracking: project.seo_tracking,
          created_at: project.created_at,
          updated_at: project.updated_at,
          team: project.team,
        },
      });
    } catch (error) {
      console.error("Error fetching project settings:", error);
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
);

export const PUT = withApiAuth(
  async (
    request: NextRequest,
    context: AuthContext,
    { params }: { params: { id: string } }
  ) => {
    try {
      const projectId = params.id;
      const settings: ProjectSettings = await request.json();

      // Get project to validate team ownership
      const { data: project, error: projectError } = await context.supabase
        .from("projects")
        .select("team_id")
        .eq("id", projectId)
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

      // Validate team access (requires admin or higher)
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

      // Update project settings
      const { data: updatedProject, error: updateError } =
        await context.supabase
          .from("projects")
          .update({
            ...settings,
            updated_at: new Date().toISOString(),
          })
          .eq("id", projectId)
          .select("*")
          .single();

      if (updateError) {
        console.error("Error updating project settings:", updateError);
        return new Response(
          JSON.stringify({
            error: "Failed to update project settings",
            code: "UPDATE_ERROR",
            status: 500,
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      // Log settings update
      await context.supabase.from("user_events").insert({
        user_id: context.user.id,
        event_type: "project_settings_updated",
        event_data: {
          project_id: projectId,
          settings_changed: Object.keys(settings),
        },
      });

      return createSuccessResponse({
        project: updatedProject,
      });
    } catch (error) {
      console.error("Error updating project settings:", error);
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
);
