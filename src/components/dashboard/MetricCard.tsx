/**
 * Professional Metric Card Component with Enhanced Micro-interactions
 * Modern card design with sophisticated animations and visual effects
 */

"use client";

import { useState } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: "increase" | "decrease";
    period?: string;
  };
  icon: LucideIcon;
  description?: string;
  className?: string;
  trend?: "up" | "down" | "neutral";
}

export const MetricCard = ({
  title,
  value,
  change,
  icon: Icon,
  description,
  className,
  trend = "neutral",
}: MetricCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const getTrendColor = () => {
    switch (trend) {
      case "up":
        return "text-green-600";
      case "down":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getChangeColor = () => {
    if (!change) return "";
    return change.type === "increase" ? "text-green-600" : "text-red-600";
  };

  const handleClick = () => {
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 200);
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white p-6",
        "glass-card hover-lift card-interactive",
        "group relative cursor-pointer overflow-hidden",
        "transform transition-all duration-300 ease-out",
        isHovered && "shadow-2xl shadow-blue-500/10",
        isClicked && "animate-bounce-subtle",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="mb-1 truncate text-sm font-medium text-gray-600">
            {title}
          </p>
          <p
            className={cn(
              "mb-1 text-2xl font-bold transition-all duration-300",
              isHovered ? "text-gradient-animated" : "text-gray-900"
            )}
          >
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {description && (
            <p className="truncate text-sm text-gray-500">{description}</p>
          )}
        </div>

        <div className="ml-4 flex-shrink-0">
          <div
            className={cn(
              "rounded-lg bg-blue-50 p-3 transition-all duration-300",
              "relative overflow-hidden",
              isHovered && "animate-pulse-glow scale-110 bg-blue-100"
            )}
          >
            <Icon
              className={cn(
                "relative z-10 h-6 w-6 transition-all duration-300",
                isHovered ? "text-blue-700" : "text-blue-600"
              )}
            />

            {/* Icon background glow */}
            {isHovered && (
              <div className="absolute inset-0 animate-pulse rounded-lg bg-gradient-to-r from-blue-400/20 to-purple-400/20" />
            )}
          </div>
        </div>
      </div>

      {change && (
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span
              className={cn(
                "flex items-center text-sm font-medium",
                getChangeColor()
              )}
            >
              {change.type === "increase" ? "↗" : "↘"}
              <span className="ml-1">
                {change.type === "increase" ? "+" : "-"}
                {Math.abs(change.value)}%
              </span>
            </span>
            <span className="text-sm text-gray-500">
              {change.period || "vs last month"}
            </span>
          </div>

          {/* Trend indicator */}
          <div className={cn("text-sm font-medium", getTrendColor())}>
            {trend === "up" && "📈"}
            {trend === "down" && "📉"}
            {trend === "neutral" && "➖"}
          </div>
        </div>
      )}

      {/* Enhanced gradient overlay and effects */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-r from-blue-50/0 via-blue-50/30 to-purple-50/0",
          "pointer-events-none rounded-xl transition-opacity duration-300",
          isHovered ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Shimmer effect on hover */}
      {isHovered && (
        <div className="absolute inset-0 overflow-hidden rounded-xl">
          <div className="animate-shimmer absolute -top-2 -bottom-2 left-0 w-1/2 skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
      )}

      {/* Success celebration effect for positive trends */}
      {isClicked && trend === "up" && (
        <div className="animate-bounce-subtle absolute top-2 right-2 text-2xl">
          ✨
        </div>
      )}
    </div>
  );
};
