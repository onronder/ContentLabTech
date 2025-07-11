/**
 * Enhanced CSRF Provider
 * Eliminates console warnings and provides robust CSRF protection
 */

"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { fetch } from "@/lib/utils/fetch";

interface CSRFContextType {
  token: string | null;
  isReady: boolean;
  getCSRFHeaders: () => Record<string, string>;
  refreshToken: () => Promise<void>;
  error: string | null;
}

const CSRFContext = createContext<CSRFContextType | undefined>(undefined);

export const useCSRF = (): CSRFContextType => {
  const context = useContext(CSRFContext);
  if (!context) {
    throw new Error("useCSRF must be used within a CSRFProvider");
  }
  return context;
};

interface CSRFProviderProps {
  children: ReactNode;
}

export const CSRFProvider: React.FC<CSRFProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenCheckInterval, setTokenCheckInterval] =
    useState<NodeJS.Timeout | null>(null);

  // Get CSRF token from cookie
  const getTokenFromCookie = useCallback((): string | null => {
    if (typeof document === "undefined") {
      return null;
    }

    try {
      const match = document.cookie.match(/csrf-token=([^;]+)/);
      return match && match[1] ? decodeURIComponent(match[1]) : null;
    } catch (error) {
      console.error("❌ Error reading CSRF token from cookie:", error);
      return null;
    }
  }, []);

  // Request a new CSRF token from server
  const requestNewToken = useCallback(async (): Promise<string | null> => {
    try {
      console.log("🔄 Requesting new CSRF token");

      const response = await fetch("/api/csrf-token", {
        method: "GET",
        credentials: "include",
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get CSRF token: ${response.status}`);
      }

      const data = await response.json();

      if (data.token) {
        console.log("✅ New CSRF token received");
        return data.token;
      } else {
        throw new Error("No token in response");
      }
    } catch (error) {
      console.error("❌ Error requesting CSRF token:", error);
      setError(
        error instanceof Error ? error.message : "Failed to get CSRF token"
      );
      return null;
    }
  }, []);

  // Initialize CSRF token
  const initializeToken = useCallback(async () => {
    console.log("🛡️ Initializing CSRF protection");
    setError(null);

    // First, try to get token from cookie
    let currentToken = getTokenFromCookie();

    // If no token, request one from server
    if (!currentToken) {
      console.log("🔄 No CSRF token found, requesting new one");
      currentToken = await requestNewToken();
    }

    if (currentToken) {
      setToken(currentToken);
      console.log("✅ CSRF token initialized successfully");
    } else {
      setError("Failed to initialize CSRF token");
    }

    setIsReady(true);
  }, [getTokenFromCookie, requestNewToken]);

  // Refresh token
  const refreshToken = useCallback(async () => {
    console.log("🔄 Refreshing CSRF token");
    setError(null);

    const newToken = await requestNewToken();
    if (newToken) {
      setToken(newToken);
    }
  }, [requestNewToken]);

  // Get headers for requests
  const getCSRFHeaders = useCallback((): Record<string, string> => {
    if (!token) {
      console.warn("⚠️ CSRF token not available for request");
      return {};
    }

    return {
      "X-CSRF-Token": token,
    };
  }, [token]);

  // Monitor token changes
  const monitorToken = useCallback(() => {
    const currentToken = getTokenFromCookie();

    if (currentToken && currentToken !== token) {
      console.log("🔄 CSRF token updated from cookie");
      setToken(currentToken);
      setError(null);
    } else if (!currentToken && token) {
      console.log("⚠️ CSRF token missing from cookie");
      setError("CSRF token missing");
    }
  }, [token, getTokenFromCookie]);

  // Initialize on mount
  useEffect(() => {
    initializeToken();
  }, [initializeToken]);

  // Set up periodic token monitoring
  useEffect(() => {
    if (isReady) {
      console.log("👀 Starting CSRF token monitoring");

      const interval = setInterval(monitorToken, 30000); // Check every 30 seconds
      setTokenCheckInterval(interval);

      return () => {
        console.log("🛑 Stopping CSRF token monitoring");
        clearInterval(interval);
        setTokenCheckInterval(null);
      };
    }

    return undefined;
  }, [isReady, monitorToken]);

  // Listen for storage events (token changes in other tabs)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "csrf-token-update") {
        console.log("🔄 CSRF token update detected from another tab");
        const newToken = getTokenFromCookie();
        if (newToken) {
          setToken(newToken);
          setError(null);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [getTokenFromCookie]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tokenCheckInterval) {
        clearInterval(tokenCheckInterval);
      }
    };
  }, [tokenCheckInterval]);

  const contextValue: CSRFContextType = {
    token,
    isReady,
    getCSRFHeaders,
    refreshToken,
    error,
  };

  return (
    <CSRFContext.Provider value={contextValue}>{children}</CSRFContext.Provider>
  );
};

// Enhanced hook with automatic retry logic
export const useCSRFWithRetry = () => {
  const csrf = useCSRF();
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const makeRequestWithCSRF = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const headers = {
        ...options.headers,
        ...csrf.getCSRFHeaders(),
      };

      try {
        const response = await fetch(url, {
          ...options,
          headers,
          credentials: "include",
        });

        // If CSRF error, try to refresh token and retry
        if (response.status === 403 && retryCount < maxRetries) {
          console.log("🔄 CSRF error, refreshing token and retrying");
          await csrf.refreshToken();
          setRetryCount(prev => prev + 1);

          // Retry with new token
          const newHeaders = {
            ...options.headers,
            ...csrf.getCSRFHeaders(),
          };

          return fetch(url, {
            ...options,
            headers: newHeaders,
            credentials: "include",
          });
        }

        // Reset retry count on success
        if (response.ok) {
          setRetryCount(0);
        }

        return response;
      } catch (error) {
        console.error("❌ Request with CSRF failed:", error);
        throw error;
      }
    },
    [csrf, retryCount, maxRetries]
  );

  return {
    ...csrf,
    makeRequestWithCSRF,
    retryCount,
  };
};
