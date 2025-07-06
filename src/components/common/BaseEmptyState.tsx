/**
 * Base Empty State Component
 * Production-grade, reusable empty state component with role-based personalization
 * Follows WCAG 2.1 AA accessibility standards and ContentLab design system
 */

"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
import {
  BaseEmptyStateProps,
  UserRole,
  RoleContent,
  FeatureHighlight,
} from "@/types/empty-states";
import {
  detectUserRole,
  getRoleGradient,
  getRoleConfig,
} from "@/lib/utils/role-detection";

interface BaseEmptyStateComponentProps
  extends Omit<BaseEmptyStateProps, "roleContent"> {
  role?: UserRole;
  roleContent: {
    executive: RoleContent;
    "content-manager": RoleContent;
    analyst: RoleContent;
  };
  onCreateProject?: () => void;
}

export const BaseEmptyState = ({
  icon: MainIcon,
  roleContent,
  role: propRole,
  illustration: _illustration,
  onCreateProject,
  className,
}: BaseEmptyStateComponentProps) => {
  // Detect current role with fallback
  const currentRole = detectUserRole(propRole, undefined, "executive");
  const content = roleContent[currentRole];
  const roleConfig = getRoleConfig(currentRole);
  const gradient = getRoleGradient(currentRole);

  // Handle primary action
  const handlePrimaryAction = () => {
    if (content.primaryAction.action) {
      content.primaryAction.action();
    } else if (onCreateProject) {
      onCreateProject();
    }
  };

  // Handle secondary action
  const handleSecondaryAction = () => {
    if (content.secondaryAction?.action) {
      content.secondaryAction.action();
    }
  };

  // Render feature highlight card
  const renderFeatureCard = (feature: FeatureHighlight, index: number) => (
    <div
      key={index}
      className="group rounded-xl border border-gray-200 bg-white p-6 transition-all duration-300 hover:border-gray-300 hover:shadow-lg"
      role="article"
      aria-labelledby={`feature-${index}-title`}
    >
      <div className="space-y-4">
        <div
          className={cn(
            "w-fit rounded-lg p-3 transition-transform group-hover:scale-110",
            feature.bgColor
          )}
        >
          <feature.icon
            className={cn("h-6 w-6", feature.color)}
            aria-hidden="true"
          />
        </div>

        <div>
          <div className="flex items-center space-x-2">
            <h3
              id={`feature-${index}-title`}
              className="text-lg font-semibold text-gray-900"
            >
              {feature.title}
            </h3>
            {feature.badge && (
              <Badge
                variant="outline"
                className="text-xs"
                aria-label={`Feature badge: ${feature.badge}`}
              >
                {feature.badge}
              </Badge>
            )}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            {feature.description}
          </p>
        </div>
      </div>
    </div>
  );

  // Render benefits list
  const renderBenefitsList = () => (
    <div className="space-y-3">
      {content.benefits.map((benefit, index) => (
        <div key={index} className="flex items-center space-x-3">
          <CheckCircle
            className="h-5 w-5 flex-shrink-0 text-green-600"
            aria-hidden="true"
          />
          <span className="text-gray-700">{benefit}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div
      className={cn(
        "animate-fade-in mx-auto max-w-6xl space-y-12 p-6",
        className
      )}
      role="main"
      aria-labelledby="empty-state-headline"
    >
      {/* Header Section */}
      <header className="space-y-6 text-center">
        <div className="flex justify-center">
          <div
            className={cn(
              "rounded-2xl border bg-gradient-to-br p-6",
              gradient.border,
              gradient.from,
              gradient.to
            )}
          >
            <MainIcon
              className={cn("h-16 w-16", `text-${roleConfig.primaryColor}-600`)}
              aria-hidden="true"
            />
          </div>
        </div>

        <div className="space-y-4">
          <Badge
            variant="outline"
            className={cn(
              "border-opacity-50 bg-gradient-to-r",
              `border-${roleConfig.primaryColor}-200`,
              gradient.from,
              gradient.to
            )}
          >
            <span
              className={cn(
                "bg-gradient-to-r bg-clip-text font-medium text-transparent",
                `from-${roleConfig.primaryColor}-600`,
                roleConfig.primaryColor === "purple"
                  ? "to-blue-600"
                  : roleConfig.primaryColor === "blue"
                    ? "to-green-600"
                    : "to-blue-600"
              )}
            >
              {roleConfig.displayName} Platform
            </span>
          </Badge>

          <h1
            id="empty-state-headline"
            className="text-4xl font-bold text-gray-900"
          >
            {content.headline}
          </h1>

          <p className="mx-auto max-w-3xl text-xl leading-relaxed text-gray-600">
            {content.description}
          </p>
        </div>
      </header>

      {/* Value Proposition */}
      <section
        className={cn(
          "rounded-xl border bg-gradient-to-r p-6",
          gradient.border,
          gradient.from,
          gradient.to
        )}
        aria-labelledby="value-proposition-title"
      >
        <h2
          id="value-proposition-title"
          className="mb-3 text-xl font-semibold text-gray-900"
        >
          Why Choose ContentLab Nexus?
        </h2>
        <p className="text-gray-700">{content.valueProposition}</p>
      </section>

      {/* Features Grid */}
      <section className="space-y-6" aria-labelledby="features-title">
        <div className="text-center">
          <h2
            id="features-title"
            className="mb-3 text-2xl font-semibold text-gray-900"
          >
            What You&apos;ll Get
          </h2>
          <p className="text-gray-600">
            Comprehensive tools designed for{" "}
            {roleConfig.description.toLowerCase()}
          </p>
        </div>

        <div
          className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
          role="list"
          aria-label="Platform features"
        >
          {content.features.map((feature, index) => (
            <div key={index} role="listitem">
              {renderFeatureCard(feature, index)}
            </div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section
        className={cn(
          "rounded-xl border bg-gradient-to-r from-gray-50 p-8",
          roleConfig.primaryColor === "purple"
            ? "to-blue-50"
            : roleConfig.primaryColor === "blue"
              ? "to-green-50"
              : "to-blue-50"
        )}
        aria-labelledby="benefits-title"
      >
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <h3
              id="benefits-title"
              className="text-xl font-semibold text-gray-900"
            >
              {roleConfig.displayName} Advantages
            </h3>
            <div role="list" aria-label="Platform benefits">
              {renderBenefitsList()}
            </div>
          </div>

          <div className="text-center lg:text-left">
            <div className="mb-4 inline-flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                <span>Real-time Analysis</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
                <span>AI-Powered</span>
              </div>
              <div className="flex items-center space-x-2">
                <div
                  className={cn(
                    "h-2 w-2 animate-pulse rounded-full",
                    `bg-${roleConfig.primaryColor}-400`
                  )}
                />
                <span>Strategic Focus</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="space-y-8 text-center" aria-labelledby="cta-title">
        <div className="space-y-4">
          <h3 id="cta-title" className="text-2xl font-semibold text-gray-900">
            Ready to Get Started?
          </h3>
          <p className="mx-auto max-w-2xl text-gray-600">
            Create your first project to unlock{" "}
            {roleConfig.description.toLowerCase()}
            and begin transforming your content strategy with AI-powered
            intelligence.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            size={content.primaryAction.size || "lg"}
            onClick={handlePrimaryAction}
            className={cn(
              "transform px-8 py-3 text-lg font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg",
              `bg-${roleConfig.primaryColor}-600 hover:bg-${roleConfig.primaryColor}-700`
            )}
            aria-describedby="primary-action-description"
          >
            {content.primaryAction.icon && (
              <content.primaryAction.icon
                className="mr-2 h-5 w-5"
                aria-hidden="true"
              />
            )}
            {content.primaryAction.label}
          </Button>

          {content.secondaryAction && (
            <Button
              variant={content.secondaryAction.variant}
              size={content.secondaryAction.size || "lg"}
              className="px-8 py-3 text-lg font-medium"
              onClick={handleSecondaryAction}
              aria-describedby="secondary-action-description"
            >
              {content.secondaryAction.label}
              {content.secondaryAction.icon && (
                <content.secondaryAction.icon
                  className="ml-2 h-5 w-5"
                  aria-hidden="true"
                />
              )}
            </Button>
          )}
        </div>

        <p id="primary-action-description" className="text-sm text-gray-500">
          Setup takes 2 minutes • Analysis starts immediately • No credit card
          required
        </p>
      </section>
    </div>
  );
};
