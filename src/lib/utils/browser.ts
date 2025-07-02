/**
 * Browser Utilities - SSR-Safe Browser Operations
 * Prevents hydration errors and browser crashes
 */

import { useState, useEffect } from "react";

// Safe localStorage operations
export const getFromLocalStorage = (key: string): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const setToLocalStorage = (key: string, value: string): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Silently fail in case of storage quotas or other issues
  }
};

export const removeFromLocalStorage = (key: string): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    // Silently fail
  }
};

// Safe window operations
export const safeWindowOperation = (operation: () => void): void => {
  if (typeof window !== "undefined") {
    try {
      operation();
    } catch (error) {
      console.error("Window operation failed:", error);
    }
  }
};

export const safeReload = (): void => {
  safeWindowOperation(() => window.location.reload());
};

export const safeRedirect = (url: string): void => {
  safeWindowOperation(() => {
    window.location.href = url;
  });
};

export const getWindowOrigin = (): string => {
  if (typeof window === "undefined") return "";
  return window.location.origin;
};

export const getWindowWidth = (): number => {
  if (typeof window === "undefined") return 0;
  return window.innerWidth;
};

// Hook for safe window width

export const useWindowWidth = () => {
  const [windowWidth, setWindowWidth] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateWidth = () => setWindowWidth(window.innerWidth);
    updateWidth();

    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  return windowWidth;
};

// Safe check for client-side rendering
export const isClient = typeof window !== "undefined";

// Safe check for server-side rendering
export const isServer = typeof window === "undefined";
