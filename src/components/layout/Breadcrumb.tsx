/**
 * Professional Breadcrumb Component
 * Navigation breadcrumb with smart path generation
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href: string;
  current?: boolean;
}

export const Breadcrumb = () => {
  const pathname = usePathname();

  // Generate breadcrumb items from pathname
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = pathname.split("/").filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    // Add home
    breadcrumbs.push({
      label: "Dashboard",
      href: "/dashboard",
    });

    // Add path segments
    let currentPath = "";
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;

      // Skip the first 'dashboard' segment as it's already added
      if (segment === "dashboard") return;

      const isLast = index === pathSegments.length - 1;
      const label =
        segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");

      breadcrumbs.push({
        label,
        href: currentPath,
        current: isLast,
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // Don't show breadcrumb if only dashboard
  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav
      className="flex items-center space-x-2 text-sm"
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center space-x-2">
        {breadcrumbs.map((item, index) => (
          <li key={item.href} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="mx-2 h-4 w-4 text-gray-400" />
            )}

            {item.current ? (
              <span className="font-medium text-gray-900">{item.label}</span>
            ) : (
              <Link
                href={item.href}
                className={cn(
                  "text-gray-500 transition-colors duration-200 hover:text-gray-700",
                  "underline-offset-4 hover:underline"
                )}
              >
                {index === 0 && <Home className="mr-1 inline h-4 w-4" />}
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};
