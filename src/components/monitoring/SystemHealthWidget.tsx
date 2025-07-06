/**
 * System Health Widget
 * Displays overall system health status with key metrics
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Database, 
  Cpu, 
  Memory,
  Activity,
  RefreshCw
} from 'lucide-react';

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  message?: string;
  lastCheck?: string;
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: ServiceStatus[];
  uptime: number;
  timestamp: string;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  performance: {
    averageResponseTime: number;
    p95ResponseTime: number;
    errorRate: number;
  };
}

interface SystemHealthWidgetProps {
  refreshInterval?: number;
  className?: string;
}

export default function SystemHealthWidget({ 
  refreshInterval = 30000, 
  className = '' 
}: SystemHealthWidgetProps) {
  const [healthData, setHealthData] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchHealthData = async () => {
    try {
      const response = await fetch('/api/health/detailed');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setHealthData(data);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health data');
      console.error('Health check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
    const interval = setInterval(fetchHealthData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'unhealthy':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
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
            <Activity className="w-5 h-5" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load health data: {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!healthData) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            System Health
          </div>
          <Badge className={getStatusColor(healthData.overall)}>
            {healthData.overall.toUpperCase()}
          </Badge>
        </CardTitle>
        <CardDescription>
          Last updated: {lastRefresh.toLocaleTimeString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status */}
        <div className="flex items-center gap-3">
          {getStatusIcon(healthData.overall)}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Status</span>
              <span className="text-sm text-gray-500">
                Uptime: {formatUptime(healthData.uptime)}
              </span>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Memory className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">Memory Usage</span>
            </div>
            <Progress value={healthData.memory.percentage} className="h-2" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{formatBytes(healthData.memory.used)}</span>
              <span>{healthData.memory.percentage.toFixed(1)}%</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">Response Time</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {healthData.performance.averageResponseTime.toFixed(0)}ms
            </div>
            <div className="text-xs text-gray-500">
              P95: {healthData.performance.p95ResponseTime.toFixed(0)}ms
            </div>
          </div>
        </div>

        {/* Error Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium">Error Rate</span>
            </div>
            <span className="text-sm font-bold text-red-600">
              {healthData.performance.errorRate.toFixed(2)}%
            </span>
          </div>
          <Progress value={healthData.performance.errorRate} className="h-2" />
        </div>

        {/* Services Status */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Services</h4>
          <div className="grid grid-cols-2 gap-2">
            {healthData.services.map((service) => (
              <div key={service.name} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                {getStatusIcon(service.status)}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{service.name}</div>
                  <div className="text-xs text-gray-500">
                    {service.responseTime.toFixed(0)}ms
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}