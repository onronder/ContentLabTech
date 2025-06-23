/**
 * Supabase API Key Validation
 * Security utilities for the new API key system
 */

// Validate publishable key format
export const validatePublishableKey = (key: string): boolean => {
  return key.startsWith("sb_publishable_") && key.length > 20;
};

// Validate secret key format
export const validateSecretKey = (key: string): boolean => {
  return key.startsWith("sb_secret_") && key.length > 20;
};

// Validate environment configuration
export const validateEnvironmentConfig = () => {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const publishableKey = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
  const secretKey = process.env["SUPABASE_SECRET_KEY"];

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
      "Invalid NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY format (expected: sb_publishable_...)"
    );
  }

  // Secret key is optional for client-side only applications
  if (secretKey && !validateSecretKey(secretKey)) {
    errors.push("Invalid SUPABASE_SECRET_KEY format (expected: sb_secret_...)");
  }

  // Check for legacy keys (should be removed)
  const legacyAnonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];
  const legacyServiceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (legacyAnonKey) {
    errors.push(
      "Legacy NEXT_PUBLIC_SUPABASE_ANON_KEY detected - please remove and use NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    );
  }

  if (legacyServiceKey) {
    errors.push(
      "Legacy SUPABASE_SERVICE_ROLE_KEY detected - please remove and use SUPABASE_SECRET_KEY"
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Browser security check
export const validateBrowserSecurity = () => {
  if (typeof window !== "undefined") {
    const secretKey = process.env["SUPABASE_SECRET_KEY"];
    if (secretKey) {
      console.error(
        "🚨 SECURITY VIOLATION: Secret key detected in browser environment! " +
          "Secret keys should only be used server-side."
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
      url?.includes("your-project") ||
      publishableKey?.includes("your_key_here")
    ) {
      console.warn(
        "⚠️  Using placeholder Supabase credentials. " +
          "Please update .env.local with your actual project credentials."
      );
    }
  }
};

// API key migration helper
export const getMigrationStatus = () => {
  const hasPublishableKey =
    !!process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
  const hasSecretKey = !!process.env["SUPABASE_SECRET_KEY"];
  const hasLegacyAnonKey = !!process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];
  const hasLegacyServiceKey = !!process.env["SUPABASE_SERVICE_ROLE_KEY"];

  const status = {
    migrated: hasPublishableKey && !hasLegacyAnonKey && !hasLegacyServiceKey,
    partial:
      (hasPublishableKey || hasSecretKey) &&
      (hasLegacyAnonKey || hasLegacyServiceKey),
    legacy:
      !hasPublishableKey &&
      !hasSecretKey &&
      (hasLegacyAnonKey || hasLegacyServiceKey),
    unconfigured:
      !hasPublishableKey &&
      !hasSecretKey &&
      !hasLegacyAnonKey &&
      !hasLegacyServiceKey,
  };

  return {
    ...status,
    message: status.migrated
      ? "✅ Successfully migrated to new API key system"
      : status.partial
        ? "⚠️  Partial migration - please remove legacy keys"
        : status.legacy
          ? "❌ Using legacy API keys - migration required"
          : "❌ No API keys configured",
  };
};

// Initialize validation on module load
if (process.env.NODE_ENV === "development") {
  checkDevelopmentWarnings();
  validateBrowserSecurity();

  const migration = getMigrationStatus();
  console.warn(`🔐 Supabase API Keys: ${migration.message}`);
}
