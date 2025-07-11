/**
 * Authenticated API Client
 * Centralized API client with proper authentication handling
 * Production-ready with absolute URL resolution for Vercel deployment
 */

import { getApiEndpoint, debugApiRouting } from "@/lib/utils/api";

export interface ApiRequestOptions extends RequestInit {
  /** URL search parameters */
  params?: Record<string, string | number | boolean | undefined>;
  /** Additional headers to include */
  headers?: Record<string, string>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  status: number;
  timestamp?: string;
}

/**
 * Get CSRF token from cookie for server-side requests
 */
function getCSRFToken(): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  try {
    const cookies = document.cookie.split(";");
    const csrfCookie = cookies.find(cookie =>
      cookie.trim().startsWith("csrf-token=")
    );

    if (csrfCookie) {
      const token = csrfCookie.split("=")[1];
      return token ? decodeURIComponent(token) : null;
    }

    return null;
  } catch (error) {
    console.error("❌ API Client: Error reading CSRF token:", error);
    return null;
  }
}

/**
 * Make authenticated API request with proper credentials and CSRF protection
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const { params, headers = {}, ...fetchOptions } = options;

  // Convert relative endpoint to absolute URL for production
  let absoluteUrl = getApiEndpoint(endpoint);

  // Build URL with params
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    if (searchParams.toString()) {
      absoluteUrl += `?${searchParams.toString()}`;
    }
  }

  // Debug API routing in development/production
  const envInfo = debugApiRouting();
  console.log(`🔗 API URL Resolution:`, {
    originalEndpoint: endpoint,
    absoluteUrl,
    environment: envInfo,
  });

  // Get CSRF token for protection
  const csrfToken = getCSRFToken();

  // Default fetch options with authentication and CSRF protection
  const requestOptions: RequestInit = {
    method: "GET",
    credentials: "include", // Include cookies for session auth
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken && { "X-CSRF-Token": csrfToken }),
      ...headers,
    },
    ...fetchOptions,
  };

  console.log(`🌐 API Request: ${requestOptions.method} ${absoluteUrl}`, {
    options: requestOptions,
    originalEndpoint: endpoint,
    absoluteUrl,
    params,
  });

  try {
    const response = await fetch(absoluteUrl, requestOptions);

    console.log(`📡 API Response: ${response.status} ${response.statusText}`, {
      status: response.status,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
    });

    // Parse response
    let data: any;
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : null;
    } catch (parseError) {
      console.error("Failed to parse API response:", parseError);
      return {
        success: false,
        error: "Invalid response format",
        status: response.status,
      };
    }

    if (!response.ok) {
      console.error(`❌ API Error: ${response.status}`, data);
      return {
        success: false,
        error:
          data?.error ||
          data?.message ||
          `Request failed with status ${response.status}`,
        code: data?.code,
        status: response.status,
      };
    }

    console.log(`✅ API Success:`, data);
    return {
      success: true,
      data: data?.data || data,
      status: response.status,
      timestamp: data?.timestamp,
    };
  } catch (error) {
    console.error("🚨 API Request failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
      status: 0,
    };
  }
}

/**
 * Convenience methods for common HTTP methods
 */
export const api = {
  get: <T = any>(
    endpoint: string,
    options?: Omit<ApiRequestOptions, "method">
  ) => apiRequest<T>(endpoint, { ...options, method: "GET" }),

  post: <T = any>(
    endpoint: string,
    data?: any,
    options?: Omit<ApiRequestOptions, "method" | "body">
  ) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T = any>(
    endpoint: string,
    data?: any,
    options?: Omit<ApiRequestOptions, "method" | "body">
  ) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T = any>(
    endpoint: string,
    data?: any,
    options?: Omit<ApiRequestOptions, "method" | "body">
  ) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T = any>(
    endpoint: string,
    options?: Omit<ApiRequestOptions, "method">
  ) => apiRequest<T>(endpoint, { ...options, method: "DELETE" }),
};

/**
 * Type-safe API endpoints
 */
export const endpoints = {
  analytics: (teamId: string, params?: Record<string, any>) =>
    api.get("/api/analytics", { params: { teamId, ...params } }),

  content: (teamId: string, params?: Record<string, any>) =>
    api.get("/api/content", { params: { teamId, ...params } }),

  projects: (teamId: string, params?: Record<string, any>) =>
    api.get("/api/projects", { params: { teamId, ...params } }),

  teams: () => api.get("/api/teams"),

  createProject: (data: any) => api.post("/api/projects", data),

  createContent: (data: any) => api.post("/api/content", data),
};
