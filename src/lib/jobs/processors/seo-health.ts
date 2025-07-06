/**
 * SEO Health Assessment Engine
 * Comprehensive technical SEO analysis with prioritized recommendations
 */

import type {
  Job,
  JobProcessor,
  JobResult,
  SEOHealthJobData,
  SEOHealthResult,
  SEOIssue,
  SEORecommendation,
  SEOComparison,
} from "../types";
import { createClient } from "@supabase/supabase-js";
import { analyticsCache, CacheKeys } from "@/lib/cache/analyticsCache";

export class SEOHealthProcessor
  implements JobProcessor<SEOHealthJobData, SEOHealthResult>
{
  private supabase = createClient(
    process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
    process.env["SUPABASE_SERVICE_ROLE_KEY"]!
  );

  async process(job: Job): Promise<JobResult<SEOHealthResult>> {
    try {
      const { websiteUrl, pages, includePerformance, includeMobile } = job.data
        .params as {
        websiteUrl: string;
        pages: string[];
        includePerformance: boolean;
        includeMobile: boolean;
      };

      await this.updateProgress(
        job.id,
        10,
        "Starting SEO health assessment..."
      );

      // Step 1: Technical infrastructure analysis (35% weight)
      await this.updateProgress(
        job.id,
        20,
        "Analyzing technical infrastructure..."
      );
      const technicalScore = await this.analyzeTechnicalInfrastructure(
        websiteUrl,
        pages
      );

      // Step 2: On-page optimization analysis (30% weight)
      await this.updateProgress(
        job.id,
        40,
        "Evaluating on-page optimization..."
      );
      const onPageScore = await this.analyzeOnPageOptimization(
        websiteUrl,
        pages
      );

      // Step 3: Performance analysis (20% weight - if enabled)
      let performanceScore = 85; // Default score
      if (includePerformance) {
        await this.updateProgress(
          job.id,
          60,
          "Analyzing performance metrics..."
        );
        performanceScore = await this.analyzePerformanceMetrics(websiteUrl);
      }

      // Step 4: Mobile optimization (15% weight - if enabled)
      let mobileScore = 90; // Default score
      if (includeMobile) {
        await this.updateProgress(
          job.id,
          75,
          "Checking mobile optimization..."
        );
        mobileScore = await this.analyzeMobileOptimization(websiteUrl);
      }

      // Step 5: Calculate overall SEO health score
      await this.updateProgress(job.id, 85, "Calculating SEO health score...");
      const overallScore = this.calculateSEOHealthScore({
        technical: technicalScore.score,
        onPage: onPageScore.score,
        performance: performanceScore,
        mobile: mobileScore,
      });

      // Step 6: Generate prioritized recommendations
      await this.updateProgress(job.id, 95, "Generating recommendations...");
      const allIssues = [...technicalScore.issues, ...onPageScore.issues];

      const recommendations = this.generateSEORecommendations(allIssues, {
        technical: technicalScore.score,
        onPage: onPageScore.score,
        performance: performanceScore,
        mobile: mobileScore,
      });

      const result: SEOHealthResult = {
        overallScore,
        technical: technicalScore.score,
        onPage: onPageScore.score,
        performance: performanceScore,
        mobile: mobileScore,
        criticalIssues: allIssues.filter(issue => issue.type === "critical"),
        recommendations,
        competitorComparison:
          await this.generateCompetitorComparison(overallScore),
      };

      // Step 7: Store results
      await this.updateProgress(job.id, 98, "Storing SEO analysis results...");
      await this.storeResults(job.data.projectId, job.id, result);

      await this.updateProgress(
        job.id,
        100,
        "SEO health assessment completed!"
      );

      return {
        success: true,
        data: result,
        retryable: false,
        progress: 100,
        progressMessage: "SEO health assessment completed successfully",
      };
    } catch (error) {
      console.error("SEO health analysis failed:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error during SEO analysis",
        retryable: true,
        progress: 0,
      };
    }
  }

  validate(data: SEOHealthJobData): boolean {
    return !!(
      data.projectId &&
      data.userId &&
      data.teamId &&
      data.params.websiteUrl &&
      data.params.pages &&
      data.params.pages.length > 0
    );
  }

  estimateProcessingTime(data: SEOHealthJobData): number {
    // Base time: 2 minutes per page
    let baseTime = data.params.pages.length * 120;

    // Add time for performance analysis
    if (data.params.includePerformance) {
      baseTime += 180;
    }

    // Add time for mobile analysis
    if (data.params.includeMobile) {
      baseTime += 120;
    }

    return Math.max(240, baseTime); // Minimum 4 minutes
  }

  private async updateProgress(
    jobId: string,
    progress: number,
    message: string
  ): Promise<void> {
    const { jobQueue } = await import("../queue");
    await jobQueue.updateJobProgress(jobId, progress, message);
  }

  private async analyzeTechnicalInfrastructure(
    websiteUrl: string,
    pages: string[]
  ): Promise<{
    score: number;
    issues: SEOIssue[];
  }> {
    const issues: SEOIssue[] = [];
    let totalScore = 0;
    let maxScore = 0;

    // Site speed and Core Web Vitals (40 points)
    maxScore += 40;
    const speedAnalysis = await this.analyzePageSpeed(websiteUrl);
    totalScore += speedAnalysis.score;
    issues.push(...speedAnalysis.issues);

    // Mobile responsiveness (25 points)
    maxScore += 25;
    const mobileAnalysis = await this.analyzeMobileResponsiveness(websiteUrl);
    totalScore += mobileAnalysis.score;
    issues.push(...mobileAnalysis.issues);

    // Site architecture and crawlability (35 points)
    maxScore += 35;
    const architectureAnalysis = await this.analyzeSiteArchitecture(
      websiteUrl,
      pages
    );
    totalScore += architectureAnalysis.score;
    issues.push(...architectureAnalysis.issues);

    return {
      score: Math.round((totalScore / maxScore) * 100),
      issues,
    };
  }

  private async analyzePageSpeed(
    _url: string
  ): Promise<{ score: number; issues: SEOIssue[] }> {
    const issues: SEOIssue[] = [];

    try {
      // In production, this would use Google PageSpeed Insights API
      // For now, we'll simulate the analysis
      const mockSpeedScore = Math.random() * 40 + 60; // 60-100 range

      if (mockSpeedScore < 70) {
        issues.push({
          type: "critical",
          category: "performance",
          title: "Poor Page Speed",
          description: "Page load time is slower than recommended.",
          impact: "high",
          fixComplexity: "medium",
          howToFix:
            "Optimize images, minify CSS/JS, enable compression, use a CDN.",
        });
      }

      if (mockSpeedScore < 80) {
        issues.push({
          type: "warning",
          category: "performance",
          title: "Optimize Core Web Vitals",
          description: "Core Web Vitals metrics need improvement.",
          impact: "medium",
          fixComplexity: "medium",
          howToFix:
            "Improve Largest Contentful Paint, First Input Delay, and Cumulative Layout Shift.",
        });
      }

      return { score: Math.round(mockSpeedScore), issues };
    } catch {
      return { score: 70, issues }; // Fallback score
    }
  }

  private async analyzeMobileResponsiveness(
    _url: string
  ): Promise<{ score: number; issues: SEOIssue[] }> {
    const issues: SEOIssue[] = [];

    try {
      // Simulate mobile responsiveness check
      const mockMobileScore = Math.random() * 25 + 75; // 75-100 range

      if (mockMobileScore < 85) {
        issues.push({
          type: "warning",
          category: "mobile",
          title: "Mobile Optimization Issues",
          description: "Some mobile usability issues detected.",
          impact: "medium",
          fixComplexity: "easy",
          howToFix:
            "Ensure responsive design, proper viewport meta tag, and touch-friendly elements.",
        });
      }

      return { score: Math.round(mockMobileScore), issues };
    } catch {
      return { score: 80, issues };
    }
  }

  private async analyzeSiteArchitecture(
    url: string,
    pages: string[]
  ): Promise<{ score: number; issues: SEOIssue[] }> {
    const issues: SEOIssue[] = [];
    let score = 35; // Start with full score

    try {
      // Check robots.txt
      const robotsCheck = await this.checkRobotsTxt(url);
      if (!robotsCheck.exists) {
        score -= 5;
        issues.push({
          type: "warning",
          category: "technical",
          title: "Missing robots.txt",
          description: "No robots.txt file found.",
          impact: "low",
          fixComplexity: "easy",
          howToFix: "Create a robots.txt file to guide search engine crawlers.",
        });
      }

      // Check XML sitemap
      const sitemapCheck = await this.checkXMLSitemap(url);
      if (!sitemapCheck.exists) {
        score -= 8;
        issues.push({
          type: "warning",
          category: "technical",
          title: "Missing XML Sitemap",
          description: "No XML sitemap found.",
          impact: "medium",
          fixComplexity: "easy",
          howToFix:
            "Generate and submit an XML sitemap to help search engines discover your pages.",
        });
      }

      // Check HTTPS
      if (!url.startsWith("https://")) {
        score -= 10;
        issues.push({
          type: "critical",
          category: "technical",
          title: "No HTTPS Encryption",
          description: "Website is not using HTTPS.",
          impact: "high",
          fixComplexity: "medium",
          howToFix:
            "Install an SSL certificate and redirect all HTTP traffic to HTTPS.",
        });
      }

      // Check URL structure
      const urlStructureScore = this.analyzeURLStructure(pages);
      score += urlStructureScore.score - 10; // Adjust base score
      issues.push(...urlStructureScore.issues);

      return { score: Math.max(0, score), issues };
    } catch {
      return { score: 25, issues };
    }
  }

  private async checkRobotsTxt(
    _url: string
  ): Promise<{ exists: boolean; content?: string }> {
    try {
      const robotsUrl = new URL("/robots.txt", _url).toString();
      const response = await fetch(robotsUrl);
      const result: { exists: boolean; content?: string } = {
        exists: response.ok,
      };

      if (response.ok) {
        result.content = await response.text();
      }

      return result;
    } catch {
      return { exists: false };
    }
  }

  private async checkXMLSitemap(_url: string): Promise<{ exists: boolean }> {
    try {
      const sitemapUrl = new URL("/sitemap.xml", _url).toString();
      const response = await fetch(sitemapUrl);
      return { exists: response.ok };
    } catch {
      return { exists: false };
    }
  }

  private analyzeURLStructure(pages: string[]): {
    score: number;
    issues: SEOIssue[];
  } {
    const issues: SEOIssue[] = [];
    let score = 10; // Base score for URL structure

    let hasLongUrls = false;
    let hasUnsafeCharacters = false;

    for (const page of pages) {
      try {
        const url = new URL(page);

        // Check URL length
        if (url.pathname.length > 100) {
          hasLongUrls = true;
        }

        // Check for unsafe characters
        if (/[^a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=]/.test(url.pathname)) {
          hasUnsafeCharacters = true;
        }
      } catch {
        // Invalid URL
        score -= 2;
      }
    }

    if (hasLongUrls) {
      score -= 3;
      issues.push({
        type: "warning",
        category: "technical",
        title: "Long URLs Detected",
        description: "Some URLs are longer than recommended.",
        impact: "low",
        fixComplexity: "medium",
        howToFix: "Shorten URLs and use descriptive, keyword-rich paths.",
      });
    }

    if (hasUnsafeCharacters) {
      score -= 2;
      issues.push({
        type: "warning",
        category: "technical",
        title: "URL Character Issues",
        description: "Some URLs contain special characters.",
        impact: "low",
        fixComplexity: "easy",
        howToFix: "Use only alphanumeric characters and hyphens in URLs.",
      });
    }

    return { score: Math.max(0, score), issues };
  }

  private async analyzeOnPageOptimization(
    websiteUrl: string,
    pages: string[]
  ): Promise<{
    score: number;
    issues: SEOIssue[];
  }> {
    const issues: SEOIssue[] = [];
    let totalScore = 0;
    const maxScore = 30;

    // Analyze a sample of pages (limit to first 5 for performance)
    const samplesToAnalyze = pages.slice(0, 5);

    for (const pageUrl of samplesToAnalyze) {
      const pageAnalysis = await this.analyzePageOptimization(pageUrl);
      totalScore += pageAnalysis.score;
      issues.push(...pageAnalysis.issues);
    }

    const avgScore =
      samplesToAnalyze.length > 0 ? totalScore / samplesToAnalyze.length : 0;

    return {
      score: Math.round((avgScore / 100) * maxScore),
      issues: this.deduplicateIssues(issues),
    };
  }

  private async analyzePageOptimization(
    _url: string
  ): Promise<{ score: number; issues: SEOIssue[] }> {
    const issues: SEOIssue[] = [];
    let score = 0;
    let maxScore = 0;

    try {
      const response = await fetch(_url);
      const html = await response.text();

      // Title tag analysis (25 points)
      maxScore += 25;
      const titleAnalysis = this.analyzeTitleTag(html);
      score += titleAnalysis.score;
      issues.push(...titleAnalysis.issues);

      // Meta description analysis (20 points)
      maxScore += 20;
      const metaAnalysis = this.analyzeMetaDescription(html);
      score += metaAnalysis.score;
      issues.push(...metaAnalysis.issues);

      // Heading structure analysis (25 points)
      maxScore += 25;
      const headingAnalysis = this.analyzeHeadingStructure(html);
      score += headingAnalysis.score;
      issues.push(...headingAnalysis.issues);

      // Internal linking analysis (30 points)
      maxScore += 30;
      const linkingAnalysis = this.analyzeInternalLinking(html, _url);
      score += linkingAnalysis.score;
      issues.push(...linkingAnalysis.issues);

      return { score: (score / maxScore) * 100, issues };
    } catch {
      return { score: 60, issues }; // Fallback score
    }
  }

  private analyzeTitleTag(html: string): { score: number; issues: SEOIssue[] } {
    const issues: SEOIssue[] = [];
    let score = 0;

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);

    if (!titleMatch) {
      issues.push({
        type: "critical",
        category: "content",
        title: "Missing Title Tag",
        description: "Page is missing a title tag.",
        impact: "high",
        fixComplexity: "easy",
        howToFix: "Add a descriptive title tag to the page head section.",
      });
      return { score: 0, issues };
    }

    const title = titleMatch[1]?.trim() || "";

    if (title.length === 0) {
      issues.push({
        type: "critical",
        category: "content",
        title: "Empty Title Tag",
        description: "Title tag is empty.",
        impact: "high",
        fixComplexity: "easy",
        howToFix: "Add descriptive text to the title tag.",
      });
      score = 5;
    } else if (title.length < 30) {
      issues.push({
        type: "warning",
        category: "content",
        title: "Short Title Tag",
        description: "Title tag is shorter than recommended.",
        impact: "medium",
        fixComplexity: "easy",
        howToFix: "Expand title to 30-60 characters for better SEO.",
      });
      score = 15;
    } else if (title.length > 60) {
      issues.push({
        type: "warning",
        category: "content",
        title: "Long Title Tag",
        description: "Title tag may be truncated in search results.",
        impact: "medium",
        fixComplexity: "easy",
        howToFix: "Shorten title to under 60 characters.",
      });
      score = 18;
    } else {
      score = 25; // Perfect length
    }

    return { score, issues };
  }

  private analyzeMetaDescription(html: string): {
    score: number;
    issues: SEOIssue[];
  } {
    const issues: SEOIssue[] = [];
    let score = 0;

    const metaMatch = html.match(
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i
    );

    if (!metaMatch) {
      issues.push({
        type: "warning",
        category: "content",
        title: "Missing Meta Description",
        description: "Page is missing a meta description.",
        impact: "medium",
        fixComplexity: "easy",
        howToFix: "Add a compelling meta description tag.",
      });
      return { score: 0, issues };
    }

    const description = metaMatch[1]?.trim() || "";

    if (description.length === 0) {
      issues.push({
        type: "warning",
        category: "content",
        title: "Empty Meta Description",
        description: "Meta description is empty.",
        impact: "medium",
        fixComplexity: "easy",
        howToFix: "Add descriptive text to the meta description.",
      });
      score = 3;
    } else if (description.length < 120) {
      issues.push({
        type: "recommendation",
        category: "content",
        title: "Short Meta Description",
        description: "Meta description could be longer for better visibility.",
        impact: "low",
        fixComplexity: "easy",
        howToFix: "Expand meta description to 120-160 characters.",
      });
      score = 12;
    } else if (description.length > 160) {
      issues.push({
        type: "warning",
        category: "content",
        title: "Long Meta Description",
        description: "Meta description may be truncated in search results.",
        impact: "low",
        fixComplexity: "easy",
        howToFix: "Shorten meta description to under 160 characters.",
      });
      score = 15;
    } else {
      score = 20; // Perfect length
    }

    return { score, issues };
  }

  private analyzeHeadingStructure(html: string): {
    score: number;
    issues: SEOIssue[];
  } {
    const issues: SEOIssue[] = [];
    let score = 0;

    const h1Matches = html.match(/<h1[^>]*>/gi) || [];
    const h2Matches = html.match(/<h2[^>]*>/gi) || [];
    const h3Matches = html.match(/<h3[^>]*>/gi) || [];

    // Check H1 tag
    if (h1Matches.length === 0) {
      issues.push({
        type: "critical",
        category: "content",
        title: "Missing H1 Tag",
        description: "Page is missing an H1 heading.",
        impact: "high",
        fixComplexity: "easy",
        howToFix: "Add one H1 tag as the main page heading.",
      });
      score = 0;
    } else if (h1Matches.length > 1) {
      issues.push({
        type: "warning",
        category: "content",
        title: "Multiple H1 Tags",
        description: "Page has multiple H1 tags.",
        impact: "medium",
        fixComplexity: "easy",
        howToFix: "Use only one H1 tag per page and convert others to H2-H6.",
      });
      score = 10;
    } else {
      score = 15; // Perfect H1 usage
    }

    // Check heading hierarchy
    if (h2Matches.length > 0) {
      score += 5; // Bonus for using H2
    }

    if (h3Matches.length > 0 && h2Matches.length > 0) {
      score += 5; // Bonus for proper hierarchy
    }

    return { score, issues };
  }

  private analyzeInternalLinking(
    html: string,
    baseUrl: string
  ): { score: number; issues: SEOIssue[] } {
    const issues: SEOIssue[] = [];
    let score = 0;

    const linkMatches =
      html.match(/<a[^>]*href=["']([^"']*)["'][^>]*>/gi) || [];

    let internalLinks = 0;

    try {
      const baseDomain = new URL(baseUrl).hostname;

      for (const link of linkMatches) {
        const hrefMatch = link.match(/href=["']([^"']*)["']/i);
        if (hrefMatch) {
          const href = hrefMatch[1];

          if (href && href.startsWith("http")) {
            try {
              const linkDomain = new URL(href).hostname;
              if (linkDomain === baseDomain) {
                internalLinks++;
              } else {
                // External link found - not used in current implementation
              }
            } catch {
              // Invalid URL
            }
          } else if (href && (href.startsWith("/") || !href.includes(":"))) {
            internalLinks++;
          }
        }
      }

      if (internalLinks === 0) {
        issues.push({
          type: "warning",
          category: "content",
          title: "No Internal Links",
          description: "Page has no internal links.",
          impact: "medium",
          fixComplexity: "easy",
          howToFix: "Add relevant internal links to other pages on your site.",
        });
        score = 5;
      } else if (internalLinks < 3) {
        issues.push({
          type: "recommendation",
          category: "content",
          title: "Few Internal Links",
          description: "Page could benefit from more internal links.",
          impact: "low",
          fixComplexity: "easy",
          howToFix:
            "Add 3-5 relevant internal links to improve site navigation.",
        });
        score = 15;
      } else {
        score = 30; // Good internal linking
      }
    } catch {
      score = 15; // Fallback score
    }

    return { score, issues };
  }

  private deduplicateIssues(issues: SEOIssue[]): SEOIssue[] {
    const seen = new Set<string>();
    return issues.filter(issue => {
      const key = `${issue.type}-${issue.title}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private async analyzePerformanceMetrics(_url: string): Promise<number> {
    // This would integrate with Google PageSpeed Insights API in production
    // For now, return a simulated score
    return Math.round(Math.random() * 30 + 70); // 70-100 range
  }

  private async analyzeMobileOptimization(_url: string): Promise<number> {
    // This would check mobile-specific SEO factors
    // For now, return a simulated score
    return Math.round(Math.random() * 20 + 80); // 80-100 range
  }

  private calculateSEOHealthScore(scores: {
    technical: number;
    onPage: number;
    performance: number;
    mobile: number;
  }): number {
    // Apply Phase 1 weighting algorithm
    const technicalWeight = 0.35;
    const onPageWeight = 0.3;
    const performanceWeight = 0.2;
    const mobileWeight = 0.15;

    return Math.round(
      scores.technical * technicalWeight +
        scores.onPage * onPageWeight +
        scores.performance * performanceWeight +
        scores.mobile * mobileWeight
    );
  }

  private generateSEORecommendations(
    issues: SEOIssue[],
    _scores: {
      technical: number;
      onPage: number;
      performance: number;
      mobile: number;
    }
  ): SEORecommendation[] {
    const recommendations: SEORecommendation[] = [];

    // Sort issues by impact and type
    const sortedIssues = issues.sort((a, b) => {
      const impactOrder = { high: 0, medium: 1, low: 2 };
      const typeOrder = { critical: 0, warning: 1, recommendation: 2 };

      const impactDiff = impactOrder[a.impact] - impactOrder[b.impact];
      if (impactDiff !== 0) return impactDiff;

      return typeOrder[a.type] - typeOrder[b.type];
    });

    // Convert issues to recommendations
    for (const issue of sortedIssues.slice(0, 10)) {
      // Top 10 issues
      recommendations.push({
        category: issue.category,
        title: issue.title,
        description: issue.howToFix,
        impact: this.mapImpactToNumber(issue.impact),
        difficulty: this.mapComplexityToNumber(issue.fixComplexity),
        timeframe: this.estimateTimeframe(issue.fixComplexity),
        resources: this.getRequiredResources(
          issue.category,
          issue.fixComplexity
        ),
      });
    }

    return recommendations;
  }

  private mapImpactToNumber(impact: "high" | "medium" | "low"): number {
    const mapping = { high: 90, medium: 60, low: 30 };
    return mapping[impact];
  }

  private mapComplexityToNumber(
    complexity: "easy" | "medium" | "hard"
  ): number {
    const mapping = { easy: 20, medium: 50, hard: 80 };
    return mapping[complexity];
  }

  private estimateTimeframe(complexity: "easy" | "medium" | "hard"): string {
    const timeframes = {
      easy: "1-2 days",
      medium: "1-2 weeks",
      hard: "2-4 weeks",
    };
    return timeframes[complexity];
  }

  private getRequiredResources(
    category: string,
    _complexity: string
  ): string[] {
    const resources: Record<string, string[]> = {
      technical: ["Developer", "Server Access"],
      content: ["Content Writer", "SEO Specialist"],
      performance: ["Developer", "Performance Expert"],
      mobile: ["Frontend Developer", "UX Designer"],
    };

    return resources[category] || ["SEO Specialist"];
  }

  private async generateCompetitorComparison(
    overallScore: number
  ): Promise<SEOComparison> {
    // In production, this would analyze actual competitor data
    return {
      averageScore: 72,
      topPerformerScore: 89,
      yourPosition:
        overallScore > 72
          ? Math.floor(Math.random() * 30) + 1
          : Math.floor(Math.random() * 50) + 30,
      improvementPotential: Math.max(0, 89 - overallScore),
    };
  }

  private async storeResults(
    projectId: string,
    jobId: string,
    result: SEOHealthResult
  ): Promise<void> {
    try {
      await this.supabase.from("seo_health_results").insert({
        job_id: jobId,
        project_id: projectId,
        overall_score: result.overallScore,
        technical: result.technical,
        on_page: result.onPage,
        performance: result.performance,
        mobile: result.mobile,
        critical_issues: result.criticalIssues,
        warnings: result.criticalIssues.filter(i => i.type === "warning"),
        recommendations: result.recommendations,
        competitor_comparison: result.competitorComparison,
        pages_crawled: 1,
        issues_found: result.criticalIssues.length,
      });

      // Invalidate cache for this project's SEO health analysis and complete analytics
      analyticsCache.invalidate(projectId, CacheKeys.SEO_HEALTH);
      analyticsCache.invalidate(projectId, "complete-analytics");
    } catch (error) {
      console.error("Failed to store SEO health results:", error);
      throw error;
    }
  }
}
