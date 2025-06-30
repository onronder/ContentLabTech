/**
 * Competitive Analytics Charts
 * Basic competitive intelligence visualizations using Recharts
 */

"use client";

import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CompetitiveAnalysisResult } from "@/lib/competitive/types";

interface CompetitiveAnalyticsChartsProps {
  analysisResults: CompetitiveAnalysisResult[];
  className?: string;
}

// Color palette for consistent chart styling
const COLORS = {
  primary: "#3B82F6",
  secondary: "#10B981",
  accent: "#F59E0B",
  danger: "#EF4444",
  muted: "#6B7280",
  success: "#059669",
  warning: "#D97706",
  purple: "#8B5CF6",
};

// Chart colors for future use
// const CHART_COLORS = [
//   COLORS.primary,
//   COLORS.secondary,
//   COLORS.accent,
//   COLORS.purple,
//   COLORS.danger,
//   COLORS.warning,
// ];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    color: string;
    name: string;
    value: number | string;
  }>;
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded border bg-white p-3 shadow-lg">
        <p className="font-medium">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {entry.value}
            {entry.name.includes("Score") || entry.name.includes("Position")
              ? "%"
              : ""}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const CompetitiveAnalyticsCharts: React.FC<
  CompetitiveAnalyticsChartsProps
> = ({ analysisResults, className }) => {
  // Process data for competitive performance comparison
  const performanceData = useMemo(() => {
    return analysisResults
      .filter(
        result => result.status === "completed" && result.data.contentAnalysis
      )
      .slice(0, 10) // Limit to top 10 for readability
      .map((result, index) => ({
        competitor: `Competitor ${index + 1}`,
        contentScore:
          result.data.contentAnalysis?.contentQuality?.userScore || 0,
        seoScore: result.data.seoAnalysis?.overallComparison?.userScore || 0,
        performanceScore:
          result.data.performanceAnalysis?.speedComparison?.loadTime?.user || 0,
        confidenceScore: result.confidence?.overall || 0,
      }));
  }, [analysisResults]);

  // Process data for market share estimation
  const marketShareData = useMemo(() => {
    const totalCompetitors = analysisResults.length;
    if (totalCompetitors === 0) return [];

    // Simplified market share calculation based on competitive scores
    const avgScore =
      performanceData.reduce((sum, item) => sum + item.contentScore, 0) /
        performanceData.length || 0;

    return [
      { name: "Your Position", value: avgScore, color: COLORS.primary },
      { name: "Competitors", value: 100 - avgScore, color: COLORS.muted },
    ];
  }, [performanceData, analysisResults.length]);

  // Process data for trend analysis
  const trendData = useMemo(() => {
    // Mock trend data - in real implementation, this would come from historical analysis
    return Array.from({ length: 30 }, (_, i) => {
      const day = new Date();
      day.setDate(day.getDate() - (29 - i));

      return {
        date: day.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        competitiveScore: Math.floor(Math.random() * 20) + 70 + i * 0.5, // Slight upward trend
        marketPosition: Math.floor(Math.random() * 15) + 75 + i * 0.3,
        threatLevel: Math.max(0, Math.floor(Math.random() * 30) + 20 - i * 0.2), // Slight downward trend
      };
    });
  }, []);

  // Process keyword gap analysis data
  const keywordGapData = useMemo(() => {
    return analysisResults
      .filter(result => result.data.seoAnalysis?.keywordAnalysis?.keywordGaps)
      .slice(0, 8)
      .map((result, index) => ({
        competitor: `Competitor ${index + 1}`,
        keywordGaps:
          result.data.seoAnalysis?.keywordAnalysis?.keywordGaps?.length || 0,
        highPriorityGaps:
          result.data.seoAnalysis?.keywordAnalysis?.keywordGaps?.filter(
            gap => gap.priority === "high"
          ).length || 0,
      }));
  }, [analysisResults]);

  if (analysisResults.length === 0) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="py-8">
            <div className="text-muted-foreground text-center">
              No competitive analysis data available. Start an analysis to view
              charts.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className || ""}`}>
      {/* Competitive Performance Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Competitive Performance Comparison</CardTitle>
          <CardDescription>
            Compare content, SEO, and performance scores across competitors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="competitor" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="contentScore"
                fill={COLORS.primary}
                name="Content Score"
              />
              <Bar
                dataKey="seoScore"
                fill={COLORS.secondary}
                name="SEO Score"
              />
              <Bar
                dataKey="confidenceScore"
                fill={COLORS.accent}
                name="Confidence Score"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Market Position Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Market Position Trends</CardTitle>
            <CardDescription>
              Track competitive positioning over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="competitiveScore"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  name="Competitive Score"
                />
                <Line
                  type="monotone"
                  dataKey="marketPosition"
                  stroke={COLORS.secondary}
                  strokeWidth={2}
                  name="Market Position"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Market Share Estimation */}
        <Card>
          <CardHeader>
            <CardTitle>Market Share Estimation</CardTitle>
            <CardDescription>
              Estimated competitive market position
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={marketShareData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) =>
                    `${name}: ${value?.toFixed(1) || 0}%`
                  }
                >
                  {marketShareData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 flex justify-center gap-4">
              {marketShareData.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Keyword Gap Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Keyword Gap Analysis</CardTitle>
          <CardDescription>
            Identify keyword opportunities across competitors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={keywordGapData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="competitor" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="keywordGaps"
                stackId="1"
                stroke={COLORS.primary}
                fill={COLORS.primary}
                fillOpacity={0.6}
                name="Total Keyword Gaps"
              />
              <Area
                type="monotone"
                dataKey="highPriorityGaps"
                stackId="2"
                stroke={COLORS.danger}
                fill={COLORS.danger}
                fillOpacity={0.8}
                name="High Priority Gaps"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Threat Level Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Threat Level Timeline</CardTitle>
          <CardDescription>
            Monitor competitive threats over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="threatLevel"
                stroke={COLORS.danger}
                fill={COLORS.danger}
                fillOpacity={0.3}
                name="Threat Level"
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-4 flex justify-center">
            <Badge variant="outline" className="text-xs">
              Lower values indicate reduced competitive threats
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
