/**
 * AI-Powered Insight Card Component
 * Professional insight display with priority indicators and actions
 */

import { Lightbulb, AlertTriangle, TrendingUp, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface InsightCardProps {
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  action: string;
  actionCallback?: () => void;
  category?: string;
  metric?: {
    value: string;
    label: string;
  };
  className?: string;
}

export const InsightCard = ({
  priority,
  title,
  description,
  action,
  actionCallback,
  category,
  metric,
  className,
}: InsightCardProps) => {
  const getPriorityConfig = () => {
    switch (priority) {
      case "high":
        return {
          icon: AlertTriangle,
          color: "text-red-600",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          badgeVariant: "destructive" as const,
        };
      case "medium":
        return {
          icon: TrendingUp,
          color: "text-amber-600",
          bgColor: "bg-amber-50",
          borderColor: "border-amber-200",
          badgeVariant: "secondary" as const,
        };
      default:
        return {
          icon: Lightbulb,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          badgeVariant: "outline" as const,
        };
    }
  };

  const config = getPriorityConfig();
  const IconComponent = config.icon;

  return (
    <div
      className={cn(
        "group rounded-xl border bg-white p-6 transition-all duration-200 hover:shadow-md",
        config.borderColor,
        className
      )}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div
            className={cn(
              "rounded-lg p-2.5 transition-transform group-hover:scale-110",
              config.bgColor
            )}
          >
            <IconComponent className={cn("h-5 w-5", config.color)} />
          </div>
          <div className="flex flex-col">
            <Badge
              variant={config.badgeVariant}
              className="mb-1 w-fit text-xs font-medium"
            >
              {priority.toUpperCase()} PRIORITY
            </Badge>
            {category && (
              <span className="text-xs font-medium text-gray-500">
                {category}
              </span>
            )}
          </div>
        </div>

        {metric && (
          <div className="text-right">
            <div className="text-lg font-bold text-gray-900">
              {metric.value}
            </div>
            <div className="text-xs text-gray-500">{metric.label}</div>
          </div>
        )}
      </div>

      <div className="mb-4">
        <h3 className="mb-2 line-clamp-2 font-semibold text-gray-900">
          {title}
        </h3>
        <p className="line-clamp-3 text-sm leading-relaxed text-gray-600">
          {description}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <Zap className="h-3 w-3" />
          <span>AI Insight</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={actionCallback}
          className={cn(
            "text-xs font-medium transition-all duration-200",
            "hover:shadow-sm",
            priority === "high" &&
              "border-red-200 text-red-700 hover:bg-red-50",
            priority === "medium" &&
              "border-amber-200 text-amber-700 hover:bg-amber-50",
            priority === "low" &&
              "border-blue-200 text-blue-700 hover:bg-blue-50"
          )}
        >
          {action}
        </Button>
      </div>
    </div>
  );
};
