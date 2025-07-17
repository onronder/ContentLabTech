import React from "react";
import { competitiveCircuitBreaker } from "./circuit-breaker";

// Request debouncer to prevent infinite loops
class RequestDebouncer {
  private activeRequests = new Map<string, Promise<any>>();
  private requestCounts = new Map<string, number>();
  private resetTimeouts = new Map<string, NodeJS.Timeout>();

  async execute<T>(
    key: string,
    operation: () => Promise<T>,
    maxRequests = 5,
    resetWindow = 60000 // 1 minute
  ): Promise<T> {
    // Check if we're already making this request
    const activeRequest = this.activeRequests.get(key);
    if (activeRequest) {
      return activeRequest;
    }

    // Check request count
    const currentCount = this.requestCounts.get(key) || 0;
    if (currentCount >= maxRequests) {
      throw new Error(
        `Too many requests for ${key}. Please wait before retrying.`
      );
    }

    // Increment request count
    this.requestCounts.set(key, currentCount + 1);

    // Set up reset timeout
    const existingTimeout = this.resetTimeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(() => {
      this.requestCounts.set(key, 0);
      this.resetTimeouts.delete(key);
    }, resetWindow);
    this.resetTimeouts.set(key, timeout);

    // Execute the operation
    const promise = operation();
    this.activeRequests.set(key, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this.activeRequests.delete(key);
    }
  }
}

const requestDebouncer = new RequestDebouncer();

// Safe API request wrapper
export const safeApiRequest = async <T>(
  url: string,
  options: RequestInit = {},
  requestKey?: string
): Promise<T> => {
  const key = requestKey || `${options.method || "GET"}_${url}`;

  return requestDebouncer.execute(key, async () => {
    return competitiveCircuitBreaker.execute(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    });
  });
};

// Safe data fetching hook wrapper
export const withSafeDataFetching = <T>(
  fetchFunction: () => Promise<T>,
  fallbackData: T,
  errorCallback?: (error: Error) => void
) => {
  return async (): Promise<T> => {
    try {
      const result = await fetchFunction();
      return result;
    } catch (error) {
      console.error("Data fetching error:", error);
      if (errorCallback) {
        errorCallback(error as Error);
      }
      return fallbackData;
    }
  };
};

// Prevent infinite re-renders in components
export const useStableCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  const ref = React.useRef<T>(callback);
  const depsRef = React.useRef<React.DependencyList>(deps);

  if (
    !depsRef.current ||
    !deps.every((dep, index) => dep === depsRef.current?.[index])
  ) {
    ref.current = callback;
    depsRef.current = deps;
  }

  return ref.current;
};
