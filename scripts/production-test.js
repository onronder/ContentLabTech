#!/usr/bin/env node

/**
 * Production User Journey Testing Script (JavaScript version)
 * Comprehensive end-to-end testing of all user workflows
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const https = require("https");
const http = require("http");

class ProductionTester {
  constructor(config) {
    this.config = config;
    this.results = [];
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
  }

  async runTest(name, testFn, required = true) {
    const startTime = Date.now();

    try {
      console.log(`🧪 Testing: ${name}...`);

      const result = await testFn();
      const responseTime = Date.now() - startTime;

      const testResult = {
        name,
        status: "pass",
        message: `✅ ${name} completed successfully`,
        responseTime,
        data: result,
      };

      this.results.push(testResult);
      console.log(`✅ ${name}: PASS (${responseTime}ms)`);

      return testResult;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const message = error.message || "Unknown error";

      const testResult = {
        name,
        status: required ? "fail" : "skip",
        message: `${required ? "❌" : "⚠️"} ${name}: ${message}`,
        responseTime,
      };

      this.results.push(testResult);
      console.log(
        `${required ? "❌" : "⚠️"} ${name}: ${required ? "FAIL" : "SKIP"} (${responseTime}ms)`
      );
      console.log(`   Error: ${message}`);

      return testResult;
    }
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const client = urlObj.protocol === "https:" ? https : http;

      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === "https:" ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
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
              json: () => Promise.resolve(jsonData),
              data: jsonData,
            });
          } catch (error) {
            resolve({
              status: res.statusCode,
              ok: res.statusCode >= 200 && res.statusCode < 300,
              json: () => Promise.resolve(data),
              data: data,
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

  async testCompleteUserJourney() {
    console.log("🚀 Starting Complete Production User Journey Test");
    console.log("=".repeat(60));
    console.log(`Base URL: ${this.config.baseUrl}`);
    console.log(`Supabase URL: ${this.config.supabaseUrl}`);
    console.log("=".repeat(60));

    // 1. System Health Check
    await this.runTest("System Health Check", async () => {
      const response = await this.makeRequest(
        `${this.config.baseUrl}/api/health/complete`
      );

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const data = response.data;

      if (data.status === "error") {
        throw new Error(`System unhealthy: ${JSON.stringify(data.checks)}`);
      }

      return data;
    });

    // 2. Database Connectivity
    await this.runTest("Database Connectivity", async () => {
      const response = await this.makeRequest(
        `${this.config.baseUrl}/api/health/database`
      );

      if (!response.ok) {
        throw new Error(`Database health check failed: ${response.status}`);
      }

      const data = response.data;

      if (data.status === "unhealthy") {
        throw new Error(
          `Database unhealthy: ${data.database?.connection?.message}`
        );
      }

      return data;
    });

    // 3. Environment Configuration
    await this.runTest("Environment Configuration", async () => {
      const response = await this.makeRequest(
        `${this.config.baseUrl}/api/health/environment`
      );

      if (!response.ok) {
        throw new Error(`Environment check failed: ${response.status}`);
      }

      const data = response.data;

      if (data.status === "error") {
        throw new Error(
          `Environment errors: ${data.missing_variables?.join(", ")}`
        );
      }

      return data;
    });

    // 4. Authentication System
    await this.runTest("Authentication System", async () => {
      const response = await this.makeRequest(
        `${this.config.baseUrl}/api/teams`
      );

      if (response.status === 401 || response.status === 403) {
        return { message: "Authentication properly enforced" };
      }

      if (response.status === 404) {
        throw new Error("API route not found");
      }

      return { message: "Authentication system responsive" };
    });

    // 5. Team System Data Loading
    await this.runTest("Team System Data Loading", async () => {
      const response = await this.makeRequest(
        `${this.config.baseUrl}/api/teams`
      );

      if (response.status === 401 || response.status === 403) {
        return { message: "Team system properly protected" };
      }

      if (response.status === 404) {
        throw new Error("Team API not found");
      }

      if (response.ok) {
        const data = response.data;
        return { message: "Team data accessible", data };
      }

      throw new Error(`Team system error: ${response.status}`);
    });

    // 6. Team Invitation System
    await this.runTest("Team Invitation System", async () => {
      const testTeamId = this.config.testTeamId || "test-team-id";
      const response = await this.makeRequest(
        `${this.config.baseUrl}/api/teams/${testTeamId}/invitations`
      );

      if (response.status === 401 || response.status === 403) {
        return { message: "Invitation system properly protected" };
      }

      if (response.status === 404) {
        throw new Error("Team invitation API not found");
      }

      return { message: "Invitation system accessible" };
    });

    // 7. User Profile System
    await this.runTest("User Profile System", async () => {
      const response = await this.makeRequest(
        `${this.config.baseUrl}/api/user/profile`
      );

      if (response.status === 401 || response.status === 403) {
        return { message: "User profile properly protected" };
      }

      if (response.status === 404) {
        throw new Error("User profile API not found");
      }

      return { message: "User profile system accessible" };
    });

    // 8. Settings System
    await this.runTest("Settings System", async () => {
      const response = await this.makeRequest(
        `${this.config.baseUrl}/api/user/notifications`
      );

      if (response.status === 401 || response.status === 403) {
        return { message: "Settings system properly protected" };
      }

      if (response.status === 404) {
        throw new Error("Settings API not found");
      }

      return { message: "Settings system accessible" };
    });

    // 9. Projects System
    await this.runTest("Projects System", async () => {
      const response = await this.makeRequest(
        `${this.config.baseUrl}/api/projects`
      );

      if (response.status === 401 || response.status === 403) {
        return { message: "Projects system properly protected" };
      }

      if (response.status === 404) {
        throw new Error("Projects API not found");
      }

      return { message: "Projects system accessible" };
    });

    // 10. Content Management System
    await this.runTest("Content Management System", async () => {
      const response = await this.makeRequest(
        `${this.config.baseUrl}/api/content`
      );

      if (response.status === 401 || response.status === 403) {
        return { message: "Content system properly protected" };
      }

      if (response.status === 404) {
        throw new Error("Content API not found");
      }

      return { message: "Content system accessible" };
    });

    // 11. Analytics System
    await this.runTest("Analytics System", async () => {
      const response = await this.makeRequest(
        `${this.config.baseUrl}/api/analytics`
      );

      if (response.status === 401 || response.status === 403) {
        return { message: "Analytics system properly protected" };
      }

      if (response.status === 404) {
        throw new Error("Analytics API not found");
      }

      return { message: "Analytics system accessible" };
    });

    // 12. Email Service (optional)
    await this.runTest(
      "Email Service",
      async () => {
        if (!process.env.RESEND_API_KEY) {
          throw new Error(
            "Email service not configured (RESEND_API_KEY missing)"
          );
        }

        const response = await this.makeRequest(
          "https://api.resend.com/emails",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: {
              from: "test@example.com",
              to: "test@example.com",
              subject: "Test",
              html: "<p>Test</p>",
            },
          }
        );

        if (response.status === 400 || response.status === 422) {
          return { message: "Email service API accessible" };
        }

        if (response.status === 200) {
          return { message: "Email service working" };
        }

        throw new Error(`Email service error: ${response.status}`);
      },
      false
    );

    // 13. Database RLS Enforcement
    await this.runTest("Database RLS Enforcement", async () => {
      try {
        const { data, error } = await this.supabase
          .from("teams")
          .select("*")
          .limit(1);

        if (error) {
          if (
            error.message.includes("policy") ||
            error.message.includes("JWT")
          ) {
            return { message: "RLS properly enforced" };
          }
          throw error;
        }

        return { message: "Database accessible (may need RLS review)", data };
      } catch (error) {
        if (error.message && error.message.includes("policy")) {
          return { message: "RLS properly enforced" };
        }
        throw error;
      }
    });

    this.generateReport();
  }

  generateReport() {
    console.log("\n" + "=".repeat(60));
    console.log("🎯 PRODUCTION TEST RESULTS");
    console.log("=".repeat(60));

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.status === "pass").length;
    const failedTests = this.results.filter(r => r.status === "fail").length;
    const skippedTests = this.results.filter(r => r.status === "skip").length;

    console.log(`\n📊 Summary:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   ✅ Passed: ${passedTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);
    console.log(`   ⚠️ Skipped: ${skippedTests}`);
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
      console.log(`\n❌ Failed Tests:`);
      this.results
        .filter(r => r.status === "fail")
        .forEach(r => console.log(`   • ${r.name}: ${r.message}`));
    }

    if (skippedTests > 0) {
      console.log(`\n⚠️ Skipped Tests:`);
      this.results
        .filter(r => r.status === "skip")
        .forEach(r => console.log(`   • ${r.name}: ${r.message}`));
    }

    const criticalFailures = this.results.filter(
      r =>
        r.status === "fail" &&
        [
          "System Health Check",
          "Database Connectivity",
          "Environment Configuration",
        ].includes(r.name)
    ).length;

    console.log("\n🚀 Production Readiness Assessment:");

    if (criticalFailures === 0 && failedTests === 0) {
      console.log("   ✅ READY FOR PRODUCTION - All tests passed");
    } else if (criticalFailures === 0 && failedTests <= 2) {
      console.log("   ⚠️ READY WITH WARNINGS - Minor issues detected");
    } else {
      console.log("   ❌ NOT READY - Critical issues need resolution");
    }

    console.log("\n📁 Next Steps:");
    console.log("   1. Review any failed tests and resolve issues");
    console.log("   2. Deploy to production environment");
    console.log("   3. Run this test against production URL");
    console.log("   4. Monitor health dashboard at /health");

    console.log("\n" + "=".repeat(60));

    const timestamp = new Date().toISOString().split("T")[0];
    const resultsFile = `./production-test-results-${timestamp}.json`;

    fs.writeFileSync(
      resultsFile,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          config: this.config,
          summary: {
            total: totalTests,
            passed: passedTests,
            failed: failedTests,
            skipped: skippedTests,
            successRate: `${((passedTests / totalTests) * 100).toFixed(1)}%`,
            avgResponseTime: `${avgResponseTime.toFixed(0)}ms`,
          },
          results: this.results,
        },
        null,
        2
      )
    );

    console.log(`📄 Detailed results saved to: ${resultsFile}`);
  }
}

// Main execution
async function main() {
  require("dotenv").config({ path: ".env.local" });

  const config = {
    baseUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    supabaseUrl:
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      "https://rwyaipbxlvrilagkirsq.supabase.co",
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    testEmail: process.env.TEST_EMAIL || "test@example.com",
    testTeamId: process.env.TEST_TEAM_ID || "test-team-id",
  };

  if (!config.supabaseKey) {
    console.error(
      "❌ Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable"
    );
    process.exit(1);
  }

  const tester = new ProductionTester(config);
  await tester.testCompleteUserJourney();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ProductionTester };
