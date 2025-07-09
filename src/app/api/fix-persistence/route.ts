/**
 * Database Persistence Fix API
 * Automatically fixes database persistence issues
 */

import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withSimpleAuth, SimpleUser } from "@/lib/auth/simple-api-auth";

console.log("🔧 Initializing Database Persistence Fix Tool...");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface FixResult {
  stepName: string;
  status: "SUCCESS" | "FAIL" | "SKIPPED";
  message: string;
  data?: any;
  error?: any;
  sqlQuery?: string;
  parameters?: any[];
}

export const POST = withSimpleAuth(
  async (request: NextRequest, user: SimpleUser) => {
    console.log("🔧 Database Persistence Fix Started");
    console.log("👤 User:", { id: user.id, email: user.email });

    const results: FixResult[] = [];
    let overallSuccess = true;

    // Parse request body for options
    let fixOptions = { force: false };
    try {
      const body = await request.json();
      fixOptions = { ...fixOptions, ...body };
    } catch {
      // Use defaults if no body
    }

    console.log("🔧 Fix options:", fixOptions);

    // Step 1: Check if user already has teams
    console.log("\n=== STEP 1: Check Current Team Status ===");
    try {
      const { data: currentTeams, error: teamsError } = await supabase
        .from("team_members")
        .select("team_id, role")
        .eq("user_id", user.id);

      if (teamsError) {
        results.push({
          stepName: "Check Current Team Status",
          status: "FAIL",
          message: "Failed to check current team memberships",
          error: teamsError,
          sqlQuery: "SELECT team_id, role FROM team_members WHERE user_id = $1",
          parameters: [user.id],
        });
        overallSuccess = false;
      } else if (currentTeams && currentTeams.length > 0 && !fixOptions.force) {
        results.push({
          stepName: "Check Current Team Status",
          status: "SKIPPED",
          message: `User already has ${currentTeams.length} team memberships. Use force=true to recreate.`,
          data: { existingTeams: currentTeams.length, teams: currentTeams },
        });

        // Early return - user already has teams
        return new Response(
          JSON.stringify({
            success: true,
            message: "User already has team memberships",
            results,
            userId: user.id,
            timestamp: new Date().toISOString(),
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      } else {
        results.push({
          stepName: "Check Current Team Status",
          status: "SUCCESS",
          message: `User has ${currentTeams?.length || 0} team memberships. Proceeding with fix.`,
          data: { existingTeams: currentTeams?.length || 0 },
        });
      }
    } catch (error) {
      results.push({
        stepName: "Check Current Team Status",
        status: "FAIL",
        message: "Exception during team status check",
        error: error,
      });
      overallSuccess = false;
    }

    // Step 2: Create Default Team
    console.log("\n=== STEP 2: Create Default Team ===");
    let defaultTeam = null;

    try {
      // First check if user already owns a team
      const { data: ownedTeams, error: ownedError } = await supabase
        .from("teams")
        .select("id, name")
        .eq("owner_id", user.id);

      if (ownedError) {
        results.push({
          stepName: "Create Default Team",
          status: "FAIL",
          message: "Failed to check for existing owned teams",
          error: ownedError,
        });
        overallSuccess = false;
      } else if (ownedTeams && ownedTeams.length > 0 && !fixOptions.force) {
        defaultTeam = ownedTeams[0];
        results.push({
          stepName: "Create Default Team",
          status: "SKIPPED",
          message: `User already owns team: ${defaultTeam?.name}`,
          data: { teamId: defaultTeam?.id, teamName: defaultTeam?.name },
        });
      } else {
        // Create new default team
        const teamData = {
          name: `${user.email?.split("@")[0] || "User"}'s Team`,
          description: "Default team created automatically",
          owner_id: user.id,
          settings: {
            created_by_fix: true,
            created_at: new Date().toISOString(),
          },
        };

        console.log("🔧 Creating default team:", teamData);
        const { data: newTeam, error: createError } = await supabase
          .from("teams")
          .insert(teamData)
          .select()
          .single();

        if (createError) {
          results.push({
            stepName: "Create Default Team",
            status: "FAIL",
            message: "Failed to create default team",
            error: createError,
            sqlQuery:
              "INSERT INTO teams (name, description, owner_id, settings) VALUES (...)",
            parameters: [teamData],
          });
          overallSuccess = false;
        } else {
          defaultTeam = newTeam;
          results.push({
            stepName: "Create Default Team",
            status: "SUCCESS",
            message: `Created default team: ${newTeam.name}`,
            data: { teamId: newTeam.id, teamName: newTeam.name },
          });
        }
      }
    } catch (error) {
      results.push({
        stepName: "Create Default Team",
        status: "FAIL",
        message: "Exception during team creation",
        error: error,
      });
      overallSuccess = false;
    }

    // Step 3: Create Team Membership
    console.log("\n=== STEP 3: Create Team Membership ===");
    if (defaultTeam) {
      try {
        // Check if membership already exists
        const { data: existingMembership, error: membershipCheckError } =
          await supabase
            .from("team_members")
            .select("id, role")
            .eq("team_id", defaultTeam.id)
            .eq("user_id", user.id)
            .single();

        if (membershipCheckError && membershipCheckError.code !== "PGRST116") {
          // PGRST116 means no rows returned, which is expected if no membership exists
          results.push({
            stepName: "Create Team Membership",
            status: "FAIL",
            message: "Failed to check existing membership",
            error: membershipCheckError,
          });
          overallSuccess = false;
        } else if (existingMembership && !fixOptions.force) {
          results.push({
            stepName: "Create Team Membership",
            status: "SKIPPED",
            message: `Membership already exists with role: ${existingMembership.role}`,
            data: {
              membershipId: existingMembership.id,
              role: existingMembership.role,
            },
          });
        } else {
          // Create new membership
          const membershipData = {
            team_id: defaultTeam.id,
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
              stepName: "Create Team Membership",
              status: "FAIL",
              message: "Failed to create team membership",
              error: membershipError,
              sqlQuery:
                "INSERT INTO team_members (team_id, user_id, role) VALUES (...)",
              parameters: [membershipData],
            });
            overallSuccess = false;
          } else {
            results.push({
              stepName: "Create Team Membership",
              status: "SUCCESS",
              message: "Successfully created team membership",
              data: {
                membershipId: membership.id,
                teamId: defaultTeam.id,
                role: membership.role,
              },
            });
          }
        }
      } catch (error) {
        results.push({
          stepName: "Create Team Membership",
          status: "FAIL",
          message: "Exception during membership creation",
          error: error,
        });
        overallSuccess = false;
      }
    } else {
      results.push({
        stepName: "Create Team Membership",
        status: "SKIPPED",
        message: "No team available for membership creation",
      });
    }

    // Step 4: Verify Fix
    console.log("\n=== STEP 4: Verify Fix ===");
    try {
      const { data: verificationTeams, error: verifyError } = await supabase
        .from("team_members")
        .select(
          `
          team_id,
          role,
          teams (
            id,
            name,
            description
          )
        `
        )
        .eq("user_id", user.id);

      if (verifyError) {
        results.push({
          stepName: "Verify Fix",
          status: "FAIL",
          message: "Failed to verify fix",
          error: verifyError,
        });
        overallSuccess = false;
      } else if (!verificationTeams || verificationTeams.length === 0) {
        results.push({
          stepName: "Verify Fix",
          status: "FAIL",
          message:
            "Fix verification failed - user still has no team memberships",
          data: { teamCount: 0 },
        });
        overallSuccess = false;
      } else {
        results.push({
          stepName: "Verify Fix",
          status: "SUCCESS",
          message: `Fix verified - user now has ${verificationTeams.length} team membership(s)`,
          data: {
            teamCount: verificationTeams.length,
            teams: verificationTeams,
          },
        });
      }
    } catch (error) {
      results.push({
        stepName: "Verify Fix",
        status: "FAIL",
        message: "Exception during fix verification",
        error: error,
      });
      overallSuccess = false;
    }

    // Summary
    const failedSteps = results.filter(r => r.status === "FAIL").length;
    const skippedSteps = results.filter(r => r.status === "SKIPPED").length;
    const successSteps = results.filter(r => r.status === "SUCCESS").length;

    console.log("\n=== FIX SUMMARY ===");
    console.log(`✅ Successful steps: ${successSteps}`);
    console.log(`⏭️  Skipped steps: ${skippedSteps}`);
    console.log(`❌ Failed steps: ${failedSteps}`);
    console.log(`🔧 Overall Success: ${overallSuccess}`);

    return new Response(
      JSON.stringify({
        success: overallSuccess,
        message: overallSuccess
          ? "Database persistence issue has been fixed"
          : "Some steps failed during fix process",
        summary: {
          totalSteps: results.length,
          successful: successSteps,
          skipped: skippedSteps,
          failed: failedSteps,
        },
        results,
        userId: user.id,
        timestamp: new Date().toISOString(),
      }),
      {
        status: overallSuccess ? 200 : 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
);
