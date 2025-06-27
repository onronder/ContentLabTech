/**
 * Executive Dashboard Component
 * Strategic overview for executives with high-level insights and KPIs
 */

"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { MetricCard } from "./MetricCard";
import { InsightCard } from "./InsightCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import {
  TrendingUp,
  Target,
  Users,
  BarChart3,
  Calendar,
  ArrowUpRight,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface ExecutiveDashboardProps {
  projectId: string;
}

export const ExecutiveDashboard = ({ projectId }: ExecutiveDashboardProps) => {
  const [refreshing, setRefreshing] = useState(false);
  
  // Get real-time analytics data
  const {
    results,
    loading,
    error,
    refresh,
    getAnalysisProgress,
    getOverallHealthScore,
    getPriorityRecommendations,
    isAnalysisRunning,
    getDataFreshness,
  } = useAnalyticsData(projectId);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  // Calculate strategic metrics from real analytical data
  const strategicMetrics = useMemo(() => {
    const overallHealthScore = getOverallHealthScore();
    const analysisProgress = getAnalysisProgress();
    
    return [
      {
        title: "Content Performance",
        value: results.contentAnalysis?.overallScore 
          ? `${results.contentAnalysis.overallScore}%` 
          : loading ? "..." : "No Data",
        change: { 
          value: results.contentAnalysis?.overallScore 
            ? Math.max(1, results.contentAnalysis.overallScore - 85) 
            : 0, 
          type: "increase" as const 
        },
        icon: TrendingUp,
        description: results.contentAnalysis?.overallScore 
          ? results.contentAnalysis.overallScore >= 80 ? "Excellent quality" : 
            results.contentAnalysis.overallScore >= 60 ? "Good quality" : "Needs improvement"
          : "Analysis pending",
        trend: (results.contentAnalysis?.overallScore ?? 0) >= 75 ? "up" as const : "down" as const,
      },
      {
        title: "SEO Health",
        value: results.seoHealth?.overallScore 
          ? `${results.seoHealth.overallScore}%` 
          : loading ? "..." : "No Data",
        change: { 
          value: results.seoHealth?.overallScore 
            ? Math.max(1, results.seoHealth.overallScore - 80) 
            : 0, 
          type: "increase" as const 
        },
        icon: Target,
        description: results.seoHealth?.overallScore 
          ? results.seoHealth.overallScore >= 85 ? "Excellent SEO" : 
            results.seoHealth.overallScore >= 70 ? "Good SEO health" : "SEO issues found"
          : "Analysis pending",
        trend: (results.seoHealth?.overallScore ?? 0) >= 75 ? "up" as const : "down" as const,
      },
      {
        title: "Performance Score",
        value: results.performance?.overallScore 
          ? `${results.performance.overallScore}%` 
          : loading ? "..." : "No Data",
        change: { 
          value: results.performance?.overallScore 
            ? Math.max(1, results.performance.overallScore - 75) 
            : 0, 
          type: "increase" as const 
        },
        icon: BarChart3,
        description: results.performance?.overallScore 
          ? results.performance.overallScore >= 85 ? "Fast & efficient" : 
            results.performance.overallScore >= 70 ? "Good performance" : "Performance issues"
          : "Analysis pending",
        trend: (results.performance?.overallScore ?? 0) >= 75 ? "up" as const : "down" as const,
      },
      {
        title: "Overall Health",
        value: overallHealthScore ? `${overallHealthScore}%` : loading ? "..." : "No Data",
        change: { 
          value: overallHealthScore ? Math.max(1, overallHealthScore - 80) : 0, 
          type: "increase" as const 
        },
        icon: Users,
        description: overallHealthScore 
          ? overallHealthScore >= 85 ? "Excellent overall" : 
            overallHealthScore >= 70 ? "Good health" : "Needs attention"
          : analysisProgress.progress > 0 ? analysisProgress.phase : "Analysis pending",
        trend: (overallHealthScore ?? 0) >= 75 ? "up" as const : "down" as const,
      },
    ];
  }, [results, loading, getOverallHealthScore, getAnalysisProgress]);

  // Generate AI insights from real analytical data
  const aiInsights = useMemo(() => {
    const priorityRecommendations = getPriorityRecommendations();
    const analysisProgress = getAnalysisProgress();
    
    // If no recommendations yet, show analysis status
    if (priorityRecommendations.length === 0) {
      return [
        {
          priority: "medium" as const,
          title: isAnalysisRunning() ? "Analysis in Progress" : "Analysis Pending",
          description: isAnalysisRunning() 
            ? `${analysisProgress.phase} - ${analysisProgress.progress}% complete`
            : "Comprehensive analytical engines will provide strategic insights once analysis begins.",
          action: isAnalysisRunning() ? "View Progress" : "Start Analysis",
          category: "System Status",
          metric: { value: `${analysisProgress.progress}%`, label: "Progress" },
        },
      ];
    }
    
    // Convert analytical recommendations to executive insights
    return priorityRecommendations.slice(0, 3).map((rec) => {
      const priorityMap = { high: "high" as const, medium: "medium" as const, low: "low" as const };
      
      let actionText = "Review Details";
      const categoryText = rec.source;
      let metricValue = "";
      let metricLabel = "Impact";
      
      // Customize based on recommendation type
      if (rec.type === 'seo') {
        actionText = "Optimize SEO";
        metricValue = "SEO";
        metricLabel = "Priority Area";
      } else if (rec.type === 'performance') {
        actionText = "Improve Performance";
        metricValue = "Speed";
        metricLabel = "Focus Area";
      } else if (rec.source === 'Content Analysis') {
        actionText = "Enhance Content";
        metricValue = "Content";
        metricLabel = "Quality Focus";
      }
      
      return {
        priority: priorityMap[rec.priority] || "medium" as const,
        title: rec.title,
        description: rec.description,
        action: actionText,
        category: categoryText,
        metric: { value: metricValue, label: metricLabel },
      };
    });
  }, [getPriorityRecommendations, getAnalysisProgress, isAnalysisRunning]);

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
          {error ? (
            <Badge
              variant="outline"
              className="border-red-200 bg-red-50 text-red-700"
            >
              <AlertCircle className="mr-1 h-3 w-3" />
              Data Error
            </Badge>
          ) : isAnalysisRunning() ? (
            <Badge
              variant="outline"
              className="border-blue-200 bg-blue-50 text-blue-700"
            >
              <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
              Analyzing
            </Badge>
          ) : getDataFreshness() ? (
            <Badge
              variant="outline"
              className="border-green-200 bg-green-50 text-green-700"
            >
              <CheckCircle className="mr-1 h-3 w-3" />
              {getDataFreshness()}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-gray-200 bg-gray-50 text-gray-700"
            >
              No Data
            </Badge>
          )}
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
            <span>{new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
          </div>
        </div>

        {error ? (
          <div className="flex items-center justify-center rounded-lg border border-red-200 bg-red-50 p-8 text-red-700">
            <AlertCircle className="mr-2 h-5 w-5" />
            <span>Failed to load analytics data. Please refresh and try again.</span>
          </div>
        ) : (
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
        )}
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
            {getDataFreshness() || "Pending"}
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
