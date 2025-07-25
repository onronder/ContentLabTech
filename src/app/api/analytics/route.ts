/**
 * Production Analytics API - No Mock Data
 * Enterprise-grade analytics with comprehensive data validation and quality assurance
 */

import { NextRequest } from "next/server";
import {
  withApiAuth,
  createSuccessResponse,
  validateTeamAccess,
  type AuthContext,
} from "@/lib/auth/withApiAuth-definitive";
import { etlPipeline } from "@/lib/analytics/etl-pipeline";
import { dataValidationService } from "@/lib/analytics/data-validation";

interface AnalyticsOverview {
  totalProjects: number;
  totalContent: number;
  avgSeoScore: number;
  avgPerformanceScore: number;
  totalViews: number;
  conversionRate: number;
  trendingContent: number;
  activeAlerts: number;
}

interface AnalyticsTrends {
  traffic: Array<{ date: string; views: number; conversions: number }>;
  performance: Array<{ date: string; score: number; vitals: number }>;
  content: Array<{ date: string; published: number; optimized: number }>;
}

interface AnalyticsPredictions {
  nextWeek: { traffic: number; confidence: number; confidenceInterval: [number, number] };
  nextMonth: { performance: number; confidence: number; confidenceInterval: [number, number] };
  quarterlyGoals: { onTrack: boolean; progress: number; projectedCompletion: string };
  methodology: string;
  lastUpdated: string;
}

interface AnalyticsData {
  overview: AnalyticsOverview;
  trends: AnalyticsTrends;
  predictions: AnalyticsPredictions;
}

export const GET = withApiAuth(
  async (request: NextRequest, context: AuthContext) => {
    try {
      console.log("🚀 Analytics API GET - Starting request handling");
      console.log("👤 Authenticated user:", {
        id: context.user.id,
        email: context.user.email,
      });

      const { searchParams } = new URL(request.url);
      const projectId = searchParams.get("projectId");
      const teamId = searchParams.get("teamId");
      const timeRange = searchParams.get("timeRange") || "7d";
      const fallback = searchParams.get("fallback");

      if (!projectId && !teamId) {
        return new Response(
          JSON.stringify({
            error: "Either projectId or teamId is required",
            code: "INVALID_REQUEST",
            status: 400,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      let validatedTeamId: string | null = null;
      let projectIds: string[] = [];

      // Handle team-level analytics
      if (teamId) {
        // Validate team access
        const teamAccess = await validateTeamAccess(
          context.supabase,
          context.user.id,
          teamId,
          "member"
        );
        if (!teamAccess.hasAccess) {
          return new Response(
            JSON.stringify({
              error:
                teamAccess.error ||
                "Insufficient permissions to view team analytics",
              code: "INSUFFICIENT_PERMISSIONS",
              status: 403,
            }),
            { status: 403, headers: { "Content-Type": "application/json" } }
          );
        }

        validatedTeamId = teamId;

        // Get all projects for this team
        const { data: teamProjects, error: projectsError } =
          await context.supabase
            .from("projects")
            .select("id")
            .eq("team_id", teamId);

        if (projectsError) {
          console.error("Error fetching team projects:", projectsError);
          return new Response(
            JSON.stringify({
              error: "Failed to fetch team projects",
              code: "FETCH_PROJECTS_ERROR",
              status: 500,
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }

        projectIds = teamProjects?.map((p: any) => p.id) || [];
      }

      // Handle project-level analytics
      if (projectId) {
        // Get project to determine team ownership
        const { data: project, error: projectError } = await context.supabase
          .from("projects")
          .select("team_id")
          .eq("id", projectId)
          .single();

        if (projectError || !project) {
          return new Response(
            JSON.stringify({
              error: "Project not found",
              code: "PROJECT_NOT_FOUND",
              status: 404,
            }),
            { status: 404, headers: { "Content-Type": "application/json" } }
          );
        }

        // Validate team access
        const teamAccess = await validateTeamAccess(
          context.supabase,
          context.user.id,
          project.team_id,
          "member"
        );
        if (!teamAccess.hasAccess) {
          return new Response(
            JSON.stringify({
              error:
                teamAccess.error ||
                "Insufficient permissions to view project analytics",
              code: "INSUFFICIENT_PERMISSIONS",
              status: 403,
            }),
            { status: 403, headers: { "Content-Type": "application/json" } }
          );
        }

        validatedTeamId = project.team_id;
        projectIds = [projectId];
      }

      // If no projects found, return structured empty response with data quality info
      if (projectIds.length === 0) {
        return createSuccessResponse({
          analytics: null,
          teamId: validatedTeamId,
          projectIds: [],
          timeRange,
          dataQuality: {
            hasData: false,
            reason: "No projects found for the specified criteria",
            recommendations: [
              "Create projects to start collecting analytics data",
              "Ensure proper project permissions are configured"
            ]
          },
          timestamp: new Date().toISOString()
        });
      }

      // Execute ETL pipeline to ensure data freshness and quality
      console.log(`📊 Executing analytics ETL for projects: ${projectIds.join(', ')}`);
      
      const etlMetrics = await etlPipeline.executeContentAnalysisPipeline(projectIds);
      
      // Fetch validated analytics data
      const analyticsResult = await fetchValidatedAnalyticsData(
        context.supabase,
        projectIds,
        timeRange
      );

      return createSuccessResponse({
        analytics: analyticsResult.data,
        teamId: validatedTeamId,
        projectIds,
        timeRange,
        dataQuality: analyticsResult.quality,
        etlMetrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Analytics API error:", error);
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          code: "INTERNAL_ERROR",
          status: 500,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
);

/**
 * Fetch validated analytics data with comprehensive quality assurance
 */
async function fetchValidatedAnalyticsData(
  supabase: any,
  projectIds: string[],
  timeRange: string
): Promise<{
  data: AnalyticsData | null;
  quality: {
    hasData: boolean;
    dataQualityScore: number;
    completeness: number;
    lastUpdated: string;
    sources: string[];
    validationErrors: string[];
  };
}> {
  try {
    console.log(`🔍 Fetching validated analytics for ${projectIds.length} projects`);
    
    // Fetch real data with validation
    const [contentData, performanceData, trafficData] = await Promise.all([
      fetchValidatedContentMetrics(supabase, projectIds, timeRange),
      fetchValidatedPerformanceMetrics(supabase, projectIds, timeRange),
      fetchValidatedTrafficMetrics(supabase, projectIds, timeRange),
    ]);

    const validationErrors: string[] = [];
    const sources: string[] = [];
    
    // Collect validation results
    if (contentData.validationErrors.length > 0) {
      validationErrors.push(...contentData.validationErrors);
    }
    if (performanceData.validationErrors.length > 0) {
      validationErrors.push(...performanceData.validationErrors);
    }
    if (trafficData.validationErrors.length > 0) {
      validationErrors.push(...trafficData.validationErrors);
    }
    
    // Collect data sources
    if (contentData.hasData) sources.push('content_analytics');
    if (performanceData.hasData) sources.push('performance_analytics');
    if (trafficData.hasData) sources.push('traffic_analytics');

    // Calculate overall data quality
    const qualityScores = [
      contentData.qualityScore,
      performanceData.qualityScore,
      trafficData.qualityScore
    ].filter(score => score > 0);
    
    const dataQualityScore = qualityScores.length > 0 
      ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length
      : 0;

    const hasData = contentData.hasData || performanceData.hasData || trafficData.hasData;
    
    if (!hasData) {
      return {
        data: null,
        quality: {
          hasData: false,
          dataQualityScore: 0,
          completeness: 0,
          lastUpdated: new Date().toISOString(),
          sources: [],
          validationErrors: ['No validated data available for the specified criteria']
        }
      };
    }

    // Build analytics from validated data only
    const analytics: AnalyticsData = {
      overview: {
        totalProjects: projectIds.length,
        totalContent: contentData.totalContent,
        avgSeoScore: contentData.avgSeoScore,
        avgPerformanceScore: performanceData.avgScore,
        totalViews: trafficData.totalViews,
        conversionRate: trafficData.conversionRate,
        trendingContent: contentData.trendingContent,
        activeAlerts: performanceData.activeAlerts,
      },
      trends: {
        traffic: trafficData.trends,
        performance: performanceData.trends,
        content: contentData.trends,
      },
      predictions: await generateStatisticalPredictions({
        contentData,
        performanceData,
        trafficData,
        timeRange
      }),
    };

    const completeness = calculateDataCompleteness(analytics);
    
    return {
      data: analytics,
      quality: {
        hasData: true,
        dataQualityScore: Math.round(dataQualityScore * 100) / 100,
        completeness: Math.round(completeness * 100) / 100,
        lastUpdated: new Date().toISOString(),
        sources,
        validationErrors
      }
    };
  } catch (error) {
    console.error("Error fetching validated analytics data:", error);
    return {
      data: null,
      quality: {
        hasData: false,
        dataQualityScore: 0,
        completeness: 0,
        lastUpdated: new Date().toISOString(),
        sources: [],
        validationErrors: [`Analytics fetch failed: ${error instanceof Error ? error.message : String(error)}`]
      }
    };
  }
}

/**
 * Fetch validated content metrics with quality assurance
 */
async function fetchValidatedContentMetrics(
  supabase: any,
  projectIds: string[],
  timeRange: string
) {
  try {
    // Fetch from content_analytics table (populated by ETL)
    const { data: contentAnalytics, error: analyticsError } = await supabase
      .from("content_analytics")
      .select(`
        content_id,
        project_id,
        metrics,
        quality_score,
        timestamp
      `)
      .in("project_id", projectIds)
      .gte("timestamp", getTimeRangeStart(timeRange))
      .order("timestamp", { ascending: false });

    const validationErrors: string[] = [];
    
    if (analyticsError) {
      console.error("Content analytics fetch error:", analyticsError);
      validationErrors.push(`Content analytics error: ${analyticsError.message}`);
    }

    // If no analytics data, try content_items as fallback
    let contentData = contentAnalytics;
    if (!contentData || contentData.length === 0) {
      const { data: fallbackContent, error: fallbackError } = await supabase
        .from("content_items")
        .select("id, project_id, seo_score, status, created_at, word_count")
        .in("project_id", projectIds)
        .gte("created_at", getTimeRangeStart(timeRange));
        
      if (fallbackError) {
        validationErrors.push(`Content fallback error: ${fallbackError.message}`);
        return {
          hasData: false,
          totalContent: 0,
          avgSeoScore: 0,
          trendingContent: 0,
          trends: [],
          qualityScore: 0,
          validationErrors
        };
      }
      
      // Transform fallback data to analytics format
      contentData = fallbackContent?.map(item => ({
        content_id: item.id,
        project_id: item.project_id,
        metrics: {
          content_length: item.word_count || 0,
          seo_score: item.seo_score || 0,
          readability_score: 0, // Not available in fallback
          keyword_density: 0
        },
        quality_score: item.seo_score ? 80 : 20, // Estimate quality
        timestamp: item.created_at
      })) || [];
    }

    if (!contentData || contentData.length === 0) {
      return {
        hasData: false,
        totalContent: 0,
        avgSeoScore: 0,
        trendingContent: 0,
        trends: [],
        qualityScore: 0,
        validationErrors: [...validationErrors, 'No content data found']
      };
    }

    // Validate data quality
    const validatedData = [];
    let totalQualityScore = 0;
    
    for (const item of contentData) {
      const validation = dataValidationService.validateDataPoint('content', item.metrics);
      if (validation.isValid && validation.quality.overall >= 70) {
        validatedData.push(item);
        totalQualityScore += validation.quality.overall;
      } else {
        validationErrors.push(`Content item ${item.content_id} failed validation: ${validation.errors.join(', ')}`);
      }
    }

    const totalContent = validatedData.length;
    const avgSeoScore = totalContent > 0
      ? validatedData.reduce((sum, item) => sum + (item.metrics.seo_score || 0), 0) / totalContent
      : 0;
    
    const trendingContent = validatedData.filter(
      item => (item.metrics.seo_score || 0) > 75
    ).length;

    // Calculate real trends from time-series data
    const trends = calculateContentTrends(validatedData, timeRange);
    
    const qualityScore = totalContent > 0 ? totalQualityScore / totalContent : 0;

    return {
      hasData: totalContent > 0,
      totalContent,
      avgSeoScore: Math.round(avgSeoScore),
      trendingContent,
      trends,
      qualityScore,
      validationErrors
    };
  } catch (error) {
    console.error("Error in fetchValidatedContentMetrics:", error);
    return {
      hasData: false,
      totalContent: 0,
      avgSeoScore: 0,
      trendingContent: 0,
      trends: [],
      qualityScore: 0,
      validationErrors: [`Content metrics fetch failed: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
}

/**
 * Fetch validated performance metrics with quality assurance
 */
async function fetchValidatedPerformanceMetrics(
  supabase: any,
  projectIds: string[],
  timeRange: string
) {
  try {
    const { data: performanceData, error } = await supabase
      .from("performance_analytics")
      .select(`
        content_id,
        project_id,
        metrics,
        quality_score,
        timestamp
      `)
      .in("project_id", projectIds)
      .gte("timestamp", getTimeRangeStart(timeRange))
      .order("timestamp", { ascending: false });

    const validationErrors: string[] = [];
    
    if (error) {
      console.error("Performance analytics fetch error:", error);
      validationErrors.push(`Performance analytics error: ${error.message}`);
      return {
        hasData: false,
        avgScore: 0,
        activeAlerts: 0,
        trends: [],
        qualityScore: 0,
        validationErrors
      };
    }

    if (!performanceData || performanceData.length === 0) {
      return {
        hasData: false,
        avgScore: 0,
        activeAlerts: 0,
        trends: [],
        qualityScore: 0,
        validationErrors: ['No performance data available']
      };
    }

    // Validate performance data
    const validatedData = [];
    let totalQualityScore = 0;
    
    for (const item of performanceData) {
      const validation = dataValidationService.validateDataPoint('performance', item.metrics);
      if (validation.isValid && validation.quality.overall >= 70) {
        validatedData.push(item);
        totalQualityScore += validation.quality.overall;
      } else {
        validationErrors.push(`Performance item ${item.content_id} failed validation`);
      }
    }

    const hasData = validatedData.length > 0;
    const avgScore = hasData
      ? validatedData.reduce((sum, item) => sum + (item.metrics.lighthouse_score || 0), 0) / validatedData.length
      : 0;
    
    // Count alerts (performance scores below threshold)
    const activeAlerts = validatedData.filter(
      item => (item.metrics.lighthouse_score || 0) < 60
    ).length;

    const trends = calculatePerformanceTrends(validatedData, timeRange);
    const qualityScore = hasData ? totalQualityScore / validatedData.length : 0;

    return {
      hasData,
      avgScore: Math.round(avgScore),
      activeAlerts,
      trends,
      qualityScore,
      validationErrors
    };
  } catch (error) {
    console.error("Error in fetchValidatedPerformanceMetrics:", error);
    return {
      hasData: false,
      avgScore: 0,
      activeAlerts: 0,
      trends: [],
      qualityScore: 0,
      validationErrors: [`Performance metrics fetch failed: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
}

/**
 * Fetch validated traffic metrics with quality assurance
 */
async function fetchValidatedTrafficMetrics(
  supabase: any,
  projectIds: string[],
  timeRange: string
) {
  try {
    // Try SEO analytics first (contains organic traffic data)
    const { data: seoData, error: seoError } = await supabase
      .from("seo_analytics")
      .select(`
        content_id,
        project_id,
        metrics,
        quality_score,
        timestamp
      `)
      .in("project_id", projectIds)
      .gte("timestamp", getTimeRangeStart(timeRange))
      .order("timestamp", { ascending: false });

    const validationErrors: string[] = [];
    
    if (seoError) {
      console.error("SEO analytics fetch error:", seoError);
      validationErrors.push(`SEO analytics error: ${seoError.message}`);
    }

    let trafficData = seoData || [];

    // If no SEO data, try general analytics table
    if (trafficData.length === 0) {
      const { data: analyticsData, error: analyticsError } = await supabase
        .from("content_analytics")
        .select(`
          content_id,
          project_id,
          metrics,
          quality_score,
          timestamp
        `)
        .in("project_id", projectIds)
        .gte("timestamp", getTimeRangeStart(timeRange))
        .order("timestamp", { ascending: false });
        
      if (analyticsError) {
        validationErrors.push(`Analytics fallback error: ${analyticsError.message}`);
      } else {
        trafficData = analyticsData || [];
      }
    }

    if (trafficData.length === 0) {
      return {
        hasData: false,
        totalViews: 0,
        conversionRate: 0,
        trends: [],
        qualityScore: 0,
        validationErrors: [...validationErrors, 'No traffic data available']
      };
    }

    // Validate traffic data using analytics validation
    const validatedData = [];
    let totalQualityScore = 0;
    
    for (const item of trafficData) {
      // Map metrics to analytics format for validation
      const analyticsMetrics = {
        pageviews: item.metrics.organic_clicks || item.metrics.pageviews || 0,
        unique_visitors: item.metrics.organic_impressions || item.metrics.unique_visitors || 0,
        bounce_rate: (1 - (item.metrics.click_through_rate || 0)) * 100,
        session_duration: item.metrics.session_duration || 0,
        conversion_rate: item.metrics.click_through_rate || item.metrics.conversion_rate || 0
      };
      
      const validation = dataValidationService.validateDataPoint('analytics', analyticsMetrics);
      if (validation.isValid && validation.quality.overall >= 70) {
        validatedData.push({
          ...item,
          validatedMetrics: analyticsMetrics
        });
        totalQualityScore += validation.quality.overall;
      } else {
        validationErrors.push(`Traffic item ${item.content_id} failed validation`);
      }
    }

    const hasData = validatedData.length > 0;
    const totalViews = hasData
      ? validatedData.reduce((sum, item) => sum + item.validatedMetrics.pageviews, 0)
      : 0;
    
    const avgConversionRate = hasData
      ? validatedData.reduce((sum, item) => sum + item.validatedMetrics.conversion_rate, 0) / validatedData.length
      : 0;

    const trends = calculateTrafficTrends(validatedData, timeRange);
    const qualityScore = hasData ? totalQualityScore / validatedData.length : 0;

    return {
      hasData,
      totalViews,
      conversionRate: Math.round(avgConversionRate * 100 * 100) / 100, // Convert to percentage
      trends,
      qualityScore,
      validationErrors
    };
  } catch (error) {
    console.error("Error in fetchValidatedTrafficMetrics:", error);
    return {
      hasData: false,
      totalViews: 0,
      conversionRate: 0,
      trends: [],
      qualityScore: 0,
      validationErrors: [`Traffic metrics fetch failed: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
}

/**
 * Generate statistical predictions based on real data
 */
async function generateStatisticalPredictions(data: {
  contentData: any;
  performanceData: any;
  trafficData: any;
  timeRange: string;
}): Promise<AnalyticsPredictions> {
  try {
    const { contentData, performanceData, trafficData, timeRange } = data;
    
    // Calculate traffic prediction using linear regression on historical data
    const trafficPrediction = calculateTrafficPrediction(trafficData.trends, 7); // 7 days ahead
    const performancePrediction = calculatePerformancePrediction(performanceData.trends, 30); // 30 days ahead
    
    // Calculate quarterly progress based on actual metrics
    const quarterlyProgress = calculateQuarterlyProgress({
      contentGrowth: contentData.totalContent,
      performanceImprovement: performanceData.avgScore,
      trafficGrowth: trafficData.totalViews
    });
    
    return {
      nextWeek: {
        traffic: trafficPrediction.predicted,
        confidence: trafficPrediction.confidence,
        confidenceInterval: trafficPrediction.interval
      },
      nextMonth: {
        performance: performancePrediction.predicted,
        confidence: performancePrediction.confidence,
        confidenceInterval: performancePrediction.interval
      },
      quarterlyGoals: {
        onTrack: quarterlyProgress.onTrack,
        progress: quarterlyProgress.progress,
        projectedCompletion: quarterlyProgress.projectedCompletion
      },
      methodology: "Linear regression with confidence intervals based on historical data",
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error generating statistical predictions:', error);
    // Return conservative predictions on error
    return {
      nextWeek: {
        traffic: 0,
        confidence: 0,
        confidenceInterval: [0, 0]
      },
      nextMonth: {
        performance: 0,
        confidence: 0,
        confidenceInterval: [0, 0]
      },
      quarterlyGoals: {
        onTrack: false,
        progress: 0,
        projectedCompletion: "Insufficient data for projection"
      },
      methodology: "Insufficient data for statistical prediction",
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * Calculate real traffic trends from validated data
 */
function calculateTrafficTrends(
  validatedData: any[],
  timeRange: string
): Array<{ date: string; views: number; conversions: number }> {
  const days = getTimeRangeDays(timeRange);
  const trendsMap = new Map<string, { views: number; conversions: number }>();
  
  // Initialize all days with zero values
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    const dateKey = date.toISOString().split("T")[0]!;
    trendsMap.set(dateKey, { views: 0, conversions: 0 });
  }
  
  // Aggregate validated data by date
  for (const item of validatedData) {
    const date = new Date(item.timestamp).toISOString().split("T")[0]!;
    const existing = trendsMap.get(date) || { views: 0, conversions: 0 };
    
    existing.views += item.validatedMetrics?.pageviews || 0;
    existing.conversions += Math.round((item.validatedMetrics?.conversion_rate || 0) * existing.views);
    
    trendsMap.set(date, existing);
  }
  
  // Convert to array format
  return Array.from(trendsMap.entries())
    .map(([date, metrics]) => ({
      date,
      views: metrics.views,
      conversions: metrics.conversions
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculate real performance trends from validated data
 */
function calculatePerformanceTrends(
  validatedData: any[],
  timeRange: string
): Array<{ date: string; score: number; vitals: number }> {
  const days = getTimeRangeDays(timeRange);
  const trendsMap = new Map<string, { scores: number[]; vitals: number[] }>();
  
  // Initialize all days
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    const dateKey = date.toISOString().split("T")[0]!;
    trendsMap.set(dateKey, { scores: [], vitals: [] });
  }
  
  // Aggregate performance data by date
  for (const item of validatedData) {
    const date = new Date(item.timestamp).toISOString().split("T")[0]!;
    const existing = trendsMap.get(date);
    
    if (existing) {
      existing.scores.push(item.metrics.lighthouse_score || 0);
      existing.vitals.push(item.metrics.core_web_vitals_score || 0);
    }
  }
  
  // Calculate averages for each day
  return Array.from(trendsMap.entries())
    .map(([date, data]) => ({
      date,
      score: data.scores.length > 0 
        ? Math.round(data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length)
        : 0,
      vitals: data.vitals.length > 0
        ? Math.round(data.vitals.reduce((sum, v) => sum + v, 0) / data.vitals.length)
        : 0
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculate real content trends from validated data
 */
function calculateContentTrends(
  validatedData: any[],
  timeRange: string
): Array<{ date: string; published: number; optimized: number }> {
  const days = getTimeRangeDays(timeRange);
  const trendsMap = new Map<string, { published: number; optimized: number }>();
  
  // Initialize all days
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    const dateKey = date.toISOString().split("T")[0]!;
    trendsMap.set(dateKey, { published: 0, optimized: 0 });
  }
  
  // Count content by date
  for (const item of validatedData) {
    const date = new Date(item.timestamp).toISOString().split("T")[0]!;
    const existing = trendsMap.get(date);
    
    if (existing) {
      existing.published += 1;
      // Consider content optimized if SEO score > 75
      if ((item.metrics.seo_score || 0) > 75) {
        existing.optimized += 1;
      }
    }
  }
  
  return Array.from(trendsMap.entries())
    .map(([date, metrics]) => ({
      date,
      published: metrics.published,
      optimized: metrics.optimized
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get time range start date
 */
function getTimeRangeStart(timeRange: string): string {
  const date = new Date();

  switch (timeRange) {
    case "1d":
      date.setDate(date.getDate() - 1);
      break;
    case "7d":
      date.setDate(date.getDate() - 7);
      break;
    case "30d":
      date.setDate(date.getDate() - 30);
      break;
    case "90d":
      date.setDate(date.getDate() - 90);
      break;
    default:
      date.setDate(date.getDate() - 7);
  }

  return date.toISOString();
}

/**
 * Get number of days for time range
 */
function getTimeRangeDays(timeRange: string): number {
  switch (timeRange) {
    case "1d":
      return 1;
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "90d":
      return 90;
    default:
      return 7;
  }
}

/**
 * Calculate traffic prediction using linear regression
 */
function calculateTrafficPrediction(
  trends: Array<{ date: string; views: number; conversions: number }>,
  daysAhead: number
): { predicted: number; confidence: number; interval: [number, number] } {
  if (trends.length < 3) {
    return { predicted: 0, confidence: 0, interval: [0, 0] };
  }

  const values = trends.map(t => t.views);
  const n = values.length;
  
  // Simple linear regression
  const sumX = values.reduce((sum, _, i) => sum + i, 0);
  const sumY = values.reduce((sum, val) => sum + val, 0);
  const sumXY = values.reduce((sum, val, i) => sum + i * val, 0);
  const sumXX = values.reduce((sum, _, i) => sum + i * i, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  const predicted = Math.max(0, Math.round(slope * (n + daysAhead - 1) + intercept));
  
  // Calculate R-squared for confidence
  const yMean = sumY / n;
  const ssRes = values.reduce((sum, val, i) => {
    const predicted = slope * i + intercept;
    return sum + Math.pow(val - predicted, 2);
  }, 0);
  const ssTot = values.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
  const rSquared = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);
  
  const confidence = Math.min(1, rSquared * 0.9); // Conservative confidence
  const margin = predicted * (1 - confidence) * 0.5;
  
  return {
    predicted,
    confidence: Math.round(confidence * 100) / 100,
    interval: [Math.max(0, Math.round(predicted - margin)), Math.round(predicted + margin)]
  };
}

/**
 * Calculate performance prediction
 */
function calculatePerformancePrediction(
  trends: Array<{ date: string; score: number; vitals: number }>,
  daysAhead: number
): { predicted: number; confidence: number; interval: [number, number] } {
  if (trends.length < 3) {
    return { predicted: 0, confidence: 0, interval: [0, 0] };
  }

  const scores = trends.map(t => t.score).filter(s => s > 0);
  if (scores.length === 0) {
    return { predicted: 0, confidence: 0, interval: [0, 0] };
  }
  
  // Calculate moving average trend
  const recentScores = scores.slice(-7); // Last 7 data points
  const average = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
  
  // Calculate trend (simple slope)
  const trend = scores.length > 1 
    ? (scores[scores.length - 1] - scores[0]) / scores.length
    : 0;
  
  const predicted = Math.max(0, Math.min(100, Math.round(average + trend * daysAhead)));
  
  // Confidence based on data consistency
  const variance = recentScores.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) / recentScores.length;
  const standardDev = Math.sqrt(variance);
  const confidence = Math.max(0.1, Math.min(1, 1 - standardDev / 50)); // Normalize to 0-1
  
  const margin = standardDev * 0.5;
  
  return {
    predicted,
    confidence: Math.round(confidence * 100) / 100,
    interval: [
      Math.max(0, Math.round(predicted - margin)),
      Math.min(100, Math.round(predicted + margin))
    ]
  };
}

/**
 * Calculate quarterly progress
 */
function calculateQuarterlyProgress(metrics: {
  contentGrowth: number;
  performanceImprovement: number;
  trafficGrowth: number;
}): {
  onTrack: boolean;
  progress: number;
  projectedCompletion: string;
} {
  // Define quarterly targets (these would come from project settings in production)
  const targets = {
    contentTarget: 100, // pieces of content
    performanceTarget: 90, // performance score
    trafficTarget: 10000 // total views
  };
  
  const contentProgress = Math.min(1, metrics.contentGrowth / targets.contentTarget);
  const performanceProgress = Math.min(1, metrics.performanceImprovement / targets.performanceTarget);
  const trafficProgress = Math.min(1, metrics.trafficGrowth / targets.trafficTarget);
  
  const overallProgress = (contentProgress + performanceProgress + trafficProgress) / 3;
  
  // Calculate projected completion date
  const currentQuarter = Math.floor((new Date().getMonth()) / 3) + 1;
  const currentYear = new Date().getFullYear();
  const quarterEndMonth = currentQuarter * 3;
  const quarterEnd = new Date(currentYear, quarterEndMonth, 0);
  
  const daysIntoQuarter = Math.floor((Date.now() - new Date(currentYear, (currentQuarter - 1) * 3, 1).getTime()) / (1000 * 60 * 60 * 24));
  const totalQuarterDays = 90; // Approximate
  const progressRate = overallProgress / (daysIntoQuarter / totalQuarterDays);
  
  const projectedDays = overallProgress < 1 ? Math.ceil((1 - overallProgress) / (progressRate / totalQuarterDays)) : 0;
  const projectedCompletion = projectedDays > 0 
    ? new Date(Date.now() + projectedDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!
    : 'On schedule';
  
  return {
    onTrack: overallProgress >= (daysIntoQuarter / totalQuarterDays) * 0.9, // 90% of expected pace
    progress: Math.round(overallProgress * 100) / 100,
    projectedCompletion
  };
}

/**
 * Calculate data completeness score
 */
function calculateDataCompleteness(analytics: AnalyticsData): number {
  const overview = analytics.overview;
  const trends = analytics.trends;
  
  let completenessScore = 0;
  let totalFields = 0;
  
  // Check overview completeness
  const overviewFields = Object.values(overview);
  totalFields += overviewFields.length;
  completenessScore += overviewFields.filter(val => val > 0).length;
  
  // Check trends completeness
  const trendFields = [trends.traffic, trends.performance, trends.content];
  totalFields += trendFields.length;
  completenessScore += trendFields.filter(trend => trend.length > 0).length;
  
  // Check predictions completeness
  const predictions = analytics.predictions;
  totalFields += 3; // nextWeek, nextMonth, quarterlyGoals
  if (predictions.nextWeek.traffic > 0) completenessScore += 1;
  if (predictions.nextMonth.performance > 0) completenessScore += 1;
  if (predictions.quarterlyGoals.progress > 0) completenessScore += 1;
  
  return totalFields > 0 ? completenessScore / totalFields : 0;
}
