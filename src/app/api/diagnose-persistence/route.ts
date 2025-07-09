/**
 * Database Persistence Diagnostic API
 * Comprehensive testing and fixing of database persistence issues
 */

import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withSimpleAuth, SimpleUser } from "@/lib/auth/simple-api-auth";

console.log("🔧 Initializing Database Persistence Diagnostic Tool...");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PersistenceTestResult {
  testName: string;
  status: "SUCCESS" | "FAIL" | "WARNING";
  message: string;
  data?: any;
  error?: any;
  sqlQuery?: string;
  parameters?: any[];
}

export const GET = withSimpleAuth(
  async (request: NextRequest, user: SimpleUser) => {
    console.log("🔍 Database Persistence Diagnostic Started");
    console.log("👤 User:", { id: user.id, email: user.email });

    const results: PersistenceTestResult[] = [];
    let overallStatus = "SUCCESS";

    // Test 1: User Existence Check
    console.log("\n=== TEST 1: User Existence Check ===");
    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError) {
        results.push({
          testName: "User Existence Check",
          status: "FAIL",
          message: "Failed to verify user existence",
          error: userError,
        });
        overallStatus = "FAIL";
      } else {
        results.push({
          testName: "User Existence Check",
          status: "SUCCESS",
          message: "User exists and is authenticated",
          data: { id: userData.user?.id, email: userData.user?.email },
        });
      }
    } catch (error) {
      results.push({
        testName: "User Existence Check",
        status: "FAIL",
        message: "Exception during user verification",
        error: error,
      });
      overallStatus = "FAIL";
    }

    // Test 2: Team Members Table Structure
    console.log("\n=== TEST 2: Team Members Table Structure ===");
    try {
      const { data: tableInfo, error: tableError } = await supabase
        .from("team_members")
        .select("*")
        .limit(1);

      if (tableError) {
        results.push({
          testName: "Team Members Table Structure",
          status: "FAIL",
          message: "Cannot access team_members table",
          error: tableError,
          sqlQuery: "SELECT * FROM team_members LIMIT 1",
        });
        overallStatus = "FAIL";
      } else {
        results.push({
          testName: "Team Members Table Structure",
          status: "SUCCESS",
          message: "team_members table is accessible",
          data: { sampleRecord: tableInfo?.[0] || "No records found" },
        });
      }
    } catch (error) {
      results.push({
        testName: "Team Members Table Structure",
        status: "FAIL",
        message: "Exception accessing team_members table",
        error: error,
      });
      overallStatus = "FAIL";
    }

    // Test 3: User's Team Membership
    console.log("\n=== TEST 3: User's Team Membership ===");
    try {
      const { data: userTeams, error: teamsError } = await supabase
        .from("team_members")
        .select("team_id, role, created_at")
        .eq("user_id", user.id);

      if (teamsError) {
        results.push({
          testName: "User's Team Membership",
          status: "FAIL",
          message: "Failed to query user's team memberships",
          error: teamsError,
          sqlQuery:
            "SELECT team_id, role, created_at FROM team_members WHERE user_id = $1",
          parameters: [user.id],
        });
        overallStatus = "FAIL";
      } else if (!userTeams || userTeams.length === 0) {
        results.push({
          testName: "User's Team Membership",
          status: "WARNING",
          message:
            "User has no team memberships - this is the persistence issue!",
          data: { teamCount: 0, userId: user.id },
          sqlQuery:
            "SELECT team_id, role, created_at FROM team_members WHERE user_id = $1",
          parameters: [user.id],
        });
        overallStatus = "WARNING";
      } else {
        results.push({
          testName: "User's Team Membership",
          status: "SUCCESS",
          message: `User belongs to ${userTeams.length} team(s)`,
          data: { teamCount: userTeams.length, teams: userTeams },
        });
      }
    } catch (error) {
      results.push({
        testName: "User's Team Membership",
        status: "FAIL",
        message: "Exception during team membership query",
        error: error,
      });
      overallStatus = "FAIL";
    }

    // Test 4: Teams Table Check
    console.log("\n=== TEST 4: Teams Table Check ===");
    try {
      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("id, name, owner_id, created_at")
        .limit(5);

      if (teamsError) {
        results.push({
          testName: "Teams Table Check",
          status: "FAIL",
          message: "Cannot access teams table",
          error: teamsError,
          sqlQuery: "SELECT id, name, owner_id, created_at FROM teams LIMIT 5",
        });
        overallStatus = "FAIL";
      } else {
        results.push({
          testName: "Teams Table Check",
          status: "SUCCESS",
          message: `Found ${teamsData?.length || 0} teams in database`,
          data: { teamCount: teamsData?.length || 0, teams: teamsData },
        });
      }
    } catch (error) {
      results.push({
        testName: "Teams Table Check",
        status: "FAIL",
        message: "Exception accessing teams table",
        error: error,
      });
      overallStatus = "FAIL";
    }

    // Test 5: Check if user owns any teams
    console.log("\n=== TEST 5: User's Owned Teams ===");
    try {
      const { data: ownedTeams, error: ownedError } = await supabase
        .from("teams")
        .select("id, name, created_at")
        .eq("owner_id", user.id);

      if (ownedError) {
        results.push({
          testName: "User's Owned Teams",
          status: "FAIL",
          message: "Failed to query user's owned teams",
          error: ownedError,
          sqlQuery:
            "SELECT id, name, created_at FROM teams WHERE owner_id = $1",
          parameters: [user.id],
        });
      } else {
        results.push({
          testName: "User's Owned Teams",
          status: ownedTeams?.length > 0 ? "SUCCESS" : "WARNING",
          message: `User owns ${ownedTeams?.length || 0} team(s)`,
          data: {
            ownedTeamCount: ownedTeams?.length || 0,
            ownedTeams: ownedTeams,
          },
        });
      }
    } catch (error) {
      results.push({
        testName: "User's Owned Teams",
        status: "FAIL",
        message: "Exception during owned teams query",
        error: error,
      });
    }

    // Test 6: Test Team Creation (if user has no teams)
    const userHasTeams =
      results.find(r => r.testName === "User's Team Membership")?.data
        ?.teamCount > 0;

    if (!userHasTeams) {
      console.log("\n=== TEST 6: Test Team Creation ===");
      try {
        const testTeamName = `Test Team ${Date.now()}`;
        const testTeamData = {
          name: testTeamName,
          description: "Diagnostic test team",
          owner_id: user.id,
          settings: { created_by_diagnostic: true },
        };

        console.log("🔧 Creating test team:", testTeamData);
        const { data: newTeam, error: createError } = await supabase
          .from("teams")
          .insert(testTeamData)
          .select()
          .single();

        if (createError) {
          results.push({
            testName: "Test Team Creation",
            status: "FAIL",
            message: "Failed to create test team",
            error: createError,
            sqlQuery:
              "INSERT INTO teams (name, description, owner_id, settings) VALUES (...)",
            parameters: [testTeamData],
          });
          overallStatus = "FAIL";
        } else {
          // Now test team membership creation
          const membershipData = {
            team_id: newTeam.id,
            user_id: user.id,
            role: "owner",
          };

          console.log("🔧 Creating team membership:", membershipData);
          const { data: membership, error: membershipError } = await supabase
            .from("team_members")
            .insert(membershipData)
            .select()
            .single();

          if (membershipError) {
            results.push({
              testName: "Test Team Creation",
              status: "FAIL",
              message: "Team created but failed to create membership",
              error: membershipError,
              data: { teamId: newTeam.id, teamName: testTeamName },
              sqlQuery:
                "INSERT INTO team_members (team_id, user_id, role) VALUES (...)",
              parameters: [membershipData],
            });
            overallStatus = "FAIL";
          } else {
            results.push({
              testName: "Test Team Creation",
              status: "SUCCESS",
              message: "Successfully created test team and membership",
              data: {
                team: newTeam,
                membership: membership,
                note: "This was a diagnostic test - you may want to delete this team",
              },
            });
          }
        }
      } catch (error) {
        results.push({
          testName: "Test Team Creation",
          status: "FAIL",
          message: "Exception during test team creation",
          error: error,
        });
        overallStatus = "FAIL";
      }
    }

    // Test 7: Projects Table Access
    console.log("\n=== TEST 7: Projects Table Access ===");
    try {
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("id, name, team_id, created_at")
        .limit(5);

      if (projectsError) {
        results.push({
          testName: "Projects Table Access",
          status: "FAIL",
          message: "Cannot access projects table",
          error: projectsError,
          sqlQuery:
            "SELECT id, name, team_id, created_at FROM projects LIMIT 5",
        });
      } else {
        results.push({
          testName: "Projects Table Access",
          status: "SUCCESS",
          message: `Found ${projectsData?.length || 0} projects in database`,
          data: {
            projectCount: projectsData?.length || 0,
            projects: projectsData,
          },
        });
      }
    } catch (error) {
      results.push({
        testName: "Projects Table Access",
        status: "FAIL",
        message: "Exception accessing projects table",
        error: error,
      });
    }

    // Summary
    const failedTests = results.filter(r => r.status === "FAIL").length;
    const warningTests = results.filter(r => r.status === "WARNING").length;
    const successTests = results.filter(r => r.status === "SUCCESS").length;

    console.log("\n=== DIAGNOSTIC SUMMARY ===");
    console.log(`✅ Successful tests: ${successTests}`);
    console.log(`⚠️  Warning tests: ${warningTests}`);
    console.log(`❌ Failed tests: ${failedTests}`);
    console.log(`🔍 Overall Status: ${overallStatus}`);

    // Generate recommendations
    const recommendations = [];

    if (
      results.find(
        r => r.testName === "User's Team Membership" && r.status === "WARNING"
      )
    ) {
      recommendations.push({
        issue: "User has no team memberships",
        solution: "Run /api/fix-team-assignments to create a default team",
        priority: "HIGH",
      });
    }

    if (
      results.find(
        r => r.testName === "Test Team Creation" && r.status === "SUCCESS"
      )
    ) {
      recommendations.push({
        issue: "Test team was created during diagnostic",
        solution: "Consider deleting the diagnostic test team if not needed",
        priority: "LOW",
      });
    }

    return new Response(
      JSON.stringify({
        success: overallStatus !== "FAIL",
        overallStatus,
        summary: {
          totalTests: results.length,
          successful: successTests,
          warnings: warningTests,
          failed: failedTests,
        },
        results,
        recommendations,
        userId: user.id,
        timestamp: new Date().toISOString(),
      }),
      {
        status: overallStatus === "FAIL" ? 500 : 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
);
