/**
 * Hook for authenticated API calls with error handling
 * Provides automatic authentication error handling and user feedback
 */

import { useCallback } from "react";
import { authenticatedApi } from "@/lib/utils/fetch";
import { useApiAuth } from "@/lib/auth/api-context";

export const useAuthenticatedApi = () => {
  const { handleAuthError } = useApiAuth();

  const secureGet = useCallback(
    async (url: string, options?: RequestInit) => {
      try {
        return await authenticatedApi.get(url, options);
      } catch (error) {
        handleAuthError(error as Error);
        throw error;
      }
    },
    [handleAuthError]
  );

  const securePost = useCallback(
    async (url: string, data?: any, options?: RequestInit) => {
      try {
        return await authenticatedApi.post(url, data, options);
      } catch (error) {
        handleAuthError(error as Error);
        throw error;
      }
    },
    [handleAuthError]
  );

  const securePatch = useCallback(
    async (url: string, data?: any, options?: RequestInit) => {
      try {
        return await authenticatedApi.patch(url, data, options);
      } catch (error) {
        handleAuthError(error as Error);
        throw error;
      }
    },
    [handleAuthError]
  );

  const secureDelete = useCallback(
    async (url: string, options?: RequestInit) => {
      try {
        return await authenticatedApi.delete(url, options);
      } catch (error) {
        handleAuthError(error as Error);
        throw error;
      }
    },
    [handleAuthError]
  );

  const securePut = useCallback(
    async (url: string, data?: any, options?: RequestInit) => {
      try {
        return await authenticatedApi.put(url, data, options);
      } catch (error) {
        handleAuthError(error as Error);
        throw error;
      }
    },
    [handleAuthError]
  );

  return {
    get: secureGet,
    post: securePost,
    patch: securePatch,
    delete: secureDelete,
    put: securePut,
  };
};
