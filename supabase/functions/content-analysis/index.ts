/**
 * Content Analysis Edge Function
 * Analyzes content for SEO, readability, and optimization opportunities
 */

import {
  handleCors,
  createResponse,
  createErrorResponse,
} from "../_shared/cors.ts";
import { getAuthUser, requireAuth } from "../_shared/auth.ts";
import {
  createDatabaseClient,
  getContentItemById,
  getUserTeamAccess,
  createAnalysisResult,
} from "../_shared/database.ts";

interface ContentAnalysisRequest {
  contentId: string;
  analysisType?: "full" | "seo" | "readability" | "keywords";
  options?: {
    includeCompetitorAnalysis?: boolean;
    generateRecommendations?: boolean;
  };
}

interface SEOAnalysis {
  score: number;
  issues: Array<{
    type: "error" | "warning" | "info";
    category: string;
    message: string;
    suggestion: string;
  }>;
  opportunities: Array<{
    type: string;
    impact: "high" | "medium" | "low";
    effort: "high" | "medium" | "low";
    description: string;
  }>;
}

interface ReadabilityAnalysis {
  score: number;
  grade_level: string;
  reading_time_minutes: number;
  metrics: {
    sentences: number;
    words: number;
    syllables: number;
    avg_sentence_length: number;
    avg_syllables_per_word: number;
  };
  suggestions: string[];
}

interface KeywordAnalysis {
  primary_keywords: Array<{
    keyword: string;
    density: number;
    frequency: number;
    relevance_score: number;
  }>;
  keyword_distribution: {
    title: number;
    meta_description: number;
    headings: number;
    content: number;
  };
  missing_keywords: string[];
  keyword_stuffing_risk: "low" | "medium" | "high";
}

async function analyzeSEO(
  content: ContentAnalysisRequest
): Promise<SEOAnalysis> {
  const issues: SEOAnalysis["issues"] = [];
  const opportunities: SEOAnalysis["opportunities"] = [];
  let score = 100;

  // Title analysis
  const titleLength = content.meta_title?.length || content.title?.length || 0;
  if (titleLength === 0) {
    issues.push({
      type: "error",
      category: "title",
      message: "Missing title tag",
      suggestion: "Add a descriptive title tag (30-60 characters)",
    });
    score -= 20;
  } else if (titleLength < 30 || titleLength > 60) {
    issues.push({
      type: "warning",
      category: "title",
      message: "Title length not optimal",
      suggestion:
        "Optimize title length to 30-60 characters for better search results",
    });
    score -= 10;
  }

  // Meta description analysis
  const metaDescLength = content.meta_description?.length || 0;
  if (metaDescLength === 0) {
    issues.push({
      type: "warning",
      category: "meta_description",
      message: "Missing meta description",
      suggestion: "Add a compelling meta description (120-160 characters)",
    });
    score -= 15;
  } else if (metaDescLength < 120 || metaDescLength > 160) {
    issues.push({
      type: "info",
      category: "meta_description",
      message: "Meta description length could be optimized",
      suggestion: "Adjust meta description to 120-160 characters",
    });
    score -= 5;
  }

  // Content length analysis
  // const contentLength = content.content?.length || 0; // Reserved for future use
  const wordCount = content.word_count || 0;
  if (wordCount < 300) {
    issues.push({
      type: "warning",
      category: "content_length",
      message: "Content is too short",
      suggestion:
        "Expand content to at least 300 words for better SEO performance",
    });
    score -= 15;
  }

  // Keywords analysis
  const focusKeywords = content.focus_keywords || [];
  if (focusKeywords.length === 0) {
    opportunities.push({
      type: "keyword_optimization",
      impact: "high",
      effort: "low",
      description: "Add focus keywords to improve search engine targeting",
    });
    score -= 10;
  }

  // URL structure analysis
  const url = content.url || "";
  if (!url.includes(content.title?.toLowerCase().replace(/[^a-z0-9]/g, "-"))) {
    opportunities.push({
      type: "url_optimization",
      impact: "medium",
      effort: "medium",
      description: "Optimize URL structure to include target keywords",
    });
  }

  return {
    score: Math.max(0, score),
    issues,
    opportunities,
  };
}

async function analyzeReadability(
  content: ContentAnalysisRequest
): Promise<ReadabilityAnalysis> {
  const text = content.content || "";
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const sentences = text
    .split(/[.!?]+/)
    .filter(sentence => sentence.trim().length > 0);

  // Simple syllable counting (approximation)
  const syllables = words.reduce((count, word) => {
    const syllableCount = word.toLowerCase().match(/[aeiouy]+/g)?.length || 1;
    return count + syllableCount;
  }, 0);

  const avgSentenceLength = words.length / sentences.length || 0;
  const avgSyllablesPerWord = syllables / words.length || 0;

  // Simplified Flesch Reading Ease calculation
  const fleschScore =
    206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;

  // Convert to grade level
  let gradeLevel = "Graduate";
  if (fleschScore >= 90) gradeLevel = "5th grade";
  else if (fleschScore >= 80) gradeLevel = "6th grade";
  else if (fleschScore >= 70) gradeLevel = "7th grade";
  else if (fleschScore >= 60) gradeLevel = "8th-9th grade";
  else if (fleschScore >= 50) gradeLevel = "10th-12th grade";
  else if (fleschScore >= 30) gradeLevel = "College level";

  const suggestions: string[] = [];
  if (avgSentenceLength > 20) {
    suggestions.push(
      "Consider breaking up long sentences for better readability"
    );
  }
  if (avgSyllablesPerWord > 1.7) {
    suggestions.push("Use simpler words where possible to improve readability");
  }
  if (fleschScore < 60) {
    suggestions.push(
      "Consider simplifying language to reach a broader audience"
    );
  }

  return {
    score: Math.round(Math.max(0, Math.min(100, fleschScore))),
    grade_level: gradeLevel,
    reading_time_minutes: Math.ceil(words.length / 200), // Average reading speed
    metrics: {
      sentences: sentences.length,
      words: words.length,
      syllables,
      avg_sentence_length: Math.round(avgSentenceLength * 10) / 10,
      avg_syllables_per_word: Math.round(avgSyllablesPerWord * 10) / 10,
    },
    suggestions,
  };
}

async function analyzeKeywords(
  content: ContentAnalysisRequest
): Promise<KeywordAnalysis> {
  const text = (content.content || "").toLowerCase();
  const title = (content.title || "").toLowerCase();
  const metaDesc = (content.meta_description || "").toLowerCase();
  const focusKeywords = content.focus_keywords || [];

  const words = text.split(/\s+/).filter(word => word.length > 2);
  const totalWords = words.length;

  // Analyze primary keywords
  const keywordCounts = new Map<string, number>();
  words.forEach(word => {
    keywordCounts.set(word, (keywordCounts.get(word) || 0) + 1);
  });

  const primaryKeywords = Array.from(keywordCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([keyword, frequency]) => ({
      keyword,
      density: (frequency / totalWords) * 100,
      frequency,
      relevance_score: Math.min(100, (frequency / totalWords) * 1000),
    }));

  // Check keyword distribution
  const distribution = {
    title: focusKeywords.filter(kw => title.includes(kw.toLowerCase())).length,
    meta_description: focusKeywords.filter(kw =>
      metaDesc.includes(kw.toLowerCase())
    ).length,
    headings: 0, // Would need to parse HTML for actual headings
    content: focusKeywords.filter(kw => text.includes(kw.toLowerCase())).length,
  };

  // Find missing keywords
  const missingKeywords = focusKeywords.filter(
    kw => !text.includes(kw.toLowerCase())
  );

  // Check for keyword stuffing
  const maxDensity = Math.max(...primaryKeywords.map(kw => kw.density));
  let keywordStuffingRisk: "low" | "medium" | "high" = "low";
  if (maxDensity > 3) keywordStuffingRisk = "high";
  else if (maxDensity > 2) keywordStuffingRisk = "medium";

  return {
    primary_keywords: primaryKeywords,
    keyword_distribution: distribution,
    missing_keywords: missingKeywords,
    keyword_stuffing_risk: keywordStuffingRisk,
  };
}

Deno.serve(async req => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Authenticate user
    const user = await getAuthUser(req);
    const authError = requireAuth(user);
    if (authError) return authError;

    // Parse request
    const body: ContentAnalysisRequest = await req.json();
    const { contentId, analysisType = "full" } = body;

    if (!contentId) {
      return createErrorResponse("Content ID is required");
    }

    // Get database client
    const supabase = createDatabaseClient();

    // Get content item
    const content = await getContentItemById(supabase, contentId);
    if (!content) {
      return createErrorResponse("Content not found", 404);
    }

    // Check user access to content's project
    const { data: project } = await supabase
      .from("projects")
      .select("team_id")
      .eq("id", content.project_id)
      .single();

    if (!project) {
      return createErrorResponse("Project not found", 404);
    }

    const hasAccess = await getUserTeamAccess(
      supabase,
      user!.id,
      project.team_id
    );
    if (!hasAccess) {
      return createErrorResponse("Insufficient permissions", 403);
    }

    // Perform analysis based on type
    const analysisResult: Record<string, unknown> = {};

    if (analysisType === "full" || analysisType === "seo") {
      analysisResult.seo = await analyzeSEO(content);
    }

    if (analysisType === "full" || analysisType === "readability") {
      analysisResult.readability = await analyzeReadability(content);
    }

    if (analysisType === "full" || analysisType === "keywords") {
      analysisResult.keywords = await analyzeKeywords(content);
    }

    // Calculate overall score for full analysis
    if (analysisType === "full") {
      const seoScore = analysisResult.seo?.score || 0;
      const readabilityScore = analysisResult.readability?.score || 0;
      analysisResult.overall_score = Math.round(
        (seoScore + readabilityScore) / 2
      );
    }

    // Save analysis result to database
    const confidenceScore = analysisType === "full" ? 85 : 90; // Lower confidence for full analysis
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString(); // 7 days

    await createAnalysisResult(
      supabase,
      content.project_id,
      `content_${analysisType}`,
      analysisResult,
      contentId,
      undefined,
      confidenceScore,
      expiresAt
    );

    return createResponse({
      content_id: contentId,
      analysis_type: analysisType,
      results: analysisResult,
      generated_at: new Date().toISOString(),
      confidence_score: confidenceScore,
    });
  } catch (error) {
    console.error("Content analysis error:", error);
    return createErrorResponse("Internal server error", 500);
  }
});
