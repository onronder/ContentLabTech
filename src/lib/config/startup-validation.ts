/**
 * Startup Validation System
 * Validates critical systems during application startup
 * Provides graceful degradation for missing services
 */

import { validateEnvironment, getFeatureFlags } from "./environment";

export interface StartupValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  enabledFeatures: string[];
  disabledFeatures: string[];
  recommendations: string[];
}

/**
 * Performs comprehensive startup validation
 */
export async function validateStartup(): Promise<StartupValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const enabledFeatures: string[] = [];
  const disabledFeatures: string[] = [];
  const recommendations: string[] = [];

  console.log("🚀 Starting ContentLab Nexus startup validation...");

  // 1. Environment validation
  console.log("📋 Validating environment configuration...");
  const envValidation = validateEnvironment();
  
  if (!envValidation.isValid) {
    errors.push(...envValidation.errors);
  }
  warnings.push(...envValidation.warnings);

  // 2. Feature flag validation
  console.log("🎛️ Checking feature availability...");
  const features = getFeatureFlags();

  if (features.aiFeatures) {
    enabledFeatures.push("AI Content Analysis");
  } else {
    disabledFeatures.push("AI Content Analysis (Missing OPENAI_API_KEY)");
    recommendations.push("Add OPENAI_API_KEY to enable AI-powered content analysis and recommendations");
  }

  if (features.competitiveAnalysis) {
    enabledFeatures.push("Competitive Intelligence");
  } else {
    disabledFeatures.push("Competitive Intelligence (Missing BrightData credentials)");
    recommendations.push("Configure BrightData credentials (BRIGHTDATA_CUSTOMER_ID, BRIGHTDATA_ZONE, BRIGHTDATA_PASSWORD) for competitive analysis");
  }

  if (features.jobProcessing) {
    enabledFeatures.push("Background Job Processing");
  } else {
    disabledFeatures.push("Background Job Processing (Missing Redis configuration)");
    recommendations.push("Configure Redis (REDIS_HOST, REDIS_PORT) for background job processing");
  }

  if (features.realTimeUpdates) {
    enabledFeatures.push("Real-time Updates");
  } else {
    disabledFeatures.push("Real-time Updates (Missing WebSocket URL)");
    recommendations.push("Configure NEXT_PUBLIC_WEBSOCKET_URL for real-time collaborative features");
  }

  if (features.advancedAnalytics) {
    enabledFeatures.push("Advanced Analytics");
  } else {
    disabledFeatures.push("Advanced Analytics (Missing Google Analytics credentials)");
    recommendations.push("Configure Google Analytics credentials for advanced analytics features");
  }

  // 3. Database connectivity check (Supabase)
  console.log("🗄️ Checking database connectivity...");
  try {
    // Import here to avoid circular dependencies
    const { supabase } = await import("@/lib/supabase/client");
    const { data, error } = await supabase.from("teams").select("count").limit(1);
    
    if (error) {
      errors.push(`Database connectivity failed: ${error.message}`);
    } else {
      enabledFeatures.push("Database Operations");
      console.log("✅ Database connectivity verified");
    }
  } catch (error) {
    errors.push(`Database connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // 4. External service checks (non-blocking)
  console.log("🌐 Checking external service connectivity...");
  
  // Redis check
  if (features.jobProcessing) {
    try {
      // This will be implemented when we create the Redis manager
      console.log("ℹ️ Redis connectivity check skipped (will be implemented with Redis manager)");
    } catch (error) {
      warnings.push(`Redis connectivity check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // OpenAI check
  if (features.aiFeatures) {
    try {
      // This will be implemented when we add the OpenAI connectivity check
      console.log("ℹ️ OpenAI connectivity check skipped (will be implemented with circuit breaker)");
    } catch (error) {
      warnings.push(`OpenAI connectivity check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // 5. Memory and system checks
  console.log("💾 Checking system resources...");
  const memoryUsage = process.memoryUsage();
  const memoryUsageMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  
  if (memoryUsageMB > 512) {
    warnings.push(`High memory usage detected: ${memoryUsageMB}MB (consider optimization)`);
  }

  console.log(`📊 Memory usage: ${memoryUsageMB}MB`);

  // Determine overall success
  const success = errors.length === 0;

  // Log results
  console.log("\n🎯 Startup Validation Results:");
  console.log(`Status: ${success ? "✅ SUCCESS" : "❌ FAILED"}`);
  console.log(`Enabled Features: ${enabledFeatures.length}`);
  console.log(`Disabled Features: ${disabledFeatures.length}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Warnings: ${warnings.length}`);

  if (enabledFeatures.length > 0) {
    console.log("\n✅ Enabled Features:");
    enabledFeatures.forEach(feature => console.log(`  • ${feature}`));
  }

  if (disabledFeatures.length > 0) {
    console.log("\n⚠️ Disabled Features:");
    disabledFeatures.forEach(feature => console.log(`  • ${feature}`));
  }

  if (errors.length > 0) {
    console.log("\n❌ Errors:");
    errors.forEach(error => console.log(`  • ${error}`));
  }

  if (warnings.length > 0) {
    console.log("\n⚠️ Warnings:");
    warnings.forEach(warning => console.log(`  • ${warning}`));
  }

  if (recommendations.length > 0) {
    console.log("\n💡 Recommendations:");
    recommendations.forEach(rec => console.log(`  • ${rec}`));
  }

  return {
    success,
    errors,
    warnings,
    enabledFeatures,
    disabledFeatures,
    recommendations,
  };
}

/**
 * Validates startup in development mode
 */
export async function validateStartupDevelopment(): Promise<void> {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  try {
    const result = await validateStartup();
    
    if (!result.success) {
      console.warn("\n⚠️ Development startup validation failed");
      console.warn("Some features may not work correctly");
      console.warn("Check the errors above and update your .env.local file");
    } else {
      console.log("\n🎉 All systems ready!");
    }
  } catch (error) {
    console.error("Startup validation error:", error);
  }
}

/**
 * Validates startup in production mode
 * Throws error for critical failures
 */
export async function validateStartupProduction(): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  try {
    const result = await validateStartup();
    
    if (!result.success) {
      const criticalErrors = result.errors.filter(error => 
        error.includes("Database") || 
        error.includes("Critical") ||
        error.includes("SUPABASE")
      );

      if (criticalErrors.length > 0) {
        throw new Error(`Critical startup validation failures:\n${criticalErrors.join('\n')}`);
      } else {
        console.warn("Non-critical startup validation issues detected");
        console.warn("Application will start with reduced functionality");
      }
    }
  } catch (error) {
    console.error("🚨 CRITICAL: Production startup validation failed");
    throw error;
  }
}