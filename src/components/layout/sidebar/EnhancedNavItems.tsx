/**
 * Enhanced Navigation Items Component
 * Professional sidebar navigation with descriptions and smooth interactions
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUIState } from "@/hooks/state/useUIState";
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  BarChart3,
  Target,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  description: string;
  badge?: string;
}

const navigationItems: NavigationItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Overview and insights",
  },
  {
    name: "Projects",
    href: "/projects",
    icon: FolderOpen,
    description: "Manage your projects",
  },
  {
    name: "Content",
    href: "/content",
    icon: FileText,
    description: "Content management",
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    description: "Performance metrics",
  },
  {
    name: "Competitive",
    href: "/competitive",
    icon: Target,
    description: "Competitor analysis",
  },
  {
    name: "Team",
    href: "/team",
    icon: Users,
    description: "Team management",
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Account settings",
  },
];

export const EnhancedNavItems = () => {
  const { sidebarExpanded } = useUIState();
  const pathname = usePathname();

  return (
    <nav className="space-y-1 px-3">
      {navigationItems.map(item => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/");

        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
              "hover:from-primary-50 hover:to-secondary-50/50 hover:text-primary-700 focus:ring-primary-500 hover:bg-gradient-to-r focus:ring-2 focus:ring-offset-2 focus:outline-none",
              isActive
                ? "border-primary-200 from-primary-100 to-secondary-100/50 text-primary-700 border bg-gradient-to-r shadow-md"
                : "hover:text-primary-700 text-neutral-700"
            )}
          >
            <item.icon
              className={cn(
                "h-5 w-5 flex-shrink-0 transition-colors duration-200",
                isActive
                  ? "text-primary-600"
                  : "group-hover:text-primary-600 text-neutral-400"
              )}
            />

            {sidebarExpanded && (
              <div className="ml-3 min-w-0 flex-1 overflow-hidden">
                <div
                  className={cn(
                    "truncate font-medium transition-colors duration-200",
                    isActive
                      ? "text-primary-700"
                      : "group-hover:text-primary-700 text-neutral-900"
                  )}
                >
                  {item.name}
                </div>
                <div
                  className={cn(
                    "mt-0.5 truncate text-xs transition-colors duration-200",
                    isActive
                      ? "text-primary-500"
                      : "group-hover:text-primary-500 text-neutral-500"
                  )}
                >
                  {item.description}
                </div>
              </div>
            )}

            {/* Badge */}
            {item.badge && sidebarExpanded && (
              <span className="from-secondary-100 to-secondary-200 text-secondary-700 ml-2 inline-flex items-center rounded-full bg-gradient-to-r px-2 py-0.5 text-xs font-medium">
                {item.badge}
              </span>
            )}

            {/* Active indicator */}
            {isActive && (
              <div className="from-primary-500 to-secondary-500 absolute top-1/2 left-0 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b" />
            )}
          </Link>
        );
      })}
    </nav>
  );
};
