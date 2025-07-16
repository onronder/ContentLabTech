/**
 * Team Diagnostics Debug Endpoint
 * Production debugging for team management issues
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient as createServerAuthClient } from "@/lib/supabase/server-auth";

export async function GET(request: NextRequest) {
  const diagnosticId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  console.log(`🔍 [${diagnosticId}] TEAM DIAGNOSTICS - START`, {
    timestamp,
    method: request.method,
    url: request.url,
    nodeEnv: process.env.NODE_ENV,
  });

  const diagnostics: any = {
    id: diagnosticId,
    timestamp,
    environment: {
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      isProduction: process.env.NODE_ENV === "production",
    },
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasSecretKey: !!process.env.SUPABASE_SECRET_KEY,
    },
    cookies: {},
    authentication: {},
    database: {},
    teamQuery: {},
    errors: [],
  };

  try {
    // 1. Check cookies
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const supabaseCookies = allCookies.filter(
      c =>
        c.name.includes("sb-") ||
        c.name.includes("supabase") ||
        c.name.includes("auth-token")
    );

    diagnostics.cookies = {
      totalCookies: allCookies.length,
      supabaseCookies: supabaseCookies.length,
      cookieNames: allCookies.map(c => c.name),
      supabaseDetails: supabaseCookies.map(c => ({
        name: c.name,
        hasValue: !!c.value,
        valueLength: c.value.length,
      })),
    };

    // 2. Test authentication
    try {
      const supabase = await createServerAuthClient();
      diagnostics.supabase.clientCreated = true;

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      diagnostics.authentication = {
        isAuthenticated: !!user,
        authError: authError
          ? {
              message: authError.message,
              status: authError.status,
              code: authError.code,
            }
          : null,
        user: user
          ? {
              id: user.id,
              email: user.email,
              role: user.role,
              emailConfirmed: !!user.email_confirmed_at,
              lastSignIn: user.last_sign_in_at,
            }
          : null,
      };

      if (!user) {
        diagnostics.errors.push("No authenticated user found");
        return NextResponse.json(diagnostics, { status: 401 });
      }

      // 3. Test database connection
      try {
        const { data: testQuery, error: testError } = await supabase
          .from("teams")
          .select("count")
          .limit(1);

        diagnostics.database = {
          connected: !testError,
          error: testError
            ? {
                message: testError.message,
                code: testError.code,
                details: testError.details,
                hint: testError.hint,
              }
            : null,
          testQueryResult: testQuery,
        };
      } catch (dbError) {
        diagnostics.database.error = {
          message: dbError instanceof Error ? dbError.message : String(dbError),
          type: "exception",
        };
      }

      // 4. Test team member queries
      try {
        // Get user's teams
        const { data: userTeams, error: teamsError } = await supabase
          .from("team_members")
          .select("team_id, role")
          .eq("user_id", user.id);

        diagnostics.teamQuery.userTeams = {
          success: !teamsError,
          teamsCount: userTeams?.length || 0,
          teams: userTeams || [],
          error: teamsError
            ? {
                message: teamsError.message,
                code: teamsError.code,
                details: teamsError.details,
              }
            : null,
        };

        if (userTeams && userTeams.length > 0) {
          const firstTeamId = userTeams[0]?.team_id;

          // Test team members query (without auth.users join)
          const { data: teamMembers, error: membersError } = await supabase
            .from("team_members")
            .select("id, user_id, role, created_at")
            .eq("team_id", firstTeamId)
            .limit(5);

          diagnostics.teamQuery.teamMembers = {
            success: !membersError,
            membersCount: teamMembers?.length || 0,
            error: membersError
              ? {
                  message: membersError.message,
                  code: membersError.code,
                  details: membersError.details,
                }
              : null,
          };

          // Test if we can access user profiles
          if (teamMembers && teamMembers.length > 0) {
            const userIds = teamMembers.map(m => m.user_id);

            // Try using auth.admin.listUsers if available
            try {
              const {
                data: { users },
                error: usersError,
              } = await supabase.auth.admin.listUsers({
                page: 1,
                perPage: 100,
              });

              diagnostics.teamQuery.userProfiles = {
                method: "auth.admin.listUsers",
                success: !usersError,
                totalUsers: users?.length || 0,
                matchedUsers:
                  users?.filter(u => userIds.includes(u.id)).length || 0,
                error: usersError
                  ? {
                      message: usersError.message,
                      status: usersError.status,
                    }
                  : null,
              };
            } catch (adminError) {
              diagnostics.teamQuery.userProfiles = {
                method: "auth.admin.listUsers",
                success: false,
                error: {
                  message:
                    adminError instanceof Error
                      ? adminError.message
                      : String(adminError),
                  type: "exception",
                  hint: "This might require service role key",
                },
              };
            }

            // Try direct profiles table query as fallback
            try {
              const { data: profiles, error: profilesError } = await supabase
                .from("profiles")
                .select("id, email, full_name, avatar_url")
                .in("id", userIds);

              diagnostics.teamQuery.profilesTable = {
                exists: !profilesError || profilesError.code !== "42P01",
                success: !profilesError,
                profilesCount: profiles?.length || 0,
                error: profilesError
                  ? {
                      message: profilesError.message,
                      code: profilesError.code,
                      hint: profilesError.hint,
                    }
                  : null,
              };
            } catch (profileError) {
              diagnostics.teamQuery.profilesTable = {
                exists: false,
                error: {
                  message:
                    profileError instanceof Error
                      ? profileError.message
                      : String(profileError),
                  type: "exception",
                },
              };
            }
          }
        }
      } catch (teamError) {
        diagnostics.teamQuery.error = {
          message:
            teamError instanceof Error ? teamError.message : String(teamError),
          type: "exception",
        };
      }

      // 5. Check service role capabilities
      if (
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_SECRET_KEY
      ) {
        diagnostics.serviceRole = {
          available: true,
          keyType: process.env.SUPABASE_SERVICE_ROLE_KEY
            ? "SERVICE_ROLE_KEY"
            : "SECRET_KEY",
        };
      } else {
        diagnostics.serviceRole = {
          available: false,
          message:
            "No service role key found - limited to anon key permissions",
        };
      }
    } catch (error) {
      diagnostics.errors.push({
        stage: "authentication",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  } catch (error) {
    diagnostics.errors.push({
      stage: "initialization",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }

  const status = diagnostics.errors.length > 0 ? 500 : 200;

  console.log(`🔍 [${diagnosticId}] TEAM DIAGNOSTICS - COMPLETE`, {
    status,
    errorsCount: diagnostics.errors.length,
    authenticated: diagnostics.authentication?.isAuthenticated,
    databaseConnected: diagnostics.database?.connected,
  });

  return NextResponse.json(diagnostics, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
