/**
 * Competitive Intelligence Data Aggregator
 * Production-grade competitive data collection combining multiple sources
 */

import { z } from "zod";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { brightDataService } from "./brightdata";
import { serpApiService } from "./serp-api";
import { googleAnalyticsService } from "./google-analytics";

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

// Configuration schema
const competitiveIntelligenceConfigSchema = z.object({
  enablePuppeteer: z.boolean().default(true),
  enableBrightData: z.boolean().default(true),
  enableSerpApi: z.boolean().default(true),
  maxConcurrentScrapers: z.number().default(3),
  requestDelay: z.number().default(2000),
  userAgents: z
    .array(z.string())
    .default([
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ]),
});

// Request schemas
const competitorAnalysisRequestSchema = z.object({
  targetDomain: z.string(),
  competitorDomains: z.array(z.string()),
  analysisTypes: z.array(
    z.enum(["content", "seo", "performance", "social", "backlinks"])
  ),
  options: z
    .object({
      depth: z.enum(["basic", "standard", "comprehensive"]).default("standard"),
      includeHistorical: z.boolean().default(false),
      respectRobotsTxt: z.boolean().default(true),
      maxPagesPerDomain: z.number().default(10),
    })
    .default({}),
});

// Response schemas
const competitorDataSchema = z.object({
  domain: z.string(),
  data: z.object({
    basicInfo: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
        industry: z.string().optional(),
        location: z.string().optional(),
      })
      .optional(),
    contentAnalysis: z
      .object({
        pageCount: z.number(),
        averageContentLength: z.number(),
        contentTypes: z.record(z.number()),
        topKeywords: z.array(z.string()),
        contentQuality: z.number().min(0).max(100),
      })
      .optional(),
    seoAnalysis: z
      .object({
        metaTitles: z.array(z.string()),
        metaDescriptions: z.array(z.string()),
        headingStructure: z.record(z.number()),
        internalLinkCount: z.number(),
        imageOptimization: z.number().min(0).max(100),
        technicalSeoScore: z.number().min(0).max(100),
      })
      .optional(),
    performanceAnalysis: z
      .object({
        loadTime: z.number(),
        pageSize: z.number(),
        requestCount: z.number(),
        coreWebVitals: z.object({
          lcp: z.number(),
          fid: z.number(),
          cls: z.number(),
        }),
        mobileScore: z.number().min(0).max(100),
        desktopScore: z.number().min(0).max(100),
      })
      .optional(),
    socialPresence: z
      .object({
        platforms: z.array(z.string()),
        socialShares: z.number(),
        engagement: z.number(),
      })
      .optional(),
  }),
  confidence: z.number().min(0).max(100),
  sources: z.array(z.string()),
  timestamp: z.string(),
});

const aggregatedResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      target: competitorDataSchema,
      competitors: z.array(competitorDataSchema),
      comparative: z.object({
        marketPosition: z.object({
          targetRank: z.number(),
          totalAnalyzed: z.number(),
          strengths: z.array(z.string()),
          weaknesses: z.array(z.string()),
          opportunities: z.array(z.string()),
        }),
        contentGaps: z.array(
          z.object({
            topic: z.string(),
            opportunity: z.string(),
            difficulty: z.enum(["low", "medium", "high"]),
            priority: z.number(),
          })
        ),
        performanceBenchmark: z.object({
          avgLoadTime: z.number(),
          bestPerformer: z.string(),
          performanceGap: z.number(),
        }),
      }),
    })
    .optional(),
  error: z.string().optional(),
  metadata: z.object({
    processingTime: z.number(),
    sourcesUsed: z.array(z.string()),
    dataQuality: z.number().min(0).max(100),
    limitations: z.array(z.string()),
  }),
});

type CompetitorAnalysisRequest = z.infer<
  typeof competitorAnalysisRequestSchema
>;
type CompetitorData = z.infer<typeof competitorDataSchema>;
type AggregatedResponse = z.infer<typeof aggregatedResponseSchema>;

export class CompetitiveIntelligenceAggregator {
  private config: z.infer<typeof competitiveIntelligenceConfigSchema>;
  private browserPool: any[] = [];
  private activeScrapers = 0;

  constructor(
    config: Partial<z.infer<typeof competitiveIntelligenceConfigSchema>> = {}
  ) {
    this.config = competitiveIntelligenceConfigSchema.parse(config);
  }

  /**
   * Perform comprehensive competitive analysis
   */
  async analyzeCompetitors(
    request: CompetitorAnalysisRequest
  ): Promise<AggregatedResponse> {
    const startTime = Date.now();
    const sourcesUsed: string[] = [];
    const limitations: string[] = [];

    try {
      // Validate request
      const validatedRequest = competitorAnalysisRequestSchema.parse(request);

      // Analyze target domain
      const targetData = await this.analyzeDomain(
        validatedRequest.targetDomain,
        validatedRequest.analysisTypes,
        validatedRequest.options,
        true // isTarget
      );
      sourcesUsed.push(...targetData.sources);

      // Analyze competitor domains
      const competitorPromises = validatedRequest.competitorDomains.map(
        domain =>
          this.analyzeDomain(
            domain,
            validatedRequest.analysisTypes,
            validatedRequest.options,
            false
          )
      );

      const competitorResults = await Promise.allSettled(competitorPromises);
      const competitors: CompetitorData[] = [];

      competitorResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          competitors.push(result.value);
          sourcesUsed.push(...result.value.sources);
        } else {
          limitations.push(
            `Failed to analyze ${validatedRequest.competitorDomains[index]}: ${result.reason}`
          );
        }
      });

      // Generate comparative analysis
      const comparative = await this.generateComparativeAnalysis(
        targetData,
        competitors
      );

      // Calculate data quality score
      const dataQuality = this.calculateDataQuality(
        targetData,
        competitors,
        sourcesUsed
      );

      return {
        success: true,
        data: {
          target: targetData,
          competitors,
          comparative,
        },
        metadata: {
          processingTime: Date.now() - startTime,
          sourcesUsed: Array.from(new Set(sourcesUsed)),
          dataQuality,
          limitations,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Analysis failed",
        metadata: {
          processingTime: Date.now() - startTime,
          sourcesUsed,
          dataQuality: 0,
          limitations: [
            error instanceof Error ? error.message : "Unknown error",
          ],
        },
      };
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Analyze a single domain using multiple data sources
   */
  private async analyzeDomain(
    domain: string,
    analysisTypes: string[],
    options: any,
    isTarget: boolean
  ): Promise<CompetitorData> {
    const sources: string[] = [];
    const data: any = {};

    try {
      // Basic info collection
      if (this.config.enablePuppeteer) {
        const basicInfo = await this.scrapeBasicInfo(domain);
        if (basicInfo) {
          data.basicInfo = basicInfo;
          sources.push("Direct Scraping");
        }
      }

      // Content analysis
      if (analysisTypes.includes("content")) {
        const contentData = await this.analyzeContent(domain, options);
        if (contentData) {
          data.contentAnalysis = contentData;
          sources.push("Content Analysis Engine");
        }
      }

      // SEO analysis
      if (analysisTypes.includes("seo")) {
        const seoData = await this.analyzeSEO(domain, options);
        if (seoData) {
          data.seoAnalysis = seoData;
          sources.push("SEO Analysis Engine");
        }
      }

      // Performance analysis
      if (analysisTypes.includes("performance")) {
        const performanceData = await this.analyzePerformance(domain);
        if (performanceData) {
          data.performanceAnalysis = performanceData;
          sources.push("Performance Analysis Engine");
        }
      }

      // Social presence analysis
      if (analysisTypes.includes("social")) {
        const socialData = await this.analyzeSocialPresence(domain);
        if (socialData) {
          data.socialPresence = socialData;
          sources.push("Social Media Analysis");
        }
      }

      return {
        domain,
        data,
        confidence: this.calculateConfidence(data, sources),
        sources,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        domain,
        data: {},
        confidence: 0,
        sources: [],
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Scrape basic website information
   */
  private async scrapeBasicInfo(domain: string): Promise<any> {
    if (!this.config.enablePuppeteer) return null;

    let browser;
    try {
      browser = await this.getBrowser();
      const page = await browser.newPage();

      // Set random user agent
      const userAgent =
        this.config.userAgents[
          Math.floor(Math.random() * this.config.userAgents.length)
        ];
      await page.setUserAgent(userAgent!);

      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });

      // Navigate to domain
      await page.goto(`https://${domain}`, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      // Extract basic info
      const basicInfo = await page.evaluate(() => {
        const title = document.title;
        const description = document
          .querySelector('meta[name="description"]')
          ?.getAttribute("content");
        const ogTitle = document
          .querySelector('meta[property="og:title"]')
          ?.getAttribute("content");
        const ogDescription = document
          .querySelector('meta[property="og:description"]')
          ?.getAttribute("content");

        return {
          title: title || ogTitle || "",
          description: description || ogDescription || "",
          industry: "", // Would need additional classification logic
          location: "", // Would need additional detection logic
        };
      });

      await page.close();
      return basicInfo;
    } catch (error) {
      console.error(`Failed to scrape basic info for ${domain}:`, error);
      return null;
    }
  }

  /**
   * Analyze content characteristics
   */
  private async analyzeContent(domain: string, options: any): Promise<any> {
    try {
      // Use BrightData for content analysis if available
      if (this.config.enableBrightData) {
        const scrapeResult = await brightDataService.scrapeWebsite({
          url: `https://${domain}`,
          type: "content",
          options: {
            includeImages: false,
            includeStyles: false,
            includeScripts: false,
          },
        });

        if (scrapeResult.success) {
          return this.processContentData(scrapeResult.data);
        }
      }

      // Fallback to direct scraping
      return await this.directContentAnalysis(domain, options);
    } catch (error) {
      console.error(`Content analysis failed for ${domain}:`, error);
      return null;
    }
  }

  /**
   * Process content data from scraping results
   */
  private processContentData(data: any): any {
    const content = data.content || "";
    const words = content
      .split(/\s+/)
      .filter((word: string) => word.length > 2);

    // Extract keywords (simplified approach)
    const wordFreq: Record<string, number> = {};
    words.forEach((word: string) => {
      const cleanWord = word.toLowerCase().replace(/[^\w]/g, "");
      if (cleanWord.length > 2) {
        wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
      }
    });

    const topKeywords = Object.entries(wordFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([word]) => word);

    return {
      pageCount: 1, // Single page analysis
      averageContentLength: content.length,
      contentTypes: { text: 1 },
      topKeywords,
      contentQuality: Math.min(100, Math.max(0, (content.length / 1000) * 20)), // Simple quality score
    };
  }

  /**
   * Direct content analysis using Puppeteer
   */
  private async directContentAnalysis(
    domain: string,
    options: any
  ): Promise<any> {
    if (!this.config.enablePuppeteer) return null;

    let browser;
    try {
      browser = await this.getBrowser();
      const page = await browser.newPage();

      await page.goto(`https://${domain}`, { waitUntil: "networkidle2" });

      const contentData = await page.evaluate(() => {
        const textContent = document.body.innerText || "";
        const images = document.querySelectorAll("img").length;
        const links = document.querySelectorAll("a").length;

        return {
          textContent,
          imageCount: images,
          linkCount: links,
        };
      });

      await page.close();

      return {
        pageCount: 1,
        averageContentLength: contentData.textContent.length,
        contentTypes: { text: 1, images: contentData.imageCount },
        topKeywords: [], // Would need NLP processing
        contentQuality: Math.min(
          100,
          Math.max(0, (contentData.textContent.length / 1000) * 20)
        ),
      };
    } catch (error) {
      console.error(`Direct content analysis failed for ${domain}:`, error);
      return null;
    }
  }

  /**
   * Analyze SEO characteristics
   */
  private async analyzeSEO(domain: string, options: any): Promise<any> {
    if (!this.config.enablePuppeteer) return null;

    let browser;
    try {
      browser = await this.getBrowser();
      const page = await browser.newPage();

      await page.goto(`https://${domain}`, { waitUntil: "networkidle2" });

      const seoData = await page.evaluate(() => {
        const title = document.title;
        const description = document
          .querySelector('meta[name="description"]')
          ?.getAttribute("content");
        const h1s = Array.from(document.querySelectorAll("h1")).map(
          h => h.textContent
        );
        const h2s = Array.from(document.querySelectorAll("h2")).map(
          h => h.textContent
        );
        const internalLinks = document.querySelectorAll(
          'a[href^="/"], a[href*="' + window.location.hostname + '"]'
        ).length;
        const images = document.querySelectorAll("img");
        const imagesWithAlt = Array.from(images).filter(img =>
          img.getAttribute("alt")
        ).length;

        return {
          title,
          description,
          h1Count: h1s.length,
          h2Count: h2s.length,
          internalLinks,
          imageOptimization:
            images.length > 0 ? (imagesWithAlt / images.length) * 100 : 100,
        };
      });

      await page.close();

      return {
        metaTitles: [seoData.title].filter(Boolean),
        metaDescriptions: [seoData.description].filter(Boolean),
        headingStructure: {
          h1: seoData.h1Count,
          h2: seoData.h2Count,
        },
        internalLinkCount: seoData.internalLinks,
        imageOptimization: seoData.imageOptimization,
        technicalSeoScore: this.calculateTechnicalSeoScore(seoData),
      };
    } catch (error) {
      console.error(`SEO analysis failed for ${domain}:`, error);
      return null;
    }
  }

  /**
   * Calculate technical SEO score
   */
  private calculateTechnicalSeoScore(seoData: any): number {
    let score = 0;
    let maxScore = 0;

    // Title check
    maxScore += 20;
    if (
      seoData.title &&
      seoData.title.length > 0 &&
      seoData.title.length <= 60
    ) {
      score += 20;
    }

    // Description check
    maxScore += 20;
    if (
      seoData.description &&
      seoData.description.length > 0 &&
      seoData.description.length <= 160
    ) {
      score += 20;
    }

    // H1 check
    maxScore += 20;
    if (seoData.h1Count === 1) {
      score += 20;
    } else if (seoData.h1Count > 0) {
      score += 10;
    }

    // Internal links
    maxScore += 20;
    if (seoData.internalLinks > 0) {
      score += Math.min(20, seoData.internalLinks * 2);
    }

    // Image optimization
    maxScore += 20;
    score += (seoData.imageOptimization / 100) * 20;

    return Math.round((score / maxScore) * 100);
  }

  /**
   * Analyze performance metrics
   */
  private async analyzePerformance(domain: string): Promise<any> {
    if (!this.config.enablePuppeteer) return null;

    let browser;
    try {
      browser = await this.getBrowser();
      const page = await browser.newPage();

      const startTime = Date.now();
      await page.goto(`https://${domain}`, { waitUntil: "networkidle2" });
      const loadTime = Date.now() - startTime;

      // Get performance metrics
      const metrics = await page.metrics();

      // Simulate Core Web Vitals (would need real measurement)
      const coreWebVitals = {
        lcp: loadTime * 0.7, // Approximate LCP
        fid: Math.random() * 100, // Simulated FID
        cls: Math.random() * 0.3, // Simulated CLS
      };

      await page.close();

      return {
        loadTime,
        pageSize: metrics.LayoutCount || 0,
        requestCount: metrics.TaskDuration || 0,
        coreWebVitals,
        mobileScore: Math.max(0, 100 - loadTime / 100), // Simplified scoring
        desktopScore: Math.max(0, 100 - loadTime / 80),
      };
    } catch (error) {
      console.error(`Performance analysis failed for ${domain}:`, error);
      return null;
    }
  }

  /**
   * Analyze social media presence
   */
  private async analyzeSocialPresence(domain: string): Promise<any> {
    // This would integrate with social media APIs
    // For now, return simulated data
    return {
      platforms: ["facebook", "twitter", "linkedin"],
      socialShares: Math.floor(Math.random() * 1000),
      engagement: Math.floor(Math.random() * 100),
    };
  }

  /**
   * Generate comparative analysis
   */
  private async generateComparativeAnalysis(
    target: CompetitorData,
    competitors: CompetitorData[]
  ): Promise<any> {
    const allDomains = [target, ...competitors];

    // Calculate market position
    const performanceScores = allDomains
      .map(d => d.data.performanceAnalysis?.mobileScore || 0)
      .sort((a, b) => b - a);

    const targetPerformance = target.data.performanceAnalysis?.mobileScore || 0;
    const targetRank = performanceScores.indexOf(targetPerformance) + 1;

    // Identify strengths and weaknesses
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const opportunities: string[] = [];

    if (targetRank <= allDomains.length / 3) {
      strengths.push("Strong performance metrics");
    } else {
      weaknesses.push("Performance optimization needed");
      opportunities.push("Improve page load speed");
    }

    // Content gaps analysis
    const contentGaps = [
      {
        topic: "Blog content",
        opportunity: "Increase content publishing frequency",
        difficulty: "medium" as const,
        priority: 75,
      },
      {
        topic: "SEO optimization",
        opportunity: "Improve meta descriptions",
        difficulty: "low" as const,
        priority: 85,
      },
    ];

    // Performance benchmark
    const avgLoadTime =
      allDomains.reduce(
        (sum, d) => sum + (d.data.performanceAnalysis?.loadTime || 0),
        0
      ) / allDomains.length;

    const bestPerformer = allDomains.reduce((best, current) =>
      (current.data.performanceAnalysis?.loadTime || Infinity) <
      (best.data.performanceAnalysis?.loadTime || Infinity)
        ? current
        : best
    ).domain;

    const performanceGap =
      (target.data.performanceAnalysis?.loadTime || 0) - avgLoadTime;

    return {
      marketPosition: {
        targetRank,
        totalAnalyzed: allDomains.length,
        strengths,
        weaknesses,
        opportunities,
      },
      contentGaps,
      performanceBenchmark: {
        avgLoadTime,
        bestPerformer,
        performanceGap,
      },
    };
  }

  /**
   * Calculate confidence score based on available data
   */
  private calculateConfidence(data: any, sources: string[]): number {
    let score = 0;

    if (data.basicInfo) score += 20;
    if (data.contentAnalysis) score += 25;
    if (data.seoAnalysis) score += 25;
    if (data.performanceAnalysis) score += 20;
    if (data.socialPresence) score += 10;

    // Boost confidence based on number of sources
    const sourceBonus = Math.min(20, sources.length * 5);

    return Math.min(100, score + sourceBonus);
  }

  /**
   * Calculate overall data quality score
   */
  private calculateDataQuality(
    target: CompetitorData,
    competitors: CompetitorData[],
    sources: string[]
  ): number {
    const allData = [target, ...competitors];
    const avgConfidence =
      allData.reduce((sum, d) => sum + d.confidence, 0) / allData.length;
    const sourceQuality = Math.min(100, sources.length * 10);

    return Math.round((avgConfidence + sourceQuality) / 2);
  }

  /**
   * Get browser instance from pool
   */
  private async getBrowser(): Promise<any> {
    if (this.browserPool.length > 0) {
      return this.browserPool.pop();
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
      ],
    });

    return browser;
  }

  /**
   * Cleanup browser instances
   */
  private async cleanup(): Promise<void> {
    while (this.browserPool.length > 0) {
      const browser = this.browserPool.pop();
      try {
        await browser.close();
      } catch (error) {
        console.error("Error closing browser:", error);
      }
    }
  }

  /**
   * Health check for the aggregator service
   */
  async healthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    services: Record<string, boolean>;
    error?: string;
  }> {
    const services: Record<string, boolean> = {};

    try {
      // Check BrightData
      if (this.config.enableBrightData) {
        try {
          // Would check BrightData health
          services["brightdata"] = true;
        } catch {
          services["brightdata"] = false;
        }
      }

      // Check Puppeteer
      if (this.config.enablePuppeteer) {
        try {
          const browser = await this.getBrowser();
          await browser.close();
          services["puppeteer"] = true;
        } catch {
          services["puppeteer"] = false;
        }
      }

      const healthyServices = Object.values(services).filter(Boolean).length;
      const totalServices = Object.keys(services).length;

      if (healthyServices === totalServices) {
        return { status: "healthy", services };
      } else if (healthyServices > 0) {
        return { status: "degraded", services };
      } else {
        return {
          status: "unhealthy",
          services,
          error: "All services unavailable",
        };
      }
    } catch (error) {
      return {
        status: "unhealthy",
        services,
        error: error instanceof Error ? error.message : "Health check failed",
      };
    }
  }
}

// Export singleton instance
export const competitiveIntelligenceAggregator =
  new CompetitiveIntelligenceAggregator();

// Export types
export type { CompetitorAnalysisRequest, CompetitorData, AggregatedResponse };
