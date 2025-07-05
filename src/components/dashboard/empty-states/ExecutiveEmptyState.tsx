/**
 * Executive Empty State Component
 * Refactored to use BaseEmptyState with role-based content
 */

"use client";

import React from "react";
import {
  Crown,
  Target,
  BarChart3,
  TrendingUp,
  Plus,
  ArrowRight,
} from "lucide-react";
import { BaseEmptyState } from "@/components/common/BaseEmptyState";
import { RoleContent } from "@/types/empty-states";

interface ExecutiveEmptyStateProps {
  onCreateProject?: () => void;
  className?: string;
}

export const ExecutiveEmptyState = ({
  onCreateProject,
  className,
}: ExecutiveEmptyStateProps) => {
  const handleCreateProject = () => {
    if (onCreateProject) {
      onCreateProject();
    } else {
      window.location.href = "/projects/create?role=executive&source=dashboard";
    }
  };

  const roleContent = {
    executive: {
      headline: "Strategic Content Intelligence",
      description:
        "Transform your content marketing with AI-powered strategic insights, competitive intelligence, and executive-level analytics that drive measurable business results.",
      valueProposition:
        "Gain strategic advantage with comprehensive market analysis, competitive intelligence, and ROI optimization tools designed specifically for executive decision-making.",
      features: [
        {
          icon: Target,
          title: "Market Opportunity Analysis",
          description:
            "Identify untapped content opportunities and market gaps",
          color: "text-purple-600",
          bgColor: "bg-purple-50",
        },
        {
          icon: BarChart3,
          title: "Competitive Intelligence",
          description:
            "Track competitor strategies and find competitive advantages",
          color: "text-blue-600",
          bgColor: "bg-blue-50",
        },
        {
          icon: TrendingUp,
          title: "ROI & Performance Tracking",
          description:
            "Measure content marketing impact and optimize budget allocation",
          color: "text-green-600",
          bgColor: "bg-green-50",
        },
      ],
      benefits: [
        "Strategic content planning based on market data",
        "Competitive advantage identification",
        "ROI optimization and budget allocation",
        "Executive-level reporting and insights",
        "AI-powered strategic recommendations",
        "Market trend analysis and forecasting",
      ],
      primaryAction: {
        label: "Create Strategic Project",
        action: handleCreateProject,
        variant: "default" as const,
        icon: Plus,
        size: "lg" as const,
      },
      secondaryAction: {
        label: "View Demo",
        action: () => (window.location.href = "/competitive/virtual-demo"),
        variant: "outline" as const,
        icon: ArrowRight,
        size: "lg" as const,
      },
    } as RoleContent,
    "content-manager": {} as RoleContent, // Not used in this component
    analyst: {} as RoleContent, // Not used in this component
  };

  return (
    <BaseEmptyState
      icon={Crown}
      role="executive"
      roleContent={roleContent}
      {...(onCreateProject && { onCreateProject })}
      {...(className && { className })}
    />
  );
};
