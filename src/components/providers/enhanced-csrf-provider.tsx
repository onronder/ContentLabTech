/**
 * Enhanced CSRF Provider
 * Manages CSRF tokens with automatic refresh and error handling
 */

"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

interface CSRFContextType {
  token: string | null;
  isLoading: boolean;
  refreshToken: () => Promise<void>;
  getHeaders: () => Record<string, string>;
  error: string | null;
}

const CSRFContext = createContext<CSRFContextType | undefined>(undefined);

export function useCSRF() {
  const context = useContext(CSRFContext);
  if (context === undefined) {
    throw new Error("useCSRF must be used within a CSRFProvider");
  }
  return context;
}

interface CSRFProviderProps {
  children: React.ReactNode;
}

export function EnhancedCSRFProvider({ children }: CSRFProviderProps) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshToken = useCallback(async () => {
    try {
      console.log("🛡️ CSRF: Refreshing token");
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/csrf-token", {
        method: "GET",
        credentials: "include",
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.token) {
          setToken(data.token);
          console.log("✅ CSRF: Token refreshed successfully");
        } else {
          throw new Error(data.error || "Failed to get valid token");
        }
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to refresh CSRF token";
      console.error("❌ CSRF: Token refresh failed:", errorMessage);
      setError(errorMessage);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getHeaders = useCallback((): Record<string, string> => {
    if (!token) {
      console.warn("⚠️ CSRF: No token available for request headers");
      return {};
    }

    return {
      "X-CSRF-Token": token,
    };
  }, [token]);

  // Initialize token on mount
  useEffect(() => {
    let mounted = true;

    const initializeToken = async () => {
      console.log("🛡️ CSRF: Initializing token");

      // First check if token exists in cookie
      const existingToken = getTokenFromCookie();
      if (existingToken) {
        console.log("🛡️ CSRF: Using existing token from cookie");
        setToken(existingToken);
        setIsLoading(false);
        return;
      }

      // If no cookie token, fetch from server
      if (mounted) {
        await refreshToken();
      }
    };

    initializeToken();

    return () => {
      mounted = false;
    };
  }, [refreshToken]);

  // Set up periodic token refresh
  useEffect(() => {
    if (!token || isLoading) return;

    console.log("🛡️ CSRF: Setting up periodic token refresh");

    // Refresh token every 30 minutes
    const interval = setInterval(
      () => {
        console.log("🛡️ CSRF: Periodic token refresh");
        refreshToken();
      },
      30 * 60 * 1000
    );

    return () => {
      console.log("🛡️ CSRF: Clearing periodic token refresh");
      clearInterval(interval);
    };
  }, [token, isLoading, refreshToken]);

  // Listen for storage events (token changes in other tabs)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "csrf-token-update") {
        console.log("🛡️ CSRF: Token update detected from another tab");
        const newToken = getTokenFromCookie();
        if (newToken && newToken !== token) {
          setToken(newToken);
          setError(null);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [token]);

  const contextValue: CSRFContextType = {
    token,
    isLoading,
    refreshToken,
    getHeaders,
    error,
  };

  return (
    <CSRFContext.Provider value={contextValue}>{children}</CSRFContext.Provider>
  );
}

/**
 * Get CSRF token from cookie
 */
function getTokenFromCookie(): string | null {
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
    console.error("❌ CSRF: Error reading token from cookie:", error);
    return null;
  }
}

/**
 * Enhanced API client hook with CSRF protection
 */
export function useCSRFProtectedFetch() {
  const { getHeaders, refreshToken, token, isLoading } = useCSRF();

  const safeFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      // Wait for token to be ready
      if (isLoading) {
        console.log("🛡️ CSRF: Waiting for token to be ready");
        await new Promise(resolve => {
          const checkToken = () => {
            if (!isLoading) {
              resolve(void 0);
            } else {
              setTimeout(checkToken, 100);
            }
          };
          checkToken();
        });
      }

      const headers = new Headers(options.headers);

      // Add CSRF headers
      const csrfHeaders = getHeaders();
      Object.entries(csrfHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });

      // Ensure credentials are included
      const requestOptions: RequestInit = {
        ...options,
        headers,
        credentials: "include",
      };

      console.log("🛡️ CSRF: Making protected request", {
        url,
        method: options.method || "GET",
        hasCSRFToken: !!token,
        headers: Object.fromEntries(headers.entries()),
      });

      try {
        const response = await fetch(url, requestOptions);

        // If CSRF error, try to refresh token and retry once
        if (response.status === 403) {
          const errorData = await response.json().catch(() => ({}));
          if (
            errorData.code === "CSRF_TOKEN_INVALID" ||
            errorData.error?.includes("CSRF")
          ) {
            console.log("🛡️ CSRF: Token invalid, refreshing and retrying");
            await refreshToken();

            // Retry with new token
            const newHeaders = new Headers(options.headers);
            const newCSRFHeaders = getHeaders();
            Object.entries(newCSRFHeaders).forEach(([key, value]) => {
              newHeaders.set(key, value);
            });

            return fetch(url, {
              ...options,
              headers: newHeaders,
              credentials: "include",
            });
          }
        }

        return response;
      } catch (error) {
        console.error("🛡️ CSRF: Protected fetch failed:", error);
        throw error;
      }
    },
    [getHeaders, refreshToken, token, isLoading]
  );

  return { safeFetch, isReady: !isLoading && !!token };
}
