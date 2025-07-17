/**
 * Simple Projects API
 * Basic implementation that works
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticatedApiHandler } from "@/lib/auth/api-handler";

// Database connection initialization with detailed logging
console.log("🔌 Initializing Supabase client for Projects API...");
console.log("🔐 Environment variables status:", {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "PRESENT" : "MISSING",
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? "PRESENT" : "MISSING",
  urlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
  keyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

console.log("🔌 Supabase client initialized: SUCCESS");

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

export async function POST(request: NextRequest) {
  return authenticatedApiHandler(request, async (user, team) => {
    // Method-specific logging
    console.log("📤 POST request received for project creation");
    console.log("🔧 Request method: POST");
    console.log("📋 Request URL:", request.url);

    // Parse and log query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    console.log("🎯 Query parameters:", queryParams);

    console.log("🔍 Projects API called with method: POST");
    console.log("🔐 Auth validation result:", {
      userId: user.id,
      userEmail: user.email,
      timestamp: new Date().toISOString(),
    });

    // Log request headers (sanitized)
    const sanitizedHeaders = Object.fromEntries(
      Array.from(request.headers.entries()).filter(
        ([key]) =>
          !key.toLowerCase().includes("authorization") &&
          !key.toLowerCase().includes("cookie")
      )
    );
    console.log("📋 Request headers (sanitized):", sanitizedHeaders);

    try {
      console.log("📊 Attempting to parse request body...");

      // Get raw body for size logging
      const requestText = await request.text();
      console.log("📝 Request body received:", requestText.length, "bytes");

      // Parse JSON from text
      let body: CreateProjectRequest;
      try {
        body = JSON.parse(requestText);
      } catch (parseError) {
        console.log("❌ JSON parsing error:", {
          error: parseError,
          bodyPreview: requestText.substring(0, 100),
        });
        return new Response(
          JSON.stringify({ error: "Invalid JSON in request body" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      console.log("📊 Request body parsed successfully:", {
        teamId: body.teamId,
        name: body.name,
        hasDescription: !!body.description,
        hasWebsiteUrl: !!body.website_url,
        keywordCount: body.target_keywords?.length || 0,
        goalCount: body.content_goals?.length || 0,
        competitorCount: body.competitors?.length || 0,
      });

      // Request data logging for POST
      console.log("🏷️ Project name:", body.name || "none");
      console.log("🌐 Website URL:", body.website_url || "none");
      console.log("👥 Target team:", body.teamId || "none");

      // Comprehensive data validation
      const dataValidation = {
        hasTeamId: !!body.teamId,
        teamIdValid: typeof body.teamId === "string" && body.teamId.length > 0,
        hasName: !!body.name,
        nameValid:
          typeof body.name === "string" &&
          body.name.length > 0 &&
          body.name.length <= 100,
        websiteUrlValid:
          !body.website_url ||
          (typeof body.website_url === "string" &&
            (body.website_url.startsWith("http://") ||
              body.website_url.startsWith("https://"))),
        keywordsValid:
          !body.target_keywords || Array.isArray(body.target_keywords),
        goalsValid: !body.content_goals || Array.isArray(body.content_goals),
        competitorsValid: !body.competitors || Array.isArray(body.competitors),
        settingsValid: !body.settings || typeof body.settings === "object",
        audienceValid:
          !body.target_audience || typeof body.target_audience === "string",
      };

      const allDataValid = Object.values(dataValidation).every(v => v === true);
      console.log("✅ Data validation:", allDataValid ? "VALID" : "INVALID");

      if (!allDataValid) {
        console.log("❌ Data validation details:", dataValidation);
        return new Response(
          JSON.stringify({
            error: "Invalid request data",
            validation: dataValidation,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // POST method validation
      console.log("🔍 POST request validation:", {
        hasTeamId: !!body.teamId,
        hasName: !!body.name,
        teamIdValue: body.teamId,
        nameValue: body.name,
        requestMethod: "POST",
        contentType: request.headers.get("content-type"),
      });

      // Authentication debugging for team access
      console.log("🏢 Team ID from request:", body.teamId);
      console.log("👤 User ID from token:", user.id);
      console.log("🔍 About to check team access for user...");

      if (!body.teamId || !body.name) {
        console.log("❌ Validation failed: Missing required fields", {
          hasTeamId: !!body.teamId,
          hasName: !!body.name,
        });
        return new Response(
          JSON.stringify({ error: "Team ID and project name are required" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Check if user has access to this team
      console.log("📊 Attempting database query: team_members lookup");
      console.log("🔍 Executing SQL query:", {
        table: "team_members",
        query:
          "SELECT role FROM team_members WHERE user_id = $1 AND team_id = $2",
        parameters: [user.id, body.teamId],
        description: "Check user team membership",
      });

      let teamMember, teamError;
      try {
        const result = await supabase
          .from("team_members")
          .select("role")
          .eq("user_id", user.id)
          .eq("team_id", body.teamId)
          .single();

        teamMember = result.data;
        teamError = result.error;

        console.log("📊 Team member query result:", {
          hasData: !!teamMember,
          errorCode: teamError?.code,
          errorMessage: teamError?.message,
          errorDetails: teamError?.details,
          errorHint: teamError?.hint,
          queryExecuted:
            "SELECT role FROM team_members WHERE user_id = $1 AND team_id = $2",
          parameters: [user.id, body.teamId],
        });
      } catch (dbError) {
        console.log("❌ Database error in team_members query:", {
          error: dbError,
          stack: dbError instanceof Error ? dbError.stack : "No stack trace",
          queryAttempted:
            "SELECT role FROM team_members WHERE user_id = $1 AND team_id = $2",
          parameters: [user.id, body.teamId],
        });
        teamError = dbError;
      }

      if (teamError || !teamMember) {
        console.log("❌ Team access denied:", {
          hasTeamError: !!teamError,
          hasTeamMember: !!teamMember,
          teamId: body.teamId,
          userId: user.id,
        });
        console.log("✅ User has access to team: FALSE");
        console.log("🔐 Authentication flow summary:", {
          authHeaderPresent: "YES (passed withSimpleAuth)",
          tokenExtracted: "YES (passed withSimpleAuth)",
          userIdFromToken: user.id,
          teamIdFromRequest: body.teamId,
          teamAccessGranted: false,
          reason: teamError ? "Database error" : "User not in team",
        });
        return new Response(
          JSON.stringify({ error: "User is not a member of this team" }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Team access successful
      console.log("✅ User has access to team: TRUE");
      console.log("🔐 Authentication flow summary:", {
        authHeaderPresent: "YES (passed withSimpleAuth)",
        tokenExtracted: "YES (passed withSimpleAuth)",
        userIdFromToken: user.id,
        teamIdFromRequest: body.teamId,
        teamAccessGranted: true,
        teamMemberRole: teamMember?.role || "unknown",
      });

      // Create project
      console.log("📊 Attempting database query: projects insert");
      const projectData = {
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
      };

      console.log("📊 Project data to insert:", {
        team_id: projectData.team_id,
        name: projectData.name,
        hasDescription: !!projectData.description,
        hasWebsiteUrl: !!projectData.website_url,
        keywordCount: projectData.target_keywords.length,
        goalCount: projectData.content_goals.length,
        competitorCount: projectData.competitors.length,
        status: projectData.status,
        created_by: projectData.created_by,
      });

      console.log("🔍 Executing SQL query:", {
        table: "projects",
        query:
          "INSERT INTO projects (team_id, name, description, website_url, target_keywords, target_audience, content_goals, competitors, settings, status, created_by) VALUES (...)",
        description: "Insert new project record",
        dataValidation: {
          requiredFields: {
            team_id: !!projectData.team_id,
            name: !!projectData.name,
            created_by: !!projectData.created_by,
          },
          arrayFields: {
            target_keywords: Array.isArray(projectData.target_keywords),
            content_goals: Array.isArray(projectData.content_goals),
            competitors: Array.isArray(projectData.competitors),
          },
        },
      });

      let newProject, createError;
      try {
        const result = await supabase
          .from("projects")
          .insert(projectData)
          .select()
          .single();

        newProject = result.data;
        createError = result.error;

        console.log("📊 Project insert result:", {
          hasData: !!newProject,
          errorCode: createError?.code,
          errorMessage: createError?.message,
          errorDetails: createError?.details,
          errorHint: createError?.hint,
          queryExecuted: "INSERT INTO projects (...) VALUES (...)",
          insertedId: newProject?.id,
        });
      } catch (dbError) {
        console.log("❌ Database error in projects insert:", {
          error: dbError,
          stack: dbError instanceof Error ? dbError.stack : "No stack trace",
          queryAttempted: "INSERT INTO projects (...) VALUES (...)",
          projectData: projectData,
        });
        createError = dbError;
      }

      if (createError) {
        console.log("❌ Project creation failed:", {
          errorCode: (createError as any)?.code,
          errorMessage: (createError as any)?.message,
          errorDetails: (createError as any)?.details,
          errorHint: (createError as any)?.hint,
          fullError: createError,
        });
        return new Response(
          JSON.stringify({ error: "Failed to create project" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      console.log("✅ Project created successfully:", {
        projectId: newProject?.id,
        projectName: newProject?.name,
        teamId: newProject?.team_id,
      });

      console.log("✅ Sending response: 201 Created");
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
      console.log("❌ Error caught in main try-catch:", {
        error: error,
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : "No stack trace",
        name: error instanceof Error ? error.name : "Unknown error type",
      });

      console.log("✅ Sending response: 500 Internal Server Error");
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  });
}

// Add GET method to handle the 405 error mentioned in test
export async function GET(request: NextRequest) {
  return authenticatedApiHandler(request, async (user, team) => {
    // Method-specific logging
    console.log("📥 GET request received for projects");
    console.log("🔧 Request method: GET");
    console.log("📋 Request URL:", request.url);

    // Parse and log query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    console.log("🎯 Query parameters:", queryParams);

    // Log specific parameters that GET method expects
    const teamId = url.searchParams.get("teamId");
    const limit = url.searchParams.get("limit");
    const offset = url.searchParams.get("offset");
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search");

    // Request data validation logging for GET
    console.log("🔍 Team ID from query:", teamId || "none");

    // Parse and validate pagination parameters
    const limitNum = limit ? parseInt(limit) : 50;
    const offsetNum = offset ? parseInt(offset) : 0;
    const limitValid =
      !limit || (!isNaN(limitNum) && limitNum > 0 && limitNum <= 100);
    const offsetValid = !offset || (!isNaN(offsetNum) && offsetNum >= 0);

    console.log(
      "📊 Pagination params: limit=",
      limitNum,
      ", offset=",
      offsetNum
    );

    // Validate query parameters
    const queryValidation = {
      teamIdValid: !teamId || (typeof teamId === "string" && teamId.length > 0),
      limitValid,
      offsetValid,
      statusValid:
        !status ||
        ["active", "paused", "completed", "archived"].includes(status),
      searchValid:
        !search || (typeof search === "string" && search.length <= 100),
    };

    const allValid = Object.values(queryValidation).every(v => v === true);
    console.log("✅ Query validation:", allValid ? "VALID" : "INVALID");

    if (!allValid) {
      console.log("❌ Query validation details:", queryValidation);
      return new Response(
        JSON.stringify({
          error: "Invalid query parameters",
          validation: queryValidation,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log("🔍 Parsed GET parameters:", {
      teamId,
      limit: limitNum,
      offset: offsetNum,
      status,
      search,
    });

    console.log("🔍 Projects API called with method: GET");
    console.log("🔐 Auth validation result:", {
      userId: user.id,
      userEmail: user.email,
      timestamp: new Date().toISOString(),
    });

    // Authentication debugging - GET method
    console.log("👤 User ID from token:", user.id);
    console.log("🔍 About to fetch user's teams...");

    // Validate GET method parameter requirements
    if (teamId) {
      console.log("✅ TeamId parameter provided:", teamId);
    } else {
      console.log("⚠️ No teamId parameter - will fetch all user teams");
    }

    // Log request headers (sanitized)
    const sanitizedHeaders = Object.fromEntries(
      Array.from(request.headers.entries()).filter(
        ([key]) =>
          !key.toLowerCase().includes("authorization") &&
          !key.toLowerCase().includes("cookie")
      )
    );
    console.log("📋 Request headers (sanitized):", sanitizedHeaders);

    try {
      console.log("📊 Attempting to fetch projects for user");

      // Get user's teams first
      console.log(
        "📊 Attempting database query: team_members lookup for user teams"
      );
      console.log("🔍 Executing SQL query:", {
        table: "team_members",
        query: "SELECT team_id FROM team_members WHERE user_id = $1",
        parameters: [user.id],
        description: "Get all teams user belongs to",
      });

      let userTeams: any[] | null = null;
      let teamsError: any = null;
      try {
        const result = await supabase
          .from("team_members")
          .select("team_id")
          .eq("user_id", user.id);

        userTeams = result.data;
        teamsError = result.error;

        console.log("📊 User teams query result:", {
          hasData: !!userTeams,
          teamCount: userTeams?.length || 0,
          errorCode: teamsError?.code,
          errorMessage: teamsError?.message,
          errorDetails: teamsError?.details,
          errorHint: teamsError?.hint,
          queryExecuted: "SELECT team_id FROM team_members WHERE user_id = $1",
          parameters: [user.id],
        });
      } catch (dbError) {
        console.log("❌ Database error in team_members query:", {
          error: dbError,
          stack: dbError instanceof Error ? dbError.stack : "No stack trace",
          queryAttempted: "SELECT team_id FROM team_members WHERE user_id = $1",
          parameters: [user.id],
        });
        teamsError = dbError;
      }

      if (teamsError) {
        console.log("❌ Error fetching user teams:", {
          error: teamsError,
          message:
            teamsError instanceof Error ? teamsError.message : "Unknown error",
          code: (teamsError as any)?.code,
          stack:
            teamsError instanceof Error ? teamsError.stack : "No stack trace",
        });
        console.log("✅ Sending response: 500 Internal Server Error");
        return new Response(
          JSON.stringify({ error: "Failed to fetch user teams" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const teamIds = userTeams?.map((tm: any) => tm.team_id) || [];
      console.log("📊 User teams:", { teamIds, count: teamIds.length });

      // Filter teams based on query parameter if provided
      let filteredTeamIds = teamIds;
      if (teamId && teamIds.includes(teamId)) {
        filteredTeamIds = [teamId];
        console.log("🎯 Filtering to specific team:", teamId);
      } else if (teamId && !teamIds.includes(teamId)) {
        console.log("❌ User does not have access to requested team:", teamId);
        return new Response(
          JSON.stringify({ error: "Access denied to requested team" }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (filteredTeamIds.length === 0) {
        console.log(
          "✅ No accessible teams found for user, returning empty projects"
        );
        console.log("✅ Sending response: 200 OK");
        return new Response(JSON.stringify({ projects: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Get projects for user's teams
      console.log("📊 Attempting database query: projects lookup");
      console.log("🔍 Executing SQL query:", {
        table: "projects",
        query: "SELECT * FROM projects WHERE team_id IN ($1, $2, ...)",
        parameters: teamIds,
        description: "Get all projects for user's teams",
        teamCount: teamIds.length,
      });

      let projects: any[] | null = null;
      let projectsError: any = null;
      try {
        // Build query with filtering and pagination
        let query = supabase
          .from("projects")
          .select("*")
          .in("team_id", filteredTeamIds);

        // Add status filter if provided
        if (status) {
          query = query.eq("status", status);
          console.log("🔍 Filtering by status:", status);
        }

        // Add search filter if provided
        if (search) {
          query = query.or(
            `name.ilike.%${search}%,description.ilike.%${search}%`
          );
          console.log("🔍 Searching for:", search);
        }

        // Add pagination (using validated values)
        query = query.range(offsetNum, offsetNum + limitNum - 1);
        console.log("📄 Pagination:", { limit: limitNum, offset: offsetNum });

        const result = await query;

        projects = result.data;
        projectsError = result.error;

        console.log("📊 Projects query result:", {
          hasData: !!projects,
          projectCount: projects?.length || 0,
          errorCode: projectsError?.code,
          errorMessage: projectsError?.message,
          errorDetails: projectsError?.details,
          errorHint: projectsError?.hint,
          queryExecuted:
            "SELECT * FROM projects WHERE team_id IN (...) with filters",
          parameters: filteredTeamIds,
          appliedFilters: {
            status: status || "none",
            search: search || "none",
            limit: limitNum,
            offset: offsetNum,
          },
        });
      } catch (dbError) {
        console.log("❌ Database error in projects query:", {
          error: dbError,
          stack: dbError instanceof Error ? dbError.stack : "No stack trace",
          queryAttempted: "SELECT * FROM projects WHERE team_id IN (...)",
          parameters: teamIds,
        });
        projectsError = dbError;
      }

      if (projectsError) {
        console.log("❌ Error fetching projects:", {
          error: projectsError,
          message:
            projectsError instanceof Error
              ? projectsError.message
              : "Unknown error",
          code: (projectsError as any)?.code,
          stack:
            projectsError instanceof Error
              ? projectsError.stack
              : "No stack trace",
        });
        console.log("✅ Sending response: 500 Internal Server Error");
        return new Response(
          JSON.stringify({ error: "Failed to fetch projects" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      console.log("✅ Projects fetched successfully:", {
        count: projects?.length || 0,
      });

      console.log("✅ Sending response: 200 OK");
      return new Response(JSON.stringify({ projects: projects || [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.log("❌ Error caught in GET method main try-catch:", {
        error: error,
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : "No stack trace",
        name: error instanceof Error ? error.name : "Unknown error type",
      });

      console.log("✅ Sending response: 500 Internal Server Error");
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  });
}
