/**
 * Project Stats Component
 * Overview statistics for project management
 */

"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  FolderOpen,
  TrendingUp,
  Users,
  Zap,
  Target,
  BarChart3,
  Clock,
  Sparkles,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  status: string;
  stats: {
    contentCount: number;
    competitorCount: number;
    lastActivity: string;
  };
  target_keywords?: string[];
  competitors?: string[];
}

interface ProjectStatsProps {
  projects: Project[];
  loading: boolean;
}

export const ProjectStats = ({ projects, loading }: ProjectStatsProps) => {
  const stats = React.useMemo(() => {
    if (loading || !projects.length) {
      return {
        totalProjects: 0,
        activeProjects: 0,
        totalContent: 0,
        totalCompetitors: 0,
        aiEnabledProjects: 0,
        avgContentPerProject: 0,
      };
    }

    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === "active").length;
    const totalContent = projects.reduce(
      (sum, p) => sum + p.stats.contentCount,
      0
    );
    const totalCompetitors = projects.reduce(
      (sum, p) => sum + p.stats.competitorCount,
      0
    );
    const aiEnabledProjects = projects.filter(
      p => p.target_keywords && p.target_keywords.length > 0
    ).length;
    const avgContentPerProject =
      totalProjects > 0 ? Math.round(totalContent / totalProjects) : 0;

    return {
      totalProjects,
      activeProjects,
      totalContent,
      totalCompetitors,
      aiEnabledProjects,
      avgContentPerProject,
    };
  }, [projects, loading]);

  const statItems = [
    {
      label: "Total Projects",
      value: stats.totalProjects,
      icon: FolderOpen,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      change: null,
    },
    {
      label: "Active Projects",
      value: stats.activeProjects,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
      change: stats.totalProjects > 0 
        ? `${Math.round((stats.activeProjects / stats.totalProjects) * 100)}% active`
        : null,
    },
    {
      label: "Content Items",
      value: stats.totalContent,
      icon: BarChart3,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      change: stats.avgContentPerProject > 0 
        ? `${stats.avgContentPerProject} avg per project`
        : null,
    },
    {
      label: "Competitors Tracked",
      value: stats.totalCompetitors,
      icon: Target,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      change: null,
    },
    {
      label: "AI-Enabled",
      value: stats.aiEnabledProjects,
      icon: Sparkles,
      color: "text-pink-600",
      bgColor: "bg-pink-50",
      change: stats.totalProjects > 0 
        ? `${Math.round((stats.aiEnabledProjects / stats.totalProjects) * 100)}% of projects`
        : null,
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 bg-white p-6"
          >
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
                <div className="h-6 w-12 animate-pulse rounded bg-gray-200" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
      {statItems.map((item, index) => (
        <div
          key={index}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md"
        >
          <div className="flex items-center space-x-3">
            <div className={cn("rounded-lg p-2", item.bgColor)}>
              <item.icon className={cn("h-5 w-5", item.color)} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-600">{item.label}</p>
              <p className="text-2xl font-bold text-gray-900">{item.value}</p>
              {item.change && (
                <p className="text-xs text-gray-500 mt-1">{item.change}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};