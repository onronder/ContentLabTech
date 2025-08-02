/**
 * Performance Metrics Component
 * Core Web Vitals and performance analytics
 */

"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Gauge,
  Zap,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Activity,
  Smartphone,
  Monitor,
} from "lucide-react";

interface PerformanceMetricsProps {
  timeRange: string;
  teamId: string | undefined;
}

interface CoreWebVitals {
  lcp: { value: number; status: "good" | "needs-improvement" | "poor" };
  fid: { value: number; status: "good" | "needs-improvement" | "poor" };
  cls: { value: number; status: "good" | "needs-improvement" | "poor" };
  fcp: { value: number; status: "good" | "needs-improvement" | "poor" };
  speedIndex: { value: number; status: "good" | "needs-improvement" | "poor" };
}

interface PerformanceData {
  coreWebVitals: {
    mobile: CoreWebVitals;
    desktop: CoreWebVitals;
  };
  overallScore: number;
  trends: Array<{
    date: string;
    score: number;
    lcp: number;
    fid: number;
    cls: number;
  }>;
  recommendations: Array<{
    type: string;
    impact: "high" | "medium" | "low";
    description: string;
    savings: string;
  }>;
}

export const PerformanceMetrics = ({
  timeRange,
  teamId,
}: PerformanceMetricsProps) => {
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] =
    useState<PerformanceData | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<"mobile" | "desktop">(
    "mobile"
  );

  useEffect(() => {
    loadPerformanceData();
  }, [timeRange, teamId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPerformanceData = async () => {
    if (!teamId) return;

    setLoading(true);
    try {
      // Fetch real performance metrics from API
      const response = await fetch(
        `/api/performance/metrics?timeRange=${timeRange}&teamId=${teamId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch performance metrics");
      }

      const data = await response.json();
      setPerformanceData(data);
    } catch (error) {
      console.error("Failed to load performance data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "good":
        return "bg-green-50 text-green-700 border-green-200";
      case "needs-improvement":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "poor":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "good":
        return <CheckCircle className="h-3 w-3 text-green-600" />;
      case "needs-improvement":
        return <AlertTriangle className="h-3 w-3 text-yellow-600" />;
      case "poor":
        return <AlertTriangle className="h-3 w-3 text-red-600" />;
      default:
        return <Activity className="h-3 w-3 text-gray-600" />;
    }
  };

  const formatMetricValue = (metric: string, value: number) => {
    switch (metric) {
      case "lcp":
      case "fcp":
      case "speedIndex":
        return `${value.toFixed(1)}s`;
      case "fid":
        return `${value}ms`;
      case "cls":
        return value.toFixed(3);
      default:
        return value.toString();
    }
  };

  const getMetricDescription = (metric: string) => {
    const descriptions = {
      lcp: "Largest Contentful Paint - Loading performance",
      fid: "First Input Delay - Interactivity",
      cls: "Cumulative Layout Shift - Visual stability",
      fcp: "First Contentful Paint - Loading performance",
      speedIndex: "Speed Index - Overall loading speed",
    };
    return descriptions[metric as keyof typeof descriptions] || "";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
              </CardHeader>
              <CardContent>
                <div className="h-32 animate-pulse rounded bg-gray-200" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!performanceData) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-2 text-gray-600">No performance data available</p>
        </CardContent>
      </Card>
    );
  }

  const currentVitals = performanceData.coreWebVitals[selectedDevice];

  return (
    <div className="space-y-6">
      {/* Performance Score Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Gauge className="h-5 w-5 text-blue-600" />
              <span>Performance Score</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSelectedDevice("mobile")}
                className={`flex items-center space-x-1 rounded-md px-3 py-1 text-sm ${
                  selectedDevice === "mobile"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Smartphone className="h-3 w-3" />
                <span>Mobile</span>
              </button>
              <button
                onClick={() => setSelectedDevice("desktop")}
                className={`flex items-center space-x-1 rounded-md px-3 py-1 text-sm ${
                  selectedDevice === "desktop"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Monitor className="h-3 w-3" />
                <span>Desktop</span>
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="text-4xl font-bold text-gray-900">
              {performanceData.overallScore}
            </div>
            <div className="flex-1">
              <div className="mb-2 flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  Overall Performance
                </span>
                {performanceData.overallScore >= 90 ? (
                  <Badge className="border-green-200 bg-green-50 text-green-700">
                    Excellent
                  </Badge>
                ) : performanceData.overallScore >= 70 ? (
                  <Badge className="border-yellow-200 bg-yellow-50 text-yellow-700">
                    Good
                  </Badge>
                ) : (
                  <Badge className="border-red-200 bg-red-50 text-red-700">
                    Needs Work
                  </Badge>
                )}
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className={`h-2 rounded-full ${
                    performanceData.overallScore >= 90
                      ? "bg-green-500"
                      : performanceData.overallScore >= 70
                        ? "bg-yellow-500"
                        : "bg-red-500"
                  }`}
                  style={{ width: `${performanceData.overallScore}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Core Web Vitals */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(currentVitals).map(([metric, data]) => (
          <Card key={metric}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600 uppercase">
                  {metric}
                </CardTitle>
                {getStatusIcon(data.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-2">
                <div className="text-2xl font-bold text-gray-900">
                  {formatMetricValue(metric, data.value)}
                </div>
                <Badge
                  variant="outline"
                  className={getStatusColor(data.status)}
                >
                  {data.status.replace("-", " ")}
                </Badge>
              </div>
              <p className="text-xs text-gray-500">
                {getMetricDescription(metric)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-yellow-600" />
            <span>Optimization Recommendations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {performanceData.recommendations.map((rec, index) => (
              <div
                key={index}
                className="flex items-start space-x-3 rounded-lg border border-gray-200 p-4"
              >
                <div className="flex-shrink-0">
                  {rec.impact === "high" ? (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  ) : rec.impact === "medium" ? (
                    <Clock className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <Activity className="h-5 w-5 text-blue-500" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="mb-1 flex items-center space-x-2">
                    <Badge
                      variant="outline"
                      className={
                        rec.impact === "high"
                          ? "border-red-200 text-red-700"
                          : rec.impact === "medium"
                            ? "border-yellow-200 text-yellow-700"
                            : "border-blue-200 text-blue-700"
                      }
                    >
                      {rec.impact} impact
                    </Badge>
                  </div>
                  <p className="mb-1 text-sm text-gray-900">
                    {rec.description}
                  </p>
                  <p className="text-xs text-gray-500">
                    <TrendingUp className="mr-1 inline h-3 w-3" />
                    {rec.savings}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
