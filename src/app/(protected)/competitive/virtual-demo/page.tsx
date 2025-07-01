/**
 * Virtual Scrolling Demo Page
 * Demonstrates high-performance virtual scrolling with large datasets
 */

"use client";

import { useState, useMemo } from "react";
import { VirtualizedCompetitorList } from "@/components/competitive/VirtualizedCompetitorList";
import { VirtualizedAlertsList } from "@/components/competitive/VirtualizedAlertsList";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, Bell, Database, Zap } from "lucide-react";

// Generate mock competitor data
const generateMockCompetitors = (count: number) => {
  const domains = [
    "example.com",
    "competitor.net",
    "rival.org",
    "business.io",
    "market-leader.co",
    "startup.dev",
    "enterprise.biz",
    "innovation.tech",
    "digital-agency.com",
    "platform.ai",
  ];
  const categories = [
    "direct",
    "indirect",
    "emerging",
    "aspirational",
  ] as const;
  const priorities = ["critical", "high", "medium", "low"] as const;
  const statuses = ["active", "inactive", "monitoring", "archived"] as const;
  const threatLevels = ["critical", "high", "medium", "low"] as const;
  const changeIndicators = ["up", "down", "stable"] as const;

  return Array.from({ length: count }, (_, index) => ({
    id: `competitor-${index + 1}`,
    name: `Competitor ${index + 1}`,
    domain: domains[index % domains.length]!,
    category: categories[Math.floor(Math.random() * categories.length)]!,
    priority: priorities[Math.floor(Math.random() * priorities.length)]!,
    status: statuses[Math.floor(Math.random() * statuses.length)]!,
    metrics: {
      trafficEstimate: Math.floor(Math.random() * 1000000) + 10000,
      rankingKeywords: Math.floor(Math.random() * 50000) + 1000,
      averagePosition: Math.random() * 50 + 1,
      visibilityScore: Math.floor(Math.random() * 100),
      threatLevel:
        threatLevels[Math.floor(Math.random() * threatLevels.length)]!,
      lastAnalyzed: new Date(
        Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
      ),
      changeIndicator:
        changeIndicators[Math.floor(Math.random() * changeIndicators.length)]!,
      changeValue: Math.floor(Math.random() * 20) + 1,
    },
    alerts: {
      critical: Math.floor(Math.random() * 5),
      high: Math.floor(Math.random() * 10),
      medium: Math.floor(Math.random() * 15),
      low: Math.floor(Math.random() * 20),
    },
  }));
};

// Generate mock alert data
const generateMockAlerts = (count: number) => {
  const alertTypes = [
    "ranking_change",
    "content_published",
    "backlink_gained",
    "strategy_shift",
    "performance_change",
    "market_movement",
    "threat_detected",
    "opportunity_identified",
  ] as const;
  const severities = ["critical", "high", "medium", "low", "info"] as const;
  const statuses = [
    "new",
    "acknowledged",
    "in_progress",
    "resolved",
    "dismissed",
  ] as const;
  const sources = [
    "SEO Monitor",
    "Content Tracker",
    "Social Media",
    "News Alert",
    "Manual Review",
  ];
  const competitors = generateMockCompetitors(50);

  return Array.from({ length: count }, (_, index) => {
    const competitor =
      competitors[Math.floor(Math.random() * competitors.length)]!;
    const alertType =
      alertTypes[Math.floor(Math.random() * alertTypes.length)]!;
    const severity = severities[Math.floor(Math.random() * severities.length)]!;

    return {
      id: `alert-${index + 1}`,
      title: `${alertType.replace("_", " ").toUpperCase()}: ${competitor.name}`,
      description: `Competitive intelligence alert detected for ${competitor.name} regarding ${alertType.replace("_", " ")}.`,
      type: alertType,
      severity,
      status: statuses[Math.floor(Math.random() * statuses.length)]!,
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      competitor: {
        id: competitor.id,
        name: competitor.name,
        domain: competitor.domain,
      },
      metadata: {
        source:
          sources[Math.floor(Math.random() * sources.length)] ||
          "Manual Review",
        confidence: Math.floor(Math.random() * 40) + 60,
        impact: Math.floor(Math.random() * 40) + 30,
        urgency: Math.floor(Math.random() * 40) + 30,
        tags: [
          `tag-${Math.floor(Math.random() * 10) + 1}`,
          `category-${Math.floor(Math.random() * 5) + 1}`,
        ],
      },
      actionRequired: Math.random() > 0.7,
      isRead: Math.random() > 0.3,
    };
  });
};

export default function VirtualScrollDemoPage() {
  const [competitorCount, setCompetitorCount] = useState(1000);
  const [alertCount, setAlertCount] = useState(2000);

  // Generate mock data
  const mockCompetitors = useMemo(
    () => generateMockCompetitors(competitorCount),
    [competitorCount]
  );
  const mockAlerts = useMemo(
    () => generateMockAlerts(alertCount),
    [alertCount]
  );

  const handleCompetitorSelect = (_competitor: unknown) => {
    // Handle competitor selection
  };

  const handleCompetitorAction = (_competitor: unknown, _action: string) => {
    // Handle competitor action
  };

  const handleAlertSelect = (_alert: unknown) => {
    // Handle alert selection
  };

  const handleAlertAction = (_alert: unknown, _action: string) => {
    // Handle alert action
  };

  const handleBulkAlertAction = (_alertIds: string[], _action: string) => {
    // Handle bulk alert action
  };

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      {/* Header */}
      <div>
        <h1 className="mb-2 text-3xl font-bold">Virtual Scrolling Demo</h1>
        <p className="text-muted-foreground">
          High-performance virtual scrolling demonstration with large
          competitive intelligence datasets
        </p>
      </div>

      {/* Performance Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Competitors
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {competitorCount.toLocaleString()}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Alerts
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {alertCount.toLocaleString()}
                </p>
              </div>
              <Bell className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Total Records
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {(competitorCount + alertCount).toLocaleString()}
                </p>
              </div>
              <Database className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Performance
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="default">Virtualized</Badge>
                  <Zap className="h-4 w-4 text-yellow-500" />
                </div>
              </div>
              <Zap className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Size Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Dataset Size Configuration</CardTitle>
          <CardDescription>
            Adjust the dataset size to test virtual scrolling performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Competitors:</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={competitorCount === 100 ? "default" : "outline"}
                  onClick={() => setCompetitorCount(100)}
                >
                  100
                </Button>
                <Button
                  size="sm"
                  variant={competitorCount === 1000 ? "default" : "outline"}
                  onClick={() => setCompetitorCount(1000)}
                >
                  1K
                </Button>
                <Button
                  size="sm"
                  variant={competitorCount === 10000 ? "default" : "outline"}
                  onClick={() => setCompetitorCount(10000)}
                >
                  10K
                </Button>
                <Button
                  size="sm"
                  variant={competitorCount === 50000 ? "default" : "outline"}
                  onClick={() => setCompetitorCount(50000)}
                >
                  50K
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Alerts:</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={alertCount === 500 ? "default" : "outline"}
                  onClick={() => setAlertCount(500)}
                >
                  500
                </Button>
                <Button
                  size="sm"
                  variant={alertCount === 2000 ? "default" : "outline"}
                  onClick={() => setAlertCount(2000)}
                >
                  2K
                </Button>
                <Button
                  size="sm"
                  variant={alertCount === 20000 ? "default" : "outline"}
                  onClick={() => setAlertCount(20000)}
                >
                  20K
                </Button>
                <Button
                  size="sm"
                  variant={alertCount === 100000 ? "default" : "outline"}
                  onClick={() => setAlertCount(100000)}
                >
                  100K
                </Button>
              </div>
            </div>
          </div>

          <div className="text-muted-foreground text-sm">
            <strong>Note:</strong> Virtual scrolling renders only visible items
            regardless of dataset size, maintaining consistent performance even
            with 100K+ records.
          </div>
        </CardContent>
      </Card>

      {/* Virtual Scrolling Demos */}
      <Tabs defaultValue="competitors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="competitors">
            Competitors ({competitorCount.toLocaleString()})
          </TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts ({alertCount.toLocaleString()})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="competitors" className="space-y-4">
          <VirtualizedCompetitorList
            competitors={mockCompetitors}
            onCompetitorSelect={handleCompetitorSelect}
            onCompetitorAction={handleCompetitorAction}
            containerHeight={700}
          />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <VirtualizedAlertsList
            alerts={mockAlerts}
            onAlertSelect={handleAlertSelect}
            onAlertAction={handleAlertAction}
            onBulkAction={handleBulkAlertAction}
            containerHeight={700}
          />
        </TabsContent>
      </Tabs>

      {/* Performance Information */}
      <Card>
        <CardHeader>
          <CardTitle>Virtual Scrolling Benefits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="mb-2 font-semibold">Performance Advantages</h4>
              <ul className="text-muted-foreground space-y-1 text-sm">
                <li>• Only renders visible items (~10-20 per view)</li>
                <li>• Constant memory usage regardless of dataset size</li>
                <li>• Smooth scrolling performance with 100K+ records</li>
                <li>• Minimal DOM manipulation and re-renders</li>
                <li>• Enterprise-grade scalability</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-2 font-semibold">Features</h4>
              <ul className="text-muted-foreground space-y-1 text-sm">
                <li>• Real-time search and filtering</li>
                <li>• Multi-column sorting</li>
                <li>• Bulk selection and actions</li>
                <li>• Customizable item heights</li>
                <li>• Responsive design</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
