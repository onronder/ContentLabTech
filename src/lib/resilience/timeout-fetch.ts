/**
 * Enhanced Fetch with Timeout and Retry Logic
 * Replaces standard fetch with timeout, retry, and circuit breaker integration
 */

import { circuitBreakerManager } from "./circuit-breaker";
import { retryManager } from "./retry-manager";

export interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  retryCondition?: (error: Error) => boolean;
  circuitBreaker?: string;
  onRetry?: (attempt: number, error: Error) => void;
}

export interface FetchResult<T = unknown> {
  data?: T;
  error: Error | undefined;
  success: boolean;
  status?: number;
  fromCache?: boolean;
  fromCircuitBreaker?: boolean;
  attempts: number;
}

/**
 * Enhanced fetch with timeout, retries, and circuit breaker integration
 */
export async function timeoutFetch(
  url: string,
  options: FetchOptions = {}
): Promise<FetchResult> {
  const {
    timeout = 10000,
    retries = 3,
    retryDelay = 1000,
    retryCondition = defaultRetryCondition,
    circuitBreaker,
    onRetry,
    ...fetchOptions
  } = options;

  let lastError: Error | undefined;
  let attempts = 0;

  const executeRequest = async (): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  const performRequest = async (): Promise<Response> => {
    attempts++;

    try {
      const response = await executeRequest();

      // Check if response indicates an error
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      lastError = error as Error;

      // Handle timeout specifically
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Request timeout after ${timeout}ms`);
      }

      throw error;
    }
  };

  // Use circuit breaker if specified
  if (circuitBreaker) {
    const cb = circuitBreakerManager.getCircuitBreaker(circuitBreaker);
    
    const result = await cb.execute(
      async () => {
        for (let attempt = 1; attempt <= retries; attempt++) {
          try {
            const response = await performRequest();
            return response;
          } catch (error) {
            lastError = error as Error;

            // Check if we should retry
            if (attempt < retries && retryCondition(lastError)) {
              onRetry?.(attempt, lastError);
              await delay(retryDelay * Math.pow(1.5, attempt - 1)); // Exponential backoff
              continue;
            }

            throw error;
          }
        }
        throw lastError || new Error("Unknown error");
      },
      // Fallback function
      async () => {
        throw new Error(`Service ${circuitBreaker} is currently unavailable`);
      }
    );

    if (result.success && result.data) {
      try {
        const data = await (result.data as Response).json();
        return {
          data,
          error: undefined,
          success: true,
          status: (result.data as Response).status,
          fromCircuitBreaker: result.fromCircuitBreaker,
          attempts,
        };
      } catch (error) {
        return {
          error: error as Error,
          success: false,
          fromCircuitBreaker: result.fromCircuitBreaker,
          attempts,
        };
      }
    } else {
      return {
        error: result.error,
        success: false,
        fromCircuitBreaker: result.fromCircuitBreaker,
        attempts,
      };
    }
  }

  // Execute without circuit breaker
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await performRequest();
      const data = await response.json();

      return {
        data,
        error: undefined,
        success: true,
        status: response.status,
        attempts,
      };
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry
      if (attempt < retries && retryCondition(lastError)) {
        onRetry?.(attempt, lastError);
        await delay(retryDelay * Math.pow(1.5, attempt - 1)); // Exponential backoff
        continue;
      }

      break;
    }
  }

  return {
    error: lastError || new Error("Unknown error"),
    success: false,
    attempts,
  };
}

/**
 * Specialized fetch functions for different types of requests
 */

// JSON API requests
export async function fetchJSON<T = unknown>(
  url: string,
  options: FetchOptions = {}
): Promise<FetchResult<T>> {
  const result = await timeoutFetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  return result as FetchResult<T>;
}

// POST requests with JSON body
export async function postJSON<T = unknown>(
  url: string,
  data: unknown,
  options: FetchOptions = {}
): Promise<FetchResult<T>> {
  return fetchJSON<T>(url, {
    method: "POST",
    body: JSON.stringify(data),
    ...options,
  });
}

// PUT requests with JSON body
export async function putJSON<T = unknown>(
  url: string,
  data: unknown,
  options: FetchOptions = {}
): Promise<FetchResult<T>> {
  return fetchJSON<T>(url, {
    method: "PUT",
    body: JSON.stringify(data),
    ...options,
  });
}

// DELETE requests
export async function deleteResource<T = unknown>(
  url: string,
  options: FetchOptions = {}
): Promise<FetchResult<T>> {
  return fetchJSON<T>(url, {
    method: "DELETE",
    ...options,
  });
}

/**
 * Default retry condition - retry on network errors and 5xx status codes
 */
function defaultRetryCondition(error: Error): boolean {
  // Network errors
  if (error.message.includes("fetch") || error.message.includes("network")) {
    return true;
  }

  // Timeout errors
  if (error.message.includes("timeout")) {
    return true;
  }

  // 5xx server errors
  if (error.message.includes("HTTP 5")) {
    return true;
  }

  // 429 Too Many Requests
  if (error.message.includes("HTTP 429")) {
    return true;
  }

  // Don't retry on 4xx client errors (except 429)
  if (error.message.includes("HTTP 4")) {
    return false;
  }

  return false;
}

/**
 * Utility function for delays with jitter
 */
function delay(ms: number): Promise<void> {
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.1 * ms;
  return new Promise(resolve => setTimeout(resolve, ms + jitter));
}

/**
 * Wrapper for external API calls with standardized error handling
 */
export async function externalAPICall<T = unknown>(
  serviceName: string,
  url: string,
  options: FetchOptions = {}
): Promise<FetchResult<T>> {
  return fetchJSON<T>(url, {
    circuitBreaker: serviceName,
    timeout: 15000, // 15 seconds for external APIs
    retries: 3,
    retryDelay: 2000, // 2 seconds base delay
    onRetry: (attempt, error) => {
      console.warn(`[${serviceName}] Retry attempt ${attempt}:`, error.message);
    },
    ...options,
  });
}

/**
 * Enhanced wrapper using the centralized retry manager
 */
export async function externalAPICallWithRetryManager<T = unknown>(
  serviceName: string,
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const { timeout = 15000, ...fetchOptions } = options;

  const result = await retryManager.executeWithRetry(
    serviceName,
    async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json() as T;
      } catch (error) {
        clearTimeout(timeoutId);
        
        // Handle timeout specifically
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error(`Request timeout after ${timeout}ms`);
        }
        
        throw error;
      }
    }
  );

  if (result.success && result.result !== undefined) {
    return result.result;
  }

  throw result.error || new Error("External API call failed");
}

/**
 * Pre-configured functions for specific external services
 */

// OpenAI API calls
export const openAIFetch = <T = unknown>(url: string, options: FetchOptions = {}) =>
  externalAPICall<T>("openai", url, {
    headers: {
      "Authorization": `Bearer ${process.env["OPENAI_API_KEY"]}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

// BrightData API calls
export const brightDataFetch = <T = unknown>(url: string, options: FetchOptions = {}) =>
  externalAPICall<T>("brightdata", url, {
    timeout: 30000, // 30 seconds for SERP data
    ...options,
  });

// Google Analytics API calls
export const googleAnalyticsFetch = <T = unknown>(url: string, options: FetchOptions = {}) =>
  externalAPICall<T>("google-analytics", url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

// Supabase API calls (for external functions)
export const supabaseFetch = <T = unknown>(url: string, options: FetchOptions = {}) =>
  externalAPICall<T>("supabase", url, {
    retries: 2, // Fewer retries for database calls
    retryDelay: 1000,
    ...options,
  });