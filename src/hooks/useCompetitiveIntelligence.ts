/**
 * Competitive Intelligence Data Hook
 * Manages competitive analysis data fetching and real-time updates
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useWebSocketSubscription } from "./useWebSocketConnection";
import type {
  CompetitiveAnalysisResult,
  Competitor,
  CompetitiveAlert,
  AnalysisStatusResponse,
  AlertType,
} from "@/lib/competitive/types";
import type { UpdateEvent } from "@/lib/realtime/websocket-manager";

interface CompetitiveIntelligenceData {
  competitors: Competitor[];
  analysisResults: CompetitiveAnalysisResult[];
  alerts: CompetitiveAlert[];
  marketInsights: {
    totalCompetitors: number;
    activeAnalyses: number;
    avgCompetitiveScore: number;
    criticalAlerts: number;
    lastUpdated: string;
  };
}

interface UseCompetitiveIntelligenceReturn {
  data: CompetitiveIntelligenceData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  startAnalysis: (params: {
    targetDomain: string;
    competitorIds: string[];
    analysisTypes: string[];
  }) => Promise<string>;
  getAnalysisStatus: (jobId: string) => Promise<AnalysisStatusResponse>;
  isAnalysisRunning: boolean;
}

export const useCompetitiveIntelligence = (
  projectId?: string
): UseCompetitiveIntelligenceReturn => {
  const [data, setData] = useState<CompetitiveIntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAnalysisRunning, setIsAnalysisRunning] = useState(false);

  const fetchCompetitors = useCallback(async (): Promise<Competitor[]> => {
    try {
      const response = await fetch("/api/competitive/competitors", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch competitors");
      }

      const result = await response.json();
      return result.data?.competitors || [];
    } catch (err) {
      console.error("Error fetching competitors:", err);
      return [];
    }
  }, []);

  const fetchAnalysisResults = useCallback(async (): Promise<
    CompetitiveAnalysisResult[]
  > => {
    if (!projectId) return [];

    try {
      const response = await fetch(
        `/api/competitive/analysis?projectId=${projectId}&pageSize=50`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch analysis results");
      }

      const result = await response.json();
      return result.data?.results || [];
    } catch (err) {
      console.error("Error fetching analysis results:", err);
      return [];
    }
  }, [projectId]);

  const fetchAlerts = useCallback(async (): Promise<CompetitiveAlert[]> => {
    try {
      const response = await fetch("/api/competitive/alerts", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch alerts");
      }

      const result = await response.json();
      return result.data?.alerts || [];
    } catch (err) {
      console.error("Error fetching alerts:", err);
      return [];
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [competitors, analysisResults, alerts] = await Promise.all([
        fetchCompetitors(),
        fetchAnalysisResults(),
        fetchAlerts(),
      ]);

      // Calculate market insights
      const marketInsights = {
        totalCompetitors: competitors.length,
        activeAnalyses: analysisResults.filter(r => r.status === "processing")
          .length,
        avgCompetitiveScore:
          analysisResults.length > 0
            ? analysisResults.reduce(
                (sum, r) => sum + (r.confidence?.overall || 0),
                0
              ) / analysisResults.length
            : 0,
        criticalAlerts: alerts.filter(
          a => a.severity === "critical" || a.severity === "high"
        ).length,
        lastUpdated: new Date().toISOString(),
      };

      setData({
        competitors,
        analysisResults,
        alerts,
        marketInsights,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  }, [fetchCompetitors, fetchAnalysisResults, fetchAlerts]);

  // Handle real-time WebSocket updates
  const handleRealTimeUpdate = useCallback(
    (event: UpdateEvent) => {
      console.log("Received real-time update:", event);

      switch (event.type) {
        case "job-progress":
          // Update analysis progress in real-time
          if (event.data["jobType"] === "competitive-analysis") {
            setIsAnalysisRunning(true);
          }
          break;

        case "job-completed":
          if (event.data["jobType"] === "competitive-analysis") {
            setIsAnalysisRunning(false);
            // Refresh data to show new results
            loadData();
          }
          break;

        case "job-failed":
          if (event.data["jobType"] === "competitive-analysis") {
            setIsAnalysisRunning(false);
            setError(
              `Analysis failed: ${event.data["error"] || "Unknown error"}`
            );
          }
          break;

        case "competitive-alert":
        case "seo-alert":
        case "performance-alert":
          // Add new alert to the list
          setData(prevData => {
            if (!prevData) return prevData;

            const newAlert: CompetitiveAlert = {
              id: event.id,
              competitorId: "unknown",
              type: (event.type === "competitive-alert"
                ? "strategy-shift"
                : event.type === "seo-alert"
                  ? "ranking-change"
                  : "performance-improvement") as AlertType,
              title: (event.data["title"] as string) || "New Alert",
              description: (event.data["message"] as string) || "",
              severity:
                event.priority === "critical"
                  ? "high"
                  : event.priority === "high"
                    ? "medium"
                    : "low",
              timestamp: new Date(event.timestamp),
              status: "new",
              metadata: {
                source: "websocket",
                confidence: 80,
                impact: 70,
                urgency: 60,
                relatedEntities: [],
                data: event.data,
              },
              actionRequired:
                event.priority === "critical" || event.priority === "high",
              recommendations: [],
            };

            return {
              ...prevData,
              alerts: [newAlert, ...prevData.alerts].slice(0, 50), // Keep latest 50 alerts
              marketInsights: {
                ...prevData.marketInsights,
                criticalAlerts:
                  prevData.marketInsights.criticalAlerts +
                  (newAlert.severity === "high" ? 1 : 0),
                lastUpdated: event.timestamp,
              },
            };
          });
          break;

        default:
          console.log("Unhandled event type:", event.type);
      }
    },
    [loadData]
  );

  // WebSocket subscription for real-time updates
  const webSocket = useWebSocketSubscription(
    [
      "job-progress",
      "job-completed",
      "job-failed",
      "competitive-alert",
      "seo-alert",
      "performance-alert",
    ],
    {
      filters: {
        projectIds: projectId ? [projectId] : undefined,
      },
      onEvent: handleRealTimeUpdate,
    }
  );

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const startAnalysis = useCallback(
    async (params: {
      targetDomain: string;
      competitorIds: string[];
      analysisTypes: string[];
    }) => {
      try {
        setIsAnalysisRunning(true);
        setError(null);

        const response = await fetch("/api/competitive/analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            teamId: "current-team", // TODO: Get from auth context
            targetDomain: params.targetDomain,
            competitorIds: params.competitorIds,
            analysisTypes: params.analysisTypes,
            options: {
              depth: "standard",
              includeHistorical: false,
              alertsEnabled: true,
            },
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to start analysis");
        }

        const result = await response.json();

        // Refresh data to include new analysis
        await loadData();

        return result.data?.jobId || "";
      } catch (err) {
        setIsAnalysisRunning(false);
        throw err;
      }
    },
    [projectId, loadData]
  );

  const getAnalysisStatus = useCallback(
    async (jobId: string): Promise<AnalysisStatusResponse> => {
      const response = await fetch(
        `/api/competitive/analysis/${jobId}/status`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get analysis status");
      }

      const result = await response.json();
      return result.data;
    },
    []
  );

  // Load initial data
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    loading,
    error,
    refresh,
    startAnalysis,
    getAnalysisStatus,
    isAnalysisRunning,
  };
};
