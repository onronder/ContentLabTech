/**
 * Supabase API Key Validation
 * Security utilities for the new API key system
 */

// Validate publishable key format
export const validatePublishableKey = (key: string): boolean => {
  return key.startsWith("sb_publishable_") && key.length > 80;
};

// Validate secret key format
export const validateSecretKey = (key: string): boolean => {
  return key.startsWith("sb_secret_") && key.length > 80;
};

// Validate environment configuration
export const validateEnvironmentConfig = () => {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const publishableKey = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
  const serviceRoleKey = process.env["SUPABASE_SECRET_KEY"];

  const errors: string[] = [];

  // Check required environment variables
  if (!url) {
    errors.push("Missing NEXT_PUBLIC_SUPABASE_URL");
  } else if (!url.includes("supabase.co")) {
    errors.push("Invalid NEXT_PUBLIC_SUPABASE_URL format");
  }

  if (!publishableKey) {
    errors.push("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  } else if (!validatePublishableKey(publishableKey)) {
    errors.push(
      "Invalid NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY format (must start with 'sb_publishable_' and be >80 chars)"
    );
  }

  // Service role key is optional for client-side only applications
  if (serviceRoleKey && !validateSecretKey(serviceRoleKey)) {
    errors.push(
      "Invalid SUPABASE_SECRET_KEY format (must start with 'sb_secret_' and be >80 chars)"
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
    const publishableKey = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];

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
  const hasPublishableKey =
    !!process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
  const hasServiceKey = !!process.env["SUPABASE_SECRET_KEY"];

  const configured = hasUrl && hasPublishableKey;

  return {
    configured,
    hasServiceKey,
    message: configured
      ? "✅ Supabase configuration is valid"
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
