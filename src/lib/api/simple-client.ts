/**
 * Simple API Client
 * Basic authenticated API calls that work
 */

import { getAuthHeaders } from "@/lib/auth/simple-auth";

/**
 * Make authenticated API call
 */
export async function apiCall(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = await getAuthHeaders();

  const response = await fetch(endpoint, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  return response;
}

/**
 * POST request helper
 */
export async function apiPost(endpoint: string, data: any): Promise<Response> {
  return apiCall(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * GET request helper
 */
export async function apiGet(endpoint: string): Promise<Response> {
  return apiCall(endpoint, {
    method: "GET",
  });
}
