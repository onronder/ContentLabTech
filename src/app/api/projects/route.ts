/**
 * Simple Projects API
 * Basic implementation that works
 */

import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withSimpleAuth, SimpleUser } from "@/lib/auth/simple-api-auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CreateProjectRequest {
  teamId: string;
  name: string;
  description?: string;
  website_url?: string;
  target_keywords?: string[];
  target_audience?: string;
  content_goals?: string[];
  competitors?: string[];
  settings?: Record<string, unknown>;
}

export const POST = withSimpleAuth(
  async (request: NextRequest, user: SimpleUser) => {
    try {
      const body: CreateProjectRequest = await request.json();

      if (!body.teamId || !body.name) {
        return new Response(
          JSON.stringify({ error: "Team ID and project name are required" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Check if user has access to this team
      const { data: teamMember, error: teamError } = await supabase
        .from("team_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("team_id", body.teamId)
        .single();

      if (teamError || !teamMember) {
        return new Response(
          JSON.stringify({ error: "User is not a member of this team" }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Create project
      const { data: newProject, error: createError } = await supabase
        .from("projects")
        .insert({
          team_id: body.teamId,
          name: body.name,
          description: body.description,
          website_url: body.website_url,
          target_keywords: body.target_keywords || [],
          target_audience: body.target_audience,
          content_goals: body.content_goals || [],
          competitors: body.competitors || [],
          settings: body.settings || {},
          status: "active",
          created_by: user.id,
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating project:", createError);
        return new Response(
          JSON.stringify({ error: "Failed to create project" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          project: newProject,
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("API error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
);
