/**
 * Role Detection Utilities
 * Centralized logic for detecting and managing user roles in empty states
 */

import { UserRole } from "@/types/empty-states";

/**
 * Detect user role from URL parameters or auth context
 */
export function detectUserRole(
  urlRole?: string | null,
  userRole?: string | null,
  fallbackRole: UserRole = "executive"
): UserRole {
  // Priority: URL parameter > user role > fallback
  const role = urlRole || userRole || fallbackRole;

  // Validate and normalize role
  if (isValidRole(role)) {
    return role as UserRole;
  }

  return fallbackRole;
}

/**
 * Check if a string is a valid user role
 */
export function isValidRole(role: string): boolean {
  const validRoles: UserRole[] = ["executive", "content-manager", "analyst"];
  return validRoles.includes(role as UserRole);
}

/**
 * Get role configuration for navigation and URLs
 */
export function getRoleConfig(role: UserRole) {
  const configs = {
    executive: {
      urlParam: "executive",
      displayName: "Executive",
      description: "Strategic insights and business intelligence",
      primaryColor: "purple",
    },
    "content-manager": {
      urlParam: "content-manager",
      displayName: "Content Manager",
      description: "Content optimization and editorial workflow",
      primaryColor: "blue",
    },
    analyst: {
      urlParam: "analyst",
      displayName: "Data Analyst",
      description: "Advanced analytics and data intelligence",
      primaryColor: "green",
    },
  };

  return configs[role];
}

/**
 * Generate project creation URL with role context
 */
export function getProjectCreationUrl(
  role: UserRole,
  source = "dashboard"
): string {
  const roleConfig = getRoleConfig(role);
  return `/projects/create?role=${roleConfig.urlParam}&source=${source}`;
}

/**
 * Get role-based gradient colors for styling
 */
export function getRoleGradient(role: UserRole): {
  from: string;
  to: string;
  border: string;
} {
  const gradients = {
    executive: {
      from: "from-purple-50",
      to: "to-blue-50",
      border: "border-purple-100",
    },
    "content-manager": {
      from: "from-blue-50",
      to: "to-green-50",
      border: "border-blue-100",
    },
    analyst: {
      from: "from-green-50",
      to: "to-blue-50",
      border: "border-green-100",
    },
  };

  return gradients[role];
}
