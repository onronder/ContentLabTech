/**
 * Adaptive Dashboard Component
 * Smart role-based dashboard that adapts interface based on user role and context
 */

"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth/context";
import {
  Settings,
  Crown,
  PenTool,
  Database,
  Sparkles,
  LucideIcon,
  FolderOpen,
} from "lucide-react";

// Import role-based dashboards
import { ExecutiveDashboard } from "./ExecutiveDashboard";
import { ContentManagerDashboard } from "./ContentManagerDashboard";
import { AnalystWorkspace } from "./AnalystWorkspace";

type UserRole = "executive" | "content-manager" | "analyst" | "admin";

interface DashboardConfig {
  id: UserRole;
  name: string;
  description: string;
  icon: LucideIcon;
  component: React.ComponentType<{ projectId?: string | undefined }>;
  color: string;
  bgColor: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  website_url?: string;
}

export const AdaptiveDashboard = () => {
  const { currentTeam } = useAuth();
  const [currentRole, setCurrentRole] = useState<UserRole>("executive");
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(false);

  // Load projects when team changes
  useEffect(() => {
    if (currentTeam?.id) {
      loadProjects();
    }
  }, [currentTeam?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Simulate loading and role detection
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      // In a real app, this would be determined by user authentication/authorization
      setCurrentRole("executive");
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const loadProjects = async () => {
    if (!currentTeam?.id) return;

    setProjectsLoading(true);
    try {
      const response = await fetch(
        `/api/projects?teamId=${currentTeam.id}&limit=10`
      );
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);

        // Set first project as current if none selected
        if (!currentProject && data.projects?.length > 0) {
          setCurrentProject(data.projects[0]);
        }
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
    } finally {
      setProjectsLoading(false);
    }
  };

  const dashboardConfigs: DashboardConfig[] = [
    {
      id: "executive",
      name: "Executive View",
      description: "Strategic overview and high-level insights",
      icon: Crown,
      component: ExecutiveDashboard,
      color: "text-purple-600",
      bgColor: "bg-purple-50 border-purple-200",
    },
    {
      id: "content-manager",
      name: "Content Manager",
      description: "Editorial workflow and content pipeline",
      icon: PenTool,
      component: ContentManagerDashboard,
      color: "text-blue-600",
      bgColor: "bg-blue-50 border-blue-200",
    },
    {
      id: "analyst",
      name: "Data Analyst",
      description: "Advanced analytics and data exploration",
      icon: Database,
      component: AnalystWorkspace,
      color: "text-green-600",
      bgColor: "bg-green-50 border-green-200",
    },
  ];

  const getCurrentDashboard = () => {
    return (
      dashboardConfigs.find(config => config.id === currentRole) ||
      dashboardConfigs[0]
    );
  };

  const currentDashboard = getCurrentDashboard();
  const DashboardComponent = currentDashboard?.component || ExecutiveDashboard;

  if (isLoading) {
    return (
      <div className="animate-fade-in space-y-8">
        {/* Loading Header */}
        <div className="space-y-4">
          <div className="h-8 w-1/3 animate-pulse rounded-md bg-gray-200" />
          <div className="h-4 w-1/2 animate-pulse rounded-md bg-gray-200" />
        </div>

        {/* Loading Dashboard Selector */}
        <div className="h-12 w-full animate-pulse rounded-lg bg-gray-200" />

        {/* Loading Content */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-lg bg-gray-200"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Adaptive Header */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="mb-2 flex items-center space-x-3">
              <div className={cn("rounded-lg p-2", currentDashboard?.bgColor)}>
                {currentDashboard &&
                  React.createElement(currentDashboard.icon, {
                    className: cn("h-6 w-6", currentDashboard.color),
                  })}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {currentDashboard?.name}
                </h1>
                <p className="text-lg text-gray-600">
                  {currentDashboard?.description}
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
              AI-Powered
            </Badge>
            <Button variant="outline" size="sm">
              <Settings className="mr-2 h-4 w-4" />
              Customize
            </Button>
          </div>
        </div>

        {/* Dashboard Role Selector */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Dashboard View
              </h3>
              <p className="text-sm text-gray-600">
                Switch between different role-based interfaces
              </p>
            </div>
          </div>

          <Tabs
            value={currentRole}
            onValueChange={value => setCurrentRole(value as UserRole)}
          >
            <TabsList className="grid w-full grid-cols-3 bg-gray-100">
              {dashboardConfigs.map(config => {
                const IconComponent = config.icon;
                return (
                  <TabsTrigger
                    key={config.id}
                    value={config.id}
                    className="flex items-center space-x-2 data-[state=active]:bg-white"
                  >
                    <IconComponent className="h-4 w-4" />
                    <span className="hidden sm:inline">{config.name}</span>
                    <span className="sm:hidden">
                      {config.name.split(" ")[0]}
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>

        {/* Project Selector */}
        {projects.length > 0 && (
          <div className="mt-4 flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <FolderOpen className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                Project:
              </span>
            </div>
            <Select
              value={currentProject?.id || ""}
              onValueChange={value => {
                const project = projects.find(p => p.id === value);
                setCurrentProject(project || null);
              }}
            >
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select a project..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{project.name}</span>
                      {project.website_url && (
                        <span className="text-xs text-gray-500">
                          {project.website_url}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {projectsLoading && (
              <div className="text-xs text-gray-500">Loading projects...</div>
            )}
          </div>
        )}
      </div>

      {/* Role-Based Dashboard Content */}
      <div className="min-h-screen">
        <div className="animate-fade-in-up">
          <DashboardComponent projectId={currentProject?.id} />
        </div>
      </div>

      {/* Smart Insights Footer */}
      <div className="rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">
                AI Recommendations
              </h4>
              <p className="text-sm text-gray-600">
                Based on your {currentDashboard?.name.toLowerCase()} role, we
                suggest focusing on
                {currentRole === "executive"
                  ? " strategic metrics and ROI optimization"
                  : currentRole === "content-manager"
                    ? " content pipeline efficiency and team collaboration"
                    : " data quality improvements and advanced analytics setup"}
                .
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="bg-white">
            View Suggestions
          </Button>
        </div>
      </div>
    </div>
  );
};
