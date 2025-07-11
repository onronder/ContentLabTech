/**
 * Production-grade global fetch wrapper for Vercel deployment
 * Automatically converts relative API URLs to absolute URLs
 * Maintains full compatibility with standard fetch API
 */

import { getApiEndpoint } from "./api";

// Global API call counter for debugging
let globalApiCallCounter = 0;

/**
 * Production-grade fetch wrapper that automatically handles URL resolution
 * Converts relative API URLs to absolute URLs for Vercel deployment
 * Maintains full compatibility with standard fetch API
 */
export const apiFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  let url: string;

  // Handle different input types
  if (typeof input === "string") {
    url = input;
  } else if (input instanceof URL) {
    url = input.toString();
  } else if (input instanceof Request) {
    url = input.url;
    // Preserve the original request init if not provided
    if (!init) {
      init = {
        method: input.method,
        headers: input.headers,
        body: input.body,
        mode: input.mode,
        credentials: input.credentials,
        cache: input.cache,
        redirect: input.redirect,
        referrer: input.referrer,
        referrerPolicy: input.referrerPolicy,
        integrity: input.integrity,
        keepalive: input.keepalive,
        signal: input.signal,
      };
    }
  } else {
    url = String(input);
  }

  // Convert relative API URLs to absolute URLs
  const isApiCall = url.startsWith("/api/");
  const resolvedUrl = isApiCall ? getApiEndpoint(url) : url;

  // Debug logging for production troubleshooting
  if (
    process.env.NODE_ENV === "development" ||
    process.env.DEBUG_API === "true"
  ) {
    if (isApiCall) {
      globalApiCallCounter++;
      console.log("🔗 Global Fetch Wrapper:", {
        callNumber: globalApiCallCounter,
        original: url,
        resolved: resolvedUrl,
        isApiCall,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
      });
    }
  }

  try {
    // Execute fetch with resolved URL
    const response = await fetch(resolvedUrl, init);

    // Log response status for API calls in debug mode
    if (
      isApiCall &&
      (process.env.NODE_ENV === "development" ||
        process.env.DEBUG_API === "true")
    ) {
      console.log("📡 Global Fetch Response:", {
        url: resolvedUrl,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });
    }

    return response;
  } catch (error) {
    // Enhanced error logging for API calls
    if (isApiCall) {
      console.error("❌ Global Fetch Error:", {
        url: resolvedUrl,
        originalUrl: url,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
    throw error;
  }
};

// Type-safe fetch replacement that maintains standard fetch signature
export const fetch = apiFetch as typeof globalThis.fetch;

// Default export for convenience
export default apiFetch;

// Re-export types for TypeScript compatibility
export type { RequestInfo, RequestInit, Response } from "undici-types";
