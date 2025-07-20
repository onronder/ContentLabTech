/**
 * Projects Manager Component
 * Comprehensive project management interface with advanced features
 */

"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/context";
import {
  authenticatedFetch,
  AuthenticationError,
  CSRFError,
} from "@/lib/auth/authenticated-fetch";
import { supabase } from "@/lib/supabase/client";
import {
  Plus,
  Search,
  Users,
  FolderOpen,
  Sparkles,
  BarChart3,
  Zap,
  AlertTriangle,
} from "lucide-react";

// Components
import { ProjectCard } from "./ProjectCard";
import { CreateProjectModal } from "./CreateProjectModal";
import { ProjectFilters } from "./ProjectFilters";
import { ProjectStats } from "./ProjectStats";
import { ProjectsEmptyState } from "./ProjectsEmptyState";

interface Project {
  id: string;
  name: string;
  description?: string;
  website_url?: string;
  target_keywords?: string[];
  target_audience?: string;
  content_goals?: string[];
  competitors?: string[];
  status: string;
  settings?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string;
  team?: {
    id: string;
    name: string;
    description: string;
    owner_id: string;
  };
  stats?: {
    contentCount: number;
    competitorCount: number;
    lastActivity: string;
  };
}

interface ProjectFilters {
  teamId?: string | undefined;
  status?: string | undefined;
  search?: string | undefined;
  limit: number;
  offset: number;
}

type ViewMode = "grid" | "list" | "analytics";

// Utility function to ensure projects have default stats
const ensureProjectStats = (project: any): Project => {
  return {
    ...project,
    stats: project.stats || {
      contentCount: 0,
      competitorCount: project.competitors?.length || 0,
      lastActivity: project.updated_at || project.created_at,
    },
    team: project.team || {
      id: "",
      name: "Unknown Team",
      description: "",
      owner_id: "",
    },
  };
};

export const ProjectsManager = () => {
  const { currentTeam, teamsLoading, user, refreshTeams, session } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filters, setFilters] = useState<ProjectFilters>({
    limit: 12,
    offset: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [totalProjects, setTotalProjects] = useState(0);
  const [creatingDefaultTeam, setCreatingDefaultTeam] = useState(false);

  // Load projects when team or filters change
  useEffect(() => {
    if (currentTeam?.id && !teamsLoading) {
      loadProjects();
    } else if (!teamsLoading && !currentTeam?.id) {
      // No team available, stop loading
      setLoading(false);
      setProjects([]);
    }
  }, [currentTeam?.id, filters, teamsLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== filters.search) {
        setFilters(prev => ({
          ...prev,
          search: searchTerm || undefined,
          offset: 0,
        }));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, filters.search]);

  const loadProjects = async () => {
    console.log("🔍 [PROJECTS] loadProjects called with:", {
      teamId: currentTeam?.id,
      filters,
    });

    if (!currentTeam?.id) {
      console.log("⚠️ [PROJECTS] No team ID, returning early");
      return;
    }

    console.log("🔍 [PROJECTS] Setting loading state");
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        teamId: currentTeam.id,
        limit: filters.limit.toString(),
        offset: filters.offset.toString(),
      });

      if (filters.status) params.append("status", filters.status);
      if (filters.search) params.append("search", filters.search);

      const url = `/api/projects?${params.toString()}`;
      console.log("🔍 [PROJECTS] Making request to:", url);

      // Use production-grade authenticated fetch
      const authContext = {
        session,
        refreshSession: async () => {
          const {
            data: { session: newSession },
          } = await supabase.auth.getSession();
          if (newSession) {
            // Session would be updated by auth context
            console.log("🔄 Session refreshed");
          }
        },
      };

      const response = await authenticatedFetch(
        url,
        { method: "GET" },
        authContext
      );

      console.log(
        "🔍 [PROJECTS] Response status:",
        response.status,
        response.statusText
      );

      if (!response.ok) {
        console.error(
          "❌ [PROJECTS] API request failed:",
          response.status,
          response.statusText
        );
        throw new Error("Failed to load projects");
      }

      const data = await response.json();
      console.log("🔍 [PROJECTS] Raw API response:", data);

      // Ensure all projects have required stats structure
      const processedProjects = (data.projects || []).map(ensureProjectStats);
      console.log(
        "🔍 [PROJECTS] Processed projects count:",
        processedProjects.length
      );

      setProjects(processedProjects);
      setTotalProjects(data.total || 0);
      console.log("✅ [PROJECTS] Projects loaded successfully");
    } catch (err) {
      console.error("Failed to load projects:", err);

      if (err instanceof AuthenticationError) {
        setError(
          "Authentication failed. Please refresh the page and try again."
        );
      } else if (err instanceof CSRFError) {
        setError(
          "Security validation failed. Please refresh the page and try again."
        );
      } else {
        setError(
          err instanceof Error ? err.message : "Failed to load projects"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProjectCreated = (newProject: Project) => {
    // Ensure new project has stats structure
    const processedProject = ensureProjectStats(newProject);
    setProjects(prev => [processedProject, ...prev]);
    setTotalProjects(prev => prev + 1);
    setShowCreateModal(false);
  };

  const handleProjectUpdated = (updatedProject: Project) => {
    setProjects(prev =>
      prev.map(p => (p.id === updatedProject.id ? updatedProject : p))
    );
  };

  const handleProjectDeleted = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    setTotalProjects(prev => prev - 1);
  };

  const handleLoadMore = () => {
    setFilters(prev => ({
      ...prev,
      offset: prev.offset + prev.limit,
    }));
  };

  const createDefaultTeam = async () => {
    console.log("=== CREATE TEAM BUTTON CLICKED ===");
    console.log("User object:", user);
    console.log("User ID:", user?.id);
    console.log("User email:", user?.email);

    if (!user) {
      console.error("❌ No user found in auth context");
      setError("User not found. Please refresh the page and try again.");
      return;
    }

    console.log("✅ User found, starting team creation...");
    setCreatingDefaultTeam(true);
    setError(null);

    try {
      console.log("🚀 Making API request to create team for user:", user.id);
      console.log(
        "🔐 Session token:",
        session?.access_token ? "Present" : "Missing"
      );

      // Use production-grade authenticated fetch
      const authContext = {
        session,
        refreshSession: async () => {
          const {
            data: { session: newSession },
          } = await supabase.auth.getSession();
          if (newSession) {
            console.log("🔄 Session refreshed for team creation");
          }
        },
      };

      const response = await authenticatedFetch(
        "/api/fix-team-assignments",
        {
          method: "POST",
          body: JSON.stringify({ userId: user.id }),
        },
        authContext
      );

      console.log("📡 API response status:", response.status);
      console.log("📡 API response headers:", response.headers);

      if (response.ok) {
        const responseData = await response.json();
        console.log("✅ Team creation successful:", responseData);

        console.log("🔄 Refreshing teams...");
        await refreshTeams();
        console.log("✅ Teams refreshed successfully");
      } else {
        const errorData = await response.json();
        console.error("❌ Failed to create default team:", errorData);
        setError(
          `Failed to create team: ${errorData.error || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("💥 Error creating default team:", error);

      if (error instanceof AuthenticationError) {
        setError(
          "Authentication failed. Please refresh the page and try again."
        );
      } else if (error instanceof CSRFError) {
        setError(
          "Security validation failed. Please refresh the page and try again."
        );
      } else {
        setError("Network error. Please check your connection and try again.");
      }
    } finally {
      console.log("🏁 Finished team creation process");
      setCreatingDefaultTeam(false);
    }
  };

  // Show loading state when teams or projects are loading
  if ((loading || teamsLoading) && projects.length === 0) {
    return (
      <div className="space-y-8">
        {/* Loading Header */}
        <div className="space-y-4">
          <div className="h-8 w-1/3 animate-pulse rounded-md bg-gray-200" />
          <div className="h-4 w-1/2 animate-pulse rounded-md bg-gray-200" />
        </div>

        {/* Loading Controls */}
        <div className="flex items-center justify-between">
          <div className="h-10 w-80 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-10 w-32 animate-pulse rounded-lg bg-gray-200" />
        </div>

        {/* Loading Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-xl bg-gray-200"
            />
          ))}
        </div>
      </div>
    );
  }

  // Handle no team case
  if (!teamsLoading && !currentTeam?.id) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="mb-2 flex items-center space-x-3">
              <div className="rounded-lg bg-blue-50 p-2">
                <FolderOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
                <p className="text-lg text-gray-600">
                  Manage your content projects and campaigns
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* No Team State */}
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-orange-100 p-3">
            <Users className="h-6 w-6 text-orange-600" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-orange-900">
            No Team Selected
          </h3>
          <p className="mb-4 text-orange-700">
            You need to be part of a team to manage projects. We can create a
            default team for you to get started.
          </p>
          <div className="space-y-2">
            <Button
              onClick={createDefaultTeam}
              disabled={creatingDefaultTeam}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {creatingDefaultTeam ? "Creating Team..." : "Create My Team"}
            </Button>
            {creatingDefaultTeam && (
              <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                <p className="text-sm text-blue-700">
                  Processing team creation... Check console for details.
                </p>
              </div>
            )}
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            <p className="text-sm text-orange-600">
              Or contact your administrator to join an existing team.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-2 flex items-center space-x-3">
            <div className="rounded-lg bg-blue-50 p-2">
              <FolderOpen className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
              <p className="text-lg text-gray-600">
                Manage your content projects and campaigns
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Badge
            variant="outline"
            className="border-blue-200 bg-blue-50 text-blue-700"
          >
            <Sparkles className="mr-1 h-3 w-3" />
            AI-Powered Analysis
          </Badge>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Project
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <ProjectStats projects={projects} loading={loading} />

      {/* Controls */}
      <div className="flex items-center justify-between space-x-4">
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-80 pl-10"
            />
          </div>

          {/* Status Filter */}
          <Select
            value={filters.status || "all"}
            onValueChange={value =>
              setFilters(prev => ({
                ...prev,
                status: value === "all" ? undefined : value,
                offset: 0,
              }))
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* View Mode */}
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <div className="grid h-4 w-4 grid-cols-2 gap-0.5">
              <div className="rounded-sm bg-current" />
              <div className="rounded-sm bg-current" />
              <div className="rounded-sm bg-current" />
              <div className="rounded-sm bg-current" />
            </div>
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <div className="space-y-1">
              <div className="h-0.5 w-4 bg-current" />
              <div className="h-0.5 w-4 bg-current" />
              <div className="h-0.5 w-4 bg-current" />
            </div>
          </Button>
          <Button
            variant={viewMode === "analytics" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("analytics")}
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 p-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-red-900">
            Failed to load projects
          </h3>
          <p className="mb-4 text-red-700">{error}</p>
          <Button onClick={loadProjects} variant="outline">
            Try Again
          </Button>
        </div>
      ) : projects.length === 0 && !loading ? (
        <ProjectsEmptyState onCreateProject={() => setShowCreateModal(true)} />
      ) : (
        <div className="space-y-6">
          {/* Projects Grid/List */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onUpdate={handleProjectUpdated}
                  onDelete={handleProjectDeleted}
                />
              ))}
            </div>
          )}

          {viewMode === "list" && (
            <div className="space-y-4">
              {projects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  variant="list"
                  onUpdate={handleProjectUpdated}
                  onDelete={handleProjectDeleted}
                />
              ))}
            </div>
          )}

          {viewMode === "analytics" && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="mb-4 flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Project Analytics
                </h3>
              </div>
              <div className="text-center text-gray-500">
                <Zap className="mx-auto mb-2 h-8 w-8" />
                <p>Advanced analytics coming soon</p>
              </div>
            </div>
          )}

          {/* Load More */}
          {projects.length < totalProjects && (
            <div className="text-center">
              <Button
                onClick={handleLoadMore}
                variant="outline"
                disabled={loading}
              >
                {loading ? "Loading..." : "Load More Projects"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onProjectCreated={handleProjectCreated}
      />
    </div>
  );
};

// Old EmptyState component replaced with ProjectsEmptyState
// const EmptyState = ({ onCreateProject }: { onCreateProject: () => void }) => (...)
