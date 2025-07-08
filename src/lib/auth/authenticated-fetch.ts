/**
 * Production-Grade Authenticated Fetch Wrapper
 * Handles authentication, CSRF tokens, and error handling consistently
 */

interface AuthenticatedFetchOptions extends RequestInit {
  requireAuth?: boolean;
  includeCsrf?: boolean;
  retryOnAuth?: boolean;
}

interface AuthContext {
  session: any;
  refreshSession?: () => Promise<void>;
}

class AuthenticationError extends Error {
  constructor(
    message: string,
    public code = "AUTH_ERROR"
  ) {
    super(message);
    this.name = "AuthenticationError";
  }
}

class CSRFError extends Error {
  constructor(message = "CSRF token validation failed") {
    super(message);
    this.name = "CSRFError";
  }
}

/**
 * Production-grade authenticated fetch that handles all auth scenarios
 */
export async function authenticatedFetch(
  url: string,
  options: AuthenticatedFetchOptions = {},
  authContext?: AuthContext
): Promise<Response> {
  const {
    requireAuth = true,
    includeCsrf = true,
    retryOnAuth = true,
    headers: customHeaders = {},
    ...fetchOptions
  } = options;

  console.log(`🌐 Authenticated Fetch: ${fetchOptions.method || "GET"} ${url}`);

  // Build headers systematically
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(customHeaders as Record<string, string>),
  };

  // 1. Add Authentication Headers
  if (requireAuth && authContext?.session?.access_token) {
    headers["Authorization"] = `Bearer ${authContext.session.access_token}`;
    console.log("🔐 Bearer token added");
  }

  // 2. Add CSRF Token (production requirement)
  if (includeCsrf && typeof document !== "undefined") {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers["x-csrf-token"] = csrfToken;
      console.log("🛡️ CSRF token added");
    } else if (requireAuth) {
      console.warn("⚠️ CSRF token not found - this may cause issues");
    }
  }

  // 3. Make the request
  const response = await fetch(url, {
    ...fetchOptions,
    headers,
    credentials: "include", // Always include cookies for session-based auth
  });

  console.log(`📡 Response: ${response.status} ${response.statusText}`);

  // 4. Handle authentication errors with proper retry logic
  if (response.status === 401 && requireAuth && retryOnAuth) {
    console.log("🔄 401 detected, attempting session refresh...");

    if (authContext?.refreshSession) {
      try {
        await authContext.refreshSession();
        console.log("✅ Session refreshed, retrying request...");

        // Retry the request once with new session
        return authenticatedFetch(
          url,
          { ...options, retryOnAuth: false },
          authContext
        );
      } catch (refreshError) {
        console.error("❌ Session refresh failed:", refreshError);
        throw new AuthenticationError(
          "Session expired and refresh failed. Please log in again.",
          "SESSION_REFRESH_FAILED"
        );
      }
    } else {
      throw new AuthenticationError(
        "Authentication required. Please log in.",
        "AUTHENTICATION_REQUIRED"
      );
    }
  }

  // 5. Handle CSRF errors specifically
  if (response.status === 403) {
    const responseText = await response.text();
    if (responseText.includes("CSRF")) {
      throw new CSRFError(
        "CSRF token validation failed. Please refresh the page."
      );
    }
  }

  // 6. Handle other HTTP errors
  if (!response.ok && response.status >= 400) {
    let errorMessage = `Request failed with status ${response.status}`;
    let errorCode = "HTTP_ERROR";

    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
      errorCode = errorData.code || errorCode;
    } catch {
      // Response is not JSON, use default message
    }

    const error = new Error(errorMessage) as Error & {
      code: string;
      status: number;
    };
    error.code = errorCode;
    error.status = response.status;
    throw error;
  }

  return response;
}

/**
 * Get CSRF token from cookies
 */
function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie.match(/csrf-token=([^;]+)/);
  return match ? match[1] || null : null;
}

/**
 * React hook for authenticated API calls
 */
export function useAuthenticatedFetch() {
  // This would be imported from your auth context
  // For now, we'll get it from window or props
  const getAuthContext = (): AuthContext | undefined => {
    // You can integrate this with your useAuth hook
    if (typeof window !== "undefined") {
      return (window as any).__AUTH_CONTEXT__;
    }
    return undefined;
  };

  const authenticatedFetchWithContext = async (
    url: string,
    options: AuthenticatedFetchOptions = {}
  ) => {
    const authContext = getAuthContext();
    return authenticatedFetch(url, options, authContext);
  };

  return {
    authenticatedFetch: authenticatedFetchWithContext,
    AuthenticationError,
    CSRFError,
  };
}

/**
 * Convenience methods for common HTTP operations
 */
export const authApi = {
  get: (url: string, options: Omit<AuthenticatedFetchOptions, "method"> = {}) =>
    authenticatedFetch(url, { ...options, method: "GET" }),

  post: (
    url: string,
    body?: any,
    options: Omit<AuthenticatedFetchOptions, "method" | "body"> = {}
  ) =>
    authenticatedFetch(url, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : null,
    }),

  put: (
    url: string,
    body?: any,
    options: Omit<AuthenticatedFetchOptions, "method" | "body"> = {}
  ) =>
    authenticatedFetch(url, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : null,
    }),

  delete: (
    url: string,
    options: Omit<AuthenticatedFetchOptions, "method"> = {}
  ) => authenticatedFetch(url, { ...options, method: "DELETE" }),
};

export { AuthenticationError, CSRFError };
