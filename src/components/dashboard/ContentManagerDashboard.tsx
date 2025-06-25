/**
 * Content Manager Dashboard Component
 * Editorial workflow dashboard with content pipeline and performance tracking
 */

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { MetricCard } from "./MetricCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  Clock,
  CheckCircle,
  TrendingUp,
  Calendar,
  Users,
  Target,
  Edit3,
  Eye,
  ThumbsUp,
  Plus,
  Filter,
} from "lucide-react";

interface ContentItem {
  id: string;
  title: string;
  status: "draft" | "review" | "approved" | "published";
  author: string;
  assignedTo?: string;
  dueDate: string;
  performance?: {
    views: number;
    engagement: number;
    conversions: number;
  };
  keywords: string[];
  priority: "high" | "medium" | "low";
}

export const ContentManagerDashboard = () => {
  const [activeFilter, setActiveFilter] = useState<
    "all" | "draft" | "review" | "approved" | "published"
  >("all");

  const contentMetrics = [
    {
      title: "Content in Pipeline",
      value: "24",
      change: { value: 8, type: "increase" as const },
      icon: FileText,
      description: "Active content pieces",
      trend: "up" as const,
    },
    {
      title: "Avg. Time to Publish",
      value: "4.2d",
      change: { value: 12, type: "decrease" as const },
      icon: Clock,
      description: "Days from draft to live",
      trend: "up" as const,
    },
    {
      title: "Content Quality Score",
      value: "94%",
      change: { value: 6, type: "increase" as const },
      icon: CheckCircle,
      description: "Editorial standards",
      trend: "up" as const,
    },
    {
      title: "Team Efficiency",
      value: "87%",
      change: { value: 15, type: "increase" as const },
      icon: Users,
      description: "Workflow completion rate",
      trend: "up" as const,
    },
  ];

  const contentPipeline: ContentItem[] = [
    {
      id: "1",
      title: "AI Content Strategy Guide 2024",
      status: "review",
      author: "Sarah Chen",
      assignedTo: "Mike Johnson",
      dueDate: "2024-01-15",
      keywords: ["AI", "Content Strategy", "SEO"],
      priority: "high",
    },
    {
      id: "2",
      title: "Competitor Analysis Framework",
      status: "draft",
      author: "Alex Rivera",
      dueDate: "2024-01-18",
      keywords: ["Competitive Analysis", "Framework"],
      priority: "medium",
    },
    {
      id: "3",
      title: "Content Marketing ROI Calculator",
      status: "approved",
      author: "Emma Davis",
      assignedTo: "Development Team",
      dueDate: "2024-01-12",
      keywords: ["ROI", "Calculator", "Tools"],
      priority: "high",
    },
    {
      id: "4",
      title: "SEO Trends Q1 2024",
      status: "published",
      author: "Jordan Park",
      dueDate: "2024-01-10",
      performance: {
        views: 15420,
        engagement: 89,
        conversions: 234,
      },
      keywords: ["SEO", "Trends", "2024"],
      priority: "medium",
    },
  ];

  const filteredContent =
    activeFilter === "all"
      ? contentPipeline
      : contentPipeline.filter(item => item.status === activeFilter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-700 border-gray-200";
      case "review":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "approved":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "published":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700 border-red-200";
      case "medium":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "low":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Content Manager
          </h1>
          <p className="text-gray-600">
            Editorial workflow and content performance dashboard
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <Filter className="h-4 w-4" />
            <span>Filter</span>
          </Button>
          <Button className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>New Content</span>
          </Button>
        </div>
      </div>

      {/* Content Pipeline Overview */}
      <div className="rounded-xl border border-green-100 bg-gradient-to-r from-green-50 to-blue-50 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">
              Editorial Pipeline
            </h2>
            <p className="text-gray-600">
              Content workflow and team performance metrics
            </p>
          </div>
          <div className="flex items-center space-x-2 rounded-lg bg-green-100 px-3 py-1.5 text-sm text-green-700">
            <Calendar className="h-4 w-4" />
            <span>This Week</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {contentMetrics.map((metric, index) => (
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

      {/* Content Pipeline Status */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Pipeline Progress */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Pipeline Progress
          </h3>

          <div className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-gray-600">Draft to Review</span>
                <span className="font-medium">8/12</span>
              </div>
              <Progress value={67} className="h-2" />
            </div>

            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-gray-600">Review to Approved</span>
                <span className="font-medium">5/8</span>
              </div>
              <Progress value={63} className="h-2" />
            </div>

            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-gray-600">Approved to Published</span>
                <span className="font-medium">3/5</span>
              </div>
              <Progress value={60} className="h-2" />
            </div>
          </div>
        </div>

        {/* Team Performance */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Team Performance
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <span className="text-sm font-medium text-blue-700">SC</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Sarah Chen</p>
                  <p className="text-xs text-gray-500">Content Writer</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-green-600">94%</p>
                <p className="text-xs text-gray-500">Efficiency</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                  <span className="text-sm font-medium text-green-700">AR</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Alex Rivera</p>
                  <p className="text-xs text-gray-500">Senior Editor</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-green-600">89%</p>
                <p className="text-xs text-gray-500">Efficiency</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                  <span className="text-sm font-medium text-purple-700">
                    ED
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Emma Davis</p>
                  <p className="text-xs text-gray-500">Content Strategist</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-green-600">92%</p>
                <p className="text-xs text-gray-500">Efficiency</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Quick Actions
          </h3>

          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <Edit3 className="mr-2 h-4 w-4" />
              Assign Content
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Eye className="mr-2 h-4 w-4" />
              Review Queue
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Calendar className="mr-2 h-4 w-4" />
              Content Calendar
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Target className="mr-2 h-4 w-4" />
              Content Strategy
            </Button>
          </div>
        </div>
      </div>

      {/* Content Pipeline Table */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Content Pipeline
            </h3>
            <div className="flex items-center space-x-2">
              {(
                ["all", "draft", "review", "approved", "published"] as const
              ).map(filter => (
                <Button
                  key={filter}
                  variant={activeFilter === filter ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter(filter)}
                  className="capitalize"
                >
                  {filter}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="p-4 text-left font-medium text-gray-700">
                  Content
                </th>
                <th className="p-4 text-left font-medium text-gray-700">
                  Status
                </th>
                <th className="p-4 text-left font-medium text-gray-700">
                  Author
                </th>
                <th className="p-4 text-left font-medium text-gray-700">
                  Due Date
                </th>
                <th className="p-4 text-left font-medium text-gray-700">
                  Priority
                </th>
                <th className="p-4 text-left font-medium text-gray-700">
                  Performance
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredContent.map(item => (
                <tr
                  key={item.id}
                  className="border-b border-gray-100 transition-colors hover:bg-gray-50"
                >
                  <td className="p-4">
                    <div>
                      <p className="mb-1 font-medium text-gray-900">
                        {item.title}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {item.keywords.map((keyword, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs"
                          >
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge
                      variant="outline"
                      className={cn("capitalize", getStatusColor(item.status))}
                    >
                      {item.status}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="font-medium text-gray-900">{item.author}</p>
                      {item.assignedTo && (
                        <p className="text-xs text-gray-500">
                          Assigned to: {item.assignedTo}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="text-gray-900">{item.dueDate}</p>
                  </td>
                  <td className="p-4">
                    <Badge
                      variant="outline"
                      className={cn(
                        "capitalize",
                        getPriorityColor(item.priority)
                      )}
                    >
                      {item.priority}
                    </Badge>
                  </td>
                  <td className="p-4">
                    {item.performance ? (
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <Eye className="h-3 w-3 text-gray-400" />
                          <span>{item.performance.views.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <ThumbsUp className="h-3 w-3 text-gray-400" />
                          <span>{item.performance.engagement}%</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <TrendingUp className="h-3 w-3 text-gray-400" />
                          <span>{item.performance.conversions}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">
                        Not published
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
