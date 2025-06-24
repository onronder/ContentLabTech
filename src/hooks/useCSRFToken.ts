/**
 * CSRF Token Hook
 * Provides CSRF token for secure form submissions
 */

import { useEffect, useState } from "react";

export function useCSRFToken() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Get CSRF token from cookie
    const getCSRFToken = () => {
      const cookies = document.cookie.split(";");
      const csrfCookie = cookies.find(cookie =>
        cookie.trim().startsWith("csrf-token=")
      );

      if (csrfCookie) {
        return csrfCookie.split("=")[1];
      }

      return null;
    };

    setToken(getCSRFToken() || null);
  }, []);

  return token;
}

// Helper function to get CSRF headers for fetch requests
export function getCSRFHeaders(): HeadersInit {
  const cookies = document.cookie.split(";");
  const csrfCookie = cookies.find(cookie =>
    cookie.trim().startsWith("csrf-token=")
  );

  if (csrfCookie) {
    const token = csrfCookie.split("=")[1];
    if (token) {
      return {
        "X-CSRF-Token": token,
      };
    }
  }

  return {};
}
