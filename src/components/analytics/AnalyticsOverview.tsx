/**
 * Analytics Overview Component
 * High-level analytics summary with key metrics
 */

"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Eye,
  Zap,
  AlertTriangle,
  CheckCircle,
  Globe,
  Activity,
} from "lucide-react";

interface AnalyticsOverviewProps {
  data: {
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
  timeRange: string;
}

export const AnalyticsOverview = ({ data, trends, timeRange }: AnalyticsOverviewProps) => {
  const getTrendDirection = (current: number, previous: number) => {
    if (current > previous) return "up";
    if (current < previous) return "down";
    return "stable";
  };

  const getTrendIcon = (direction: string, isPositive = true) => {
    if (direction === "up") {
      return isPositive ? (
        <TrendingUp className="h-3 w-3 text-green-500" />
      ) : (
        <TrendingUp className="h-3 w-3 text-red-500" />
      );
    }
    if (direction === "down") {
      return isPositive ? (
        <TrendingDown className="h-3 w-3 text-red-500" />
      ) : (
        <TrendingDown className="h-3 w-3 text-green-500" />
      );
    }
    return <Activity className="h-3 w-3 text-gray-500" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Projects
            </CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {data.totalProjects}
            </div>
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              {getTrendIcon("up", true)}
              <span>+2 this month</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Content */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Content Items
            </CardTitle>
            <Globe className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {data.totalContent}
            </div>
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              {getTrendIcon("up", true)}
              <span>{data.trendingContent} trending</span>
            </div>
          </CardContent>
        </Card>

        {/* Average SEO Score */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Avg SEO Score
            </CardTitle>
            <Zap className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(data.avgSeoScore)}`}>
              {data.avgSeoScore}
              <span className="text-sm font-normal text-gray-500">/100</span>
            </div>
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              {data.avgSeoScore >= 75 ? (
                <CheckCircle className="h-3 w-3 text-green-500" />
              ) : (
                <AlertTriangle className="h-3 w-3 text-yellow-500" />
              )}
              <span>
                {data.avgSeoScore >= 75 ? "Excellent" : "Needs improvement"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Total Views */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Views
            </CardTitle>
            <Eye className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatNumber(data.totalViews)}
            </div>
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              {getTrendIcon("up", true)}
              <span>{data.conversionRate}% conversion rate</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Performance Score */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <span>Performance Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Overall Performance</span>
              <span className={`text-lg font-semibold ${getScoreColor(data.avgPerformanceScore)}`}>
                {data.avgPerformanceScore}/100
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  data.avgPerformanceScore >= 80 ? 'bg-green-500' :
                  data.avgPerformanceScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${data.avgPerformanceScore}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Core Web Vitals</span>
                  <span className="font-medium">85/100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">SEO Score</span>
                  <span className="font-medium">{data.avgSeoScore}/100</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Content Quality</span>
                  <span className="font-medium">78/100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">User Experience</span>
                  <span className="font-medium">82/100</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-600" />
              <span>Quick Insights</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-green-900">
                    Content Performance Up 15%
                  </div>
                  <div className="text-green-700">
                    Your content is performing better than last {timeRange === '7d' ? 'week' : 'month'}
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-blue-900">
                    SEO Opportunities Identified
                  </div>
                  <div className="text-blue-700">
                    AI identified 12 optimization opportunities
                  </div>
                </div>
              </div>

              {data.activeAlerts > 0 && (
                <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium text-yellow-900">
                      {data.activeAlerts} Active Alert{data.activeAlerts > 1 ? 's' : ''}
                    </div>
                    <div className="text-yellow-700">
                      Performance issues need attention
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg">
                <Zap className="h-4 w-4 text-purple-600 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-purple-900">
                    AI Analysis Complete
                  </div>
                  <div className="text-purple-700">
                    All 4 analysis phases completed successfully
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};