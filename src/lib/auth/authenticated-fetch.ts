/**
 * Production-Grade Authenticated Fetch Wrapper
 * Integrated with comprehensive error management and CSRF handling
 */

import { productionErrorManager, ErrorCategory } from '@/lib/errors/production-error-manager';
import { csrfManager } from '@/lib/auth/csrf-manager';
import { productionAuthManager } from '@/lib/auth/production-auth-manager';

interface AuthenticatedFetchOptions extends RequestInit {
  requireAuth?: boolean;
  includeCsrf?: boolean;
  retryOnAuth?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number, error: ErrorCategory) => void;
  onProgress?: (progress: number, status: string) => void;
}

interface AuthContext {
  session: any;
  refreshSession?: () => Promise<void>;
}

export class AuthenticationError extends Error {
  constructor(
    message: string,
    public code = "AUTH_ERROR"
  ) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class CSRFError extends Error {
  constructor(message = "CSRF token validation failed") {
    super(message);
    this.name = "CSRFError";
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code = "NETWORK_ERROR"
  ) {
    super(message);
    this.name = "NetworkError";
  }
}

/**
 * Production-grade authenticated fetch with comprehensive error handling
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
    maxRetries = 3,
    retryDelay = 1000,
    onRetry,
    onProgress,
    headers: customHeaders = {},
    ...fetchOptions
  } = options;

  console.log(`🌐 Enhanced Fetch: ${fetchOptions.method || "GET"} ${url}`);
  onProgress?.(10, 'Preparing request...');

  let attemptCount = 0;
  let lastError: ErrorCategory | null = null;

  while (attemptCount <= maxRetries) {
    try {
      onProgress?.(20 + (attemptCount * 20), `Attempt ${attemptCount + 1}...`);

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

      // 2. Add CSRF Token using enhanced manager
      if (includeCsrf && typeof document !== "undefined") {
        const csrfToken = csrfManager.getCSRFTokenFromBrowser();
        if (csrfToken) {
          headers["x-csrf-token"] = csrfToken;
          console.log("🛡️ CSRF token added via manager");
        } else if (requireAuth) {
          console.warn("⚠️ CSRF token not found - this may cause issues");
        }
      }

      onProgress?.(60, 'Sending request...');

      // 3. Make the request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        credentials: "include",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      onProgress?.(80, 'Processing response...');

      console.log(`📡 Response: ${response.status} ${response.statusText}`);

      // 4. Handle specific error responses with production error manager
      if (!response.ok) {
        const errorResponse = await handleErrorResponse(response, url, attemptCount);
        const errorCategory = productionErrorManager.categorizeError(errorResponse, {
          url,
          method: fetchOptions.method,
          attempt: attemptCount + 1
        });

        // Log error metrics
        productionErrorManager.logErrorMetrics(errorCategory);

        // Check if we should retry
        if (productionErrorManager.shouldRetry(errorCategory, attemptCount) && attemptCount < maxRetries) {
          lastError = errorCategory;
          const delay = productionErrorManager.getRetryDelay(errorCategory, attemptCount);
          
          console.log(`🔄 Retrying in ${delay}ms... (${attemptCount + 1}/${maxRetries})`);
          onRetry?.(attemptCount + 1, errorCategory);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          attemptCount++;
          continue;
        }

        // No more retries, throw appropriate error
        throwTypedError(errorCategory, response);
      }

      onProgress?.(100, 'Request completed successfully');
      return response;

    } catch (error) {
      // Handle network errors and other exceptions
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = productionErrorManager.categorizeError(
          new Error('Request timeout'), 
          { url, method: fetchOptions.method, attempt: attemptCount + 1 }
        );
        
        if (productionErrorManager.shouldRetry(timeoutError, attemptCount) && attemptCount < maxRetries) {
          console.log(`⏱️ Request timeout, retrying... (${attemptCount + 1}/${maxRetries})`);
          attemptCount++;
          continue;
        }
        
        throw new NetworkError('Request timeout', 408, 'TIMEOUT');
      }

      // Re-throw typed errors
      if (error instanceof AuthenticationError || error instanceof CSRFError || error instanceof NetworkError) {
        throw error;
      }

      // Categorize unknown errors
      const errorCategory = productionErrorManager.categorizeError(error, {
        url,
        method: fetchOptions.method,
        attempt: attemptCount + 1
      });

      productionErrorManager.logErrorMetrics(errorCategory);

      if (productionErrorManager.shouldRetry(errorCategory, attemptCount) && attemptCount < maxRetries) {
        lastError = errorCategory;
        const delay = productionErrorManager.getRetryDelay(errorCategory, attemptCount);
        
        console.log(`🔄 Network error, retrying in ${delay}ms... (${attemptCount + 1}/${maxRetries})`);
        onRetry?.(attemptCount + 1, errorCategory);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        attemptCount++;
        continue;
      }

      throw error;
    }
  }

  // If we get here, all retries failed
  if (lastError) {
    throwTypedError(lastError, null);
  }

  throw new Error('Maximum retries exceeded');
}

/**
 * Handle error responses and extract error information
 */
async function handleErrorResponse(response: Response, url: string, attempt: number): Promise<any> {
  const status = response.status;
  let errorData: any = {
    status,
    statusText: response.statusText,
    url,
    attempt: attempt + 1
  };

  try {
    const responseText = await response.text();
    
    // Try to parse as JSON
    try {
      const jsonData = JSON.parse(responseText);
      errorData = { ...errorData, ...jsonData };
    } catch {
      // Not JSON, use as message
      errorData.message = responseText;
    }
  } catch {
    errorData.message = `HTTP ${status} error`;
  }

  return errorData;
}

/**
 * Throw appropriate typed error based on error category
 */
function throwTypedError(errorCategory: ErrorCategory, response: Response | null): never {
  const userMessage = errorCategory.userMessage;
  
  switch (errorCategory.type) {
    case 'authentication_expired':
    case 'authentication_invalid':
      throw new AuthenticationError(userMessage.message, errorCategory.code);
      
    case 'csrf_token_invalid':
      throw new CSRFError(userMessage.message);
      
    case 'network_connectivity':
      throw new NetworkError(userMessage.message, response?.status, errorCategory.code);
      
    default:
      const error = new Error(userMessage.message) as Error & { code: string; status?: number };
      error.code = errorCategory.code;
      if (response) {
        error.status = response.status;
      }
      throw error;
  }
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

// Note: Error classes are already exported above
