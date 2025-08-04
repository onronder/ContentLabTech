/**
 * Enterprise-Grade useProjects Hook
 * Enhanced with circuit breaker pattern, caching, and comprehensive error handling
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { CircuitBreaker } from "@/lib/resilience/circuit-breaker";
import { enterpriseLogger } from "@/lib/monitoring/enterprise-logger";

// Types
interface Project {
  id: string;
  name: string;
  description?: string;
  website_url?: string;
  status: "active" | "archived" | "draft";
  created_at: string;
  updated_at: string;
  team_id: string;
  created_by: string;
  target_keywords?: string[];
  target_audience?: string;
  content_goals?: string[];
  competitors?: string[];
  settings?: Record<string, unknown>;
}

interface CreateProjectRequest {
  teamId: string;
  name: string;
  description?: string;
  website_url?: string;
  target_keywords?: string[];
  target_audience?: string;
  content_goals?: string[];
  competitors?: string[];
  settings?: Record<string, unknown>;
}

interface ProjectsResponse {
  success: boolean;
  data: {
    projects: Project[];
  };
  timestamp: string;
  requestId?: string;
}

interface ProjectResponse {
  success: boolean;
  data: {
    project: Project;
  };
  timestamp: string;
  requestId?: string;
}

interface UseProjectsOptions {
  teamId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableCaching?: boolean;
  cacheTimeout?: number;
}

interface UseProjectsState {
  projects: Project[];
  loading: boolean;
  error: string | null;
  isRefreshing: boolean;
  lastFetch: Date | null;
  circuitBreakerState: "CLOSED" | "OPEN" | "HALF_OPEN";
}

interface UseProjectsActions {
  fetchProjects: (options?: { force?: boolean }) => Promise<void>;
  createProject: (projectData: CreateProjectRequest) => Promise<Project | null>;
  updateProject: (
    id: string,
    updates: Partial<Project>
  ) => Promise<Project | null>;
  deleteProject: (id: string) => Promise<boolean>;
  refreshProjects: () => Promise<void>;
  clearError: () => void;
  clearCache: () => void;
}

// Circuit breaker for API calls
const projectsCircuitBreaker = new CircuitBreaker("useProjects", {
  failureThreshold: 3,
  recoveryTimeout: 15000,
  monitoringPeriod: 30000,
  halfOpenMaxAttempts: 3,
  successThreshold: 2,
});

// Cache management
const projectsCache = new Map<
  string,
  { data: Project[]; timestamp: number; teamId?: string }
>();
const CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 10;

/**
 * Clean up expired cache entries
 */
function cleanupCache() {
  const now = Date.now();
  const toDelete: string[] = [];

  for (const [key, cached] of projectsCache.entries()) {
    if (now - cached.timestamp > CACHE_TIMEOUT) {
      toDelete.push(key);
    }
  }

  // Remove oldest entries if cache is too large
  if (projectsCache.size > MAX_CACHE_SIZE) {
    const sortedEntries = Array.from(projectsCache.entries()).sort(
      ([, a], [, b]) => a.timestamp - b.timestamp
    );

    const toRemove = sortedEntries.slice(
      0,
      sortedEntries.length - MAX_CACHE_SIZE + toDelete.length
    );
    toDelete.push(...toRemove.map(([key]) => key));
  }

  toDelete.forEach(key => projectsCache.delete(key));
}

/**
 * Enhanced fetch with retry logic and exponential backoff
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 3,
  baseDelay = 1000
): Promise<Response> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      if (response.ok) {
        return response;
      }

      // Don't retry on client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        enterpriseLogger.warn(`API request failed, retrying in ${delay}ms`, {
          attempt: attempt + 1,
          maxRetries,
          url,
          error: lastError.message,
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

/**
 * Enhanced useProjects hook with circuit breaker and caching
 */
export function useProjects(
  options: UseProjectsOptions = {}
): [UseProjectsState, UseProjectsActions] {
  const {
    teamId,
    autoRefresh = false,
    refreshInterval = 30000,
    enableCaching = true,
    cacheTimeout = CACHE_TIMEOUT,
  } = options;

  const [state, setState] = useState<UseProjectsState>({
    projects: [],
    loading: false,
    error: null,
    isRefreshing: false,
    lastFetch: null,
    circuitBreakerState: "CLOSED",
  });

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  /**
   * Update state safely (only if component is still mounted)
   */
  const safeSetState = useCallback(
    (
      updater:
        | Partial<UseProjectsState>
        | ((prev: UseProjectsState) => UseProjectsState)
    ) => {
      if (mountedRef.current) {
        if (typeof updater === "function") {
          setState(updater);
        } else {
          setState(prev => ({ ...prev, ...updater }));
        }
      }
    },
    []
  );

  /**
   * Fetch projects with circuit breaker protection
   */
  const fetchProjects = useCallback(
    async (fetchOptions: { force?: boolean } = {}) => {
      const { force = false } = fetchOptions;

      try {
        safeSetState(prev => ({
          ...prev,
          loading: !prev.projects.length,
          isRefreshing: !!prev.projects.length,
          error: null,
          circuitBreakerState: projectsCircuitBreaker.getMetrics().state,
        }));

        // Check cache first (if enabled and not forced)
        if (enableCaching && !force) {
          cleanupCache();
          const cacheKey = teamId ? `projects:${teamId}` : "projects:all";
          const cached = projectsCache.get(cacheKey);

          if (cached && Date.now() - cached.timestamp < cacheTimeout) {
            enterpriseLogger.debug("Using cached projects data", {
              cacheKey,
              projectCount: cached.data.length,
              cacheAge: Date.now() - cached.timestamp,
            });

            safeSetState({
              projects: cached.data,
              loading: false,
              isRefreshing: false,
              lastFetch: new Date(cached.timestamp),
            });
            return;
          }
        }

        // Build query parameters
        const params = new URLSearchParams();
        if (teamId) params.append("teamId", teamId);
        params.append("limit", "100");

        const url = `/api/projects?${params.toString()}`;

        // Use circuit breaker for API call
        const circuitResult = await projectsCircuitBreaker.execute(async () => {
          return await fetchWithRetry(url, {
            method: "GET",
            credentials: "include",
          });
        });

        // Handle circuit breaker result
        if (!circuitResult.success) {
          throw (
            circuitResult.error ||
            new Error("Circuit breaker prevented execution")
          );
        }

        const response = circuitResult.data!;
        const result: ProjectsResponse = await response.json();

        if (!result.success) {
          throw new Error(
            result.data ? String(result.data) : "Failed to fetch projects"
          );
        }

        const projects = result.data.projects || [];

        // Update cache
        if (enableCaching) {
          const cacheKey = teamId ? `projects:${teamId}` : "projects:all";
          projectsCache.set(cacheKey, {
            data: projects,
            timestamp: Date.now(),
            teamId,
          });
        }

        enterpriseLogger.info("Projects fetched successfully", {
          projectCount: projects.length,
          teamId,
          fromCache: false,
        });

        safeSetState({
          projects,
          loading: false,
          isRefreshing: false,
          error: null,
          lastFetch: new Date(),
          circuitBreakerState: projectsCircuitBreaker.getMetrics().state,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        enterpriseLogger.error(
          "Failed to fetch projects",
          error instanceof Error ? error : new Error(errorMessage),
          {
            teamId,
            circuitBreakerState: projectsCircuitBreaker.getMetrics().state,
          }
        );

        safeSetState({
          loading: false,
          isRefreshing: false,
          error: errorMessage,
          circuitBreakerState: projectsCircuitBreaker.getMetrics().state,
        });
      }
    },
    [teamId, enableCaching, cacheTimeout, safeSetState]
  );

  /**
   * Create a new project
   */
  const createProject = useCallback(
    async (projectData: CreateProjectRequest): Promise<Project | null> => {
      try {
        safeSetState(prev => ({ ...prev, error: null }));

        const circuitResult = await projectsCircuitBreaker.execute(async () => {
          return await fetchWithRetry("/api/projects", {
            method: "POST",
            credentials: "include",
            body: JSON.stringify(projectData),
          });
        });

        // Handle circuit breaker result
        if (!circuitResult.success) {
          throw (
            circuitResult.error ||
            new Error("Circuit breaker prevented execution")
          );
        }

        const response = circuitResult.data!;
        const result: ProjectResponse = await response.json();

        if (!result.success) {
          throw new Error(
            result.data ? String(result.data) : "Failed to create project"
          );
        }

        const newProject = result.data.project;

        // Update local state
        safeSetState(prev => ({
          ...prev,
          projects: [newProject, ...prev.projects],
        }));

        // Invalidate cache
        if (enableCaching) {
          const cacheKey = projectData.teamId
            ? `projects:${projectData.teamId}`
            : "projects:all";
          projectsCache.delete(cacheKey);
          projectsCache.delete("projects:all"); // Also clear general cache
        }

        enterpriseLogger.info("Project created successfully", {
          projectId: newProject.id,
          projectName: newProject.name,
          teamId: projectData.teamId,
        });

        return newProject;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        enterpriseLogger.error(
          "Failed to create project",
          error instanceof Error ? error : new Error(errorMessage),
          {
            projectName: projectData.name,
            teamId: projectData.teamId,
          }
        );

        safeSetState(prev => ({ ...prev, error: errorMessage }));
        return null;
      }
    },
    [enableCaching, safeSetState]
  );

  /**
   * Update an existing project
   */
  const updateProject = useCallback(
    async (id: string, updates: Partial<Project>): Promise<Project | null> => {
      try {
        safeSetState(prev => ({ ...prev, error: null }));

        const circuitResult = await projectsCircuitBreaker.execute(async () => {
          return await fetchWithRetry(`/api/projects/${id}`, {
            method: "PATCH",
            credentials: "include",
            body: JSON.stringify(updates),
          });
        });

        // Handle circuit breaker result
        if (!circuitResult.success) {
          throw (
            circuitResult.error ||
            new Error("Circuit breaker prevented execution")
          );
        }

        const response = circuitResult.data!;
        const result: ProjectResponse = await response.json();

        if (!result.success) {
          throw new Error(
            result.data ? String(result.data) : "Failed to update project"
          );
        }

        const updatedProject = result.data.project;

        // Update local state
        safeSetState(prev => ({
          ...prev,
          projects: prev.projects.map(p => (p.id === id ? updatedProject : p)),
        }));

        // Invalidate relevant cache entries
        if (enableCaching) {
          const keysToDelete = Array.from(projectsCache.keys()).filter(
            key =>
              key.includes("projects:") &&
              (key.includes("all") || key.includes(updatedProject.team_id))
          );
          keysToDelete.forEach(key => projectsCache.delete(key));
        }

        enterpriseLogger.info("Project updated successfully", {
          projectId: id,
          updatedFields: Object.keys(updates),
        });

        return updatedProject;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        enterpriseLogger.error(
          "Failed to update project",
          error instanceof Error ? error : new Error(errorMessage),
          {
            projectId: id,
          }
        );

        safeSetState(prev => ({ ...prev, error: errorMessage }));
        return null;
      }
    },
    [enableCaching, safeSetState]
  );

  /**
   * Delete a project
   */
  const deleteProject = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        safeSetState(prev => ({ ...prev, error: null }));

        const circuitResult = await projectsCircuitBreaker.execute(async () => {
          return await fetchWithRetry(`/api/projects/${id}`, {
            method: "DELETE",
            credentials: "include",
          });
        });

        // Handle circuit breaker result
        if (!circuitResult.success) {
          throw (
            circuitResult.error ||
            new Error("Circuit breaker prevented execution")
          );
        }

        const response = circuitResult.data!;
        if (!response.ok) {
          const errorResult = await response.json().catch(() => ({}));
          throw new Error(
            errorResult.error ||
              `HTTP ${response.status}: ${response.statusText}`
          );
        }

        // Update local state
        safeSetState(prev => ({
          ...prev,
          projects: prev.projects.filter(p => p.id !== id),
        }));

        // Invalidate cache
        if (enableCaching) {
          projectsCache.clear(); // Clear all cache on delete
        }

        enterpriseLogger.info("Project deleted successfully", {
          projectId: id,
        });
        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        enterpriseLogger.error(
          "Failed to delete project",
          error instanceof Error ? error : new Error(errorMessage),
          {
            projectId: id,
          }
        );

        safeSetState(prev => ({ ...prev, error: errorMessage }));
        return false;
      }
    },
    [enableCaching, safeSetState]
  );

  /**
   * Refresh projects data
   */
  const refreshProjects = useCallback(async () => {
    await fetchProjects({ force: true });
  }, [fetchProjects]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    safeSetState(prev => ({ ...prev, error: null }));
  }, [safeSetState]);

  /**
   * Clear cache
   */
  const clearCache = useCallback(() => {
    projectsCache.clear();
    enterpriseLogger.debug("Projects cache cleared");
  }, []);

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        if (mountedRef.current && !state.loading) {
          fetchProjects();
        }
      }, refreshInterval);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval]);

  // Initial fetch
  useEffect(() => {
    fetchProjects();
  }, [teamId]); // Only depend on teamId, not fetchProjects itself

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  const actions: UseProjectsActions = {
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    refreshProjects,
    clearError,
    clearCache,
  };

  return [state, actions];
}

export default useProjects;
