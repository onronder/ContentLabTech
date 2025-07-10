/**
 * Test Request Validation API
 * Endpoint for testing request data validation without authentication
 */

import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  console.log("🧪 Testing GET request validation");

  const url = new URL(request.url);
  const teamId = url.searchParams.get("teamId");
  const limit = url.searchParams.get("limit");
  const offset = url.searchParams.get("offset");
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("search");

  console.log("🔍 Team ID from query:", teamId || "none");

  // Parse and validate pagination parameters
  const limitNum = limit ? parseInt(limit) : 50;
  const offsetNum = offset ? parseInt(offset) : 0;
  const limitValid =
    !limit || (!isNaN(limitNum) && limitNum > 0 && limitNum <= 100);
  const offsetValid = !offset || (!isNaN(offsetNum) && offsetNum >= 0);

  console.log("📊 Pagination params: limit=", limitNum, ", offset=", offsetNum);

  // Validate query parameters
  const queryValidation = {
    teamIdValid: !teamId || (typeof teamId === "string" && teamId.length > 0),
    limitValid,
    offsetValid,
    statusValid:
      !status || ["active", "paused", "completed", "archived"].includes(status),
    searchValid:
      !search || (typeof search === "string" && search.length <= 100),
  };

  const allValid = Object.values(queryValidation).every(v => v === true);
  console.log("✅ Query validation:", allValid ? "VALID" : "INVALID");

  return new Response(
    JSON.stringify({
      method: "GET",
      validation: allValid ? "VALID" : "INVALID",
      parameters: {
        teamId,
        limit: limitNum,
        offset: offsetNum,
        status,
        search,
      },
      validation_details: queryValidation,
    }),
    {
      status: allValid ? 200 : 400,
      headers: { "Content-Type": "application/json" },
    }
  );
}

export async function POST(request: NextRequest) {
  console.log("🧪 Testing POST request validation");

  try {
    // Get raw body for size logging
    const requestText = await request.text();
    console.log("📝 Request body received:", requestText.length, "bytes");

    // Parse JSON from text
    let body: any;
    try {
      body = JSON.parse(requestText);
    } catch (parseError) {
      console.log("❌ JSON parsing error:", {
        error: parseError,
        bodyPreview: requestText.substring(0, 100),
      });
      return new Response(
        JSON.stringify({
          method: "POST",
          validation: "INVALID",
          error: "Invalid JSON in request body",
          bodyPreview: requestText.substring(0, 100),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

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

    return new Response(
      JSON.stringify({
        method: "POST",
        validation: allDataValid ? "VALID" : "INVALID",
        bodySize: requestText.length,
        data: {
          name: body.name,
          teamId: body.teamId,
          website_url: body.website_url,
        },
        validation_details: dataValidation,
      }),
      {
        status: allDataValid ? 200 : 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.log("❌ Error in POST validation test:", error);
    return new Response(
      JSON.stringify({
        method: "POST",
        validation: "INVALID",
        error: "Request processing error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
