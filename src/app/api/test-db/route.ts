/**
 * Database Connection Test API
 * Tests Supabase database connectivity and query execution
 */

import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withSimpleAuth, SimpleUser } from "@/lib/auth/simple-api-auth";

// Test Supabase client initialization
console.log("🔌 Initializing Supabase client for database testing...");

let supabase: any;
let clientInitError: any = null;

try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("🔐 Environment variables check:", {
    supabaseUrl: supabaseUrl ? "PRESENT" : "MISSING",
    supabaseKey: supabaseKey ? "PRESENT" : "MISSING",
    urlLength: supabaseUrl?.length || 0,
    keyLength: supabaseKey?.length || 0,
  });

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
  }

  supabase = createClient(supabaseUrl, supabaseKey);
  console.log("🔌 Supabase client initialized: SUCCESS");
} catch (error) {
  clientInitError = error;
  console.log("🔌 Supabase client initialized: FAIL", {
    error: error,
    message: error instanceof Error ? error.message : "Unknown error",
    stack: error instanceof Error ? error.stack : "No stack trace",
  });
}

export const GET = withSimpleAuth(
  async (request: NextRequest, user: SimpleUser) => {
    console.log("🧪 Database connection test started");
    console.log("👤 Test user:", { id: user.id, email: user.email });

    const testResults = {
      clientInitialization: "UNKNOWN",
      databaseConnection: "UNKNOWN",
      basicQuery: "UNKNOWN",
      projectsTableAccess: "UNKNOWN",
      countQuery: "UNKNOWN",
      errors: [] as any[],
    };

    // Test 1: Client Initialization
    if (clientInitError) {
      testResults.clientInitialization = "FAIL";
      testResults.errors.push({
        test: "Client Initialization",
        error: clientInitError,
        message:
          clientInitError instanceof Error
            ? clientInitError.message
            : "Unknown error",
      });
      console.log("🔌 Supabase client initialized: FAIL");

      return new Response(
        JSON.stringify({
          success: false,
          message: "Supabase client initialization failed",
          results: testResults,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    } else {
      testResults.clientInitialization = "SUCCESS";
      console.log("🔌 Supabase client initialized: SUCCESS");
    }

    // Test 2: Basic Database Connection
    console.log("📡 Testing database connection...");
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id")
        .limit(1);

      if (error) {
        testResults.databaseConnection = "FAIL";
        testResults.errors.push({
          test: "Database Connection",
          error: error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        console.log("📡 Database connection test: FAIL", {
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint,
        });
      } else {
        testResults.databaseConnection = "SUCCESS";
        console.log("📡 Database connection test: SUCCESS", {
          queryResult: data ? "DATA_RETURNED" : "NO_DATA",
          resultLength: data?.length || 0,
        });
      }
    } catch (error) {
      testResults.databaseConnection = "FAIL";
      testResults.errors.push({
        test: "Database Connection",
        error: error,
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : "No stack trace",
      });
      console.log("📡 Database connection test: FAIL", {
        error: error,
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : "No stack trace",
      });
    }

    // Test 3: Simple Query Execution (SELECT 1)
    console.log("🔍 Testing simple query execution...");
    try {
      const { data, error } = await supabase.rpc("select_one", {});

      if (error && error.code === "42883") {
        // Function doesn't exist, try direct SQL
        console.log("📊 RPC function not found, testing with direct query...");
        const { data: directData, error: directError } = await supabase
          .from("projects")
          .select("1 as test_value")
          .limit(1);

        if (directError) {
          testResults.basicQuery = "FAIL";
          testResults.errors.push({
            test: "Basic Query",
            error: directError,
            code: directError.code,
            message: directError.message,
          });
          console.log("📊 Query execution test: FAIL", {
            errorCode: directError.code,
            errorMessage: directError.message,
          });
        } else {
          testResults.basicQuery = "SUCCESS";
          console.log("📊 Query execution test: SUCCESS", {
            queryType: "direct_select",
            result: directData,
          });
        }
      } else if (error) {
        testResults.basicQuery = "FAIL";
        testResults.errors.push({
          test: "Basic Query",
          error: error,
          code: error.code,
          message: error.message,
        });
        console.log("📊 Query execution test: FAIL", {
          errorCode: error.code,
          errorMessage: error.message,
        });
      } else {
        testResults.basicQuery = "SUCCESS";
        console.log("📊 Query execution test: SUCCESS", {
          queryType: "rpc_function",
          result: data,
        });
      }
    } catch (error) {
      testResults.basicQuery = "FAIL";
      testResults.errors.push({
        test: "Basic Query",
        error: error,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      console.log("📊 Query execution test: FAIL", {
        error: error,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Test 4: Projects Table Access
    console.log("🔍 Testing projects table access permissions...");
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, team_id, status")
        .limit(5);

      if (error) {
        testResults.projectsTableAccess = "FAIL";
        testResults.errors.push({
          test: "Projects Table Access",
          error: error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        console.log("🔍 Projects table access test: FAIL", {
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint,
        });
      } else {
        testResults.projectsTableAccess = "SUCCESS";
        console.log("🔍 Projects table access test: SUCCESS", {
          rowCount: data?.length || 0,
          sampleData: data?.slice(0, 2) || [],
        });
      }
    } catch (error) {
      testResults.projectsTableAccess = "FAIL";
      testResults.errors.push({
        test: "Projects Table Access",
        error: error,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      console.log("🔍 Projects table access test: FAIL", {
        error: error,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Test 5: Specific Count Query with Team ID
    console.log("📊 Testing specific count query with team filter...");
    const testTeamId = "test-team-id-123";
    try {
      console.log("🔍 Executing SQL query:", {
        query: "SELECT COUNT(*) FROM projects WHERE team_id = $1",
        parameters: [testTeamId],
        description: "Count projects for specific team",
      });

      const { data, error, count } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("team_id", testTeamId);

      if (error) {
        testResults.countQuery = "FAIL";
        testResults.errors.push({
          test: "Count Query",
          error: error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          query: "SELECT COUNT(*) FROM projects WHERE team_id = $1",
          parameters: [testTeamId],
        });
        console.log("📊 Count query test: FAIL", {
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint,
          query: "SELECT COUNT(*) FROM projects WHERE team_id = $1",
          parameters: [testTeamId],
        });
      } else {
        testResults.countQuery = "SUCCESS";
        console.log("📊 Count query test: SUCCESS", {
          count: count,
          queryExecuted: "SELECT COUNT(*) FROM projects WHERE team_id = $1",
          parameters: [testTeamId],
          result: "Query executed successfully",
        });
      }
    } catch (error) {
      testResults.countQuery = "FAIL";
      testResults.errors.push({
        test: "Count Query",
        error: error,
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : "No stack trace",
      });
      console.log("📊 Count query test: FAIL", {
        error: error,
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : "No stack trace",
      });
    }

    // Test 6: Test with actual user's team memberships
    console.log("🏢 Testing with user's actual team memberships...");
    try {
      const { data: teamData, error: teamError } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id);

      if (teamError) {
        console.log("🏢 Team membership query: FAIL", {
          errorCode: teamError.code,
          errorMessage: teamError.message,
        });
      } else {
        console.log("🏢 Team membership query: SUCCESS", {
          teamCount: teamData?.length || 0,
          teams: teamData?.map((t: any) => t.team_id) || [],
        });

        // If user has teams, test projects query with real team ID
        if (teamData && teamData.length > 0) {
          const realTeamId = teamData[0].team_id;
          console.log(
            "🔍 Testing projects query with real team ID:",
            realTeamId
          );

          const { data: projectData, error: projectError } = await supabase
            .from("projects")
            .select("id, name, team_id, status")
            .eq("team_id", realTeamId);

          if (projectError) {
            console.log("📊 Real team projects query: FAIL", {
              errorCode: projectError.code,
              errorMessage: projectError.message,
              teamId: realTeamId,
            });
          } else {
            console.log("📊 Real team projects query: SUCCESS", {
              projectCount: projectData?.length || 0,
              teamId: realTeamId,
              projects:
                projectData?.map((p: any) => ({ id: p.id, name: p.name })) ||
                [],
            });
          }
        }
      }
    } catch (error) {
      console.log("🏢 Team membership test: FAIL", {
        error: error,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Summary
    const allTestsPassed = Object.values(testResults).every(
      (value, index) => index === 4 || value === "SUCCESS" // Skip errors array
    );

    console.log("🧪 Database connection test completed:", {
      allTestsPassed,
      results: testResults,
      errorCount: testResults.errors.length,
    });

    return new Response(
      JSON.stringify({
        success: allTestsPassed,
        message: allTestsPassed
          ? "All database connection tests passed"
          : "Some database connection tests failed",
        results: testResults,
        userId: user.id,
        timestamp: new Date().toISOString(),
      }),
      {
        status: allTestsPassed ? 200 : 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
);
