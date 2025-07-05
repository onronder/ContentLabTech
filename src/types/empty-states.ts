/**
 * Empty State Component Type Definitions
 * Shared interfaces for the BaseEmptyState component system
 */

import { LucideIcon } from "lucide-react";

export interface BaseEmptyStateProps {
  icon: LucideIcon;
  roleContent: {
    executive: RoleContent;
    "content-manager": RoleContent;
    analyst: RoleContent;
  };
  illustration?: string;
  className?: string;
}

export interface RoleContent {
  headline: string;
  description: string;
  features: FeatureHighlight[];
  valueProposition: string;
  primaryAction: ActionButton;
  secondaryAction?: ActionButton;
  benefits: string[];
}

export interface FeatureHighlight {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string;
  color: string;
  bgColor: string;
}

export interface ActionButton {
  label: string;
  action: () => void;
  variant: "default" | "outline" | "secondary";
  icon?: LucideIcon;
  size?: "sm" | "default" | "lg";
}

export type UserRole = "executive" | "content-manager" | "analyst";

export interface EmptyStateConfig {
  role: UserRole;
  fallbackRole?: UserRole;
  onCreateProject?: () => void;
  className?: string;
}
