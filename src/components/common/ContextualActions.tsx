/**
 * Contextual Quick Actions Component
 * Context-aware floating action buttons that change based on current page
 */

"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Upload,
  Download,
  RefreshCw,
  Search,
  FileText,
  BarChart3,
  Target,
  Users,
  Settings,
  Lightbulb,
  Zap,
  type LucideIcon,
} from "lucide-react";

interface QuickAction {
  icon: LucideIcon;
  label: string;
  action: () => void;
  variant?: "default" | "primary" | "success" | "warning";
}

interface ContextualActionsProps {
  className?: string;
}

export const ContextualActions = ({ className }: ContextualActionsProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  // Get actions based on current route
  const getContextActions = (): QuickAction[] => {
    switch (true) {
      case pathname === "/dashboard":
        return [
          {
            icon: Plus,
            label: "New Project",
            action: () => router.push("/projects/new"),
            variant: "primary",
          },
          {
            icon: Search,
            label: "Content Gap Analysis",
            action: () => router.push("/content/gap-analysis"),
            variant: "default",
          },
          {
            icon: RefreshCw,
            label: "Refresh Data",
            action: () => window.location.reload(),
            variant: "default",
          },
        ];

      case pathname.startsWith("/projects"):
        return [
          {
            icon: Plus,
            label: "New Project",
            action: () => router.push("/projects/new"),
            variant: "primary",
          },
          {
            icon: Upload,
            label: "Import Projects",
            action: () => void 0, // Import projects placeholder
            variant: "default",
          },
          {
            icon: Download,
            label: "Export Projects",
            action: () => void 0, // Export projects placeholder
            variant: "default",
          },
        ];

      case pathname.startsWith("/content"):
        return [
          {
            icon: FileText,
            label: "New Content",
            action: () => router.push("/content/new"),
            variant: "primary",
          },
          {
            icon: Lightbulb,
            label: "Keyword Research",
            action: () => router.push("/content/keyword-research"),
            variant: "default",
          },
          {
            icon: Search,
            label: "Gap Analysis",
            action: () => router.push("/content/gap-analysis"),
            variant: "success",
          },
        ];

      case pathname.startsWith("/analytics"):
        return [
          {
            icon: Download,
            label: "Export Report",
            action: () => void 0, // Export analytics placeholder
            variant: "primary",
          },
          {
            icon: RefreshCw,
            label: "Refresh Data",
            action: () => window.location.reload(),
            variant: "default",
          },
          {
            icon: BarChart3,
            label: "Custom Report",
            action: () => router.push("/analytics/custom"),
            variant: "default",
          },
        ];

      case pathname.startsWith("/competitive"):
        return [
          {
            icon: Target,
            label: "New Analysis",
            action: () => router.push("/competitive/analyze"),
            variant: "primary",
          },
          {
            icon: Zap,
            label: "Quick Scan",
            action: () => void 0, // Quick competitor scan placeholder
            variant: "warning",
          },
          {
            icon: Download,
            label: "Export Report",
            action: () => void 0, // Export competitive data placeholder
            variant: "default",
          },
        ];

      case pathname.startsWith("/team"):
        return [
          {
            icon: Users,
            label: "Invite Member",
            action: () => router.push("/team/invite"),
            variant: "primary",
          },
          {
            icon: Settings,
            label: "Team Settings",
            action: () => router.push("/team/settings"),
            variant: "default",
          },
        ];

      default:
        return [
          {
            icon: Plus,
            label: "Quick Create",
            action: () => router.push("/projects/new"),
            variant: "primary",
          },
        ];
    }
  };

  const actions = getContextActions();

  if (actions.length === 0) return null;

  const getButtonVariant = (variant?: string) => {
    switch (variant) {
      case "primary":
        return "default";
      case "success":
        return "outline";
      case "warning":
        return "outline";
      default:
        return "outline";
    }
  };

  const getButtonClasses = (variant?: string, isMain = false) => {
    const baseClasses =
      "rounded-full shadow-lg hover:shadow-xl transition-all duration-300 border-2 hover-lift btn-magnetic";

    if (isMain) {
      return cn(
        baseClasses,
        "w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-blue-600 hover:border-blue-700 animate-pulse-glow"
      );
    }

    switch (variant) {
      case "primary":
        return cn(
          baseClasses,
          "w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
        );
      case "success":
        return cn(
          baseClasses,
          "w-12 h-12 bg-green-600 hover:bg-green-700 text-white border-green-600"
        );
      case "warning":
        return cn(
          baseClasses,
          "w-12 h-12 bg-amber-600 hover:bg-amber-700 text-white border-amber-600"
        );
      default:
        return cn(
          baseClasses,
          "w-12 h-12 bg-white hover:bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300"
        );
    }
  };

  const mainAction = actions[0];
  const secondaryActions = actions.slice(1);

  if (!mainAction) return null;

  return (
    <div className={cn("fixed right-6 bottom-6 z-40", className)}>
      <div className="flex flex-col items-end space-y-3">
        {/* Secondary Actions */}
        {isExpanded &&
          secondaryActions.map((action, index) => (
            <div
              key={index}
              className="animate-slide-in-right stagger-item flex items-center space-x-3"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="rounded-lg bg-gray-900/75 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
                {action.label}
              </div>
              <Button
                variant={getButtonVariant(action.variant)}
                size="sm"
                onClick={action.action}
                className={getButtonClasses(action.variant)}
                title={action.label}
              >
                <action.icon className="h-5 w-5" />
              </Button>
            </div>
          ))}

        {/* Main Action Button */}
        <div className="relative">
          {secondaryActions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                "absolute -top-2 -right-2 z-10 h-6 w-6 rounded-full border-gray-600 bg-gray-600 p-0 text-white hover:bg-gray-700",
                isExpanded && "rotate-45"
              )}
              title={isExpanded ? "Close menu" : "More actions"}
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}

          <Button
            variant="default"
            onClick={mainAction.action}
            className={getButtonClasses(mainAction.variant, true)}
            title={mainAction.label}
          >
            <mainAction.icon className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
};
