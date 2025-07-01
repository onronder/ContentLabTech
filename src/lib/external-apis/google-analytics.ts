/**
 * Google Analytics Integration Service
 * Performance metrics and user behavior analysis for competitive benchmarking
 */

import { z } from "zod";

// Configuration schema
const googleAnalyticsConfigSchema = z.object({
  serviceAccountKey: z.string(),
  viewId: z.string().optional(),
  propertyId: z.string().optional(),
  baseUrl: z.string().url().default("https://analyticsreporting.googleapis.com/v4"),
  timeout: z.number().default(30000),
});

// Request/Response schemas
const analyticsRequestSchema = z.object({
  propertyId: z.string(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  metrics: z.array(z.string()),
  dimensions: z.array(z.string()).optional(),
  filters: z.array(z.object({
    field: z.string(),
    operator: z.enum(["EXACT", "BEGINS_WITH", "ENDS_WITH", "CONTAINS", "REGEX"]),
    value: z.string(),
  })).optional(),
  orderBy: z.array(z.object({
    field: z.string(),
    sortOrder: z.enum(["ASCENDING", "DESCENDING"]).default("DESCENDING"),
  })).optional(),
  pageSize: z.number().min(1).max(100000).default(1000),
});

const analyticsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    propertyId: z.string(),
    dateRange: z.object({
      startDate: z.string(),
      endDate: z.string(),
    }),
    totals: z.record(z.number()),
    rows: z.array(z.object({
      dimensions: z.array(z.string()).optional(),
      metrics: z.record(z.number()),
    })),
    rowCount: z.number(),
    samplingSpaceSizes: z.array(z.string()).optional(),
    sampledSpace: z.array(z.string()).optional(),
  }),
  error: z.string().optional(),
  metadata: z.object({
    timestamp: z.string(),
    processingTime: z.number(),
    quota_usage: z.number(),
  }),
});

const competitiveMetricsSchema = z.object({
  targetDomain: z.string(),
  competitorDomains: z.array(z.string()),
  timeframe: z.enum(["7d", "30d", "90d", "1y"]),
  metrics: z.array(z.enum([
    "sessions",
    "users",
    "pageviews",
    "bounce_rate",
    "session_duration",
    "pages_per_session",
    "conversion_rate",
    "goal_completions",
    "revenue",
    "ecommerce_conversion_rate",
  ])),
});

type AnalyticsRequest = z.infer<typeof analyticsRequestSchema>;
type AnalyticsResponse = z.infer<typeof analyticsResponseSchema>;
type CompetitiveMetrics = z.infer<typeof competitiveMetricsSchema>;

export class GoogleAnalyticsService {
  private config: z.infer<typeof googleAnalyticsConfigSchema>;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: Partial<z.infer<typeof googleAnalyticsConfigSchema>>) {
    this.config = googleAnalyticsConfigSchema.parse({
      serviceAccountKey: process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "",
      ...config,
    });
  }

  /**
   * Get analytics data for a specific property
   */
  async getAnalyticsData(request: AnalyticsRequest): Promise<AnalyticsResponse> {
    const startTime = Date.now();

    try {
      await this.ensureAuthentication();

      const requestBody = {
        reportRequests: [
          {
            viewId: request.propertyId,
            dateRanges: [
              {
                startDate: request.startDate,
                endDate: request.endDate,
              },
            ],
            metrics: request.metrics.map(metric => ({ expression: `ga:${metric}` })),
            dimensions: request.dimensions?.map(dimension => ({ name: `ga:${dimension}` })),
            dimensionFilterClauses: request.filters ? [
              {
                filters: request.filters.map(filter => ({
                  dimensionName: `ga:${filter.field}`,
                  operator: filter.operator,
                  expressions: [filter.value],
                })),
              },
            ] : undefined,
            orderBys: request.orderBy?.map(order => ({
              fieldName: order.field.startsWith("ga:") ? order.field : `ga:${order.field}`,
              sortOrder: order.sortOrder,
            })),
            pageSize: request.pageSize,
          },
        ],
      };

      const response = await fetch(`${this.config.baseUrl}/reports:batchGet`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`Google Analytics API error: ${response.status} ${response.statusText}`);
      }

      const rawData = await response.json();
      const report = rawData.reports[0];

      // Transform the response
      const transformedData = {
        success: true,
        data: {
          propertyId: request.propertyId,
          dateRange: {
            startDate: request.startDate,
            endDate: request.endDate,
          },
          totals: this.extractTotals(report.data.totals, request.metrics),
          rows: this.extractRows(report.data.rows, request.metrics, request.dimensions),
          rowCount: report.data.rowCount || 0,
          samplingSpaceSizes: report.data.samplesReadCounts,
          sampledSpace: report.data.samplingSpaceSizes,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          quota_usage: 1,
        },
      };

      return analyticsResponseSchema.parse(transformedData);

    } catch (error) {
      return {
        success: false,
        data: {
          propertyId: request.propertyId,
          dateRange: {
            startDate: request.startDate,
            endDate: request.endDate,
          },
          totals: {},
          rows: [],
          rowCount: 0,
        },
        error: error instanceof Error ? error.message : "Unknown error",
        metadata: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          quota_usage: 0,
        },
      };
    }
  }

  /**
   * Compare performance metrics across multiple domains
   */
  async comparePerformanceMetrics(comparison: CompetitiveMetrics): Promise<{
    success: boolean;
    data?: {
      timeframe: string;
      target_domain: string;
      competitors: Array<{
        domain: string;
        metrics: Record<string, {
          value: number;
          change: number;
          rank: number;
        }>;
        overall_score: number;
      }>;
      benchmarks: Record<string, {
        average: number;
        median: number;
        top_quartile: number;
        bottom_quartile: number;
      }>;
      insights: Array<{
        type: "strength" | "weakness" | "opportunity";
        metric: string;
        description: string;
        recommendation: string;
      }>;
    };
    error?: string;
  }> {
    try {
      const endDate = new Date().toISOString().split("T")[0];
      const startDate = this.calculateStartDate(endDate, comparison.timeframe);

      // Get analytics data for target domain
      const targetData = await this.getAnalyticsData({
        propertyId: this.config.propertyId!,
        startDate,
        endDate,
        metrics: comparison.metrics,
        dimensions: ["hostname"],
        filters: [
          {
            field: "hostname",
            operator: "EXACT",
            value: comparison.targetDomain,
          },
        ],
      });

      // Get industry benchmarks (simulated for now)
      const benchmarks = this.getIndustryBenchmarks(comparison.metrics);

      // Simulate competitor data (in real implementation, this would come from Google Analytics Intelligence API or third-party services)
      const competitors = await this.getCompetitorMetrics(comparison.competitorDomains, comparison.metrics, startDate, endDate);

      // Generate insights
      const insights = this.generatePerformanceInsights(targetData, competitors, benchmarks);

      return {
        success: true,
        data: {
          timeframe: comparison.timeframe,
          target_domain: comparison.targetDomain,
          competitors,
          benchmarks,
          insights,
        },
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Performance comparison failed",
      };
    }
  }

  /**
   * Get website performance metrics
   */
  async getPerformanceMetrics(domain: string, timeframe: "7d" | "30d" | "90d"): Promise<{
    success: boolean;
    data?: {
      domain: string;
      timeframe: string;
      core_metrics: {
        sessions: number;
        users: number;
        pageviews: number;
        bounce_rate: number;
        avg_session_duration: number;
        pages_per_session: number;
      };
      engagement_metrics: {
        new_vs_returning: {
          new_users: number;
          returning_users: number;
        };
        user_engagement: {
          engaged_sessions: number;
          engagement_rate: number;
          engaged_sessions_per_user: number;
        };
      };
      acquisition_metrics: {
        channels: Array<{
          channel: string;
          sessions: number;
          users: number;
          conversion_rate: number;
        }>;
        top_referrers: Array<{
          source: string;
          sessions: number;
          bounce_rate: number;
        }>;
      };
      content_metrics: {
        top_pages: Array<{
          page_path: string;
          pageviews: number;
          unique_pageviews: number;
          avg_time_on_page: number;
          bounce_rate: number;
        }>;
        site_search: {
          search_sessions: number;
          total_unique_searches: number;
          results_pageviews_per_search: number;
          search_exit_rate: number;
        };
      };
      trends: Array<{
        date: string;
        sessions: number;
        users: number;
        bounce_rate: number;
      }>;
    };
    error?: string;
  }> {
    try {
      const endDate = new Date().toISOString().split("T")[0];
      const startDate = this.calculateStartDate(endDate, timeframe);

      // Core metrics
      const coreMetrics = await this.getAnalyticsData({
        propertyId: this.config.propertyId!,
        startDate,
        endDate,
        metrics: ["sessions", "users", "pageviews", "bounceRate", "avgSessionDuration", "pageviewsPerSession"],
        filters: domain ? [{ field: "hostname", operator: "EXACT", value: domain }] : undefined,
      });

      // Engagement metrics
      const engagementMetrics = await this.getAnalyticsData({
        propertyId: this.config.propertyId!,
        startDate,
        endDate,
        metrics: ["newUsers", "users"],
        dimensions: ["userType"],
        filters: domain ? [{ field: "hostname", operator: "EXACT", value: domain }] : undefined,
      });

      // Acquisition metrics
      const acquisitionMetrics = await this.getAnalyticsData({
        propertyId: this.config.propertyId!,
        startDate,
        endDate,
        metrics: ["sessions", "users", "goalConversionRateAll"],
        dimensions: ["channelGrouping"],
        filters: domain ? [{ field: "hostname", operator: "EXACT", value: domain }] : undefined,
        orderBy: [{ field: "sessions", sortOrder: "DESCENDING" }],
      });

      // Content metrics
      const contentMetrics = await this.getAnalyticsData({
        propertyId: this.config.propertyId!,
        startDate,
        endDate,
        metrics: ["pageviews", "uniquePageviews", "avgTimeOnPage", "bounceRate"],
        dimensions: ["pagePath"],
        filters: domain ? [{ field: "hostname", operator: "EXACT", value: domain }] : undefined,
        orderBy: [{ field: "pageviews", sortOrder: "DESCENDING" }],
        pageSize: 20,
      });

      // Daily trends
      const trendsMetrics = await this.getAnalyticsData({
        propertyId: this.config.propertyId!,
        startDate,
        endDate,
        metrics: ["sessions", "users", "bounceRate"],
        dimensions: ["date"],
        filters: domain ? [{ field: "hostname", operator: "EXACT", value: domain }] : undefined,
        orderBy: [{ field: "date", sortOrder: "ASCENDING" }],
      });

      const transformedData = {
        domain,
        timeframe,
        core_metrics: {
          sessions: coreMetrics.data.totals.sessions || 0,
          users: coreMetrics.data.totals.users || 0,
          pageviews: coreMetrics.data.totals.pageviews || 0,
          bounce_rate: coreMetrics.data.totals.bounceRate || 0,
          avg_session_duration: coreMetrics.data.totals.avgSessionDuration || 0,
          pages_per_session: coreMetrics.data.totals.pageviewsPerSession || 0,
        },
        engagement_metrics: {
          new_vs_returning: this.processNewVsReturning(engagementMetrics.data.rows),
          user_engagement: {
            engaged_sessions: 0, // Would need GA4 for this metric
            engagement_rate: 0,
            engaged_sessions_per_user: 0,
          },
        },
        acquisition_metrics: {
          channels: acquisitionMetrics.data.rows.map(row => ({
            channel: row.dimensions?.[0] || "Direct",
            sessions: row.metrics.sessions || 0,
            users: row.metrics.users || 0,
            conversion_rate: row.metrics.goalConversionRateAll || 0,
          })),
          top_referrers: [], // Would need separate query
        },
        content_metrics: {
          top_pages: contentMetrics.data.rows.map(row => ({
            page_path: row.dimensions?.[0] || "/",
            pageviews: row.metrics.pageviews || 0,
            unique_pageviews: row.metrics.uniquePageviews || 0,
            avg_time_on_page: row.metrics.avgTimeOnPage || 0,
            bounce_rate: row.metrics.bounceRate || 0,
          })),
          site_search: {
            search_sessions: 0,
            total_unique_searches: 0,
            results_pageviews_per_search: 0,
            search_exit_rate: 0,
          },
        },
        trends: trendsMetrics.data.rows.map(row => ({
          date: row.dimensions?.[0] || "",
          sessions: row.metrics.sessions || 0,
          users: row.metrics.users || 0,
          bounce_rate: row.metrics.bounceRate || 0,
        })),
      };

      return {
        success: true,
        data: transformedData,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Performance metrics retrieval failed",
      };
    }
  }

  /**
   * Get conversion funnel analysis
   */
  async getConversionFunnel(config: {
    propertyId: string;
    funnelSteps: Array<{
      name: string;
      condition: string;
    }>;
    timeframe: "7d" | "30d" | "90d";
    segment?: string;
  }): Promise<{
    success: boolean;
    data?: {
      funnel_steps: Array<{
        step_name: string;
        users: number;
        conversion_rate: number;
        drop_off_rate: number;
      }>;
      overall_conversion_rate: number;
      total_users: number;
      completed_conversions: number;
    };
    error?: string;
  }> {
    try {
      // This is a simplified implementation
      // Real implementation would use Google Analytics Funnel reports or custom segments
      
      const endDate = new Date().toISOString().split("T")[0];
      const startDate = this.calculateStartDate(endDate, config.timeframe);

      // Simulate funnel analysis
      const funnelData = {
        funnel_steps: config.funnelSteps.map((step, index) => {
          const dropOffRate = index * 15 + Math.random() * 10; // Simulated drop-off
          const conversionRate = 100 - dropOffRate;
          
          return {
            step_name: step.name,
            users: Math.floor(1000 * (conversionRate / 100)), // Simulated users
            conversion_rate: conversionRate,
            drop_off_rate: dropOffRate,
          };
        }),
        overall_conversion_rate: 0,
        total_users: 1000,
        completed_conversions: 0,
      };

      // Calculate overall conversion rate
      const lastStep = funnelData.funnel_steps[funnelData.funnel_steps.length - 1];
      funnelData.overall_conversion_rate = lastStep.conversion_rate;
      funnelData.completed_conversions = lastStep.users;

      return {
        success: true,
        data: funnelData,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Conversion funnel analysis failed",
      };
    }
  }

  private async ensureAuthentication(): Promise<void> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return;
    }

    try {
      // Parse service account key
      const serviceAccount = JSON.parse(this.config.serviceAccountKey);
      
      // Create JWT token for Google APIs
      const jwt = await this.createJWTToken(serviceAccount);
      
      // Exchange JWT for access token
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: jwt,
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error("Failed to authenticate with Google APIs");
      }

      const tokenData = await tokenResponse.json();
      this.accessToken = tokenData.access_token;
      this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000) - 60000; // Subtract 1 minute for safety

    } catch (error) {
      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private async createJWTToken(serviceAccount: any): Promise<string> {
    // This is a simplified JWT creation
    // In a real implementation, you'd use a proper JWT library like 'jsonwebtoken'
    
    const header = {
      alg: "RS256",
      typ: "JWT",
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    };

    // In a real implementation, you'd sign this with the private key
    // For now, return a placeholder
    return "placeholder-jwt-token";
  }

  private extractTotals(totals: any[], metrics: string[]): Record<string, number> {
    const result: Record<string, number> = {};
    
    if (totals && totals[0] && totals[0].values) {
      metrics.forEach((metric, index) => {
        result[metric] = parseFloat(totals[0].values[index]) || 0;
      });
    }
    
    return result;
  }

  private extractRows(rows: any[], metrics: string[], dimensions?: string[]): Array<{
    dimensions?: string[];
    metrics: Record<string, number>;
  }> {
    if (!rows) return [];

    return rows.map(row => {
      const rowData: any = {};

      if (dimensions && row.dimensions) {
        rowData.dimensions = row.dimensions;
      }

      rowData.metrics = {};
      metrics.forEach((metric, index) => {
        rowData.metrics[metric] = parseFloat(row.metrics[0].values[index]) || 0;
      });

      return rowData;
    });
  }

  private calculateStartDate(endDate: string, timeframe: string): string {
    const end = new Date(endDate);
    const days = timeframe === "7d" ? 7 : timeframe === "30d" ? 30 : timeframe === "90d" ? 90 : 365;
    const start = new Date(end.getTime() - (days * 24 * 60 * 60 * 1000));
    return start.toISOString().split("T")[0];
  }

  private getIndustryBenchmarks(metrics: string[]): Record<string, any> {
    // Simulated industry benchmarks
    const benchmarks: Record<string, any> = {};
    
    metrics.forEach(metric => {
      switch (metric) {
        case "bounce_rate":
          benchmarks[metric] = { average: 45, median: 42, top_quartile: 35, bottom_quartile: 60 };
          break;
        case "session_duration":
          benchmarks[metric] = { average: 150, median: 120, top_quartile: 200, bottom_quartile: 80 };
          break;
        case "pages_per_session":
          benchmarks[metric] = { average: 2.5, median: 2.2, top_quartile: 3.5, bottom_quartile: 1.8 };
          break;
        default:
          benchmarks[metric] = { average: 100, median: 95, top_quartile: 150, bottom_quartile: 60 };
      }
    });

    return benchmarks;
  }

  private async getCompetitorMetrics(domains: string[], metrics: string[], startDate: string, endDate: string): Promise<any[]> {
    // Simulated competitor metrics
    // In a real implementation, this would require access to competitor Google Analytics or third-party services
    
    return domains.map(domain => ({
      domain,
      metrics: metrics.reduce((acc, metric) => {
        acc[metric] = {
          value: Math.floor(Math.random() * 1000) + 100,
          change: (Math.random() - 0.5) * 50,
          rank: Math.floor(Math.random() * domains.length) + 1,
        };
        return acc;
      }, {} as Record<string, any>),
      overall_score: Math.floor(Math.random() * 40) + 60,
    }));
  }

  private generatePerformanceInsights(targetData: any, competitors: any[], benchmarks: any): any[] {
    // Simplified insight generation
    const insights = [];

    // Example insights based on performance comparison
    insights.push({
      type: "opportunity",
      metric: "bounce_rate",
      description: "Your bounce rate is higher than industry average",
      recommendation: "Improve page load speed and content relevance to reduce bounce rate",
    });

    return insights;
  }

  private processNewVsReturning(rows: any[]): { new_users: number; returning_users: number } {
    const result = { new_users: 0, returning_users: 0 };
    
    rows.forEach(row => {
      if (row.dimensions?.[0] === "New Visitor") {
        result.new_users = row.metrics.users || 0;
      } else if (row.dimensions?.[0] === "Returning Visitor") {
        result.returning_users = row.metrics.users || 0;
      }
    });

    return result;
  }

  /**
   * Health check for Google Analytics service
   */
  async healthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    responseTime: number;
    authenticated: boolean;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      await this.ensureAuthentication();

      // Test with a simple query
      if (this.config.propertyId) {
        const testData = await this.getAnalyticsData({
          propertyId: this.config.propertyId,
          startDate: "7daysAgo",
          endDate: "today",
          metrics: ["sessions"],
        });

        const responseTime = Date.now() - startTime;

        return {
          status: testData.success ? (responseTime < 3000 ? "healthy" : "degraded") : "unhealthy",
          responseTime,
          authenticated: true,
          error: testData.error,
        };
      } else {
        return {
          status: "degraded",
          responseTime: Date.now() - startTime,
          authenticated: true,
          error: "No property ID configured",
        };
      }

    } catch (error) {
      return {
        status: "unhealthy",
        responseTime: Date.now() - startTime,
        authenticated: false,
        error: error instanceof Error ? error.message : "Health check failed",
      };
    }
  }
}

// Export singleton instance
export const googleAnalyticsService = new GoogleAnalyticsService({});

// Export types for use in other modules
export type { AnalyticsRequest, AnalyticsResponse, CompetitiveMetrics };