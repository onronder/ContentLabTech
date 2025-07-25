/**
 * Enterprise Monitoring Dashboard
 * Comprehensive monitoring visualization with real-time metrics, SLA tracking, and alerts
 */

"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Activity,
  Shield,
  Clock,
  TrendingUp,
  TrendingDown,
  Zap,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
  LineChart,
  PieChart,
  RefreshCw,
  Download,
  Settings,
  Eye,
  EyeOff,
} from "lucide-react";

// Types for dashboard data
interface MonitoringData {
  systemHealth: SystemHealth;
  slaMetrics: SLAMetrics;
  alerts: Alert[];
  performance: PerformanceData;
  errors: ErrorData;
  services: ServiceData[];
  business: BusinessMetrics;
}

interface SystemHealth {
  overall: "healthy" | "degraded" | "unhealthy" | "maintenance";
  score: number;
  uptime: number;
  lastCheck: string;
  criticalIssues: string[];
}

interface SLAMetrics {
  availability: {
    current: number;
    target: number;
    monthly: number;
    breaches: number;
  };
  performance: {
    responseTime: {
      current: number;
      target: number;
      p95: number;
      p99: number;
    };
    throughput: {
      current: number;
      target: number;
      peak: number;
    };
  };
  reliability: {
    mttr: number; // Mean Time To Recovery
    mtbf: number; // Mean Time Between Failures
    errorRate: number;
    targetErrorRate: number;
  };
}

interface Alert {
  id: string;
  title: string;
  severity: "info" | "warning" | "critical" | "emergency";
  status: "open" | "acknowledged" | "resolved";
  source: string;
  timestamp: string;
  description: string;
  affectedServices: string[];
}

interface PerformanceData {
  responseTime: {
    current: number;
    trend: "up" | "down" | "stable";
    history: Array<{ timestamp: string; value: number }>;
  };
  throughput: {
    current: number;
    trend: "up" | "down" | "stable";
    history: Array<{ timestamp: string; value: number }>;
  };
  errorRate: {
    current: number;
    trend: "up" | "down" | "stable";
    history: Array<{ timestamp: string; value: number }>;
  };
  resourceUsage: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
}

interface ErrorData {
  total: number;
  unique: number;
  rate: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  topErrors: Array<{
    id: string;
    message: string;
    count: number;
    lastSeen: string;
  }>;
}

interface ServiceData {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  availability: number;
  responseTime: number;
  errorRate: number;
  lastCheck: string;
  dependencies: string[];
  version: string;
}

interface BusinessMetrics {
  usersAffected: number;
  revenueImpact: number;
  customerSatisfaction: number;
  slaCredits: number;
  criticalJourneys: Array<{
    name: string;
    status: "healthy" | "degraded" | "unhealthy";
    availability: number;
  }>;
}

// Mock data hook (replace with real API calls)
function useMonitoringData(refreshInterval = 30000): {
  data: MonitoringData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch from multiple endpoints
      const [healthResponse, metricsResponse, alertsResponse] = await Promise.all([
        fetch("/api/health/enterprise"),
        fetch("/api/health/metrics"),
        fetch("/api/alerts"), // This would need to be implemented
      ]);

      if (!healthResponse.ok || !metricsResponse.ok) {
        throw new Error("Failed to fetch monitoring data");
      }

      const healthData = await healthResponse.json();
      const metricsData = await metricsResponse.json();
      const alertsData = alertsResponse.ok ? await alertsResponse.json() : { alerts: [] };

      // Transform API data to dashboard format
      const transformedData: MonitoringData = {
        systemHealth: {
          overall: healthData.data.overall,
          score: healthData.data.score,
          uptime: healthData.data.sla.uptime,
          lastCheck: healthData.metadata.timestamp,
          criticalIssues: healthData.data.criticalIssues,
        },
        slaMetrics: {
          availability: {
            current: healthData.data.sla.availability,
            target: 99.9,
            monthly: healthData.data.sla.availability,
            breaches: healthData.data.criticalIssues.length,
          },
          performance: {
            responseTime: {
              current: healthData.data.performance.averageResponseTime,
              target: 200,
              p95: metricsData.data?.performance?.responseTime?.p95 || 250,
              p99: metricsData.data?.performance?.responseTime?.p99 || 500,
            },
            throughput: {
              current: healthData.data.performance.throughput,
              target: 1000,
              peak: 2000,
            },
          },
          reliability: {
            mttr: healthData.data.sla.mttr,
            mtbf: healthData.data.sla.mtbf,
            errorRate: healthData.data.performance.errorRate,
            targetErrorRate: 0.1,
          },
        },
        alerts: alertsData.alerts || [],
        performance: {
          responseTime: {
            current: healthData.data.performance.averageResponseTime,
            trend: "stable",
            history: generateMockHistory(healthData.data.performance.averageResponseTime),
          },
          throughput: {
            current: healthData.data.performance.throughput,
            trend: "stable",
            history: generateMockHistory(healthData.data.performance.throughput),
          },
          errorRate: {
            current: healthData.data.performance.errorRate,
            trend: "stable",
            history: generateMockHistory(healthData.data.performance.errorRate),
          },
          resourceUsage: {
            cpu: healthData.data.capacity.cpu,
            memory: healthData.data.capacity.memory,
            disk: healthData.data.capacity.disk,
            network: healthData.data.capacity.network,
          },
        },
        errors: {
          total: metricsData.data?.errors?.total || 0,
          unique: metricsData.data?.errors?.unique || 0,
          rate: metricsData.data?.errors?.rate || 0,
          byCategory: metricsData.data?.errors?.byCategory || {},
          bySeverity: metricsData.data?.errors?.bySeverity || {},
          topErrors: [],
        },
        services: healthData.data.checks.map((check: any) => ({
          name: check.name,
          status: check.status,
          availability: check.availability,
          responseTime: check.responseTime,
          errorRate: 0,
          lastCheck: check.lastCheck,
          dependencies: [],
          version: "1.0.0",
        })),
        business: {
          usersAffected: metricsData.data?.businessImpact?.totalUsersAffected || 0,
          revenueImpact: metricsData.data?.businessImpact?.totalRevenueImpact || 0,
          customerSatisfaction: 98.5,
          slaCredits: 0,
          criticalJourneys: [
            { name: "User Authentication", status: "healthy", availability: 99.9 },
            { name: "Payment Processing", status: "healthy", availability: 99.8 },
            { name: "Content Delivery", status: "healthy", availability: 99.7 },
          ],
        },
      };

      setData(transformedData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
  };
}

// Helper function to generate mock historical data
function generateMockHistory(currentValue: number): Array<{ timestamp: string; value: number }> {
  const history = [];
  const now = new Date();
  
  for (let i = 23; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000).toISOString();
    const variance = (Math.random() - 0.5) * 0.2; // ±10% variance
    const value = Math.max(0, currentValue * (1 + variance));
    history.push({ timestamp, value });
  }
  
  return history;
}

// Status indicator component
function StatusIndicator({ 
  status, 
  size = "default" 
}: { 
  status: "healthy" | "degraded" | "unhealthy" | "maintenance";
  size?: "small" | "default" | "large";
}) {
  const sizeClasses = {
    small: "h-2 w-2",
    default: "h-3 w-3",
    large: "h-4 w-4",
  };

  const statusConfig = {
    healthy: { color: "bg-green-500", icon: CheckCircle, label: "Healthy" },
    degraded: { color: "bg-yellow-500", icon: AlertCircle, label: "Degraded" },
    unhealthy: { color: "bg-red-500", icon: XCircle, label: "Unhealthy" },
    maintenance: { color: "bg-blue-500", icon: Settings, label: "Maintenance" },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center space-x-2">
      <div className={`rounded-full ${config.color} ${sizeClasses[size]}`} />
      <span className="text-sm font-medium">{config.label}</span>
    </div>
  );
}

// Trend indicator component
function TrendIndicator({ 
  trend, 
  value, 
  unit = "" 
}: { 
  trend: "up" | "down" | "stable";
  value: number;
  unit?: string;
}) {
  const trendConfig = {
    up: { icon: TrendingUp, color: "text-red-500", label: "↑" },
    down: { icon: TrendingDown, color: "text-green-500", label: "↓" },
    stable: { icon: Activity, color: "text-gray-500", label: "→" },
  };

  const config = trendConfig[trend];
  const Icon = config.icon;

  return (
    <div className={`flex items-center space-x-1 ${config.color}`}>
      <Icon className="h-4 w-4" />
      <span className="text-sm font-medium">
        {value.toFixed(1)}{unit}
      </span>
    </div>
  );
}

// Main dashboard component
export function EnterpriseMonitoringDashboard() {
  const [timeRange, setTimeRange] = useState("24h");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedTab, setSelectedTab] = useState("overview");
  
  const { data, loading, error, refresh } = useMonitoringData(
    autoRefresh ? 30000 : 0
  );

  const criticalAlertsCount = useMemo(() => {
    if (!data?.alerts) return 0;
    return data.alerts.filter(alert => 
      alert.severity === "critical" && alert.status === "open"
    ).length;
  }, [data?.alerts]);

  const emergencyAlertsCount = useMemo(() => {
    if (!data?.alerts) return 0;
    return data.alerts.filter(alert => 
      alert.severity === "emergency" && alert.status === "open"
    ).length;
  }, [data?.alerts]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading monitoring data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">Failed to load monitoring data</span>
          </div>
          <p className="mt-2 text-sm text-red-600">{error}</p>
          <Button
            onClick={refresh}
            variant="outline"
            size="sm"
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time system health, performance metrics, and SLA tracking
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            Auto-refresh
          </Button>
          
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {(criticalAlertsCount > 0 || emergencyAlertsCount > 0) && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="font-medium text-red-600">
                {emergencyAlertsCount > 0
                  ? `${emergencyAlertsCount} Emergency Alert${emergencyAlertsCount > 1 ? 's' : ''}`
                  : `${criticalAlertsCount} Critical Alert${criticalAlertsCount > 1 ? 's' : ''}`
                } Requiring Immediate Attention
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{data.systemHealth.score}%</span>
                <StatusIndicator status={data.systemHealth.overall} />
              </div>
              <Progress value={data.systemHealth.score} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Last check: {new Date(data.systemHealth.lastCheck).toLocaleTimeString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Availability</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {data.slaMetrics.availability.current.toFixed(2)}%
                </span>
                <Badge 
                  variant={data.slaMetrics.availability.current >= data.slaMetrics.availability.target ? "default" : "destructive"}
                >
                  Target: {data.slaMetrics.availability.target}%
                </Badge>
              </div>
              <Progress 
                value={data.slaMetrics.availability.current} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                Uptime: {data.systemHealth.uptime.toFixed(1)}%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {data.performance.responseTime.current.toFixed(0)}ms
                </span>
                <TrendIndicator 
                  trend={data.performance.responseTime.trend}
                  value={data.performance.responseTime.current}
                  unit="ms"
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>P95: {data.slaMetrics.performance.responseTime.p95}ms</span>
                <span>P99: {data.slaMetrics.performance.responseTime.p99}ms</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {data.performance.errorRate.current.toFixed(2)}%
                </span>
                <TrendIndicator 
                  trend={data.performance.errorRate.trend}
                  value={data.performance.errorRate.current}
                  unit="%"
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Total: {data.errors.total}</span>
                <span>Unique: {data.errors.unique}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="alerts">Alerts ({data.alerts.length})</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="sla">SLA Tracking</TabsTrigger>
          <TabsTrigger value="business">Business Impact</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Resource Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Resource Usage</CardTitle>
                <CardDescription>Current system resource utilization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>CPU</span>
                    <span>{data.performance.resourceUsage.cpu.toFixed(1)}%</span>
                  </div>
                  <Progress value={data.performance.resourceUsage.cpu} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Memory</span>
                    <span>{data.performance.resourceUsage.memory.toFixed(1)}%</span>
                  </div>
                  <Progress value={data.performance.resourceUsage.memory} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Disk</span>
                    <span>{data.performance.resourceUsage.disk.toFixed(1)}%</span>
                  </div>
                  <Progress value={data.performance.resourceUsage.disk} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Network</span>
                    <span>{data.performance.resourceUsage.network.toFixed(1)}%</span>
                  </div>
                  <Progress value={data.performance.resourceUsage.network} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Critical Issues */}
            <Card>
              <CardHeader>
                <CardTitle>Critical Issues</CardTitle>
                <CardDescription>Issues requiring immediate attention</CardDescription>
              </CardHeader>
              <CardContent>
                {data.systemHealth.criticalIssues.length > 0 ? (
                  <div className="space-y-2">
                    {data.systemHealth.criticalIssues.map((issue, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-red-50 rounded-md">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-red-700">{issue}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 p-4 bg-green-50 rounded-md">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-green-700">No critical issues detected</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Response Time Trend</CardTitle>
                <CardDescription>Average response time over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                  <div className="text-center">
                    <LineChart className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Response time chart</p>
                    <p className="text-xs text-gray-400">Would integrate with charting library</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Throughput Trend</CardTitle>
                <CardDescription>Requests per minute over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Throughput chart</p>
                    <p className="text-xs text-gray-400">Would integrate with charting library</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Alerts</CardTitle>
              <CardDescription>Current system alerts requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              {data.alerts.length > 0 ? (
                <div className="space-y-4">
                  {data.alerts.map((alert) => (
                    <div key={alert.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant={alert.severity === "critical" ? "destructive" : 
                                      alert.severity === "warning" ? "secondary" : "default"}
                            >
                              {alert.severity.toUpperCase()}
                            </Badge>
                            <Badge variant="outline">{alert.status}</Badge>
                            <span className="text-sm text-muted-foreground">{alert.source}</span>
                          </div>
                          <h4 className="font-medium">{alert.title}</h4>
                          <p className="text-sm text-muted-foreground">{alert.description}</p>
                          <div className="text-xs text-muted-foreground">
                            {new Date(alert.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Button size="sm" variant="outline">Acknowledge</Button>
                          <Button size="sm" variant="outline">Resolve</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-medium">No Active Alerts</h3>
                  <p className="text-muted-foreground">All systems are operating normally</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Service Health</CardTitle>
              <CardDescription>Status of all monitored services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.services.map((service) => (
                  <div key={service.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <StatusIndicator status={service.status} />
                        <span className="font-medium">{service.name}</span>
                        <Badge variant="outline">{service.version}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Last check: {new Date(service.lastCheck).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Availability:</span>{" "}
                        <span className="font-medium">{service.availability.toFixed(2)}%</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Response:</span>{" "}
                        <span className="font-medium">{service.responseTime.toFixed(0)}ms</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sla" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>SLA Compliance</CardTitle>
                <CardDescription>Current SLA metrics and targets</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Availability</span>
                    <span>{data.slaMetrics.availability.current.toFixed(3)}%</span>
                  </div>
                  <Progress value={data.slaMetrics.availability.current} className="h-2" />
                  <div className="text-xs text-muted-foreground">
                    Target: {data.slaMetrics.availability.target}% | Breaches: {data.slaMetrics.availability.breaches}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Response Time</span>
                    <span>{data.slaMetrics.performance.responseTime.current}ms</span>
                  </div>
                  <Progress 
                    value={(data.slaMetrics.performance.responseTime.target / data.slaMetrics.performance.responseTime.current) * 100} 
                    className="h-2" 
                  />
                  <div className="text-xs text-muted-foreground">
                    Target: {data.slaMetrics.performance.responseTime.target}ms
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reliability Metrics</CardTitle>
                <CardDescription>MTTR, MTBF, and error rates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold">{data.slaMetrics.reliability.mttr.toFixed(1)}m</div>
                    <div className="text-xs text-muted-foreground">MTTR</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{data.slaMetrics.reliability.mtbf.toFixed(0)}h</div>
                    <div className="text-xs text-muted-foreground">MTBF</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Error Rate</span>
                    <span>{data.slaMetrics.reliability.errorRate.toFixed(2)}%</span>
                  </div>
                  <Progress value={data.slaMetrics.reliability.errorRate * 10} className="h-2" />
                  <div className="text-xs text-muted-foreground">
                    Target: {data.slaMetrics.reliability.targetErrorRate}%
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="business" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Business Impact</CardTitle>
                <CardDescription>Current business metrics and impact</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold">{data.business.usersAffected.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Users Affected</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">${data.business.revenueImpact.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Revenue Impact</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Customer Satisfaction</span>
                    <span>{data.business.customerSatisfaction}%</span>
                  </div>
                  <Progress value={data.business.customerSatisfaction} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Critical User Journeys</CardTitle>
                <CardDescription>Status of key customer workflows</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.business.criticalJourneys.map((journey) => (
                    <div key={journey.name} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <StatusIndicator status={journey.status} size="small" />
                        <span className="text-sm">{journey.name}</span>
                      </div>
                      <span className="text-sm font-medium">{journey.availability.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default EnterpriseMonitoringDashboard;