/**
 * Authenticated API Client
 * Centralized API client with proper authentication handling
 */

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
 * Make authenticated API request with proper credentials
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const { params, headers = {}, ...fetchOptions } = options;

  // Build URL with params
  let url = endpoint;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    if (searchParams.toString()) {
      url += `?${searchParams.toString()}`;
    }
  }

  // Default fetch options with authentication
  const requestOptions: RequestInit = {
    method: "GET",
    credentials: "include", // Include cookies for session auth
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    ...fetchOptions,
  };

  console.log(`🌐 API Request: ${requestOptions.method} ${url}`, {
    options: requestOptions,
    endpoint,
    params,
  });

  try {
    const response = await fetch(url, requestOptions);

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
