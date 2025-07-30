/**
 * Content Empty State Component
 * Shows value proposition and capabilities when no content exists
 */

"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  PenTool,
  Search,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Plus,
  Lightbulb,
  Sparkles,
} from "lucide-react";

interface ContentEmptyStateProps {
  onCreateContent?: () => void;
  onCreateSampleContent?: () => void;
  isCreatingSample?: boolean;
  className?: string;
}

export const ContentEmptyState = ({
  onCreateContent,
  onCreateSampleContent,
  isCreatingSample = false,
  className,
}: ContentEmptyStateProps) => {
  const handleCreateContent = () => {
    if (onCreateContent) {
      onCreateContent();
    } else {
      // Default navigation to project creation (content requires a project)
      window.location.href = "/projects/create?source=content";
    }
  };

  const capabilities = [
    {
      icon: PenTool,
      title: "AI-Powered Content Creation",
      description:
        "Create high-quality content with AI assistance and optimization recommendations",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      icon: Search,
      title: "SEO Analysis & Optimization",
      description:
        "Optimize content for search engines with real-time SEO scoring and suggestions",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      icon: TrendingUp,
      title: "Performance Tracking",
      description:
        "Monitor content performance, engagement metrics, and conversion tracking",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  const benefits = [
    "AI-powered content creation and optimization",
    "Real-time SEO scoring and recommendations",
    "Content performance analytics and insights",
    "Competitive content analysis and benchmarking",
    "Editorial workflow and collaboration tools",
    "Automated content quality assessments",
  ];

  return (
    <div
      className={`animate-fade-in mx-auto max-w-6xl space-y-12 p-6 ${className || ""}`}
    >
      {/* Header Section */}
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 to-blue-50 p-6">
            <FileText className="h-16 w-16 text-green-600" />
          </div>
        </div>

        <div className="space-y-4">
          <Badge
            variant="outline"
            className="border-green-200 bg-gradient-to-r from-green-50 to-blue-50"
          >
            <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text font-medium text-transparent">
              Content Intelligence Platform
            </span>
          </Badge>

          <h1 className="text-4xl font-bold text-gray-900">
            Create Your First Content
          </h1>

          <p className="mx-auto max-w-3xl text-xl leading-relaxed text-gray-600">
            Start creating high-performing content with AI-powered optimization,
            SEO analysis, and performance tracking to drive engagement and
            conversions.
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
            Comprehensive content creation and optimization tools powered by AI
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
      <div className="rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-green-50 p-8">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">
              Content Benefits
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
                <span>Content Creation</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
                <span>SEO Optimization</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-purple-400" />
                <span>Performance Tracking</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="space-y-8 text-center">
        <div className="space-y-4">
          <h3 className="text-2xl font-semibold text-gray-900">
            Ready to Create Content?
          </h3>
          <p className="mx-auto max-w-2xl text-gray-600">
            Start by creating a project to organize your content strategy, then
            begin creating optimized content with AI-powered insights and
            recommendations.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            size="lg"
            onClick={handleCreateContent}
            className="transform bg-green-600 px-8 py-3 text-lg font-medium transition-all duration-300 hover:scale-105 hover:bg-green-700 hover:shadow-lg"
          >
            <Plus className="mr-2 h-5 w-5" />
            Create Your First Content
          </Button>

          {onCreateSampleContent && (
            <Button
              variant="outline"
              size="lg"
              onClick={onCreateSampleContent}
              disabled={isCreatingSample}
              className="border-blue-200 px-8 py-3 text-lg font-medium hover:bg-blue-50 disabled:opacity-50"
            >
              <Sparkles
                className={`mr-2 h-5 w-5 ${isCreatingSample ? "animate-spin" : ""}`}
              />
              {isCreatingSample
                ? "Creating Sample Content..."
                : "Create Sample Content"}
            </Button>
          )}

          <Button
            variant="ghost"
            size="lg"
            className="px-8 py-3 text-lg font-medium"
            onClick={() => (window.location.href = "/competitive/virtual-demo")}
          >
            View Demo
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        <div className="mx-auto max-w-2xl rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start space-x-3">
            <Lightbulb className="mt-0.5 h-5 w-5 text-amber-600" />
            <div>
              <h4 className="font-medium text-amber-900">
                Getting Started Tip
              </h4>
              <p className="text-sm text-amber-700">
                Content is organized within projects. Create a project first to
                set up your content strategy, then add content items with
                AI-powered optimization.
              </p>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-500">
          Setup takes 2 minutes • Content analysis starts immediately • No
          credit card required
        </p>
      </div>
    </div>
  );
};
