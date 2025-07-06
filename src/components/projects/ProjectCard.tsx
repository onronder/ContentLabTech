/**
 * Project Card Component
 * Advanced project display card with comprehensive information and actions
 */

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Globe,
  Calendar,
  Target,
  FileText,
  MoreHorizontal,
  Eye,
  Edit,
  Archive,
  Trash2,
  ExternalLink,
  Clock,
  Sparkles,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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

interface ProjectCardProps {
  project: Project;
  variant?: "grid" | "list";
  onUpdate?: (project: Project) => void;
  onDelete?: (projectId: string) => void;
}

export const ProjectCard = ({
  project,
  variant = "grid",
  onUpdate: _onUpdate,
  onDelete,
}: ProjectCardProps) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700 border-green-200";
      case "paused":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "completed":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "archived":
        return "bg-gray-100 text-gray-700 border-gray-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this project?")) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        onDelete?.(project.id);
      } else {
        throw new Error("Failed to delete project");
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("Failed to delete project. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatKeywords = (keywords?: string[]) => {
    if (!keywords?.length) return "No keywords";
    if (keywords.length <= 3) return keywords.join(", ");
    return `${keywords.slice(0, 3).join(", ")} +${keywords.length - 3} more`;
  };

  if (variant === "list") {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Project Icon */}
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
              <Globe className="h-6 w-6 text-blue-600" />
            </div>

            {/* Project Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-3">
                <Link
                  href={`/projects/${project.id}`}
                  className="text-lg font-semibold text-gray-900 hover:text-blue-600"
                >
                  {project.name}
                </Link>
                <Badge
                  variant="outline"
                  className={cn("text-xs", getStatusColor(project.status))}
                >
                  {project.status}
                </Badge>
              </div>
              <p className="mt-1 line-clamp-1 text-sm text-gray-600">
                {project.description || "No description"}
              </p>
              <div className="mt-2 flex items-center space-x-6 text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <FileText className="h-3 w-3" />
                  <span>{project.stats.contentCount} content items</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Target className="h-3 w-3" />
                  <span>{project.stats.competitorCount} competitors</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    Updated{" "}
                    {formatDistanceToNow(new Date(project.updated_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {project.website_url && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="hidden sm:flex"
              >
                <Link
                  href={project.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-3 w-3" />
                  Visit
                </Link>
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/projects/${project.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Project
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {isDeleting ? "Deleting..." : "Delete"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    );
  }

  // Grid variant
  return (
    <div className="group relative rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-blue-200 hover:shadow-lg">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
            <Globe className="h-5 w-5 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <Link
              href={`/projects/${project.id}`}
              className="line-clamp-1 text-lg font-semibold text-gray-900 hover:text-blue-600"
            >
              {project.name}
            </Link>
            <Badge
              variant="outline"
              className={cn("mt-1 text-xs", getStatusColor(project.status))}
            >
              {project.status}
            </Badge>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 transition-opacity group-hover:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/projects/${project.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit className="mr-2 h-4 w-4" />
              Edit Project
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? "Deleting..." : "Delete"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Description */}
      <p className="mb-4 line-clamp-2 text-sm text-gray-600">
        {project.description || "No description provided"}
      </p>

      {/* Website URL */}
      {project.website_url && (
        <div className="mb-4">
          <Link
            href={project.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700"
          >
            <ExternalLink className="h-3 w-3" />
            <span className="truncate">{project.website_url}</span>
          </Link>
        </div>
      )}

      {/* Keywords */}
      <div className="mb-4">
        <div className="mb-2 flex items-center space-x-2 text-xs text-gray-500">
          <Target className="h-3 w-3" />
          <span>Target Keywords</span>
        </div>
        <p className="line-clamp-2 text-sm text-gray-700">
          {formatKeywords(project.target_keywords)}
        </p>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-4 text-center">
        <div className="rounded-lg bg-gray-50 p-3">
          <div className="text-lg font-semibold text-gray-900">
            {project.stats.contentCount}
          </div>
          <div className="text-xs text-gray-500">Content Items</div>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <div className="text-lg font-semibold text-gray-900">
            {project.stats.competitorCount}
          </div>
          <div className="text-xs text-gray-500">Competitors</div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-1">
          <Calendar className="h-3 w-3" />
          <span>
            Created{" "}
            {formatDistanceToNow(new Date(project.created_at), {
              addSuffix: true,
            })}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <Clock className="h-3 w-3" />
          <span>
            Updated{" "}
            {formatDistanceToNow(new Date(project.updated_at), {
              addSuffix: true,
            })}
          </span>
        </div>
      </div>

      {/* AI Analysis Indicator */}
      {project.target_keywords && project.target_keywords.length > 0 && (
        <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex items-center space-x-1 rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
            <Sparkles className="h-3 w-3" />
            <span>AI Ready</span>
          </div>
        </div>
      )}
    </div>
  );
};
