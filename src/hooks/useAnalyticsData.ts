/**
 * Analytics Data Hook
 * Fetches real-time analysis results and job status
 */

"use client";

import { useState, useEffect, useCallback } from "react";
// Removed unused imports - types are defined locally for better encapsulation

interface AnalyticsData {
  contentAnalysis?: {
    overallScore: number;
    technicalSeo: number;
    contentDepth: number;
    readability: number;
    semanticRelevance: number;
    recommendations: Array<{
      type: string;
      title: string;
      description: string;
      priority: "high" | "medium" | "low";
      impact?: number;
    }>;
    lastUpdated: string;
  };
  seoHealth?: {
    overallScore: number;
    technical: number;
    onPage: number;
    performance: number;
    mobile: number;
    criticalIssues: Array<{
      type: string;
      severity: "low" | "medium" | "high" | "critical";
      title: string;
      description: string;
    }>;
    recommendations: Array<{
      type: string;
      title: string;
      description: string;
      priority: "high" | "medium" | "low";
      impact?: number;
    }>;
    lastUpdated: string;
  };
  performance?: {
    overallScore: number;
    coreWebVitals: {
      lcp: number;
      fid: number;
      cls: number;
    };
    speedIndex: number;
    firstContentfulPaint: number;
    recommendations: Array<{
      type: string;
      title: string;
      description: string;
      priority: "high" | "medium" | "low";
      impact?: number;
    }>;
    lastUpdated: string;
  };
  competitive?: {
    marketPosition: number;
    competitiveScore: number;
    opportunities: Array<{
      title: string;
      description: string;
      potential: number;
      timeframe: string;
    }>;
    threats: Array<{
      title: string;
      description: string;
      severity: "low" | "medium" | "high";
      likelihood: number;
    }>;
    strategicRecommendations: Array<{
      title: string;
      description: string;
      priority: "high" | "medium" | "low";
      impact: number;
    }>;
    lastUpdated: string;
  };
  industryBenchmark?: {
    industryPercentile: number;
    performanceRank: number;
    benchmarkScores: Array<{
      metric: string;
      score: number;
      percentile: number;
      industry: string;
    }>;
    industryTrends: Array<{
      metric: string;
      trend: "up" | "down" | "stable";
      change: number;
      period: string;
    }>;
    lastUpdated: string;
  };
}

interface JobStatus {
  id: string;
  type: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  progress: number;
  progressMessage?: string;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

interface AnalyticsStatus {
  jobs: JobStatus[];
  results: AnalyticsData;
  summary: {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    processingJobs: number;
    pendingJobs: number;
  };
  queueStats: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    processing_capacity: number;
  };
  loading: boolean;
  error: string | null;
}

export function useAnalyticsData(
  projectId: string | undefined,
  refreshInterval = 30000
) {
  const [status, setStatus] = useState<AnalyticsStatus>({
    jobs: [],
    results: {},
    summary: {
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      processingJobs: 0,
      pendingJobs: 0,
    },
    queueStats: {
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      processing_capacity: 0,
    },
    loading: true,
    error: null,
  });

  const fetchAnalyticsStatus = useCallback(async () => {
    if (!projectId) return;

    try {
      const response = await fetch(
        `/api/analytics/status?projectId=${projectId}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics status: ${response.status}`);
      }

      const data = await response.json();

      setStatus(prev => ({
        ...prev,
        jobs: data.jobs || [],
        results: data.results || {},
        summary: data.summary || prev.summary,
        queueStats: data.queueStats || prev.queueStats,
        loading: false,
        error: null,
      }));
    } catch (error) {
      console.error("Error fetching analytics status:", error);
      setStatus(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  }, [projectId]);

  // Initial fetch
  useEffect(() => {
    fetchAnalyticsStatus();
  }, [fetchAnalyticsStatus]);

  // Set up polling for real-time updates
  useEffect(() => {
    if (!projectId || refreshInterval <= 0) return;

    const interval = setInterval(fetchAnalyticsStatus, refreshInterval);
    return () => clearInterval(interval);
  }, [projectId, refreshInterval, fetchAnalyticsStatus]);

  // Manual refresh function
  const refresh = useCallback(() => {
    setStatus(prev => ({ ...prev, loading: true }));
    fetchAnalyticsStatus();
  }, [fetchAnalyticsStatus]);

  // Get analysis progress
  const getAnalysisProgress = useCallback(() => {
    const { jobs } = status;
    if (jobs.length === 0) return { progress: 0, phase: "Not started" };

    const totalJobs = jobs.length;
    const completedJobs = jobs.filter(j => j.status === "completed").length;
    const failedJobs = jobs.filter(j => j.status === "failed").length;
    const processingJobs = jobs.filter(j => j.status === "processing").length;

    const progress = Math.round((completedJobs / totalJobs) * 100);

    let phase = "";
    if (processingJobs > 0) {
      const processingJob = jobs.find(j => j.status === "processing");
      phase = `Processing ${processingJob?.type.replace("-", " ") || "analysis"}...`;
    } else if (completedJobs === totalJobs) {
      phase = "Analysis complete";
    } else if (failedJobs > 0 && completedJobs + failedJobs === totalJobs) {
      phase = "Analysis completed with errors";
    } else {
      phase = "Analysis in progress";
    }

    return { progress, phase };
  }, [status]);

  // Get overall project health score
  const getOverallHealthScore = useCallback(() => {
    const { results } = status;
    const scores: number[] = [];

    if (results.contentAnalysis?.overallScore) {
      scores.push(results.contentAnalysis.overallScore);
    }
    if (results.seoHealth?.overallScore) {
      scores.push(results.seoHealth.overallScore);
    }
    if (results.performance?.overallScore) {
      scores.push(results.performance.overallScore);
    }

    if (scores.length === 0) return null;

    const average =
      scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return Math.round(average);
  }, [status]);

  // Get priority recommendations
  const getPriorityRecommendations = useCallback(() => {
    const { results } = status;
    const recommendations: Array<{
      type: string;
      title: string;
      description: string;
      priority: "high" | "medium" | "low";
      source: string;
    }> = [];

    // Content analysis recommendations
    if (results.contentAnalysis?.recommendations) {
      results.contentAnalysis.recommendations
        .filter(r => r.priority === "high")
        .slice(0, 2)
        .forEach(r => {
          recommendations.push({
            type: r.type,
            title: r.title,
            description: r.description,
            priority: r.priority,
            source: "Content Analysis",
          });
        });
    }

    // SEO health recommendations
    if (results.seoHealth?.recommendations) {
      results.seoHealth.recommendations
        .filter(r => (r.impact || 0) >= 70)
        .slice(0, 2)
        .forEach(r => {
          recommendations.push({
            type: "seo",
            title: r.title,
            description: r.description,
            priority: (r.impact || 0) >= 80 ? "high" : "medium",
            source: "SEO Health",
          });
        });
    }

    // Performance recommendations
    if (results.performance?.recommendations) {
      results.performance.recommendations
        .filter(r => r.type === "critical")
        .slice(0, 2)
        .forEach(r => {
          recommendations.push({
            type: "performance",
            title: r.title,
            description: r.description,
            priority: "high",
            source: "Performance",
          });
        });
    }

    return recommendations.slice(0, 5); // Top 5 recommendations
  }, [status]);

  // Check if analysis is still running
  const isAnalysisRunning = useCallback(() => {
    return status.jobs.some(
      job => job.status === "processing" || job.status === "pending"
    );
  }, [status]);

  // Get data freshness indicator
  const getDataFreshness = useCallback(() => {
    const { results } = status;
    const dates: Date[] = [];

    if (results.contentAnalysis?.lastUpdated) {
      dates.push(new Date(results.contentAnalysis.lastUpdated));
    }
    if (results.seoHealth?.lastUpdated) {
      dates.push(new Date(results.seoHealth.lastUpdated));
    }
    if (results.performance?.lastUpdated) {
      dates.push(new Date(results.performance.lastUpdated));
    }

    if (dates.length === 0) return null;

    const mostRecent = new Date(Math.max(...dates.map(d => d.getTime())));
    const hoursAgo = Math.floor(
      (Date.now() - mostRecent.getTime()) / (1000 * 60 * 60)
    );

    if (hoursAgo < 1) return "Just updated";
    if (hoursAgo < 24) return `${hoursAgo} hours ago`;

    const daysAgo = Math.floor(hoursAgo / 24);
    return `${daysAgo} days ago`;
  }, [status]);

  return {
    ...status,
    refresh,
    getAnalysisProgress,
    getOverallHealthScore,
    getPriorityRecommendations,
    isAnalysisRunning,
    getDataFreshness,
  };
}

// Helper hook for single analysis type
export function useAnalysisResult<T>(
  projectId: string | undefined,
  analysisType:
    | "contentAnalysis"
    | "seoHealth"
    | "performance"
    | "competitive"
    | "industryBenchmark"
) {
  const { results, loading, error, refresh } = useAnalyticsData(
    projectId,
    60000
  ); // 1 minute refresh

  return {
    data: results[analysisType] as T | undefined,
    loading,
    error,
    refresh,
    hasData: !!results[analysisType],
  };
}
