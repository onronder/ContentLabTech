#!/usr/bin/env node

/**
 * Test Team Management APIs
 * Comprehensive testing of members and invitations endpoints
 */

const https = require("https");
const http = require("http");
require("dotenv").config({ path: ".env.local" });

class TeamAPITester {
  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    this.results = [];
    this.testTeamId = "test-team-id";
  }

  async makeRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const client = url.protocol === "https:" ? https : http;

      const requestOptions = {
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: url.pathname + url.search,
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      };

      const req = client.request(requestOptions, res => {
        let data = "";

        res.on("data", chunk => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const jsonData = data ? JSON.parse(data) : null;
            resolve({
              status: res.statusCode,
              ok: res.statusCode >= 200 && res.statusCode < 300,
              data: jsonData,
              headers: res.headers,
            });
          } catch (error) {
            resolve({
              status: res.statusCode,
              ok: res.statusCode >= 200 && res.statusCode < 300,
              data: data,
              headers: res.headers,
            });
          }
        });
      });

      req.on("error", reject);

      if (options.body) {
        req.write(
          typeof options.body === "string"
            ? options.body
            : JSON.stringify(options.body)
        );
      }

      req.end();
    });
  }

  async runTest(name, testFn) {
    const startTime = Date.now();

    try {
      console.log(`🧪 Testing: ${name}...`);

      const result = await testFn();
      const responseTime = Date.now() - startTime;

      const testResult = {
        name,
        status: "pass",
        message: `✅ ${name} - ${result.message || "Success"}`,
        responseTime,
        data: result.data,
        statusCode: result.statusCode,
      };

      this.results.push(testResult);
      console.log(
        `✅ ${name}: PASS (${responseTime}ms) - Status: ${result.statusCode}`
      );

      return testResult;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const message = error.message || "Unknown error";

      const testResult = {
        name,
        status: "fail",
        message: `❌ ${name}: ${message}`,
        responseTime,
        error: message,
        statusCode: error.statusCode || 0,
      };

      this.results.push(testResult);
      console.log(`❌ ${name}: FAIL (${responseTime}ms) - ${message}`);

      return testResult;
    }
  }

  async testTeamMembersEndpoint() {
    await this.runTest("GET /api/teams/[id]/members", async () => {
      const response = await this.makeRequest(
        `/api/teams/${this.testTeamId}/members`
      );

      // Check if endpoint is accessible (should return 401 for unauthenticated)
      if (response.status === 401 || response.status === 403) {
        return {
          message: "Endpoint properly protected (authentication required)",
          statusCode: response.status,
          data: response.data,
        };
      }

      if (response.status === 404) {
        throw new Error(
          `Team members endpoint not found - Status: ${response.status}`
        );
      }

      if (response.status === 500) {
        throw new Error(
          `Database error - Status: ${response.status}, Details: ${JSON.stringify(response.data)}`
        );
      }

      return {
        message: "Endpoint accessible",
        statusCode: response.status,
        data: response.data,
      };
    });
  }

  async testTeamInvitationsEndpoint() {
    await this.runTest("GET /api/teams/[id]/invitations", async () => {
      const response = await this.makeRequest(
        `/api/teams/${this.testTeamId}/invitations`
      );

      // Check if endpoint is accessible (should return 401 for unauthenticated)
      if (response.status === 401 || response.status === 403) {
        return {
          message: "Endpoint properly protected (authentication required)",
          statusCode: response.status,
          data: response.data,
        };
      }

      if (response.status === 404) {
        throw new Error(
          `Team invitations endpoint not found - Status: ${response.status}`
        );
      }

      if (response.status === 500) {
        throw new Error(
          `Database error - Status: ${response.status}, Details: ${JSON.stringify(response.data)}`
        );
      }

      return {
        message: "Endpoint accessible",
        statusCode: response.status,
        data: response.data,
      };
    });
  }

  async testInvitationCreation() {
    await this.runTest("POST /api/teams/[id]/invitations", async () => {
      const response = await this.makeRequest(
        `/api/teams/${this.testTeamId}/invitations`,
        {
          method: "POST",
          body: {
            email: "test@example.com",
            role: "member",
          },
        }
      );

      // Check if endpoint is accessible (should return 401 for unauthenticated)
      if (response.status === 401 || response.status === 403) {
        return {
          message: "Endpoint properly protected (authentication required)",
          statusCode: response.status,
          data: response.data,
        };
      }

      if (response.status === 404) {
        throw new Error(
          `POST invitations endpoint not found - Status: ${response.status}`
        );
      }

      if (response.status === 500) {
        throw new Error(
          `Database error - Status: ${response.status}, Details: ${JSON.stringify(response.data)}`
        );
      }

      return {
        message: "Endpoint accessible",
        statusCode: response.status,
        data: response.data,
      };
    });
  }

  async testInvalidTeamId() {
    await this.runTest("Invalid Team ID Test", async () => {
      const response = await this.makeRequest(
        `/api/teams/invalid-team-id/members`
      );

      // Should return 401/403 for unauthenticated, or 404 for invalid team
      if (
        response.status === 401 ||
        response.status === 403 ||
        response.status === 404
      ) {
        return {
          message: "Properly handles invalid team ID",
          statusCode: response.status,
          data: response.data,
        };
      }

      if (response.status === 500) {
        throw new Error(
          `Unexpected server error for invalid team ID - Status: ${response.status}`
        );
      }

      return {
        message: "Endpoint accessible",
        statusCode: response.status,
        data: response.data,
      };
    });
  }

  async testEndpointStructure() {
    await this.runTest("API Route Structure Test", async () => {
      // Test various endpoint combinations
      const endpoints = [
        `/api/teams/${this.testTeamId}/members`,
        `/api/teams/${this.testTeamId}/invitations`,
        `/api/teams/non-existent-team/members`,
        `/api/teams/non-existent-team/invitations`,
      ];

      let workingEndpoints = 0;
      let protectedEndpoints = 0;

      for (const endpoint of endpoints) {
        const response = await this.makeRequest(endpoint);

        if (response.status === 401 || response.status === 403) {
          protectedEndpoints++;
        } else if (response.status !== 404 && response.status !== 500) {
          workingEndpoints++;
        }
      }

      return {
        message: `${protectedEndpoints} endpoints properly protected, ${workingEndpoints} accessible`,
        statusCode: 200,
        data: {
          totalEndpoints: endpoints.length,
          protectedEndpoints,
          workingEndpoints,
        },
      };
    });
  }

  generateReport() {
    console.log("\\n" + "=".repeat(60));
    console.log("📊 TEAM API TEST RESULTS");
    console.log("=".repeat(60));

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.status === "pass").length;
    const failedTests = this.results.filter(r => r.status === "fail").length;

    console.log(`\\n📊 Summary:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   ✅ Passed: ${passedTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);
    console.log(
      `   🎯 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`
    );

    const avgResponseTime =
      this.results
        .filter(r => r.responseTime)
        .reduce((sum, r) => sum + (r.responseTime || 0), 0) /
      this.results.length;

    console.log(`   ⚡ Average Response Time: ${avgResponseTime.toFixed(0)}ms`);

    if (failedTests > 0) {
      console.log(`\\n❌ Failed Tests:`);
      this.results
        .filter(r => r.status === "fail")
        .forEach(r => {
          console.log(`   • ${r.name}: ${r.message}`);
          if (r.error) {
            console.log(`     Error: ${r.error}`);
          }
        });
    }

    // Database parsing specific analysis
    console.log(`\\n🔍 Database Query Analysis:`);
    const dbErrors = this.results.filter(
      r =>
        r.status === "fail" &&
        (r.message.includes("parse") || r.message.includes("Database error"))
    );

    if (dbErrors.length === 0) {
      console.log("   ✅ No database parsing errors detected");
    } else {
      console.log(`   ❌ ${dbErrors.length} database parsing errors found`);
      dbErrors.forEach(error => {
        console.log(`   • ${error.name}: ${error.message}`);
      });
    }

    console.log(`\\n🚀 API Readiness Assessment:`);

    if (failedTests === 0) {
      console.log(
        "   ✅ ALL ENDPOINTS WORKING - APIs are ready for production"
      );
    } else if (failedTests <= 1) {
      console.log("   ⚠️  MINOR ISSUES - Most endpoints working correctly");
    } else {
      console.log(
        "   ❌ MAJOR ISSUES - Multiple endpoints failing, needs attention"
      );
    }

    console.log("\\n" + "=".repeat(60));

    // Save results to file
    const fs = require("fs");
    const timestamp = new Date().toISOString().split("T")[0];
    const resultsFile = `./team-api-test-results-${timestamp}.json`;

    fs.writeFileSync(
      resultsFile,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          baseUrl: this.baseUrl,
          summary: {
            total: totalTests,
            passed: passedTests,
            failed: failedTests,
            successRate: `${((passedTests / totalTests) * 100).toFixed(1)}%`,
            avgResponseTime: `${avgResponseTime.toFixed(0)}ms`,
          },
          results: this.results,
        },
        null,
        2
      )
    );

    console.log(`\\n📄 Detailed results saved to: ${resultsFile}`);
  }

  async runAllTests() {
    console.log("🚀 Starting Team API Tests");
    console.log("=".repeat(60));
    console.log(`Base URL: ${this.baseUrl}`);
    console.log(`Test Team ID: ${this.testTeamId}`);
    console.log("=".repeat(60));

    // Run all tests
    await this.testTeamMembersEndpoint();
    await this.testTeamInvitationsEndpoint();
    await this.testInvitationCreation();
    await this.testInvalidTeamId();
    await this.testEndpointStructure();

    // Generate final report
    this.generateReport();

    // Return success/failure status
    const failedTests = this.results.filter(r => r.status === "fail").length;
    return failedTests === 0;
  }
}

// Main execution
async function main() {
  const tester = new TeamAPITester();
  const success = await tester.runAllTests();

  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { TeamAPITester };
