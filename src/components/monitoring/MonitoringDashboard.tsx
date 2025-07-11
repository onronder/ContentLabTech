/**
 * Monitoring Dashboard Component
 * Displays real-time service metrics, alerts, and system health
 */

"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { fetch } from "@/lib/utils/fetch";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Zap,
  AlertCircle,
  Cpu,
  MemoryStick,
  Database,
} from "lucide-react";

interface MonitoringData {
  timestamp: string;
  status: string;
  services: Record<
    string,
    {
      status: string;
      consecutiveFailures: number;
      lastCheck: string;
      lastError?: string;
      availableFeatures: string[];
    }
  >;
  activeAlerts: Array<{
    id: string;
    timestamp: string;
    severity: string;
    type: string;
    service: string;
    title: string;
    description: string;
    resolved: boolean;
  }>;
  systemMetrics?: {
    timestamp: string;
    memory: {
      used: number;
      free: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
      loadAverage: number[];
    };
    database: {
      connectionCount: number;
      slowQueries: number;
      errorRate: number;
    };
    cache: {
      hitRate: number;
      missRate: number;
      evictionRate: number;
    };
  };
  circuitBreakers: Record<
    string,
    {
      state: string;
      failureCount: number;
      successCount: number;
      lastFailureTime?: string;
    }
  >;
}

export function MonitoringDashboard() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMonitoringData = async () => {
    try {
      const response = await fetch("/api/monitoring?type=overview");
      if (!response.ok) {
        throw new Error("Failed to fetch monitoring data");
      }
      const result = await response.json();
      setData(result);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchMonitoringData, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleRefresh = () => {
    setLoading(true);
    fetchMonitoringData();
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "healthy":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "degraded":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "unavailable":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "bg-red-500 text-white";
      case "error":
        return "bg-red-100 text-red-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      case "info":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading && !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading monitoring data...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load monitoring data: {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time system health and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <div className="text-muted-foreground text-sm">
            {lastUpdated && `Last updated: ${lastUpdated.toLocaleTimeString()}`}
          </div>
        </div>
      </div>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {getStatusIcon(data.status)}
            <CardTitle>System Status</CardTitle>
            <Badge
              variant={data.status === "healthy" ? "default" : "destructive"}
            >
              {data.status.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {
                  Object.values(data.services).filter(
                    s => s.status === "healthy"
                  ).length
                }
              </div>
              <div className="text-muted-foreground text-sm">
                Healthy Services
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {
                  Object.values(data.services).filter(
                    s => s.status === "degraded"
                  ).length
                }
              </div>
              <div className="text-muted-foreground text-sm">
                Degraded Services
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {
                  Object.values(data.services).filter(
                    s => s.status === "unavailable"
                  ).length
                }
              </div>
              <div className="text-muted-foreground text-sm">
                Unavailable Services
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {data.activeAlerts.length}
              </div>
              <div className="text-muted-foreground text-sm">Active Alerts</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="services" className="space-y-4">
        <TabsList>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="system">System Metrics</TabsTrigger>
          <TabsTrigger value="circuit-breakers">Circuit Breakers</TabsTrigger>
        </TabsList>

        {/* Services Tab */}
        <TabsContent value="services">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(data.services).map(([serviceName, service]) => (
              <Card key={serviceName}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg capitalize">
                      {serviceName}
                    </CardTitle>
                    {getStatusIcon(service.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">
                        Status:
                      </span>
                      <Badge
                        variant={
                          service.status === "healthy"
                            ? "default"
                            : "destructive"
                        }
                      >
                        {service.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">
                        Failures:
                      </span>
                      <span className="text-sm">
                        {service.consecutiveFailures}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">
                        Features:
                      </span>
                      <span className="text-sm">
                        {service.availableFeatures.length}
                      </span>
                    </div>
                    {service.lastError && (
                      <div className="mt-2 rounded-md bg-red-50 p-2">
                        <p className="text-xs text-red-600">
                          {service.lastError}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <div className="space-y-4">
            {data.activeAlerts.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-muted-foreground text-center">
                    <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
                    <p>No active alerts</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              data.activeAlerts.map(alert => (
                <Alert key={alert.id}>
                  <AlertTriangle className="h-4 w-4" />
                  <div className="flex-1">
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="font-semibold">{alert.title}</h4>
                      <div className="flex items-center gap-2">
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        <Badge variant="outline">{alert.service}</Badge>
                      </div>
                    </div>
                    <AlertDescription>{alert.description}</AlertDescription>
                    <div className="text-muted-foreground mt-2 text-xs">
                      {new Date(alert.timestamp).toLocaleString()}
                    </div>
                  </div>
                </Alert>
              ))
            )}
          </div>
        </TabsContent>

        {/* System Metrics Tab */}
        <TabsContent value="system">
          {data.systemMetrics ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Memory */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MemoryStick className="h-5 w-5" />
                    Memory Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="mb-2 flex justify-between text-sm">
                        <span>Used</span>
                        <span>
                          {(data.systemMetrics.memory.percentage * 100).toFixed(
                            1
                          )}
                          %
                        </span>
                      </div>
                      <Progress
                        value={data.systemMetrics.memory.percentage * 100}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Used</div>
                        <div className="font-medium">
                          {(
                            data.systemMetrics.memory.used /
                            1024 /
                            1024
                          ).toFixed(0)}{" "}
                          MB
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Free</div>
                        <div className="font-medium">
                          {(
                            data.systemMetrics.memory.free /
                            1024 /
                            1024
                          ).toFixed(0)}{" "}
                          MB
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Total</div>
                        <div className="font-medium">
                          {(
                            data.systemMetrics.memory.total /
                            1024 /
                            1024
                          ).toFixed(0)}{" "}
                          MB
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* CPU */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="h-5 w-5" />
                    CPU Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="mb-2 flex justify-between text-sm">
                        <span>Usage</span>
                        <span>
                          {(data.systemMetrics.cpu.usage * 100).toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={data.systemMetrics.cpu.usage * 100} />
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-2 text-sm">
                        Load Average
                      </div>
                      <div className="flex gap-4 text-sm">
                        <span>
                          1m:{" "}
                          {data.systemMetrics.cpu.loadAverage[0]?.toFixed(2)}
                        </span>
                        <span>
                          5m:{" "}
                          {data.systemMetrics.cpu.loadAverage[1]?.toFixed(2)}
                        </span>
                        <span>
                          15m:{" "}
                          {data.systemMetrics.cpu.loadAverage[2]?.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Database */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Database
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">
                        Connections
                      </span>
                      <span className="text-sm font-medium">
                        {data.systemMetrics.database.connectionCount}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">
                        Slow Queries
                      </span>
                      <span className="text-sm font-medium">
                        {data.systemMetrics.database.slowQueries}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">
                        Error Rate
                      </span>
                      <span className="text-sm font-medium">
                        {(data.systemMetrics.database.errorRate * 100).toFixed(
                          2
                        )}
                        %
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cache */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Cache Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">
                        Hit Rate
                      </span>
                      <span className="text-sm font-medium">
                        {(data.systemMetrics.cache.hitRate * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">
                        Miss Rate
                      </span>
                      <span className="text-sm font-medium">
                        {(data.systemMetrics.cache.missRate * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">
                        Eviction Rate
                      </span>
                      <span className="text-sm font-medium">
                        {(data.systemMetrics.cache.evictionRate * 100).toFixed(
                          2
                        )}
                        %
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-muted-foreground text-center">
                  <Activity className="mx-auto mb-4 h-12 w-12" />
                  <p>No system metrics available</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Circuit Breakers Tab */}
        <TabsContent value="circuit-breakers">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(data.circuitBreakers).map(([name, breaker]) => (
              <Card key={name}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg capitalize">{name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">
                        State:
                      </span>
                      <Badge
                        variant={
                          breaker.state === "CLOSED" ? "default" : "destructive"
                        }
                      >
                        {breaker.state}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">
                        Failures:
                      </span>
                      <span className="text-sm">{breaker.failureCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">
                        Successes:
                      </span>
                      <span className="text-sm">{breaker.successCount}</span>
                    </div>
                    {breaker.lastFailureTime && (
                      <div className="text-muted-foreground mt-2 text-xs">
                        Last failure:{" "}
                        {new Date(breaker.lastFailureTime).toLocaleString()}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
