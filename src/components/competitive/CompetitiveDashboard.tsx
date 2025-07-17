"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCompetitiveDashboard } from "@/hooks/useCompetitiveDashboard";
import { CompetitiveErrorBoundary } from "./CompetitiveErrorBoundary";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { WebSocketStatus } from "./WebSocketStatus";
import { RealTimeUpdates } from "./RealTimeUpdates";
import { WebSocketTester } from "./WebSocketTester";

interface CompetitiveDashboardProps {
  projectId: string;
}

function CompetitiveDashboardContent({ projectId }: CompetitiveDashboardProps) {
  const { competitors, alerts, analysis, loading, error, refresh } =
    useCompetitiveDashboard(projectId);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
        <span className="ml-2">Loading competitive intelligence...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="mb-4 text-red-600">{error}</div>
        <button
          onClick={refresh}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Competitive Intelligence</h1>
          <WebSocketStatus projectId={projectId} className="mt-2" />
        </div>
        <button
          onClick={refresh}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="competitors">Competitors</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="realtime">Real-time</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Total Competitors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{competitors.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{alerts.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analysis.length}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="competitors">
          <Card>
            <CardHeader>
              <CardTitle>Competitor Management</CardTitle>
            </CardHeader>
            <CardContent>
              {competitors.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="mb-4 text-gray-500">No competitors added yet</p>
                  <button className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                    Add Competitor
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {competitors.map(competitor => (
                    <div key={competitor.id} className="rounded border p-4">
                      <h3 className="font-semibold">{competitor.name}</h3>
                      <p className="text-gray-600">{competitor.url}</p>
                      <p className="text-sm text-gray-500">
                        {competitor.industry}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Alert Management</CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="mb-4 text-gray-500">No alerts configured</p>
                  <button className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                    Create Alert
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map(alert => (
                    <div key={alert.id} className="rounded border p-4">
                      <h3 className="font-semibold">{alert.alert_type}</h3>
                      <p className="text-gray-600">
                        Threshold: {alert.threshold}%
                      </p>
                      <p className="text-sm text-gray-500">
                        Frequency: {alert.frequency}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis">
          <Card>
            <CardHeader>
              <CardTitle>Analysis Results</CardTitle>
            </CardHeader>
            <CardContent>
              {analysis.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="mb-4 text-gray-500">
                    No analysis results available
                  </p>
                  <button className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                    Run Analysis
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {analysis.map((result, index) => (
                    <div key={index} className="rounded border p-4">
                      <h3 className="font-semibold">Analysis #{index + 1}</h3>
                      <p className="text-gray-600">Status: {result.status}</p>
                      <p className="text-sm text-gray-500">
                        Created:{" "}
                        {new Date(result.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="realtime">
          <div className="space-y-6">
            <RealTimeUpdates projectId={projectId} />
            {process.env.NODE_ENV === "development" && (
              <WebSocketTester projectId={projectId} />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function CompetitiveDashboard({ projectId }: CompetitiveDashboardProps) {
  return (
    <CompetitiveErrorBoundary>
      <CompetitiveDashboardContent projectId={projectId} />
    </CompetitiveErrorBoundary>
  );
}
