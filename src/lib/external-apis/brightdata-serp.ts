/**
 * BrightData SERP Proxy Service
 * Advanced SERP data collection using BrightData's proxy infrastructure
 * Combines proxy-based scraping with API fallbacks for maximum reliability
 */

import { z } from "zod";
import https from "https";
import { HttpsProxyAgent } from "https-proxy-agent";

// Configuration schemas
const brightDataSerpConfigSchema = z.object({
  // Proxy configuration
  proxyHost: z.string().default("brd.superproxy.io"),
  proxyPort: z.number().default(33335),
  customerId: z.string(),
  zone: z.string(),
  password: z.string(),

  // API configuration (fallback)
  serpApiKey: z.string().optional(),
  serpApiUrl: z.string().url().default("https://serpapi.com/search"),

  // General settings
  timeout: z.number().default(30000),
  retryAttempts: z.number().default(3),
  useProxy: z.boolean().default(true),
  userAgent: z
    .string()
    .default(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
});

// Request/Response schemas
const serpProxyRequestSchema = z.object({
  query: z.string(),
  engine: z.enum(["google", "bing", "yahoo"]).default("google"),
  location: z.string().optional(),
  language: z.string().default("en"),
  country: z.string().default("us"),
  device: z.enum(["desktop", "mobile", "tablet"]).default("desktop"),
  resultCount: z.number().min(1).max(100).default(100),
  includeImages: z.boolean().default(false),
  includeVideos: z.boolean().default(false),
  includeNews: z.boolean().default(false),
  includeShopping: z.boolean().default(false),
});

const serpProxyResponseSchema = z.object({
  success: z.boolean(),
  source: z.enum(["proxy", "api", "cache"]),
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
      richSnippet: z
        .object({
          type: z.string().optional(),
          rating: z.number().optional(),
          reviews: z.number().optional(),
          price: z.string().optional(),
        })
        .optional(),
      sitelinks: z
        .array(
          z.object({
            title: z.string(),
            url: z.string(),
          })
        )
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
  adResults: z
    .array(
      z.object({
        position: z.number(),
        title: z.string(),
        url: z.string(),
        domain: z.string(),
        description: z.string(),
      })
    )
    .optional(),
  totalResults: z.number(),
  timeTaken: z.number(),
  metadata: z.object({
    timestamp: z.string(),
    processingTime: z.number(),
    retries: z.number(),
    ipLocation: z.string().optional(),
    proxyUsed: z.boolean(),
  }),
  error: z.string().optional(),
});

// Competitive intelligence specific schemas
const competitorRankingSchema = z.object({
  domain: z.string(),
  keywords: z.array(z.string()),
  competitors: z.array(z.string()),
  location: z.string().optional(),
  device: z.enum(["desktop", "mobile"]).default("desktop"),
  includePaid: z.boolean().default(true),
  includeLocal: z.boolean().default(false),
});

type SerpProxyRequest = z.infer<typeof serpProxyRequestSchema>;
type SerpProxyResponse = z.infer<typeof serpProxyResponseSchema>;
type CompetitorRanking = z.infer<typeof competitorRankingSchema>;

export class BrightDataSerpService {
  private config: z.infer<typeof brightDataSerpConfigSchema>;
  private proxyAgent: HttpsProxyAgent<string> | null = null;
  private requestQueue: Array<{
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
    request: () => Promise<any>;
  }> = [];
  private isProcessingQueue = false;
  private readonly maxConcurrentRequests = 3;
  private rateLimitMap = new Map<string, number>();

  constructor(config?: Partial<z.infer<typeof brightDataSerpConfigSchema>>) {
    this.config = brightDataSerpConfigSchema.parse({
      customerId: process.env["BRIGHTDATA_CUSTOMER_ID"],
      zone: process.env["BRIGHTDATA_ZONE"],
      password: process.env["BRIGHTDATA_PASSWORD"],
      proxyHost: process.env["BRIGHTDATA_PROXY_HOST"],
      proxyPort: parseInt(process.env["BRIGHTDATA_PROXY_PORT"] || "33335"),
      serpApiKey: process.env["SERPAPI_API_KEY"],
      ...config,
    });

    this.initializeProxy();
  }

  private initializeProxy(): void {
    if (!this.config.useProxy) return;

    const proxyUsername = `brd-customer-${this.config.customerId}-zone-${this.config.zone}`;
    const proxyUrl = `http://${proxyUsername}:${this.config.password}@${this.config.proxyHost}:${this.config.proxyPort}`;

    this.proxyAgent = new HttpsProxyAgent<string>(proxyUrl, {
      rejectUnauthorized: false, // Allow self-signed certificates
      timeout: this.config.timeout,
    });
  }

  /**
   * Perform SERP search using BrightData proxy with API fallback
   */
  async search(request: SerpProxyRequest): Promise<SerpProxyResponse> {
    return this.enqueueRequest(async () => {
      const startTime = Date.now();
      let lastError: Error | null = null;

      // Try proxy-based scraping first
      if (this.config.useProxy && this.proxyAgent) {
        try {
          const proxyResult = await this.searchWithProxy(request, startTime);
          if (proxyResult.success) {
            return proxyResult;
          }
          lastError = new Error(proxyResult.error || "Proxy search failed");
        } catch (error) {
          lastError = error instanceof Error ? error : new Error("Proxy error");
          console.error("Proxy search failed:", lastError.message);
        }
      }

      // Fallback to SERP API if proxy fails
      if (this.config.serpApiKey) {
        try {
          console.log("Falling back to SERP API");
          return await this.searchWithSerpApi(request, startTime);
        } catch (error) {
          lastError = error instanceof Error ? error : new Error("API error");
          console.error("SERP API fallback failed:", lastError.message);
        }
      }

      // Return error response if all methods fail
      return this.createErrorResponse(request, startTime, lastError);
    });
  }

  /**
   * Search using BrightData proxy
   */
  private async searchWithProxy(
    request: SerpProxyRequest,
    startTime: number
  ): Promise<SerpProxyResponse> {
    if (!this.proxyAgent) {
      throw new Error("Proxy agent not initialized");
    }

    await this.checkRateLimit(request.query);

    const searchUrl = this.buildSearchUrl(request);

    return new Promise((resolve, reject) => {
      const options = {
        agent: this.proxyAgent!,
        headers: {
          "User-Agent": this.config.userAgent,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": `${request.language},en;q=0.5`,
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        timeout: this.config.timeout,
      };

      const req = https.get(searchUrl, options, response => {
        let data = "";

        response.on("data", chunk => {
          data += chunk;
        });

        response.on("end", () => {
          try {
            const parsedResult = this.parseHtmlResults(
              data,
              request,
              Date.now() - startTime,
              true
            );
            this.updateRateLimit(request.query);
            resolve(parsedResult);
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on("error", error => {
        reject(error);
      });

      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Request timeout"));
      });
    });
  }

  /**
   * Search using SERP API as fallback
   */
  private async searchWithSerpApi(
    request: SerpProxyRequest,
    startTime: number
  ): Promise<SerpProxyResponse> {
    if (!this.config.serpApiKey) {
      throw new Error("SERP API key not configured");
    }

    const params = new URLSearchParams({
      q: request.query,
      engine: request.engine,
      api_key: this.config.serpApiKey,
      hl: request.language,
      gl: request.country,
      num: request.resultCount.toString(),
      device: request.device,
      ...(request.location && { location: request.location }),
    });

    const response = await fetch(`${this.config.serpApiUrl}?${params}`, {
      method: "GET",
      headers: {
        "User-Agent": "ContentLab-Nexus/1.0",
      },
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(
        `SERP API error: ${response.status} ${response.statusText}`
      );
    }

    const rawData = await response.json();
    return this.transformSerpApiResponse(
      rawData,
      request,
      Date.now() - startTime
    );
  }

  /**
   * Analyze competitor rankings using BrightData proxy
   */
  async analyzeCompetitorRankings(analysis: CompetitorRanking): Promise<{
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
          title: string;
        }>;
        paid_competitors: Array<{
          domain: string;
          position: number;
          url: string;
          title: string;
        }>;
      }>;
      summary: {
        total_keywords: number;
        ranking_keywords: number;
        avg_position: number;
        top_10_rankings: number;
        featured_snippets: number;
        competitive_visibility: number;
      };
    };
    error?: string;
  }> {
    try {
      const rankingResults: any[] = [];

      // Process keywords in smaller batches for proxy requests
      const batchSize = 5;
      for (let i = 0; i < analysis.keywords.length; i += batchSize) {
        const keywordBatch = analysis.keywords.slice(i, i + batchSize);

        const batchPromises = keywordBatch.map(async keyword => {
          const serpResult = await this.search({
            query: keyword,
            engine: "google",
            location: analysis.location,
            device: analysis.device,
            resultCount: 100,
            language: "en",
            country: "us",
            includeImages: false,
            includeVideos: false,
            includeNews: false,
            includeShopping: analysis.includePaid,
          });

          if (!serpResult.success) {
            return {
              keyword,
              position: null,
              url: null,
              title: null,
              featured_snippet: false,
              competitors_above: [],
              paid_competitors: [],
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
              title: result.title,
            }));

          // Find paid competitors if ads are included
          const paidCompetitors = (serpResult.adResults || [])
            .filter(ad =>
              analysis.competitors.includes(this.extractDomain(ad.url))
            )
            .map(ad => ({
              domain: this.extractDomain(ad.url),
              position: ad.position,
              url: ad.url,
              title: ad.title,
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
            paid_competitors: paidCompetitors,
          };
        });

        const batchResults = await Promise.allSettled(batchPromises);

        batchResults.forEach(result => {
          if (result.status === "fulfilled") {
            rankingResults.push(result.value);
          }
        });

        // Add delay between batches for proxy rate limiting
        if (i + batchSize < analysis.keywords.length) {
          await this.delay(3000); // Longer delay for proxy requests
        }
      }

      // Calculate comprehensive summary statistics
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
        competitive_visibility: this.calculateCompetitiveVisibility(
          rankingResults,
          analysis.competitors
        ),
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
   * Get real-time SERP data for keyword tracking
   */
  async getKeywordPositions(
    keywords: string[],
    domain: string,
    options: {
      location?: string;
      device?: "desktop" | "mobile";
      trackHistory?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    data?: Array<{
      keyword: string;
      position: number | null;
      url: string | null;
      change: number | null;
      featured: boolean;
      timestamp: string;
    }>;
    error?: string;
  }> {
    try {
      const positions: any[] = [];

      for (const keyword of keywords) {
        const result = await this.search({
          query: keyword,
          engine: "google",
          location: options.location,
          device: options.device || "desktop",
          resultCount: 50,
          language: "en",
          country: "us",
          includeImages: false,
          includeVideos: false,
          includeNews: false,
          includeShopping: false,
        });

        if (result.success) {
          const targetResult = result.organicResults.find(
            r => this.extractDomain(r.url) === domain
          );

          const featured =
            result.featuredSnippet &&
            this.extractDomain(result.featuredSnippet.url) === domain;

          positions.push({
            keyword,
            position: targetResult?.position || null,
            url: targetResult?.url || null,
            change: null, // Would be calculated from historical data
            featured,
            timestamp: new Date().toISOString(),
          });
        }

        // Rate limiting
        await this.delay(2000);
      }

      return {
        success: true,
        data: positions,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Position tracking failed",
      };
    }
  }

  // Private helper methods
  private buildSearchUrl(request: SerpProxyRequest): string {
    const params = new URLSearchParams({
      q: request.query,
      hl: request.language,
      gl: request.country,
      num: request.resultCount.toString(),
    });

    if (request.location) {
      params.set("uule", this.encodeLocation(request.location));
    }

    return `https://www.google.com/search?${params.toString()}`;
  }

  private encodeLocation(location: string): string {
    // Google's UULE parameter encoding for location
    const encoded = Buffer.from(location).toString("base64");
    return `w+CAIQICI${encoded}`;
  }

  private parseHtmlResults(
    html: string,
    request: SerpProxyRequest,
    processingTime: number,
    proxyUsed: boolean
  ): SerpProxyResponse {
    // This is a simplified HTML parser - in production, you'd use cheerio or similar
    const organicResults: any[] = [];

    // Extract organic results using regex patterns (simplified)
    const resultPattern =
      /<div[^>]*data-ved[^>]*>[\s\S]*?<h3[^>]*>(.*?)<\/h3>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<span[^>]*>(.*?)<\/span>/g;

    let match;
    let position = 1;

    while (
      (match = resultPattern.exec(html)) !== null &&
      position <= request.resultCount
    ) {
      const [, title, url, snippet] = match;

      if (title && url && snippet) {
        organicResults.push({
          position,
          title: this.cleanText(title),
          url: this.cleanUrl(url),
          domain: this.extractDomain(this.cleanUrl(url)),
          snippet: this.cleanText(snippet),
          displayedUrl: this.cleanUrl(url),
        });
        position++;
      }
    }

    return {
      success: true,
      source: "proxy",
      searchParameters: {
        query: request.query,
        engine: request.engine,
        location: request.location,
        language: request.language,
        country: request.country,
        device: request.device,
      },
      organicResults,
      totalResults: this.extractTotalResults(html),
      timeTaken: 0,
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime,
        retries: 0,
        proxyUsed,
      },
    };
  }

  private transformSerpApiResponse(
    rawData: any,
    request: SerpProxyRequest,
    processingTime: number
  ): SerpProxyResponse {
    return {
      success: true,
      source: "api",
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
          richSnippet: result.rich_snippet
            ? {
                type: result.rich_snippet.top?.extensions?.type,
                rating: result.rich_snippet.top?.extensions?.rating,
                reviews: result.rich_snippet.top?.extensions?.reviews,
                price: result.rich_snippet.top?.extensions?.price,
              }
            : undefined,
          sitelinks: result.sitelinks,
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
      adResults: rawData.ads?.map((ad: any, index: number) => ({
        position: index + 1,
        title: ad.title,
        url: ad.link,
        domain: this.extractDomain(ad.link || ""),
        description: ad.description,
      })),
      totalResults: rawData.search_information?.total_results || 0,
      timeTaken: rawData.search_information?.time_taken_displayed || 0,
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime,
        retries: 0,
        proxyUsed: false,
      },
    };
  }

  private createErrorResponse(
    request: SerpProxyRequest,
    startTime: number,
    error: Error | null
  ): SerpProxyResponse {
    return {
      success: false,
      source: "proxy",
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
      error: error?.message || "Search failed",
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        retries: 0,
        proxyUsed: this.config.useProxy,
      },
    };
  }

  private calculateCompetitiveVisibility(
    results: any[],
    competitors: string[]
  ): number {
    const totalOpportunities = results.length * 10; // Top 10 positions
    const competitorPositions = results.flatMap(r =>
      r.competitors_above.map((c: any) => c.position)
    );

    const visibility = competitorPositions.filter(pos => pos <= 10).length;
    return totalOpportunities > 0 ? (visibility / totalOpportunities) * 100 : 0;
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return "";
    }
  }

  private extractTotalResults(html: string): number {
    const match = html.match(/About ([\d,]+) results/);
    return match ? parseInt(match[1]!.replace(/,/g, "")) : 0;
  }

  private cleanText(text: string): string {
    return text.replace(/<[^>]*>/g, "").trim();
  }

  private cleanUrl(url: string): string {
    if (url.startsWith("/url?q=")) {
      const match = url.match(/\/url\?q=([^&]*)/);
      return match ? decodeURIComponent(match[1]!) : url;
    }
    return url;
  }

  private async checkRateLimit(key: string): Promise<void> {
    const lastRequest = this.rateLimitMap.get(key);
    if (lastRequest) {
      const timeSinceLastRequest = Date.now() - lastRequest;
      const minInterval = 2000; // 2 seconds between similar requests

      if (timeSinceLastRequest < minInterval) {
        await this.delay(minInterval - timeSinceLastRequest);
      }
    }
  }

  private updateRateLimit(key: string): void {
    this.rateLimitMap.set(key, Date.now());
  }

  private async enqueueRequest<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ resolve, reject, request });
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
   * Health check for the service
   */
  async healthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    proxyStatus: "connected" | "disconnected" | "error";
    apiStatus: "available" | "unavailable";
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // Test proxy connection
      let proxyStatus: "connected" | "disconnected" | "error" = "disconnected";
      if (this.config.useProxy && this.proxyAgent) {
        try {
          await this.search({
            query: "test",
            engine: "google",
            resultCount: 1,
            language: "en",
            country: "us",
            device: "desktop",
            includeImages: false,
            includeVideos: false,
            includeNews: false,
            includeShopping: false,
          });
          proxyStatus = "connected";
        } catch {
          proxyStatus = "error";
        }
      }

      // Test API availability
      const apiStatus = this.config.serpApiKey ? "available" : "unavailable";

      const responseTime = Date.now() - startTime;
      const status =
        proxyStatus === "connected" || apiStatus === "available"
          ? responseTime < 5000
            ? "healthy"
            : "degraded"
          : "unhealthy";

      return {
        status,
        proxyStatus,
        apiStatus,
        responseTime,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        proxyStatus: "error",
        apiStatus: "unavailable",
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Health check failed",
      };
    }
  }
}

// Export singleton instance
export const brightDataSerpService = new BrightDataSerpService();

// Export types for use in other modules
export type { SerpProxyRequest, SerpProxyResponse, CompetitorRanking };
