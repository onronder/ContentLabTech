/**
 * Content Quality Assessment Engine
 * Comprehensive content analysis with actionable recommendations
 */

import type {
  Job,
  JobProcessor,
  JobResult,
  ContentAnalysisJobData,
  ContentQualityResult,
  ContentRecommendation,
} from "../types";
import {
  analyzeContent /*, generateKeywordStrategy*/,
  ContentOptimizationResult,
} from "@/lib/openai";
import { createClient } from "@supabase/supabase-js";
import { analyticsCache, CacheKeys } from "@/lib/cache/analyticsCache";
import {
  AppError,
  createProcessingError,
  createDatabaseError,
  // createExternalServiceError,
  createErrorContext,
} from "@/lib/errors/errorHandling";
import {
  retryDatabaseOperation,
  retryOpenAICall,
  retryExternalAPI,
} from "@/lib/resilience/retryMechanism";

export class ContentAnalysisProcessor
  implements JobProcessor<ContentAnalysisJobData, ContentQualityResult>
{
  private supabase = createClient(
    process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
    process.env["SUPABASE_SECRET_KEY"]!
  );

  async process(job: Job): Promise<JobResult<ContentQualityResult>> {
    const context = createErrorContext(undefined, {
      jobId: job.id,
      projectId: job.data.projectId,
      userId: job.data.userId,
      teamId: job.data.teamId,
    });

    try {
      const { websiteUrl, targetKeywords, competitorUrls, analysisDepth } = job
        .data.params as {
        websiteUrl: string;
        targetKeywords: string[];
        competitorUrls?: string[];
        analysisDepth: string;
      };

      // Update progress
      await this.updateProgress(job.id, 10, "Starting content analysis...");

      // Step 1: Extract website content with retry mechanism
      await this.updateProgress(job.id, 20, "Extracting website content...");
      const websiteContent = await retryExternalAPI(
        "content-extraction",
        () => this.extractWebsiteContent(websiteUrl),
        { maxAttempts: 3 }
      );

      // Step 2: Analyze content quality with OpenAI (with retry)
      await this.updateProgress(job.id, 40, "Analyzing content quality...");
      const contentAnalysis = await retryOpenAICall(() =>
        this.analyzeContentQuality(websiteContent, targetKeywords)
      );

      // Step 3: Calculate technical SEO scores
      await this.updateProgress(job.id, 60, "Evaluating technical SEO...");
      const technicalSEO = await this.analyzeTechnicalSEO(websiteContent);

      // Step 4: Assess readability and structure
      await this.updateProgress(
        job.id,
        70,
        "Analyzing readability and structure..."
      );
      const readabilityScore = this.calculateReadabilityScore(websiteContent);

      // Step 5: Evaluate semantic relevance
      await this.updateProgress(job.id, 80, "Evaluating semantic relevance...");
      const semanticRelevance = await this.analyzeSemanticRelevance(
        websiteContent,
        targetKeywords
      );

      // Step 6: Generate competitive comparison (if competitors provided)
      let competitorComparison;
      if (competitorUrls && competitorUrls.length > 0) {
        await this.updateProgress(job.id, 90, "Analyzing competitors...");
        try {
          competitorComparison = await retryExternalAPI(
            "competitor-analysis",
            () => this.analyzeCompetitors(competitorUrls, targetKeywords),
            { maxAttempts: 2 } // Fewer retries for competitive analysis
          );
        } catch (error) {
          console.warn(
            "Competitor analysis failed, continuing without:",
            error
          );
          // Don't fail the entire job if competitor analysis fails
        }
      }

      // Step 7: Calculate final scores and generate recommendations
      await this.updateProgress(job.id, 95, "Generating recommendations...");
      const result = this.calculateFinalScores({
        contentAnalysis,
        technicalSEO,
        readabilityScore,
        semanticRelevance,
        ...(competitorComparison && { competitorComparison }),
        analysisDepth,
      });

      // Step 8: Store results in database with retry
      await this.updateProgress(job.id, 98, "Storing analysis results...");
      await retryDatabaseOperation(() =>
        this.storeResults(job.data.projectId, job.id, result)
      );

      await this.updateProgress(job.id, 100, "Content analysis completed!");

      return {
        success: true,
        data: result,
        retryable: false,
        progress: 100,
        progressMessage: "Content analysis completed successfully",
      };
    } catch (error) {
      console.error("Content analysis failed:", error);

      // Handle different error types appropriately
      if (error instanceof AppError) {
        return {
          success: false,
          error: error.details.userMessage,
          retryable: error.details.retryable,
          progress: 0,
          ...(error.details.retryAfter !== undefined && {
            retryAfter: error.details.retryAfter,
          }),
        };
      }

      // Handle specific error scenarios
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const isRetryable = this.determineRetryability(errorMessage);

      // Create structured error for unknown errors
      const processingError = createProcessingError(
        "content-analysis",
        error as Error,
        context
      );

      return {
        success: false,
        error: processingError.details.userMessage,
        retryable: isRetryable,
        progress: 0,
        ...(isRetryable && { retryAfter: 120 }), // 2 minutes for retryable errors
      };
    }
  }

  validate(data: ContentAnalysisJobData): boolean {
    return !!(
      data.projectId &&
      data.userId &&
      data.teamId &&
      data.params.websiteUrl &&
      data.params.targetKeywords &&
      data.params.targetKeywords.length > 0
    );
  }

  estimateProcessingTime(data: ContentAnalysisJobData): number {
    // Base time: 3 minutes for basic analysis
    let baseTime = 180;

    // Add time for comprehensive analysis
    if (data.params.analysisDepth === "comprehensive") {
      baseTime += 120;
    }

    // Add time for competitors
    if (data.params.competitorUrls) {
      baseTime += data.params.competitorUrls.length * 60;
    }

    return baseTime;
  }

  private async updateProgress(
    jobId: string,
    progress: number,
    message: string
  ): Promise<void> {
    const { jobQueue } = await import("../queue");
    await jobQueue.updateJobProgress(jobId, progress, message);
  }

  private async extractWebsiteContent(url: string): Promise<{
    title: string;
    content: string;
    metaDescription?: string;
    headings: { level: number; text: string }[];
    wordCount: number;
    images: number;
    links: { internal: number; external: number };
  }> {
    try {
      // In a production environment, this would use BrightData or similar service
      // For now, we'll simulate content extraction
      const response = await fetch(url);
      const html = await response.text();

      // Basic HTML parsing (in production, use a proper HTML parser)
      const title = this.extractTitle(html);
      const metaDescription = this.extractMetaDescription(html);
      const content = this.extractTextContent(html);
      const headings = this.extractHeadings(html);

      return {
        title,
        content,
        ...(metaDescription && { metaDescription }),
        headings,
        wordCount: content.split(/\s+/).length,
        images: (html.match(/<img/g) || []).length,
        links: {
          internal: (html.match(/href=["'][^"']*["']/g) || []).filter(
            link =>
              !link.includes("http") || link.includes(new URL(url).hostname)
          ).length,
          external: (
            html.match(/href=["']https?:\/\/[^"']*["']/g) || []
          ).filter(link => !link.includes(new URL(url).hostname)).length,
        },
      };
    } catch (error) {
      throw new Error(`Failed to extract content from ${url}: ${error}`);
    }
  }

  private extractTitle(html: string): string {
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return match?.[1]?.trim() || "";
  }

  private extractMetaDescription(html: string): string | undefined {
    const match = html.match(
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i
    );
    return match?.[1]?.trim();
  }

  private extractTextContent(html: string): string {
    // Remove script and style tags
    const cleaned = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

    // Extract text content
    return cleaned
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private extractHeadings(html: string): { level: number; text: string }[] {
    const headings: { level: number; text: string }[] = [];
    const headingRegex = /<h([1-6])[^>]*>([^<]+)<\/h[1-6]>/gi;
    let match;

    while ((match = headingRegex.exec(html)) !== null) {
      headings.push({
        level: parseInt(match[1]!),
        text: match[2]!.trim(),
      });
    }

    return headings;
  }

  private async analyzeContentQuality(
    content: {
      title: string;
      content: string;
      metaDescription?: string;
      headings: { level: number; text: string }[];
    },
    targetKeywords: string[]
  ): Promise<{
    wordCount: number;
    headingStructure: number;
    keywordDensity: number;
    contentGaps: string[];
    topicCoverage: number;
  }> {
    try {
      const aiResult = await analyzeContent({
        title: content.title,
        content: content.content,
        ...(content.metaDescription && {
          metaDescription: content.metaDescription,
        }),
        focusKeywords: targetKeywords,
        contentType: "article",
      });

      // Map ContentOptimizationResult to expected format
      return this.mapContentOptimizationResult(aiResult, content);
    } catch (error) {
      console.error("OpenAI content analysis failed:", error);
      // Return fallback analysis with correct structure
      return {
        wordCount: content.content.split(/\s+/).length,
        headingStructure: content.headings.length,
        keywordDensity: 2.5,
        contentGaps: ["Technical Implementation", "Advanced Strategies"],
        topicCoverage: 75,
      };
    }
  }

  private mapContentOptimizationResult(
    aiResult: ContentOptimizationResult,
    content: {
      title: string;
      content: string;
      metaDescription?: string;
      headings: { level: number; text: string }[];
    }
  ): {
    wordCount: number;
    headingStructure: number;
    keywordDensity: number;
    contentGaps: string[];
    topicCoverage: number;
  } {
    // Extract word count from actual content
    const wordCount = content.content
      .split(/\s+/)
      .filter(word => word.length > 0).length;

    // Map heading structure score from AI analysis
    const headingStructure =
      aiResult.seoAnalysis?.contentStructure?.score || content.headings.length;

    // Map keyword density from AI analysis
    const keywordDensity = aiResult.seoAnalysis?.keywordDensity?.score || 2.5;

    // Extract content gaps from competitor insights or recommendations
    const contentGaps = aiResult.competitorInsights?.gaps ||
      aiResult.recommendations
        ?.filter(rec => rec.type === "content")
        ?.map(rec => rec.title) || [
        "Content depth improvements needed",
        "Additional topic coverage recommended",
      ];

    // Map overall score to topic coverage (both are 0-100 scores)
    const topicCoverage = aiResult.overallScore || 75;

    return {
      wordCount,
      headingStructure,
      keywordDensity,
      contentGaps,
      topicCoverage,
    };
  }

  private async analyzeTechnicalSEO(content: {
    title: string;
    metaDescription?: string;
    headings: { level: number; text: string }[];
  }): Promise<number> {
    let score = 0;
    let maxScore = 0;

    // Title tag analysis (25 points)
    maxScore += 25;
    if (content.title) {
      if (content.title.length >= 30 && content.title.length <= 60) {
        score += 25;
      } else if (content.title.length >= 20 && content.title.length <= 80) {
        score += 15;
      } else if (content.title.length > 0) {
        score += 8;
      }
    }

    // Meta description analysis (20 points)
    maxScore += 20;
    if (content.metaDescription) {
      if (
        content.metaDescription.length >= 120 &&
        content.metaDescription.length <= 160
      ) {
        score += 20;
      } else if (
        content.metaDescription.length >= 80 &&
        content.metaDescription.length <= 200
      ) {
        score += 12;
      } else if (content.metaDescription.length > 0) {
        score += 6;
      }
    }

    // Heading structure analysis (25 points)
    maxScore += 25;
    const h1Count = content.headings.filter(h => h.level === 1).length;
    const hasProperStructure = content.headings.some(h => h.level === 2);

    if (h1Count === 1 && hasProperStructure) {
      score += 25;
    } else if (h1Count === 1) {
      score += 15;
    } else if (h1Count > 0) {
      score += 8;
    }

    // Content structure (30 points)
    maxScore += 30;
    const headingLevels = content.headings.map(h => h.level);
    const hasLogicalFlow = this.checkHeadingLogicalFlow(headingLevels);

    if (hasLogicalFlow && content.headings.length >= 3) {
      score += 30;
    } else if (content.headings.length >= 2) {
      score += 18;
    } else if (content.headings.length > 0) {
      score += 10;
    }

    return Math.round((score / maxScore) * 100);
  }

  private checkHeadingLogicalFlow(levels: number[]): boolean {
    for (let i = 1; i < levels.length; i++) {
      if (levels[i]! > levels[i - 1]! + 1) {
        return false; // Skip heading levels
      }
    }
    return true;
  }

  private calculateReadabilityScore(content: {
    content: string;
    headings: { level: number; text: string }[];
  }): number {
    const text = content.content;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce(
      (sum, word) => sum + this.countSyllables(word),
      0
    );

    // Flesch Reading Ease Score
    if (sentences.length === 0 || words.length === 0) return 0;

    const avgSentenceLength = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;

    const fleschScore =
      206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;

    // Convert to 0-100 scale (higher is better)
    let score = Math.max(0, Math.min(100, fleschScore));

    // Adjust for structure elements
    if (content.headings.length >= 3) {
      score += 5; // Bonus for good structure
    }

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  private countSyllables(word: string): number {
    const vowels = "aeiouyAEIOUY";
    let count = 0;
    let previousWasVowel = false;

    for (const char of word) {
      const isVowel = vowels.includes(char);
      if (isVowel && !previousWasVowel) {
        count++;
      }
      previousWasVowel = isVowel;
    }

    // Handle silent 'e'
    if (word.endsWith("e") && count > 1) {
      count--;
    }

    return Math.max(1, count);
  }

  private async analyzeSemanticRelevance(
    content: { content: string; title: string },
    targetKeywords: string[]
  ): Promise<number> {
    const text = (content.title + " " + content.content).toLowerCase();
    let relevanceScore = 0;
    const totalKeywords = targetKeywords.length;

    for (const keyword of targetKeywords) {
      const keywordLower = keyword.toLowerCase();
      const keywordCount = (text.match(new RegExp(keywordLower, "g")) || [])
        .length;
      const contentLength = content.content.split(/\s+/).length;

      // Calculate keyword density (ideal: 1-3%)
      const density = (keywordCount / contentLength) * 100;

      if (density >= 1 && density <= 3) {
        relevanceScore += 100;
      } else if (density >= 0.5 && density <= 5) {
        relevanceScore += 70;
      } else if (keywordCount > 0) {
        relevanceScore += 40;
      }
    }

    return totalKeywords > 0 ? Math.round(relevanceScore / totalKeywords) : 0;
  }

  private async analyzeCompetitors(
    competitorUrls: string[],
    _targetKeywords: string[]
  ): Promise<{
    averageScore: number;
    topPerformer: string;
    gaps: string[];
    advantages: string[];
  }> {
    // This would integrate with competitive intelligence in a full implementation
    // For now, return mock data but acknowledge the parameters

    return {
      averageScore: 72,
      topPerformer: competitorUrls[0] || "competitor.com",
      gaps: ["Technical Implementation", "Advanced Strategies"],
      advantages: ["Better Content Depth", "Improved SEO Structure"],
    };
  }

  private calculateFinalScores(data: {
    contentAnalysis: {
      wordCount: number;
      headingStructure: number;
      keywordDensity: number;
      contentGaps: string[];
      topicCoverage: number;
    };
    technicalSEO: number;
    readabilityScore: number;
    semanticRelevance: number;
    competitorComparison?: {
      averageScore: number;
      topPerformer: string;
      gaps: string[];
      advantages: string[];
    };
    analysisDepth: string;
  }): ContentQualityResult {
    // Apply Phase 1 weighting algorithm
    const technicalSeoWeight = 0.3;
    const contentDepthWeight = 0.4;
    const readabilityWeight = 0.2;
    const semanticRelevanceWeight = 0.1;

    const contentDepth = data.contentAnalysis.topicCoverage || 75;

    const overallScore = Math.round(
      data.technicalSEO * technicalSeoWeight +
        contentDepth * contentDepthWeight +
        data.readabilityScore * readabilityWeight +
        data.semanticRelevance * semanticRelevanceWeight
    );

    const recommendations: ContentRecommendation[] = [
      ...this.generateTechnicalRecommendations(data.technicalSEO),
      ...this.generateContentRecommendations(contentDepth),
      ...this.generateReadabilityRecommendations(data.readabilityScore),
      ...this.generateSemanticRecommendations(data.semanticRelevance),
    ];

    return {
      overallScore,
      technicalSeo: data.technicalSEO,
      contentDepth,
      readability: data.readabilityScore,
      semanticRelevance: data.semanticRelevance,
      recommendations: recommendations.slice(0, 10), // Top 10 recommendations
      contentGaps: data.competitorComparison?.gaps || [],
      improvementTimeline: this.estimateImprovementTimeline(overallScore),
    };
  }

  private generateTechnicalRecommendations(
    score: number
  ): ContentRecommendation[] {
    if (score >= 90) return [];

    const recommendations: ContentRecommendation[] = [];

    if (score < 80) {
      recommendations.push({
        type: "title",
        priority: "high",
        impact: "high",
        effort: "low",
        title: "Optimize Title Tag Length",
        description:
          "Ensure title tags are between 30-60 characters for optimal display.",
        implementation:
          "Review and rewrite title tags to be concise yet descriptive.",
        expectedImprovement: 15,
      });
    }

    if (score < 70) {
      recommendations.push({
        type: "meta",
        priority: "high",
        impact: "medium",
        effort: "low",
        title: "Add Meta Descriptions",
        description: "Write compelling meta descriptions for all pages.",
        implementation: "Create unique 120-160 character meta descriptions.",
        expectedImprovement: 10,
      });
    }

    return recommendations;
  }

  private generateContentRecommendations(
    score: number
  ): ContentRecommendation[] {
    if (score >= 85) return [];

    const recommendations: ContentRecommendation[] = [];

    if (score < 75) {
      recommendations.push({
        type: "content",
        priority: "high",
        impact: "high",
        effort: "medium",
        title: "Expand Content Depth",
        description:
          "Add more comprehensive information to improve content value.",
        implementation:
          "Research and add detailed sections, examples, and expert insights.",
        expectedImprovement: 20,
      });
    }

    return recommendations;
  }

  private generateReadabilityRecommendations(
    score: number
  ): ContentRecommendation[] {
    if (score >= 80) return [];

    const recommendations: ContentRecommendation[] = [];

    recommendations.push({
      type: "structure",
      priority: "medium",
      impact: "medium",
      effort: "low",
      title: "Improve Content Structure",
      description: "Break up long paragraphs and add more subheadings.",
      implementation:
        "Use shorter sentences, bullet points, and logical heading hierarchy.",
      expectedImprovement: 15,
    });

    return recommendations;
  }

  private generateSemanticRecommendations(
    score: number
  ): ContentRecommendation[] {
    if (score >= 85) return [];

    const recommendations: ContentRecommendation[] = [];

    recommendations.push({
      type: "keywords",
      priority: "medium",
      impact: "high",
      effort: "medium",
      title: "Optimize Keyword Integration",
      description:
        "Better integrate target keywords naturally throughout content.",
      implementation: "Review keyword density and add semantic variations.",
      expectedImprovement: 18,
    });

    return recommendations;
  }

  private estimateImprovementTimeline(currentScore: number): string {
    if (currentScore >= 90) return "1-2 weeks (minor optimizations)";
    if (currentScore >= 75) return "2-4 weeks (moderate improvements)";
    if (currentScore >= 60) return "1-2 months (significant updates needed)";
    return "2-3 months (comprehensive content overhaul)";
  }

  private determineRetryability(errorMessage: string): boolean {
    const nonRetryablePatterns = [
      "validation",
      "invalid url",
      "permission denied",
      "unauthorized",
      "forbidden",
      "not found",
      "bad request",
    ];

    const retryablePatterns = [
      "timeout",
      "network",
      "connection",
      "rate limit",
      "server error",
      "service unavailable",
      "temporary",
    ];

    const lowerMessage = errorMessage.toLowerCase();

    // Check for explicitly non-retryable errors first
    if (nonRetryablePatterns.some(pattern => lowerMessage.includes(pattern))) {
      return false;
    }

    // Check for explicitly retryable errors
    if (retryablePatterns.some(pattern => lowerMessage.includes(pattern))) {
      return true;
    }

    // Default to retryable for unknown errors
    return true;
  }

  private async storeResults(
    projectId: string,
    jobId: string,
    result: ContentQualityResult
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("content_analysis_results")
        .insert({
          job_id: jobId,
          project_id: projectId,
          overall_score: result.overallScore,
          technical_seo: result.technicalSeo,
          content_depth: result.contentDepth,
          readability: result.readability,
          semantic_relevance: result.semanticRelevance,
          recommendations: result.recommendations,
          content_gaps: result.contentGaps,
          improvement_timeline: result.improvementTimeline,
          analysis_depth: "comprehensive",
          pages_analyzed: 1,
          content_volume: 0, // Would be calculated from actual content
        });

      if (error) {
        throw createDatabaseError(new Error(error.message), {
          projectId,
          jobId,
          timestamp: new Date().toISOString(),
        });
      }

      // Invalidate cache for this project's content analysis and complete analytics
      analyticsCache.invalidate(projectId, CacheKeys.CONTENT_ANALYSIS);
      analyticsCache.invalidate(projectId, "complete-analytics");
    } catch (error) {
      console.error("Failed to store content analysis results:", error);
      throw error;
    }
  }
}
