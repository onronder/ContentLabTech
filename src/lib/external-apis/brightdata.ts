/**
 * BrightData Integration Service
 * Web scraping and data collection for competitive intelligence
 */

import { z } from "zod";

// Configuration schema
const brightDataConfigSchema = z.object({
  apiToken: z.string(),
  baseUrl: z.string().url().default("https://brightdata.com/api"),
  timeout: z.number().default(30000),
  retryAttempts: z.number().default(3),
});

// Request/Response schemas
const _scrapeRequestSchema = z.object({
  url: z.string().url(),
  type: z.enum(["content", "seo", "performance", "social"]),
  options: z
    .object({
      includeImages: z.boolean().default(false),
      includeStyles: z.boolean().default(false),
      includeScripts: z.boolean().default(false),
      waitForSelector: z.string().optional(),
      userAgent: z.string().optional(),
      viewport: z
        .object({
          width: z.number().default(1920),
          height: z.number().default(1080),
        })
        .optional(),
    })
    .default({}),
});

const scrapeResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    url: z.string(),
    title: z.string().optional(),
    content: z.string(),
    metadata: z.object({
      description: z.string().optional(),
      keywords: z.array(z.string()).optional(),
      ogTags: z.record(z.string()).optional(),
      twitterTags: z.record(z.string()).optional(),
      structuredData: z.array(z.record(z.unknown())).optional(),
    }),
    performance: z
      .object({
        loadTime: z.number(),
        domContentLoaded: z.number(),
        firstContentfulPaint: z.number(),
        largestContentfulPaint: z.number(),
        cumulativeLayoutShift: z.number(),
        firstInputDelay: z.number(),
      })
      .optional(),
    seo: z
      .object({
        headings: z.record(z.array(z.string())),
        internalLinks: z.array(z.string()),
        externalLinks: z.array(z.string()),
        images: z.array(
          z.object({
            src: z.string(),
            alt: z.string().optional(),
            width: z.number().optional(),
            height: z.number().optional(),
          })
        ),
        canonicalUrl: z.string().optional(),
        robotsTag: z.string().optional(),
      })
      .optional(),
    content_analysis: z
      .object({
        wordCount: z.number(),
        readingTime: z.number(),
        sentiment: z
          .object({
            score: z.number(),
            label: z.enum(["positive", "negative", "neutral"]),
            confidence: z.number(),
          })
          .optional(),
        topics: z.array(
          z.object({
            name: z.string(),
            confidence: z.number(),
            keywords: z.array(z.string()),
          })
        ),
        readabilityScore: z.number().optional(),
      })
      .optional(),
  }),
  error: z.string().optional(),
  metadata: z.object({
    timestamp: z.string(),
    processingTime: z.number(),
    retries: z.number(),
  }),
});

type ScrapeRequest = z.infer<typeof _scrapeRequestSchema>;
type ScrapeResponse = z.infer<typeof scrapeResponseSchema>;

export class BrightDataService {
  private config: z.infer<typeof brightDataConfigSchema>;
  private rateLimitQueue: Map<string, number> = new Map();

  constructor(config: Partial<z.infer<typeof brightDataConfigSchema>>) {
    this.config = brightDataConfigSchema.parse({
      apiToken: process.env["BRIGHTDATA_API_TOKEN"],
      ...config,
    });
  }

  /**
   * Scrape website content and metadata
   */
  async scrapeWebsite(request: ScrapeRequest): Promise<ScrapeResponse> {
    const startTime = Date.now();
    let retries = 0;

    // Rate limiting check
    await this.checkRateLimit(request.url);

    while (retries <= this.config.retryAttempts) {
      try {
        const response = await this.makeRequest("/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: request.url,
            type: request.type,
            options: {
              ...request.options,
              timeout: this.config.timeout,
            },
          }),
          signal: AbortSignal.timeout(this.config.timeout),
        });

        if (!response.ok) {
          if (response.status === 429) {
            // Rate limit hit, implement exponential backoff
            const backoffTime = Math.pow(2, retries) * 1000;
            await this.delay(backoffTime);
            retries++;
            continue;
          }
          throw new Error(
            `BrightData API error: ${response.status} ${response.statusText}`
          );
        }

        const rawData = await response.json();
        const result = scrapeResponseSchema.parse({
          ...rawData,
          metadata: {
            ...rawData.metadata,
            timestamp: new Date().toISOString(),
            processingTime: Date.now() - startTime,
            retries,
          },
        });

        // Update rate limit tracking
        this.updateRateLimit(request.url);

        return result;
      } catch (error) {
        retries++;

        if (retries > this.config.retryAttempts) {
          return {
            success: false,
            data: {
              url: request.url,
              content: "",
              metadata: {},
            },
            error: error instanceof Error ? error.message : "Unknown error",
            metadata: {
              timestamp: new Date().toISOString(),
              processingTime: Date.now() - startTime,
              retries: retries - 1,
            },
          };
        }

        // Exponential backoff
        await this.delay(Math.pow(2, retries) * 1000);
      }
    }

    throw new Error("Maximum retries exceeded");
  }

  /**
   * Batch scrape multiple URLs
   */
  async batchScrape(requests: ScrapeRequest[]): Promise<ScrapeResponse[]> {
    const batchSize = 5; // Process in batches to avoid overwhelming the API
    const results: ScrapeResponse[] = [];

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchPromises = batch.map(request => this.scrapeWebsite(request));

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          // Create error response for failed requests
          results.push({
            success: false,
            data: {
              url: batch[index]!.url,
              content: "",
              metadata: {},
            },
            error:
              result.reason instanceof Error
                ? result.reason.message
                : "Batch processing failed",
            metadata: {
              timestamp: new Date().toISOString(),
              processingTime: 0,
              retries: 0,
            },
          });
        }
      });

      // Add delay between batches to respect rate limits
      if (i + batchSize < requests.length) {
        await this.delay(2000);
      }
    }

    return results;
  }

  /**
   * Monitor website changes over time
   */
  async monitorWebsite(
    url: string,
    options: {
      frequency: "hourly" | "daily" | "weekly";
      changeThreshold: number;
      notifications: boolean;
    }
  ): Promise<{
    success: boolean;
    monitorId: string;
    message: string;
  }> {
    try {
      const response = await this.makeRequest("/monitor", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          options: {
            frequency: options.frequency,
            changeThreshold: options.changeThreshold,
            notifications: options.notifications,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to set up monitoring: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        monitorId: data.monitorId,
        message: "Website monitoring setup successfully",
      };
    } catch (error) {
      return {
        success: false,
        monitorId: "",
        message:
          error instanceof Error ? error.message : "Failed to setup monitoring",
      };
    }
  }

  /**
   * Get competitor content trends and patterns
   */
  async getContentTrends(
    domain: string,
    _timeframe: "7d" | "30d" | "90d"
  ): Promise<{
    success: boolean;
    data?: {
      publishingFrequency: {
        daily: number;
        weekly: number;
        monthly: number;
      };
      contentTypes: {
        articles: number;
        videos: number;
        images: number;
        other: number;
      };
      topicTrends: Array<{
        topic: string;
        frequency: number;
        growth: number;
      }>;
      performanceMetrics: {
        avgLoadTime: number;
        avgWordCount: number;
        avgReadingTime: number;
      };
    };
    error?: string;
  }> {
    try {
      const response = await this.makeRequest(`/trends/${domain}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.config.apiToken}`,
        },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch content trends: ${response.statusText}`
        );
      }

      const data = await response.json();

      return {
        success: true,
        data: {
          publishingFrequency: data.publishing_frequency,
          contentTypes: data.content_types,
          topicTrends: data.topic_trends,
          performanceMetrics: data.performance_metrics,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch content trends",
      };
    }
  }

  private async makeRequest(
    endpoint: string,
    options: RequestInit
  ): Promise<Response> {
    const url = `${this.config.baseUrl}${endpoint}`;
    return fetch(url, options);
  }

  private async checkRateLimit(url: string): Promise<void> {
    const domain = new URL(url).hostname;
    const lastRequest = this.rateLimitQueue.get(domain);

    if (lastRequest) {
      const timeSinceLastRequest = Date.now() - lastRequest;
      const minInterval = 1000; // 1 second between requests per domain

      if (timeSinceLastRequest < minInterval) {
        await this.delay(minInterval - timeSinceLastRequest);
      }
    }
  }

  private updateRateLimit(url: string): void {
    const domain = new URL(url).hostname;
    this.rateLimitQueue.set(domain, Date.now());
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check for BrightData service
   */
  async healthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const response = await this.makeRequest("/health", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.config.apiToken}`,
        },
        signal: AbortSignal.timeout(5000),
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return {
          status: responseTime < 2000 ? "healthy" : "degraded",
          responseTime,
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
export const brightDataService = new BrightDataService({});

// Export types for use in other modules
export type { ScrapeRequest, ScrapeResponse };
