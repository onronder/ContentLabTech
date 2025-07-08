/**
 * Analytics Dashboard Component
 * Comprehensive analytics interface integrating 4-phase AI analysis system
 */

"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth/context";
import {
  BarChart3,
  TrendingUp,
  Target,
  Activity,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Gauge,
  Brain,
  Trophy,
  Sparkles,
} from "lucide-react";

// Import existing analytics components
import { AnalyticsOverview } from "./AnalyticsOverview";
import { PerformanceMetrics } from "./PerformanceMetrics";
import { ContentAnalytics } from "./ContentAnalytics";
import { AnalyticsEmptyState } from "./AnalyticsEmptyState";
// import { TeamAnalytics } from "./TeamAnalytics";

interface AnalyticsData {
  overview: {
    totalProjects: number;
    totalContent: number;
    avgSeoScore: number;
    avgPerformanceScore: number;
    totalViews: number;
    conversionRate: number;
    trendingContent: number;
    activeAlerts: number;
  };
  trends: {
    traffic: Array<{ date: string; views: number; conversions: number }>;
    performance: Array<{ date: string; score: number; vitals: number }>;
    content: Array<{ date: string; published: number; optimized: number }>;
  };
  predictions: {
    nextWeek: { traffic: number; confidence: number };
    nextMonth: { performance: number; confidence: number };
    quarterlyGoals: { onTrack: boolean; progress: number };
  };
}

export const AnalyticsDashboard = () => {
  const { currentTeam } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null
  );
  const [selectedTimeRange, setSelectedTimeRange] = useState("30d");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (currentTeam?.id) {
      loadAnalyticsData();
    }
  }, [currentTeam?.id, selectedTimeRange]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAnalyticsData = async () => {
    if (!currentTeam?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Load analytics status and trends
      const [statusResponse, trendsResponse] = await Promise.all([
        fetch(
          `/api/analytics/status?teamId=${currentTeam.id}&timeRange=${selectedTimeRange}&fallback=team`
        ),
        fetch(
          `/api/analytics/trends?teamId=${currentTeam.id}&timeRange=${selectedTimeRange}&fallback=team`
        ),
      ]);

      if (!statusResponse.ok || !trendsResponse.ok) {
        throw new Error("Failed to load analytics data");
      }

      const [statusData, trendsData] = await Promise.all([
        statusResponse.json(),
        trendsResponse.json(),
      ]);

      // Mock analytics data structure - integrate with actual API responses
      setAnalyticsData({
        overview: {
          totalProjects: statusData.projects?.length || 0,
          totalContent: statusData.content?.length || 0,
          avgSeoScore: statusData.metrics?.avgSeoScore || 0,
          avgPerformanceScore: statusData.metrics?.avgPerformance || 0,
          totalViews: statusData.metrics?.totalViews || 0,
          conversionRate: statusData.metrics?.conversionRate || 0,
          trendingContent: statusData.metrics?.trending || 0,
          activeAlerts: statusData.alerts?.length || 0,
        },
        trends: trendsData.trends || {
          traffic: [],
          performance: [],
          content: [],
        },
        predictions: statusData.predictions || {
          nextWeek: { traffic: 0, confidence: 0 },
          nextMonth: { performance: 0, confidence: 0 },
          quarterlyGoals: { onTrack: false, progress: 0 },
        },
      });
    } catch (err) {
      console.error("Failed to load analytics:", err);
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadAnalyticsData();
  };

  const handleExport = async () => {
    try {
      const response = await fetch(
        `/api/analytics/export?teamId=${currentTeam?.id}&timeRange=${selectedTimeRange}`
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `analytics-${selectedTimeRange}-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Failed to export analytics:", error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Loading Header */}
        <div className="space-y-4">
          <div className="h-8 w-1/3 animate-pulse rounded-md bg-gray-200" />
          <div className="h-4 w-1/2 animate-pulse rounded-md bg-gray-200" />
        </div>

        {/* Loading Metrics */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 animate-pulse rounded bg-gray-200" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Loading Content */}
        <div className="h-96 animate-pulse rounded-xl bg-gray-200" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-2 flex items-center space-x-3">
            <div className="rounded-lg bg-purple-50 p-2">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
              <p className="text-lg text-gray-600">
                AI-powered insights and performance analytics
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Badge
            variant="outline"
            className="border-purple-200 bg-purple-50 text-purple-700"
          >
            <Brain className="mr-1 h-3 w-3" />
            4-Phase AI Analysis
          </Badge>

          {/* Time Range Selector */}
          <Select
            value={selectedTimeRange}
            onValueChange={setSelectedTimeRange}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 3 months</SelectItem>
              <SelectItem value="365d">Last year</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>

          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h3 className="font-semibold text-red-900">Analytics Error</h3>
          </div>
          <p className="mt-2 text-red-700">{error}</p>
          <Button onClick={handleRefresh} variant="outline" className="mt-4">
            Try Again
          </Button>
        </div>
      )}

      {/* Analytics Content */}
      {analyticsData && !error && analyticsData.overview.totalProjects > 0 ? (
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger
              value="overview"
              className="flex items-center space-x-2"
            >
              <Activity className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger
              value="performance"
              className="flex items-center space-x-2"
            >
              <Gauge className="h-4 w-4" />
              <span>Performance</span>
            </TabsTrigger>
            <TabsTrigger
              value="content"
              className="flex items-center space-x-2"
            >
              <Target className="h-4 w-4" />
              <span>Content</span>
            </TabsTrigger>
            <TabsTrigger
              value="competitive"
              className="flex items-center space-x-2"
            >
              <Trophy className="h-4 w-4" />
              <span>Competitive</span>
            </TabsTrigger>
            <TabsTrigger
              value="predictions"
              className="flex items-center space-x-2"
            >
              <Sparkles className="h-4 w-4" />
              <span>Predictions</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <AnalyticsOverview
              data={analyticsData.overview}
              trends={analyticsData.trends}
              timeRange={selectedTimeRange}
            />
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <PerformanceMetrics
              timeRange={selectedTimeRange}
              teamId={currentTeam?.id}
            />
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            <ContentAnalytics
              timeRange={selectedTimeRange}
              teamId={currentTeam?.id}
            />
          </TabsContent>

          <TabsContent value="competitive" className="space-y-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Trophy className="h-5 w-5 text-yellow-600" />
                    <span>Competitive Intelligence</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-8 text-center text-gray-500">
                    <Trophy className="mx-auto mb-2 h-8 w-8" />
                    <p>Competitive analytics dashboard coming soon</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="predictions" className="space-y-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Brain className="h-5 w-5 text-blue-600" />
                    <span>AI Performance Predictions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-8 text-center text-gray-500">
                    <Brain className="mx-auto mb-2 h-8 w-8" />
                    <p>Advanced ML predictions coming soon</p>
                  </div>
                </CardContent>
              </Card>

              {/* Prediction Summary Cards */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Traffic Prediction (Next Week)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900">
                      +{analyticsData.predictions.nextWeek.traffic}%
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>
                        {analyticsData.predictions.nextWeek.confidence}%
                        confidence
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Performance Forecast (Next Month)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900">
                      {analyticsData.predictions.nextMonth.performance}/100
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <TrendingUp className="h-3 w-3 text-blue-500" />
                      <span>
                        {analyticsData.predictions.nextMonth.confidence}%
                        confidence
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Quarterly Goals
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900">
                      {analyticsData.predictions.quarterlyGoals.progress}%
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      {analyticsData.predictions.quarterlyGoals.onTrack ? (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-yellow-500" />
                      )}
                      <span>
                        {analyticsData.predictions.quarterlyGoals.onTrack
                          ? "On track"
                          : "Needs attention"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      ) : analyticsData && !error ? (
        <AnalyticsEmptyState />
      ) : null}
    </div>
  );
};
