import { useState, useEffect, useCallback, useRef } from "react";
import { competitiveWebSocket } from "@/lib/competitive/websocket-service";
import { webSocketCleanup } from "@/lib/competitive/websocket-cleanup";

interface WebSocketState {
  connected: boolean;
  connectionState:
    | "disconnected"
    | "connecting"
    | "connected"
    | "error"
    | "failed";
  error: string | null;
  reconnectAttempts: number;
}

interface CompetitiveUpdate {
  type: "competitor-update" | "alert" | "analysis" | "metrics";
  data: any;
  timestamp: string;
}

export function useCompetitiveWebSocket(projectId: string) {
  const [connectionState, setConnectionState] = useState<WebSocketState>({
    connected: false,
    connectionState: "disconnected",
    error: null,
    reconnectAttempts: 0,
  });

  const [updates, setUpdates] = useState<CompetitiveUpdate[]>([]);
  const [latestUpdate, setLatestUpdate] = useState<CompetitiveUpdate | null>(
    null
  );
  const listenersRef = useRef<Set<() => void>>(new Set());

  // Handle connection state changes
  useEffect(() => {
    const handleConnectionState = (event: CustomEvent) => {
      const { state, error, projectId: eventProjectId } = event.detail;

      if (eventProjectId === projectId) {
        setConnectionState(prev => ({
          ...prev,
          connectionState: state,
          connected: state === "connected",
          error: error || null,
          reconnectAttempts:
            competitiveWebSocket.getConnectionState().reconnectAttempts,
        }));
      }
    };

    window.addEventListener(
      "websocket-connection-state",
      handleConnectionState as EventListener
    );
    return () => {
      window.removeEventListener(
        "websocket-connection-state",
        handleConnectionState as EventListener
      );
    };
  }, [projectId]);

  // Handle competitive updates
  useEffect(() => {
    const handleCompetitiveUpdate = (event: CustomEvent) => {
      const update: CompetitiveUpdate = {
        type: "competitor-update",
        data: event.detail,
        timestamp: new Date().toISOString(),
      };

      setUpdates(prev => [update, ...prev.slice(0, 99)]); // Keep last 100 updates
      setLatestUpdate(update);
    };

    const handleCompetitorAlert = (event: CustomEvent) => {
      const update: CompetitiveUpdate = {
        type: "alert",
        data: event.detail,
        timestamp: new Date().toISOString(),
      };

      setUpdates(prev => [update, ...prev.slice(0, 99)]);
      setLatestUpdate(update);
    };

    const handleAnalysisComplete = (event: CustomEvent) => {
      const update: CompetitiveUpdate = {
        type: "analysis",
        data: event.detail,
        timestamp: new Date().toISOString(),
      };

      setUpdates(prev => [update, ...prev.slice(0, 99)]);
      setLatestUpdate(update);
    };

    const handleMetricsUpdate = (event: CustomEvent) => {
      const update: CompetitiveUpdate = {
        type: "metrics",
        data: event.detail,
        timestamp: new Date().toISOString(),
      };

      setUpdates(prev => [update, ...prev.slice(0, 99)]);
      setLatestUpdate(update);
    };

    window.addEventListener(
      "competitive-update",
      handleCompetitiveUpdate as EventListener
    );
    window.addEventListener(
      "competitor-alert",
      handleCompetitorAlert as EventListener
    );
    window.addEventListener(
      "analysis-complete",
      handleAnalysisComplete as EventListener
    );
    window.addEventListener(
      "metrics-update",
      handleMetricsUpdate as EventListener
    );

    return () => {
      window.removeEventListener(
        "competitive-update",
        handleCompetitiveUpdate as EventListener
      );
      window.removeEventListener(
        "competitor-alert",
        handleCompetitorAlert as EventListener
      );
      window.removeEventListener(
        "analysis-complete",
        handleAnalysisComplete as EventListener
      );
      window.removeEventListener(
        "metrics-update",
        handleMetricsUpdate as EventListener
      );
    };
  }, []);

  // Connect to WebSocket when projectId changes
  useEffect(() => {
    if (projectId) {
      competitiveWebSocket.connect(projectId);
    }

    return () => {
      // Clean up listeners but don't disconnect (other components might be using it)
      listenersRef.current.forEach(cleanup => cleanup());
      listenersRef.current.clear();

      // Use cleanup utility for proper cleanup
      webSocketCleanup.setupComponentCleanup();
    };
  }, [projectId]);

  // Subscribe to specific competitor updates
  const subscribeToCompetitor = useCallback((competitorId: string) => {
    competitiveWebSocket.subscribeToCompetitor(competitorId);
  }, []);

  // Unsubscribe from competitor updates
  const unsubscribeFromCompetitor = useCallback((competitorId: string) => {
    competitiveWebSocket.unsubscribeFromCompetitor(competitorId);
  }, []);

  // Request real-time analysis
  const requestAnalysis = useCallback(
    (competitorId: string, analysisType: string) => {
      competitiveWebSocket.requestAnalysis(competitorId, analysisType);
    },
    []
  );

  // Manually reconnect
  const reconnect = useCallback(() => {
    if (projectId) {
      competitiveWebSocket.disconnect();
      competitiveWebSocket.connect(projectId);
    }
  }, [projectId]);

  // Clear updates
  const clearUpdates = useCallback(() => {
    setUpdates([]);
    setLatestUpdate(null);
  }, []);

  // Get updates by type
  const getUpdatesByType = useCallback(
    (type: CompetitiveUpdate["type"]) => {
      return updates.filter(update => update.type === type);
    },
    [updates]
  );

  return {
    // Connection state
    connectionState,

    // Real-time updates
    updates,
    latestUpdate,

    // Actions
    subscribeToCompetitor,
    unsubscribeFromCompetitor,
    requestAnalysis,
    reconnect,
    clearUpdates,

    // Utilities
    getUpdatesByType,

    // Computed properties
    isConnected: connectionState.connected,
    hasRecentAlerts: getUpdatesByType("alert").length > 0,
    hasRecentUpdates: updates.length > 0,
  };
}
