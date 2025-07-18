"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useCompetitiveDashboard } from "@/hooks/useCompetitiveDashboard";
import { CompetitiveErrorBoundary } from "./CompetitiveErrorBoundary";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { WebSocketStatus } from "./WebSocketStatus";
import { RealTimeUpdates } from "./RealTimeUpdates";
import { WebSocketTester } from "./WebSocketTester";
import { AddCompetitorModal } from "./AddCompetitorModal";
import { CreateAlertModal } from "./CreateAlertModal";
import { RunAnalysisModal } from "./RunAnalysisModal";
import { useAuth } from "@/lib/auth/context";

interface CompetitiveDashboardProps {
  projectId: string;
}

function CompetitiveDashboardContent({ projectId }: CompetitiveDashboardProps) {
  const { competitors, alerts, analysis, loading, error, refresh } =
    useCompetitiveDashboard(projectId);
  const { currentTeam } = useAuth();

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
        <Button onClick={refresh} variant="destructive" className="shadow-lg">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="bg-gradient-primary bg-clip-text text-3xl font-bold text-transparent">
            Competitive Intelligence
          </h1>
          <WebSocketStatus projectId={projectId} className="mt-2" />
        </div>
        <Button onClick={refresh} variant="default" className="shadow-lg">
          Refresh
        </Button>
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
            <Card className="border-l-primary-500 border-l-4">
              <CardHeader>
                <CardTitle className="text-primary-700">
                  Total Competitors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-primary-600 text-3xl font-bold">
                  {competitors.length}
                </div>
                <div className="text-success mt-1 text-sm font-medium">
                  Active tracking
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-warning-500 border-l-4">
              <CardHeader>
                <CardTitle className="text-warning-700">
                  Active Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-warning-600 text-3xl font-bold">
                  {alerts.length}
                </div>
                <div className="text-warning mt-1 text-sm font-medium">
                  Monitoring
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-info-500 border-l-4">
              <CardHeader>
                <CardTitle className="text-info-700">Recent Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-info-600 text-3xl font-bold">
                  {analysis.length}
                </div>
                <div className="text-info mt-1 text-sm font-medium">
                  Completed
                </div>
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
                  <AddCompetitorModal
                    onCompetitorAdded={refresh}
                    teamId={currentTeam?.id || ""}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <AddCompetitorModal
                      onCompetitorAdded={refresh}
                      teamId={currentTeam?.id || ""}
                    />
                  </div>
                  <div className="space-y-4">
                    {competitors.map(competitor => (
                      <div
                        key={competitor.id}
                        className="border-primary/20 to-primary-50/30 rounded-lg border bg-gradient-to-r from-white p-4 transition-all duration-200 hover:shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="text-primary-800 font-semibold">
                            {competitor.name}
                          </h3>
                          <span className="bg-success inline-flex items-center rounded-full px-2 py-1 text-xs font-medium text-white">
                            Active
                          </span>
                        </div>
                        <p className="text-primary-600 mt-1">
                          {competitor.url}
                        </p>
                        <p className="mt-1 text-sm text-neutral-600">
                          {competitor.industry}
                        </p>
                      </div>
                    ))}
                  </div>
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
                  <CreateAlertModal
                    onAlertCreated={refresh}
                    teamId={currentTeam?.id || ""}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <CreateAlertModal
                      onAlertCreated={refresh}
                      teamId={currentTeam?.id || ""}
                    />
                  </div>
                  <div className="space-y-4">
                    {alerts.map(alert => (
                      <div
                        key={alert.id}
                        className="border-warning/20 to-warning-50/30 rounded-lg border bg-gradient-to-r from-white p-4 transition-all duration-200 hover:shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="text-warning-800 font-semibold">
                            {alert.alert_type}
                          </h3>
                          <span className="bg-warning inline-flex items-center rounded-full px-2 py-1 text-xs font-medium text-white">
                            Monitoring
                          </span>
                        </div>
                        <p className="text-warning-600 mt-1">
                          Threshold: {alert.threshold}%
                        </p>
                        <p className="mt-1 text-sm text-neutral-600">
                          Frequency: {alert.frequency}
                        </p>
                      </div>
                    ))}
                  </div>
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
                  <RunAnalysisModal
                    onAnalysisStarted={refresh}
                    teamId={currentTeam?.id || ""}
                    projectId={projectId}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <RunAnalysisModal
                      onAnalysisStarted={refresh}
                      teamId={currentTeam?.id || ""}
                      projectId={projectId}
                    />
                  </div>
                  <div className="space-y-4">
                    {analysis.map((result, index) => (
                      <div
                        key={index}
                        className="border-info/20 to-info-50/30 rounded-lg border bg-gradient-to-r from-white p-4 transition-all duration-200 hover:shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="text-info-800 font-semibold">
                            Analysis #{index + 1}
                          </h3>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                              result.status === "completed"
                                ? "bg-success text-white"
                                : result.status === "pending"
                                  ? "bg-warning text-white"
                                  : result.status === "failed"
                                    ? "bg-error text-white"
                                    : "bg-info text-white"
                            }`}
                          >
                            {result.status}
                          </span>
                        </div>
                        <p className="text-info-600 mt-1">
                          Status: {result.status}
                        </p>
                        <p className="mt-1 text-sm text-neutral-600">
                          Created:{" "}
                          {new Date(result.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
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
