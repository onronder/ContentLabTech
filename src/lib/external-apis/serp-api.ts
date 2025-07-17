/**
 * SERP API Integration Service
 * Search engine results and ranking analysis for competitive intelligence
 */

import { z } from "zod";

// Configuration schema
const serpApiConfigSchema = z.object({
  apiKey: z.string().optional().default("not_configured"),
  baseUrl: z.string().url().default("https://serpapi.com/search"),
  timeout: z.number().default(30000),
  retryAttempts: z.number().default(3),
});

// Request/Response schemas
const serpRequestSchema = z.object({
  query: z.string(),
  engine: z.enum(["google", "bing", "yahoo", "duckduckgo"]).default("google"),
  location: z.string().optional(),
  language: z.string().default("en"),
  country: z.string().default("us"),
  device: z.enum(["desktop", "mobile", "tablet"]).default("desktop"),
  resultCount: z.number().min(1).max(100).default(100),
  includeRelated: z.boolean().default(true),
  includePeople: z.boolean().default(false),
  includeImages: z.boolean().default(false),
  includeVideos: z.boolean().default(false),
  includeNews: z.boolean().default(false),
});

const serpResponseSchema = z.object({
  success: z.boolean(),
  searchParameters: z.object({
    query: z.string(),
    engine: z.string(),
    location: z.string().optional(),
    language: z.string(),
    country: z.string(),
    device: z.string(),
  }),
  organicResults: z.array(
    z.object({
      position: z.number(),
      title: z.string(),
      url: z.string(),
      domain: z.string(),
      snippet: z.string(),
      displayedUrl: z.string().optional(),
      date: z.string().optional(),
      cached: z.boolean().default(false),
      related: z.array(z.string()).optional(),
      sitelinks: z
        .array(
          z.object({
            title: z.string(),
            url: z.string(),
          })
        )
        .optional(),
      richSnippet: z
        .object({
          type: z.string().optional(),
          rating: z.number().optional(),
          reviews: z.number().optional(),
          price: z.string().optional(),
          availability: z.string().optional(),
        })
        .optional(),
    })
  ),
  featuredSnippet: z
    .object({
      title: z.string(),
      url: z.string(),
      domain: z.string(),
      snippet: z.string(),
      type: z.enum(["paragraph", "list", "table", "video"]),
    })
    .optional(),
  peopleAlsoAsk: z
    .array(
      z.object({
        question: z.string(),
        snippet: z.string(),
        url: z.string(),
        domain: z.string(),
      })
    )
    .optional(),
  relatedSearches: z
    .array(
      z.object({
        query: z.string(),
        url: z.string(),
      })
    )
    .optional(),
  totalResults: z.number(),
  timeTaken: z.number(),
  pagination: z
    .object({
      current: z.number(),
      next: z.string().optional(),
      pages: z.array(z.number()),
    })
    .optional(),
  error: z.string().optional(),
  metadata: z.object({
    timestamp: z.string(),
    processingTime: z.number(),
    credits_used: z.number(),
  }),
});

const rankingAnalysisSchema = z.object({
  domain: z.string(),
  keywords: z.array(z.string()),
  competitors: z.array(z.string()),
  location: z.string().optional(),
  device: z.enum(["desktop", "mobile"]).default("desktop"),
});

type SerpRequest = z.infer<typeof serpRequestSchema>;
type SerpResponse = z.infer<typeof serpResponseSchema>;
type RankingAnalysis = z.infer<typeof rankingAnalysisSchema>;

export class SerpApiService {
  private config: z.infer<typeof serpApiConfigSchema>;
  private requestQueue: Array<{
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
    request: () => Promise<unknown>;
  }> = [];
  private isProcessingQueue = false;
  private readonly maxConcurrentRequests = 5;

  constructor(config: Partial<z.infer<typeof serpApiConfigSchema>>) {
    this.config = serpApiConfigSchema.parse({
      apiKey: process.env["SERP_API_KEY"],
      ...config,
    });
  }

  /**
   * Perform SERP search for a specific query
   */
  async search(request: SerpRequest): Promise<SerpResponse> {
    const startTime = Date.now();

    return this.enqueueRequest(async () => {
      let retries = 0;

      while (retries <= this.config.retryAttempts) {
        try {
          const params = new URLSearchParams({
            q: request.query,
            engine: request.engine,
            api_key: this.config.apiKey,
            hl: request.language,
            gl: request.country,
            num: request.resultCount.toString(),
            device: request.device,
            ...(request.location && { location: request.location }),
          });

          const response = await fetch(`${this.config.baseUrl}?${params}`, {
            method: "GET",
            headers: {
              "User-Agent": "ContentLab-Nexus/1.0",
            },
            signal: AbortSignal.timeout(this.config.timeout),
          });

          if (!response.ok) {
            if (response.status === 429) {
              // Rate limit hit
              const retryAfter = parseInt(
                response.headers.get("Retry-After") || "60"
              );
              await this.delay(retryAfter * 1000);
              retries++;
              continue;
            }
            throw new Error(
              `SERP API error: ${response.status} ${response.statusText}`
            );
          }

          const rawData = await response.json();

          // Transform and validate the response
          const transformedData = this.transformSerpResponse(
            rawData,
            request,
            Date.now() - startTime
          );
          return serpResponseSchema.parse(transformedData);
        } catch (error) {
          retries++;

          if (retries > this.config.retryAttempts) {
            return {
              success: false,
              searchParameters: {
                query: request.query,
                engine: request.engine,
                location: request.location,
                language: request.language,
                country: request.country,
                device: request.device,
              },
              organicResults: [],
              totalResults: 0,
              timeTaken: 0,
              error: error instanceof Error ? error.message : "Unknown error",
              metadata: {
                timestamp: new Date().toISOString(),
                processingTime: Date.now() - startTime,
                credits_used: 0,
              },
            };
          }

          // Exponential backoff
          await this.delay(Math.pow(2, retries) * 1000);
        }
      }

      throw new Error("Maximum retries exceeded");
    });
  }

  /**
   * Analyze keyword rankings for multiple domains
   */
  async analyzeRankings(analysis: RankingAnalysis): Promise<{
    success: boolean;
    data?: {
      domain: string;
      rankings: Array<{
        keyword: string;
        position: number | null;
        url: string | null;
        title: string | null;
        featured_snippet: boolean;
        competitors_above: Array<{
          domain: string;
          position: number;
          url: string;
        }>;
      }>;
      summary: {
        total_keywords: number;
        ranking_keywords: number;
        avg_position: number;
        top_10_rankings: number;
        featured_snippets: number;
      };
    };
    error?: string;
  }> {
    try {
      const rankingResults: any[] = [];

      // Process keywords in batches to avoid overwhelming the API
      const batchSize = 10;
      for (let i = 0; i < analysis.keywords.length; i += batchSize) {
        const keywordBatch = analysis.keywords.slice(i, i + batchSize);

        const batchPromises = keywordBatch.map(async keyword => {
          const serpResult = await this.search({
            query: keyword,
            engine: "google",
            location: analysis.location,
            device: analysis.device,
            resultCount: 100,
            includeRelated: false,
            language: "en",
            country: "us",
            includePeople: false,
            includeImages: false,
            includeVideos: false,
            includeNews: false,
          });

          if (!serpResult.success) {
            return {
              keyword,
              position: null,
              url: null,
              title: null,
              featured_snippet: false,
              competitors_above: [],
            };
          }

          // Find target domain position
          const targetPosition = serpResult.organicResults.find(
            result => this.extractDomain(result.url) === analysis.domain
          );

          // Find competitors above target domain
          const competitorsAbove = serpResult.organicResults
            .filter(result => {
              const domain = this.extractDomain(result.url);
              return (
                analysis.competitors.includes(domain) &&
                (!targetPosition || result.position < targetPosition.position)
              );
            })
            .map(result => ({
              domain: this.extractDomain(result.url),
              position: result.position,
              url: result.url,
            }));

          // Check for featured snippet
          const hasFeaturedSnippet =
            serpResult.featuredSnippet &&
            this.extractDomain(serpResult.featuredSnippet.url) ===
              analysis.domain;

          return {
            keyword,
            position: targetPosition?.position || null,
            url: targetPosition?.url || null,
            title: targetPosition?.title || null,
            featured_snippet: hasFeaturedSnippet,
            competitors_above: competitorsAbove,
          };
        });

        const batchResults = await Promise.allSettled(batchPromises);

        batchResults.forEach(result => {
          if (result.status === "fulfilled") {
            rankingResults.push(result.value);
          }
        });

        // Add delay between batches
        if (i + batchSize < analysis.keywords.length) {
          await this.delay(2000);
        }
      }

      // Calculate summary statistics
      const rankingKeywords = rankingResults.filter(r => r.position !== null);
      const positions = rankingKeywords
        .map(r => r.position)
        .filter(p => p !== null);

      const summary = {
        total_keywords: analysis.keywords.length,
        ranking_keywords: rankingKeywords.length,
        avg_position:
          positions.length > 0
            ? positions.reduce((a, b) => a + b, 0) / positions.length
            : 0,
        top_10_rankings: positions.filter(p => p <= 10).length,
        featured_snippets: rankingResults.filter(r => r.featured_snippet)
          .length,
      };

      return {
        success: true,
        data: {
          domain: analysis.domain,
          rankings: rankingResults,
          summary,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Ranking analysis failed",
      };
    }
  }

  /**
   * Get keyword suggestions and search volume data
   */
  async getKeywordSuggestions(
    seedKeyword: string,
    options: {
      country?: string;
      language?: string;
      limit?: number;
      includeQuestions?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    data?: {
      seed_keyword: string;
      suggestions: Array<{
        keyword: string;
        search_volume: number;
        competition: "low" | "medium" | "high";
        cpc: number;
        trend: "rising" | "stable" | "declining";
        difficulty: number;
      }>;
    };
    error?: string;
  }> {
    try {
      // Use Google Keyword Planner through SERP API
      const params = new URLSearchParams({
        engine: "google_keyword_planner",
        api_key: this.config.apiKey,
        q: seedKeyword,
        gl: options.country || "us",
        hl: options.language || "en",
        num: (options.limit || 50).toString(),
      });

      const response = await fetch(`${this.config.baseUrl}?${params}`, {
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`Keyword suggestions error: ${response.statusText}`);
      }

      const data = await response.json();

      // Transform the response based on actual SERP API structure
      const suggestions = (data.keyword_ideas || []).map((idea: any) => ({
        keyword: idea.keyword,
        search_volume: idea.search_volume || 0,
        competition: this.mapCompetition(idea.competition),
        cpc: idea.cpc?.value || 0,
        trend: idea.trend || "stable",
        difficulty: this.calculateDifficulty(idea),
      }));

      return {
        success: true,
        data: {
          seed_keyword: seedKeyword,
          suggestions,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Keyword suggestions failed",
      };
    }
  }

  /**
   * Monitor keyword rankings over time
   */
  async setupRankingMonitoring(config: {
    keywords: string[];
    domains: string[];
    frequency: "daily" | "weekly" | "monthly";
    locations?: string[];
    devices?: ("desktop" | "mobile")[];
  }): Promise<{
    success: boolean;
    monitorId?: string;
    message: string;
  }> {
    try {
      // This would typically involve setting up a recurring job
      // For now, we'll create a mock monitoring setup
      const monitorId = `monitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // In a real implementation, this would:
      // 1. Store the monitoring configuration in database
      // 2. Set up a scheduled job (cron/queue)
      // 3. Configure webhook callbacks for changes

      return {
        success: true,
        monitorId,
        message: `Ranking monitoring setup for ${config.keywords.length} keywords across ${config.domains.length} domains`,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to setup monitoring",
      };
    }
  }

  private transformSerpResponse(
    rawData: any,
    request: SerpRequest,
    processingTime: number
  ): any {
    return {
      success: true,
      searchParameters: {
        query: request.query,
        engine: request.engine,
        location: request.location,
        language: request.language,
        country: request.country,
        device: request.device,
      },
      organicResults: (rawData.organic_results || []).map(
        (result: any, index: number) => ({
          position: result.position || index + 1,
          title: result.title || "",
          url: result.link || "",
          domain: this.extractDomain(result.link || ""),
          snippet: result.snippet || "",
          displayedUrl: result.displayed_link,
          date: result.date,
          cached: false,
          related: result.related_pages_link
            ? [result.related_pages_link]
            : undefined,
          sitelinks: result.sitelinks,
          richSnippet: result.rich_snippet
            ? {
                type: result.rich_snippet.top?.extensions?.type,
                rating: result.rich_snippet.top?.extensions?.rating,
                reviews: result.rich_snippet.top?.extensions?.reviews,
                price: result.rich_snippet.top?.extensions?.price,
                availability: result.rich_snippet.top?.extensions?.availability,
              }
            : undefined,
        })
      ),
      featuredSnippet: rawData.answer_box
        ? {
            title: rawData.answer_box.title,
            url: rawData.answer_box.link,
            domain: this.extractDomain(rawData.answer_box.link || ""),
            snippet: rawData.answer_box.snippet || rawData.answer_box.answer,
            type: rawData.answer_box.type || "paragraph",
          }
        : undefined,
      peopleAlsoAsk: rawData.related_questions?.map((q: any) => ({
        question: q.question,
        snippet: q.snippet,
        url: q.link,
        domain: this.extractDomain(q.link || ""),
      })),
      relatedSearches: rawData.related_searches?.map((search: any) => ({
        query: search.query,
        url: search.link,
      })),
      totalResults: rawData.search_information?.total_results || 0,
      timeTaken: rawData.search_information?.time_taken_displayed || 0,
      pagination: rawData.pagination
        ? {
            current: rawData.pagination.current,
            next: rawData.pagination.next,
            pages: rawData.pagination.pages || [],
          }
        : undefined,
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime,
        credits_used: 1,
      },
    };
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return "";
    }
  }

  private mapCompetition(competition: any): "low" | "medium" | "high" {
    if (typeof competition === "string") {
      return competition.toLowerCase() as "low" | "medium" | "high";
    }
    if (typeof competition === "number") {
      return competition < 0.33
        ? "low"
        : competition < 0.66
          ? "medium"
          : "high";
    }
    return "medium";
  }

  private calculateDifficulty(idea: any): number {
    // Simplified difficulty calculation based on competition and search volume
    const competition = idea.competition?.value || 0.5;
    const searchVolume = idea.search_volume || 100;

    // Higher competition and higher search volume = higher difficulty
    const difficulty =
      (competition * 0.7 + (Math.log(searchVolume) / Math.log(100000)) * 0.3) *
      100;
    return Math.min(Math.max(Math.round(difficulty), 1), 100);
  }

  private async enqueueRequest<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        resolve: resolve as (value: unknown) => void,
        reject,
        request: request as () => Promise<unknown>,
      });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const batch = this.requestQueue.splice(0, this.maxConcurrentRequests);

      const promises = batch.map(async ({ resolve, reject, request }) => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      await Promise.allSettled(promises);

      // Add delay between batches to respect rate limits
      if (this.requestQueue.length > 0) {
        await this.delay(1000);
      }
    }

    this.isProcessingQueue = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check for SERP API service
   */
  async healthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    responseTime: number;
    credits_remaining?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const params = new URLSearchParams({
        engine: "google",
        q: "test",
        api_key: this.config.apiKey,
        num: "1",
      });

      const response = await fetch(`${this.config.baseUrl}?${params}`, {
        signal: AbortSignal.timeout(5000),
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        return {
          status: responseTime < 3000 ? "healthy" : "degraded",
          responseTime,
          credits_remaining: data.credits_remaining,
        };
      } else {
        return {
          status: "unhealthy",
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
    } catch (error) {
      return {
        status: "unhealthy",
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Health check failed",
      };
    }
  }
}

// Export singleton instance
export const serpApiService = new SerpApiService({
  apiKey: process.env["SERPAPI_API_KEY"] || "not_configured",
});

// Export types for use in other modules
export type { SerpRequest, SerpResponse, RankingAnalysis };
