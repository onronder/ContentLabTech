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

export function useCompetitiveDashboard(teamId: string) {
  const { user } = useAuth();
  const [state, setState] = useState<CompetitiveDashboardState>({
    competitors: [],
    alerts: [],
    analysis: [],
    loading: true,
    error: null,
  });

  const loadData = useCallback(async () => {
    console.log("🔍 [DASHBOARD] loadData called with:", {
      teamId,
      hasUser: !!user,
    });

    if (!teamId || !user) {
      console.log("⚠️ [DASHBOARD] Missing teamId or user, returning early");
      return;
    }

    console.log("🔍 [DASHBOARD] Setting loading state to true");
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      console.log(
        "🔍 [DASHBOARD] Starting Promise.allSettled for competitive data"
      );
      const [competitors, alerts, analysis] = await Promise.allSettled([
        competitiveService.getCompetitors(teamId),
        competitiveService.getAlerts(teamId),
        competitiveService.getAnalysis(teamId),
      ]);

      console.log("🔍 [DASHBOARD] Promise.allSettled results:", {
        competitors: competitors.status,
        competitorsData:
          competitors.status === "fulfilled"
            ? competitors.value
            : competitors.reason,
        alerts: alerts.status,
        analysis: analysis.status,
      });

      const competitorsData =
        competitors.status === "fulfilled" ? competitors.value : [];
      const alertsData = alerts.status === "fulfilled" ? alerts.value : [];
      const analysisData =
        analysis.status === "fulfilled" ? analysis.value : [];

      console.log("🔍 [DASHBOARD] Final data counts:", {
        competitors: competitorsData.length,
        alerts: alertsData.length,
        analysis: analysisData.length,
      });

      setState({
        competitors: competitorsData,
        alerts: alertsData,
        analysis: analysisData,
        loading: false,
        error: null,
      });

      console.log("✅ [DASHBOARD] State updated successfully");
    } catch (error) {
      console.error("❌ [DASHBOARD] Dashboard load error:", error);
      setState(prev => ({
        ...prev,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load dashboard data",
      }));
    }
  }, [teamId, user]);

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
