import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUser,
  createClient,
  validateProjectAccess,
  createErrorResponse,
} from "@/lib/auth/session";

interface TrendsRequest {
  projectId: string;
  action: "trends" | "comparison" | "forecast";
  params: {
    contentId?: string;
    contentIds?: string[];
    timeframe?: number;
    metric?:
      | "pageviews"
      | "organic_traffic"
      | "conversion_rate"
      | "engagement"
      | "all";
    granularity?: "daily" | "weekly" | "monthly";
    includePredictions?: boolean;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return createErrorResponse("Authentication required", 401);
    }

    // Parse request body
    const body: TrendsRequest = await request.json();
    const { projectId, action, params } = body;

    if (!projectId || !action) {
      return createErrorResponse("Project ID and action are required", 400);
    }

    // Validate project access
    const hasAccess = await validateProjectAccess(projectId, "viewer");
    if (!hasAccess) {
      return createErrorResponse("Insufficient permissions", 403);
    }

    const supabase = await createClient();

    let result;

    switch (action) {
      case "trends": {
        // Get historical trends for content performance
        const timeframeDays = params.timeframe || 30;
        const startDate = new Date(
          Date.now() - timeframeDays * 24 * 60 * 60 * 1000
        );

        if (params.contentId) {
          // Single content trends
          const { data: content } = await supabase
            .from("content_items")
            .select("id, title")
            .eq("id", params.contentId)
            .eq("project_id", projectId)
            .single();

          if (!content) {
            return createErrorResponse("Content not found", 404);
          }

          const { data: analytics } = await supabase
            .from("content_analytics")
            .select("*")
            .eq("content_id", params.contentId)
            .gte("date", startDate.toISOString().split("T")[0])
            .order("date", { ascending: true });

          // Get predictions for comparison
          let predictions: TrendPrediction[] = [];
          if (params.includePredictions) {
            const { data: predictionData } = await supabase
              .from("model_predictions")
              .select("prediction_data, prediction_date")
              .eq("content_id", params.contentId)
              .eq("project_id", projectId)
              .order("prediction_date", { ascending: false })
              .limit(1);

            if (predictionData?.[0]) {
              predictions = generateTrendPredictions(
                predictionData[0].prediction_data,
                timeframeDays
              );
            }
          }

          result = {
            contentId: params.contentId,
            contentTitle: content.title,
            historical: processAnalyticsData(
              analytics || [],
              params.metric,
              params.granularity
            ),
            predictions: predictions,
            timeframe: timeframeDays,
          };
        } else {
          // Project-level trends
          const { data: contents } = await supabase
            .from("content_items")
            .select("id, title")
            .eq("project_id", projectId)
            .eq("status", "published")
            .limit(50);

          if (!contents?.length) {
            result = {
              projectTrends: [],
              message: "No published content found",
            };
            break;
          }

          const contentIds = contents.map(c => c.id);

          // Get aggregated analytics
          const { data: analytics } = await supabase
            .from("content_analytics")
            .select("*")
            .in("content_id", contentIds)
            .gte("date", startDate.toISOString().split("T")[0])
            .order("date", { ascending: true });

          // Aggregate data by date
          const aggregatedData = aggregateAnalyticsByDate(analytics || []);

          result = {
            projectId,
            projectTrends: aggregatedData,
            contentCount: contents.length,
            timeframe: timeframeDays,
          };
        }

        break;
      }

      case "comparison": {
        if (!params.contentIds?.length || params.contentIds.length < 2) {
          return createErrorResponse(
            "At least 2 content IDs required for comparison",
            400
          );
        }

        // Validate all content items
        const { data: contents } = await supabase
          .from("content_items")
          .select("id, title")
          .in("id", params.contentIds)
          .eq("project_id", projectId);

        if (!contents || contents.length !== params.contentIds.length) {
          return createErrorResponse(
            "One or more content items not found",
            404
          );
        }

        const timeframeDays = params.timeframe || 30;
        const startDate = new Date(
          Date.now() - timeframeDays * 24 * 60 * 60 * 1000
        );

        // Get analytics for all content items
        const { data: analytics } = await supabase
          .from("content_analytics")
          .select("*")
          .in("content_id", params.contentIds)
          .gte("date", startDate.toISOString().split("T")[0])
          .order("date", { ascending: true });

        // Group by content ID and process
        const comparisonData = params.contentIds.map(contentId => {
          const content = contents.find(c => c.id === contentId);
          const contentAnalytics =
            analytics?.filter(a => a.content_id === contentId) || [];

          return {
            contentId,
            title: content?.title || "Unknown",
            data: processAnalyticsData(
              contentAnalytics,
              params.metric,
              params.granularity
            ),
            summary: calculateSummaryStats(contentAnalytics),
          };
        });

        result = {
          comparison: comparisonData,
          timeframe: timeframeDays,
          metric: params.metric || "all",
        };

        break;
      }

      case "forecast": {
        // Call the predictive analytics Edge Function for forecasting
        const { data: forecast, error: forecastError } =
          await supabase.functions.invoke("predictive-analytics", {
            body: {
              action: "trends",
              projectId,
              params: {
                contentId: params.contentId,
                timeframe: params.timeframe || 30,
                metric: params.metric || "pageviews",
              },
            },
          });

        if (forecastError) {
          console.error("Forecast error:", forecastError);
          return createErrorResponse("Failed to generate forecast", 500);
        }

        result = forecast?.result || { trends: [] };
        break;
      }

      default:
        return createErrorResponse("Invalid action specified", 400);
    }

    // Log analytics request
    await supabase.from("user_events").insert({
      user_id: user.id,
      event_type: "analytics_trends_viewed",
      event_data: {
        project_id: projectId,
        action,
        content_id: params.contentId,
        timeframe: params.timeframe,
        metric: params.metric,
      },
    });

    return NextResponse.json({
      success: true,
      action,
      projectId,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("API error:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return createErrorResponse("Authentication required", 401);
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const contentId = searchParams.get("contentId");
    const timeframe = parseInt(searchParams.get("timeframe") || "30");
    const metric = searchParams.get("metric") || "pageviews";

    if (!projectId) {
      return createErrorResponse("Project ID is required", 400);
    }

    // Validate project access
    const hasAccess = await validateProjectAccess(projectId, "viewer");
    if (!hasAccess) {
      return createErrorResponse("Insufficient permissions", 403);
    }

    const supabase = await createClient();
    const startDate = new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000);

    let query = supabase
      .from("content_analytics")
      .select(
        `
        *,
        content:content_items (
          id,
          title,
          url
        )
      `
      )
      .gte("date", startDate.toISOString().split("T")[0])
      .order("date", { ascending: true });

    if (contentId) {
      // Single content analytics
      query = query.eq("content_id", contentId);

      // Verify content belongs to project
      const { data: content } = await supabase
        .from("content_items")
        .select("project_id")
        .eq("id", contentId)
        .single();

      if (!content || content.project_id !== projectId) {
        return createErrorResponse("Content not found or access denied", 404);
      }
    } else {
      // Project-level analytics
      const { data: contents } = await supabase
        .from("content_items")
        .select("id")
        .eq("project_id", projectId);

      if (contents?.length) {
        query = query.in(
          "content_id",
          contents.map(c => c.id)
        );
      } else {
        return NextResponse.json({
          trends: [],
          summary: { totalMetrics: 0, avgGrowth: 0 },
          timeframe,
          metric,
        });
      }
    }

    const { data: analytics, error } = await query;

    if (error) {
      console.error("Error fetching analytics:", error);
      return createErrorResponse("Failed to fetch analytics data", 500);
    }

    // Process the data
    const processedTrends = processAnalyticsData(
      analytics || [],
      metric,
      "daily"
    );
    const summary = calculateProjectSummary(analytics || [], metric);

    return NextResponse.json({
      trends: processedTrends,
      summary,
      timeframe,
      metric,
      contentId,
      projectId,
    });
  } catch (error) {
    console.error("API error:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

// Helper functions
interface AnalyticsItem {
  date: string;
  pageviews?: number;
  unique_visitors?: number;
  organic_traffic?: number;
  conversion_rate?: number;
  bounce_rate?: number;
  avg_session_duration?: number;
  conversions?: number;
  sessions?: number;
}

interface ProcessedAnalytics {
  date: string;
  pageviews: number;
  unique_visitors: number;
  organic_traffic: number;
  conversion_rate: number;
  bounce_rate: number;
  avg_session_duration: number;
  count: number;
}

function processAnalyticsData(
  analytics: AnalyticsItem[],
  metric?: string,
  granularity: string = "daily"
): ProcessedAnalytics[] {
  if (!analytics.length) return [];

  // Group by date based on granularity
  const grouped = analytics.reduce(
    (acc: Record<string, ProcessedAnalytics>, item) => {
      let dateKey = item.date;

      if (granularity === "weekly") {
        const date = new Date(item.date);
        const weekStart = new Date(
          date.setDate(date.getDate() - date.getDay())
        );
        dateKey = weekStart.toISOString().split("T")[0] || "";
      } else if (granularity === "monthly") {
        dateKey = item.date?.substring(0, 7) || item.date; // YYYY-MM format
      }

      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          pageviews: 0,
          unique_visitors: 0,
          organic_traffic: 0,
          conversion_rate: 0,
          bounce_rate: 0,
          avg_session_duration: 0,
          count: 0,
        };
      }

      const existingEntry = acc[dateKey]!;
      existingEntry.pageviews += item.pageviews || 0;
      existingEntry.unique_visitors += item.unique_visitors || 0;
      existingEntry.organic_traffic += item.organic_traffic || 0;
      existingEntry.conversion_rate += item.conversion_rate || 0;
      existingEntry.bounce_rate += item.bounce_rate || 0;
      existingEntry.avg_session_duration += item.avg_session_duration || 0;
      existingEntry.count += 1;

      return acc;
    },
    {}
  );

  // Calculate averages for rate-based metrics
  return Object.values(grouped).map(item => ({
    ...item,
    conversion_rate: item.count > 0 ? item.conversion_rate / item.count : 0,
    bounce_rate: item.count > 0 ? item.bounce_rate / item.count : 0,
    avg_session_duration:
      item.count > 0 ? item.avg_session_duration / item.count : 0,
  }));
}

interface AggregatedData {
  date: string;
  pageviews: number;
  unique_visitors: number;
  organic_traffic: number;
  conversions: number;
  sessions: number;
  bounce_rate_sum: number;
  duration_sum: number;
  count: number;
}

interface FinalAnalytics {
  date: string;
  pageviews: number;
  unique_visitors: number;
  organic_traffic: number;
  conversion_rate: number;
  bounce_rate: number;
  avg_session_duration: number;
}

function aggregateAnalyticsByDate(
  analytics: AnalyticsItem[]
): FinalAnalytics[] {
  const dailyTotals = analytics.reduce(
    (acc: Record<string, AggregatedData>, item) => {
      const date = item.date;

      if (!acc[date]) {
        acc[date] = {
          date,
          pageviews: 0,
          unique_visitors: 0,
          organic_traffic: 0,
          conversions: 0,
          sessions: 0,
          bounce_rate_sum: 0,
          duration_sum: 0,
          count: 0,
        };
      }

      acc[date].pageviews += item.pageviews || 0;
      acc[date].unique_visitors += item.unique_visitors || 0;
      acc[date].organic_traffic += item.organic_traffic || 0;
      acc[date].conversions += item.conversions || 0;
      acc[date].sessions += item.sessions || 0;
      acc[date].bounce_rate_sum +=
        (item.bounce_rate || 0) * (item.sessions || 1);
      acc[date].duration_sum +=
        (item.avg_session_duration || 0) * (item.sessions || 1);
      acc[date].count += 1;

      return acc;
    },
    {}
  );

  return Object.values(dailyTotals).map(item => ({
    date: item.date,
    pageviews: item.pageviews,
    unique_visitors: item.unique_visitors,
    organic_traffic: item.organic_traffic,
    conversion_rate:
      item.sessions > 0 ? (item.conversions / item.sessions) * 100 : 0,
    bounce_rate: item.sessions > 0 ? item.bounce_rate_sum / item.sessions : 0,
    avg_session_duration:
      item.sessions > 0 ? item.duration_sum / item.sessions : 0,
  }));
}

interface SummaryStats {
  total: number;
  average: number;
  growth: number;
  trend: "increasing" | "decreasing" | "stable";
}

function calculateSummaryStats(analytics: AnalyticsItem[]): SummaryStats {
  if (!analytics.length) {
    return { total: 0, average: 0, growth: 0, trend: "stable" };
  }

  const sortedData = analytics.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const metricKey = "pageviews";

  const values = sortedData.map(
    item => Number(item[metricKey as keyof AnalyticsItem]) || 0
  );
  const total = values.reduce((sum, val) => sum + val, 0);
  const average = total / values.length;

  // Calculate growth rate (comparing first half vs second half)
  const midpoint = Math.floor(values.length / 2);
  const firstHalf = values.slice(0, midpoint);
  const secondHalf = values.slice(midpoint);

  const firstAvg =
    firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
  const secondAvg =
    secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

  const growth = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
  const trend =
    growth > 5 ? "increasing" : growth < -5 ? "decreasing" : "stable";

  return { total, average, growth, trend };
}

interface ProjectSummary {
  totalMetrics: number;
  avgGrowth: number;
}

function calculateProjectSummary(
  analytics: AnalyticsItem[],
  metric: string
): ProjectSummary {
  const metricKey = metric as keyof AnalyticsItem;
  const totalMetrics = analytics.reduce(
    (sum, item) => sum + (Number(item[metricKey as keyof AnalyticsItem]) || 0),
    0
  );

  const avgGrowth =
    analytics.length > 1
      ? (((Number(
          analytics[analytics.length - 1]?.[metricKey as keyof AnalyticsItem]
        ) || 0) -
          (Number(analytics[0]?.[metricKey as keyof AnalyticsItem]) || 0)) /
          Math.max(
            Number(analytics[0]?.[metricKey as keyof AnalyticsItem]) || 1,
            1
          )) *
        100
      : 0;

  return { totalMetrics, avgGrowth };
}

interface PredictionData {
  predictions?: {
    pageviews?: { predicted?: number };
    organicTraffic?: { predicted?: number };
  };
  confidenceScore?: number;
}

interface TrendPrediction {
  date: string;
  predicted_pageviews: number;
  predicted_organic_traffic: number;
  confidence: number;
}

function generateTrendPredictions(
  predictionData: PredictionData,
  timeframeDays: number
): TrendPrediction[] {
  // Generate simple trend predictions based on the ML prediction data
  const predictions: TrendPrediction[] = [];
  const startDate = new Date();

  for (let i = 1; i <= Math.min(timeframeDays, 30); i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dailyPageviews =
      (predictionData.predictions?.pageviews?.predicted || 0) / timeframeDays;
    const dailyTraffic =
      (predictionData.predictions?.organicTraffic?.predicted || 0) /
      timeframeDays;

    predictions.push({
      date: date.toISOString().split("T")[0] || date.toISOString(),
      predicted_pageviews: Math.round(dailyPageviews),
      predicted_organic_traffic: Math.round(dailyTraffic),
      confidence: predictionData.confidenceScore || 0,
    });
  }

  return predictions;
}
