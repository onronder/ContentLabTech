import { io, Socket } from "socket.io-client";

export class CompetitiveWebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private projectId: string | null = null;
  private connectionState: "disconnected" | "connecting" | "connected" =
    "disconnected";

  connect(projectId: string) {
    if (this.socket?.connected && this.projectId === projectId) return;

    // Clean up existing connection if projectId changed
    if (this.projectId !== projectId) {
      this.disconnect();
    }

    this.projectId = projectId;
    this.connectionState = "connecting";

    const url =
      process.env.NODE_ENV === "production"
        ? `wss://${window.location.host}`
        : "ws://localhost:3000";

    this.socket = io(url, {
      transports: ["websocket"],
      query: { projectId },
      timeout: 10000,
      reconnection: false, // We'll handle reconnection manually
    });

    this.socket.on("connect", () => {
      console.log("WebSocket connected for project:", projectId);
      this.reconnectAttempts = 0;
      this.connectionState = "connected";
      this.emitConnectionState("connected");
    });

    this.socket.on("disconnect", reason => {
      console.log("WebSocket disconnected:", reason);
      this.connectionState = "disconnected";
      this.emitConnectionState("disconnected");

      // Only attempt reconnection if it wasn't a manual disconnect
      if (reason !== "io client disconnect") {
        this.handleReconnect();
      }
    });

    this.socket.on("connect_error", error => {
      console.error("WebSocket connection error:", error);
      this.connectionState = "disconnected";
      this.emitConnectionState("error", error.message);
      this.handleReconnect();
    });

    // Listen for competitive intelligence updates
    this.socket.on("competitive-update", data => {
      this.handleCompetitiveUpdate(data);
    });

    this.socket.on("competitor-alert", data => {
      this.handleCompetitorAlert(data);
    });

    this.socket.on("analysis-complete", data => {
      this.handleAnalysisComplete(data);
    });

    this.socket.on("metrics-update", data => {
      this.handleMetricsUpdate(data);
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.projectId) {
      this.reconnectAttempts++;
      const delay = Math.min(
        1000 * Math.pow(2, this.reconnectAttempts - 1),
        30000
      );

      console.log(
        `Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`
      );

      setTimeout(() => {
        if (this.projectId) {
          this.connect(this.projectId);
        }
      }, delay);
    } else {
      console.error("Max reconnection attempts reached");
      this.emitConnectionState("failed");
    }
  }

  private handleCompetitiveUpdate(data: any) {
    console.log("Received competitive update:", data);
    this.emitCustomEvent("competitive-update", data);
  }

  private handleCompetitorAlert(data: any) {
    console.log("Received competitor alert:", data);
    this.emitCustomEvent("competitor-alert", data);
  }

  private handleAnalysisComplete(data: any) {
    console.log("Analysis complete:", data);
    this.emitCustomEvent("analysis-complete", data);
  }

  private handleMetricsUpdate(data: any) {
    console.log("Metrics update:", data);
    this.emitCustomEvent("metrics-update", data);
  }

  private emitCustomEvent(eventName: string, data: any) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
    }
  }

  private emitConnectionState(state: string, error?: string) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("websocket-connection-state", {
          detail: { state, error, projectId: this.projectId },
        })
      );
    }
  }

  // Subscribe to specific competitor updates
  subscribeToCompetitor(competitorId: string) {
    if (this.socket?.connected) {
      this.socket.emit("subscribe-competitor", { competitorId });
    }
  }

  // Unsubscribe from competitor updates
  unsubscribeFromCompetitor(competitorId: string) {
    if (this.socket?.connected) {
      this.socket.emit("unsubscribe-competitor", { competitorId });
    }
  }

  // Request real-time analysis
  requestAnalysis(competitorId: string, analysisType: string) {
    if (this.socket?.connected) {
      this.socket.emit("request-analysis", { competitorId, analysisType });
    }
  }

  // Get connection status
  getConnectionState() {
    return {
      state: this.connectionState,
      connected: this.socket?.connected || false,
      projectId: this.projectId,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.projectId = null;
    this.connectionState = "disconnected";
    this.reconnectAttempts = 0;
  }
}

export const competitiveWebSocket = new CompetitiveWebSocketService();
