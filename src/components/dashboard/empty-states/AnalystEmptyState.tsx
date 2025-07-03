/**
 * Analyst Empty State Component
 * Shows value proposition and capabilities for data analysts, NOT mock data
 */

"use client";

import React from "react";
import {
  Database,
  BarChart3,
  Activity,
  PieChart,
  ArrowRight,
  CheckCircle,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AnalystEmptyStateProps {
  onCreateProject?: () => void;
  className?: string;
}

export const AnalystEmptyState = ({
  onCreateProject,
  className,
}: AnalystEmptyStateProps) => {
  const handleCreateProject = () => {
    if (onCreateProject) {
      onCreateProject();
    } else {
      // Default navigation to project creation
      window.location.href = "/projects/create?role=analyst&source=dashboard";
    }
  };

  const capabilities = [
    {
      icon: BarChart3,
      title: "Advanced Attribution & Performance Modeling",
      description:
        "Multi-touch attribution analysis with predictive modeling and conversion tracking",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      icon: Activity,
      title: "Real-time Data Processing & Correlation Analysis",
      description:
        "Advanced statistical analysis with real-time monitoring and correlation insights",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      icon: PieChart,
      title: "Custom Analytics Dashboards & Report Generation",
      description:
        "Build sophisticated dashboards with automated reporting and data visualization",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  const benefits = [
    "Multi-touch attribution analysis and conversion tracking",
    "Predictive performance modeling and trend forecasting",
    "Advanced correlation analysis and statistical insights",
    "Real-time data monitoring and automated alerting",
    "Custom dashboard creation and data visualization",
    "Statistical significance testing and A/B analysis",
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
          <div className="rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 to-blue-50 p-6">
            <Database className="h-16 w-16 text-green-600" />
          </div>
        </div>

        <div className="space-y-4">
          <Badge
            variant="outline"
            className="border-green-200 bg-gradient-to-r from-green-50 to-blue-50"
          >
            <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text font-medium text-transparent">
              Advanced Analytics Platform
            </span>
          </Badge>

          <h1 className="text-4xl font-bold text-gray-900">
            Data-Driven Intelligence
          </h1>

          <p className="mx-auto max-w-3xl text-xl leading-relaxed text-gray-600">
            Unlock deep analytical insights with advanced attribution modeling,
            real-time data processing, and sophisticated statistical analysis
            for data-driven decision making.
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
            Advanced analytical tools designed for data professionals
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
      <div className="rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50 p-8">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">
              Analytical Capabilities
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
                <span>Real-time Processing</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
                <span>Statistical Analysis</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-purple-400" />
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
            Ready to Dive Deep into Data?
          </h3>
          <p className="mx-auto max-w-2xl text-gray-600">
            Create your first analytics project to unlock advanced statistical
            insights and begin leveraging sophisticated data analysis for
            strategic decision making.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            size="lg"
            onClick={handleCreateProject}
            className="transform bg-green-600 px-8 py-3 text-lg font-medium transition-all duration-300 hover:scale-105 hover:bg-green-700 hover:shadow-lg"
          >
            <Plus className="mr-2 h-5 w-5" />
            Start Analytics Project
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
          Setup takes 2 minutes • Data processing starts immediately • No credit
          card required
        </p>
      </div>
    </div>
  );
};
