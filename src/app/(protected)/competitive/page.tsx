/**
 * Competitive Intelligence Dashboard Page
 * Executive-level competitive intelligence interface
 */

import { Suspense } from "react";
import { CompetitiveExecutiveDashboard } from "@/components/competitive/CompetitiveExecutiveDashboard";
import { CompetitiveAnalyticsCharts } from "@/components/competitive/CompetitiveAnalyticsCharts";
import { CompetitorManagement } from "@/components/competitive/CompetitorManagement";
import { CompetitiveMonitoringDashboard } from "@/components/competitive/CompetitiveMonitoringDashboard";
import { CompetitiveErrorBoundary } from "@/components/competitive/CompetitiveErrorBoundary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

// Loading component for suspense boundaries
const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="space-y-2">
      <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
      <div className="h-4 w-96 animate-pulse rounded bg-gray-200" />
    </div>
    <div className="grid gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-2">
              <div className="h-4 w-2/3 rounded bg-gray-200" />
              <div className="h-8 w-1/2 rounded bg-gray-200" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export default function CompetitivePage() {
  // TODO: Get projectId from user context/route params
  const projectId = "default-project";

  return (
    <CompetitiveErrorBoundary>
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<DashboardSkeleton />}>
          <Tabs defaultValue="executive" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="executive">Executive Dashboard</TabsTrigger>
              <TabsTrigger value="analytics">Analytics & Charts</TabsTrigger>
              <TabsTrigger value="competitors">Competitors</TabsTrigger>
              <TabsTrigger value="monitoring">Real-time Monitoring</TabsTrigger>
            </TabsList>

            <TabsContent value="executive" className="space-y-6">
              <CompetitiveErrorBoundary>
                <CompetitiveExecutiveDashboard projectId={projectId} />
              </CompetitiveErrorBoundary>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <div>
                <h2 className="mb-4 text-2xl font-bold">
                  Competitive Analytics
                </h2>
                <p className="text-muted-foreground mb-6">
                  Detailed competitive intelligence charts and visualizations
                </p>
                <CompetitiveErrorBoundary>
                  <Suspense fallback={<DashboardSkeleton />}>
                    <CompetitiveAnalyticsCharts analysisResults={[]} />
                  </Suspense>
                </CompetitiveErrorBoundary>
              </div>
            </TabsContent>

            <TabsContent value="competitors" className="space-y-6">
              <CompetitiveErrorBoundary>
                <Suspense fallback={<DashboardSkeleton />}>
                  <CompetitorManagement projectId={projectId} />
                </Suspense>
              </CompetitiveErrorBoundary>
            </TabsContent>

            <TabsContent value="monitoring" className="space-y-6">
              <CompetitiveErrorBoundary>
                <Suspense fallback={<DashboardSkeleton />}>
                  <CompetitiveMonitoringDashboard projectId={projectId} />
                </Suspense>
              </CompetitiveErrorBoundary>
            </TabsContent>
          </Tabs>
        </Suspense>
      </div>
    </CompetitiveErrorBoundary>
  );
}
