/**
 * Content Manager Empty State Component
 * Refactored to use BaseEmptyState with role-based content
 */

"use client";

import React from "react";
import {
  FileText,
  Search,
  TrendingUp,
  Calendar,
  Plus,
  ArrowRight,
} from "lucide-react";
import { BaseEmptyState } from "@/components/common/BaseEmptyState";
import { RoleContent } from "@/types/empty-states";

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
      window.location.href =
        "/projects/create?role=content-manager&source=dashboard";
    }
  };

  const roleContent = {
    "content-manager": {
      headline: "Smart Content Management",
      description:
        "Optimize your content strategy with AI-powered insights, editorial workflow automation, and performance analytics that drive engagement and conversions.",
      valueProposition:
        "Streamline your content creation process with intelligent optimization tools, SEO recommendations, and performance tracking designed for editorial excellence.",
      features: [
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
      ],
      benefits: [
        "Content performance optimization and SEO improvement",
        "Editorial workflow automation and team collaboration",
        "Content gap identification and opportunity mapping",
        "Competitive content intelligence and benchmarking",
        "Content calendar planning and publishing optimization",
        "Performance tracking and content ROI measurement",
      ],
      primaryAction: {
        label: "Create Content Project",
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
    executive: {} as RoleContent, // Not used in this component
    analyst: {} as RoleContent, // Not used in this component
  };

  return (
    <BaseEmptyState
      icon={FileText}
      role="content-manager"
      roleContent={roleContent}
      {...(onCreateProject && { onCreateProject })}
      {...(className && { className })}
    />
  );
};
