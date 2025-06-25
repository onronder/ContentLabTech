/**
 * Executive Dashboard Component
 * Strategic overview for executives with high-level insights and KPIs
 */

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { MetricCard } from "./MetricCard";
import { InsightCard } from "./InsightCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Target,
  DollarSign,
  Users,
  BarChart3,
  Calendar,
  ArrowUpRight,
  Download,
  RefreshCw,
} from "lucide-react";

export const ExecutiveDashboard = () => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setRefreshing(false);
  };

  const strategicMetrics = [
    {
      title: "Content Performance",
      value: "94%",
      change: { value: 12, type: "increase" as const },
      icon: TrendingUp,
      description: "Above industry average",
      trend: "up" as const,
    },
    {
      title: "Market Position",
      value: "#3",
      change: { value: 2, type: "increase" as const },
      icon: Target,
      description: "In target keywords",
      trend: "up" as const,
    },
    {
      title: "Revenue Impact",
      value: "$2.4M",
      change: { value: 28, type: "increase" as const },
      icon: DollarSign,
      description: "Attributed revenue",
      trend: "up" as const,
    },
    {
      title: "Team Efficiency",
      value: "87%",
      change: { value: 5, type: "increase" as const },
      icon: Users,
      description: "Productivity score",
      trend: "up" as const,
    },
  ];

  const aiInsights = [
    {
      priority: "high" as const,
      title: "Content Gap Opportunity",
      description:
        'Target "AI content strategy" - 45K monthly searches, low competition. Potential to capture 15% market share within 3 months.',
      action: "Create Content Plan",
      category: "Strategic Opportunity",
      metric: { value: "+$380K", label: "Revenue Potential" },
    },
    {
      priority: "medium" as const,
      title: "Competitor Movement",
      description:
        "Competitor X launched new feature suite. Market analysis shows 12% engagement increase in their target demographic.",
      action: "Analyze Impact",
      category: "Competitive Intelligence",
      metric: { value: "12%", label: "Market Shift" },
    },
    {
      priority: "low" as const,
      title: "Team Performance",
      description:
        "Content team productivity up 23% this quarter. Recommend expanding team capacity to capitalize on momentum.",
      action: "Review Capacity",
      category: "Team Optimization",
      metric: { value: "+23%", label: "Productivity" },
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Executive Overview
          </h1>
          <p className="text-gray-600">
            Strategic insights and key performance indicators
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Badge
            variant="outline"
            className="border-green-200 bg-green-50 text-green-700"
          >
            Live Data
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2"
          >
            <RefreshCw
              className={cn("h-4 w-4", refreshing && "animate-spin")}
            />
            <span>Refresh</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      {/* Strategic Overview */}
      <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">
              Strategic Performance
            </h2>
            <p className="text-gray-600">Key metrics driving business growth</p>
          </div>
          <div className="flex items-center space-x-2 rounded-lg bg-blue-100 px-3 py-1.5 text-sm text-blue-700">
            <Calendar className="h-4 w-4" />
            <span>Q4 2024</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {strategicMetrics.map((metric, index) => (
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

      {/* AI-Powered Strategic Insights */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="mb-1 text-lg font-semibold text-gray-900">
              AI Strategic Recommendations
            </h3>
            <p className="text-sm text-gray-600">
              Data-driven insights for strategic decision making
            </p>
          </div>
          <Badge variant="secondary" className="bg-purple-100 text-purple-700">
            Updated 2h ago
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {aiInsights.map((insight, index) => (
            <InsightCard
              key={index}
              priority={insight.priority}
              title={insight.title}
              description={insight.description}
              action={insight.action}
              category={insight.category}
              metric={insight.metric}
            />
          ))}
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-lg bg-blue-50 p-3 transition-colors group-hover:bg-blue-100">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <ArrowUpRight className="h-5 w-5 text-gray-400 transition-colors group-hover:text-blue-600" />
          </div>
          <h3 className="mb-2 font-semibold text-gray-900">
            Performance Analytics
          </h3>
          <p className="mb-4 text-sm text-gray-600">
            Deep dive into content performance metrics and ROI analysis
          </p>
          <div className="text-xs font-medium text-blue-600">
            View Detailed Reports →
          </div>
        </div>

        <div className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-lg bg-green-50 p-3 transition-colors group-hover:bg-green-100">
              <Target className="h-6 w-6 text-green-600" />
            </div>
            <ArrowUpRight className="h-5 w-5 text-gray-400 transition-colors group-hover:text-green-600" />
          </div>
          <h3 className="mb-2 font-semibold text-gray-900">
            Competitive Intelligence
          </h3>
          <p className="mb-4 text-sm text-gray-600">
            Monitor market movements and competitive positioning
          </p>
          <div className="text-xs font-medium text-green-600">
            Access Intelligence →
          </div>
        </div>

        <div className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-lg bg-purple-50 p-3 transition-colors group-hover:bg-purple-100">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <ArrowUpRight className="h-5 w-5 text-gray-400 transition-colors group-hover:text-purple-600" />
          </div>
          <h3 className="mb-2 font-semibold text-gray-900">Team Performance</h3>
          <p className="mb-4 text-sm text-gray-600">
            Review team productivity and resource allocation
          </p>
          <div className="text-xs font-medium text-purple-600">
            Manage Teams →
          </div>
        </div>
      </div>
    </div>
  );
};
