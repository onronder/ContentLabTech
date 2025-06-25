/**
 * Professional Logo Component
 * Consistent branding across the application
 */

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useUIState } from "@/hooks/state/useUIState";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  variant?: "default" | "minimal" | "icon-only";
  className?: string;
}

export const Logo = ({
  size = "md",
  variant = "default",
  className,
}: LogoProps) => {
  const { sidebarExpanded } = useUIState();

  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-xl",
    "2xl": "text-2xl",
    "3xl": "text-3xl",
    "4xl": "text-4xl",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
    xl: "w-7 h-7",
    "2xl": "w-8 h-8",
    "3xl": "w-10 h-10",
    "4xl": "w-12 h-12",
  };

  const showText =
    variant !== "icon-only" && (variant === "default" || sidebarExpanded);

  return (
    <Link
      href="/dashboard"
      className={cn(
        "group flex items-center space-x-3 p-4 transition-all duration-200 hover:opacity-80",
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 font-bold text-white transition-transform group-hover:scale-105",
          iconSizes[size]
        )}
      >
        <span
          className={cn(
            "font-extrabold",
            size === "sm"
              ? "text-xs"
              : size === "md"
                ? "text-sm"
                : size === "lg"
                  ? "text-base"
                  : size === "xl"
                    ? "text-lg"
                    : size === "2xl"
                      ? "text-xl"
                      : size === "3xl"
                        ? "text-2xl"
                        : "text-3xl"
          )}
        >
          C
        </span>
      </div>

      {/* Text */}
      {showText && (
        <div className="flex min-w-0 flex-col">
          <span
            className={cn(
              "truncate font-bold text-gray-900 transition-colors group-hover:text-blue-600",
              sizeClasses[size]
            )}
          >
            ContentLab
          </span>
          {(size === "lg" ||
            size === "xl" ||
            size === "2xl" ||
            size === "3xl" ||
            size === "4xl") && (
            <span
              className={cn(
                "truncate text-xs font-medium text-gray-500 transition-colors group-hover:text-blue-500",
                size === "4xl"
                  ? "text-sm"
                  : size === "3xl"
                    ? "text-xs"
                    : "text-xs"
              )}
            >
              Nexus
            </span>
          )}
        </div>
      )}
    </Link>
  );
};
