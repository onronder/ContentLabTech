/**
 * Metrics Chart Component
 * Displays performance metrics with interactive charts
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  Database, 
  Cpu,
  RefreshCw,
  Activity
} from 'lucide-react';

interface MetricsData {
  timestamp: string;
  current: {
    memory: any;
    performance: any;
    database: any;
    cache: any;
  };
  trends: {
    last5Minutes: any;
    last1Hour: any;
    last24Hours: any;
  };
  realtime: {
    activeRequests: number;
    averageRequestTime: number;
    longestRunningRequest?: {
      traceId: string;
      duration: number;
      endpoint: string;
    };
    requestsByEndpoint: Record<string, number>;
  };
  alerts: Array<{
    type: string;
    level: string;
    message: string;
    value: number;
    threshold: number;
  }>;
}

interface MetricsChartProps {
  refreshInterval?: number;
  className?: string;
}

export default function MetricsChart({ 
  refreshInterval = 30000, 
  className = '' 
}: MetricsChartProps) {
  const [metricsData, setMetricsData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [selectedTab, setSelectedTab] = useState('overview');

  const fetchMetricsData = async () => {
    try {
      const response = await fetch('/api/metrics?type=performance');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setMetricsData(data);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      console.error('Metrics fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetricsData();
    const interval = setInterval(fetchMetricsData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const prepareChartData = () => {
    if (!metricsData) return [];
    
    // Create sample time series data (in real app, this would come from metrics)
    const now = new Date();
    const data = [];
    
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60000); // 1 minute intervals
      data.push({
        time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        responseTime: Math.floor(Math.random() * 200) + 100,
        requests: Math.floor(Math.random() * 50) + 10,
        errors: Math.floor(Math.random() * 5),
        memory: Math.floor(Math.random() * 20) + 60,
      });
    }
    
    return data;
  };

  const prepareEndpointData = () => {
    if (!metricsData?.realtime.requestsByEndpoint) return [];
    
    return Object.entries(metricsData.realtime.requestsByEndpoint).map(([endpoint, count]) => ({
      endpoint: endpoint.split('/').pop() || endpoint,
      count,
    }));
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load metrics: {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!metricsData) {
    return null;
  }

  const chartData = prepareChartData();
  const endpointData = prepareEndpointData();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Performance Metrics
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchMetricsData}
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardTitle>
        <CardDescription>
          Last updated: {lastRefresh.toLocaleTimeString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">Active Requests</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {metricsData.realtime.activeRequests}
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Avg Response</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {metricsData.realtime.averageRequestTime.toFixed(0)}ms
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium">Memory Usage</span>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {metricsData.current.memory.percentage.toFixed(1)}%
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium">Error Rate</span>
                </div>
                <div className="text-2xl font-bold text-orange-600">
                  {metricsData.current.performance.errorRate.toFixed(2)}%
                </div>
              </div>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="responseTime" 
                    stroke="#8884d8" 
                    name="Response Time (ms)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="requests" 
                    stroke="#82ca9d" 
                    name="Requests"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="h-64">
                <h4 className="text-sm font-medium mb-2">Response Times</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="responseTime" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="h-64">
                <h4 className="text-sm font-medium mb-2">Memory Usage</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="memory" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Performance Statistics</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">P50 Response Time:</span>
                  <span className="ml-2 font-medium">
                    {metricsData.current.performance.p50ResponseTime.toFixed(0)}ms
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">P95 Response Time:</span>
                  <span className="ml-2 font-medium">
                    {metricsData.current.performance.p95ResponseTime.toFixed(0)}ms
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">P99 Response Time:</span>
                  <span className="ml-2 font-medium">
                    {metricsData.current.performance.p99ResponseTime.toFixed(0)}ms
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="endpoints" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="h-64">
                <h4 className="text-sm font-medium mb-2">Requests by Endpoint</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={endpointData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {endpointData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Active Endpoints</h4>
                <div className="space-y-2">
                  {endpointData.map((endpoint, index) => (
                    <div key={endpoint.endpoint} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">{endpoint.endpoint}</span>
                      <Badge variant="secondary">{endpoint.count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {metricsData.realtime.longestRunningRequest && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Longest Running Request</h4>
                <div className="text-sm">
                  <div>Endpoint: {metricsData.realtime.longestRunningRequest.endpoint}</div>
                  <div>Duration: {formatDuration(metricsData.realtime.longestRunningRequest.duration)}</div>
                  <div>Trace ID: {metricsData.realtime.longestRunningRequest.traceId}</div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            {metricsData.alerts.length > 0 ? (
              <div className="space-y-2">
                {metricsData.alerts.map((alert, index) => (
                  <Alert key={index} className={getAlertColor(alert.level)}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex items-center justify-between">
                        <span>{alert.message}</span>
                        <Badge variant="outline" className="ml-2">
                          {alert.level.toUpperCase()}
                        </Badge>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-8 h-8 mx-auto mb-2" />
                <p>No alerts at this time</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}