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
              "hover:bg-blue-50 hover:text-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none",
              isActive
                ? "border border-blue-200 bg-blue-100 text-blue-700 shadow-sm"
                : "text-gray-700 hover:text-blue-700"
            )}
          >
            <item.icon
              className={cn(
                "h-5 w-5 flex-shrink-0 transition-colors duration-200",
                isActive
                  ? "text-blue-600"
                  : "text-gray-400 group-hover:text-blue-600"
              )}
            />

            {sidebarExpanded && (
              <div className="ml-3 min-w-0 flex-1 overflow-hidden">
                <div
                  className={cn(
                    "truncate font-medium transition-colors duration-200",
                    isActive
                      ? "text-blue-700"
                      : "text-gray-900 group-hover:text-blue-700"
                  )}
                >
                  {item.name}
                </div>
                <div
                  className={cn(
                    "mt-0.5 truncate text-xs transition-colors duration-200",
                    isActive
                      ? "text-blue-500"
                      : "text-gray-500 group-hover:text-blue-500"
                  )}
                >
                  {item.description}
                </div>
              </div>
            )}

            {/* Badge */}
            {item.badge && sidebarExpanded && (
              <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-600">
                {item.badge}
              </span>
            )}

            {/* Active indicator */}
            {isActive && (
              <div className="absolute top-1/2 left-0 h-6 w-1 -translate-y-1/2 rounded-r-full bg-blue-600" />
            )}
          </Link>
        );
      })}
    </nav>
  );
};
