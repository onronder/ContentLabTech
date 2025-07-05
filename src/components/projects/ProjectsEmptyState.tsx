/**
 * Projects Empty State Component
 * Role-based empty state using BaseEmptyState component
 * Provides sophisticated project creation guidance and value demonstration
 */

"use client";

import React from "react";
import {
  FolderOpen,
  Target,
  BarChart3,
  Search,
  TrendingUp,
  Calendar,
  Activity,
  PieChart,
  Database,
  Plus,
  ArrowRight,
} from "lucide-react";
import { BaseEmptyState } from "@/components/common/BaseEmptyState";
import { RoleContent } from "@/types/empty-states";
import { useSearchParams } from "next/navigation";

interface ProjectsEmptyStateProps {
  onCreateProject?: () => void;
  className?: string;
}

export const ProjectsEmptyState = ({
  onCreateProject,
  className,
}: ProjectsEmptyStateProps) => {
  const searchParams = useSearchParams();
  const urlRole = searchParams?.get("role");

  const handleCreateProject = () => {
    if (onCreateProject) {
      onCreateProject();
    } else {
      // Default navigation to project creation
      window.location.href = "/projects/create?source=projects";
    }
  };

  const roleContent = {
    executive: {
      headline: "Strategic Project Intelligence Platform",
      description:
        "Create data-driven projects focused on competitive intelligence, market analysis, and ROI optimization to transform your content marketing strategy with executive-level insights.",
      valueProposition:
        "Transform content marketing strategy with executive-level intelligence, strategic market analysis, and ROI optimization guidance designed for strategic decision-making.",
      features: [
        {
          icon: Target,
          title: "Market Opportunity Analysis",
          description:
            "AI-powered market research and competitive positioning analysis with strategic recommendations",
          badge: "AI-Powered",
          color: "text-purple-600",
          bgColor: "bg-purple-50",
        },
        {
          icon: BarChart3,
          title: "Strategic Project Planning",
          description:
            "Executive-level project organization with ROI tracking and business impact measurement",
          badge: "Strategic",
          color: "text-blue-600",
          bgColor: "bg-blue-50",
        },
        {
          icon: TrendingUp,
          title: "ROI Optimization",
          description:
            "Predictive performance modeling and strategic resource allocation optimization",
          badge: "Predictive",
          color: "text-green-600",
          bgColor: "bg-green-50",
        },
      ],
      benefits: [
        "Competitive intelligence integration and market positioning",
        "Strategic market analysis and opportunity identification",
        "ROI optimization guidance and performance forecasting",
        "Executive-level reporting and business impact measurement",
        "Predictive performance modeling and trend analysis",
        "Business impact measurement and strategic resource allocation",
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
    "content-manager": {
      headline: "Content Optimization Project Hub",
      description:
        "Create high-performing content projects with AI-powered optimization, competitive analysis, and performance tracking designed for content marketing excellence.",
      valueProposition:
        "Optimize content marketing performance with AI-powered insights, workflow efficiency tools, and competitive intelligence designed for content creation excellence.",
      features: [
        {
          icon: Search,
          title: "Content Gap Analysis",
          description:
            "AI-powered content opportunity discovery and competitive gap identification",
          badge: "AI-Powered",
          color: "text-blue-600",
          bgColor: "bg-blue-50",
        },
        {
          icon: TrendingUp,
          title: "Competitive Content Intelligence",
          description:
            "Automated competitor content tracking and performance benchmarking",
          badge: "Automated",
          color: "text-green-600",
          bgColor: "bg-green-50",
        },
        {
          icon: Calendar,
          title: "Performance Optimization",
          description:
            "Smart content calendar planning and publishing optimization tools",
          badge: "Smart",
          color: "text-purple-600",
          bgColor: "bg-purple-50",
        },
      ],
      benefits: [
        "Content performance optimization and SEO improvement recommendations",
        "Competitive content tracking and benchmarking analysis",
        "SEO improvement recommendations and keyword optimization",
        "Workflow efficiency tools and team collaboration features",
        "Content gap identification and opportunity mapping",
        "Performance benchmarking and content ROI measurement",
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
    analyst: {
      headline: "Analytics-Driven Project Platform",
      description:
        "Create data-driven projects with comprehensive analytics, performance tracking, and advanced reporting designed for analytical excellence and data-driven insights.",
      valueProposition:
        "Leverage advanced analytics capabilities with comprehensive data tracking, performance measurement, and sophisticated reporting designed for data-driven decision making.",
      features: [
        {
          icon: Activity,
          title: "Real-time Performance Monitoring",
          description:
            "Advanced performance tracking with real-time analytics and automated reporting",
          badge: "Real-time",
          color: "text-green-600",
          bgColor: "bg-green-50",
        },
        {
          icon: Database,
          title: "AI-Powered Insights",
          description:
            "Machine learning-driven insights and predictive analytics for data-driven decisions",
          badge: "AI-Powered",
          color: "text-blue-600",
          bgColor: "bg-blue-50",
        },
        {
          icon: PieChart,
          title: "Predictive Analytics",
          description:
            "Advanced forecasting and trend analysis with statistical modeling capabilities",
          badge: "Predictive",
          color: "text-purple-600",
          bgColor: "bg-purple-50",
        },
      ],
      benefits: [
        "Advanced performance tracking and comprehensive analytics",
        "Real-time monitoring and automated alert systems",
        "Data-driven insights and predictive modeling capabilities",
        "Custom reporting and data visualization tools",
        "Statistical analysis and performance forecasting",
        "Comprehensive data integration and analysis workflows",
      ],
      primaryAction: {
        label: "Create Analytics Project",
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
  };

  return (
    <BaseEmptyState
      icon={FolderOpen}
      role={urlRole as any}
      roleContent={roleContent}
      {...(onCreateProject && { onCreateProject })}
      {...(className && { className })}
    />
  );
};
