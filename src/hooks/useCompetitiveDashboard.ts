import { useState, useEffect, useCallback } from "react";
import { competitiveService } from "@/lib/competitive/competitive-service";
import { useAuth } from "@/lib/auth/context";

interface CompetitiveDashboardState {
  competitors: any[];
  alerts: any[];
  analysis: any[];
  loading: boolean;
  error: string | null;
}

export function useCompetitiveDashboard(projectId: string) {
  const { user } = useAuth();
  const [state, setState] = useState<CompetitiveDashboardState>({
    competitors: [],
    alerts: [],
    analysis: [],
    loading: true,
    error: null,
  });

  const loadData = useCallback(async () => {
    if (!projectId || !user) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const [competitors, alerts, analysis] = await Promise.allSettled([
        competitiveService.getCompetitors(projectId),
        competitiveService.getAlerts(projectId),
        competitiveService.getAnalysis(projectId),
      ]);

      setState({
        competitors:
          competitors.status === "fulfilled" ? competitors.value : [],
        alerts: alerts.status === "fulfilled" ? alerts.value : [],
        analysis: analysis.status === "fulfilled" ? analysis.value : [],
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error("Dashboard load error:", error);
      setState(prev => ({
        ...prev,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load dashboard data",
      }));
    }
  }, [projectId, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  return {
    ...state,
    refresh,
  };
}
