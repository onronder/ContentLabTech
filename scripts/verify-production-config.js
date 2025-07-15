#!/usr/bin/env node

/**
 * Production Configuration Verification Script
 * Checks Supabase, Vercel, and environment configurations
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
require("dotenv").config({ path: ".env.local" });

class ProductionConfigVerifier {
  constructor() {
    this.checks = {
      environment: { passed: 0, failed: 0, warnings: 0 },
      supabase: { passed: 0, failed: 0, warnings: 0 },
      vercel: { passed: 0, failed: 0, warnings: 0 },
      deployment: { passed: 0, failed: 0, warnings: 0 },
    };
    this.results = [];
  }

  log(type, category, message, details = null) {
    const timestamp = new Date().toISOString();
    const result = { timestamp, type, category, message, details };
    this.results.push(result);

    const icons = { pass: "✅", fail: "❌", warn: "⚠️", info: "ℹ️" };
    const colors = {
      pass: "\x1b[32m",
      fail: "\x1b[31m",
      warn: "\x1b[33m",
      info: "\x1b[36m",
      reset: "\x1b[0m",
    };

    console.log(
      `${colors[type]}${icons[type]} [${category}] ${message}${colors.reset}`
    );
    if (details) {
      console.log(`   ${JSON.stringify(details, null, 2)}`);
    }

    if (type === "pass") this.checks[category].passed++;
    else if (type === "fail") this.checks[category].failed++;
    else if (type === "warn") this.checks[category].warnings++;
  }

  // 1. Environment Variables Check
  async checkEnvironmentVariables() {
    console.log("\n🔍 Checking Environment Variables...\n");

    const requiredVars = [
      { name: "NEXT_PUBLIC_SUPABASE_URL", category: "Supabase" },
      { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", category: "Supabase" },
      { name: "SUPABASE_SERVICE_ROLE_KEY", category: "Supabase" },
      { name: "RESEND_API_KEY", category: "Email" },
      {
        name: "NEXT_PUBLIC_APP_URL",
        category: "App",
        defaultValue: "http://localhost:3000",
      },
    ];

    const optionalVars = [
      { name: "SENTRY_DSN", category: "Monitoring" },
      { name: "ANALYTICS_WRITE_KEY", category: "Analytics" },
      { name: "OPENAI_API_KEY", category: "AI Services" },
    ];

    // Check required variables
    for (const { name, category, defaultValue } of requiredVars) {
      const value = process.env[name];
      if (value) {
        this.log("pass", "environment", `${name} is configured`, {
          category,
          length: value.length,
          prefix: value.substring(0, 10) + "...",
        });
      } else if (defaultValue) {
        this.log("warn", "environment", `${name} not set, using default`, {
          category,
          defaultValue,
        });
      } else {
        this.log("fail", "environment", `${name} is missing`, { category });
      }
    }

    // Check optional variables
    for (const { name, category } of optionalVars) {
      const value = process.env[name];
      if (value) {
        this.log("pass", "environment", `${name} is configured (optional)`, {
          category,
        });
      } else {
        this.log("info", "environment", `${name} not configured (optional)`, {
          category,
        });
      }
    }

    // Validate Supabase URL format
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      const urlMatch = supabaseUrl.match(/https:\/\/([a-z]+)\.supabase\.co/);
      if (urlMatch) {
        this.log("pass", "environment", "Supabase URL format is valid", {
          projectId: urlMatch[1],
        });
      } else {
        this.log("fail", "environment", "Invalid Supabase URL format");
      }
    }
  }

  // 2. Supabase Configuration Check
  async checkSupabaseConfiguration() {
    console.log("\n🔍 Checking Supabase Configuration...\n");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      this.log("fail", "supabase", "Missing Supabase credentials");
      return;
    }

    // Test Supabase connectivity
    try {
      const response = await this.makeRequest(`${supabaseUrl}/rest/v1/`, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      });

      if (response.status === 200) {
        this.log("pass", "supabase", "Supabase API is accessible");
      } else {
        this.log("fail", "supabase", "Supabase API returned error", {
          status: response.status,
        });
      }
    } catch (error) {
      this.log("fail", "supabase", "Failed to connect to Supabase", {
        error: error.message,
      });
    }

    // Check database tables
    try {
      const tables = [
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

      const response = await this.makeRequest(
        `${supabaseUrl}/rest/v1/?select=table_name`,
        {
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
        }
      );

      if (response.status === 200) {
        this.log("pass", "supabase", "Database schema is accessible", {
          expectedTables: tables.length,
        });
      }
    } catch (error) {
      this.log("warn", "supabase", "Could not verify database schema", {
        note: "This is normal if RLS is properly configured",
      });
    }

    // Verify service role key
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceKey) {
      try {
        const keyParts = serviceKey.split(".");
        if (keyParts.length === 3) {
          this.log("pass", "supabase", "Service role key format is valid");
        } else {
          this.log("fail", "supabase", "Invalid service role key format");
        }
      } catch (error) {
        this.log("fail", "supabase", "Error validating service role key");
      }
    }
  }

  // 3. Vercel Configuration Check
  async checkVercelConfiguration() {
    console.log("\n🔍 Checking Vercel Configuration...\n");

    // Check vercel.json
    const vercelJsonPath = path.join(process.cwd(), "vercel.json");
    if (fs.existsSync(vercelJsonPath)) {
      try {
        const vercelConfig = JSON.parse(
          fs.readFileSync(vercelJsonPath, "utf-8")
        );
        this.log("pass", "vercel", "vercel.json found and valid", {
          hasHeaders: !!vercelConfig.headers,
          hasRewrites: !!vercelConfig.rewrites,
          cleanUrls: vercelConfig.cleanUrls,
        });
      } catch (error) {
        this.log("fail", "vercel", "Invalid vercel.json", {
          error: error.message,
        });
      }
    } else {
      this.log("warn", "vercel", "vercel.json not found", {
        note: "Using default Vercel configuration",
      });
    }

    // Check .vercel directory
    const vercelDir = path.join(process.cwd(), ".vercel");
    if (fs.existsSync(vercelDir)) {
      const projectJsonPath = path.join(vercelDir, "project.json");
      if (fs.existsSync(projectJsonPath)) {
        try {
          const projectConfig = JSON.parse(
            fs.readFileSync(projectJsonPath, "utf-8")
          );
          this.log("pass", "vercel", "Project linked to Vercel", {
            projectId: projectConfig.projectId,
            orgId: projectConfig.orgId,
          });
        } catch (error) {
          this.log("fail", "vercel", "Invalid project.json");
        }
      }
    } else {
      this.log("warn", "vercel", "Project not linked to Vercel", {
        note: 'Run "vercel link" to connect to Vercel',
      });
    }

    // Check build output
    const nextDir = path.join(process.cwd(), ".next");
    if (fs.existsSync(nextDir)) {
      this.log("info", "vercel", "Next.js build directory exists", {
        note: 'Run "npm run build" to update',
      });
    }
  }

  // 4. Deployment Readiness Check
  async checkDeploymentReadiness() {
    console.log("\n🔍 Checking Deployment Readiness...\n");

    // Check package.json scripts
    const packageJsonPath = path.join(process.cwd(), "package.json");
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      const requiredScripts = ["build", "start", "dev"];

      for (const script of requiredScripts) {
        if (packageJson.scripts && packageJson.scripts[script]) {
          this.log("pass", "deployment", `Script "${script}" is defined`);
        } else {
          this.log("fail", "deployment", `Script "${script}" is missing`);
        }
      }
    }

    // Check TypeScript configuration
    const tsConfigPath = path.join(process.cwd(), "tsconfig.json");
    if (fs.existsSync(tsConfigPath)) {
      this.log("pass", "deployment", "TypeScript configuration found");
    } else {
      this.log("fail", "deployment", "tsconfig.json not found");
    }

    // Check for common deployment blockers
    const gitignorePath = path.join(process.cwd(), ".gitignore");
    if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, "utf-8");
      const requiredIgnores = [".env", ".env.local", ".vercel", "node_modules"];

      for (const ignore of requiredIgnores) {
        if (gitignore.includes(ignore)) {
          this.log("pass", "deployment", `${ignore} is properly ignored`);
        } else {
          this.log("warn", "deployment", `${ignore} should be in .gitignore`);
        }
      }
    }

    // Check for deployment documentation
    const deploymentDocs = [
      "PRODUCTION_DEPLOYMENT_GUIDE.md",
      "VERCEL_ENV_SETUP.md",
    ];

    for (const doc of deploymentDocs) {
      if (fs.existsSync(path.join(process.cwd(), doc))) {
        this.log("pass", "deployment", `${doc} found`);
      }
    }
  }

  // Helper function for HTTPS requests
  makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const requestOptions = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: options.method || "GET",
        headers: options.headers || {},
      };

      const req = https.request(requestOptions, res => {
        let data = "";
        res.on("data", chunk => (data += chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode,
            data: data,
          });
        });
      });

      req.on("error", reject);
      req.end();
    });
  }

  // Generate summary report
  generateReport() {
    console.log("\n" + "=".repeat(60));
    console.log("📊 PRODUCTION CONFIGURATION SUMMARY");
    console.log("=".repeat(60));

    let totalPassed = 0;
    let totalFailed = 0;
    let totalWarnings = 0;

    for (const [category, stats] of Object.entries(this.checks)) {
      console.log(`\n${category.toUpperCase()}:`);
      console.log(`  ✅ Passed: ${stats.passed}`);
      console.log(`  ❌ Failed: ${stats.failed}`);
      console.log(`  ⚠️  Warnings: ${stats.warnings}`);

      totalPassed += stats.passed;
      totalFailed += stats.failed;
      totalWarnings += stats.warnings;
    }

    console.log("\n" + "-".repeat(60));
    console.log("TOTAL:");
    console.log(`  ✅ Passed: ${totalPassed}`);
    console.log(`  ❌ Failed: ${totalFailed}`);
    console.log(`  ⚠️  Warnings: ${totalWarnings}`);

    // Production readiness assessment
    console.log("\n" + "=".repeat(60));
    console.log("🚀 PRODUCTION READINESS:");

    if (totalFailed === 0) {
      console.log("   ✅ READY FOR DEPLOYMENT - All checks passed!");
    } else if (totalFailed <= 2 && this.checks.environment.failed === 0) {
      console.log("   ⚠️  READY WITH WARNINGS - Minor issues to address");
    } else {
      console.log("   ❌ NOT READY - Critical issues must be resolved");
    }

    // Next steps
    console.log("\n📋 NEXT STEPS:");
    if (totalFailed > 0) {
      console.log("   1. Fix all failing checks above");
      console.log(
        "   2. Set missing environment variables in Vercel dashboard"
      );
      console.log("   3. Run this script again to verify");
    } else {
      console.log('   1. Run "vercel" to deploy');
      console.log("   2. Set environment variables in Vercel dashboard");
      console.log("   3. Test production deployment thoroughly");
    }

    console.log("\n" + "=".repeat(60));

    // Save detailed report
    const reportPath = "./production-config-report.json";
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          summary: {
            totalPassed,
            totalFailed,
            totalWarnings,
            categories: this.checks,
          },
          details: this.results,
        },
        null,
        2
      )
    );

    console.log(`\n📄 Detailed report saved to: ${reportPath}\n`);
  }

  async run() {
    console.log("🔧 Production Configuration Verification");
    console.log("=".repeat(60));

    await this.checkEnvironmentVariables();
    await this.checkSupabaseConfiguration();
    await this.checkVercelConfiguration();
    await this.checkDeploymentReadiness();

    this.generateReport();
  }
}

// Run verification
const verifier = new ProductionConfigVerifier();
verifier.run().catch(console.error);
