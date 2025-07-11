/**
 * Errors Widget Component
 * Displays error tracking information and metrics
 */

"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetch } from "@/lib/utils/fetch";
import {
  AlertTriangle,
  Bug,
  CheckCircle,
  Clock,
  Search,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  XCircle,
} from "lucide-react";

interface TrackedError {
  id: string;
  fingerprint: {
    hash: string;
    type: string;
    message: string;
    location?: string;
  };
  occurrences: number;
  firstSeen: string;
  lastSeen: string;
  resolved: boolean;
  severity: "low" | "medium" | "high" | "critical";
  category: string;
  tags: string[];
  context: {
    endpoint?: string;
    userId?: string;
    environment: string;
  };
}

interface ErrorMetrics {
  totalErrors: number;
  uniqueErrors: number;
  errorRate: number;
  topErrors: TrackedError[];
  errorsByCategory: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  recentErrors: TrackedError[];
}

interface ErrorsWidgetProps {
  refreshInterval?: number;
  className?: string;
}

export default function ErrorsWidget({
  refreshInterval = 60000,
  className = "",
}: ErrorsWidgetProps) {
  const [errors, setErrors] = useState<TrackedError[]>([]);
  const [metrics, setMetrics] = useState<ErrorMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [selectedTab, setSelectedTab] = useState("recent");
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");

  const fetchErrorData = async () => {
    try {
      const response = await fetch("/api/logs?type=errors");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setErrors(data.errors || []);
      setMetrics(data.metrics || null);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch error data"
      );
      console.error("Error fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const resolveError = async (errorId: string) => {
    try {
      const response = await fetch("/api/logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "resolve-error",
          data: { errorId, resolvedBy: "user" },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to resolve error: ${response.statusText}`);
      }

      // Refresh data after resolving
      await fetchErrorData();
    } catch (err) {
      console.error("Failed to resolve error:", err);
    }
  };

  useEffect(() => {
    fetchErrorData();
    const interval = setInterval(fetchErrorData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "high":
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case "medium":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "low":
        return <Bug className="h-4 w-4 text-blue-500" />;
      default:
        return <Bug className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return "Just now";
  };

  const filteredErrors = errors.filter(error => {
    const matchesSearch =
      !searchTerm ||
      error.fingerprint.message
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      error.fingerprint.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      error.tags.some(tag =>
        tag.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesSeverity =
      severityFilter === "all" || error.severity === severityFilter;

    return matchesSearch && matchesSeverity;
  });

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Error Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-40 items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-500" />
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
            <Bug className="h-5 w-5" />
            Error Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load error data: {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Error Tracking
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchErrorData}
            disabled={loading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </CardTitle>
        <CardDescription>
          Last updated: {lastRefresh.toLocaleTimeString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="recent">Recent</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="top">Top Errors</TabsTrigger>
          </TabsList>

          <TabsContent value="recent" className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute top-2.5 left-2 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search errors..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="max-h-96 space-y-2 overflow-y-auto">
              {filteredErrors.length > 0 ? (
                filteredErrors.map(error => (
                  <div
                    key={error.id}
                    className="space-y-2 rounded-lg border p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(error.severity)}
                          <span className="text-sm font-medium">
                            {error.fingerprint.type}
                          </span>
                          <Badge
                            className={getSeverityColor(error.severity)}
                            variant="outline"
                          >
                            {error.severity.toUpperCase()}
                          </Badge>
                          {error.resolved && (
                            <Badge
                              variant="outline"
                              className="bg-green-100 text-green-800"
                            >
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Resolved
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 truncate text-sm text-gray-600">
                          {error.fingerprint.message}
                        </p>
                        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                          <span>
                            <Clock className="mr-1 inline h-3 w-3" />
                            {formatTimeAgo(error.lastSeen)}
                          </span>
                          <span>{error.occurrences} occurrences</span>
                          {error.fingerprint.location && (
                            <span>{error.fingerprint.location}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!error.resolved && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resolveError(error.id)}
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {error.tags.map(tag => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-gray-500">
                  <Bug className="mx-auto mb-2 h-8 w-8" />
                  <p>No errors found</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4">
            {metrics && (
              <>
                <div className="grid grid-cols-4 gap-4">
                  <div className="rounded-lg bg-red-50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium">Total Errors</span>
                    </div>
                    <div className="text-2xl font-bold text-red-600">
                      {metrics.totalErrors}
                    </div>
                  </div>

                  <div className="rounded-lg bg-orange-50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Bug className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium">Unique Errors</span>
                    </div>
                    <div className="text-2xl font-bold text-orange-600">
                      {metrics.uniqueErrors}
                    </div>
                  </div>

                  <div className="rounded-lg bg-yellow-50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium">Error Rate</span>
                    </div>
                    <div className="text-2xl font-bold text-yellow-600">
                      {metrics.errorRate.toFixed(2)}%
                    </div>
                  </div>

                  <div className="rounded-lg bg-blue-50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Recent</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {metrics.recentErrors.length}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="mb-2 text-sm font-medium">By Severity</h4>
                    <div className="space-y-2">
                      {Object.entries(metrics.errorsBySeverity).map(
                        ([severity, count]) => (
                          <div
                            key={severity}
                            className="flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center gap-2">
                              {getSeverityIcon(severity)}
                              <span className="capitalize">{severity}</span>
                            </div>
                            <Badge variant="outline">{count}</Badge>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="mb-2 text-sm font-medium">By Category</h4>
                    <div className="space-y-2">
                      {Object.entries(metrics.errorsByCategory).map(
                        ([category, count]) => (
                          <div
                            key={category}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="capitalize">{category}</span>
                            <Badge variant="outline">{count}</Badge>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="top" className="space-y-4">
            <div className="space-y-2">
              {metrics?.topErrors && metrics.topErrors.length > 0 ? (
                metrics.topErrors.map((error, index) => (
                  <div key={error.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-400">
                            #{index + 1}
                          </span>
                          {getSeverityIcon(error.severity)}
                          <span className="text-sm font-medium">
                            {error.fingerprint.type}
                          </span>
                          <Badge
                            className={getSeverityColor(error.severity)}
                            variant="outline"
                          >
                            {error.severity.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="mt-1 truncate text-sm text-gray-600">
                          {error.fingerprint.message}
                        </p>
                        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                          <span>
                            <TrendingUp className="mr-1 inline h-3 w-3" />
                            {error.occurrences} occurrences
                          </span>
                          <span>
                            <Clock className="mr-1 inline h-3 w-3" />
                            {formatTimeAgo(error.lastSeen)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-red-600">
                          {error.occurrences}
                        </div>
                        <div className="text-xs text-gray-500">occurrences</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-gray-500">
                  <CheckCircle className="mx-auto mb-2 h-8 w-8" />
                  <p>No top errors to display</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
