import { CircuitBreaker } from "./circuit-breaker";
import { z } from "zod";

// Validation schemas
const CompetitorSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  url: z.string().url(),
  industry: z.string(),
  teamId: z.string().uuid(),
});

const AlertConfigSchema = z.object({
  teamId: z.string().uuid(),
  competitorId: z.string().uuid(),
  alertType: z.enum([
    "ranking_change",
    "traffic_change",
    "new_content",
    "keyword_opportunity",
  ]),
  threshold: z.number().min(0).max(100),
  frequency: z.enum(["immediate", "daily", "weekly"]),
});

const AnalysisResultSchema = z.object({
  id: z.string().uuid(),
  teamId: z.string().uuid(),
  competitorId: z.string().uuid(),
  analysisType: z.enum(["seo", "content", "keywords", "backlinks"]),
  data: z.record(z.any()),
  score: z.number().min(0).max(100),
  recommendations: z.array(z.string()),
  createdAt: z.string().datetime(),
});

const CompetitorCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().url("Valid URL is required"),
  industry: z.string().min(1, "Industry is required"),
  teamId: z.string().uuid("Valid team ID is required"),
});

const MetricsSchema = z.object({
  competitorId: z.string().uuid(),
  teamId: z.string().uuid(),
  metrics: z.object({
    organic_traffic: z.number().optional(),
    keyword_count: z.number().optional(),
    backlink_count: z.number().optional(),
    domain_authority: z.number().min(0).max(100).optional(),
    content_freshness: z.number().min(0).max(100).optional(),
  }),
});

export class CompetitiveService {
  private circuitBreaker = new CircuitBreaker({
    failureThreshold: 3,
    resetTimeout: 30000,
    monitoringPeriod: 60000,
  });

  private requestCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Safe API request wrapper with caching and deduplication
   */
  private async safeRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    useCache = true
  ): Promise<T> {
    // Check cache first
    if (useCache && this.requestCache.has(key)) {
      const cached = this.requestCache.get(key)!;
      if (Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.data;
      }
      this.requestCache.delete(key);
    }

    return this.circuitBreaker.execute(async () => {
      const result = await requestFn();

      // Cache successful results
      if (useCache) {
        this.requestCache.set(key, { data: result, timestamp: Date.now() });
      }

      return result;
    });
  }

  /**
   * Get competitors for a project (using teamId)
   */
  async getCompetitors(teamId: string) {
    const key = `competitors_${teamId}`;

    return this.safeRequest(key, async () => {
      const response = await fetch(
        `/api/competitive/competitors?teamId=${teamId}`,
        {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch competitors: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return z.array(CompetitorSchema).parse(data.competitors || []);
    });
  }

  /**
   * Create a new competitor
   */
  async createCompetitor(
    competitorData: z.infer<typeof CompetitorCreateSchema>
  ) {
    const key = `create_competitor_${competitorData.teamId}`;

    return this.safeRequest(
      key,
      async () => {
        const validatedData = CompetitorCreateSchema.parse(competitorData);

        const response = await fetch("/api/competitive/competitors", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validatedData),
        });

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Unknown error" }));
          throw new Error(
            `Failed to create competitor: ${response.status} - ${errorData.error}`
          );
        }

        const result = await response.json();

        // Invalidate competitors cache
        this.requestCache.delete(`competitors_${competitorData.teamId}`);

        return result;
      },
      false
    ); // Don't cache create operations
  }

  /**
   * Create a competitive alert
   */
  async createAlert(alertConfig: z.infer<typeof AlertConfigSchema>) {
    const key = `create_alert_${alertConfig.teamId}_${Date.now()}`;

    return this.safeRequest(
      key,
      async () => {
        const validatedConfig = AlertConfigSchema.parse(alertConfig);

        const response = await fetch("/api/competitive/alerts", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validatedConfig),
        });

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Unknown error" }));
          throw new Error(
            `Failed to create alert: ${response.status} - ${errorData.error}`
          );
        }

        const result = await response.json();

        // Invalidate alerts cache
        this.requestCache.delete(`alerts_${alertConfig.teamId}`);

        return result;
      },
      false
    );
  }

  /**
   * Get alerts for a team
   */
  async getAlerts(teamId: string) {
    const key = `alerts_${teamId}`;

    return this.safeRequest(key, async () => {
      const response = await fetch(`/api/competitive/alerts?teamId=${teamId}`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch alerts: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return data.alerts || [];
    });
  }

  /**
   * Get competitive analysis for a team
   */
  async getAnalysis(teamId: string) {
    const key = `analysis_${teamId}`;

    return this.safeRequest(key, async () => {
      const response = await fetch(
        `/api/competitive/analysis?teamId=${teamId}`,
        {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch analysis: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return z.array(AnalysisResultSchema).parse(data.results || []);
    });
  }

  /**
   * Trigger new analysis for a competitor
   */
  async triggerAnalysis(competitorId: string, analysisType: string) {
    const key = `trigger_analysis_${competitorId}_${analysisType}_${Date.now()}`;

    return this.safeRequest(
      key,
      async () => {
        const response = await fetch("/api/competitive/analysis/trigger", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ competitorId, analysisType }),
        });

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Unknown error" }));
          throw new Error(
            `Failed to trigger analysis: ${response.status} - ${errorData.error}`
          );
        }

        const result = await response.json();

        // Invalidate analysis cache
        this.requestCache.forEach((_, key) => {
          if (key.startsWith("analysis_")) {
            this.requestCache.delete(key);
          }
        });

        return result;
      },
      false
    );
  }

  /**
   * Get competitor metrics
   */
  async getMetrics(competitorId: string, teamId: string) {
    const key = `metrics_${competitorId}_${teamId}`;

    return this.safeRequest(key, async () => {
      const response = await fetch(
        `/api/competitive/metrics?competitorId=${competitorId}&teamId=${teamId}`,
        {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch metrics: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return data.metrics || {};
    });
  }

  /**
   * Update competitor metrics
   */
  async updateMetrics(metricsData: z.infer<typeof MetricsSchema>) {
    const key = `update_metrics_${metricsData.competitorId}_${Date.now()}`;

    return this.safeRequest(
      key,
      async () => {
        const validatedData = MetricsSchema.parse(metricsData);

        const response = await fetch("/api/competitive/metrics", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validatedData),
        });

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Unknown error" }));
          throw new Error(
            `Failed to update metrics: ${response.status} - ${errorData.error}`
          );
        }

        const result = await response.json();

        // Invalidate metrics cache
        this.requestCache.delete(
          `metrics_${metricsData.competitorId}_${metricsData.teamId}`
        );

        return result;
      },
      false
    );
  }

  /**
   * Delete a competitor
   */
  async deleteCompetitor(competitorId: string, teamId: string) {
    const key = `delete_competitor_${competitorId}_${Date.now()}`;

    return this.safeRequest(
      key,
      async () => {
        const response = await fetch(
          `/api/competitive/competitors/${competitorId}`,
          {
            method: "DELETE",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          }
        );

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Unknown error" }));
          throw new Error(
            `Failed to delete competitor: ${response.status} - ${errorData.error}`
          );
        }

        // Invalidate related caches
        this.requestCache.delete(`competitors_${teamId}`);
        this.requestCache.delete(`metrics_${competitorId}_${teamId}`);
        this.requestCache.forEach((_, key) => {
          if (key.includes(competitorId)) {
            this.requestCache.delete(key);
          }
        });

        return { success: true };
      },
      false
    );
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus() {
    return {
      state: this.circuitBreaker.getState(),
      failures: this.circuitBreaker.getFailures(),
      cacheSize: this.requestCache.size,
    };
  }

  /**
   * Clear cache manually
   */
  clearCache() {
    this.requestCache.clear();
  }
}

export const competitiveService = new CompetitiveService();
