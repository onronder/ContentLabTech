/**
 * Competitive Executive Dashboard
 * Executive-level competitive intelligence overview with strategic insights
 */

"use client";

import React, { useState, useMemo } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCompetitiveIntelligence } from "@/hooks/useCompetitiveIntelligence";
import {
  Eye,
  AlertTriangle,
  RefreshCw,
  Target,
  Users,
  BarChart3,
  Shield,
  Activity,
  Clock,
  Zap,
  Award,
  Brain,
} from "lucide-react";

interface CompetitiveExecutiveDashboardProps {
  projectId?: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  trend?: "up" | "down" | "neutral";
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  trend,
  icon: Icon,
  color,
  description,
}) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-muted-foreground text-sm font-medium">{title}</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold">{value}</p>
            {change !== undefined && (
              <Badge
                variant={
                  trend === "up"
                    ? "default"
                    : trend === "down"
                      ? "destructive"
                      : "secondary"
                }
              >
                {change > 0 ? "+" : ""}
                {change}%
              </Badge>
            )}
          </div>
          {description && (
            <p className="text-muted-foreground mt-1 text-xs">{description}</p>
          )}
        </div>
        <Icon className={`h-8 w-8 ${color}`} />
      </div>
    </CardContent>
  </Card>
);

export const CompetitiveExecutiveDashboard: React.FC<
  CompetitiveExecutiveDashboardProps
> = ({ projectId }) => {
  const { data, loading, error, refresh, isAnalysisRunning } =
    useCompetitiveIntelligence(projectId);
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState("30d");

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate strategic metrics
  const strategicMetrics = useMemo(() => {
    if (!data) return null;

    const { competitors, analysisResults, alerts, marketInsights } = data;

    // Calculate competitive positioning score
    const competitiveScore =
      analysisResults.length > 0
        ? Math.round(
            analysisResults.reduce(
              (sum, r) => sum + (r.confidence?.overall || 0),
              0
            ) / analysisResults.length
          )
        : 0;

    // Calculate market share estimation (simplified)
    const marketShareEstimate =
      competitors.length > 0 ? Math.round(100 / (competitors.length + 1)) : 0;

    // Calculate threat level
    const threatLevel = alerts.filter(
      a => a.severity === "critical" || a.severity === "high"
    ).length;

    // Calculate opportunity score
    const opportunityScore = analysisResults.reduce((sum, r) => {
      const contentGaps =
        r.data.contentAnalysis?.topicAnalysis?.topicGaps?.length || 0;
      const seoGaps =
        r.data.seoAnalysis?.keywordAnalysis?.keywordGaps?.length || 0;
      return sum + contentGaps + seoGaps;
    }, 0);

    return {
      competitiveScore,
      marketShareEstimate,
      threatLevel,
      opportunityScore,
      totalCompetitors: marketInsights.totalCompetitors,
      activeAnalyses: marketInsights.activeAnalyses,
    };
  }, [data]);

  // Get priority insights
  const priorityInsights = useMemo(() => {
    if (!data) return [];

    const insights = [];

    // Critical alerts insight
    const criticalAlerts = data.alerts.filter(
      a => a.severity === "critical"
    ).length;
    if (criticalAlerts > 0) {
      insights.push({
        type: "threat",
        title: "Critical Competitive Threats",
        description: `${criticalAlerts} critical alerts require immediate attention`,
        urgency: "high",
        action: "Review alerts and develop response strategy",
      });
    }

    // Market opportunities insight
    const totalOpportunities = data.analysisResults.reduce(
      (sum, r) =>
        sum + (r.data.contentAnalysis?.topicAnalysis?.topicGaps?.length || 0),
      0
    );
    if (totalOpportunities > 5) {
      insights.push({
        type: "opportunity",
        title: "High-Value Market Opportunities",
        description: `${totalOpportunities} content gaps identified across competitors`,
        urgency: "medium",
        action: "Prioritize top 3 opportunities for content development",
      });
    }

    // Competitive positioning insight
    if (strategicMetrics && strategicMetrics.competitiveScore < 70) {
      insights.push({
        type: "positioning",
        title: "Competitive Position Improvement",
        description: `Current competitive score: ${strategicMetrics.competitiveScore}%`,
        urgency: "medium",
        action: "Focus on SEO and content strategy enhancements",
      });
    }

    return insights.slice(0, 3); // Show top 3 insights
  }, [data, strategicMetrics]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Competitive Intelligence</h2>
            <p className="text-muted-foreground">
              Loading strategic overview...
            </p>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Eye className="h-6 w-6 text-blue-600" />
            Competitive Intelligence
          </h2>
          <p className="text-muted-foreground">
            Strategic competitive analysis and market insights
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
          <Button
            onClick={handleRefresh}
            disabled={refreshing || isAnalysisRunning}
            variant="outline"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Status Alert */}
      {isAnalysisRunning && (
        <Alert>
          <Activity className="h-4 w-4" />
          <AlertDescription>
            Competitive analysis in progress. Data will update automatically
            when complete.
          </AlertDescription>
        </Alert>
      )}

      {/* Strategic Metrics */}
      {strategicMetrics && (
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard
            title="Competitive Score"
            value={`${strategicMetrics.competitiveScore}%`}
            trend={
              strategicMetrics.competitiveScore >= 70
                ? "up"
                : strategicMetrics.competitiveScore >= 50
                  ? "neutral"
                  : "down"
            }
            icon={Award}
            color="text-blue-600"
            description="Overall competitive positioning"
          />
          <MetricCard
            title="Market Share Est."
            value={`${strategicMetrics.marketShareEstimate}%`}
            icon={Target}
            color="text-green-600"
            description="Estimated market position"
          />
          <MetricCard
            title="Active Threats"
            value={strategicMetrics.threatLevel}
            trend={
              strategicMetrics.threatLevel > 5
                ? "down"
                : strategicMetrics.threatLevel > 2
                  ? "neutral"
                  : "up"
            }
            icon={Shield}
            color="text-red-600"
            description="Critical alerts requiring attention"
          />
          <MetricCard
            title="Opportunities"
            value={strategicMetrics.opportunityScore}
            trend="up"
            icon={Brain}
            color="text-purple-600"
            description="Content and SEO gaps identified"
          />
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Strategic Overview</TabsTrigger>
          <TabsTrigger value="positioning">Market Position</TabsTrigger>
          <TabsTrigger value="threats">Threats & Alerts</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Priority Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-600" />
                Priority Strategic Insights
              </CardTitle>
              <CardDescription>
                Key findings requiring executive attention
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {priorityInsights.length > 0 ? (
                priorityInsights.map((insight, index) => (
                  <div key={index} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <Badge
                            variant={
                              insight.type === "threat"
                                ? "destructive"
                                : insight.type === "opportunity"
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {insight.type}
                          </Badge>
                          <Badge
                            variant={
                              insight.urgency === "high"
                                ? "destructive"
                                : insight.urgency === "medium"
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {insight.urgency} priority
                          </Badge>
                        </div>
                        <h3 className="font-semibold">{insight.title}</h3>
                        <p className="text-muted-foreground text-sm">
                          {insight.description}
                        </p>
                        <p className="mt-2 text-sm font-medium">
                          <strong>Recommended Action:</strong> {insight.action}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground py-8 text-center">
                  No priority insights at this time. Your competitive position
                  is stable.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Market Overview */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Competitive Landscape
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Competitors</span>
                  <span className="text-2xl font-bold">
                    {data?.marketInsights.totalCompetitors || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Active Analyses</span>
                  <span className="text-xl font-semibold">
                    {data?.marketInsights.activeAnalyses || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Avg Competitive Score
                  </span>
                  <span className="text-xl font-semibold">
                    {Math.round(data?.marketInsights.avgCompetitiveScore || 0)}%
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                  Performance Trends
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Content Performance</span>
                    <span>78%</span>
                  </div>
                  <Progress value={78} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>SEO Competitive Score</span>
                    <span>65%</span>
                  </div>
                  <Progress value={65} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Market Position</span>
                    <span>82%</span>
                  </div>
                  <Progress value={82} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="positioning">
          <Card>
            <CardHeader>
              <CardTitle>Market Positioning Analysis</CardTitle>
              <CardDescription>
                Detailed competitive positioning and market share analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground py-8 text-center">
                Advanced positioning matrix visualization will be implemented in
                Phase 2
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="threats">
          <Card>
            <CardHeader>
              <CardTitle>Threat Assessment</CardTitle>
              <CardDescription>
                Critical competitive threats and alert management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.alerts.length ? (
                  data.alerts.slice(0, 5).map(alert => (
                    <div key={alert.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <Badge
                              variant={
                                alert.severity === "critical"
                                  ? "destructive"
                                  : alert.severity === "high"
                                    ? "destructive"
                                    : alert.severity === "medium"
                                      ? "default"
                                      : "secondary"
                              }
                            >
                              {alert.severity}
                            </Badge>
                            <span className="text-sm font-medium">
                              {alert.type}
                            </span>
                          </div>
                          <h4 className="font-semibold">{alert.title}</h4>
                          <p className="text-muted-foreground text-sm">
                            {alert.description}
                          </p>
                        </div>
                        <div className="text-muted-foreground text-xs">
                          <Clock className="mr-1 inline h-3 w-3" />
                          {new Date(alert.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-muted-foreground py-8 text-center">
                    No active threats detected
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="opportunities">
          <Card>
            <CardHeader>
              <CardTitle>Market Opportunities</CardTitle>
              <CardDescription>
                Strategic opportunities for competitive advantage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground py-8 text-center">
                Opportunity heat map and prioritization matrix will be
                implemented in Phase 2
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
