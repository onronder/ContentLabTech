/**
 * Database Health Check Endpoint
 * Comprehensive database verification for production readiness
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

interface DatabaseHealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  database: {
    connection: DatabaseCheck;
    tables: DatabaseCheck;
    policies: DatabaseCheck;
    indexes: DatabaseCheck;
    migrations: DatabaseCheck;
    performance: DatabaseCheck;
  };
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
  details?: Record<string, any>;
}

interface DatabaseCheck {
  status: "healthy" | "degraded" | "unhealthy";
  message: string;
  responseTime?: number;
  details?: Record<string, any>;
}

// Required tables for the application
const REQUIRED_TABLES = [
  "teams",
  "team_members",
  "team_invitations",
  "user_preferences",
  "notification_preferences",
  "user_sessions",
  "login_history",
  "projects",
  "content_items",
  "analytics_events",
];

// Critical RLS policies that must exist
const REQUIRED_POLICIES = [
  "teams_policy",
  "team_members_policy",
  "user_preferences_policy",
  "projects_policy",
];

export async function GET(request: NextRequest) {
  const checkStartTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const check = searchParams.get("check");
    const format = searchParams.get("format") || "json";

    // If specific check requested, run only that check
    if (check) {
      let result: DatabaseCheck;

      switch (check.toLowerCase()) {
        case "connection":
          result = await checkDatabaseConnection();
          break;
        case "tables":
          result = await checkRequiredTables();
          break;
        case "policies":
          result = await checkRLSPolicies();
          break;
        case "indexes":
          result = await checkIndexes();
          break;
        case "migrations":
          result = await checkMigrations();
          break;
        case "performance":
          result = await checkDatabasePerformance();
          break;
        default:
          return NextResponse.json(
            {
              error:
                "Invalid check type. Valid options: connection, tables, policies, indexes, migrations, performance",
            },
            { status: 400 }
          );
      }

      const status =
        result.status === "healthy"
          ? 200
          : result.status === "degraded"
            ? 200
            : 503;

      if (format === "plain") {
        return new NextResponse(result.status.toUpperCase(), {
          status,
          headers: {
            "Content-Type": "text/plain",
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        });
      }

      return NextResponse.json(result, { status });
    }

    // Run all database checks
    const [
      connectionCheck,
      tablesCheck,
      policiesCheck,
      indexesCheck,
      migrationsCheck,
      performanceCheck,
    ] = await Promise.allSettled([
      checkDatabaseConnection(),
      checkRequiredTables(),
      checkRLSPolicies(),
      checkIndexes(),
      checkMigrations(),
      checkDatabasePerformance(),
    ]);

    const checks = {
      connection: getCheckResult(connectionCheck),
      tables: getCheckResult(tablesCheck),
      policies: getCheckResult(policiesCheck),
      indexes: getCheckResult(indexesCheck),
      migrations: getCheckResult(migrationsCheck),
      performance: getCheckResult(performanceCheck),
    };

    // Calculate overall status
    const checkValues = Object.values(checks);
    const unhealthyCount = checkValues.filter(
      c => c.status === "unhealthy"
    ).length;
    const degradedCount = checkValues.filter(
      c => c.status === "degraded"
    ).length;
    const healthyCount = checkValues.filter(c => c.status === "healthy").length;

    let overallStatus: "healthy" | "degraded" | "unhealthy";
    if (unhealthyCount > 0) {
      overallStatus = "unhealthy";
    } else if (degradedCount > 0) {
      overallStatus = "degraded";
    } else {
      overallStatus = "healthy";
    }

    const result: DatabaseHealthCheck = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      database: checks,
      summary: {
        total: checkValues.length,
        healthy: healthyCount,
        degraded: degradedCount,
        unhealthy: unhealthyCount,
      },
    };

    // Set appropriate HTTP status code
    const statusCode =
      overallStatus === "healthy"
        ? 200
        : overallStatus === "degraded"
          ? 200
          : 503;

    if (format === "plain") {
      return new NextResponse(overallStatus.toUpperCase(), {
        status: statusCode,
        headers: {
          "Content-Type": "text/plain",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    return NextResponse.json(result, {
      status: statusCode,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Database-Check-Duration": `${Date.now() - checkStartTime}ms`,
      },
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: {},
        summary: { total: 0, healthy: 0, degraded: 0, unhealthy: 1 },
        error: error instanceof Error ? error.message : "Unknown error",
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

async function checkDatabaseConnection(): Promise<DatabaseCheck> {
  const startTime = Date.now();

  try {
    // Test basic connectivity with a simple query
    const { data, error } = await supabase
      .from("teams")
      .select("count")
      .limit(1);

    const responseTime = Date.now() - startTime;

    if (error) {
      return {
        status: "unhealthy",
        message: `Database connection failed: ${error.message}`,
        responseTime,
        details: { error: error.message },
      };
    }

    // Check response time thresholds
    if (responseTime > 5000) {
      return {
        status: "degraded",
        message: "Database response time is slow",
        responseTime,
        details: { threshold: "5000ms", actual: `${responseTime}ms` },
      };
    }

    if (responseTime > 2000) {
      return {
        status: "degraded",
        message: "Database response time is elevated",
        responseTime,
        details: { threshold: "2000ms", actual: `${responseTime}ms` },
      };
    }

    return {
      status: "healthy",
      message: "Database connection verified",
      responseTime,
      details: { responseTime: `${responseTime}ms` },
    };
  } catch (error) {
    return {
      status: "unhealthy",
      message: `Database connection check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      responseTime: Date.now() - startTime,
    };
  }
}

async function checkRequiredTables(): Promise<DatabaseCheck> {
  const startTime = Date.now();

  try {
    // Direct table existence check
    const queries = REQUIRED_TABLES.map(async tableName => {
      try {
        const { error } = await supabase.from(tableName).select("*").limit(0);
        return { table: tableName, exists: !error };
      } catch {
        return { table: tableName, exists: false };
      }
    });

    const tables = await Promise.all(queries);

    const responseTime = Date.now() - startTime;
    const missingTables = tables.filter(t => !t.exists);
    const existingTables = tables.filter(t => t.exists);

    if (missingTables.length > 0) {
      return {
        status: "unhealthy",
        message: `Missing required tables: ${missingTables.map(t => t.table).join(", ")}`,
        responseTime,
        details: {
          missing: missingTables.map(t => t.table),
          existing: existingTables.map(t => t.table),
          total: REQUIRED_TABLES.length,
        },
      };
    }

    return {
      status: "healthy",
      message: "All required tables exist",
      responseTime,
      details: {
        tables: existingTables.map(t => t.table),
        count: existingTables.length,
      },
    };
  } catch (error) {
    return {
      status: "unhealthy",
      message: `Table verification failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      responseTime: Date.now() - startTime,
    };
  }
}

async function checkRLSPolicies(): Promise<DatabaseCheck> {
  const startTime = Date.now();

  try {
    // Test RLS by trying to access data without proper auth context
    // This is a basic check - in production you'd want more comprehensive policy testing
    const testQueries = [
      { table: "teams", operation: "select" },
      { table: "user_preferences", operation: "select" },
      { table: "projects", operation: "select" },
    ];

    const results = await Promise.allSettled(
      testQueries.map(async ({ table }) => {
        const { error } = await supabase.from(table).select("*").limit(1);

        return { table, hasRLS: !!error && error.message.includes("policy") };
      })
    );

    const responseTime = Date.now() - startTime;
    const policyResults = results
      .filter(r => r.status === "fulfilled")
      .map(r => (r as PromiseFulfilledResult<any>).value);

    const tablesWithoutRLS = policyResults.filter(r => !r.hasRLS);

    if (tablesWithoutRLS.length > 0) {
      return {
        status: "degraded",
        message: `Some tables may be missing RLS policies: ${tablesWithoutRLS.map(t => t.table).join(", ")}`,
        responseTime,
        details: {
          withoutRLS: tablesWithoutRLS.map(t => t.table),
          withRLS: policyResults.filter(r => r.hasRLS).map(t => t.table),
        },
      };
    }

    return {
      status: "healthy",
      message: "RLS policies appear to be active",
      responseTime,
      details: {
        testedTables: testQueries.map(q => q.table),
      },
    };
  } catch (error) {
    return {
      status: "unhealthy",
      message: `RLS policy check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      responseTime: Date.now() - startTime,
    };
  }
}

async function checkIndexes(): Promise<DatabaseCheck> {
  const startTime = Date.now();

  try {
    // Basic index check - in production you'd query pg_indexes
    // For now, we'll do a performance-based check
    const performanceTests = [
      {
        table: "teams",
        query: () => supabase.from("teams").select("id").limit(10),
      },
      {
        table: "projects",
        query: () => supabase.from("projects").select("id").limit(10),
      },
    ];

    const results = await Promise.allSettled(
      performanceTests.map(async ({ table, query }) => {
        const testStart = Date.now();
        const { error } = await query();
        const queryTime = Date.now() - testStart;

        return { table, queryTime, success: !error };
      })
    );

    const responseTime = Date.now() - startTime;
    const queryResults = results
      .filter(r => r.status === "fulfilled")
      .map(r => (r as PromiseFulfilledResult<any>).value);

    const slowQueries = queryResults.filter(r => r.queryTime > 1000);
    const failedQueries = queryResults.filter(r => !r.success);

    if (failedQueries.length > 0) {
      return {
        status: "unhealthy",
        message: `Query performance test failed for: ${failedQueries.map(q => q.table).join(", ")}`,
        responseTime,
        details: { failedQueries: failedQueries.map(q => q.table) },
      };
    }

    if (slowQueries.length > 0) {
      return {
        status: "degraded",
        message: `Slow query performance detected: ${slowQueries.map(q => q.table).join(", ")}`,
        responseTime,
        details: {
          slowQueries: slowQueries.map(q => ({
            table: q.table,
            time: `${q.queryTime}ms`,
          })),
        },
      };
    }

    return {
      status: "healthy",
      message: "Database query performance is good",
      responseTime,
      details: {
        testedTables: queryResults.map(q => q.table),
        avgQueryTime: Math.round(
          queryResults.reduce((sum, q) => sum + q.queryTime, 0) /
            queryResults.length
        ),
      },
    };
  } catch (error) {
    return {
      status: "unhealthy",
      message: `Index/performance check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      responseTime: Date.now() - startTime,
    };
  }
}

async function checkMigrations(): Promise<DatabaseCheck> {
  const startTime = Date.now();

  try {
    // Try to check migration status - this depends on Supabase migration tracking
    // In production, you might query supabase_migrations.schema_migrations
    const { data, error } = await supabase
      .from("supabase_migrations.schema_migrations")
      .select("version, executed_at")
      .order("executed_at", { ascending: false })
      .limit(10)
      .then(
        result => result,
        // Fallback if migrations table not accessible
        () => ({ data: [], error: null })
      );

    const responseTime = Date.now() - startTime;

    if (error) {
      return {
        status: "degraded",
        message: "Cannot verify migration status",
        responseTime,
        details: { error: error.message },
      };
    }

    if (!data || data.length === 0) {
      return {
        status: "degraded",
        message: "No migration history found",
        responseTime,
        details: { note: "Migration tracking may not be enabled" },
      };
    }

    return {
      status: "healthy",
      message: `Found ${data.length} migration records`,
      responseTime,
      details: {
        latestMigrations: data.slice(0, 5).map(m => ({
          version: m.version,
          executed: m.executed_at,
        })),
      },
    };
  } catch (error) {
    return {
      status: "degraded",
      message: `Migration check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      responseTime: Date.now() - startTime,
      details: { note: "Migration verification not available" },
    };
  }
}

async function checkDatabasePerformance(): Promise<DatabaseCheck> {
  const startTime = Date.now();

  try {
    // Run a series of performance tests
    const tests = [
      {
        name: "Simple Select",
        query: () => supabase.from("teams").select("id").limit(1),
        threshold: 500,
      },
      {
        name: "Count Query",
        query: () =>
          supabase.from("teams").select("*", { count: "exact", head: true }),
        threshold: 1000,
      },
      {
        name: "Join Query",
        query: () =>
          supabase.from("teams").select("id, team_members(user_id)").limit(5),
        threshold: 1500,
      },
    ];

    const results = await Promise.allSettled(
      tests.map(async test => {
        const testStart = Date.now();
        const { error } = await test.query();
        const queryTime = Date.now() - testStart;

        return {
          name: test.name,
          queryTime,
          success: !error,
          withinThreshold: queryTime <= test.threshold,
          threshold: test.threshold,
        };
      })
    );

    const responseTime = Date.now() - startTime;
    const testResults = results
      .filter(r => r.status === "fulfilled")
      .map(r => (r as PromiseFulfilledResult<any>).value);

    const failedTests = testResults.filter(t => !t.success);
    const slowTests = testResults.filter(t => t.success && !t.withinThreshold);

    if (failedTests.length > 0) {
      return {
        status: "unhealthy",
        message: `Performance tests failed: ${failedTests.map(t => t.name).join(", ")}`,
        responseTime,
        details: { failedTests: failedTests.map(t => t.name) },
      };
    }

    if (slowTests.length > 0) {
      return {
        status: "degraded",
        message: `Performance tests slower than expected: ${slowTests.map(t => t.name).join(", ")}`,
        responseTime,
        details: {
          slowTests: slowTests.map(t => ({
            name: t.name,
            time: `${t.queryTime}ms`,
            threshold: `${t.threshold}ms`,
          })),
        },
      };
    }

    const avgQueryTime = Math.round(
      testResults.reduce((sum, t) => sum + t.queryTime, 0) / testResults.length
    );

    return {
      status: "healthy",
      message: "All performance tests passed",
      responseTime,
      details: {
        tests: testResults.map(t => ({
          name: t.name,
          time: `${t.queryTime}ms`,
          threshold: `${t.threshold}ms`,
        })),
        averageQueryTime: `${avgQueryTime}ms`,
      },
    };
  } catch (error) {
    return {
      status: "unhealthy",
      message: `Performance check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      responseTime: Date.now() - startTime,
    };
  }
}

function getCheckResult(
  settledResult: PromiseSettledResult<DatabaseCheck>
): DatabaseCheck {
  if (settledResult.status === "fulfilled") {
    return settledResult.value;
  } else {
    return {
      status: "unhealthy",
      message: `Check failed: ${settledResult.reason}`,
    };
  }
}
