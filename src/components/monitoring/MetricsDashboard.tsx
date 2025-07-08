/**
 * Comprehensive Metrics Dashboard
 * Real-time visualization of error tracking and success metrics
 */

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  TrendingUp,
  TrendingDown,
  Activity,
  MousePointer,
  Eye,
  Zap,
  Target,
  Download,
  RefreshCw,
  Filter,
  Calendar,
  BarChart3,
  PieChart,
  LineChart,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Import our monitoring systems
import { useErrorTracking, type ErrorDetails, type ErrorAggregation } from "@/lib/monitoring/error-tracking";
import { useSuccessMetrics, type SuccessMetricsData, type ConversionFunnel } from "@/lib/monitoring/success-metrics";

interface MetricCard {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  status?: 'good' | 'warning' | 'critical';
  description?: string;
}

interface ChartDataPoint {
  timestamp: number;
  value: number;
  label?: string;
}

const MetricsDashboard: React.FC = () => {
  const { errors, aggregation, markResolved, exportData, clearErrors } = useErrorTracking();
  const { metrics, defineFunnel } = useSuccessMetrics();
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Initialize conversion funnels
  useEffect(() => {
    defineFunnel({
      id: 'project-creation',
      name: 'Project Creation Flow',
      steps: [
        {
          id: 'open-modal',
          name: 'Open Create Project Modal',
          condition: (action) => action.component === 'CreateProjectModal' && action.type === 'click',
          required: true,
        },
        {
          id: 'fill-basic-info',
          name: 'Fill Basic Information',
          condition: (action) => action.type === 'form_submit' && action.element?.includes('basic-info'),
          required: true,
        },
        {
          id: 'complete-strategy',
          name: 'Complete Strategy Step',
          condition: (action) => action.type === 'form_submit' && action.element?.includes('strategy'),
          required: true,
        },
        {
          id: 'submit-project',
          name: 'Submit Project',
          condition: (action) => action.type === 'form_submit' && action.component === 'CreateProjectModal',
          required: true,
        },
      ],
    });

    defineFunnel({
      id: 'user-onboarding',
      name: 'User Onboarding Flow',
      steps: [
        {
          id: 'sign-up',
          name: 'Sign Up',
          condition: (action) => action.type === 'form_submit' && action.element?.includes('signup'),
          required: true,
        },
        {
          id: 'verify-email',
          name: 'Verify Email',
          condition: (action) => action.type === 'click' && action.element?.includes('verify'),
          required: true,
        },
        {
          id: 'complete-profile',
          name: 'Complete Profile',
          condition: (action) => action.type === 'form_submit' && action.element?.includes('profile'),
          required: true,
        },
        {
          id: 'first-project',
          name: 'Create First Project',
          condition: (action) => action.component === 'CreateProjectModal' && action.type === 'form_submit',
          required: true,
        },
      ],
    });
  }, [defineFunnel]);

  // Calculate key metrics
  const keyMetrics = useMemo((): MetricCard[] => {
    if (!aggregation || !metrics) return [];

    const criticalErrors = errors.filter(e => e.severity === 'critical').length;
    const errorRate = aggregation.totalErrors > 0 ? 
      (aggregation.totalErrors / (aggregation.totalErrors + metrics.engagement.interactions)) * 100 : 0;

    return [
      {
        title: "Total Errors",
        value: aggregation.totalErrors,
        change: -12, // Would calculate from historical data
        icon: <AlertTriangle className="h-4 w-4" />,
        status: criticalErrors > 0 ? 'critical' : aggregation.totalErrors > 10 ? 'warning' : 'good',
        description: `${aggregation.resolvedErrors} resolved`
      },
      {
        title: "Error Rate",
        value: `${errorRate.toFixed(2)}%`,
        change: -8,
        icon: <TrendingDown className="h-4 w-4" />,
        status: errorRate > 5 ? 'critical' : errorRate > 2 ? 'warning' : 'good',
        description: "Errors per interaction"
      },
      {
        title: "Session Duration",
        value: `${Math.round(metrics.engagement.sessionDuration / 1000 / 60)}m`,
        change: 15,
        icon: <Clock className="h-4 w-4" />,
        status: 'good',
        description: "Average time on site"
      },
      {
        title: "Page Views",
        value: metrics.engagement.pageViews,
        change: 23,
        icon: <Eye className="h-4 w-4" />,
        status: 'good',
        description: "Pages per session"
      },
      {
        title: "Interactions",
        value: metrics.engagement.interactions,
        change: 18,
        icon: <MousePointer className="h-4 w-4" />,
        status: 'good',
        description: "User interactions"
      },
      {
        title: "Scroll Depth",
        value: `${metrics.engagement.scrollDepth}%`,
        change: 5,
        icon: <Activity className="h-4 w-4" />,
        status: metrics.engagement.scrollDepth > 50 ? 'good' : 'warning',
        description: "Maximum scroll reached"
      },
    ];
  }, [aggregation, metrics, errors]);

  // Performance metrics
  const performanceMetrics = useMemo(() => {
    if (!metrics) return [];

    return [
      {
        name: "Load Time",
        value: `${(metrics.performance.loadTime / 1000).toFixed(2)}s`,
        target: "< 3s",
        status: metrics.performance.loadTime < 3000 ? 'good' : 'warning',
      },
      {
        name: "First Contentful Paint",
        value: `${(metrics.performance.firstContentfulPaint / 1000).toFixed(2)}s`,
        target: "< 1.8s",
        status: metrics.performance.firstContentfulPaint < 1800 ? 'good' : 'warning',
      },
      {
        name: "Time to Interactive",
        value: `${(metrics.performance.timeToInteractive / 1000).toFixed(2)}s`,
        target: "< 3.8s",
        status: metrics.performance.timeToInteractive < 3800 ? 'good' : 'warning',
      },
      {
        name: "First Input Delay",
        value: `${metrics.performance.firstInputDelay.toFixed(0)}ms`,
        target: "< 100ms",
        status: metrics.performance.firstInputDelay < 100 ? 'good' : 'warning',
      },
    ];
  }, [metrics]);

  // Get status colors
  const getStatusColor = (status: 'good' | 'warning' | 'critical') => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Error severity distribution
  const errorSeverityData = useMemo(() => {
    if (!aggregation) return [];
    
    return Object.entries(aggregation.errorsBySeverity).map(([severity, count]) => ({
      name: severity,
      value: count,
      color: {
        critical: '#ef4444',
        high: '#f97316',
        medium: '#eab308',
        low: '#22c55e',
      }[severity] || '#6b7280',
    }));
  }, [aggregation]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Metrics Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time monitoring of errors, performance, and user engagement
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={cn(autoRefresh && "bg-green-50 border-green-200")}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", autoRefresh && "animate-spin")} />
              Auto Refresh
            </Button>
            
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value as any)}
              className="px-3 py-1 border rounded-md text-sm"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>

          <Button variant="outline" size="sm" onClick={() => {
            const data = exportData();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `metrics-${Date.now()}.json`;
            a.click();
          }}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {keyMetrics.map((metric, index) => (
          <Card key={index} className={cn("border", metric.status && getStatusColor(metric.status))}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {metric.icon}
                  <span className="text-sm font-medium">{metric.title}</span>
                </div>
                {metric.change && (
                  <Badge variant={metric.change > 0 ? "default" : "secondary"} className="text-xs">
                    {metric.change > 0 ? "+" : ""}{metric.change}%
                  </Badge>
                )}
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold">{metric.value}</div>
                {metric.description && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {metric.description}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="errors">Error Tracking</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="engagement">User Engagement</TabsTrigger>
          <TabsTrigger value="conversions">Conversions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Error Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Error Overview</span>
                </CardTitle>
                <CardDescription>
                  Real-time error monitoring and trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                {aggregation && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {aggregation.totalErrors}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Errors</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {aggregation.resolvedErrors}
                        </div>
                        <div className="text-sm text-muted-foreground">Resolved</div>
                      </div>
                    </div>

                    {/* Error Severity Distribution */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Error Severity</h4>
                      {errorSeverityData.map((item) => (
                        <div key={item.name} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-sm capitalize">{item.name}</span>
                          </div>
                          <Badge variant="outline">{item.value}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5" />
                  <span>Performance Overview</span>
                </CardTitle>
                <CardDescription>
                  Core Web Vitals and loading metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceMetrics.map((metric, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{metric.name}</div>
                        <div className="text-xs text-muted-foreground">Target: {metric.target}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold">{metric.value}</div>
                        <Badge 
                          variant={metric.status === 'good' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {metric.status === 'good' ? 'Good' : 'Needs Improvement'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Error Tracking Tab */}
        <TabsContent value="errors" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Error Details</h2>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="destructive" size="sm" onClick={clearErrors}>
                Clear All
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {errors.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Errors Detected</h3>
                  <p className="text-muted-foreground">
                    Your application is running smoothly with no active errors.
                  </p>
                </CardContent>
              </Card>
            ) : (
              errors.map((error) => (
                <Card key={error.id} className="border-l-4 border-l-red-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant={
                            error.severity === 'critical' ? 'destructive' :
                            error.severity === 'high' ? 'destructive' :
                            error.severity === 'medium' ? 'secondary' : 'outline'
                          }>
                            {error.severity}
                          </Badge>
                          <Badge variant="outline">{error.type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {error.count} occurrence{error.count !== 1 ? 's' : ''}
                          </span>
                        </div>
                        
                        <h4 className="font-semibold mb-2">{error.message}</h4>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium">Component:</span>
                            <div>{error.context.component || 'Unknown'}</div>
                          </div>
                          <div>
                            <span className="font-medium">First Seen:</span>
                            <div>{new Date(error.firstOccurrence).toLocaleString()}</div>
                          </div>
                          <div>
                            <span className="font-medium">Last Seen:</span>
                            <div>{new Date(error.lastOccurrence).toLocaleString()}</div>
                          </div>
                          <div>
                            <span className="font-medium">Recovery Attempts:</span>
                            <div>{error.recoveryAttempts}</div>
                          </div>
                        </div>
                        
                        {error.stack && (
                          <details className="mt-3">
                            <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                              Stack Trace
                            </summary>
                            <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-x-auto">
                              {error.stack}
                            </pre>
                          </details>
                        )}
                      </div>
                      
                      <div className="flex flex-col space-y-2 ml-4">
                        {!error.resolved && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markResolved(error.id)}
                          >
                            Mark Resolved
                          </Button>
                        )}
                        {error.resolved && (
                          <Badge variant="default" className="text-center">
                            Resolved
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Core Web Vitals</CardTitle>
                <CardDescription>
                  Key performance metrics for user experience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {performanceMetrics.map((metric, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">{metric.name}</span>
                      <span className="text-sm">{metric.value}</span>
                    </div>
                    <Progress 
                      value={metric.status === 'good' ? 90 : 45} 
                      className={cn(
                        "h-2",
                        metric.status === 'good' ? "bg-green-100" : "bg-red-100"
                      )}
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      Target: {metric.target}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resource Loading</CardTitle>
                <CardDescription>
                  Network and resource performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center text-muted-foreground py-8">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                  <p>Resource timing chart would be displayed here</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* User Engagement Tab */}
        <TabsContent value="engagement" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Session Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                {metrics && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold">
                        {Math.round(metrics.engagement.sessionDuration / 1000 / 60)}
                      </div>
                      <div className="text-sm text-muted-foreground">Minutes on Site</div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Page Views</span>
                        <span className="font-medium">{metrics.engagement.pageViews}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Interactions</span>
                        <span className="font-medium">{metrics.engagement.interactions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Scroll Depth</span>
                        <span className="font-medium">{metrics.engagement.scrollDepth}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Behavior</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center text-muted-foreground py-8">
                  <PieChart className="h-12 w-12 mx-auto mb-4" />
                  <p>User behavior analytics would be displayed here</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Heatmap</CardTitle>
                <CardDescription>Click and interaction patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center text-muted-foreground py-8">
                  <MousePointer className="h-12 w-12 mx-auto mb-4" />
                  <p>Interaction heatmap would be displayed here</p>
                  {metrics && (
                    <div className="mt-4 text-sm">
                      <p>{metrics.heatmapData.length} interaction points tracked</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Conversions Tab */}
        <TabsContent value="conversions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Conversion Funnels</span>
                </CardTitle>
                <CardDescription>
                  Track user progress through key workflows
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metrics && (
                  <div className="space-y-4">
                    {Object.entries(metrics.conversions.conversionRates).map(([funnelId, rate]) => (
                      <div key={funnelId}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium capitalize">
                            {funnelId.replace('-', ' ')}
                          </span>
                          <span className="text-sm font-semibold">{rate.toFixed(1)}%</span>
                        </div>
                        <Progress value={rate} className="h-2" />
                      </div>
                    ))}
                    
                    {Object.keys(metrics.conversions.conversionRates).length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        <Target className="h-12 w-12 mx-auto mb-4" />
                        <p>No conversion data available yet</p>
                        <p className="text-sm">Complete some user actions to see funnel progress</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Conversion Trends</CardTitle>
                <CardDescription>
                  Historical conversion performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center text-muted-foreground py-8">
                  <LineChart className="h-12 w-12 mx-auto mb-4" />
                  <p>Conversion trend chart would be displayed here</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MetricsDashboard;