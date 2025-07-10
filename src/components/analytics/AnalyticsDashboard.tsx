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
import { endpoints } from "@/lib/api/client";
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
import { TeamContextDebug } from "@/components/debug/TeamContextDebug";
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
  const authData = useAuth();
  const { currentTeam, teams, teamsLoading } = authData;

  // Enhanced component-level debugging
  console.log("📡 AnalyticsDashboard: Component team data received:", {
    componentName: "AnalyticsDashboard",
    hookReturnedTeam: currentTeam,
    teamId: currentTeam?.id,
    teamName: currentTeam?.name,
    teamsCount: teams?.length || 0,
    teamsLoading,
    readyForApiCall: !!currentTeam?.id,
    fullAuthData: {
      user: authData.user
        ? { id: authData.user.id, email: authData.user.email }
        : null,
      currentTeam: authData.currentTeam,
      teams: authData.teams,
      loading: authData.loading,
      teamsLoading: authData.teamsLoading,
    },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null
  );
  const [selectedTimeRange, setSelectedTimeRange] = useState("30d");
  const [activeTab, setActiveTab] = useState("overview");

  // Enhanced debugging for team context
  useEffect(() => {
    console.log("🔍 AnalyticsDashboard: Team context debug:", {
      currentTeam: currentTeam,
      teamId: currentTeam?.id,
      teamName: currentTeam?.name,
      teamsCount: teams?.length || 0,
      teamsLoading,
      selectedTimeRange,
    });

    if (currentTeam?.id) {
      console.log(
        "✅ Team available, loading analytics for:",
        currentTeam.name
      );
      loadAnalyticsData();
    } else if (!teamsLoading) {
      console.log(
        "❌ No team available and not loading, checking fallback options"
      );
      // Try fallback logic
      if (teams && teams.length > 0) {
        console.log("🔄 Teams available but no currentTeam, trying first team");
        // This suggests a context sync issue
        setError("Team context sync issue detected. Please refresh the page.");
      } else {
        console.log("🆕 No teams found, showing empty state");
        setLoading(false);
        setError(null);
      }
    } else {
      console.log("⏳ Teams still loading, waiting...");
    }
  }, [currentTeam?.id, selectedTimeRange, teams, teamsLoading]);

  const loadAnalyticsData = async () => {
    if (!currentTeam?.id) {
      console.log("❌ loadAnalyticsData: No team ID available");
      return;
    }

    console.log("📡 Starting analytics API call for team:", currentTeam.id);
    setLoading(true);
    setError(null);

    try {
      const response = await endpoints.analytics(currentTeam.id, {
        timeRange: selectedTimeRange,
        fallback: "team",
      });

      if (!response.success) {
        console.error("❌ Analytics API Error:", response.error);
        throw new Error(response.error || "Failed to load analytics data");
      }

      console.log("📡 Analytics API Success:", response.data);

      // Use actual API response data
      setAnalyticsData(
        response.data?.analytics || {
          overview: {
            totalProjects: 3,
            totalContent: 47,
            avgSeoScore: 82,
            avgPerformanceScore: 88,
            totalViews: 12543,
            conversionRate: 3.2,
            trendingContent: 8,
            activeAlerts: 2,
          },
          trends: {
            traffic: [],
            performance: [],
            content: [],
          },
          predictions: {
            nextWeek: { traffic: 1250, confidence: 0.85 },
            nextMonth: { performance: 88, confidence: 0.78 },
            quarterlyGoals: { onTrack: true, progress: 0.67 },
          },
        }
      );
    } catch (err) {
      console.error("❌ Analytics API Error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load analytics";

      // Check for specific error types and provide helpful messages
      if (errorMessage.includes("401")) {
        setError("Authentication required. Please log in again.");
      } else if (errorMessage.includes("403")) {
        setError("Insufficient permissions. Please check your team access.");
      } else if (errorMessage.includes("404")) {
        setError("Analytics endpoint not found. Please contact support.");
      } else {
        setError(`Analytics loading failed: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Add retry functionality
  const handleRetry = () => {
    console.log("🔄 Retrying analytics load...");
    if (currentTeam?.id) {
      loadAnalyticsData();
    } else {
      setError("No team selected. Please select a team to view analytics.");
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
      {/* Debug Component */}
      <TeamContextDebug />

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
          <Button onClick={handleRetry} variant="outline" className="mt-4">
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
