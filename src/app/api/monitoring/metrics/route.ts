/**
 * Success Metrics API Endpoint
 * Handles user engagement and performance metrics collection
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

interface MetricsPayload {
  engagement: {
    sessionDuration: number;
    pageViews: number;
    interactions: number;
    scrollDepth: number;
    timeOnPage: number;
    bounceRate: number;
    returnVisitor: boolean;
  };
  performance: {
    loadTime: number;
    timeToInteractive: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    cumulativeLayoutShift: number;
    firstInputDelay: number;
  };
  conversions: {
    funnelCompletions: Record<string, number>;
    conversionRates: Record<string, number>;
    dropoffPoints: Record<string, number>;
    averageTimeToConvert: Record<string, number>;
  };
  userActions: Array<{
    id: string;
    type:
      | "click"
      | "form_submit"
      | "navigation"
      | "scroll"
      | "hover"
      | "focus"
      | "keypress";
    element?: string;
    component?: string;
    value?: string | number;
    timestamp: number;
    sessionId: string;
    userId?: string;
    metadata?: Record<string, unknown>;
  }>;
  heatmapData: Array<{
    x: number;
    y: number;
    intensity: number;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const payload: MetricsPayload = await request.json();

    // Extract session info from user actions
    const sessionId = payload.userActions[0]?.sessionId || generateSessionId();
    const userId = payload.userActions[0]?.userId;
    const timestamp = new Date().toISOString();

    // Store engagement metrics
    const engagementData = {
      session_id: sessionId,
      user_id: userId,
      session_duration: payload.engagement.sessionDuration,
      page_views: payload.engagement.pageViews,
      interactions: payload.engagement.interactions,
      scroll_depth: payload.engagement.scrollDepth,
      time_on_page: payload.engagement.timeOnPage,
      bounce_rate: payload.engagement.bounceRate,
      return_visitor: payload.engagement.returnVisitor,
      created_at: timestamp,
      updated_at: timestamp,
    };

    const { error: engagementError } = await supabase
      .from("engagement_metrics")
      .upsert(engagementData, {
        onConflict: "session_id",
        ignoreDuplicates: false,
      });

    if (engagementError) {
      console.error("Error storing engagement metrics:", engagementError);
    }

    // Store performance metrics
    const performanceData = {
      session_id: sessionId,
      user_id: userId,
      load_time: payload.performance.loadTime,
      time_to_interactive: payload.performance.timeToInteractive,
      first_contentful_paint: payload.performance.firstContentfulPaint,
      largest_contentful_paint: payload.performance.largestContentfulPaint,
      cumulative_layout_shift: payload.performance.cumulativeLayoutShift,
      first_input_delay: payload.performance.firstInputDelay,
      created_at: timestamp,
    };

    const { error: performanceError } = await supabase
      .from("performance_metrics")
      .upsert(performanceData, {
        onConflict: "session_id",
        ignoreDuplicates: false,
      });

    if (performanceError) {
      console.error("Error storing performance metrics:", performanceError);
    }

    // Store conversion metrics
    const conversionData = {
      session_id: sessionId,
      user_id: userId,
      funnel_completions: payload.conversions.funnelCompletions,
      conversion_rates: payload.conversions.conversionRates,
      dropoff_points: payload.conversions.dropoffPoints,
      average_time_to_convert: payload.conversions.averageTimeToConvert,
      created_at: timestamp,
      updated_at: timestamp,
    };

    const { error: conversionError } = await supabase
      .from("conversion_metrics")
      .upsert(conversionData, {
        onConflict: "session_id",
        ignoreDuplicates: false,
      });

    if (conversionError) {
      console.error("Error storing conversion metrics:", conversionError);
    }

    // Store user actions (batch insert for recent actions only)
    if (payload.userActions.length > 0) {
      const recentActions = payload.userActions.slice(-20); // Last 20 actions
      const actionData = recentActions.map(action => ({
        id: action.id,
        session_id: action.sessionId,
        user_id: action.userId,
        action_type: action.type,
        element: action.element,
        component: action.component,
        value: action.value?.toString(),
        metadata: action.metadata,
        timestamp: new Date(action.timestamp).toISOString(),
        created_at: timestamp,
      }));

      const { error: actionsError } = await supabase
        .from("user_actions")
        .insert(actionData);

      if (actionsError) {
        console.error("Error storing user actions:", actionsError);
      }
    }

    // Store heatmap data (aggregate and sample)
    if (payload.heatmapData.length > 0) {
      const sampledHeatmap = sampleHeatmapData(payload.heatmapData, 100); // Limit to 100 points
      const heatmapData = sampledHeatmap.map(point => ({
        session_id: sessionId,
        user_id: userId,
        x_position: point.x,
        y_position: point.y,
        intensity: point.intensity,
        created_at: timestamp,
      }));

      const { error: heatmapError } = await supabase
        .from("heatmap_data")
        .insert(heatmapData);

      if (heatmapError) {
        console.error("Error storing heatmap data:", heatmapError);
      }
    }

    // Update real-time aggregations
    await updateMetricsAggregations(sessionId, payload);

    // Check for performance alerts
    await checkPerformanceAlerts(payload.performance);

    return NextResponse.json({
      success: true,
      sessionId,
      timestamp,
      processed: {
        engagement: true,
        performance: true,
        conversions: true,
        actions: payload.userActions.length,
        heatmap: payload.heatmapData.length,
      },
    });
  } catch (error) {
    console.error("Error processing metrics request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const userId = searchParams.get("userId");
    const timeRange = searchParams.get("timeRange") || "24h";
    const metricType = searchParams.get("type") || "all";

    // Calculate time range
    const timeRangeMap = {
      "1h": 1,
      "24h": 24,
      "7d": 24 * 7,
      "30d": 24 * 30,
    };

    const hoursBack =
      timeRangeMap[timeRange as keyof typeof timeRangeMap] || 24;
    const startTime = new Date(
      Date.now() - hoursBack * 60 * 60 * 1000
    ).toISOString();

    const responseData: any = {};

    // Fetch engagement metrics
    if (metricType === "all" || metricType === "engagement") {
      let engagementQuery = supabase
        .from("engagement_metrics")
        .select("*")
        .gte("created_at", startTime)
        .order("created_at", { ascending: false });

      if (sessionId)
        engagementQuery = engagementQuery.eq("session_id", sessionId);
      if (userId) engagementQuery = engagementQuery.eq("user_id", userId);

      const { data: engagement } = await engagementQuery;
      responseData.engagement = engagement;
    }

    // Fetch performance metrics
    if (metricType === "all" || metricType === "performance") {
      let performanceQuery = supabase
        .from("performance_metrics")
        .select("*")
        .gte("created_at", startTime)
        .order("created_at", { ascending: false });

      if (sessionId)
        performanceQuery = performanceQuery.eq("session_id", sessionId);
      if (userId) performanceQuery = performanceQuery.eq("user_id", userId);

      const { data: performance } = await performanceQuery;
      responseData.performance = performance;
    }

    // Fetch conversion metrics
    if (metricType === "all" || metricType === "conversions") {
      let conversionQuery = supabase
        .from("conversion_metrics")
        .select("*")
        .gte("created_at", startTime)
        .order("created_at", { ascending: false });

      if (sessionId)
        conversionQuery = conversionQuery.eq("session_id", sessionId);
      if (userId) conversionQuery = conversionQuery.eq("user_id", userId);

      const { data: conversions } = await conversionQuery;
      responseData.conversions = conversions;
    }

    // Fetch aggregations
    if (metricType === "all" || metricType === "aggregations") {
      const { data: aggregations } = await supabase
        .from("metrics_aggregations")
        .select("*")
        .gte("updated_at", startTime)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      responseData.aggregations = aggregations;
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching metrics data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper functions

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function sampleHeatmapData(
  data: Array<{ x: number; y: number; intensity: number }>,
  maxPoints: number
) {
  if (data.length <= maxPoints) return data;

  // Sort by intensity and take top points, then add some random sampling
  const sorted = data.sort((a, b) => b.intensity - a.intensity);
  const topPoints = sorted.slice(0, Math.floor(maxPoints * 0.7));
  const randomPoints = sorted
    .slice(Math.floor(maxPoints * 0.7))
    .sort(() => Math.random() - 0.5)
    .slice(0, maxPoints - topPoints.length);

  return [...topPoints, ...randomPoints];
}

async function updateMetricsAggregations(
  sessionId: string,
  payload: MetricsPayload
) {
  try {
    const aggregation = {
      session_id: sessionId,
      total_sessions: 1,
      total_page_views: payload.engagement.pageViews,
      total_interactions: payload.engagement.interactions,
      average_session_duration: payload.engagement.sessionDuration,
      average_scroll_depth: payload.engagement.scrollDepth,
      bounce_rate: payload.engagement.bounceRate,
      return_visitor_rate: payload.engagement.returnVisitor ? 1 : 0,

      // Performance averages
      average_load_time: payload.performance.loadTime,
      average_fcp: payload.performance.firstContentfulPaint,
      average_lcp: payload.performance.largestContentfulPaint,
      average_fid: payload.performance.firstInputDelay,

      // Action breakdown
      actions_by_type: payload.userActions.reduce(
        (acc: Record<string, number>, action) => {
          acc[action.type] = (acc[action.type] || 0) + 1;
          return acc;
        },
        {}
      ),

      updated_at: new Date().toISOString(),
    };

    await supabase.from("metrics_aggregations").upsert(aggregation, {
      onConflict: "session_id",
      ignoreDuplicates: false,
    });
  } catch (error) {
    console.error("Failed to update metrics aggregations:", error);
  }
}

async function checkPerformanceAlerts(
  performance: MetricsPayload["performance"]
) {
  const alerts = [];

  // Check Core Web Vitals thresholds
  if (performance.loadTime > 3000) {
    alerts.push({
      type: "performance",
      severity: "warning",
      message: `Slow load time detected: ${(performance.loadTime / 1000).toFixed(2)}s`,
      threshold: "3s",
    });
  }

  if (performance.firstContentfulPaint > 1800) {
    alerts.push({
      type: "performance",
      severity: "warning",
      message: `Slow First Contentful Paint: ${(performance.firstContentfulPaint / 1000).toFixed(2)}s`,
      threshold: "1.8s",
    });
  }

  if (performance.largestContentfulPaint > 2500) {
    alerts.push({
      type: "performance",
      severity: "warning",
      message: `Slow Largest Contentful Paint: ${(performance.largestContentfulPaint / 1000).toFixed(2)}s`,
      threshold: "2.5s",
    });
  }

  if (performance.firstInputDelay > 100) {
    alerts.push({
      type: "performance",
      severity: "warning",
      message: `High First Input Delay: ${performance.firstInputDelay.toFixed(0)}ms`,
      threshold: "100ms",
    });
  }

  if (performance.cumulativeLayoutShift > 0.1) {
    alerts.push({
      type: "performance",
      severity: "warning",
      message: `High Cumulative Layout Shift: ${performance.cumulativeLayoutShift.toFixed(3)}`,
      threshold: "0.1",
    });
  }

  // Store alerts if any
  if (alerts.length > 0) {
    console.warn("Performance alerts detected:", alerts);

    // You could store these in a separate alerts table or send notifications
    try {
      await supabase.from("performance_alerts").insert(
        alerts.map(alert => ({
          ...alert,
          created_at: new Date().toISOString(),
        }))
      );
    } catch (error) {
      console.error("Failed to store performance alerts:", error);
    }
  }
}
