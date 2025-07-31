#!/usr/bin/env node

/**
 * Comprehensive API Endpoint Testing Script
 * Tests all ContentLab Nexus API endpoints
 */

const https = require("https");
const http = require("http");

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || "https://app.contentlabtech.com";
const API_KEY = process.env.SUPABASE_ANON_KEY || "";

// Colors for output
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: [],
};

/**
 * Make HTTP request
 */
function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const protocol = url.protocol === "https:" ? https : http;

    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options.headers,
      },
    };

    const req = protocol.request(reqOptions, res => {
      let data = "";
      res.on("data", chunk => (data += chunk));
      res.on("end", () => {
        try {
          const jsonData = data ? JSON.parse(data) : null;
          resolve({
            status: res.statusCode,
            data: jsonData,
            headers: res.headers,
          });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on("error", reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

/**
 * Test a single endpoint
 */
async function testEndpoint(name, path, options = {}, expectations = {}) {
  const startTime = Date.now();

  try {
    console.log(`\n${colors.blue}Testing: ${name}${colors.reset}`);
    console.log(`  Endpoint: ${path}`);

    const response = await makeRequest(path, options);
    const duration = Date.now() - startTime;

    // Check status code
    const expectedStatus = expectations.status || 200;
    const statusOk = response.status === expectedStatus;

    // Check response time
    const timeOk = duration < (expectations.maxTime || 2000);

    // Check response structure
    let structureOk = true;
    if (expectations.requiredFields) {
      for (const field of expectations.requiredFields) {
        if (!response.data || !(field in response.data)) {
          structureOk = false;
          break;
        }
      }
    }

    // Overall result
    const passed = statusOk && timeOk && structureOk;

    if (passed) {
      console.log(`  ${colors.green}✓ PASSED${colors.reset} (${duration}ms)`);
      results.passed++;
    } else {
      console.log(`  ${colors.red}✗ FAILED${colors.reset}`);
      if (!statusOk)
        console.log(
          `    Expected status ${expectedStatus}, got ${response.status}`
        );
      if (!timeOk)
        console.log(`    Response time ${duration}ms exceeded limit`);
      if (!structureOk) console.log(`    Missing required fields`);
      results.failed++;
    }

    results.tests.push({
      name,
      path,
      passed,
      duration,
      status: response.status,
      details: {
        statusOk,
        timeOk,
        structureOk,
      },
    });
  } catch (error) {
    console.log(`  ${colors.red}✗ ERROR${colors.reset}: ${error.message}`);
    results.failed++;
    results.tests.push({
      name,
      path,
      passed: false,
      error: error.message,
    });
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log(
    `${colors.blue}=== ContentLab Nexus API Test Suite ===${colors.reset}`
  );
  console.log(`Testing against: ${BASE_URL}\n`);

  // Health Check Endpoints
  console.log(`${colors.yellow}1. Health Check Endpoints${colors.reset}`);

  await testEndpoint(
    "Basic Health Check",
    "/api/health",
    {},
    { requiredFields: ["status", "timestamp"] }
  );

  await testEndpoint(
    "Detailed Health Check",
    "/api/health/detailed",
    {},
    { requiredFields: ["status", "checks"] }
  );

  await testEndpoint(
    "Database Health",
    "/api/health/database",
    {},
    { requiredFields: ["status"] }
  );

  await testEndpoint(
    "Environment Health",
    "/api/health/environment",
    {},
    { requiredFields: ["status", "environment"] }
  );

  // Public Endpoints
  console.log(`\n${colors.yellow}2. Public Endpoints${colors.reset}`);

  await testEndpoint(
    "CSRF Token",
    "/api/csrf-token",
    {},
    { requiredFields: ["token"] }
  );

  // Authentication Required Endpoints (will fail without auth)
  console.log(
    `\n${colors.yellow}3. Protected Endpoints (Testing Auth)${colors.reset}`
  );

  await testEndpoint(
    "Projects List (No Auth)",
    "/api/projects",
    {},
    { status: 401 } // Should return 401 Unauthorized
  );

  await testEndpoint(
    "Content List (No Auth)",
    "/api/content",
    {},
    { status: 401 }
  );

  await testEndpoint(
    "Analytics (No Auth)",
    "/api/analytics",
    {},
    { status: 401 }
  );

  await testEndpoint(
    "Team Members (No Auth)",
    "/api/team/members",
    {},
    { status: 401 }
  );

  // Error Handling
  console.log(`\n${colors.yellow}4. Error Handling${colors.reset}`);

  await testEndpoint("404 Not Found", "/api/nonexistent", {}, { status: 404 });

  // Performance Monitoring
  console.log(`\n${colors.yellow}5. Performance Endpoints${colors.reset}`);

  await testEndpoint("Metrics", "/api/metrics", {}, { maxTime: 1000 });

  // Print Summary
  console.log(`\n${colors.blue}=== Test Summary ===${colors.reset}`);
  console.log(`Total Tests: ${results.tests.length}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);

  if (results.failed > 0) {
    console.log(`\n${colors.red}Failed Tests:${colors.reset}`);
    results.tests
      .filter(t => !t.passed)
      .forEach(t => {
        console.log(`  - ${t.name} (${t.path})`);
        if (t.error) console.log(`    Error: ${t.error}`);
      });
  }

  // Performance Report
  console.log(`\n${colors.yellow}Performance Report:${colors.reset}`);
  const avgTime =
    results.tests
      .filter(t => t.duration)
      .reduce((sum, t) => sum + t.duration, 0) /
    results.tests.filter(t => t.duration).length;

  console.log(`Average Response Time: ${Math.round(avgTime)}ms`);

  const slowTests = results.tests
    .filter(t => t.duration > 1000)
    .sort((a, b) => b.duration - a.duration);

  if (slowTests.length > 0) {
    console.log(`\nSlow Endpoints (>1s):`);
    slowTests.forEach(t => {
      console.log(`  - ${t.name}: ${t.duration}ms`);
    });
  }

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error(`${colors.red}Test suite failed:${colors.reset}`, error);
  process.exit(1);
});
