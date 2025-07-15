/**
 * Environment Variables Health Check Endpoint
 * Verifies all required environment variables are configured
 */

import { NextRequest, NextResponse } from "next/server";

interface EnvironmentHealthCheck {
  status: "healthy" | "error";
  timestamp: string;
  environment: string;
  missing_variables: string[];
  configured_variables: string[];
  summary: {
    total_required: number;
    configured: number;
    missing: number;
  };
  details?: Record<string, any>;
}

// Required environment variables for production
const REQUIRED_VARIABLES = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
  "RESEND_API_KEY",
];

// Optional but recommended variables
const OPTIONAL_VARIABLES = [
  "SUPABASE_JWT_SECRET",
  "WEBHOOK_SECRET",
  "ANALYTICS_WRITE_KEY",
  "SENTRY_DSN",
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";
    const includeOptional = searchParams.get("include_optional") === "true";

    // Check required variables
    const requiredResults = REQUIRED_VARIABLES.map(varName => ({
      name: varName,
      configured: !!process.env[varName],
      type: "required" as const,
    }));

    // Check optional variables if requested
    const optionalResults = includeOptional
      ? OPTIONAL_VARIABLES.map(varName => ({
          name: varName,
          configured: !!process.env[varName],
          type: "optional" as const,
        }))
      : [];

    const allResults = [...requiredResults, ...optionalResults];

    // Calculate missing required variables
    const missingRequired = requiredResults
      .filter(result => !result.configured)
      .map(result => result.name);

    const configuredRequired = requiredResults
      .filter(result => result.configured)
      .map(result => result.name);

    const missingOptional = optionalResults
      .filter(result => !result.configured)
      .map(result => result.name);

    const configuredOptional = optionalResults
      .filter(result => result.configured)
      .map(result => result.name);

    // Determine overall status
    const status = missingRequired.length === 0 ? "healthy" : "error";

    const result: EnvironmentHealthCheck = {
      status,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "unknown",
      missing_variables: missingRequired,
      configured_variables: configuredRequired,
      summary: {
        total_required: REQUIRED_VARIABLES.length,
        configured: configuredRequired.length,
        missing: missingRequired.length,
      },
    };

    // Add optional variables info if requested
    if (includeOptional) {
      result.details = {
        optional_variables: {
          configured: configuredOptional,
          missing: missingOptional,
          total: OPTIONAL_VARIABLES.length,
        },
      };
    }

    // Add environment-specific warnings
    if (process.env.NODE_ENV === "production") {
      const productionWarnings = [];

      // Check for development URLs in production
      if (process.env.NEXT_PUBLIC_APP_URL?.includes("localhost")) {
        productionWarnings.push(
          "NEXT_PUBLIC_APP_URL appears to be localhost in production"
        );
      }

      // Check for missing JWT secret in production
      if (!process.env.SUPABASE_JWT_SECRET) {
        productionWarnings.push(
          "SUPABASE_JWT_SECRET not configured (recommended for production)"
        );
      }

      if (productionWarnings.length > 0) {
        result.details = {
          ...result.details,
          production_warnings: productionWarnings,
        };
      }
    }

    // Set appropriate HTTP status code
    const statusCode = status === "healthy" ? 200 : 503;

    if (format === "plain") {
      return new NextResponse(status.toUpperCase(), {
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
      },
    });
  } catch (error) {
    console.error("Environment health check failed:", error);

    const errorResult: EnvironmentHealthCheck = {
      status: "error",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "unknown",
      missing_variables: REQUIRED_VARIABLES, // Assume all missing on error
      configured_variables: [],
      summary: {
        total_required: REQUIRED_VARIABLES.length,
        configured: 0,
        missing: REQUIRED_VARIABLES.length,
      },
      details: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    };

    return NextResponse.json(errorResult, {
      status: 503,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }
}
