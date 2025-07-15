/**
 * Complete Production Health Check Endpoint
 * Comprehensive end-to-end testing of all production systems
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

interface CompleteHealthCheck {
  status: "healthy" | "degraded" | "error";
  checks: {
    database: boolean;
    environment: boolean;
    api_routes: boolean;
    email_service: boolean;
    authentication: boolean;
    team_system: boolean;
    user_preferences: boolean;
  };
  details: {
    database?: any;
    environment?: any;
    api_routes?: any;
    email_service?: any;
    authentication?: any;
    team_system?: any;
    user_preferences?: any;
  };
  response_times: {
    database: number;
    environment: number;
    api_routes: number;
    email_service: number;
    authentication: number;
    team_system: number;
    user_preferences: number;
  };
  timestamp: string;
  production_url: string;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const checks = {
    database: false,
    environment: false,
    api_routes: false,
    email_service: false,
    authentication: false,
    team_system: false,
    user_preferences: false,
  };

  const details: Record<string, any> = {};
  const responseTimes = {
    database: 0,
    environment: 0,
    api_routes: 0,
    email_service: 0,
    authentication: 0,
    team_system: 0,
    user_preferences: 0,
  };

  try {
    // 1. Database Health Check
    console.log("🔍 Testing database health...");
    const dbStartTime = Date.now();
    try {
      const dbResponse = await fetch(`${baseUrl}/api/health/database`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      responseTimes.database = Date.now() - dbStartTime;

      if (dbResponse.ok) {
        const dbData = await dbResponse.json();
        checks.database =
          dbData.status === "healthy" || dbData.status === "degraded";
        details.database = {
          status: dbData.status,
          summary: dbData.summary,
          responseTime: responseTimes.database,
        };
      } else {
        details.database = {
          error: `HTTP ${dbResponse.status}`,
          responseTime: responseTimes.database,
        };
      }
    } catch (error) {
      responseTimes.database = Date.now() - dbStartTime;
      details.database = {
        error: error instanceof Error ? error.message : "Unknown error",
        responseTime: responseTimes.database,
      };
    }

    // 2. Environment Health Check
    console.log("🔍 Testing environment health...");
    const envStartTime = Date.now();
    try {
      const envResponse = await fetch(`${baseUrl}/api/health/environment`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      responseTimes.environment = Date.now() - envStartTime;

      if (envResponse.ok) {
        const envData = await envResponse.json();
        checks.environment = envData.status === "healthy";
        details.environment = {
          status: envData.status,
          configured: envData.configured_variables?.length || 0,
          missing: envData.missing_variables?.length || 0,
          responseTime: responseTimes.environment,
        };
      } else {
        details.environment = {
          error: `HTTP ${envResponse.status}`,
          responseTime: responseTimes.environment,
        };
      }
    } catch (error) {
      responseTimes.environment = Date.now() - envStartTime;
      details.environment = {
        error: error instanceof Error ? error.message : "Unknown error",
        responseTime: responseTimes.environment,
      };
    }

    // 3. API Routes Health Check
    console.log("🔍 Testing API routes...");
    const apiStartTime = Date.now();
    try {
      const apiEndpoints = [
        "/api/teams",
        "/api/projects",
        "/api/content",
        "/api/analytics",
      ];

      const apiResults = await Promise.allSettled(
        apiEndpoints.map(async endpoint => {
          const response = await fetch(`${baseUrl}${endpoint}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });

          return {
            endpoint,
            status: response.status,
            ok: response.ok,
            accessible: response.status !== 404,
          };
        })
      );

      responseTimes.api_routes = Date.now() - apiStartTime;

      const accessibleEndpoints = apiResults
        .filter(result => result.status === "fulfilled")
        .map(result => (result as PromiseFulfilledResult<any>).value)
        .filter(result => result.accessible);

      checks.api_routes = accessibleEndpoints.length === apiEndpoints.length;
      details.api_routes = {
        total: apiEndpoints.length,
        accessible: accessibleEndpoints.length,
        endpoints: apiResults.map(result =>
          result.status === "fulfilled"
            ? result.value
            : { error: result.reason }
        ),
        responseTime: responseTimes.api_routes,
      };
    } catch (error) {
      responseTimes.api_routes = Date.now() - apiStartTime;
      details.api_routes = {
        error: error instanceof Error ? error.message : "Unknown error",
        responseTime: responseTimes.api_routes,
      };
    }

    // 4. Email Service Check
    console.log("🔍 Testing email service...");
    const emailStartTime = Date.now();
    try {
      const hasResendKey = !!process.env.RESEND_API_KEY;

      if (hasResendKey) {
        // Test Resend API availability
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "test@example.com",
            to: "test@example.com",
            subject: "Test",
            html: "<p>Test</p>",
          }),
        });

        responseTimes.email_service = Date.now() - emailStartTime;

        // Even if the test email fails, if we get a proper API response, service is available
        checks.email_service =
          resendResponse.status === 400 ||
          resendResponse.status === 422 ||
          resendResponse.status === 200;
        details.email_service = {
          configured: true,
          api_accessible: checks.email_service,
          status: resendResponse.status,
          responseTime: responseTimes.email_service,
        };
      } else {
        responseTimes.email_service = Date.now() - emailStartTime;
        checks.email_service = false;
        details.email_service = {
          configured: false,
          error: "RESEND_API_KEY not configured",
          responseTime: responseTimes.email_service,
        };
      }
    } catch (error) {
      responseTimes.email_service = Date.now() - emailStartTime;
      details.email_service = {
        error: error instanceof Error ? error.message : "Unknown error",
        responseTime: responseTimes.email_service,
      };
    }

    // 5. Authentication System Check
    console.log("🔍 Testing authentication system...");
    const authStartTime = Date.now();
    try {
      // Test auth endpoints
      const authEndpoints = [
        "/api/teams/test-team/invitations", // Should require auth
        "/auth/signin", // Should be accessible
      ];

      const authResults = await Promise.allSettled(
        authEndpoints.map(async endpoint => {
          const response = await fetch(`${baseUrl}${endpoint}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });

          return {
            endpoint,
            status: response.status,
            requires_auth: response.status === 401 || response.status === 403,
            accessible: response.status !== 404,
          };
        })
      );

      responseTimes.authentication = Date.now() - authStartTime;

      const authWorking = authResults
        .filter(result => result.status === "fulfilled")
        .map(result => (result as PromiseFulfilledResult<any>).value)
        .filter(result => result.accessible);

      checks.authentication = authWorking.length > 0;
      details.authentication = {
        endpoints_tested: authEndpoints.length,
        working: authWorking.length,
        auth_enforcement: authWorking.some(r => r.requires_auth),
        responseTime: responseTimes.authentication,
      };
    } catch (error) {
      responseTimes.authentication = Date.now() - authStartTime;
      details.authentication = {
        error: error instanceof Error ? error.message : "Unknown error",
        responseTime: responseTimes.authentication,
      };
    }

    // 6. Team System Check
    console.log("🔍 Testing team system...");
    const teamStartTime = Date.now();
    try {
      // Test team-related database operations
      const { data: teams, error: teamsError } = await supabase
        .from("teams")
        .select("id, name")
        .limit(1);

      responseTimes.team_system = Date.now() - teamStartTime;

      if (teamsError) {
        // Error might be due to RLS - that's actually good
        checks.team_system =
          teamsError.message.includes("policy") ||
          teamsError.message.includes("JWT");
        details.team_system = {
          database_accessible: true,
          rls_enforced: checks.team_system,
          error: teamsError.message,
          responseTime: responseTimes.team_system,
        };
      } else {
        checks.team_system = true;
        details.team_system = {
          database_accessible: true,
          teams_count: teams?.length || 0,
          responseTime: responseTimes.team_system,
        };
      }
    } catch (error) {
      responseTimes.team_system = Date.now() - teamStartTime;
      details.team_system = {
        error: error instanceof Error ? error.message : "Unknown error",
        responseTime: responseTimes.team_system,
      };
    }

    // 7. User Preferences Check
    console.log("🔍 Testing user preferences system...");
    const prefStartTime = Date.now();
    try {
      // Test user preferences database operations
      const { data: prefs, error: prefsError } = await supabase
        .from("user_preferences")
        .select("id, user_id")
        .limit(1);

      responseTimes.user_preferences = Date.now() - prefStartTime;

      if (prefsError) {
        // Error might be due to RLS - that's actually good
        checks.user_preferences =
          prefsError.message.includes("policy") ||
          prefsError.message.includes("JWT");
        details.user_preferences = {
          database_accessible: true,
          rls_enforced: checks.user_preferences,
          error: prefsError.message,
          responseTime: responseTimes.user_preferences,
        };
      } else {
        checks.user_preferences = true;
        details.user_preferences = {
          database_accessible: true,
          preferences_count: prefs?.length || 0,
          responseTime: responseTimes.user_preferences,
        };
      }
    } catch (error) {
      responseTimes.user_preferences = Date.now() - prefStartTime;
      details.user_preferences = {
        error: error instanceof Error ? error.message : "Unknown error",
        responseTime: responseTimes.user_preferences,
      };
    }

    // Determine overall status
    const totalChecks = Object.values(checks).length;
    const passedChecks = Object.values(checks).filter(Boolean).length;
    const criticalChecks = [
      checks.database,
      checks.environment,
      checks.api_routes,
    ];
    const criticalPassed = criticalChecks.filter(Boolean).length;

    let overallStatus: "healthy" | "degraded" | "error";
    if (criticalPassed === 3 && passedChecks >= totalChecks * 0.8) {
      overallStatus = "healthy";
    } else if (criticalPassed >= 2 && passedChecks >= totalChecks * 0.6) {
      overallStatus = "degraded";
    } else {
      overallStatus = "error";
    }

    const result: CompleteHealthCheck = {
      status: overallStatus,
      checks,
      details,
      response_times: responseTimes,
      timestamp: new Date().toISOString(),
      production_url: baseUrl,
    };

    console.log(
      `🎯 Health check completed: ${overallStatus} (${passedChecks}/${totalChecks} checks passed)`
    );

    return NextResponse.json(result, {
      status: overallStatus === "error" ? 503 : 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Health-Check-Duration": `${Date.now() - startTime}ms`,
      },
    });
  } catch (error) {
    console.error("Complete health check failed:", error);

    return NextResponse.json(
      {
        status: "error",
        checks,
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        response_times: responseTimes,
        timestamp: new Date().toISOString(),
        production_url: baseUrl,
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  }
}
