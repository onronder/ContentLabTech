/**
 * Projects Empty State Component - Production Grade
 * Sophisticated role-based empty state using BaseEmptyState foundation
 * Provides comprehensive project creation guidance and value demonstration
 * WCAG 2.1 AA compliant with full accessibility support
 */

"use client";

import React from "react";
import {
  FolderOpen,
  BarChart3,
  Search,
  TrendingUp,
  Activity,
  Database,
  Plus,
  ArrowRight,
  Sparkles,
  Zap,
  Users,
  Globe,
  Brain,
  LineChart,
} from "lucide-react";
import { BaseEmptyState } from "@/components/common/BaseEmptyState";
import { RoleContent } from "@/types/empty-states";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import {
  detectUserRole,
  getProjectCreationUrl,
} from "@/lib/utils/role-detection";

interface ProjectsEmptyStateProps {
  onCreateProject?: () => void;
  className?: string;
}

export const ProjectsEmptyState = ({
  onCreateProject,
  className,
}: ProjectsEmptyStateProps) => {
  const searchParams = useSearchParams();
  const { currentTeamRole } = useAuth();
  const urlRole = searchParams?.get("role");

  // Detect current role with enhanced logic
  const currentRole = detectUserRole(urlRole, currentTeamRole, "executive");

  const handleCreateProject = () => {
    if (onCreateProject) {
      onCreateProject();
    } else {
      // Enhanced navigation with role context
      window.location.href = getProjectCreationUrl(
        currentRole,
        "projects-empty-state"
      );
    }
  };

  const handleViewDemo = () => {
    // Role-specific demo routing
    const demoRoutes = {
      executive: "/demos/strategic-intelligence",
      "content-manager": "/demos/content-optimization",
      analyst: "/demos/analytics-platform",
    };
    window.location.href = demoRoutes[currentRole] || "/demos/overview";
  };

  const roleContent = {
    executive: {
      headline: "Transform Your Content Strategy with Strategic Intelligence",
      description:
        "Launch data-driven projects that deliver competitive intelligence, market insights, and ROI optimization. Build content strategies that drive measurable business growth with executive-level analytics and strategic planning tools.",
      valueProposition:
        "Empower strategic decision-making with AI-powered competitive intelligence, comprehensive market analysis, and predictive ROI modeling designed specifically for executive leadership and business growth.",
      features: [
        {
          icon: Brain,
          title: "Strategic Intelligence Hub",
          description:
            "AI-powered competitive analysis, market opportunity identification, and strategic positioning insights with executive dashboards",
          badge: "AI-Powered",
          color: "text-purple-600",
          bgColor: "bg-purple-50",
        },
        {
          icon: TrendingUp,
          title: "ROI Performance Optimization",
          description:
            "Predictive modeling, business impact measurement, and strategic resource allocation with performance forecasting",
          badge: "Predictive",
          color: "text-blue-600",
          bgColor: "bg-blue-50",
        },
        {
          icon: Globe,
          title: "Market Leadership Analytics",
          description:
            "Comprehensive market analysis, competitive positioning, and strategic opportunity identification with industry benchmarking",
          badge: "Strategic",
          color: "text-green-600",
          bgColor: "bg-green-50",
        },
      ],
      benefits: [
        "Increase content ROI by 40% with data-driven strategic decisions",
        "Reduce competitive analysis time by 70% with automated intelligence",
        "Gain market leadership insights with predictive trend analysis",
        "Access executive-level dashboards with real-time performance metrics",
        "Optimize resource allocation with strategic impact measurement",
        "Drive business growth with competitive positioning intelligence",
      ],
      primaryAction: {
        label: "Launch Strategic Project",
        action: handleCreateProject,
        variant: "default" as const,
        icon: Sparkles,
        size: "lg" as const,
      },
      secondaryAction: {
        label: "View Strategic Demo",
        action: handleViewDemo,
        variant: "outline" as const,
        icon: ArrowRight,
        size: "lg" as const,
      },
    } as RoleContent,
    "content-manager": {
      headline: "Streamline Content Excellence with Smart Project Management",
      description:
        "Create high-impact content projects with AI-powered optimization, team collaboration tools, and performance tracking. Boost productivity while ensuring consistent quality and brand alignment across all content initiatives.",
      valueProposition:
        "Accelerate content creation workflows with intelligent automation, competitive insights, and collaborative tools designed to maximize team productivity and content performance.",
      features: [
        {
          icon: Zap,
          title: "Smart Content Workflows",
          description:
            "Automated content planning, creation workflows, and team collaboration with intelligent task management and deadline tracking",
          badge: "Automated",
          color: "text-blue-600",
          bgColor: "bg-blue-50",
        },
        {
          icon: Search,
          title: "Content Opportunity Engine",
          description:
            "AI-powered content gap analysis, competitive research, and trending topic identification with optimization recommendations",
          badge: "AI-Powered",
          color: "text-green-600",
          bgColor: "bg-green-50",
        },
        {
          icon: Users,
          title: "Team Collaboration Hub",
          description:
            "Centralized workspace for content teams with review workflows, feedback systems, and quality assurance processes",
          badge: "Collaborative",
          color: "text-purple-600",
          bgColor: "bg-purple-50",
        },
      ],
      benefits: [
        "Increase content production speed by 50% with workflow automation",
        "Improve content quality with AI-powered optimization recommendations",
        "Streamline team collaboration with centralized project management",
        "Discover high-impact content opportunities with competitive analysis",
        "Ensure brand consistency with automated quality checks",
        "Track content performance with comprehensive analytics dashboards",
      ],
      primaryAction: {
        label: "Start Content Project",
        action: handleCreateProject,
        variant: "default" as const,
        icon: Plus,
        size: "lg" as const,
      },
      secondaryAction: {
        label: "View Content Demo",
        action: handleViewDemo,
        variant: "outline" as const,
        icon: ArrowRight,
        size: "lg" as const,
      },
    } as RoleContent,
    analyst: {
      headline: "Unlock Data Intelligence with Advanced Analytics Projects",
      description:
        "Build sophisticated analytics projects with machine learning insights, predictive modeling, and real-time performance tracking. Transform content data into actionable intelligence that drives measurable results.",
      valueProposition:
        "Harness the power of advanced analytics with machine learning insights, predictive forecasting, and comprehensive data intelligence designed for analytical excellence and strategic optimization.",
      features: [
        {
          icon: LineChart,
          title: "Advanced Analytics Engine",
          description:
            "Machine learning-powered analytics with predictive modeling, statistical analysis, and automated insight generation",
          badge: "ML-Powered",
          color: "text-green-600",
          bgColor: "bg-green-50",
        },
        {
          icon: Activity,
          title: "Real-Time Intelligence Dashboard",
          description:
            "Live performance monitoring, automated alerts, and real-time data visualization with customizable reporting",
          badge: "Real-Time",
          color: "text-blue-600",
          bgColor: "bg-blue-50",
        },
        {
          icon: Database,
          title: "Predictive Modeling Platform",
          description:
            "Advanced forecasting, trend prediction, and scenario analysis with statistical modeling and data science tools",
          badge: "Predictive",
          color: "text-purple-600",
          bgColor: "bg-purple-50",
        },
      ],
      benefits: [
        "Identify content patterns that drive 3x higher engagement rates",
        "Predict performance trends with 95% accuracy using ML models",
        "Automate data analysis workflows saving 20+ hours per week",
        "Generate custom insights with advanced statistical modeling",
        "Monitor real-time performance with intelligent alert systems",
        "Create executive-ready reports with automated data visualization",
      ],
      primaryAction: {
        label: "Launch Analytics Project",
        action: handleCreateProject,
        variant: "default" as const,
        icon: BarChart3,
        size: "lg" as const,
      },
      secondaryAction: {
        label: "View Analytics Demo",
        action: handleViewDemo,
        variant: "outline" as const,
        icon: ArrowRight,
        size: "lg" as const,
      },
    } as RoleContent,
  };

  return (
    <BaseEmptyState
      icon={FolderOpen}
      role={currentRole}
      roleContent={roleContent}
      {...(onCreateProject && { onCreateProject })}
      {...(className && { className })}
    />
  );
};
