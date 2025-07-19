/**
 * Enhanced Real-Time Connection Hook
 * Supports WebSocket, SSE, and Polling fallbacks for maximum compatibility
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";

interface RealtimeEvent {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  userId?: string;
  teamId?: string;
  projectId?: string;
}

interface ConnectionConfig {
  teamId: string;
  projectId?: string;
  userId?: string;
  enableWebSocket?: boolean;
  enableSSE?: boolean;
  enablePolling?: boolean;
  pollingInterval?: number;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

interface ConnectionState {
  connected: boolean;
  connecting: boolean;
  connectionType: "websocket" | "sse" | "polling" | "none";
  error: string | null;
  lastEventId?: string;
  lastEventTimestamp?: number;
}

interface UseRealtimeReturn {
  connectionState: ConnectionState;
  events: RealtimeEvent[];
  lastEvent: RealtimeEvent | null;
  connect: () => void;
  disconnect: () => void;
  sendEvent: (type: string, data: any) => Promise<boolean>;
  clearEvents: () => void;
}

export function useRealtimeConnection(
  config: ConnectionConfig
): UseRealtimeReturn {
  const {
    teamId,
    projectId,
    userId,
    enableWebSocket = true,
    enableSSE = true,
    enablePolling = true,
    pollingInterval = 5000,
    reconnectAttempts = 3,
    reconnectDelay = 2000,
  } = config;

  const [connectionState, setConnectionState] = useState<ConnectionState>({
    connected: false,
    connecting: false,
    connectionType: "none",
    error: null,
  });

  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);

  // Refs for connection management
  const socketRef = useRef<Socket | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const addEvent = useCallback((event: RealtimeEvent) => {
    setEvents(prev => {
      const newEvents = [...prev, event].slice(-100); // Keep last 100 events
      return newEvents;
    });
    setLastEvent(event);

    // Update connection state with last event info
    setConnectionState(prev => ({
      ...prev,
      lastEventId: event.id,
      lastEventTimestamp: event.timestamp,
    }));
  }, []);

  const sendEvent = useCallback(
    async (type: string, data: any): Promise<boolean> => {
      try {
        const response = await fetch("/api/realtime/poll", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            teamId,
            projectId,
            type,
            data,
          }),
        });

        if (response.ok) {
          console.log("📤 Event sent successfully", { type, teamId });
          return true;
        } else {
          console.error("Failed to send event", response.status);
          return false;
        }
      } catch (error) {
        console.error("Error sending event:", error);
        return false;
      }
    },
    [teamId, projectId]
  );

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (socketRef.current?.connected) return;

    console.log("🔌 Attempting WebSocket connection...");
    setConnectionState(prev => ({
      ...prev,
      connecting: true,
      connectionType: "websocket",
      error: null,
    }));

    const wsUrl =
      process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:3001";
    const socket = io(wsUrl, {
      transports: ["websocket"],
      forceNew: true,
      timeout: 5000,
    });

    socket.on("connect", () => {
      console.log("✅ WebSocket connected");
      setConnectionState(prev => ({
        ...prev,
        connected: true,
        connecting: false,
        connectionType: "websocket",
        error: null,
      }));
      reconnectAttemptsRef.current = 0;

      // Join team room
      socket.emit("join-team", { teamId, userId, projectId });
    });

    socket.on("disconnect", () => {
      console.log("❌ WebSocket disconnected");
      setConnectionState(prev => ({
        ...prev,
        connected: false,
        connecting: false,
      }));
    });

    socket.on("connect_error", error => {
      console.log("❌ WebSocket connection failed:", error.message);
      setConnectionState(prev => ({
        ...prev,
        connected: false,
        connecting: false,
        error: `WebSocket failed: ${error.message}`,
      }));
      socket.disconnect();

      // Try SSE fallback
      if (enableSSE && reconnectAttemptsRef.current < reconnectAttempts) {
        setTimeout(connectSSE, reconnectDelay);
      }
    });

    socket.on("update", (event: RealtimeEvent) => {
      console.log("📨 WebSocket event received:", event.type);
      addEvent(event);
    });

    socketRef.current = socket;
  }, [
    teamId,
    userId,
    projectId,
    enableSSE,
    reconnectAttempts,
    reconnectDelay,
    addEvent,
  ]);

  // Server-Sent Events connection
  const connectSSE = useCallback(() => {
    if (eventSourceRef.current?.readyState === EventSource.OPEN) return;

    console.log("📡 Attempting SSE connection...");
    setConnectionState(prev => ({
      ...prev,
      connecting: true,
      connectionType: "sse",
      error: null,
    }));

    const params = new URLSearchParams({
      teamId,
      ...(projectId && { projectId }),
      ...(connectionState.lastEventId && {
        lastEventId: connectionState.lastEventId,
      }),
    });

    const eventSource = new EventSource(`/api/realtime/events?${params}`);

    eventSource.onopen = () => {
      console.log("✅ SSE connected");
      setConnectionState(prev => ({
        ...prev,
        connected: true,
        connecting: false,
        connectionType: "sse",
        error: null,
      }));
      reconnectAttemptsRef.current = 0;
    };

    eventSource.onmessage = event => {
      try {
        const data: RealtimeEvent = JSON.parse(event.data);
        if (data.type !== "heartbeat") {
          console.log("📨 SSE event received:", data.type);
          addEvent(data);
        }
      } catch (error) {
        console.error("Failed to parse SSE message:", error);
      }
    };

    eventSource.onerror = error => {
      console.log("❌ SSE connection failed");
      setConnectionState(prev => ({
        ...prev,
        connected: false,
        connecting: false,
        error: "SSE connection failed",
      }));
      eventSource.close();

      // Try polling fallback
      if (enablePolling && reconnectAttemptsRef.current < reconnectAttempts) {
        setTimeout(startPolling, reconnectDelay);
      }
    };

    eventSourceRef.current = eventSource;
  }, [
    teamId,
    projectId,
    connectionState.lastEventId,
    enablePolling,
    reconnectAttempts,
    reconnectDelay,
    addEvent,
  ]);

  // Polling fallback
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;

    console.log("⏱️ Starting polling fallback...");
    setConnectionState(prev => ({
      ...prev,
      connected: true,
      connecting: false,
      connectionType: "polling",
      error: null,
    }));

    const poll = async () => {
      try {
        const params = new URLSearchParams({
          teamId,
          ...(projectId && { projectId }),
          ...(connectionState.lastEventTimestamp && {
            since: connectionState.lastEventTimestamp.toString(),
          }),
          limit: "10",
        });

        const response = await fetch(`/api/realtime/poll?${params}`);

        if (response.ok) {
          const result = await response.json();
          if (result.data?.events?.length > 0) {
            result.data.events.forEach((event: RealtimeEvent) => {
              console.log("📨 Polling event received:", event.type);
              addEvent(event);
            });
          }
        } else {
          console.error("Polling request failed:", response.status);
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    };

    // Initial poll
    poll();

    // Set up polling interval
    pollingIntervalRef.current = setInterval(poll, pollingInterval);
  }, [
    teamId,
    projectId,
    connectionState.lastEventTimestamp,
    pollingInterval,
    addEvent,
  ]);

  const connect = useCallback(() => {
    reconnectAttemptsRef.current++;

    if (enableWebSocket && reconnectAttemptsRef.current <= reconnectAttempts) {
      connectWebSocket();
    } else if (enableSSE && reconnectAttemptsRef.current <= reconnectAttempts) {
      connectSSE();
    } else if (enablePolling) {
      startPolling();
    } else {
      setConnectionState(prev => ({
        ...prev,
        error: "All connection methods failed",
      }));
    }
  }, [
    enableWebSocket,
    enableSSE,
    enablePolling,
    reconnectAttempts,
    connectWebSocket,
    connectSSE,
    startPolling,
  ]);

  const disconnect = useCallback(() => {
    console.log("🔌 Disconnecting all real-time connections...");

    // Clean up WebSocket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Clean up SSE
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Clean up polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Clean up reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setConnectionState({
      connected: false,
      connecting: false,
      connectionType: "none",
      error: null,
    });
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (teamId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [teamId, connect, disconnect]);

  return {
    connectionState,
    events,
    lastEvent,
    connect,
    disconnect,
    sendEvent,
    clearEvents,
  };
}
