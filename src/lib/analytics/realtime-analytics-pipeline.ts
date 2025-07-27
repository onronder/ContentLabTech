/**
 * Real-time Analytics Pipeline
 * Stream processing for instant insights and decision making
 */

import { createClient, RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env-helper";
import { z } from "zod";
import { EventEmitter } from "events";

// Event schemas
const analyticsEventSchema = z.object({
  eventType: z.enum([
    "pageview",
    "engagement",
    "conversion",
    "bounce",
    "social_share",
    "content_update",
    "keyword_ranking",
    "competitor_update",
  ]),
  timestamp: z.string().datetime(),
  contentId: z.string().uuid().optional(),
  projectId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  sessionId: z.string(),
  data: z.record(z.unknown()),
  metadata: z.object({
    source: z.string(),
    userAgent: z.string().optional(),
    referrer: z.string().optional(),
    location: z
      .object({
        country: z.string().optional(),
        region: z.string().optional(),
        city: z.string().optional(),
      })
      .optional(),
  }),
});

const aggregationWindowSchema = z.object({
  windowType: z.enum(["tumbling", "sliding", "session"]),
  duration: z.number(), // milliseconds
  slide: z.number().optional(), // for sliding windows
  grace: z.number().optional(), // late arrival grace period
});

type AnalyticsEvent = z.infer<typeof analyticsEventSchema>;
type AggregationWindow = z.infer<typeof aggregationWindowSchema>;

interface StreamProcessor {
  process(event: AnalyticsEvent): Promise<void>;
  getState(): any;
  reset(): void;
}

interface AggregationResult {
  windowStart: Date;
  windowEnd: Date;
  metrics: Record<string, any>;
  metadata: {
    eventCount: number;
    processingTime: number;
    anomalies: string[];
  };
}

export class RealtimeAnalyticsPipeline extends EventEmitter {
  private supabase: ReturnType<typeof createClient>;
  private channel: RealtimeChannel | null = null;
  private processors: Map<string, StreamProcessor> = new Map();
  private aggregationBuffers: Map<string, any[]> = new Map();
  private anomalyDetectors: Map<string, any> = new Map();
  private isRunning = false;

  constructor() {
    super();
    const env = getSupabaseEnv();
    this.supabase = createClient(env.url, env.serviceRoleKey);

    this.initializeProcessors();
    this.initializeAnomalyDetection();
  }

  /**
   * Start the real-time analytics pipeline
   */
  async start(projectId: string): Promise<void> {
    if (this.isRunning) {
      return;
    }

    // Subscribe to real-time events
    this.channel = this.supabase
      .channel(`analytics:${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "content_analytics",
          filter: `project_id=eq.${projectId}`,
        },
        payload => this.handleDatabaseChange(payload)
      )
      .on("broadcast", { event: "analytics_event" }, payload =>
        this.handleBroadcastEvent(payload)
      )
      .subscribe();

    this.isRunning = true;
    this.emit("pipeline:started", { projectId });

    // Start aggregation timers
    this.startAggregationWindows();
  }

  /**
   * Stop the pipeline
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    if (this.channel) {
      await this.supabase.removeChannel(this.channel);
      this.channel = null;
    }

    this.isRunning = false;
    this.emit("pipeline:stopped");
  }

  /**
   * Process incoming analytics event
   */
  async processEvent(event: AnalyticsEvent): Promise<void> {
    const validatedEvent = analyticsEventSchema.parse(event);
    const startTime = Date.now();

    try {
      // Run through stream processors
      await Promise.all(
        Array.from(this.processors.entries()).map(async ([name, processor]) => {
          try {
            await processor.process(validatedEvent);
          } catch (error) {
            console.error(`Processor ${name} failed:`, error);
            this.emit("processor:error", { processor: name, error });
          }
        })
      );

      // Add to aggregation buffers
      this.bufferForAggregation(validatedEvent);

      // Check for anomalies
      const anomalies = await this.detectAnomalies(validatedEvent);
      if (anomalies.length > 0) {
        this.emit("anomaly:detected", { event: validatedEvent, anomalies });
      }

      // Emit processed event
      this.emit("event:processed", {
        event: validatedEvent,
        processingTime: Date.now() - startTime,
      });
    } catch (error) {
      this.emit("event:error", { event: validatedEvent, error });
    }
  }

  /**
   * Initialize stream processors
   */
  private initializeProcessors(): void {
    // Engagement processor
    this.processors.set("engagement", this.createEngagementProcessor());

    // Conversion funnel processor
    this.processors.set("conversion", this.createConversionProcessor());

    // Content performance processor
    this.processors.set("performance", this.createPerformanceProcessor());

    // Session analysis processor
    this.processors.set("session", this.createSessionProcessor());

    // Real-time SEO processor
    this.processors.set("seo", this.createSEOProcessor());
  }

  /**
   * Create engagement tracking processor
   */
  private createEngagementProcessor(): StreamProcessor {
    const state = {
      activeUsers: new Set<string>(),
      engagementScores: new Map<string, number>(),
      contentInteractions: new Map<string, number>(),
    };

    return {
      async process(event: AnalyticsEvent) {
        if (
          event.eventType === "engagement" ||
          event.eventType === "pageview"
        ) {
          if (event.userId) {
            state.activeUsers.add(event.userId);
          }

          if (event.contentId) {
            const current = state.contentInteractions.get(event.contentId) || 0;
            state.contentInteractions.set(event.contentId, current + 1);

            // Calculate engagement score
            const score = calculateEngagementScore(event);
            const currentScore =
              state.engagementScores.get(event.contentId) || 0;
            state.engagementScores.set(event.contentId, currentScore + score);
          }
        }
      },
      getState: () => ({
        activeUserCount: state.activeUsers.size,
        topContent: Array.from(state.contentInteractions.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10),
        avgEngagementScore:
          state.engagementScores.size > 0
            ? Array.from(state.engagementScores.values()).reduce(
                (a, b) => a + b,
                0
              ) / state.engagementScores.size
            : 0,
      }),
      reset: () => {
        state.activeUsers.clear();
        state.engagementScores.clear();
        state.contentInteractions.clear();
      },
    };
  }

  /**
   * Create conversion funnel processor
   */
  private createConversionProcessor(): StreamProcessor {
    const state = {
      funnelStages: new Map<string, Set<string>>(),
      conversionPaths: new Map<string, string[]>(),
      dropoffPoints: new Map<string, number>(),
    };

    return {
      async process(event: AnalyticsEvent) {
        if (!event.sessionId) return;

        // Track funnel progression
        const stage = determineFunnelStage(event);
        if (!state.funnelStages.has(stage)) {
          state.funnelStages.set(stage, new Set());
        }
        state.funnelStages.get(stage)!.add(event.sessionId);

        // Track conversion paths
        const currentPath = state.conversionPaths.get(event.sessionId) || [];
        currentPath.push(stage);
        state.conversionPaths.set(event.sessionId, currentPath);

        // Detect dropoffs
        if (event.eventType === "bounce") {
          const lastStage = currentPath[currentPath.length - 2] || "entry";
          state.dropoffPoints.set(
            lastStage,
            (state.dropoffPoints.get(lastStage) || 0) + 1
          );
        }
      },
      getState: () => {
        const funnelMetrics = this.calculateFunnelMetrics(state.funnelStages);
        return {
          funnelMetrics,
          topDropoffPoints: Array.from(state.dropoffPoints.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5),
          averagePathLength:
            state.conversionPaths.size > 0
              ? Array.from(state.conversionPaths.values()).reduce(
                  (sum, path) => sum + path.length,
                  0
                ) / state.conversionPaths.size
              : 0,
        };
      },
      reset: () => {
        state.funnelStages.clear();
        state.conversionPaths.clear();
        state.dropoffPoints.clear();
      },
    };
  }

  /**
   * Create content performance processor
   */
  private createPerformanceProcessor(): StreamProcessor {
    const state = {
      contentMetrics: new Map<string, any>(),
      trendingContent: new Map<string, number>(),
      performanceAlerts: [],
    };

    return {
      async process(event: AnalyticsEvent) {
        if (!event.contentId) return;

        // Update content metrics
        const metrics = state.contentMetrics.get(event.contentId) || {
          views: 0,
          engagements: 0,
          shares: 0,
          avgTimeOnPage: 0,
          bounceRate: 0,
        };

        switch (event.eventType) {
          case "pageview":
            metrics.views++;
            break;
          case "engagement":
            metrics.engagements++;
            metrics.avgTimeOnPage = updateMovingAverage(
              metrics.avgTimeOnPage,
              (event.data.timeOnPage as number) || 0,
              metrics.views
            );
            break;
          case "social_share":
            metrics.shares++;
            break;
          case "bounce":
            metrics.bounceRate = updateMovingAverage(
              metrics.bounceRate,
              1,
              metrics.views
            );
            break;
        }

        state.contentMetrics.set(event.contentId, metrics);

        // Update trending score
        const trendScore = calculateTrendScore(metrics, event);
        state.trendingContent.set(event.contentId, trendScore);

        // Check for performance alerts
        if (trendScore > 0.8) {
          (state.performanceAlerts as any[]).push({
            type: "trending",
            contentId: event.contentId,
            score: trendScore,
            timestamp: new Date(),
          });
        }
      },
      getState: () => ({
        topPerformers: Array.from(state.contentMetrics.entries())
          .map(([id, metrics]) => ({ id, ...metrics }))
          .sort((a, b) => b.engagements - a.engagements)
          .slice(0, 10),
        trending: Array.from(state.trendingContent.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([id, score]) => ({ contentId: id, trendScore: score })),
        alerts: state.performanceAlerts.slice(-10),
      }),
      reset: () => {
        state.contentMetrics.clear();
        state.trendingContent.clear();
        state.performanceAlerts = [];
      },
    };
  }

  /**
   * Create session analysis processor
   */
  private createSessionProcessor(): StreamProcessor {
    const state = {
      activeSessions: new Map<string, any>(),
      sessionMetrics: {
        avgDuration: 0,
        avgPageViews: 0,
        avgEngagement: 0,
      },
      userJourneys: new Map<string, any[]>(),
    };

    return {
      async process(event: AnalyticsEvent) {
        const session = state.activeSessions.get(event.sessionId) || {
          startTime: new Date(event.timestamp),
          lastActivity: new Date(event.timestamp),
          pageViews: 0,
          events: [],
          userId: event.userId,
        };

        session.lastActivity = new Date(event.timestamp);
        session.pageViews += event.eventType === "pageview" ? 1 : 0;
        session.events.push({
          type: event.eventType,
          timestamp: event.timestamp,
          contentId: event.contentId,
        });

        state.activeSessions.set(event.sessionId, session);

        // Update user journey
        if (event.userId && event.contentId) {
          const journey = state.userJourneys.get(event.userId) || [];
          journey.push({
            contentId: event.contentId,
            timestamp: event.timestamp,
            action: event.eventType,
          });
          state.userJourneys.set(event.userId, journey);
        }
      },
      getState: () => {
        const sessions = Array.from(state.activeSessions.values());
        return {
          activeSessions: state.activeSessions.size,
          metrics: {
            avgDuration:
              sessions.length > 0
                ? sessions.reduce(
                    (sum, s) => sum + (s.lastActivity - s.startTime),
                    0
                  ) /
                  sessions.length /
                  1000
                : 0,
            avgPageViews:
              sessions.length > 0
                ? sessions.reduce((sum, s) => sum + s.pageViews, 0) /
                  sessions.length
                : 0,
          },
          topJourneyPatterns: this.analyzeJourneyPatterns(state.userJourneys),
        };
      },
      reset: () => {
        state.activeSessions.clear();
        state.userJourneys.clear();
      },
    };
  }

  /**
   * Create real-time SEO processor
   */
  private createSEOProcessor(): StreamProcessor {
    const state = {
      keywordPerformance: new Map<string, any>(),
      organicTraffic: new Map<string, number>(),
      rankingChanges: [],
    };

    return {
      async process(event: AnalyticsEvent) {
        if (event.eventType === "keyword_ranking") {
          const { keyword, position, previousPosition } = event.data as any;

          state.keywordPerformance.set(keyword, {
            currentPosition: position,
            previousPosition,
            change: previousPosition - position,
            lastUpdate: event.timestamp,
          });

          if (Math.abs(previousPosition - position) > 3) {
            (state.rankingChanges as any[]).push({
              keyword,
              change: previousPosition - position,
              timestamp: event.timestamp,
            });
          }
        }

        if (
          event.eventType === "pageview" &&
          event.metadata?.source === "organic"
        ) {
          const date = new Date(event.timestamp).toISOString().split("T")[0];
          state.organicTraffic.set(
            date,
            (state.organicTraffic.get(date) || 0) + 1
          );
        }
      },
      getState: () => ({
        topKeywords: Array.from(state.keywordPerformance.entries())
          .map(([keyword, data]) => ({ keyword, ...data }))
          .sort((a, b) => a.currentPosition - b.currentPosition)
          .slice(0, 20),
        rankingChanges: state.rankingChanges.slice(-20),
        organicTrafficTrend: Array.from(state.organicTraffic.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(-7),
      }),
      reset: () => {
        state.keywordPerformance.clear();
        state.organicTraffic.clear();
        state.rankingChanges = [];
      },
    };
  }

  /**
   * Initialize anomaly detection
   */
  private initializeAnomalyDetection(): void {
    // Traffic anomaly detector
    this.anomalyDetectors.set("traffic", {
      baseline: new Map<string, number>(),
      threshold: 2.5, // standard deviations
      detect: (event: AnalyticsEvent) => {
        // Simplified anomaly detection
        return [];
      },
    });

    // Engagement anomaly detector
    this.anomalyDetectors.set("engagement", {
      patterns: new Map<string, any>(),
      detect: (event: AnalyticsEvent) => {
        // Pattern-based anomaly detection
        return [];
      },
    });

    // Conversion anomaly detector
    this.anomalyDetectors.set("conversion", {
      expectedRates: new Map<string, number>(),
      detect: (event: AnalyticsEvent) => {
        // Conversion rate anomaly detection
        return [];
      },
    });
  }

  /**
   * Detect anomalies in real-time
   */
  private async detectAnomalies(event: AnalyticsEvent): Promise<string[]> {
    const anomalies: string[] = [];

    for (const [name, detector] of Array.from(
      this.anomalyDetectors.entries()
    )) {
      const detected = detector.detect(event);
      if (detected.length > 0) {
        anomalies.push(...detected.map((a: any) => `${name}: ${a}`));
      }
    }

    return anomalies;
  }

  /**
   * Buffer events for aggregation
   */
  private bufferForAggregation(event: AnalyticsEvent): void {
    const windows = ["1m", "5m", "15m", "1h"];

    for (const window of windows) {
      const buffer = this.aggregationBuffers.get(window) || [];
      buffer.push(event);
      this.aggregationBuffers.set(window, buffer);
    }
  }

  /**
   * Start aggregation window timers
   */
  private startAggregationWindows(): void {
    // 1-minute aggregation
    setInterval(() => this.performAggregation("1m", 60000), 60000);

    // 5-minute aggregation
    setInterval(() => this.performAggregation("5m", 300000), 300000);

    // 15-minute aggregation
    setInterval(() => this.performAggregation("15m", 900000), 900000);

    // 1-hour aggregation
    setInterval(() => this.performAggregation("1h", 3600000), 3600000);
  }

  /**
   * Perform window aggregation
   */
  private async performAggregation(
    window: string,
    duration: number
  ): Promise<void> {
    const buffer = this.aggregationBuffers.get(window) || [];
    if (buffer.length === 0) return;

    const windowEnd = new Date();
    const windowStart = new Date(windowEnd.getTime() - duration);

    // Filter events within window
    const windowEvents = buffer.filter(e => {
      const eventTime = new Date(e.timestamp);
      return eventTime >= windowStart && eventTime <= windowEnd;
    });

    // Compute aggregations
    const result: AggregationResult = {
      windowStart,
      windowEnd,
      metrics: this.computeAggregateMetrics(windowEvents),
      metadata: {
        eventCount: windowEvents.length,
        processingTime: Date.now() - windowEnd.getTime(),
        anomalies: [],
      },
    };

    // Store aggregation result
    await this.storeAggregation(window, result);

    // Emit aggregation completed
    this.emit("aggregation:completed", { window, result });

    // Clean buffer
    this.aggregationBuffers.set(
      window,
      buffer.filter(e => new Date(e.timestamp) > windowEnd)
    );
  }

  /**
   * Compute aggregate metrics
   */
  private computeAggregateMetrics(
    events: AnalyticsEvent[]
  ): Record<string, any> {
    const metrics: Record<string, any> = {
      totalEvents: events.length,
      uniqueUsers: new Set(events.map(e => e.userId).filter(Boolean)).size,
      uniqueSessions: new Set(events.map(e => e.sessionId)).size,
      eventBreakdown: {},
    };

    // Count by event type
    for (const event of events) {
      metrics.eventBreakdown[event.eventType] =
        (metrics.eventBreakdown[event.eventType] || 0) + 1;
    }

    // Content metrics
    const contentEvents = events.filter(e => e.contentId);
    if (contentEvents.length > 0) {
      metrics.contentMetrics = {
        totalViews: contentEvents.filter(e => e.eventType === "pageview")
          .length,
        uniqueContent: new Set(contentEvents.map(e => e.contentId)).size,
        avgEngagementTime:
          contentEvents
            .filter(e => e.data.timeOnPage)
            .reduce((sum, e) => sum + (e.data.timeOnPage as number), 0) /
            contentEvents.length || 0,
      };
    }

    return metrics;
  }

  /**
   * Store aggregation result
   */
  private async storeAggregation(
    window: string,
    result: AggregationResult
  ): Promise<void> {
    try {
      await this.supabase.from("analytics_aggregations").insert({
        aggregation_type: `realtime_${window}`,
        time_period: result.windowStart.toISOString().split("T")[0],
        granularity: this.windowToGranularity(window),
        metrics: result.metrics,
        metadata: result.metadata,
        processing_duration_ms: result.metadata.processingTime,
      });
    } catch (error) {
      console.error("Failed to store aggregation:", error);
    }
  }

  /**
   * Handle database changes
   */
  private async handleDatabaseChange(payload: any): Promise<void> {
    // Convert DB change to analytics event
    const event: AnalyticsEvent = {
      eventType: "content_update",
      timestamp: new Date().toISOString(),
      projectId: payload.new.project_id,
      contentId: payload.new.content_id,
      sessionId: `db_${Date.now()}`,
      data: payload.new,
      metadata: {
        source: "database_change",
      },
    };

    await this.processEvent(event);
  }

  /**
   * Handle broadcast events
   */
  private async handleBroadcastEvent(payload: any): Promise<void> {
    try {
      const event = analyticsEventSchema.parse(payload.payload);
      await this.processEvent(event);
    } catch (error) {
      console.error("Invalid broadcast event:", error);
    }
  }

  // Helper methods
  private determineFunnelStage(event: AnalyticsEvent): string {
    const stageMap: Record<string, string> = {
      pageview: "awareness",
      engagement: "interest",
      social_share: "consideration",
      conversion: "conversion",
    };
    return stageMap[event.eventType] || "unknown";
  }

  private calculateFunnelMetrics(stages: Map<string, Set<string>>): any {
    const stageOrder = ["awareness", "interest", "consideration", "conversion"];
    const metrics: any = {};

    let previousCount = 0;
    for (const stage of stageOrder) {
      const count = stages.get(stage)?.size || 0;
      metrics[stage] = {
        count,
        conversionRate: previousCount > 0 ? (count / previousCount) * 100 : 100,
      };
      previousCount = count;
    }

    return metrics;
  }

  private calculateTrendScore(metrics: any, event: AnalyticsEvent): number {
    // Simplified trending score based on recent activity
    const recencyWeight = 0.5;
    const engagementWeight = 0.3;
    const shareWeight = 0.2;

    const recencyScore = 1; // Would decay over time
    const engagementScore = Math.min(metrics.engagements / 100, 1);
    const shareScore = Math.min(metrics.shares / 10, 1);

    return (
      recencyScore * recencyWeight +
      engagementScore * engagementWeight +
      shareScore * shareWeight
    );
  }

  private analyzeJourneyPatterns(journeys: Map<string, any[]>): any[] {
    // Simplified journey pattern analysis
    const patterns = new Map<string, number>();

    for (const journey of Array.from(journeys.values())) {
      if (journey.length >= 2) {
        for (let i = 0; i < journey.length - 1; i++) {
          const pattern = `${journey[i].contentId} -> ${journey[i + 1].contentId}`;
          patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
        }
      }
    }

    return Array.from(patterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([pattern, count]) => ({ pattern, count }));
  }

  private windowToGranularity(window: string): string {
    const map: Record<string, string> = {
      "1m": "hourly",
      "5m": "hourly",
      "15m": "hourly",
      "1h": "daily",
    };
    return map[window] || "hourly";
  }

  /**
   * Get current pipeline state
   */
  getState(): any {
    const state: any = {
      isRunning: this.isRunning,
      processors: {},
    };

    for (const [name, processor] of Array.from(this.processors.entries())) {
      state.processors[name] = processor.getState();
    }

    return state;
  }

  /**
   * Send analytics event
   */
  async sendEvent(event: Partial<AnalyticsEvent>): Promise<void> {
    const fullEvent: AnalyticsEvent = {
      eventType: event.eventType || "pageview",
      timestamp: event.timestamp || new Date().toISOString(),
      projectId: event.projectId!,
      sessionId: event.sessionId || `session_${Date.now()}`,
      data: event.data || {},
      metadata: {
        source: "application",
        ...event.metadata,
      },
    };

    if (this.channel) {
      await this.channel.send({
        type: "broadcast",
        event: "analytics_event",
        payload: fullEvent,
      });
    }

    await this.processEvent(fullEvent);
  }
}

// Helper functions
function calculateEngagementScore(event: AnalyticsEvent): number {
  let score = 0;

  if (event.eventType === "pageview") score = 1;
  if (event.eventType === "engagement") {
    const timeOnPage = (event.data.timeOnPage as number) || 0;
    score = Math.min(timeOnPage / 60, 10); // Max 10 points for 10+ minutes
  }
  if (event.eventType === "social_share") score = 5;
  if (event.eventType === "conversion") score = 10;

  return score;
}

function updateMovingAverage(
  current: number,
  newValue: number,
  count: number
): number {
  return (current * (count - 1) + newValue) / count;
}

function determineFunnelStage(event: AnalyticsEvent): string {
  const stageMap: Record<string, string> = {
    pageview: "awareness",
    engagement: "interest",
    social_share: "consideration",
    conversion: "conversion",
  };
  return stageMap[event.eventType] || "unknown";
}

function calculateTrendScore(metrics: any, event: AnalyticsEvent): number {
  // Simplified trending score based on recent activity
  const recencyWeight = 0.5;
  const engagementWeight = 0.3;
  const shareWeight = 0.2;

  const recencyScore = 1; // Would decay over time
  const engagementScore = Math.min(metrics.engagements / 100, 1);
  const shareScore = Math.min(metrics.shares / 10, 1);

  return (
    recencyScore * recencyWeight +
    engagementScore * engagementWeight +
    shareScore * shareWeight
  );
}

// Export singleton instance
export const realtimeAnalyticsPipeline = new RealtimeAnalyticsPipeline();
