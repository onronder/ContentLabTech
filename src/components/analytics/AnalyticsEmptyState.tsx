/**
 * Analytics Empty State Component
 * Shows value proposition and capabilities when no analytics data exists
 */

"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Activity,
  Brain,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Plus,
  Lightbulb,
} from "lucide-react";

interface AnalyticsEmptyStateProps {
  onCreateProject?: () => void;
  className?: string;
}

export const AnalyticsEmptyState = ({
  onCreateProject,
  className,
}: AnalyticsEmptyStateProps) => {
  const handleCreateProject = () => {
    if (onCreateProject) {
      onCreateProject();
    } else {
      // Default navigation to project creation (analytics requires projects and content)
      window.location.href = "/projects/create?source=analytics";
    }
  };

  const capabilities = [
    {
      icon: Activity,
      title: "Real-time Performance Monitoring",
      description:
        "Track content performance, user engagement, and conversion metrics in real-time",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      icon: Brain,
      title: "AI-Powered Insights",
      description:
        "Get intelligent predictions and recommendations based on advanced data analysis",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      icon: TrendingUp,
      title: "Predictive Analytics",
      description:
        "Forecast trends, identify opportunities, and optimize strategy with ML predictions",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
  ];

  const benefits = [
    "Real-time performance dashboards and monitoring",
    "Advanced statistical analysis and correlation insights",
    "Predictive modeling and trend forecasting",
    "Custom analytics dashboards and report generation",
    "Multi-touch attribution analysis and conversion tracking",
    "Competitive benchmarking and market intelligence",
  ];

  return (
    <div
      className={`animate-fade-in mx-auto max-w-6xl space-y-12 p-6 ${className || ""}`}
    >
      {/* Header Section */}
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-blue-50 p-6">
            <BarChart3 className="h-16 w-16 text-purple-600" />
          </div>
        </div>

        <div className="space-y-4">
          <Badge
            variant="outline"
            className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50"
          >
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text font-medium text-transparent">
              Advanced Analytics Platform
            </span>
          </Badge>

          <h1 className="text-4xl font-bold text-gray-900">
            Unlock Data-Driven Insights
          </h1>

          <p className="mx-auto max-w-3xl text-xl leading-relaxed text-gray-600">
            Get comprehensive analytics and AI-powered insights to optimize your
            content strategy, track performance, and make data-driven decisions
            that drive results.
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
            Advanced analytics tools designed for data-driven decision making
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
      <div className="rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-purple-50 p-8">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">
              Analytics Benefits
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
                <div className="h-2 w-2 animate-pulse rounded-full bg-purple-400" />
                <span>Real-time Processing</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
                <span>AI Predictions</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                <span>Advanced Modeling</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="space-y-8 text-center">
        <div className="space-y-4">
          <h3 className="text-2xl font-semibold text-gray-900">
            Ready to Analyze Your Data?
          </h3>
          <p className="mx-auto max-w-2xl text-gray-600">
            Start by creating projects and content to generate data, then unlock
            powerful analytics and AI-powered insights to optimize your content
            strategy.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            size="lg"
            onClick={handleCreateProject}
            className="transform bg-purple-600 px-8 py-3 text-lg font-medium transition-all duration-300 hover:scale-105 hover:bg-purple-700 hover:shadow-lg"
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

        <div className="mx-auto max-w-2xl rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start space-x-3">
            <Lightbulb className="mt-0.5 h-5 w-5 text-amber-600" />
            <div>
              <h4 className="font-medium text-amber-900">
                Getting Started Tip
              </h4>
              <p className="text-sm text-amber-700">
                Analytics data is generated from your projects and content.
                Create projects first, add content, and let the system gather
                performance data for comprehensive analytics.
              </p>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-500">
          Data processing starts immediately • Advanced insights available • No
          credit card required
        </p>
      </div>
    </div>
  );
};
