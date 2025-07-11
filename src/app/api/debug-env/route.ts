import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  console.log("🔍 Environment Debug: Starting environment variables audit");

  // Step 1.1: Check Current Environment Variables
  const envCheck = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? "SET"
      : "MISSING",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? "SET"
      : "MISSING",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
      ? "SET"
      : "MISSING",
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY ? "SET" : "MISSING",
    SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET ? "SET" : "MISSING",
    VERCEL_URL: process.env.VERCEL_URL || "NOT_SET",
    VERCEL_ENV: process.env.VERCEL_ENV || "NOT_SET",

    // URL validation
    supabaseUrlValid:
      process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("supabase.co") || false,
    publishableKeyLength:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
    serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
    secretKeyLength: process.env.SUPABASE_SECRET_KEY?.length || 0,

    // Partial key validation (first/last 10 chars)
    supabaseUrlPreview:
      process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 50) + "...",
    publishableKeyPreview: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20) +
        "..." +
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(-10)
      : "MISSING",
    serviceKeyPreview: process.env.SUPABASE_SERVICE_ROLE_KEY
      ? process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20) +
        "..." +
        process.env.SUPABASE_SERVICE_ROLE_KEY.substring(-10)
      : "MISSING",
  };

  console.log("🔍 Environment Variables Check:", envCheck);

  // Step 1.2: Validate Environment Variables
  const requiredEnvVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY", // This is the correct key name
    "SUPABASE_SERVICE_ROLE_KEY",
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  const issues = [] as string[];
  const warnings = [] as string[];

  // Check for missing variables
  if (missingVars.length > 0) {
    issues.push(`Missing environment variables: ${missingVars.join(", ")}`);
  }

  // URL validation
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("supabase.co")
  ) {
    issues.push(
      'NEXT_PUBLIC_SUPABASE_URL format appears invalid - should contain "supabase.co"'
    );
  }

  // Key length validation
  if (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length < 100
  ) {
    issues.push(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY appears too short (should be ~107 chars)"
    );
  }

  if (
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY.length < 100
  ) {
    issues.push(
      "SUPABASE_SERVICE_ROLE_KEY appears too short (should be ~107 chars)"
    );
  }

  // Check for old/incorrect key names - this check is no longer needed since we fixed the naming

  // JWT Secret validation
  if (!process.env.SUPABASE_JWT_SECRET) {
    warnings.push(
      "SUPABASE_JWT_SECRET is missing - may be needed for advanced auth features"
    );
  }

  // Deployment environment checks
  const deploymentInfo = {
    isProduction: process.env.NODE_ENV === "production",
    isVercel: !!process.env.VERCEL_URL,
    vercelEnv: process.env.VERCEL_ENV,
    hasVercelUrl: !!process.env.VERCEL_URL,
  };

  // Key prefix validation
  const keyValidation = {
    urlStartsCorrect:
      process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("https://") || false,
    publishableKeyStartsCorrect:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith("eyJ") || false,
    serviceKeyStartsCorrect:
      process.env.SUPABASE_SERVICE_ROLE_KEY?.startsWith("eyJ") || false,
  };

  // Additional key format validation
  if (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.startsWith("eyJ")
  ) {
    issues.push(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY should start with "eyJ" (JWT format)'
    );
  }

  if (
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY.startsWith("eyJ")
  ) {
    issues.push(
      'SUPABASE_SERVICE_ROLE_KEY should start with "eyJ" (JWT format)'
    );
  }

  // Build comprehensive response
  const auditResult = {
    status: "Environment Variables Audit Complete",
    timestamp: new Date().toISOString(),
    environment: envCheck,
    validation: {
      requiredVarsPresent: missingVars.length === 0,
      missingVariables: missingVars as string[],
      issues: issues,
      warnings: warnings,
      keyValidation: keyValidation,
      deploymentInfo: deploymentInfo,
    },
    recommendations: [] as string[],
  };

  // Generate recommendations
  if (issues.length > 0) {
    auditResult.recommendations.push(
      "🚨 CRITICAL: Fix the issues listed above before proceeding"
    );
  }

  if (warnings.length > 0) {
    auditResult.recommendations.push(
      "⚠️  Review warnings to ensure optimal configuration"
    );
  }

  if (missingVars.length === 0 && issues.length === 0) {
    auditResult.recommendations.push(
      "✅ Environment variables appear correctly configured"
    );
  }

  // Add specific recommendations based on findings

  if (!process.env.VERCEL_URL && process.env.NODE_ENV === "production") {
    auditResult.recommendations.push(
      "🔧 Ensure VERCEL_URL is set in production environment"
    );
  }

  // Log the audit result
  console.log("🔍 Environment Audit Result:", {
    hasIssues: issues.length > 0,
    hasWarnings: warnings.length > 0,
    issueCount: issues.length,
    warningCount: warnings.length,
    allRequiredVarsPresent: missingVars.length === 0,
  });

  // Return appropriate status code
  const statusCode = issues.length > 0 ? 500 : warnings.length > 0 ? 200 : 200;

  return NextResponse.json(auditResult, { status: statusCode });
}

// Add POST method for comprehensive testing
export async function POST(request: NextRequest) {
  console.log("🔍 Environment Debug: Starting comprehensive environment test");

  try {
    const body = await request.json();
    const testType = body.testType || "basic";

    // Test Supabase connection with current environment
    const supabaseConnectionTest = {
      canCreateClient: false,
      error: null as string | null,
      clientCreated: false,
    };

    try {
      // Import the session utilities
      const { createClient } = await import("@/lib/auth/session");
      const client = await createClient();
      supabaseConnectionTest.canCreateClient = true;
      supabaseConnectionTest.clientCreated = !!client;
    } catch (error) {
      supabaseConnectionTest.error =
        error instanceof Error ? error.message : "Unknown error";
    }

    // Test URL construction
    const urlTests = {
      baseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      isValidUrl: false,
      canConnect: false,
    };

    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
        urlTests.isValidUrl = true;
        urlTests.canConnect =
          url.protocol === "https:" && url.hostname.includes("supabase.co");
      } catch (error) {
        urlTests.isValidUrl = false;
      }
    }

    return NextResponse.json({
      status: "Comprehensive Environment Test Complete",
      timestamp: new Date().toISOString(),
      testType,
      tests: {
        supabaseConnection: supabaseConnectionTest,
        urlValidation: urlTests,
      },
    });
  } catch (error) {
    console.error("❌ Environment test failed:", error);
    return NextResponse.json(
      {
        status: "Environment Test Failed",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
