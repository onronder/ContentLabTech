#!/usr/bin/env node

/**
 * Environment Configuration Validator
 * Checks for common configuration issues
 */

const https = require("https");

// Colors for output
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

console.log(
  `${colors.blue}ContentLab Nexus - Environment Configuration Validator${colors.reset}`
);
console.log("=====================================================\n");

// Check local environment variables
function checkLocalEnv() {
  console.log(
    `${colors.yellow}Checking Local Environment Variables:${colors.reset}`
  );

  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ];

  const optional = [
    "SUPABASE_SERVICE_ROLE_KEY",
    "OPENAI_API_KEY",
    "REDIS_HOST",
    "REDIS_PORT",
    "REDIS_PASSWORD",
  ];

  let hasErrors = false;

  // Check required vars
  required.forEach(key => {
    const value = process.env[key];
    if (!value) {
      console.log(`${colors.red}✗ Missing: ${key}${colors.reset}`);
      hasErrors = true;
    } else {
      // Check format
      if (key === "NEXT_PUBLIC_SUPABASE_ANON_KEY") {
        if (value.startsWith("eyJ")) {
          console.log(
            `${colors.red}✗ ${key}: Legacy JWT format detected (starts with 'eyJ')${colors.reset}`
          );
          console.log(
            `  ${colors.yellow}→ You need the new format starting with 'sb_publishable_'${colors.reset}`
          );
          hasErrors = true;
        } else if (value.startsWith("sb_publishable_")) {
          console.log(`${colors.green}✓ ${key}: Correct format${colors.reset}`);
        } else {
          console.log(
            `${colors.yellow}⚠ ${key}: Unknown format${colors.reset}`
          );
        }
      } else if (key === "NEXT_PUBLIC_SUPABASE_URL") {
        if (value.includes("supabase.co")) {
          console.log(
            `${colors.green}✓ ${key}: Valid Supabase URL${colors.reset}`
          );
        } else {
          console.log(
            `${colors.yellow}⚠ ${key}: Doesn't look like a Supabase URL${colors.reset}`
          );
        }
      } else {
        console.log(`${colors.green}✓ ${key}: Present${colors.reset}`);
      }
    }
  });

  // Check optional vars
  console.log(`\n${colors.yellow}Optional Services:${colors.reset}`);
  optional.forEach(key => {
    const value = process.env[key];
    if (!value) {
      console.log(`${colors.yellow}○ ${key}: Not configured${colors.reset}`);
    } else {
      if (key === "SUPABASE_SERVICE_ROLE_KEY") {
        if (value.startsWith("eyJ")) {
          console.log(
            `${colors.yellow}⚠ ${key}: Legacy JWT format (should start with 'sb_secret_')${colors.reset}`
          );
        } else if (value.startsWith("sb_secret_")) {
          console.log(`${colors.green}✓ ${key}: Correct format${colors.reset}`);
        } else {
          console.log(`${colors.green}✓ ${key}: Present${colors.reset}`);
        }
      } else {
        console.log(`${colors.green}✓ ${key}: Configured${colors.reset}`);
      }
    }
  });

  return !hasErrors;
}

// Test production health endpoint
async function testProductionHealth() {
  console.log(`\n${colors.yellow}Testing Production Health:${colors.reset}`);

  return new Promise(resolve => {
    https
      .get("https://app.contentlabtech.com/api/health", res => {
        let data = "";
        res.on("data", chunk => (data += chunk));
        res.on("end", () => {
          try {
            const health = JSON.parse(data);

            console.log(
              `Status: ${health.status === "healthy" ? colors.green : colors.red}${health.status}${colors.reset}`
            );

            if (health.checks?.environment?.details?.errors) {
              console.log(`\n${colors.red}Environment Errors:${colors.reset}`);
              health.checks.environment.details.errors.forEach(error => {
                console.log(`  - ${error}`);
              });
            }

            if (health.checks?.externalServices) {
              console.log(
                `\n${colors.yellow}External Services:${colors.reset}`
              );
              const services =
                health.checks.externalServices.details?.available || [];
              console.log(`  Available: ${services.join(", ") || "None"}`);
            }

            resolve(health.status === "healthy");
          } catch (e) {
            console.log(
              `${colors.red}Failed to parse health response${colors.reset}`
            );
            resolve(false);
          }
        });
      })
      .on("error", err => {
        console.log(
          `${colors.red}Failed to connect: ${err.message}${colors.reset}`
        );
        resolve(false);
      });
  });
}

// Provide instructions
function showInstructions() {
  console.log(
    `\n${colors.blue}=== How to Fix Configuration Issues ===${colors.reset}\n`
  );

  console.log(`${colors.yellow}1. Get New Supabase Keys:${colors.reset}`);
  console.log("   - Go to https://app.supabase.com");
  console.log("   - Select your project");
  console.log("   - Go to Settings → API");
  console.log("   - Copy the NEW format keys (not JWT):\n");
  console.log("     NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...");
  console.log("     SUPABASE_SERVICE_ROLE_KEY=sb_secret_...\n");

  console.log(`${colors.yellow}2. Update Vercel Environment:${colors.reset}`);
  console.log("   - Go to your Vercel dashboard");
  console.log("   - Settings → Environment Variables");
  console.log("   - Update the keys with new format");
  console.log("   - Redeploy your application\n");

  console.log(`${colors.yellow}3. Optional: Configure Redis${colors.reset}`);
  console.log("   - Use Upstash: https://upstash.com");
  console.log("   - Or Redis Cloud: https://redis.com/try-free/");
  console.log("   - Add REDIS_* variables to Vercel\n");
}

// Run validation
async function main() {
  const localValid = checkLocalEnv();
  const prodHealthy = await testProductionHealth();

  console.log(`\n${colors.blue}=== Summary ===${colors.reset}`);

  if (localValid && prodHealthy) {
    console.log(`${colors.green}✅ Configuration looks good!${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ Configuration issues detected${colors.reset}`);
    showInstructions();
  }
}

// Run the validator
main().catch(console.error);
