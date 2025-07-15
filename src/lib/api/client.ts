/**
 * Enhanced Production API Client
 * Comprehensive API client with production testing and error handling
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
  details?: any;
}

export interface ConnectionTestResult {
  success: boolean;
  status: "healthy" | "degraded" | "unhealthy";
  responseTime: number;
  error?: string;
}

export interface TeamInvitationRequest {
  email: string;
  role: "owner" | "admin" | "member" | "viewer";
}

export interface TeamInvitationResponse {
  invitation: {
    id: string;
    email: string;
    role: string;
    status: string;
    expires_at: string;
  };
  message: string;
}

export interface HealthCheckResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  database?: any;
  environment?: any;
  summary?: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
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
 * Production API Client Class
 */
class ProductionAPIClient {
  private baseURL: string;
  private timeout: number;
  private retryAttempts: number;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    this.timeout = 30000; // 30 seconds
    this.retryAttempts = 3;
  }

  /**
   * Test API connection with comprehensive health checks
   */
  async testConnection(): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseURL}/api/health/database`, {
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
        },
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        return {
          success: false,
          status: "unhealthy",
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data: HealthCheckResponse = await response.json();

      return {
        success: true,
        status: data.status,
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      if (error instanceof Error && error.name === "AbortError") {
        return {
          success: false,
          status: "unhealthy",
          responseTime,
          error: "Connection timeout",
        };
      }

      return {
        success: false,
        status: "unhealthy",
        responseTime,
        error:
          error instanceof Error ? error.message : "Unknown connection error",
      };
    }
  }

  /**
   * Test environment health
   */
  async testEnvironment(): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    try {
      const response = await this.fetchWithTimeout("/api/health/environment");
      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        return {
          success: false,
          status: "unhealthy",
          responseTime,
          error: `Environment check failed: ${response.status}`,
        };
      }

      const data = await response.json();

      return {
        success: true,
        status: data.status === "healthy" ? "healthy" : "degraded",
        responseTime,
      };
    } catch (error) {
      return {
        success: false,
        status: "unhealthy",
        responseTime: Date.now() - startTime,
        error:
          error instanceof Error ? error.message : "Environment test failed",
      };
    }
  }

  /**
   * Send team invitation with comprehensive error handling
   */
  async sendTeamInvitation(
    teamId: string,
    request: TeamInvitationRequest
  ): Promise<ApiResponse<TeamInvitationResponse>> {
    try {
      const response = await this.fetchWithTimeout(
        `/api/teams/${teamId}/invitations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `Request failed: ${response.status}`,
          code: data.code || "API_ERROR",
          details: data.details,
          status: response.status,
        };
      }

      return {
        success: true,
        data: data,
        status: response.status,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
        code: "NETWORK_ERROR",
        status: 0,
      };
    }
  }

  /**
   * Get team invitations
   */
  async getTeamInvitations(teamId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.fetchWithTimeout(
        `/api/teams/${teamId}/invitations`,
        {
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `Request failed: ${response.status}`,
          code: data.code || "API_ERROR",
          details: data.details,
          status: response.status,
        };
      }

      return {
        success: true,
        data: data,
        status: response.status,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
        code: "NETWORK_ERROR",
        status: 0,
      };
    }
  }

  /**
   * Cancel team invitation
   */
  async cancelTeamInvitation(
    teamId: string,
    invitationId: string
  ): Promise<ApiResponse<any>> {
    try {
      const response = await this.fetchWithTimeout(
        `/api/teams/${teamId}/invitations/${invitationId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `Request failed: ${response.status}`,
          code: data.code || "API_ERROR",
          details: data.details,
          status: response.status,
        };
      }

      return {
        success: true,
        data: data,
        status: response.status,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
        code: "NETWORK_ERROR",
        status: 0,
      };
    }
  }

  /**
   * Test authentication flow
   */
  async testAuthentication(): Promise<ApiResponse<any>> {
    try {
      // Test with a protected endpoint that requires auth
      const response = await this.fetchWithTimeout(
        "/api/teams/test/invitations",
        {
          credentials: "include",
        }
      );

      const data = await response.json();

      // If we get 401/403, auth is working (just not authenticated)
      // If we get 404, the endpoint exists but team doesn't
      // If we get 500, there's a server error
      if (response.status === 401 || response.status === 403) {
        return {
          success: true,
          data: {
            authenticated: false,
            authFlow: "working",
            message: "Authentication flow is functional",
          },
          status: response.status,
        };
      }

      if (response.status === 404) {
        return {
          success: true,
          data: {
            authenticated: false,
            authFlow: "working",
            message: "Authentication middleware is working (team not found)",
          },
          status: response.status,
        };
      }

      return {
        success: response.ok,
        data: data,
        status: response.status,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Auth test failed",
        code: "AUTH_TEST_ERROR",
        status: 0,
      };
    }
  }

  /**
   * Comprehensive API health check
   */
  async performHealthCheck(): Promise<{
    overall: "healthy" | "degraded" | "unhealthy";
    checks: {
      database: ConnectionTestResult;
      environment: ConnectionTestResult;
      authentication: ApiResponse<any>;
    };
    timestamp: string;
  }> {
    const [dbCheck, envCheck, authCheck] = await Promise.all([
      this.testConnection(),
      this.testEnvironment(),
      this.testAuthentication(),
    ]);

    // Determine overall status
    let overall: "healthy" | "degraded" | "unhealthy" = "healthy";

    const checks = [dbCheck, envCheck];
    const unhealthyCount = checks.filter(c => c.status === "unhealthy").length;
    const degradedCount = checks.filter(c => c.status === "degraded").length;

    if (unhealthyCount > 0) {
      overall = "unhealthy";
    } else if (degradedCount > 0 || !authCheck.success) {
      overall = "degraded";
    }

    return {
      overall,
      checks: {
        database: dbCheck,
        environment: envCheck,
        authentication: authCheck,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Utility method for fetch with timeout and retry
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    attempt = 1
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseURL}${url}`, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      // Retry on network errors (but not on timeout)
      if (
        attempt < this.retryAttempts &&
        error instanceof Error &&
        error.name !== "AbortError" &&
        (error.message.includes("fetch") || error.message.includes("network"))
      ) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        return this.fetchWithTimeout(url, options, attempt + 1);
      }

      throw error;
    }
  }
}

// Export enhanced client instance
export const productionApiClient = new ProductionAPIClient();

/**
 * Type-safe API endpoints (maintaining backward compatibility)
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

  // Enhanced team invitation endpoints
  teamInvitations: {
    list: (teamId: string) => productionApiClient.getTeamInvitations(teamId),
    send: (teamId: string, request: TeamInvitationRequest) =>
      productionApiClient.sendTeamInvitation(teamId, request),
    cancel: (teamId: string, invitationId: string) =>
      productionApiClient.cancelTeamInvitation(teamId, invitationId),
  },

  // Health check endpoints
  health: {
    database: () => productionApiClient.testConnection(),
    environment: () => productionApiClient.testEnvironment(),
    authentication: () => productionApiClient.testAuthentication(),
    comprehensive: () => productionApiClient.performHealthCheck(),
  },
};
