"use client";

/**
 * Premium Dashboard Component
 * Executive-grade dashboard with sophisticated analytics and insights
 */

import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  BarChart3,
  Zap,
  Eye,
  MousePointer,
  Clock,
  Plus,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle,
  Activity,
  Calendar,
  Lightbulb,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const PremiumDashboard = () => {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");
  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const executiveMetrics = [
    {
      title: "Content Performance",
      value: "94.2%",
      change: "+12.5%",
      trend: "up" as const,
      icon: TrendingUp,
      description: "Above industry average",
      color: "text-success-600",
      bgColor: "bg-success-50 dark:bg-success-950",
      iconColor: "text-success-600",
    },
    {
      title: "Market Position",
      value: "#3",
      change: "+2 ranks",
      trend: "up" as const,
      icon: Target,
      description: "In content ranking",
      color: "text-brand-blue",
      bgColor: "bg-brand-blue-50 dark:bg-brand-blue-950",
      iconColor: "text-brand-blue",
    },
    {
      title: "Content Velocity",
      value: "24",
      change: "+8 this month",
      trend: "up" as const,
      icon: Zap,
      description: "Pieces published",
      color: "text-brand-amber",
      bgColor: "bg-brand-amber-50 dark:bg-brand-amber-950",
      iconColor: "text-brand-amber",
    },
    {
      title: "Team Efficiency",
      value: "87%",
      change: "+5.2%",
      trend: "up" as const,
      icon: Users,
      description: "Productivity score",
      color: "text-brand-emerald",
      bgColor: "bg-brand-emerald-50 dark:bg-brand-emerald-950",
      iconColor: "text-brand-emerald",
    },
  ];

  const performanceMetrics = [
    {
      label: "Total Views",
      value: "2.4M",
      change: "+18.2%",
      icon: Eye,
      trend: "up" as const,
    },
    {
      label: "Engagement Rate",
      value: "4.7%",
      change: "+0.8%",
      icon: MousePointer,
      trend: "up" as const,
    },
    {
      label: "Avg. Read Time",
      value: "3m 42s",
      change: "+12s",
      icon: Clock,
      trend: "up" as const,
    },
    {
      label: "Conversion Rate",
      value: "2.1%",
      change: "-0.2%",
      icon: Target,
      trend: "down" as const,
    },
  ];

  const recentActivities = [
    {
      type: "analysis",
      title: "AI Analysis Completed",
      description:
        "Content optimization suggestions ready for 'SEO Best Practices 2024'",
      time: "5 minutes ago",
      icon: Lightbulb,
      status: "completed",
    },
    {
      type: "alert",
      title: "Competitor Alert",
      description: "TechCorp published new content in your target keywords",
      time: "2 hours ago",
      icon: AlertTriangle,
      status: "warning",
    },
    {
      type: "success",
      title: "Content Published",
      description:
        "Your team published 'Advanced React Patterns' with 95% SEO score",
      time: "4 hours ago",
      icon: CheckCircle,
      status: "success",
    },
    {
      type: "activity",
      title: "Team Collaboration",
      description:
        "Sarah Chen and Mike Johnson are working on content strategy",
      time: "6 hours ago",
      icon: Activity,
      status: "active",
    },
  ];

  const quickActions = [
    {
      title: "Create Content",
      description: "Start a new content piece",
      icon: Plus,
      href: "/content/new",
      color: "bg-gradient-primary",
    },
    {
      title: "Analyze Performance",
      description: "Deep dive into metrics",
      icon: BarChart3,
      href: "/analytics",
      color: "bg-gradient-secondary",
    },
    {
      title: "Monitor Competitors",
      description: "Track competitor activity",
      icon: Target,
      href: "/competitive",
      color: "bg-gradient-accent",
    },
    {
      title: "Manage Team",
      description: "Invite and organize team",
      icon: Users,
      href: "/team",
      color: "bg-brand-slate-100 dark:bg-brand-slate-800",
    },
  ];

  if (isLoading) {
    return (
      <div className="animate-fade-in space-y-6">
        {/* Loading skeleton */}
        <div className="space-y-2">
          <div className="bg-muted h-8 w-1/4 animate-pulse rounded-md" />
          <div className="bg-muted h-4 w-1/2 animate-pulse rounded-md" />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-muted h-32 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up space-y-8">
      {/* Header Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-gradient-primary text-4xl font-bold">
              Executive Dashboard
            </h1>
            <p className="text-muted-foreground text-lg">
              Real-time insights into your content strategy performance
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Tabs
              value={timeRange}
              onValueChange={value =>
                setTimeRange(value as "7d" | "30d" | "90d")
              }
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="7d">7 Days</TabsTrigger>
                <TabsTrigger value="30d">30 Days</TabsTrigger>
                <TabsTrigger value="90d">90 Days</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Executive Metrics */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {executiveMetrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card
              key={metric.title}
              className="relative cursor-pointer overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-sm font-medium">
                      {metric.title}
                    </p>
                    <div className="flex items-center space-x-2">
                      <p className="text-3xl font-bold">{metric.value}</p>
                      <Badge
                        variant="secondary"
                        className={`${metric.color} ${metric.bgColor} border-0`}
                      >
                        {metric.change}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {metric.description}
                    </p>
                  </div>
                  <div className={`rounded-xl p-3 ${metric.bgColor}`}>
                    <Icon className={`h-6 w-6 ${metric.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Performance Overview */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-xl font-semibold">
                Performance Overview
              </CardTitle>
              <Button variant="outline" size="sm">
                <ArrowUpRight className="mr-2 h-4 w-4" />
                View Details
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                {performanceMetrics.map(metric => {
                  const Icon = metric.icon;
                  return (
                    <div key={metric.label} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Icon className="text-muted-foreground h-4 w-4" />
                          <span className="text-sm font-medium">
                            {metric.label}
                          </span>
                        </div>
                        <Badge
                          variant={
                            metric.trend === "up" ? "default" : "destructive"
                          }
                          className="text-xs"
                        >
                          {metric.trend === "up" ? (
                            <TrendingUp className="mr-1 h-3 w-3" />
                          ) : (
                            <TrendingDown className="mr-1 h-3 w-3" />
                          )}
                          {metric.change}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <p className="text-2xl font-bold">{metric.value}</p>
                        <Progress value={Math.random() * 100} className="h-2" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {quickActions.map(action => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={action.title}
                      variant="outline"
                      className="flex h-auto flex-col items-start space-y-2 p-4 transition-all duration-200 hover:scale-[1.02]"
                      asChild
                    >
                      <a href={action.href}>
                        <div className={`rounded-lg p-2 ${action.color}`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium">{action.title}</p>
                          <p className="text-muted-foreground text-xs">
                            {action.description}
                          </p>
                        </div>
                      </a>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-xl font-semibold">
                Recent Activity
              </CardTitle>
              <Button variant="ghost" size="sm">
                <Calendar className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity, index) => {
                  const Icon = activity.icon;
                  return (
                    <div key={index} className="flex items-start space-x-3">
                      <div
                        className={`flex-shrink-0 rounded-lg p-2 ${
                          activity.status === "completed"
                            ? "bg-success-100 dark:bg-success-900"
                            : activity.status === "warning"
                              ? "bg-warning-100 dark:bg-warning-900"
                              : activity.status === "success"
                                ? "bg-brand-emerald-100 dark:bg-brand-emerald-900"
                                : "bg-brand-blue-100 dark:bg-brand-blue-900"
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 ${
                            activity.status === "completed"
                              ? "text-success-600"
                              : activity.status === "warning"
                                ? "text-warning-600"
                                : activity.status === "success"
                                  ? "text-brand-emerald-600"
                                  : "text-brand-blue-600"
                          }`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{activity.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {activity.description}
                        </p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Team Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">
                Team Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Active Members</span>
                  <span className="text-2xl font-bold">4</span>
                </div>
                <div className="space-y-3">
                  {[
                    {
                      name: "Sarah Chen",
                      role: "Content Lead",
                      status: "online",
                    },
                    {
                      name: "Mike Johnson",
                      role: "SEO Specialist",
                      status: "away",
                    },
                    { name: "Lisa Park", role: "Writer", status: "online" },
                    { name: "Alex Rivera", role: "Analyst", status: "offline" },
                  ].map(member => (
                    <div
                      key={member.name}
                      className="flex items-center space-x-3"
                    >
                      <div className="relative">
                        <div className="bg-gradient-primary flex h-8 w-8 items-center justify-center rounded-full">
                          <span className="text-xs font-semibold text-white">
                            {member.name
                              .split(" ")
                              .map(n => n[0])
                              .join("")}
                          </span>
                        </div>
                        <div
                          className={`border-background absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 ${
                            member.status === "online"
                              ? "bg-success-500"
                              : member.status === "away"
                                ? "bg-warning-500"
                                : "bg-muted"
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {member.role}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
