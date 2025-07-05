/**
 * Analyst Empty State Component
 * Refactored to use BaseEmptyState with role-based content
 */

"use client";

import React from "react";
import {
  Database,
  BarChart3,
  Activity,
  PieChart,
  Plus,
  ArrowRight,
} from "lucide-react";
import { BaseEmptyState } from "@/components/common/BaseEmptyState";
import { RoleContent } from "@/types/empty-states";

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
      window.location.href = "/projects/create?role=analyst&source=dashboard";
    }
  };

  const roleContent = {
    analyst: {
      headline: "Data-Driven Intelligence",
      description:
        "Unlock deep analytical insights with advanced attribution modeling, real-time data processing, and sophisticated statistical analysis for data-driven decision making.",
      valueProposition:
        "Leverage advanced analytics capabilities with multi-touch attribution, predictive modeling, and real-time data processing designed for analytical excellence.",
      features: [
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
      ],
      benefits: [
        "Multi-touch attribution analysis and conversion tracking",
        "Predictive performance modeling and trend forecasting",
        "Advanced correlation analysis and statistical insights",
        "Real-time data monitoring and automated alerting",
        "Custom dashboard creation and data visualization",
        "Statistical significance testing and A/B analysis",
      ],
      primaryAction: {
        label: "Start Analytics Project",
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
    "content-manager": {} as RoleContent, // Not used in this component
  };

  return (
    <BaseEmptyState
      icon={Database}
      role="analyst"
      roleContent={roleContent}
      {...(onCreateProject && { onCreateProject })}
      {...(className && { className })}
    />
  );
};
