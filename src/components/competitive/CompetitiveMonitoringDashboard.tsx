"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  Eye,
  AlertTriangle,
  Clock,
  Globe,
  BarChart3,
  RefreshCw,
  Bell,
  Target,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

interface CompetitiveMonitoringProps {
  projectId: string;
}

interface CompetitorRanking {
  keyword: string;
  position: number;
  title: string;
  url: string;
  snippet: string;
  featured: boolean;
  change: number;
}

interface CompetitorAnalysis {
  competitorId: string;
  domain: string;
  rankings: CompetitorRanking[];
  visibility: {
    estimatedTraffic: number;
    keywordCount: number;
    averagePosition: number;
    visibilityScore: number;
  };
  changes: {
    type: "ranking" | "content" | "technical";
    description: string;
    impact: "high" | "medium" | "low";
    timestamp: string;
  }[];
  opportunities: {
    type: "keyword" | "content" | "technical";
    description: string;
    potential: number;
    effort: "high" | "medium" | "low";
  }[];
}

interface CompetitorAlert {
  id: string;
  competitorId: string;
  type: string;
  title: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  isRead: boolean;
  createdAt: string;
  competitor: {
    name: string;
    domain: string;
  };
}

export function CompetitiveMonitoringDashboard({
  projectId,
}: CompetitiveMonitoringProps) {
  const [analyses, setAnalyses] = useState<CompetitorAnalysis[]>([]);
  const [alerts, setAlerts] = useState<CompetitorAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState("7d");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const loadCompetitiveData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/competitive/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          action: "analyze",
          params: {
            timeframe: selectedTimeframe,
          },
        }),
      });

      if (!response.ok) throw new Error("Failed to load competitive data");

      const data = await response.json();
      setAnalyses(data.result || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load competitive data"
      );
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedTimeframe]);

  const loadAlerts = useCallback(async () => {
    try {
      const response = await fetch("/api/competitive/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          action: "alerts",
        }),
      });

      if (!response.ok) throw new Error("Failed to load alerts");

      const data = await response.json();
      setAlerts(data.result.alerts || []);
    } catch (err) {
      console.error("Failed to load alerts:", err);
    }
  }, [projectId]);

  useEffect(() => {
    loadCompetitiveData();
    loadAlerts();
  }, [projectId, selectedTimeframe, loadCompetitiveData, loadAlerts]);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      await loadCompetitiveData();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const markAlertAsRead = async (alertId: string) => {
    try {
      const response = await fetch(`/api/competitive/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });

      if (response.ok) {
        setAlerts(prev =>
          prev.map(alert =>
            alert.id === alertId ? { ...alert, isRead: true } : alert
          )
        );
      }
    } catch (err) {
      console.error("Failed to mark alert as read:", err);
    }
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUpRight className="h-4 w-4 text-red-600" />;
    if (change < 0)
      return <ArrowDownRight className="h-4 w-4 text-green-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-red-600"; // Position increase is bad
    if (change < 0) return "text-green-600"; // Position decrease is good
    return "text-gray-400";
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "default";
    }
  };

  const getOpportunityColor = (potential: number) => {
    if (potential >= 70) return "text-green-600";
    if (potential >= 40) return "text-yellow-600";
    return "text-gray-600";
  };

  const unreadAlerts = alerts.filter(alert => !alert.isRead);
  const criticalAlerts = alerts.filter(
    alert => alert.severity === "critical" || alert.severity === "high"
  );

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
            Monitor competitor rankings and discover opportunities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedTimeframe}
            onValueChange={setSelectedTimeframe}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24 Hours</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={runAnalysis} disabled={isAnalyzing}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isAnalyzing ? "animate-spin" : ""}`}
            />
            {isAnalyzing ? "Analyzing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Alerts Summary */}
      {unreadAlerts.length > 0 && (
        <Alert variant={criticalAlerts.length > 0 ? "destructive" : "default"}>
          <Bell className="h-4 w-4" />
          <AlertDescription>
            You have {unreadAlerts.length} unread alert
            {unreadAlerts.length !== 1 ? "s" : ""}
            {criticalAlerts.length > 0 &&
              `, including ${criticalAlerts.length} critical alert${criticalAlerts.length !== 1 ? "s" : ""}`}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="rankings">Rankings</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts{" "}
            {unreadAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                {unreadAlerts.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {loading ? (
            <div className="py-8 text-center">Loading competitive data...</div>
          ) : (
            <div className="grid gap-4">
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm font-medium">
                          Competitors
                        </p>
                        <p className="text-2xl font-bold">{analyses.length}</p>
                      </div>
                      <Users className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm font-medium">
                          Avg Position
                        </p>
                        <p className="text-2xl font-bold">
                          {analyses.length > 0
                            ? Math.round(
                                analyses.reduce(
                                  (sum, a) =>
                                    sum + a.visibility.averagePosition,
                                  0
                                ) / analyses.length
                              )
                            : 0}
                        </p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-yellow-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm font-medium">
                          Total Traffic
                        </p>
                        <p className="text-2xl font-bold">
                          {analyses
                            .reduce(
                              (sum, a) => sum + a.visibility.estimatedTraffic,
                              0
                            )
                            .toLocaleString()}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm font-medium">
                          Opportunities
                        </p>
                        <p className="text-2xl font-bold">
                          {analyses.reduce(
                            (sum, a) => sum + a.opportunities.length,
                            0
                          )}
                        </p>
                      </div>
                      <Target className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Competitor Performance */}
              <div className="grid gap-4 md:grid-cols-2">
                {analyses.map(analysis => (
                  <Card key={analysis.competitorId}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Globe className="h-5 w-5" />
                          {analysis.domain}
                        </span>
                        <Badge variant="outline">
                          Score: {analysis.visibility.visibilityScore}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Est. Traffic</p>
                          <p className="font-medium">
                            {analysis.visibility.estimatedTraffic.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Keywords</p>
                          <p className="font-medium">
                            {analysis.visibility.keywordCount}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Avg Position</p>
                          <p className="font-medium">
                            {analysis.visibility.averagePosition.toFixed(1)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Opportunities</p>
                          <p className="font-medium">
                            {analysis.opportunities.length}
                          </p>
                        </div>
                      </div>
                      <Progress
                        value={analysis.visibility.visibilityScore}
                        className="h-2"
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="rankings" className="space-y-4">
          <div className="space-y-4">
            {analyses.map(analysis => (
              <Card key={analysis.competitorId}>
                <CardHeader>
                  <CardTitle>{analysis.domain}</CardTitle>
                  <CardDescription>
                    {analysis.rankings.length} keyword rankings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {analysis.rankings.slice(0, 20).map((ranking, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded border p-2"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {ranking.keyword}
                              </span>
                              {ranking.featured && (
                                <Badge variant="default">Featured</Badge>
                              )}
                            </div>
                            <p className="text-muted-foreground line-clamp-1 text-xs">
                              {ranking.title}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              #{ranking.position}
                            </span>
                            {ranking.change !== 0 && (
                              <div
                                className={`flex items-center gap-1 ${getChangeColor(ranking.change)}`}
                              >
                                {getChangeIcon(ranking.change)}
                                <span className="text-xs">
                                  {Math.abs(ranking.change)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-4">
          <div className="space-y-4">
            {analyses.map(analysis => (
              <Card key={analysis.competitorId}>
                <CardHeader>
                  <CardTitle>{analysis.domain}</CardTitle>
                  <CardDescription>
                    {analysis.opportunities.length} opportunities identified
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysis.opportunities.map((opportunity, index) => (
                      <div key={index} className="rounded border p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="mb-1 flex items-center gap-2">
                              <Badge variant="outline">
                                {opportunity.type}
                              </Badge>
                              <Badge variant="secondary">
                                {opportunity.effort} effort
                              </Badge>
                            </div>
                            <p className="text-sm">{opportunity.description}</p>
                          </div>
                          <div
                            className={`text-right ${getOpportunityColor(opportunity.potential)}`}
                          >
                            <p className="text-sm font-medium">
                              {opportunity.potential}%
                            </p>
                            <p className="text-xs">potential</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center">
                No alerts at this time
              </div>
            ) : (
              alerts.map(alert => (
                <Card
                  key={alert.id}
                  className={`cursor-pointer transition-colors ${
                    !alert.isRead ? "border-blue-200 bg-blue-50" : ""
                  }`}
                  onClick={() => !alert.isRead && markAlertAsRead(alert.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <Badge variant={getSeverityColor(alert.severity)}>
                            {alert.severity}
                          </Badge>
                          <span className="text-sm font-medium">
                            {alert.competitor.name}
                          </span>
                          {!alert.isRead && (
                            <Badge variant="default">New</Badge>
                          )}
                        </div>
                        <h3 className="mb-1 font-medium">{alert.title}</h3>
                        <p className="text-muted-foreground text-sm">
                          {alert.message}
                        </p>
                      </div>
                      <div className="text-muted-foreground text-xs">
                        <Clock className="mr-1 inline h-3 w-3" />
                        {new Date(alert.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
