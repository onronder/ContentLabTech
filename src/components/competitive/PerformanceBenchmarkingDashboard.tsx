/**
 * Performance Benchmarking Dashboard Component
 * Comprehensive performance comparison analysis and competitive benchmarking
 */

"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ScatterChart,
  Scatter,
} from "recharts";
import {
  Zap,
  Smartphone,
  Monitor,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  Eye,
  Target,
  Gauge,
  RefreshCw,
  Download,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import { useCompetitiveIntelligence } from "@/hooks/useCompetitiveIntelligence";
import type {
  CompetitiveAnalysisResult,
  CompetitivePerformanceAnalysis,
  MetricComparison,
  CoreWebVitalsComparison,
  PerformanceOpportunity,
} from "@/lib/competitive/types";

interface PerformanceBenchmarkingDashboardProps {
  projectId?: string;
  competitorId?: string;
}

interface PerformanceMetricCard {
  title: string;
  userValue: number;
  competitorValue: number;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  trend: "better" | "worse" | "equal";
  description: string;
}

interface CoreWebVitalData {
  metric: string;
  user: number;
  competitor: number;
  threshold: number;
  status: "good" | "needs-improvement" | "poor";
}

const PERFORMANCE_COLORS = {
  good: "#10b981",
  needsImprovement: "#f59e0b", 
  poor: "#ef4444",
  user: "#3b82f6",
  competitor: "#8b5cf6",
};

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

const formatScore = (score: number): string => {
  return Math.round(score).toString();
};

export const PerformanceBenchmarkingDashboard: React.FC<
  PerformanceBenchmarkingDashboardProps
> = ({ projectId, competitorId }) => {
  const { data, loading, error, refresh } = useCompetitiveIntelligence(projectId);
  const [selectedCompetitor, setSelectedCompetitor] = useState(competitorId);
  const [timeframe, setTimeframe] = useState("30d");
  const [refreshing, setRefreshing] = useState(false);

  // Get performance analysis data for selected competitor
  const performanceAnalysis = useMemo(() => {
    if (!data || !selectedCompetitor) return null;

    const analysisResult = data.analysisResults.find(
      (result) => result.competitorId === selectedCompetitor
    );

    return analysisResult?.data?.performanceAnalysis || null;
  }, [data, selectedCompetitor]);

  // Process Core Web Vitals data
  const coreWebVitalsData = useMemo((): CoreWebVitalData[] => {
    if (!performanceAnalysis?.speedComparison) return [];

    const speed = performanceAnalysis.speedComparison;

    return [
      {
        metric: "Largest Contentful Paint",
        user: speed.largestContentfulPaint.user,
        competitor: speed.largestContentfulPaint.competitor,
        threshold: 2500, // Good LCP threshold
        status: speed.largestContentfulPaint.user <= 2500 ? "good" : 
                speed.largestContentfulPaint.user <= 4000 ? "needs-improvement" : "poor",
      },
      {
        metric: "First Input Delay",
        user: speed.firstInputDelay.user,
        competitor: speed.firstInputDelay.competitor,
        threshold: 100, // Good FID threshold
        status: speed.firstInputDelay.user <= 100 ? "good" : 
                speed.firstInputDelay.user <= 300 ? "needs-improvement" : "poor",
      },
      {
        metric: "Cumulative Layout Shift",
        user: speed.cumulativeLayoutShift.user,
        competitor: speed.cumulativeLayoutShift.competitor,
        threshold: 0.1, // Good CLS threshold
        status: speed.cumulativeLayoutShift.user <= 0.1 ? "good" : 
                speed.cumulativeLayoutShift.user <= 0.25 ? "needs-improvement" : "poor",
      },
      {
        metric: "First Contentful Paint",
        user: speed.firstContentfulPaint.user,
        competitor: speed.firstContentfulPaint.competitor,
        threshold: 1800, // Good FCP threshold
        status: speed.firstContentfulPaint.user <= 1800 ? "good" : 
                speed.firstContentfulPaint.user <= 3000 ? "needs-improvement" : "poor",
      },
    ];
  }, [performanceAnalysis]);

  // Process performance metrics for cards
  const performanceMetrics = useMemo((): PerformanceMetricCard[] => {
    if (!performanceAnalysis) return [];

    const { speedComparison, userExperience, mobilePerformance } = performanceAnalysis;

    return [
      {
        title: "Page Load Time",
        userValue: speedComparison.loadTime.user,
        competitorValue: speedComparison.loadTime.competitor,
        unit: "ms",
        icon: Clock,
        color: "text-blue-600",
        trend: speedComparison.loadTime.user < speedComparison.loadTime.competitor ? "better" : 
               speedComparison.loadTime.user > speedComparison.loadTime.competitor ? "worse" : "equal",
        description: "Average page load time",
      },
      {
        title: "Mobile Performance",
        userValue: mobilePerformance.mobileSpeed.user,
        competitorValue: mobilePerformance.mobileSpeed.competitor,
        unit: "/100",
        icon: Smartphone,
        color: "text-green-600",
        trend: mobilePerformance.mobileSpeed.user > mobilePerformance.mobileSpeed.competitor ? "better" : 
               mobilePerformance.mobileSpeed.user < mobilePerformance.mobileSpeed.competitor ? "worse" : "equal",
        description: "Mobile performance score",
      },
      {
        title: "Desktop Performance", 
        userValue: userExperience.overallScore.user,
        competitorValue: userExperience.overallScore.competitor,
        unit: "/100",
        icon: Monitor,
        color: "text-purple-600",
        trend: userExperience.overallScore.user > userExperience.overallScore.competitor ? "better" : 
               userExperience.overallScore.user < userExperience.overallScore.competitor ? "worse" : "equal",
        description: "Desktop user experience score",
      },
      {
        title: "Accessibility Score",
        userValue: userExperience.accessibility.user,
        competitorValue: userExperience.accessibility.competitor,
        unit: "/100",
        icon: Eye,
        color: "text-orange-600",
        trend: userExperience.accessibility.user > userExperience.accessibility.competitor ? "better" : 
               userExperience.accessibility.user < userExperience.accessibility.competitor ? "worse" : "equal",
        description: "Accessibility compliance score",
      },
    ];
  }, [performanceAnalysis]);

  // Process performance opportunities
  const performanceOpportunities = useMemo(() => {
    if (!performanceAnalysis?.performanceOpportunities) return [];

    return performanceAnalysis.performanceOpportunities
      .sort((a, b) => b.improvementPotential - a.improvementPotential)
      .slice(0, 10);
  }, [performanceAnalysis]);

  // Process comparative performance data for charts
  const comparativeData = useMemo(() => {
    if (!performanceAnalysis) return [];

    const { speedComparison, userExperience, mobilePerformance } = performanceAnalysis;

    return [
      {
        category: "Speed",
        user: Math.round((5000 - speedComparison.loadTime.user) / 50), // Convert to 0-100 scale
        competitor: Math.round((5000 - speedComparison.loadTime.competitor) / 50),
      },
      {
        category: "Mobile",
        user: mobilePerformance.mobileSpeed.user,
        competitor: mobilePerformance.mobileSpeed.competitor,
      },
      {
        category: "UX",
        user: userExperience.overallScore.user,
        competitor: userExperience.overallScore.competitor,
      },
      {
        category: "Accessibility",
        user: userExperience.accessibility.user,
        competitor: userExperience.accessibility.competitor,
      },
      {
        category: "Best Practices",
        user: userExperience.bestPractices.user,
        competitor: userExperience.bestPractices.competitor,
      },
    ];
  }, [performanceAnalysis]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleExportData = useCallback(() => {
    if (!performanceAnalysis) return;

    const exportData = {
      competitor: selectedCompetitor,
      timestamp: new Date().toISOString(),
      metrics: performanceMetrics,
      coreWebVitals: coreWebVitalsData,
      opportunities: performanceOpportunities,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: "application/json" 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `performance-benchmark-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [performanceAnalysis, selectedCompetitor, performanceMetrics, coreWebVitalsData, performanceOpportunities]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Performance Benchmarking</h2>
            <p className="text-muted-foreground">Loading performance analysis...</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 w-2/3 rounded bg-gray-200"></div>
                  <div className="h-8 w-1/2 rounded bg-gray-200"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const selectedCompetitorName = data?.competitors.find(
    (c) => c.id === selectedCompetitor
  )?.name || "Unknown Competitor";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Gauge className="h-6 w-6 text-green-600" />
            Performance Benchmarking
          </h2>
          <p className="text-muted-foreground">
            Comprehensive performance comparison and optimization insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedCompetitor} onValueChange={setSelectedCompetitor}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select competitor" />
            </SelectTrigger>
            <SelectContent>
              {data?.competitors.map((competitor) => (
                <SelectItem key={competitor.id} value={competitor.id}>
                  {competitor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {!selectedCompetitor && (
        <Alert>
          <Target className="h-4 w-4" />
          <AlertDescription>
            Please select a competitor to view detailed performance analysis.
          </AlertDescription>
        </Alert>
      )}

      {selectedCompetitor && performanceAnalysis && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Performance Overview</TabsTrigger>
            <TabsTrigger value="core-vitals">Core Web Vitals</TabsTrigger>
            <TabsTrigger value="mobile">Mobile Performance</TabsTrigger>
            <TabsTrigger value="opportunities">Optimization</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Performance Metrics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {performanceMetrics.map((metric, index) => {
                const Icon = metric.icon;
                return (
                  <Card key={index}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-muted-foreground text-sm font-medium">
                            {metric.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-2xl font-bold">
                              {metric.unit === "ms" ? formatDuration(metric.userValue) : 
                               `${formatScore(metric.userValue)}${metric.unit}`}
                            </p>
                            {metric.trend === "better" && (
                              <ArrowUp className="h-4 w-4 text-green-600" />
                            )}
                            {metric.trend === "worse" && (
                              <ArrowDown className="h-4 w-4 text-red-600" />
                            )}
                            {metric.trend === "equal" && (
                              <Minus className="h-4 w-4 text-gray-600" />
                            )}
                          </div>
                          <p className="text-muted-foreground mt-1 text-xs">
                            vs {metric.unit === "ms" ? formatDuration(metric.competitorValue) : 
                                `${formatScore(metric.competitorValue)}${metric.unit}`} (competitor)
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {metric.description}
                          </p>
                        </div>
                        <Icon className={`h-8 w-8 ${metric.color}`} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Performance Comparison Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Comparison</CardTitle>
                <CardDescription>
                  Side-by-side performance metrics comparison with {selectedCompetitorName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparativeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip 
                        formatter={(value, name) => [
                          `${value}/100`, 
                          name === "user" ? "Your Site" : "Competitor"
                        ]}
                      />
                      <Bar dataKey="user" fill={PERFORMANCE_COLORS.user} name="user" />
                      <Bar dataKey="competitor" fill={PERFORMANCE_COLORS.competitor} name="competitor" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Performance Radar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Radar</CardTitle>
                <CardDescription>
                  Multi-dimensional performance comparison
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={comparativeData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="category" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      <Radar 
                        name="Your Site" 
                        dataKey="user" 
                        stroke={PERFORMANCE_COLORS.user} 
                        fill={PERFORMANCE_COLORS.user} 
                        fillOpacity={0.2} 
                      />
                      <Radar 
                        name="Competitor" 
                        dataKey="competitor" 
                        stroke={PERFORMANCE_COLORS.competitor} 
                        fill={PERFORMANCE_COLORS.competitor} 
                        fillOpacity={0.2} 
                      />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="core-vitals" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Core Web Vitals Analysis</CardTitle>
                <CardDescription>
                  Google's Core Web Vitals performance metrics comparison
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {coreWebVitalsData.map((vital, index) => (
                    <div key={index} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium">{vital.metric}</h4>
                          <Badge 
                            variant={
                              vital.status === "good" ? "default" :
                              vital.status === "needs-improvement" ? "secondary" : "destructive"
                            }
                          >
                            {vital.status === "good" ? "Good" :
                             vital.status === "needs-improvement" ? "Needs Improvement" : "Poor"}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Threshold: {vital.metric.includes("Layout") ? vital.threshold : formatDuration(vital.threshold)}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Your Site</span>
                            <span className="font-medium">
                              {vital.metric.includes("Layout") ? vital.user.toFixed(3) : formatDuration(vital.user)}
                            </span>
                          </div>
                          <div className="relative">
                            <Progress 
                              value={Math.min((vital.user / (vital.threshold * 2)) * 100, 100)} 
                              className="h-3"
                            />
                            <div 
                              className="absolute top-0 h-3 w-0.5 bg-gray-800"
                              style={{ left: `${Math.min((vital.threshold / (vital.threshold * 2)) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Competitor</span>
                            <span className="font-medium">
                              {vital.metric.includes("Layout") ? vital.competitor.toFixed(3) : formatDuration(vital.competitor)}
                            </span>
                          </div>
                          <div className="relative">
                            <Progress 
                              value={Math.min((vital.competitor / (vital.threshold * 2)) * 100, 100)} 
                              className="h-3"
                            />
                            <div 
                              className="absolute top-0 h-3 w-0.5 bg-gray-800"
                              style={{ left: `${Math.min((vital.threshold / (vital.threshold * 2)) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mobile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Mobile Performance Analysis</CardTitle>
                <CardDescription>
                  Mobile-specific performance metrics and optimization insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <h4 className="font-medium">Mobile Performance Scores</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Mobile Speed</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {performanceAnalysis.mobilePerformance.mobileSpeed.user}/100
                          </span>
                          <div className="h-2 w-16 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500"
                              style={{ width: `${performanceAnalysis.mobilePerformance.mobileSpeed.user}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Mobile UX</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {performanceAnalysis.mobilePerformance.mobileUX.user}/100
                          </span>
                          <div className="h-2 w-16 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500"
                              style={{ width: `${performanceAnalysis.mobilePerformance.mobileUX.user}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Responsiveness</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {performanceAnalysis.mobilePerformance.responsiveness.user}/100
                          </span>
                          <div className="h-2 w-16 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-purple-500"
                              style={{ width: `${performanceAnalysis.mobilePerformance.responsiveness.user}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium">Competitor Mobile Scores</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Mobile Speed</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {performanceAnalysis.mobilePerformance.mobileSpeed.competitor}/100
                          </span>
                          <div className="h-2 w-16 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-400"
                              style={{ width: `${performanceAnalysis.mobilePerformance.mobileSpeed.competitor}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Mobile UX</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {performanceAnalysis.mobilePerformance.mobileUX.competitor}/100
                          </span>
                          <div className="h-2 w-16 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-400"
                              style={{ width: `${performanceAnalysis.mobilePerformance.mobileUX.competitor}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Responsiveness</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {performanceAnalysis.mobilePerformance.responsiveness.competitor}/100
                          </span>
                          <div className="h-2 w-16 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-purple-400"
                              style={{ width: `${performanceAnalysis.mobilePerformance.responsiveness.competitor}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="opportunities" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Performance Optimization Opportunities</CardTitle>
                    <CardDescription>
                      Prioritized recommendations for performance improvements
                    </CardDescription>
                  </div>
                  <Button onClick={handleExportData} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export Data
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceOpportunities.map((opportunity, index) => (
                    <div key={index} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{opportunity.metric}</h4>
                            <Badge variant={
                              opportunity.implementation.difficulty === "low" ? "default" :
                              opportunity.implementation.difficulty === "medium" ? "secondary" : "destructive"
                            }>
                              {opportunity.implementation.difficulty} difficulty
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Current: </span>
                              <span className="font-medium">{opportunity.currentValue}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Competitor: </span>
                              <span className="font-medium">{opportunity.competitorValue}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Potential: </span>
                              <span className="font-medium text-green-600">
                                +{opportunity.improvementPotential}%
                              </span>
                            </div>
                          </div>
                          
                          <p className="mt-2 text-sm text-muted-foreground">
                            {opportunity.implementation.effort}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            {opportunity.implementation.expectedImpact}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Expected Impact
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {performanceOpportunities.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-4" />
                      <p className="text-lg font-medium">Excellent Performance!</p>
                      <p>No major optimization opportunities identified.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};