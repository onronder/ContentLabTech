#!/usr/bin/env node

/**
 * Production Database Verification Script
 * Runs comprehensive database checks to ensure production readiness
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials");
  console.error(
    "Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

// Create Supabase client with service key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

async function main() {
  console.log("\n🔍 PRODUCTION DATABASE VERIFICATION");
  console.log("=====================================\n");

  const results = {
    connection: null,
    tables: null,
    policies: null,
    migrations: null,
    performance: null,
    overall: "unknown",
  };

  try {
    // 1. Test database connection
    console.log("1. Testing database connection...");
    results.connection = await testConnection();
    logResult("Connection", results.connection);

    // 2. Verify required tables exist
    console.log("\n2. Verifying required tables...");
    results.tables = await verifyTables();
    logResult("Tables", results.tables);

    // 3. Check RLS policies
    console.log("\n3. Checking RLS policies...");
    results.policies = await checkRLSPolicies();
    logResult("RLS Policies", results.policies);

    // 4. Verify migrations
    console.log("\n4. Verifying migrations...");
    results.migrations = await verifyMigrations();
    logResult("Migrations", results.migrations);

    // 5. Performance check
    console.log("\n5. Running performance tests...");
    results.performance = await runPerformanceTests();
    logResult("Performance", results.performance);

    // Calculate overall status
    const statuses = Object.values(results).filter(r => r && r.status);
    const unhealthy = statuses.filter(s => s.status === "unhealthy").length;
    const degraded = statuses.filter(s => s.status === "degraded").length;

    if (unhealthy > 0) {
      results.overall = "unhealthy";
    } else if (degraded > 0) {
      results.overall = "degraded";
    } else {
      results.overall = "healthy";
    }

    // Final summary
    console.log("\n" + "=".repeat(50));
    console.log("📊 VERIFICATION SUMMARY");
    console.log("=".repeat(50));

    const statusEmoji = {
      healthy: "✅",
      degraded: "⚠️",
      unhealthy: "❌",
    };

    console.log(
      `\nOverall Status: ${statusEmoji[results.overall]} ${results.overall.toUpperCase()}`
    );
    console.log(`\nDetailed Results:`);
    console.log(
      `  Connection: ${statusEmoji[results.connection?.status]} ${results.connection?.status || "unknown"}`
    );
    console.log(
      `  Tables: ${statusEmoji[results.tables?.status]} ${results.tables?.status || "unknown"}`
    );
    console.log(
      `  RLS Policies: ${statusEmoji[results.policies?.status]} ${results.policies?.status || "unknown"}`
    );
    console.log(
      `  Migrations: ${statusEmoji[results.migrations?.status]} ${results.migrations?.status || "unknown"}`
    );
    console.log(
      `  Performance: ${statusEmoji[results.performance?.status]} ${results.performance?.status || "unknown"}`
    );

    // Save results to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const resultsFile = path.join(
      __dirname,
      `db-verification-${timestamp}.json`
    );
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    console.log(`\n📄 Results saved to: ${resultsFile}`);

    // Exit with appropriate code
    if (results.overall === "unhealthy") {
      console.log(
        "\n❌ Database verification failed. Please address the issues above."
      );
      process.exit(1);
    } else if (results.overall === "degraded") {
      console.log(
        "\n⚠️ Database verification passed with warnings. Consider addressing the issues above."
      );
      process.exit(0);
    } else {
      console.log("\n✅ Database verification passed successfully!");
      process.exit(0);
    }
  } catch (error) {
    console.error("\n❌ Verification failed:", error.message);
    process.exit(1);
  }
}

async function testConnection() {
  const startTime = Date.now();

  try {
    const { data, error } = await supabase
      .from("teams")
      .select("count")
      .limit(1);

    const responseTime = Date.now() - startTime;

    if (error) {
      return {
        status: "unhealthy",
        message: `Connection failed: ${error.message}`,
        responseTime,
        details: { error: error.message },
      };
    }

    if (responseTime > 2000) {
      return {
        status: "degraded",
        message: "Connection is slow",
        responseTime,
        details: { threshold: "2000ms" },
      };
    }

    return {
      status: "healthy",
      message: "Connection successful",
      responseTime,
      details: { responseTime: `${responseTime}ms` },
    };
  } catch (error) {
    return {
      status: "unhealthy",
      message: `Connection test failed: ${error.message}`,
      responseTime: Date.now() - startTime,
    };
  }
}

async function verifyTables() {
  const startTime = Date.now();

  try {
    const tableChecks = await Promise.all(
      REQUIRED_TABLES.map(async tableName => {
        try {
          const { error } = await supabase.from(tableName).select("*").limit(0);
          return { table: tableName, exists: !error, error: error?.message };
        } catch (err) {
          return { table: tableName, exists: false, error: err.message };
        }
      })
    );

    const responseTime = Date.now() - startTime;
    const existing = tableChecks.filter(t => t.exists);
    const missing = tableChecks.filter(t => !t.exists);

    if (missing.length > 0) {
      return {
        status: "unhealthy",
        message: `Missing tables: ${missing.map(t => t.table).join(", ")}`,
        responseTime,
        details: {
          existing: existing.map(t => t.table),
          missing: missing.map(t => ({ table: t.table, error: t.error })),
        },
      };
    }

    return {
      status: "healthy",
      message: `All ${existing.length} required tables exist`,
      responseTime,
      details: { tables: existing.map(t => t.table) },
    };
  } catch (error) {
    return {
      status: "unhealthy",
      message: `Table verification failed: ${error.message}`,
      responseTime: Date.now() - startTime,
    };
  }
}

async function checkRLSPolicies() {
  const startTime = Date.now();

  try {
    // Test if RLS is enforced by trying to access without auth
    const testTables = ["teams", "user_preferences", "projects"];

    const policyTests = await Promise.all(
      testTables.map(async tableName => {
        try {
          const { error } = await supabase.from(tableName).select("*").limit(1);

          // If no error, RLS might not be enforced
          return {
            table: tableName,
            hasRLS:
              !!error &&
              (error.message.includes("policy") ||
                error.message.includes("RLS")),
            error: error?.message,
          };
        } catch (err) {
          return { table: tableName, hasRLS: true, error: err.message };
        }
      })
    );

    const responseTime = Date.now() - startTime;
    const withoutRLS = policyTests.filter(t => !t.hasRLS);
    const withRLS = policyTests.filter(t => t.hasRLS);

    if (withoutRLS.length > 0) {
      return {
        status: "degraded",
        message: `Tables may be missing RLS: ${withoutRLS.map(t => t.table).join(", ")}`,
        responseTime,
        details: {
          withRLS: withRLS.map(t => t.table),
          withoutRLS: withoutRLS.map(t => ({ table: t.table, error: t.error })),
        },
      };
    }

    return {
      status: "healthy",
      message: "RLS policies appear to be active",
      responseTime,
      details: { testedTables: testTables },
    };
  } catch (error) {
    return {
      status: "unhealthy",
      message: `RLS check failed: ${error.message}`,
      responseTime: Date.now() - startTime,
    };
  }
}

async function verifyMigrations() {
  const startTime = Date.now();

  try {
    // Check if migration files exist
    const migrationDir = path.join(__dirname, "../supabase/migrations");
    const migrationFiles = fs
      .readdirSync(migrationDir)
      .filter(file => file.endsWith(".sql"))
      .sort();

    if (migrationFiles.length === 0) {
      return {
        status: "degraded",
        message: "No migration files found",
        responseTime: Date.now() - startTime,
        details: { migrationDir },
      };
    }

    // Try to check migration status in database
    try {
      const { data, error } = await supabase
        .from("supabase_migrations.schema_migrations")
        .select("version, executed_at")
        .order("executed_at", { ascending: false });

      if (error) {
        return {
          status: "degraded",
          message: "Cannot verify applied migrations",
          responseTime: Date.now() - startTime,
          details: {
            migrationFiles: migrationFiles.length,
            error: error.message,
          },
        };
      }

      return {
        status: "healthy",
        message: `Found ${migrationFiles.length} migration files, ${data?.length || 0} applied`,
        responseTime: Date.now() - startTime,
        details: {
          migrationFiles: migrationFiles.length,
          appliedMigrations: data?.length || 0,
          latestMigrations: data?.slice(0, 3),
        },
      };
    } catch (err) {
      return {
        status: "degraded",
        message: "Migration status verification unavailable",
        responseTime: Date.now() - startTime,
        details: {
          migrationFiles: migrationFiles.length,
          error: err.message,
        },
      };
    }
  } catch (error) {
    return {
      status: "unhealthy",
      message: `Migration verification failed: ${error.message}`,
      responseTime: Date.now() - startTime,
    };
  }
}

async function runPerformanceTests() {
  const startTime = Date.now();

  try {
    const tests = [
      {
        name: "Simple Select",
        query: () => supabase.from("teams").select("id").limit(1),
        threshold: 1000,
      },
      {
        name: "Count Query",
        query: () =>
          supabase.from("teams").select("*", { count: "exact", head: true }),
        threshold: 2000,
      },
    ];

    const results = await Promise.all(
      tests.map(async test => {
        const testStart = Date.now();
        try {
          const { error } = await test.query();
          const queryTime = Date.now() - testStart;

          return {
            name: test.name,
            queryTime,
            success: !error,
            withinThreshold: queryTime <= test.threshold,
            threshold: test.threshold,
            error: error?.message,
          };
        } catch (err) {
          return {
            name: test.name,
            queryTime: Date.now() - testStart,
            success: false,
            withinThreshold: false,
            threshold: test.threshold,
            error: err.message,
          };
        }
      })
    );

    const responseTime = Date.now() - startTime;
    const failed = results.filter(r => !r.success);
    const slow = results.filter(r => r.success && !r.withinThreshold);
    const passed = results.filter(r => r.success && r.withinThreshold);

    if (failed.length > 0) {
      return {
        status: "unhealthy",
        message: `Performance tests failed: ${failed.map(t => t.name).join(", ")}`,
        responseTime,
        details: {
          failed: failed.map(t => ({ name: t.name, error: t.error })),
        },
      };
    }

    if (slow.length > 0) {
      return {
        status: "degraded",
        message: `Performance tests slow: ${slow.map(t => t.name).join(", ")}`,
        responseTime,
        details: {
          slow: slow.map(t => ({
            name: t.name,
            time: `${t.queryTime}ms`,
            threshold: `${t.threshold}ms`,
          })),
          passed: passed.length,
        },
      };
    }

    return {
      status: "healthy",
      message: "All performance tests passed",
      responseTime,
      details: {
        tests: results.map(r => ({ name: r.name, time: `${r.queryTime}ms` })),
        averageTime: `${Math.round(results.reduce((sum, r) => sum + r.queryTime, 0) / results.length)}ms`,
      },
    };
  } catch (error) {
    return {
      status: "unhealthy",
      message: `Performance tests failed: ${error.message}`,
      responseTime: Date.now() - startTime,
    };
  }
}

function logResult(checkName, result) {
  const statusEmoji = {
    healthy: "✅",
    degraded: "⚠️",
    unhealthy: "❌",
  };

  const emoji = statusEmoji[result?.status] || "❓";
  const status = result?.status || "unknown";
  const message = result?.message || "No message";
  const responseTime = result?.responseTime
    ? ` (${result.responseTime}ms)`
    : "";

  console.log(`   ${emoji} ${status.toUpperCase()}: ${message}${responseTime}`);

  if (result?.details && Object.keys(result.details).length > 0) {
    console.log(
      `     Details: ${JSON.stringify(result.details, null, 2).replace(/\n/g, "\n     ")}`
    );
  }
}

// Run the verification
main().catch(console.error);
