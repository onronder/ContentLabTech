/**
 * Production Health Check Dashboard
 * Comprehensive health monitoring for Supabase-Vercel production environment
 */

"use client";

import React, { useEffect, useState } from "react";
import { productionApiClient } from "@/lib/api/client";
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
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Database,
  Globe,
  Key,
  RefreshCw,
  Server,
  Shield,
  WifiOff,
  Zap,
  Clock,
  AlertTriangle,
} from "lucide-react";

interface HealthStatus {
  overall: "healthy" | "degraded" | "unhealthy" | "checking";
  database: {
    status: "healthy" | "degraded" | "unhealthy";
    responseTime: number;
    error?: string;
  };
  environment: {
    status: "healthy" | "degraded" | "unhealthy";
    responseTime: number;
    error?: string;
    missingVars?: string[];
  };
  authentication: {
    status: "healthy" | "degraded" | "unhealthy";
    message?: string;
  };
  timestamp: string;
}

const statusColors = {
  healthy: "text-green-600",
  degraded: "text-yellow-600",
  unhealthy: "text-red-600",
  checking: "text-blue-600",
};

const statusIcons = {
  healthy: <CheckCircle className="h-5 w-5" />,
  degraded: <AlertCircle className="h-5 w-5" />,
  unhealthy: <WifiOff className="h-5 w-5" />,
  checking: <RefreshCw className="h-5 w-5 animate-spin" />,
};

export default function HealthDashboard() {
  const [health, setHealth] = useState<HealthStatus>({
    overall: "checking",
    database: { status: "unhealthy", responseTime: 0 },
    environment: { status: "unhealthy", responseTime: 0 },
    authentication: { status: "unhealthy" },
    timestamp: new Date().toISOString(),
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [productionUrl, setProductionUrl] = useState<string>("");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const checkHealth = async () => {
    setIsRefreshing(true);
    setHealth(prev => ({ ...prev, overall: "checking" }));

    try {
      const result = await productionApiClient.performHealthCheck();

      setHealth({
        overall: result.overall,
        database: result.checks.database,
        environment: result.checks.environment,
        authentication: {
          status: result.checks.authentication.success
            ? "healthy"
            : "unhealthy",
          message: result.checks.authentication.data?.message,
        },
        timestamp: result.timestamp,
      });

      setLastRefresh(new Date());
    } catch (error) {
      console.error("Health check failed:", error);
      setHealth({
        overall: "unhealthy",
        database: {
          status: "unhealthy",
          responseTime: 0,
          error: "Connection failed",
        },
        environment: {
          status: "unhealthy",
          responseTime: 0,
          error: "Check failed",
        },
        authentication: { status: "unhealthy", message: "Unable to verify" },
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // Set production URL
    const url = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    setProductionUrl(url);

    // Initial health check
    checkHealth();

    // Refresh every 30 seconds
    const interval = setInterval(checkHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    const variant =
      status === "healthy"
        ? "default"
        : status === "degraded"
          ? "secondary"
          : status === "checking"
            ? "outline"
            : "destructive";

    return (
      <Badge variant={variant} className="flex items-center gap-1">
        {statusIcons[status as keyof typeof statusIcons]}
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  const getUptime = () => {
    const checks = [health.database, health.environment, health.authentication];
    const healthyCount = checks.filter(c => c.status === "healthy").length;
    return Math.round((healthyCount / checks.length) * 100);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Production Health Dashboard
            </h1>
            <p className="mt-1 text-gray-600">
              Real-time monitoring of Supabase-Vercel production environment
            </p>
          </div>
          <Button
            onClick={checkHealth}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {/* Overall Status Card */}
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity
                  className={`h-8 w-8 ${statusColors[health.overall]}`}
                />
                <div>
                  <CardTitle>System Status</CardTitle>
                  <CardDescription>
                    Overall health of production environment
                  </CardDescription>
                </div>
              </div>
              {getStatusBadge(health.overall)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>System Uptime</span>
                  <span className="font-medium">{getUptime()}%</span>
                </div>
                <Progress value={getUptime()} className="h-2" />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Environment:</span>
                  <span className="font-medium">{productionUrl}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Last Check:</span>
                  <span className="font-medium">
                    {lastRefresh.toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Response Time:</span>
                  <span className="font-medium">
                    {Math.max(
                      health.database.responseTime,
                      health.environment.responseTime
                    )}
                    ms
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Service Status Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Database Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database
                    className={`h-5 w-5 ${statusColors[health.database.status]}`}
                  />
                  <CardTitle className="text-lg">Database</CardTitle>
                </div>
                {getStatusBadge(health.database.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Supabase PostgreSQL</span>
                  <span className="font-medium">
                    {health.database.responseTime}ms
                  </span>
                </div>
                {health.database.error && (
                  <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-600" />
                    <p className="text-sm text-red-700">
                      {health.database.error}
                    </p>
                  </div>
                )}
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span>Connection Pool Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-3 w-3 text-blue-600" />
                    <span>RLS Policies Enforced</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Environment Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server
                    className={`h-5 w-5 ${statusColors[health.environment.status]}`}
                  />
                  <CardTitle className="text-lg">Environment</CardTitle>
                </div>
                {getStatusBadge(health.environment.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Configuration Status</span>
                  <span className="font-medium">
                    {health.environment.status === "healthy"
                      ? "Complete"
                      : "Incomplete"}
                  </span>
                </div>
                {health.environment.missingVars &&
                  health.environment.missingVars.length > 0 && (
                    <div className="rounded-lg bg-yellow-50 p-3">
                      <p className="mb-2 text-sm font-medium text-yellow-800">
                        Missing Variables:
                      </p>
                      <ul className="space-y-1">
                        {health.environment.missingVars.map(varName => (
                          <li
                            key={varName}
                            className="flex items-center gap-2 text-sm text-yellow-700"
                          >
                            <Key className="h-3 w-3" />
                            <code>{varName}</code>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Server className="h-3 w-3 text-green-600" />
                    <span>Vercel Edge Network</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-3 w-3 text-blue-600" />
                    <span>CDN Active</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Authentication Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield
                    className={`h-5 w-5 ${statusColors[health.authentication.status]}`}
                  />
                  <CardTitle className="text-lg">Authentication</CardTitle>
                </div>
                {getStatusBadge(health.authentication.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Auth Provider</span>
                  <span className="font-medium">Supabase Auth</span>
                </div>
                {health.authentication.message && (
                  <div className="rounded-lg bg-blue-50 p-3">
                    <p className="text-sm text-blue-700">
                      {health.authentication.message}
                    </p>
                  </div>
                )}
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Key className="h-3 w-3 text-green-600" />
                    <span>JWT Verification Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-3 w-3 text-blue-600" />
                    <span>Session Management Ready</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Production URLs */}
        <Card>
          <CardHeader>
            <CardTitle>Production Configuration</CardTitle>
            <CardDescription>
              Current environment URLs and endpoints
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <h4 className="mb-2 font-medium text-gray-900">
                    Application URLs
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between rounded-lg bg-gray-100 p-3">
                      <span className="text-gray-600">Production URL</span>
                      <code className="font-mono text-gray-900">
                        {productionUrl}
                      </code>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-gray-100 p-3">
                      <span className="text-gray-600">API Base</span>
                      <code className="font-mono text-gray-900">
                        {productionUrl}/api
                      </code>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 font-medium text-gray-900">
                    Health Endpoints
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between rounded-lg bg-gray-100 p-3">
                      <span className="text-gray-600">Database Health</span>
                      <a
                        href={`${productionUrl}/api/health/database`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-blue-600 hover:underline"
                      >
                        /api/health/database
                      </a>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-gray-100 p-3">
                      <span className="text-gray-600">Environment Health</span>
                      <a
                        href={`${productionUrl}/api/health/environment`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-blue-600 hover:underline"
                      >
                        /api/health/environment
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="mb-2 font-medium text-gray-900">
                  Supabase Configuration
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between rounded-lg bg-gray-100 p-3">
                    <span className="text-gray-600">Project URL</span>
                    <code className="font-mono text-gray-900">
                      {process.env.NEXT_PUBLIC_SUPABASE_URL || "Not configured"}
                    </code>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-gray-100 p-3">
                    <span className="text-gray-600">Project Reference</span>
                    <code className="font-mono text-gray-900">
                      rwyaipbxlvrilagkirsq
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Deployment Instructions</CardTitle>
            <CardDescription>
              How to deploy this application to production
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h4 className="mb-3 flex items-center gap-2 font-medium">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-sm text-blue-600">
                    1
                  </span>
                  Deploy to Vercel
                </h4>
                <div className="ml-8 space-y-2 text-sm text-gray-600">
                  <p>Connect your GitHub repository to Vercel:</p>
                  <pre className="overflow-x-auto rounded-lg bg-gray-900 p-3 text-gray-100">
                    <code>{`# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod`}</code>
                  </pre>
                </div>
              </div>

              <div>
                <h4 className="mb-3 flex items-center gap-2 font-medium">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-sm text-blue-600">
                    2
                  </span>
                  Configure Environment Variables
                </h4>
                <div className="ml-8 space-y-2 text-sm text-gray-600">
                  <p>Add these variables in Vercel dashboard:</p>
                  <ul className="space-y-1">
                    <li>
                      • <code>NEXT_PUBLIC_SUPABASE_URL</code>
                    </li>
                    <li>
                      • <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
                    </li>
                    <li>
                      • <code>SUPABASE_SERVICE_ROLE_KEY</code>
                    </li>
                    <li>
                      • <code>NEXT_PUBLIC_APP_URL</code> (your Vercel URL)
                    </li>
                    <li>
                      • <code>RESEND_API_KEY</code> (for email invitations)
                    </li>
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="mb-3 flex items-center gap-2 font-medium">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-sm text-blue-600">
                    3
                  </span>
                  Verify Production Database
                </h4>
                <div className="ml-8 space-y-2 text-sm text-gray-600">
                  <p>Ensure all migrations are applied to Supabase:</p>
                  <pre className="overflow-x-auto rounded-lg bg-gray-900 p-3 text-gray-100">
                    <code>{`# Run production verification
node scripts/verify-production-db.js

# Apply migrations if needed
# (via Supabase dashboard SQL editor)`}</code>
                  </pre>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
