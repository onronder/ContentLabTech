/**
 * WebSocket Connection Hook
 * React hook for real-time WebSocket connections with automatic reconnection
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import type {
  UpdateEvent,
  Subscription,
} from "@/lib/realtime/websocket-manager";

interface WebSocketConfig {
  url?: string;
  userId?: string;
  projectId?: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

interface ConnectionState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  reconnectAttempt: number;
}

interface UseWebSocketReturn {
  connectionState: ConnectionState;
  lastEvent: UpdateEvent | null;
  eventHistory: UpdateEvent[];
  connect: () => void;
  disconnect: () => void;
  subscribe: (subscription: Omit<Subscription, "id">) => Promise<string>;
  unsubscribe: (subscriptionId: string) => void;
  clearHistory: () => void;
  sendMessage: (event: string, data: any) => void;
}

export function useWebSocketConnection(
  config: WebSocketConfig = {}
): UseWebSocketReturn {
  const {
    url = process.env["NEXT_PUBLIC_WEBSOCKET_URL"] || "ws://localhost:3001",
    userId,
    projectId,
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 2000,
  } = config;

  // State
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    connected: false,
    connecting: false,
    error: null,
    reconnectAttempt: 0,
  });

  const [lastEvent, setLastEvent] = useState<UpdateEvent | null>(null);
  const [eventHistory, setEventHistory] = useState<UpdateEvent[]>([]);

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionsRef = useRef<Map<string, Subscription>>(new Map());
  const eventCallbacksRef = useRef<Map<string, (event: UpdateEvent) => void>>(
    new Map()
  );

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log("WebSocket already connected");
      return;
    }

    setConnectionState(prev => ({ ...prev, connecting: true, error: null }));

    try {
      const socket = io(url, {
        auth: {
          userId,
          projectId,
        },
        query: {
          userId,
          projectId,
        },
        transports: ["websocket", "polling"],
        timeout: 20000,
        forceNew: true,
      });

      socketRef.current = socket;
      setupSocketEventHandlers(socket);
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      setConnectionState(prev => ({
        ...prev,
        connecting: false,
        error: error instanceof Error ? error.message : "Connection failed",
      }));
    }
  }, [url, userId, projectId]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setConnectionState({
      connected: false,
      connecting: false,
      error: null,
      reconnectAttempt: 0,
    });
  }, []);

  /**
   * Subscribe to specific events
   */
  const subscribe = useCallback(
    async (subscription: Omit<Subscription, "id">): Promise<string> => {
      return new Promise((resolve, reject) => {
        if (!socketRef.current?.connected) {
          reject(new Error("WebSocket not connected"));
          return;
        }

        const subscriptionId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Store subscription
        subscriptionsRef.current.set(
          subscriptionId,
          subscription as Subscription
        );

        // Send subscription request
        socketRef.current.emit("subscribe", subscription);

        // Listen for confirmation
        const handleSubscribed = (data: {
          subscriptionId: string;
          subscription: Subscription;
        }) => {
          if (data.subscriptionId) {
            resolve(data.subscriptionId);
          } else {
            resolve(subscriptionId);
          }
          socketRef.current?.off("subscribed", handleSubscribed);
        };

        const handleError = (error: { message: string }) => {
          reject(new Error(error.message));
          socketRef.current?.off("error", handleError);
        };

        socketRef.current.on("subscribed", handleSubscribed);
        socketRef.current.on("error", handleError);

        // Timeout after 10 seconds
        setTimeout(() => {
          socketRef.current?.off("subscribed", handleSubscribed);
          socketRef.current?.off("error", handleError);
          reject(new Error("Subscription timeout"));
        }, 10000);
      });
    },
    []
  );

  /**
   * Unsubscribe from events
   */
  const unsubscribe = useCallback((subscriptionId: string) => {
    if (!socketRef.current?.connected) {
      console.warn("WebSocket not connected");
      return;
    }

    subscriptionsRef.current.delete(subscriptionId);
    socketRef.current.emit("unsubscribe", { subscriptionId });
  }, []);

  /**
   * Clear event history
   */
  const clearHistory = useCallback(() => {
    setEventHistory([]);
    setLastEvent(null);
  }, []);

  /**
   * Send message to server
   */
  const sendMessage = useCallback((event: string, data: any) => {
    if (!socketRef.current?.connected) {
      console.warn("WebSocket not connected");
      return;
    }

    socketRef.current.emit(event, data);
  }, []);

  /**
   * Setup socket event handlers
   */
  const setupSocketEventHandlers = useCallback(
    (socket: Socket) => {
      // Connection events
      socket.on("connect", () => {
        console.log("WebSocket connected");
        setConnectionState({
          connected: true,
          connecting: false,
          error: null,
          reconnectAttempt: 0,
        });

        // Resubscribe to previous subscriptions
        subscriptionsRef.current.forEach((subscription, subscriptionId) => {
          socket.emit("subscribe", subscription);
        });
      });

      socket.on("disconnect", reason => {
        console.log("WebSocket disconnected:", reason);
        setConnectionState(prev => ({
          ...prev,
          connected: false,
          connecting: false,
        }));

        // Attempt reconnection if not manually disconnected
        if (reason !== "io client disconnect") {
          setConnectionState(prev => {
            if (prev.reconnectAttempt < reconnectAttempts) {
              scheduleReconnect();
            }
            return prev;
          });
        }
      });

      socket.on("connect_error", error => {
        console.error("WebSocket connection error:", error);
        setConnectionState(prev => ({
          ...prev,
          connected: false,
          connecting: false,
          error: error.message,
        }));

        scheduleReconnect();
      });

      // Update events
      socket.on("update", (event: UpdateEvent) => {
        console.log("Received WebSocket update:", event);

        setLastEvent(event);
        setEventHistory(prev => {
          const newHistory = [event, ...prev].slice(0, 100); // Keep last 100 events
          return newHistory;
        });

        // Call registered event callbacks
        eventCallbacksRef.current.forEach(callback => {
          try {
            callback(event);
          } catch (error) {
            console.error("Error in event callback:", error);
          }
        });
      });

      // Subscription events
      socket.on("subscribed", data => {
        console.log("Subscription confirmed:", data);
      });

      socket.on("unsubscribed", data => {
        console.log("Unsubscription confirmed:", data);
      });

      // Ping/pong for connection health
      socket.on("pong", () => {
        // Connection is healthy
      });

      // Error handling
      socket.on("error", error => {
        console.error("WebSocket error:", error);
        setConnectionState(prev => ({
          ...prev,
          error: error.message || "Unknown error",
        }));
      });
    },
    [reconnectAttempts]
  );

  /**
   * Schedule reconnection attempt
   */
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    setConnectionState(prev => {
      const newAttempt = prev.reconnectAttempt + 1;

      if (newAttempt <= reconnectAttempts) {
        const delay = reconnectDelay * Math.pow(2, newAttempt - 1); // Exponential backoff

        console.log(
          `Scheduling reconnection attempt ${newAttempt} in ${delay}ms`
        );

        reconnectTimeoutRef.current = setTimeout(() => {
          console.log(`Reconnection attempt ${newAttempt}`);
          connect();
        }, delay);

        return {
          ...prev,
          reconnectAttempt: newAttempt,
          connecting: true,
        };
      } else {
        console.error("Max reconnection attempts reached");
        return {
          ...prev,
          error: "Max reconnection attempts reached",
        };
      }
    });
  }, [reconnectAttempts, reconnectDelay, connect]);

  /**
   * Register event callback
   */
  const registerEventCallback = useCallback(
    (id: string, callback: (event: UpdateEvent) => void) => {
      eventCallbacksRef.current.set(id, callback);

      return () => {
        eventCallbacksRef.current.delete(id);
      };
    },
    []
  );

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Ping periodically to maintain connection
  useEffect(() => {
    if (!connectionState.connected) return;

    const pingInterval = setInterval(() => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("ping");
      }
    }, 30000); // Ping every 30 seconds

    return () => clearInterval(pingInterval);
  }, [connectionState.connected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      disconnect();
    };
  }, [disconnect]);

  return {
    connectionState,
    lastEvent,
    eventHistory,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    clearHistory,
    sendMessage,
  };
}

/**
 * Hook for subscribing to specific event types
 */
export function useWebSocketSubscription(
  eventTypes: string[],
  options: {
    filters?: Subscription["filters"];
    onEvent?: (event: UpdateEvent) => void;
    autoConnect?: boolean;
  } = {}
) {
  const { filters, onEvent, autoConnect = true } = options;
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const webSocket = useWebSocketConnection({
    autoConnect,
  });

  // Subscribe when connected
  useEffect(() => {
    if (!webSocket.connectionState.connected || isSubscribed) return;

    const subscription: Omit<Subscription, "id"> = {
      eventTypes,
      filters,
    };

    webSocket
      .subscribe(subscription)
      .then(id => {
        setSubscriptionId(id);
        setIsSubscribed(true);
        console.log(`Subscribed to events: ${eventTypes.join(", ")}`);
      })
      .catch(error => {
        console.error("Failed to subscribe:", error);
      });
  }, [
    webSocket.connectionState.connected,
    eventTypes,
    filters,
    isSubscribed,
    webSocket,
  ]);

  // Handle events
  useEffect(() => {
    if (onEvent && webSocket.lastEvent) {
      // Check if event matches our subscription
      if (eventTypes.includes(webSocket.lastEvent.type)) {
        onEvent(webSocket.lastEvent);
      }
    }
  }, [webSocket.lastEvent, eventTypes, onEvent]);

  // Cleanup subscription
  useEffect(() => {
    return () => {
      if (subscriptionId) {
        webSocket.unsubscribe(subscriptionId);
      }
    };
  }, [subscriptionId, webSocket]);

  return {
    ...webSocket,
    isSubscribed,
    subscriptionId,
  };
}
