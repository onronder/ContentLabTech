"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Wifi,
  WifiOff,
  Activity,
  CheckCircle,
  Zap,
} from "lucide-react";
import { 
  useCompetitiveWebSocket,
  type AnalysisUpdateMessage,
  type AnalysisCompleteMessage,
  type AlertCreatedMessage,
} from "@/lib/competitive/websocket";
import type { CompetitiveAnalysisResult, CompetitiveAlert } from "@/lib/competitive/types";

interface CompetitiveMonitoringProps {
  projectId: string;
  userId?: string;
}

interface LiveAnalysis {
  jobId: string;
  competitorName: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  estimatedTimeRemaining?: number | undefined;
  startedAt: Date;
  completedAt?: Date | undefined;
}

interface ConnectionStats {
  isConnected: boolean;
  connectionState: string;
  lastConnected?: Date;
  reconnectAttempts: number;
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
  userId = "current-user",
}: CompetitiveMonitoringProps) {
  const [analyses, setAnalyses] = useState<CompetitorAnalysis[]>([]);
  const [alerts, setAlerts] = useState<CompetitorAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState("7d");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Real-time WebSocket state
  const [liveAnalyses, setLiveAnalyses] = useState<LiveAnalysis[]>([]);
  const [realtimeAlerts, setRealtimeAlerts] = useState<CompetitiveAlert[]>([]);
  const [completedResults, setCompletedResults] = useState<CompetitiveAnalysisResult[]>([]);
  const [connectionStats, setConnectionStats] = useState<ConnectionStats>({
    isConnected: false,
    connectionState: 'closed',
    reconnectAttempts: 0,
  });
  const [, setIsInitializing] = useState(true);

  // WebSocket event handlers
  const handleAnalysisUpdate = useCallback((message: AnalysisUpdateMessage) => {
    const { jobId, status, progress, estimatedTimeRemaining } = message.payload;
    
    setLiveAnalyses(prev => {
      const existing = prev.find(a => a.jobId === jobId);
      if (existing) {
        return prev.map(a => 
          a.jobId === jobId 
            ? { 
                ...a, 
                status: status.status,
                progress: status.progress || progress,
                estimatedTimeRemaining,
              }
            : a
        );
      } else {
        return [...prev, {
          jobId,
          competitorName: `Analysis ${jobId.slice(-8)}`,
          status: status.status,
          progress: status.progress || progress,
          estimatedTimeRemaining: estimatedTimeRemaining || undefined,
          startedAt: new Date(),
          completedAt: undefined,
        }];
      }
    });
  }, []);

  const handleAnalysisComplete = useCallback((message: AnalysisCompleteMessage) => {
    const { jobId, result } = message.payload;
    
    setLiveAnalyses(prev => 
      prev.map(a => 
        a.jobId === jobId 
          ? { ...a, status: "completed", progress: 100, completedAt: new Date() }
          : a
      )
    );

    setCompletedResults(prev => [result, ...prev.slice(0, 9)]);
    
    // Note: Could trigger a data refresh here if needed
  }, []);

  const handleAlertCreated = useCallback((message: AlertCreatedMessage) => {
    const { alert } = message.payload;
    
    setRealtimeAlerts(prev => [alert, ...prev.slice(0, 19)]);
    
    // Also add to main alerts
    setAlerts(prev => [
      {
        id: alert.id,
        competitorId: alert.competitorId,
        type: alert.type,
        title: alert.title,
        message: alert.description,
        severity: alert.severity as "low" | "medium" | "high" | "critical",
        isRead: false,
        createdAt: alert.timestamp.toString(),
        competitor: {
          name: `Competitor ${alert.competitorId.slice(-8)}`,
          domain: alert.competitorId,
        },
      },
      ...prev.slice(0, 19)
    ]);
  }, []);

  const handleConnect = useCallback(() => {
    setConnectionStats(prev => ({
      ...prev,
      isConnected: true,
      lastConnected: new Date(),
      reconnectAttempts: 0,
    }));
    setIsInitializing(false);
  }, []);

  const handleDisconnect = useCallback(() => {
    setConnectionStats(prev => ({
      ...prev,
      isConnected: false,
    }));
  }, []);

  const handleReconnect = useCallback((attemptNumber: number) => {
    setConnectionStats(prev => ({
      ...prev,
      reconnectAttempts: attemptNumber,
    }));
  }, []);

  // Initialize WebSocket connection
  const wsService = useCompetitiveWebSocket(
    { projectId, userId },
    {
      onAnalysisUpdate: handleAnalysisUpdate,
      onAnalysisComplete: handleAnalysisComplete,
      onAlertCreated: handleAlertCreated,
      onConnect: handleConnect,
      onDisconnect: handleDisconnect,
      onReconnect: handleReconnect,
    }
  );

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

  // WebSocket initialization
  useEffect(() => {
    let mounted = true;

    const initializeConnection = async () => {
      try {
        await wsService.connect();
        if (mounted) {
          setConnectionStats(prev => ({
            ...prev,
            connectionState: wsService.getConnectionState(),
          }));
        }
      } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
        if (mounted) {
          setIsInitializing(false);
        }
      }
    };

    initializeConnection();

    return () => {
      mounted = false;
      wsService.disconnect();
    };
  }, [projectId, userId, wsService]);

  // Update connection state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setConnectionStats(prev => ({
        ...prev,
        connectionState: wsService.getConnectionState(),
        isConnected: wsService.isConnected(),
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, [wsService]);

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

  // Calculate monitoring statistics
  const monitoringStats = useMemo(() => {
    const activeAnalyses = liveAnalyses.filter(a => a.status === "processing").length;
    const completedToday = completedResults.filter(r => {
      const today = new Date();
      return new Date(r.timestamp).toDateString() === today.toDateString();
    }).length;
    const criticalRealtimeAlerts = realtimeAlerts.filter(a => a.severity === "critical").length;
    const avgProgress = liveAnalyses.length > 0 
      ? liveAnalyses.reduce((sum, a) => sum + a.progress, 0) / liveAnalyses.length 
      : 0;

    return {
      activeAnalyses,
      completedToday,
      criticalAlerts: criticalRealtimeAlerts,
      avgProgress,
      totalAlerts: realtimeAlerts.length,
    };
  }, [liveAnalyses, completedResults, realtimeAlerts]);

  const getConnectionStatusColor = () => {
    if (connectionStats.isConnected) return "text-green-600";
    if (connectionStats.connectionState === "connecting") return "text-yellow-600";
    return "text-red-600";
  };

  const getConnectionStatusIcon = () => {
    if (connectionStats.isConnected) return <Wifi className="h-4 w-4" />;
    if (connectionStats.connectionState === "connecting") return <RefreshCw className="h-4 w-4 animate-spin" />;
    return <WifiOff className="h-4 w-4" />;
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

      {/* Real-time Connection Status */}
      <Alert>
        <div className="flex items-center gap-2">
          <span className={getConnectionStatusColor()}>
            {getConnectionStatusIcon()}
          </span>
          <div className="flex-1">
            <div className="font-medium">
              Real-time Monitoring {connectionStats.isConnected ? "Active" : "Disconnected"}
            </div>
            <div className="text-sm text-muted-foreground">
              Status: {connectionStats.connectionState}
              {connectionStats.lastConnected && (
                <span className="ml-2">
                  Last connected: {connectionStats.lastConnected.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
          {connectionStats.reconnectAttempts > 0 && (
            <Badge variant="outline">
              Reconnect attempts: {connectionStats.reconnectAttempts}
            </Badge>
          )}
        </div>
      </Alert>

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
          <TabsTrigger value="live-monitoring">
            Live Monitoring
            {monitoringStats.activeAnalyses > 0 && (
              <Badge variant="default" className="ml-2 h-5 w-5 p-0 text-xs">
                {monitoringStats.activeAnalyses}
              </Badge>
            )}
          </TabsTrigger>
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

        <TabsContent value="live-monitoring" className="space-y-4">
          {/* Real-time Statistics */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Analyses</p>
                    <p className="text-2xl font-bold text-blue-600">{monitoringStats.activeAnalyses}</p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Completed Today</p>
                    <p className="text-2xl font-bold text-green-600">{monitoringStats.completedToday}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Critical Alerts</p>
                    <p className="text-2xl font-bold text-red-600">{monitoringStats.criticalAlerts}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg Progress</p>
                    <p className="text-2xl font-bold text-purple-600">{Math.round(monitoringStats.avgProgress)}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Live Analysis Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-600" />
                Live Analysis Progress
              </CardTitle>
              <CardDescription>
                Real-time tracking of competitive analysis jobs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {liveAnalyses.length > 0 ? (
                liveAnalyses.map(analysis => (
                  <div key={analysis.jobId} className="space-y-2 rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            analysis.status === "completed" ? "default" :
                            analysis.status === "processing" ? "secondary" :
                            analysis.status === "failed" ? "destructive" : "outline"
                          }
                        >
                          {analysis.status}
                        </Badge>
                        <span className="font-medium">{analysis.competitorName}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <Clock className="mr-1 inline h-3 w-3" />
                        {analysis.startedAt.toLocaleTimeString()}
                      </div>
                    </div>
                    
                    <Progress value={analysis.progress} className="h-2" />
                    
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{analysis.progress}% complete</span>
                      {analysis.estimatedTimeRemaining && (
                        <span>ETA: {Math.round(analysis.estimatedTimeRemaining / 60)}m</span>
                      )}
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      Job ID: {analysis.jobId}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground py-8 text-center">
                  No active analyses. Live updates will appear here when analyses start.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Real-time Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-red-600" />
                Real-time Alerts
              </CardTitle>
              <CardDescription>
                Live competitive intelligence alerts and notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {realtimeAlerts.length > 0 ? (
                realtimeAlerts.slice(0, 5).map(alert => (
                  <div key={alert.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <Badge
                            variant={
                              alert.severity === "critical" ? "destructive" :
                              alert.severity === "high" ? "destructive" :
                              alert.severity === "medium" ? "default" : "secondary"
                            }
                          >
                            {alert.severity}
                          </Badge>
                          <span className="text-sm font-medium">{alert.type}</span>
                        </div>
                        <h4 className="font-semibold">{alert.title}</h4>
                        <p className="text-muted-foreground text-sm">{alert.description}</p>
                      </div>
                      <div className="text-muted-foreground text-xs">
                        <Clock className="mr-1 inline h-3 w-3" />
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground py-8 text-center">
                  No real-time alerts. New alerts will appear here automatically.
                </div>
              )}
            </CardContent>
          </Card>
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
