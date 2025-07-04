/**
 * Projects Empty State Component
 * Shows value proposition and capabilities when no projects exist
 */

"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FolderOpen,
  Target,
  BarChart3,
  Sparkles,
  CheckCircle,
  ArrowRight,
  Plus,
} from "lucide-react";

interface ProjectsEmptyStateProps {
  onCreateProject?: () => void;
  className?: string;
}

export const ProjectsEmptyState = ({
  onCreateProject,
  className,
}: ProjectsEmptyStateProps) => {
  const handleCreateProject = () => {
    if (onCreateProject) {
      onCreateProject();
    } else {
      // Default navigation to project creation
      window.location.href = "/projects/create?source=projects";
    }
  };

  const capabilities = [
    {
      icon: Target,
      title: "Strategic Project Setup",
      description:
        "Create comprehensive projects with competitive analysis and SEO tracking",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      icon: BarChart3,
      title: "Performance Analytics",
      description:
        "Track content performance, rankings, and competitive positioning",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      icon: Sparkles,
      title: "AI-Powered Insights",
      description:
        "Get intelligent recommendations for content optimization and strategy",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  const benefits = [
    "Centralized project management and organization",
    "Competitive intelligence and market analysis",
    "Content performance tracking and optimization",
    "SEO monitoring and keyword ranking analysis",
    "Team collaboration and workflow management",
    "AI-powered strategic recommendations",
  ];

  return (
    <div
      className={`animate-fade-in mx-auto max-w-6xl space-y-12 p-6 ${className || ""}`}
    >
      {/* Header Section */}
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-purple-50 p-6">
            <FolderOpen className="h-16 w-16 text-blue-600" />
          </div>
        </div>

        <div className="space-y-4">
          <Badge
            variant="outline"
            className="border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50"
          >
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text font-medium text-transparent">
              Project Management Platform
            </span>
          </Badge>

          <h1 className="text-4xl font-bold text-gray-900">
            Start Your First Project
          </h1>

          <p className="mx-auto max-w-3xl text-xl leading-relaxed text-gray-600">
            Create organized projects to track your content strategy, analyze
            competitors, and optimize performance with AI-powered insights and
            recommendations.
          </p>
        </div>
      </div>

      {/* Capabilities Grid */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="mb-3 text-2xl font-semibold text-gray-900">
            What You&apos;ll Get
          </h2>
          <p className="text-gray-600">
            Comprehensive project management tools for content marketing success
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {capabilities.map((capability, index) => (
            <div
              key={index}
              className="group rounded-xl border border-gray-200 bg-white p-6 transition-all duration-300 hover:border-gray-300 hover:shadow-lg"
            >
              <div className="space-y-4">
                <div
                  className={`w-fit rounded-lg p-3 transition-transform group-hover:scale-110 ${capability.bgColor}`}
                >
                  <capability.icon className={`h-6 w-6 ${capability.color}`} />
                </div>

                <div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">
                    {capability.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-600">
                    {capability.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits List */}
      <div className="rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50 p-8">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">
              Project Benefits
            </h3>
            <div className="space-y-3">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" />
                  <span className="text-gray-700">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center lg:text-left">
            <div className="mb-4 inline-flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                <span>Project Organization</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
                <span>AI Analysis</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-purple-400" />
                <span>Team Collaboration</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="space-y-8 text-center">
        <div className="space-y-4">
          <h3 className="text-2xl font-semibold text-gray-900">
            Ready to Get Started?
          </h3>
          <p className="mx-auto max-w-2xl text-gray-600">
            Create your first project to begin organizing your content strategy
            and unlocking powerful analytics and competitive intelligence.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            size="lg"
            onClick={handleCreateProject}
            className="transform bg-blue-600 px-8 py-3 text-lg font-medium transition-all duration-300 hover:scale-105 hover:bg-blue-700 hover:shadow-lg"
          >
            <Plus className="mr-2 h-5 w-5" />
            Create Your First Project
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="px-8 py-3 text-lg font-medium"
            onClick={() => (window.location.href = "/competitive/virtual-demo")}
          >
            View Demo
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        <p className="text-sm text-gray-500">
          Setup takes 2 minutes • Analysis starts immediately • No credit card
          required
        </p>
      </div>
    </div>
  );
};
