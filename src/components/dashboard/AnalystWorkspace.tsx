/**
 * Analyst Workspace Component
 * Advanced data exploration and analytics dashboard for data analysts
 */

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { MetricCard } from "./MetricCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Database,
  Filter,
  Download,
  RefreshCw,
  Search,
  Zap,
  Activity,
  PieChart,
  LineChart,
  Users,
  Globe,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
} from "lucide-react";

interface DataPoint {
  label: string;
  value: number;
  change: number;
  trend: "up" | "down" | "neutral";
}

interface Segment {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export const AnalystWorkspace = () => {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "1y">(
    "30d"
  );
  // Chart state removed as not currently used

  const keyMetrics = [
    {
      title: "Total Sessions",
      value: "2.4M",
      change: { value: 18, type: "increase" as const },
      icon: Users,
      description: "Monthly active sessions",
      trend: "up" as const,
    },
    {
      title: "Conversion Rate",
      value: "3.8%",
      change: { value: 0.4, type: "increase" as const },
      icon: Target,
      description: "Goal completion rate",
      trend: "up" as const,
    },
    {
      title: "Avg. Session Duration",
      value: "4m 32s",
      change: { value: 23, type: "increase" as const },
      icon: Clock,
      description: "User engagement time",
      trend: "up" as const,
    },
    {
      title: "Bounce Rate",
      value: "24.5%",
      change: { value: 8, type: "decrease" as const },
      icon: Activity,
      description: "Single page visits",
      trend: "up" as const,
    },
  ];

  const trafficSources: DataPoint[] = [
    { label: "Organic Search", value: 1250000, change: 15, trend: "up" },
    { label: "Direct", value: 680000, change: 8, trend: "up" },
    { label: "Social Media", value: 420000, change: -5, trend: "down" },
    { label: "Paid Search", value: 180000, change: 22, trend: "up" },
    { label: "Referral", value: 95000, change: 12, trend: "up" },
    { label: "Email", value: 75000, change: 6, trend: "up" },
  ];

  const topPages: DataPoint[] = [
    { label: "/content-strategy-guide", value: 45000, change: 28, trend: "up" },
    { label: "/seo-tools-comparison", value: 38000, change: 15, trend: "up" },
    { label: "/competitor-analysis", value: 32000, change: -3, trend: "down" },
    { label: "/keyword-research-tool", value: 28000, change: 35, trend: "up" },
    {
      label: "/content-calendar-template",
      value: 24000,
      change: 18,
      trend: "up",
    },
  ];

  const audienceSegments: Segment[] = [
    {
      name: "Content Marketers",
      value: 580000,
      percentage: 35,
      color: "bg-blue-500",
    },
    {
      name: "SEO Professionals",
      value: 480000,
      percentage: 29,
      color: "bg-green-500",
    },
    {
      name: "Digital Agencies",
      value: 330000,
      percentage: 20,
      color: "bg-purple-500",
    },
    {
      name: "Small Business",
      value: 180000,
      percentage: 11,
      color: "bg-amber-500",
    },
    { name: "Enterprise", value: 80000, percentage: 5, color: "bg-red-500" },
  ];

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Analytics Workspace
          </h1>
          <p className="text-gray-600">
            Advanced data exploration and performance insights
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center rounded-lg border border-gray-200 bg-white">
            {["7d", "30d", "90d", "1y"].map(range => (
              <Button
                key={range}
                variant={timeRange === range ? "default" : "ghost"}
                size="sm"
                onClick={() =>
                  setTimeRange(range as "7d" | "30d" | "90d" | "1y")
                }
                className="rounded-none first:rounded-l-lg last:rounded-r-lg"
              >
                {range}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Key Performance Metrics */}
      <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">
              Performance Overview
            </h2>
            <p className="text-gray-600">
              Key metrics and performance indicators
            </p>
          </div>
          <div className="flex items-center space-x-2 rounded-lg bg-indigo-100 px-3 py-1.5 text-sm text-indigo-700">
            <Activity className="h-4 w-4" />
            <span>Live Data</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {keyMetrics.map((metric, index) => (
            <MetricCard
              key={index}
              title={metric.title}
              value={metric.value}
              change={metric.change}
              icon={metric.icon}
              description={metric.description}
              trend={metric.trend}
              className="bg-white/80 backdrop-blur-sm hover:bg-white/90"
            />
          ))}
        </div>
      </div>

      {/* Data Visualization Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Traffic Sources */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Traffic Sources
            </h3>
            <Badge
              variant="outline"
              className="border-blue-200 bg-blue-50 text-blue-700"
            >
              Last 30 days
            </Badge>
          </div>

          <div className="space-y-4">
            {trafficSources.map((source, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100"
              >
                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-medium text-gray-900">
                      {source.label}
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {formatNumber(source.value)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="h-2 flex-1 rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{
                          width: `${(source.value / trafficSources[0]!.value) * 100}%`,
                        }}
                      />
                    </div>
                    <div
                      className={cn(
                        "flex items-center space-x-1 text-xs font-medium",
                        source.trend === "up"
                          ? "text-green-600"
                          : "text-red-600"
                      )}
                    >
                      {source.trend === "up" ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      <span>{Math.abs(source.change)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performing Pages */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Top Pages</h3>
            <Badge
              variant="outline"
              className="border-green-200 bg-green-50 text-green-700"
            >
              Page Views
            </Badge>
          </div>

          <div className="space-y-4">
            {topPages.map((page, index) => (
              <div
                key={index}
                className="group flex cursor-pointer items-center justify-between rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="truncate font-medium text-gray-900 group-hover:text-blue-600">
                      {page.label}
                    </span>
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      {formatNumber(page.value)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="h-2 flex-1 rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-green-500"
                        style={{
                          width: `${(page.value / topPages[0]!.value) * 100}%`,
                        }}
                      />
                    </div>
                    <div
                      className={cn(
                        "flex items-center space-x-1 text-xs font-medium",
                        page.trend === "up" ? "text-green-600" : "text-red-600"
                      )}
                    >
                      {page.trend === "up" ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span>{Math.abs(page.change)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Audience Insights */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Audience Segments */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Audience Segments
            </h3>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <PieChart className="h-4 w-4" />
              <span>View Chart</span>
            </Button>
          </div>

          <div className="space-y-4">
            {audienceSegments.map((segment, index) => (
              <div key={index} className="flex items-center space-x-4">
                <div className={cn("h-4 w-4 rounded-full", segment.color)} />
                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-medium text-gray-900">
                      {segment.name}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700">
                        {formatNumber(segment.value)}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({segment.percentage}%)
                      </span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-gray-200">
                    <div
                      className={cn("h-2 rounded-full", segment.color)}
                      style={{ width: `${segment.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Insights */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-6 text-lg font-semibold text-gray-900">
            Quick Insights
          </h3>

          <div className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="mb-2 flex items-center space-x-2">
                <Zap className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  Peak Traffic
                </span>
              </div>
              <p className="text-xs text-blue-700">
                Tuesday 2-4 PM shows highest engagement rates (+34% above
                average)
              </p>
            </div>

            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="mb-2 flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">
                  Growth Opportunity
                </span>
              </div>
              <p className="text-xs text-green-700">
                Mobile traffic up 45% - optimize mobile experience for better
                conversions
              </p>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="mb-2 flex items-center space-x-2">
                <Target className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-900">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-amber-700">
                3 pages have bounce rates above 60% - review content quality
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Analytics Tools */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-lg bg-blue-50 p-3 transition-colors group-hover:bg-blue-100">
              <Search className="h-6 w-6 text-blue-600" />
            </div>
            <ArrowUpRight className="h-5 w-5 text-gray-400 transition-colors group-hover:text-blue-600" />
          </div>
          <h3 className="mb-2 font-semibold text-gray-900">Custom Reports</h3>
          <p className="mb-4 text-sm text-gray-600">
            Build custom analytics reports with advanced filtering
          </p>
          <div className="text-xs font-medium text-blue-600">
            Create Report →
          </div>
        </div>

        <div className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-lg bg-purple-50 p-3 transition-colors group-hover:bg-purple-100">
              <Database className="h-6 w-6 text-purple-600" />
            </div>
            <ArrowUpRight className="h-5 w-5 text-gray-400 transition-colors group-hover:text-purple-600" />
          </div>
          <h3 className="mb-2 font-semibold text-gray-900">Data Export</h3>
          <p className="mb-4 text-sm text-gray-600">
            Export data for external analysis and reporting
          </p>
          <div className="text-xs font-medium text-purple-600">
            Export Data →
          </div>
        </div>

        <div className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-lg bg-green-50 p-3 transition-colors group-hover:bg-green-100">
              <LineChart className="h-6 w-6 text-green-600" />
            </div>
            <ArrowUpRight className="h-5 w-5 text-gray-400 transition-colors group-hover:text-green-600" />
          </div>
          <h3 className="mb-2 font-semibold text-gray-900">Trend Analysis</h3>
          <p className="mb-4 text-sm text-gray-600">
            Identify patterns and forecast future performance
          </p>
          <div className="text-xs font-medium text-green-600">
            Analyze Trends →
          </div>
        </div>

        <div className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-lg bg-amber-50 p-3 transition-colors group-hover:bg-amber-100">
              <Globe className="h-6 w-6 text-amber-600" />
            </div>
            <ArrowUpRight className="h-5 w-5 text-gray-400 transition-colors group-hover:text-amber-600" />
          </div>
          <h3 className="mb-2 font-semibold text-gray-900">
            Geographic Insights
          </h3>
          <p className="mb-4 text-sm text-gray-600">
            Analyze performance by location and demographics
          </p>
          <div className="text-xs font-medium text-amber-600">View Map →</div>
        </div>
      </div>
    </div>
  );
};
