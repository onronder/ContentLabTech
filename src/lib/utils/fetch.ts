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
 * CRITICAL: Always includes authentication cookies for API calls
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

  // CRITICAL: Always include authentication cookies for API calls
  const enhancedInit: RequestInit = {
    ...init,
    // Force credentials: "include" for all API calls to ensure cookies are sent
    credentials: isApiCall ? "include" : init?.credentials || "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  };

  try {
    // Execute fetch with resolved URL and enhanced options
    const response = await fetch(resolvedUrl, enhancedInit);

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
        credentials: enhancedInit.credentials,
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

/**
 * Authenticated API wrapper that handles authentication errors gracefully
 * Provides comprehensive error handling for authentication failures
 */
export const authenticatedFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  // Ensure this is treated as an API call
  const apiUrl = url.startsWith("/api/")
    ? url
    : `/api${url.startsWith("/") ? "" : "/"}${url}`;

  try {
    const response = await apiFetch(apiUrl, options);

    // Handle authentication failures
    if (response.status === 401) {
      console.error("🔐 Authentication Error:", {
        url: apiUrl,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });

      // Try to get response body for more details
      try {
        const errorData = await response.clone().json();
        console.error("🔐 Authentication Error Details:", errorData);
      } catch (parseError) {
        console.warn("Could not parse authentication error response");
      }

      // Throw a descriptive error
      throw new Error("Authentication required - please log in");
    }

    return response;
  } catch (error) {
    // Re-throw authentication errors
    if (
      error instanceof Error &&
      error.message.includes("Authentication required")
    ) {
      throw error;
    }

    // Log and re-throw other errors
    console.error("❌ Authenticated Fetch Error:", {
      url: apiUrl,
      error: error instanceof Error ? error.message : error,
    });

    throw error;
  }
};

/**
 * Convenience methods for authenticated API calls
 */
export const authenticatedApi = {
  get: async (url: string, options: RequestInit = {}) =>
    authenticatedFetch(url, { ...options, method: "GET" }),

  post: async (url: string, data?: any, options: RequestInit = {}) =>
    authenticatedFetch(url, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: async (url: string, data?: any, options: RequestInit = {}) =>
    authenticatedFetch(url, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: async (url: string, data?: any, options: RequestInit = {}) =>
    authenticatedFetch(url, {
      ...options,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: async (url: string, options: RequestInit = {}) =>
    authenticatedFetch(url, { ...options, method: "DELETE" }),
};

// Type-safe fetch replacement that maintains standard fetch signature
export const fetch = apiFetch as typeof globalThis.fetch;

// Default export for convenience
export default apiFetch;

// Re-export types for TypeScript compatibility
export type { RequestInfo, RequestInit, Response } from "undici-types";
