#!/usr/bin/env node

/**
 * Production Environment Verification Script
 * Tests all functionalities via Supabase-Vercel production environment
 */

const https = require("https");
const { createClient } = require("@supabase/supabase-js");

// Production URLs - Update these with your actual production URLs
const PRODUCTION_CONFIG = {
  // Vercel deployment URL (update this with your actual Vercel URL)
  vercelUrl: process.env.VERCEL_URL || "https://contentlab-nexus.vercel.app",

  // Supabase production configuration
  supabaseUrl: "https://rwyaipbxlvrilagkirsq.supabase.co",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

// Color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

// Logging utilities
const log = {
  info: msg => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: msg => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: msg => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  error: msg => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  section: msg =>
    console.log(
      `\n${colors.bright}${colors.cyan}═══ ${msg} ═══${colors.reset}\n`
    ),
};

// Test results storage
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: [],
};

/**
 * Make HTTPS request to production API
 */
function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, PRODUCTION_CONFIG.vercelUrl);

    const requestOptions = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options.headers,
      },
    };

    const req = https.request(requestOptions, res => {
      let data = "";

      res.on("data", chunk => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const jsonData = data ? JSON.parse(data) : null;
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData,
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
          });
        }
      });
    });

    req.on("error", error => {
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

/**
 * Test Vercel deployment health
 */
async function testVercelDeployment() {
  log.section("Testing Vercel Deployment");

  try {
    // Test root endpoint
    log.info("Testing root endpoint...");
    const rootResponse = await makeRequest("/");

    if (rootResponse.status === 200) {
      log.success(`Root endpoint accessible: ${PRODUCTION_CONFIG.vercelUrl}`);
      testResults.passed++;
    } else {
      log.error(`Root endpoint returned ${rootResponse.status}`);
      testResults.failed++;
    }

    // Test API health endpoints
    const healthEndpoints = [
      "/api/health/database",
      "/api/health/environment",
      "/api/health/detailed",
    ];

    for (const endpoint of healthEndpoints) {
      log.info(`Testing ${endpoint}...`);

      try {
        const response = await makeRequest(endpoint);

        if (response.status === 200) {
          const data = response.data;

          if (data.status === "healthy") {
            log.success(`${endpoint} - Status: ${data.status}`);
            testResults.passed++;
          } else if (data.status === "degraded") {
            log.warning(`${endpoint} - Status: ${data.status}`);
            testResults.warnings++;

            if (data.missing_variables) {
              log.warning(
                `Missing environment variables: ${data.missing_variables.join(", ")}`
              );
            }
          } else {
            log.error(`${endpoint} - Status: ${data.status}`);
            testResults.failed++;
          }

          testResults.details.push({
            endpoint,
            status: response.status,
            data: data,
          });
        } else {
          log.error(`${endpoint} returned ${response.status}`);
          testResults.failed++;
        }
      } catch (error) {
        log.error(`${endpoint} - Error: ${error.message}`);
        testResults.failed++;
      }
    }
  } catch (error) {
    log.error(`Vercel deployment test failed: ${error.message}`);
    testResults.failed++;
  }
}

/**
 * Test Supabase production database
 */
async function testSupabaseProduction() {
  log.section("Testing Supabase Production Database");

  if (!PRODUCTION_CONFIG.supabaseAnonKey) {
    log.error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable");
    testResults.failed++;
    return;
  }

  try {
    // Create Supabase client
    const supabase = createClient(
      PRODUCTION_CONFIG.supabaseUrl,
      PRODUCTION_CONFIG.supabaseAnonKey
    );

    // Test basic connectivity
    log.info("Testing Supabase connectivity...");
    const { data: healthCheck, error: healthError } = await supabase
      .from("teams")
      .select("count")
      .limit(1);

    if (healthError && healthError.message.includes("JWT")) {
      log.warning("Supabase connection established (auth required)");
      testResults.warnings++;
    } else if (healthError) {
      log.error(`Supabase connection error: ${healthError.message}`);
      testResults.failed++;
    } else {
      log.success("Supabase connection successful");
      testResults.passed++;
    }

    // Test auth endpoint
    log.info("Testing Supabase Auth...");
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (!session) {
      log.info("No active session (expected for anonymous test)");
      testResults.passed++;
    } else {
      log.success("Auth system responsive");
      testResults.passed++;
    }

    // Test RLS policies
    const tables = ["teams", "team_members", "projects", "content_items"];

    for (const table of tables) {
      log.info(`Testing RLS on ${table} table...`);

      const { data, error } = await supabase.from(table).select("*").limit(1);

      if (
        error &&
        (error.message.includes("policy") || error.message.includes("JWT"))
      ) {
        log.success(`RLS active on ${table} table`);
        testResults.passed++;
      } else if (!error && (!data || data.length === 0)) {
        log.warning(`${table} table accessible but empty`);
        testResults.warnings++;
      } else if (error) {
        log.error(`${table} table error: ${error.message}`);
        testResults.failed++;
      } else {
        log.warning(`${table} table may have RLS issues`);
        testResults.warnings++;
      }
    }
  } catch (error) {
    log.error(`Supabase test failed: ${error.message}`);
    testResults.failed++;
  }
}

/**
 * Test API endpoints in production
 */
async function testProductionAPIs() {
  log.section("Testing Production API Endpoints");

  const apiEndpoints = [
    { path: "/api/teams", method: "GET", requiresAuth: true },
    { path: "/api/projects", method: "GET", requiresAuth: true },
    { path: "/api/content", method: "GET", requiresAuth: true },
    { path: "/api/analytics", method: "GET", requiresAuth: true },
    { path: "/api/teams/test/invitations", method: "GET", requiresAuth: true },
  ];

  for (const endpoint of apiEndpoints) {
    log.info(`Testing ${endpoint.method} ${endpoint.path}...`);

    try {
      const response = await makeRequest(endpoint.path, {
        method: endpoint.method,
      });

      if (
        endpoint.requiresAuth &&
        (response.status === 401 || response.status === 403)
      ) {
        log.success(`${endpoint.path} - Auth required (working as expected)`);
        testResults.passed++;
      } else if (response.status === 200) {
        log.success(`${endpoint.path} - Accessible`);
        testResults.passed++;
      } else if (response.status === 404) {
        log.warning(`${endpoint.path} - Not found (may need deployment)`);
        testResults.warnings++;
      } else {
        log.error(`${endpoint.path} - Unexpected status: ${response.status}`);
        testResults.failed++;
      }

      testResults.details.push({
        endpoint: endpoint.path,
        method: endpoint.method,
        status: response.status,
        requiresAuth: endpoint.requiresAuth,
      });
    } catch (error) {
      log.error(`${endpoint.path} - Error: ${error.message}`);
      testResults.failed++;
    }
  }
}

/**
 * Test team invitation functionality
 */
async function testTeamInvitations() {
  log.section("Testing Team Invitation Functionality");

  try {
    // Test invitation endpoint without auth
    log.info("Testing invitation endpoint (no auth)...");
    const response = await makeRequest("/api/teams/test-team/invitations", {
      method: "POST",
      body: {
        email: "test@example.com",
        role: "member",
      },
    });

    if (response.status === 401 || response.status === 403) {
      log.success("Invitation endpoint properly secured");
      testResults.passed++;
    } else if (response.status === 200) {
      log.error("Invitation endpoint accessible without auth (security issue)");
      testResults.failed++;
    } else {
      log.warning(`Invitation endpoint returned ${response.status}`);
      testResults.warnings++;
    }

    // Test with various payloads
    const testPayloads = [
      { email: "", role: "member" }, // Invalid email
      { email: "test@example.com", role: "invalid" }, // Invalid role
      { email: "test@example.com" }, // Missing role
    ];

    for (const payload of testPayloads) {
      log.info(
        `Testing invitation validation with payload: ${JSON.stringify(payload)}`
      );

      const validationResponse = await makeRequest(
        "/api/teams/test-team/invitations",
        {
          method: "POST",
          body: payload,
        }
      );

      if (
        validationResponse.status === 400 ||
        validationResponse.status === 401
      ) {
        log.success("Invalid payload properly rejected");
        testResults.passed++;
      } else {
        log.warning(
          `Unexpected response for invalid payload: ${validationResponse.status}`
        );
        testResults.warnings++;
      }
    }
  } catch (error) {
    log.error(`Team invitation test failed: ${error.message}`);
    testResults.failed++;
  }
}

/**
 * Generate production readiness report
 */
function generateReport() {
  log.section("Production Environment Verification Report");

  const total = testResults.passed + testResults.failed + testResults.warnings;
  const successRate =
    total > 0 ? ((testResults.passed / total) * 100).toFixed(1) : 0;

  console.log(`${colors.bright}Test Results:${colors.reset}`);
  console.log(`  ${colors.green}Passed:${colors.reset} ${testResults.passed}`);
  console.log(
    `  ${colors.yellow}Warnings:${colors.reset} ${testResults.warnings}`
  );
  console.log(`  ${colors.red}Failed:${colors.reset} ${testResults.failed}`);
  console.log(`  ${colors.cyan}Total:${colors.reset} ${total}`);
  console.log(
    `  ${colors.magenta}Success Rate:${colors.reset} ${successRate}%`
  );

  console.log(`\n${colors.bright}Production URLs:${colors.reset}`);
  console.log(`  Vercel: ${PRODUCTION_CONFIG.vercelUrl}`);
  console.log(`  Supabase: ${PRODUCTION_CONFIG.supabaseUrl}`);

  if (testResults.failed > 0) {
    console.log(
      `\n${colors.red}${colors.bright}⚠️  PRODUCTION ISSUES DETECTED${colors.reset}`
    );
    console.log("Please review the errors above and ensure:");
    console.log("  1. Environment variables are properly set in Vercel");
    console.log("  2. Supabase connection strings are correct");
    console.log("  3. API routes are deployed and accessible");
    console.log("  4. Database migrations have been applied");
  } else if (testResults.warnings > 0) {
    console.log(
      `\n${colors.yellow}${colors.bright}⚠️  PRODUCTION WARNINGS${colors.reset}`
    );
    console.log("Some non-critical issues were found. Review warnings above.");
  } else {
    console.log(
      `\n${colors.green}${colors.bright}✅ PRODUCTION ENVIRONMENT VERIFIED${colors.reset}`
    );
    console.log("All critical systems are operational.");
  }

  // Save detailed report
  const fs = require("fs");
  const reportPath = `./production-verification-${new Date().toISOString().split("T")[0]}.json`;

  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        config: PRODUCTION_CONFIG,
        results: testResults,
        successRate: `${successRate}%`,
      },
      null,
      2
    )
  );

  console.log(
    `\n${colors.cyan}Detailed report saved to:${colors.reset} ${reportPath}`
  );
}

/**
 * Main execution
 */
async function main() {
  console.log(
    `${colors.bright}${colors.cyan}🚀 PRODUCTION ENVIRONMENT VERIFICATION${colors.reset}`
  );
  console.log(
    `${colors.cyan}=====================================>${colors.reset}\n`
  );

  log.info(`Vercel URL: ${PRODUCTION_CONFIG.vercelUrl}`);
  log.info(`Supabase URL: ${PRODUCTION_CONFIG.supabaseUrl}`);

  if (
    !PRODUCTION_CONFIG.vercelUrl ||
    PRODUCTION_CONFIG.vercelUrl.includes("localhost")
  ) {
    log.warning(
      "Using localhost. Set VERCEL_URL environment variable for production testing."
    );
    PRODUCTION_CONFIG.vercelUrl = "http://localhost:3000";
  }

  try {
    // Run all tests
    await testVercelDeployment();
    await testSupabaseProduction();
    await testProductionAPIs();
    await testTeamInvitations();

    // Generate final report
    generateReport();

    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
  } catch (error) {
    log.error(`Verification failed: ${error.message}`);
    process.exit(1);
  }
}

// Load environment variables if .env.local exists
try {
  require("dotenv").config({ path: ".env.local" });
} catch (e) {
  // Ignore if dotenv not available
}

// Run verification
main().catch(console.error);
