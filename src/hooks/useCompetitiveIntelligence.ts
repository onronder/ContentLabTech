/**
 * Competitive Intelligence Data Hook
 * Manages competitive analysis data fetching and real-time updates
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  CompetitiveAnalysisResult,
  Competitor,
  CompetitiveAlert,
  AnalysisStatusResponse,
} from "@/lib/competitive/types";

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
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load competitive intelligence data"
      );
    } finally {
      setLoading(false);
    }
  }, [fetchCompetitors, fetchAnalysisResults, fetchAlerts]);

  const startAnalysis = useCallback(
    async (params: {
      targetDomain: string;
      competitorIds: string[];
      analysisTypes: string[];
    }): Promise<string> => {
      if (!projectId) {
        throw new Error("Project ID is required to start analysis");
      }

      setIsAnalysisRunning(true);

      try {
        const response = await fetch("/api/competitive/analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            userId: "current-user", // TODO: Get from auth context
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

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  // Initial load and polling for running analyses
  useEffect(() => {
    loadData();

    // Set up polling for running analyses
    const interval = setInterval(async () => {
      if (data?.analysisResults.some(r => r.status === "processing")) {
        await loadData();
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [loadData, data?.analysisResults]);

  // Update analysis running state
  useEffect(() => {
    const hasRunningAnalysis =
      data?.analysisResults.some(r => r.status === "processing") || false;
    setIsAnalysisRunning(hasRunningAnalysis);
  }, [data?.analysisResults]);

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
