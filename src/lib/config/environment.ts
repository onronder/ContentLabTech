/**
 * Environment Configuration Validation
 * Ensures all critical environment variables are present and valid
 * Prevents runtime crashes due to missing configuration
 */

import { z } from "zod";

// Environment validation schema
const environmentSchema = z.object({
  // Next.js
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Supabase - Critical for database operations
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("Invalid Supabase URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "Supabase anon key is required"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "Supabase service role key is required")
    .optional(),

  // OpenAI - Critical for AI features
  OPENAI_API_KEY: z
    .string()
    .min(1, "OpenAI API key is required for AI features")
    .optional(),

  // Redis - Critical for job processing and rate limiting
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().min(1).max(65535))
    .default("6379"),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_TLS: z
    .string()
    .transform(val => val === "true")
    .default("false"),

  // BrightData - Critical for competitive analysis
  BRIGHTDATA_CUSTOMER_ID: z
    .string()
    .min(1, "BrightData customer ID is required for competitive features")
    .optional(),
  BRIGHTDATA_ZONE: z
    .string()
    .min(1, "BrightData zone is required for competitive features")
    .optional(),
  BRIGHTDATA_PASSWORD: z
    .string()
    .min(1, "BrightData password is required for competitive features")
    .optional(),

  // Google Analytics - Optional but recommended
  GOOGLE_ANALYTICS_CLIENT_ID: z.string().optional(),
  GOOGLE_ANALYTICS_CLIENT_SECRET: z.string().optional(),

  // WebSocket - Optional with fallback
  NEXT_PUBLIC_WEBSOCKET_URL: z.string().url().optional(),

  // Rate limiting
  API_RATE_LIMIT_REQUESTS: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().min(1))
    .default("100"),
  API_RATE_LIMIT_WINDOW: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().min(1))
    .default("3600"),
});

export type EnvironmentConfig = z.infer<typeof environmentSchema>;

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  config: EnvironmentConfig | undefined;
  errors: string[];
  warnings: string[];
  criticalMissing: string[];
  optionalMissing: string[];
}

// Critical environment variables that will break core functionality
const CRITICAL_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

// Important but optional variables that reduce functionality
const OPTIONAL_VARS = [
  "OPENAI_API_KEY",
  "REDIS_HOST",
  "BRIGHTDATA_CUSTOMER_ID",
  "BRIGHTDATA_ZONE",
  "BRIGHTDATA_PASSWORD",
] as const;

/**
 * Validates environment configuration and provides detailed feedback
 */
export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const criticalMissing: string[] = [];
  const optionalMissing: string[] = [];

  try {
    // Parse environment variables
    const result = environmentSchema.safeParse(process.env);

    if (!result.success) {
      // Extract validation errors
      result.error.errors.forEach(error => {
        const field = error.path.join(".");
        errors.push(`${field}: ${error.message}`);
      });
    }

    // Check for critical missing variables
    CRITICAL_VARS.forEach(varName => {
      if (!process.env[varName]) {
        criticalMissing.push(varName);
        errors.push(`Critical environment variable missing: ${varName}`);
      }
    });

    // Check for optional missing variables
    OPTIONAL_VARS.forEach(varName => {
      if (!process.env[varName]) {
        optionalMissing.push(varName);
        warnings.push(
          `Optional environment variable missing: ${varName} (some features may be disabled)`
        );
      }
    });

    // Additional validation checks
    if (
      process.env["NEXT_PUBLIC_SUPABASE_URL"] &&
      !process.env["NEXT_PUBLIC_SUPABASE_URL"].includes("supabase.co")
    ) {
      warnings.push("Supabase URL doesn't appear to be a valid Supabase URL");
    }

    if (
      process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] &&
      !process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"].startsWith(
        "sb_publishable_"
      )
    ) {
      errors.push("Supabase anon key has invalid format");
    }

    // Check for legacy JWT tokens
    if (
      process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] &&
      process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"].startsWith("eyJ")
    ) {
      errors.push(
        "CRITICAL: Legacy JWT token detected as anon key. This will cause browser crashes."
      );
    }

    const isValid = errors.length === 0 && criticalMissing.length === 0;

    return {
      isValid,
      config: result.success ? result.data : undefined,
      errors,
      warnings,
      criticalMissing,
      optionalMissing,
    };
  } catch (error) {
    return {
      isValid: false,
      config: undefined,
      errors: [
        `Environment validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      ],
      warnings: [],
      criticalMissing: [],
      optionalMissing: [],
    };
  }
}

/**
 * Gets validated environment configuration
 * Throws error if validation fails in production
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const validation = validateEnvironment();

  if (!validation.isValid) {
    const errorMessage = `Environment validation failed:\n${validation.errors.join("\n")}`;

    if (process.env.NODE_ENV === "production") {
      throw new Error(errorMessage);
    } else {
      console.error(errorMessage);
      if (validation.warnings.length > 0) {
        console.warn(
          `Environment warnings:\n${validation.warnings.join("\n")}`
        );
      }
    }
  }

  return validation.config || ({} as EnvironmentConfig);
}

/**
 * Feature flags based on environment configuration
 */
export function getFeatureFlags(): {
  aiFeatures: boolean;
  competitiveAnalysis: boolean;
  realTimeUpdates: boolean;
  advancedAnalytics: boolean;
  jobProcessing: boolean;
} {
  const env = process.env;

  return {
    aiFeatures: Boolean(env["OPENAI_API_KEY"]),
    competitiveAnalysis: Boolean(
      env["BRIGHTDATA_CUSTOMER_ID"] &&
        env["BRIGHTDATA_ZONE"] &&
        env["BRIGHTDATA_PASSWORD"]
    ),
    realTimeUpdates: Boolean(env["NEXT_PUBLIC_WEBSOCKET_URL"]),
    advancedAnalytics: Boolean(
      env["GOOGLE_ANALYTICS_CLIENT_ID"] && env["GOOGLE_ANALYTICS_CLIENT_SECRET"]
    ),
    jobProcessing: Boolean(env["REDIS_HOST"]),
  };
}

/**
 * Generates environment status report
 */
export function getEnvironmentStatus(): {
  status: "healthy" | "degraded" | "critical";
  summary: string;
  details: ValidationResult;
  featureFlags: ReturnType<typeof getFeatureFlags>;
} {
  const validation = validateEnvironment();
  const featureFlags = getFeatureFlags();

  let status: "healthy" | "degraded" | "critical";
  let summary: string;

  if (!validation.isValid || validation.criticalMissing.length > 0) {
    status = "critical";
    summary = `Critical configuration issues detected. ${validation.criticalMissing.length} critical variables missing.`;
  } else if (
    validation.warnings.length > 0 ||
    validation.optionalMissing.length > 0
  ) {
    status = "degraded";
    summary = `Configuration functional but some features may be disabled. ${validation.optionalMissing.length} optional variables missing.`;
  } else {
    status = "healthy";
    summary = "All environment variables properly configured.";
  }

  return {
    status,
    summary,
    details: validation,
    featureFlags,
  };
}

// Validate environment on module load in production
if (process.env.NODE_ENV === "production") {
  const validation = validateEnvironment();
  if (!validation.isValid) {
    console.error("🚨 CRITICAL: Environment validation failed in production");
    console.error(validation.errors.join("\n"));

    // Allow startup but with degraded functionality
    if (validation.criticalMissing.length > 0) {
      console.error(
        "🚨 Critical variables missing - some features will be unavailable"
      );
    }
  }
}
