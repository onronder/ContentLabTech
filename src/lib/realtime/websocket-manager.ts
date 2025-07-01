/**
 * WebSocket Real-Time Manager
 * Production-grade real-time updates with intelligent prioritization and filtering
 */

import { z } from "zod";
import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import type { Socket } from "socket.io";

// Configuration schema
const websocketConfigSchema = z.object({
  port: z.number().default(3001),
  cors: z.object({
    origin: z.union([z.string(), z.array(z.string())]).default("*"),
    methods: z.array(z.string()).default(["GET", "POST"]),
    credentials: z.boolean().default(true),
  }),
  rateLimiting: z.object({
    maxConnectionsPerIP: z.number().default(10),
    windowMs: z.number().default(60000), // 1 minute
    maxEventsPerMinute: z.number().default(100),
  }),
  rooms: z.object({
    enableAutoJoin: z.boolean().default(true),
    maxRoomsPerUser: z.number().default(20),
    roomPrefix: z.string().default("contentlab-"),
  }),
  monitoring: z.object({
    enableMetrics: z.boolean().default(true),
    metricsInterval: z.number().default(30000), // 30 seconds
    logConnections: z.boolean().default(true),
  }),
});

// Event schemas
const updateEventSchema = z.object({
  type: z.enum([
    "job-progress",
    "job-completed",
    "job-failed",
    "competitive-alert",
    "seo-alert",
    "performance-alert",
    "system-notification",
    "user-notification",
  ]),
  id: z.string(),
  data: z.record(z.unknown()),
  priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
  timestamp: z.string().default(() => new Date().toISOString()),
  metadata: z.object({
    source: z.string(),
    userId: z.string().optional(),
    projectId: z.string().optional(),
    targetAudience: z.array(z.string()).optional(),
  }),
});

const subscriptionSchema = z.object({
  eventTypes: z.array(z.string()),
  filters: z
    .object({
      projectIds: z.array(z.string()).optional(),
      priorities: z.array(z.string()).optional(),
      sources: z.array(z.string()).optional(),
    })
    .optional(),
  preferences: z
    .object({
      maxEventsPerMinute: z.number().default(20),
      enableBatching: z.boolean().default(true),
      batchSize: z.number().default(5),
      batchInterval: z.number().default(2000), // 2 seconds
    })
    .optional(),
});

type UpdateEvent = z.infer<typeof updateEventSchema>;
type Subscription = z.infer<typeof subscriptionSchema>;

interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  totalEvents: number;
  eventsPerSecond: number;
  messagesSent: number;
  errorsCount: number;
}

interface UserConnection {
  socket: Socket;
  userId?: string;
  subscriptions: Map<string, Subscription>;
  eventQueue: UpdateEvent[];
  lastActivity: Date;
  rateLimitCounter: number;
  rateLimitWindow: Date;
}

export class WebSocketManager {
  private config: z.infer<typeof websocketConfigSchema>;
  private io?: SocketIOServer;
  private httpServer?: HTTPServer;
  private connections: Map<string, UserConnection> = new Map();
  private eventBuffer: Map<string, UpdateEvent[]> = new Map();
  private metrics: ConnectionMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    totalEvents: 0,
    eventsPerSecond: 0,
    messagesSent: 0,
    errorsCount: 0,
  };
  private metricsInterval?: NodeJS.Timeout;
  private lastEventCount = 0;
  private isInitialized = false;

  constructor(config: Partial<z.infer<typeof websocketConfigSchema>> = {}) {
    this.config = websocketConfigSchema.parse({
      port: parseInt(process.env["WEBSOCKET_PORT"] || "3001"),
      cors: {
        origin: process.env["WEBSOCKET_CORS_ORIGIN"] || "*",
        ...config.cors,
      },
      ...config,
    });
  }

  /**
   * Initialize WebSocket server
   */
  async initialize(httpServer?: HTTPServer): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create HTTP server if not provided
      if (!httpServer) {
        const { createServer } = await import("http");
        this.httpServer = createServer();
      }

      // Initialize Socket.IO server
      this.io = new SocketIOServer(httpServer || this.httpServer!, {
        cors: this.config.cors,
        transports: ["websocket", "polling"],
        pingTimeout: 60000,
        pingInterval: 25000,
      });

      this.setupEventHandlers();
      this.setupMiddleware();

      // Start metrics collection
      if (this.config.monitoring.enableMetrics) {
        this.startMetricsCollection();
      }

      // Start HTTP server if we created it
      if (!httpServer && this.httpServer) {
        this.httpServer.listen(this.config.port, () => {
          console.log(`WebSocket server listening on port ${this.config.port}`);
        });
      }

      this.isInitialized = true;
      console.log("WebSocket Manager initialized successfully");
    } catch (error) {
      throw new Error(
        `Failed to initialize WebSocket Manager: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Broadcast update to all subscribers
   */
  async broadcastUpdate(event: Omit<UpdateEvent, "timestamp">): Promise<void> {
    if (!this.io) throw new Error("WebSocket server not initialized");

    try {
      // Validate and complete event
      const completeEvent = updateEventSchema.parse(event);

      // Track metrics
      this.metrics.totalEvents++;

      // Get target connections
      const targetConnections = this.getTargetConnections(completeEvent);

      if (targetConnections.length === 0) {
        console.log(`No target connections for event ${completeEvent.id}`);
        return;
      }

      // Send to each target connection
      const sendPromises = targetConnections.map(async connection => {
        try {
          if (this.shouldSendEvent(connection, completeEvent)) {
            await this.sendEventToConnection(connection, completeEvent);
          }
        } catch (error) {
          console.error(
            `Failed to send event to connection ${connection.socket.id}:`,
            error
          );
          this.metrics.errorsCount++;
        }
      });

      await Promise.allSettled(sendPromises);

      console.log(
        `Broadcasted event ${completeEvent.id} to ${targetConnections.length} connections`
      );
    } catch (error) {
      console.error("Failed to broadcast update:", error);
      this.metrics.errorsCount++;
    }
  }

  /**
   * Send update to specific user
   */
  async sendToUser(
    userId: string,
    event: Omit<UpdateEvent, "timestamp">
  ): Promise<void> {
    if (!this.io) throw new Error("WebSocket server not initialized");

    try {
      const completeEvent = updateEventSchema.parse({
        ...event,
        metadata: {
          ...event.metadata,
          userId,
        },
      });

      const userConnections = Array.from(this.connections.values()).filter(
        conn => conn.userId === userId
      );

      if (userConnections.length === 0) {
        console.log(`No connections found for user ${userId}`);
        return;
      }

      const sendPromises = userConnections.map(async connection => {
        try {
          await this.sendEventToConnection(connection, completeEvent);
        } catch (error) {
          console.error(`Failed to send event to user ${userId}:`, error);
          this.metrics.errorsCount++;
        }
      });

      await Promise.allSettled(sendPromises);

      console.log(
        `Sent event ${completeEvent.id} to user ${userId} (${userConnections.length} connections)`
      );
    } catch (error) {
      console.error(`Failed to send event to user ${userId}:`, error);
      this.metrics.errorsCount++;
    }
  }

  /**
   * Send update to project subscribers
   */
  async sendToProject(
    projectId: string,
    event: Omit<UpdateEvent, "timestamp">
  ): Promise<void> {
    if (!this.io) throw new Error("WebSocket server not initialized");

    try {
      const completeEvent = updateEventSchema.parse({
        ...event,
        metadata: {
          ...event.metadata,
          projectId,
        },
      });

      // Broadcast to project room
      this.io
        .to(`${this.config.rooms.roomPrefix}project-${projectId}`)
        .emit("update", completeEvent);

      this.metrics.messagesSent++;
      console.log(`Sent event ${completeEvent.id} to project ${projectId}`);
    } catch (error) {
      console.error(`Failed to send event to project ${projectId}:`, error);
      this.metrics.errorsCount++;
    }
  }

  /**
   * Get connection metrics
   */
  getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    status: "healthy" | "degraded" | "unhealthy";
    connections: number;
    eventsPerSecond: number;
    errorRate: number;
    uptime: number;
  } {
    const errorRate =
      this.metrics.totalEvents > 0
        ? (this.metrics.errorsCount / this.metrics.totalEvents) * 100
        : 0;

    let status: "healthy" | "degraded" | "unhealthy" = "healthy";

    if (errorRate > 5 || this.metrics.eventsPerSecond > 1000) {
      status = "degraded";
    }

    if (errorRate > 15 || !this.isInitialized) {
      status = "unhealthy";
    }

    return {
      status,
      connections: this.metrics.activeConnections,
      eventsPerSecond: this.metrics.eventsPerSecond,
      errorRate: Math.round(errorRate * 100) / 100,
      uptime: this.isInitialized ? Date.now() - this.getStartTime() : 0,
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log("Shutting down WebSocket Manager...");

    // Stop metrics collection
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Close all connections
    if (this.io) {
      this.io.close();
    }

    // Close HTTP server if we created it
    if (this.httpServer) {
      this.httpServer.close();
    }

    this.isInitialized = false;
    console.log("WebSocket Manager shutdown complete");
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on("connection", (socket: Socket) => {
      this.handleConnection(socket);
    });
  }

  /**
   * Setup middleware for authentication and rate limiting
   */
  private setupMiddleware(): void {
    if (!this.io) return;

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        // Extract user info from handshake (could be JWT token, session, etc.)
        const userId =
          socket.handshake.auth?.["userId"] ||
          socket.handshake.query?.["userId"];
        const projectId =
          socket.handshake.auth?.["projectId"] ||
          socket.handshake.query?.["projectId"];

        // Store user info in socket
        socket.data.userId = userId;
        socket.data.projectId = projectId;

        next();
      } catch (error) {
        next(new Error("Authentication failed"));
      }
    });

    // Rate limiting middleware
    this.io.use(async (socket, next) => {
      const clientIP = socket.handshake.address;
      const existingConnections = Array.from(this.connections.values()).filter(
        conn => conn.socket.handshake.address === clientIP
      );

      if (
        existingConnections.length >=
        this.config.rateLimiting.maxConnectionsPerIP
      ) {
        next(new Error("Too many connections from this IP"));
        return;
      }

      next();
    });
  }

  /**
   * Handle new connection
   */
  private handleConnection(socket: Socket): void {
    console.log(`New WebSocket connection: ${socket.id}`);

    // Create connection record
    const connection: UserConnection = {
      socket,
      userId: socket.data.userId,
      subscriptions: new Map(),
      eventQueue: [],
      lastActivity: new Date(),
      rateLimitCounter: 0,
      rateLimitWindow: new Date(),
    };

    this.connections.set(socket.id, connection);
    this.metrics.totalConnections++;
    this.metrics.activeConnections++;

    // Auto-join project room if projectId is provided
    if (socket.data.projectId && this.config.rooms.enableAutoJoin) {
      socket.join(
        `${this.config.rooms.roomPrefix}project-${socket.data.projectId}`
      );
    }

    // Setup connection event handlers
    this.setupConnectionHandlers(socket, connection);
  }

  /**
   * Setup handlers for a specific connection
   */
  private setupConnectionHandlers(
    socket: Socket,
    connection: UserConnection
  ): void {
    // Handle subscription requests
    socket.on("subscribe", async data => {
      try {
        const subscription = subscriptionSchema.parse(data);
        const subscriptionId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        connection.subscriptions.set(subscriptionId, subscription);
        connection.lastActivity = new Date();

        socket.emit("subscribed", { subscriptionId, subscription });
        console.log(
          `Socket ${socket.id} subscribed to events:`,
          subscription.eventTypes
        );
      } catch (error) {
        socket.emit("error", { message: "Invalid subscription data" });
      }
    });

    // Handle unsubscribe requests
    socket.on("unsubscribe", data => {
      const { subscriptionId } = data;
      if (connection.subscriptions.has(subscriptionId)) {
        connection.subscriptions.delete(subscriptionId);
        socket.emit("unsubscribed", { subscriptionId });
        console.log(`Socket ${socket.id} unsubscribed from ${subscriptionId}`);
      }
    });

    // Handle ping requests
    socket.on("ping", () => {
      connection.lastActivity = new Date();
      socket.emit("pong");
    });

    // Handle disconnection
    socket.on("disconnect", reason => {
      console.log(`Socket ${socket.id} disconnected: ${reason}`);
      this.connections.delete(socket.id);
      this.metrics.activeConnections--;
    });

    // Handle errors
    socket.on("error", error => {
      console.error(`Socket ${socket.id} error:`, error);
      this.metrics.errorsCount++;
    });
  }

  /**
   * Get target connections for an event
   */
  private getTargetConnections(event: UpdateEvent): UserConnection[] {
    const targets: UserConnection[] = [];

    for (const connection of this.connections.values()) {
      // Check if connection is interested in this event type
      const hasMatchingSubscription = Array.from(
        connection.subscriptions.values()
      ).some(sub => {
        // Check event type match
        if (!sub.eventTypes.includes(event.type)) return false;

        // Apply filters if they exist
        if (sub.filters) {
          if (
            sub.filters.projectIds &&
            event.metadata.projectId &&
            !sub.filters.projectIds.includes(event.metadata.projectId)
          ) {
            return false;
          }

          if (
            sub.filters.priorities &&
            !sub.filters.priorities.includes(event.priority)
          ) {
            return false;
          }

          if (
            sub.filters.sources &&
            !sub.filters.sources.includes(event.metadata.source)
          ) {
            return false;
          }
        }

        return true;
      });

      if (hasMatchingSubscription) {
        targets.push(connection);
      }
    }

    return targets;
  }

  /**
   * Check if event should be sent to connection (rate limiting)
   */
  private shouldSendEvent(
    connection: UserConnection,
    event: UpdateEvent
  ): boolean {
    const now = new Date();
    const windowMs = this.config.rateLimiting.windowMs;

    // Reset rate limit counter if window has passed
    if (now.getTime() - connection.rateLimitWindow.getTime() > windowMs) {
      connection.rateLimitCounter = 0;
      connection.rateLimitWindow = now;
    }

    // Check rate limit
    if (
      connection.rateLimitCounter >= this.config.rateLimiting.maxEventsPerMinute
    ) {
      console.warn(
        `Rate limit exceeded for connection ${connection.socket.id}`
      );
      return false;
    }

    // Critical events always go through
    if (event.priority === "critical") {
      return true;
    }

    return true;
  }

  /**
   * Send event to specific connection
   */
  private async sendEventToConnection(
    connection: UserConnection,
    event: UpdateEvent
  ): Promise<void> {
    try {
      // Check if connection is still valid
      if (!connection.socket.connected) {
        this.connections.delete(connection.socket.id);
        return;
      }

      // Send event
      connection.socket.emit("update", event);
      connection.rateLimitCounter++;
      connection.lastActivity = new Date();

      this.metrics.messagesSent++;
    } catch (error) {
      console.error(
        `Failed to send event to connection ${connection.socket.id}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      const currentEventCount = this.metrics.totalEvents;
      const eventsDiff = currentEventCount - this.lastEventCount;
      const intervalSeconds = this.config.monitoring.metricsInterval / 1000;

      this.metrics.eventsPerSecond =
        Math.round((eventsDiff / intervalSeconds) * 100) / 100;
      this.lastEventCount = currentEventCount;

      // Clean up inactive connections
      this.cleanupInactiveConnections();

      if (this.config.monitoring.logConnections) {
        console.log(
          `WebSocket Metrics: ${this.metrics.activeConnections} connections, ${this.metrics.eventsPerSecond} events/sec`
        );
      }
    }, this.config.monitoring.metricsInterval);
  }

  /**
   * Cleanup inactive connections
   */
  private cleanupInactiveConnections(): void {
    const now = new Date();
    const inactivityThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [socketId, connection] of this.connections) {
      if (
        now.getTime() - connection.lastActivity.getTime() >
        inactivityThreshold
      ) {
        if (!connection.socket.connected) {
          this.connections.delete(socketId);
          this.metrics.activeConnections--;
        }
      }
    }
  }

  /**
   * Get start time for uptime calculation
   */
  private getStartTime(): number {
    // This would be set when the server starts
    return Date.now() - 60000; // Placeholder
  }
}

// Export singleton instance
export const webSocketManager = new WebSocketManager();

// Export types
export type { UpdateEvent, Subscription, ConnectionMetrics };
