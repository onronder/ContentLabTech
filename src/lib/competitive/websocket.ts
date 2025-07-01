/**
 * Competitive Intelligence WebSocket Service
 * Real-time monitoring and live updates for competitive analysis
 */

import type { 
  CompetitiveAnalysisResult, 
  CompetitiveAlert, 
  AnalysisStatusResponse 
} from "./types";

export interface WebSocketMessage {
  type: 'analysis_update' | 'analysis_complete' | 'alert_created' | 'competitor_change' | 'heartbeat';
  payload: unknown;
  timestamp: string;
  projectId?: string;
  userId?: string;
}

export interface AnalysisUpdateMessage extends WebSocketMessage {
  type: 'analysis_update';
  payload: {
    jobId: string;
    status: AnalysisStatusResponse;
    progress: number;
    estimatedTimeRemaining?: number;
  };
}

export interface AnalysisCompleteMessage extends WebSocketMessage {
  type: 'analysis_complete';
  payload: {
    jobId: string;
    result: CompetitiveAnalysisResult;
    summary: {
      competitorsAnalyzed: number;
      newThreats: number;
      newOpportunities: number;
      criticalFindings: string[];
    };
  };
}

export interface AlertCreatedMessage extends WebSocketMessage {
  type: 'alert_created';
  payload: {
    alert: CompetitiveAlert;
    triggerSource: 'analysis' | 'monitoring' | 'manual';
    relatedCompetitor?: string;
  };
}

export interface CompetitorChangeMessage extends WebSocketMessage {
  type: 'competitor_change';
  payload: {
    competitorId: string;
    changeType: 'added' | 'updated' | 'removed' | 'status_changed';
    changes: Record<string, unknown>;
  };
}

export interface HeartbeatMessage extends WebSocketMessage {
  type: 'heartbeat';
  payload: {
    serverTime: string;
    activeConnections: number;
    systemStatus: 'healthy' | 'degraded' | 'maintenance';
  };
}

export type CompetitiveWebSocketMessage = 
  | AnalysisUpdateMessage 
  | AnalysisCompleteMessage 
  | AlertCreatedMessage 
  | CompetitorChangeMessage 
  | HeartbeatMessage;

export interface WebSocketEventHandlers {
  onAnalysisUpdate?: (message: AnalysisUpdateMessage) => void;
  onAnalysisComplete?: (message: AnalysisCompleteMessage) => void;
  onAlertCreated?: (message: AlertCreatedMessage) => void;
  onCompetitorChange?: (message: CompetitorChangeMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onReconnect?: (attemptNumber: number) => void;
}

export interface WebSocketConfig {
  url: string;
  projectId: string;
  userId: string;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  pingTimeout?: number;
}

export class CompetitiveWebSocketService {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private handlers: WebSocketEventHandlers;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private isReconnecting = false;
  private lastPingTime = 0;

  constructor(config: WebSocketConfig, handlers: WebSocketEventHandlers = {}) {
    this.config = {
      autoReconnect: true,
      maxReconnectAttempts: 5,
      reconnectInterval: 5000,
      heartbeatInterval: 30000,
      pingTimeout: 10000,
      ...config,
    };
    this.handlers = handlers;
  }

  /**
   * Connect to the WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Construct WebSocket URL with authentication and project context
        const wsUrl = new URL(this.config.url);
        wsUrl.searchParams.set('projectId', this.config.projectId);
        wsUrl.searchParams.set('userId', this.config.userId);
        wsUrl.searchParams.set('channel', 'competitive-intelligence');

        this.ws = new WebSocket(wsUrl.toString());

        this.ws.onopen = () => {
          console.log('🔗 Connected to competitive intelligence WebSocket');
          this.reconnectAttempts = 0;
          this.isReconnecting = false;
          this.startHeartbeat();
          this.handlers.onConnect?.();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: CompetitiveWebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket connection closed:', event.code, event.reason);
          this.cleanup();
          this.handlers.onDisconnect?.();

          if (this.config.autoReconnect && !this.isReconnecting) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          const wsError = new Error('WebSocket connection error');
          this.handlers.onError?.(wsError);
          reject(wsError);
        };

        // Connection timeout
        setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.config.autoReconnect = false;
    this.cleanup();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
  }

  /**
   * Send a message to the server
   */
  send(message: Partial<WebSocketMessage>): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, cannot send message');
      return false;
    }

    try {
      const fullMessage: WebSocketMessage = {
        timestamp: new Date().toISOString(),
        projectId: this.config.projectId,
        userId: this.config.userId,
        ...message,
      } as WebSocketMessage;

      this.ws.send(JSON.stringify(fullMessage));
      return true;
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      return false;
    }
  }

  /**
   * Subscribe to specific analysis job updates
   */
  subscribeToAnalysis(jobId: string): boolean {
    return this.send({
      type: 'analysis_update',
      payload: { action: 'subscribe', jobId },
    });
  }

  /**
   * Unsubscribe from analysis job updates
   */
  unsubscribeFromAnalysis(jobId: string): boolean {
    return this.send({
      type: 'analysis_update',
      payload: { action: 'unsubscribe', jobId },
    });
  }

  /**
   * Request real-time competitor monitoring
   */
  enableCompetitorMonitoring(competitorIds: string[]): boolean {
    return this.send({
      type: 'competitor_change',
      payload: { action: 'monitor', competitorIds },
    });
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get current connection state
   */
  getConnectionState(): 'connecting' | 'open' | 'closing' | 'closed' {
    if (!this.ws) return 'closed';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'open';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'closed';
      default: return 'closed';
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: CompetitiveWebSocketMessage): void {
    switch (message.type) {
      case 'analysis_update':
        this.handlers.onAnalysisUpdate?.(message as AnalysisUpdateMessage);
        break;

      case 'analysis_complete':
        this.handlers.onAnalysisComplete?.(message as AnalysisCompleteMessage);
        break;

      case 'alert_created':
        this.handlers.onAlertCreated?.(message as AlertCreatedMessage);
        break;

      case 'competitor_change':
        this.handlers.onCompetitorChange?.(message as CompetitorChangeMessage);
        break;

      case 'heartbeat':
        this.handleHeartbeat(message as HeartbeatMessage);
        break;

      default:
        console.warn('Unknown WebSocket message type:', message);
    }
  }

  /**
   * Handle heartbeat messages
   */
  private handleHeartbeat(message: HeartbeatMessage): void {
    this.lastPingTime = Date.now();
    
    // Clear ping timeout since we received a response
    if (this.pingTimer) {
      clearTimeout(this.pingTimer);
      this.pingTimer = null;
    }

    // Log system status if degraded
    if (message.payload.systemStatus !== 'healthy') {
      console.warn('⚠️ System status:', message.payload.systemStatus);
    }
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // Send ping
        this.send({
          type: 'heartbeat',
          payload: { clientTime: new Date().toISOString() },
        });

        // Set ping timeout
        this.pingTimer = setTimeout(() => {
          console.warn('⏰ Heartbeat timeout, connection may be stale');
          if (this.config.autoReconnect) {
            this.ws?.close(1001, 'Ping timeout');
          }
        }, this.config.pingTimeout);
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= (this.config.maxReconnectAttempts || 5)) {
      console.error('🚫 Max reconnection attempts reached');
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;
    
    const delay = this.config.reconnectInterval! * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
        this.handlers.onReconnect?.(this.reconnectAttempts);
      } catch (error) {
        console.error('Reconnection failed:', error);
        this.scheduleReconnect();
      }
    }, delay);
  }

  /**
   * Cleanup timers and connections
   */
  private cleanup(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.pingTimer) {
      clearTimeout(this.pingTimer);
      this.pingTimer = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

/**
 * React hook for competitive intelligence WebSocket
 */
export function useCompetitiveWebSocket(
  config: Omit<WebSocketConfig, 'url'>,
  handlers: WebSocketEventHandlers = {}
) {
  const wsService = new CompetitiveWebSocketService(
    {
      ...config,
      url: process.env['NEXT_PUBLIC_WS_URL'] || 'ws://localhost:3001/ws',
    },
    handlers
  );

  return {
    connect: () => wsService.connect(),
    disconnect: () => wsService.disconnect(),
    send: (message: Partial<WebSocketMessage>) => wsService.send(message),
    subscribeToAnalysis: (jobId: string) => wsService.subscribeToAnalysis(jobId),
    unsubscribeFromAnalysis: (jobId: string) => wsService.unsubscribeFromAnalysis(jobId),
    enableCompetitorMonitoring: (competitorIds: string[]) => wsService.enableCompetitorMonitoring(competitorIds),
    isConnected: () => wsService.isConnected(),
    getConnectionState: () => wsService.getConnectionState(),
  };
}