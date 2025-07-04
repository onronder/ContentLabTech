/**
 * Projects Manager Component
 * Comprehensive project management interface with advanced features
 */

"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
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
  Plus,
  Search,
  Filter,
  Globe,
  Users,
  Calendar,
  FolderOpen,
  MoreHorizontal,
  Sparkles,
  Target,
  BarChart3,
  ArrowUpRight,
  Clock,
  FileText,
  Eye,
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
  team: {
    id: string;
    name: string;
    description: string;
    owner_id: string;
  };
  stats: {
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

export const ProjectsManager = () => {
  const { currentTeam } = useAuth();
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

  // Load projects when team or filters change
  useEffect(() => {
    if (currentTeam?.id) {
      loadProjects();
    }
  }, [currentTeam?.id, filters]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!currentTeam?.id) return;

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

      const response = await fetch(`/api/projects?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to load projects");
      }

      const data = await response.json();
      setProjects(data.projects || []);
      setTotalProjects(data.total || 0);
    } catch (err) {
      console.error("Failed to load projects:", err);
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const handleProjectCreated = (newProject: Project) => {
    setProjects(prev => [newProject, ...prev]);
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

  if (loading && projects.length === 0) {
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
