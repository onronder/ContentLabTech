/**
 * Production-grade base URL resolver for Vercel deployment
 * Handles server-side API calls with proper domain resolution
 */

/**
 * Get the base URL for API calls in different environments
 * Uses Vercel's automatically provided environment variables
 */
export const getApiBaseUrl = (): string => {
  // In Vercel production, use the VERCEL_URL environment variable
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Fallback to custom domain if configured
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Development fallback
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  // Final fallback for production without VERCEL_URL
  return "https://contentlab-nexus.vercel.app";
};

/**
 * Enhanced API endpoint resolver with comprehensive environment handling
 * Constructs absolute API endpoint URLs for server-side requests
 * Ensures all API calls work in production Vercel environment
 */
export const getApiEndpoint = (path: string): string => {
  const baseUrl = getApiBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const fullUrl = `${baseUrl}${cleanPath}`;

  // Validation logging for debugging
  if (
    process.env.NODE_ENV === "development" ||
    process.env.DEBUG_API === "true"
  ) {
    console.log("🎯 API Endpoint Resolution:", {
      inputPath: path,
      baseUrl,
      cleanPath,
      fullUrl,
      environment: {
        VERCEL_URL: process.env.VERCEL_URL,
        NODE_ENV: process.env.NODE_ENV,
        isProduction: process.env.NODE_ENV === "production",
        isVercel: !!process.env.VERCEL_URL,
      },
    });
  }

  return fullUrl;
};

/**
 * Get the current environment info for debugging
 */
export const getEnvironmentInfo = () => {
  return {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_URL: process.env.VERCEL_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    isProduction: process.env.NODE_ENV === "production",
    isVercel: !!process.env.VERCEL_URL,
    computedBaseUrl: getApiBaseUrl(),
  };
};

/**
 * Log environment info for debugging API routing issues
 */
export const debugApiRouting = () => {
  const env = getEnvironmentInfo();
  console.log("🔍 API Routing Debug:", env);
  return env;
};
