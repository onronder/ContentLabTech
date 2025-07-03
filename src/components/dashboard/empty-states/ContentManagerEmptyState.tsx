/**
 * Content Manager Empty State Component
 * Shows value proposition and capabilities for content managers, NOT mock data
 */

"use client";

import React from "react";
import {
  FileText,
  Calendar,
  TrendingUp,
  Search,
  ArrowRight,
  CheckCircle,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ContentManagerEmptyStateProps {
  onCreateProject?: () => void;
  className?: string;
}

export const ContentManagerEmptyState = ({
  onCreateProject,
  className,
}: ContentManagerEmptyStateProps) => {
  const handleCreateProject = () => {
    if (onCreateProject) {
      onCreateProject();
    } else {
      // Default navigation to project creation
      window.location.href =
        "/projects/create?role=content-manager&source=dashboard";
    }
  };

  const capabilities = [
    {
      icon: Search,
      title: "Content Gap Analysis & Opportunity Discovery",
      description:
        "Identify high-impact content opportunities and gaps in your content strategy",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      icon: TrendingUp,
      title: "SEO Optimization & Performance Enhancement",
      description:
        "Improve content performance with AI-powered SEO recommendations and optimization",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      icon: Calendar,
      title: "Editorial Workflow & Content Calendar Planning",
      description:
        "Streamline content creation with intelligent planning and workflow automation",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  const benefits = [
    "Content performance optimization and SEO improvement",
    "Editorial workflow automation and team collaboration",
    "Content gap identification and opportunity mapping",
    "Competitive content intelligence and benchmarking",
    "Content calendar planning and publishing optimization",
    "Performance tracking and content ROI measurement",
  ];

  return (
    <div
      className={cn(
        "animate-fade-in mx-auto max-w-6xl space-y-12 p-6",
        className
      )}
    >
      {/* Header Section */}
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-green-50 p-6">
            <FileText className="h-16 w-16 text-blue-600" />
          </div>
        </div>

        <div className="space-y-4">
          <Badge
            variant="outline"
            className="border-blue-200 bg-gradient-to-r from-blue-50 to-green-50"
          >
            <span className="bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text font-medium text-transparent">
              Content Intelligence Platform
            </span>
          </Badge>

          <h1 className="text-4xl font-bold text-gray-900">
            Smart Content Management
          </h1>

          <p className="mx-auto max-w-3xl text-xl leading-relaxed text-gray-600">
            Optimize your content strategy with AI-powered insights, editorial
            workflow automation, and performance analytics that drive engagement
            and conversions.
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
            Comprehensive content tools designed for editorial excellence
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
                  className={cn(
                    "w-fit rounded-lg p-3 transition-transform group-hover:scale-110",
                    capability.bgColor
                  )}
                >
                  <capability.icon
                    className={cn("h-6 w-6", capability.color)}
                  />
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
      <div className="rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-green-50 p-8">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">
              Content Advantages
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
                <span>Content Optimization</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
                <span>AI-Powered</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-purple-400" />
                <span>Editorial Focus</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="space-y-8 text-center">
        <div className="space-y-4">
          <h3 className="text-2xl font-semibold text-gray-900">
            Ready to Optimize Your Content?
          </h3>
          <p className="mx-auto max-w-2xl text-gray-600">
            Create your first content project to unlock AI-powered optimization
            insights and begin transforming your editorial workflow with
            intelligent content management.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            size="lg"
            onClick={handleCreateProject}
            className="transform bg-blue-600 px-8 py-3 text-lg font-medium transition-all duration-300 hover:scale-105 hover:bg-blue-700 hover:shadow-lg"
          >
            <Plus className="mr-2 h-5 w-5" />
            Create Content Project
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
          Setup takes 2 minutes • Content analysis starts immediately • No
          credit card required
        </p>
      </div>
    </div>
  );
};
