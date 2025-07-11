/**
 * Supabase API Key Validation
 * Security utilities for the new API key system
 */

// Validate legacy anon key format (JWT)
export const validateLegacyAnonKey = (key: string): boolean => {
  return key.startsWith("eyJ") && key.length > 100;
};

// Validate legacy service role key format (JWT)
export const validateLegacyServiceRoleKey = (key: string): boolean => {
  return key.startsWith("eyJ") && key.length > 100;
};

// Legacy validation functions for backward compatibility
export const validatePublishableKey = (key: string): boolean => {
  // Support both new and legacy formats during transition
  return key.startsWith("sb_publishable_") || key.startsWith("eyJ");
};

export const validateSecretKey = (key: string): boolean => {
  // Support both new and legacy formats during transition
  return key.startsWith("sb_secret_") || key.startsWith("eyJ");
};

// Validate environment configuration
export const validateEnvironmentConfig = () => {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  // Check for legacy keys first, then fallback to new keys
  const anonKey =
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ||
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];
  const serviceRoleKey =
    process.env["SUPABASE_SERVICE_ROLE_KEY"] ||
    process.env["SUPABASE_SECRET_KEY"];

  const errors: string[] = [];

  // Check required environment variables
  if (!url) {
    errors.push("Missing NEXT_PUBLIC_SUPABASE_URL");
  } else if (!url.includes("supabase.co")) {
    errors.push("Invalid NEXT_PUBLIC_SUPABASE_URL format");
  }

  if (!anonKey) {
    errors.push(
      "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  } else if (
    !validateLegacyAnonKey(anonKey) &&
    !validatePublishableKey(anonKey)
  ) {
    errors.push(
      "Invalid anon/publishable key format. Expected legacy JWT format (eyJ...) or new format (sb_publishable_...)"
    );
  }

  // Service role key is optional for client-side only applications
  if (
    serviceRoleKey &&
    !validateLegacyServiceRoleKey(serviceRoleKey) &&
    !validateSecretKey(serviceRoleKey)
  ) {
    errors.push(
      "Invalid service role/secret key format. Expected legacy JWT format (eyJ...) or new format (sb_secret_...)"
    );
  }

  // Environment is properly configured

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Browser security check
export const validateBrowserSecurity = () => {
  if (typeof window !== "undefined") {
    const serviceRoleKey = process.env["SUPABASE_SECRET_KEY"];
    if (serviceRoleKey) {
      console.error(
        "🚨 SECURITY VIOLATION: Service role key detected in browser environment! " +
          "Service role keys should only be used server-side."
      );
      return false;
    }
  }
  return true;
};

// Client-side safety check
export const ensureClientSideOnly = () => {
  if (typeof window === "undefined") {
    throw new Error(
      "This function can only be called in browser environment (client-side)"
    );
  }
};

// Server-side safety check
export const ensureServerSideOnly = () => {
  if (typeof window !== "undefined") {
    throw new Error(
      "This function can only be called in server environment (Node.js/Edge Functions)"
    );
  }
};

// Development warnings
export const checkDevelopmentWarnings = () => {
  if (process.env.NODE_ENV === "development") {
    const config = validateEnvironmentConfig();

    if (!config.isValid) {
      console.warn("⚠️  Supabase Configuration Issues:");
      config.errors.forEach(error => console.warn(`   - ${error}`));
    }

    // Check for placeholder values
    const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
    const publishableKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

    if (
      url?.includes("placeholder") ||
      publishableKey?.includes("placeholder")
    ) {
      console.warn(
        "⚠️  Using placeholder Supabase credentials. " +
          "Please update .env.local with your actual project credentials."
      );
    }
  }
};

// Configuration status helper
export const getConfigurationStatus = () => {
  const hasUrl = !!process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const hasAnonKey = !!process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];
  const hasPublishableKey = !!process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];
  const hasLegacyServiceKey = !!process.env["SUPABASE_SERVICE_ROLE_KEY"];
  const hasNewServiceKey = !!process.env["SUPABASE_SECRET_KEY"];

  const configured = hasUrl && (hasAnonKey || hasPublishableKey);
  const hasServiceKey = hasLegacyServiceKey || hasNewServiceKey;

  const keyType = hasAnonKey ? "legacy" : hasPublishableKey ? "new" : "none";

  return {
    configured,
    hasServiceKey,
    keyType,
    message: configured
      ? `✅ Supabase configuration is valid (${keyType} keys)`
      : "❌ Missing required Supabase configuration",
  };
};

// Initialize validation on module load
if (process.env.NODE_ENV === "development") {
  checkDevelopmentWarnings();
  validateBrowserSecurity();

  const config = getConfigurationStatus();
  console.log(`🔐 Supabase: ${config.message}`);
}
