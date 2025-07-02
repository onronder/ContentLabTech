/**
 * Enhanced Content Analysis Edge Function
 * Advanced content analysis with semantic analysis, E-A-T scoring, and competitive benchmarking
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
  analysisType?: "full" | "seo" | "readability" | "keywords" | "enhanced";
  options?: {
    includeCompetitorAnalysis?: boolean;
    generateRecommendations?: boolean;
    useAdvancedAlgorithms?: boolean;
  };
}

interface SemanticAnalysis {
  similarity_score: number;
  topic_clusters: string[];
  expertise_level: number;
  semantic_relevance: number;
  content_depth_score: number;
}

interface EATAnalysis {
  overall_score: number;
  expertise: number;
  authoritativeness: number;
  trustworthiness: number;
  signals: {
    citations: number;
    author_mentions: number;
    expert_language: number;
    factual_accuracy: number;
  };
}

interface CompetitiveBenchmark {
  benchmark_score: number;
  relative_performance: number;
  content_gaps: string[];
  opportunities: Array<{
    type: string;
    impact: "high" | "medium" | "low";
    description: string;
  }>;
  competitor_metrics: {
    avg_content_length: number;
    avg_readability_score: number;
    avg_seo_score: number;
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

/**
 * Advanced Semantic Analysis using OpenAI Embeddings
 */
async function performSemanticAnalysis(
  content: any,
  focusKeywords: string[]
): Promise<SemanticAnalysis> {
  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      console.warn(
        "OpenAI API key not configured, using fallback semantic analysis"
      );
      return getFallbackSemanticAnalysis(content, focusKeywords);
    }

    const contentText = `${content.title || ""} ${content.content || ""}`;
    const keywordText = focusKeywords.join(" ");

    // Create embeddings for semantic similarity
    const embeddingResponse = await fetch(
      "https://api.openai.com/v1/embeddings",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: [contentText, keywordText],
        }),
      }
    );

    if (!embeddingResponse.ok) {
      console.error("OpenAI Embeddings API error:", embeddingResponse.status);
      return getFallbackSemanticAnalysis(content, focusKeywords);
    }

    const embeddingData = await embeddingResponse.json();
    const [contentEmbedding, keywordEmbedding] = embeddingData.data;

    // Calculate cosine similarity
    const similarity = calculateCosineSimilarity(
      contentEmbedding.embedding,
      keywordEmbedding.embedding
    );

    // Extract topic clusters using GPT
    const topicClusters = await extractTopicClusters(contentText, openaiApiKey);

    // Calculate expertise level
    const expertiseLevel = calculateExpertiseLevel(content);

    // Calculate semantic relevance
    const semanticRelevance = calculateSemanticRelevance(
      content,
      focusKeywords
    );

    // Calculate content depth score
    const contentDepthScore = calculateContentDepthScore(content);

    return {
      similarity_score: Math.round(similarity * 100),
      topic_clusters: topicClusters,
      expertise_level: expertiseLevel,
      semantic_relevance: semanticRelevance,
      content_depth_score: contentDepthScore,
    };
  } catch (error) {
    console.error("Semantic analysis failed:", error);
    return getFallbackSemanticAnalysis(content, focusKeywords);
  }
}

/**
 * E-A-T (Expertise, Authoritativeness, Trustworthiness) Analysis
 */
async function performEATAnalysis(content: any): Promise<EATAnalysis> {
  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      console.warn(
        "OpenAI API key not configured, using fallback E-A-T analysis"
      );
      return getFallbackEATAnalysis(content);
    }

    const contentText = content.content || "";
    const title = content.title || "";

    // Use GPT-4 for comprehensive E-A-T analysis
    const eatPrompt = `Analyze the following content for E-A-T (Expertise, Authoritativeness, Trustworthiness) signals:

Title: ${title}
Content: ${contentText.substring(0, 3000)}...

Rate each dimension (0-100) and provide signal counts:
1. Expertise - Technical accuracy, depth of knowledge, professional terminology
2. Authoritativeness - Citations, references, credible sources mentioned
3. Trustworthiness - Fact-checking, transparency, unbiased presentation

Return JSON format:
{
  "expertise": number,
  "authoritativeness": number,
  "trustworthiness": number,
  "signals": {
    "citations": number,
    "author_mentions": number,
    "expert_language": number,
    "factual_accuracy": number
  }
}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are an expert content evaluator specializing in E-A-T analysis for SEO. Return only valid JSON.",
          },
          {
            role: "user",
            content: eatPrompt,
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.error("OpenAI Chat API error:", response.status);
      return getFallbackEATAnalysis(content);
    }

    const data = await response.json();
    const eatResult = JSON.parse(data.choices[0].message.content);

    const overallScore = Math.round(
      (eatResult.expertise +
        eatResult.authoritativeness +
        eatResult.trustworthiness) /
        3
    );

    return {
      overall_score: overallScore,
      expertise: eatResult.expertise,
      authoritativeness: eatResult.authoritativeness,
      trustworthiness: eatResult.trustworthiness,
      signals: eatResult.signals,
    };
  } catch (error) {
    console.error("E-A-T analysis failed:", error);
    return getFallbackEATAnalysis(content);
  }
}

/**
 * Competitive Benchmarking Analysis
 */
async function performCompetitiveBenchmarking(
  supabase: any,
  content: any,
  projectId: string
): Promise<CompetitiveBenchmark> {
  try {
    // Get competitor analytics for the project
    const { data: competitorData, error } = await supabase
      .from("competitor_analytics")
      .select(
        `
        *,
        competitors!inner(project_id)
      `
      )
      .eq("competitors.project_id", projectId)
      .limit(20);

    if (error || !competitorData || competitorData.length === 0) {
      console.warn("No competitor data found for benchmarking");
      return getFallbackCompetitiveBenchmark(content);
    }

    // Calculate competitor averages
    const competitorMetrics = calculateCompetitorAverages(competitorData);

    // Analyze current content metrics
    const contentLength = content.word_count || 0;
    const contentReadability = await analyzeReadability(content);
    const contentSEO = await analyzeSEO(content);

    // Calculate relative performance
    const lengthPerformance = Math.min(
      100,
      (contentLength / competitorMetrics.avg_content_length) * 100
    );
    const readabilityPerformance =
      (contentReadability.score / competitorMetrics.avg_readability_score) *
      100;
    const seoPerformance =
      (contentSEO.score / competitorMetrics.avg_seo_score) * 100;

    const relativePerformance = Math.round(
      lengthPerformance * 0.4 +
        readabilityPerformance * 0.3 +
        seoPerformance * 0.3
    );

    // Identify content gaps and opportunities
    const { gaps, opportunities } = analyzeCompetitiveGaps(
      content,
      competitorData
    );

    // Calculate benchmark score
    const benchmarkScore = Math.min(
      100,
      Math.round(
        relativePerformance * 0.7 +
          (gaps.length === 0 ? 30 : Math.max(0, 30 - gaps.length * 5))
      )
    );

    return {
      benchmark_score: benchmarkScore,
      relative_performance: relativePerformance,
      content_gaps: gaps,
      opportunities,
      competitor_metrics: competitorMetrics,
    };
  } catch (error) {
    console.error("Competitive benchmarking failed:", error);
    return getFallbackCompetitiveBenchmark(content);
  }
}

// Utility functions
function calculateCosineSimilarity(
  vectorA: number[],
  vectorB: number[]
): number {
  const dotProduct = vectorA.reduce((sum, a, i) => sum + a * vectorB[i], 0);
  const magnitudeA = Math.sqrt(vectorA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vectorB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

async function extractTopicClusters(
  content: string,
  apiKey: string
): Promise<string[]> {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "Extract 3-5 main topic clusters from content. Return only a JSON array of strings.",
          },
          {
            role: "user",
            content: `Extract main topic clusters from: ${content.substring(0, 2000)}...`,
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      return ["Core Content", "Supporting Ideas", "Technical Details"];
    }

    const data = await response.json();
    return (
      JSON.parse(data.choices[0].message.content) || [
        "Core Content",
        "Supporting Ideas",
      ]
    );
  } catch (error) {
    return ["Core Content", "Supporting Ideas", "Technical Details"];
  }
}

function calculateExpertiseLevel(content: any): number {
  const text = (content.content || "").toLowerCase();
  const wordCount = content.word_count || 0;

  // Technical terms and expert language indicators
  const expertTerms = [
    "according to",
    "research shows",
    "studies indicate",
    "data suggests",
    "analysis reveals",
  ];
  const technicalTerms = [
    "algorithm",
    "methodology",
    "implementation",
    "framework",
    "architecture",
  ];

  let expertiseScore = 0;

  // Base score from content length
  expertiseScore += Math.min(40, (wordCount / 1000) * 40);

  // Expert language usage
  expertTerms.forEach(term => {
    if (text.includes(term)) expertiseScore += 8;
  });

  // Technical terminology
  technicalTerms.forEach(term => {
    if (text.includes(term)) expertiseScore += 6;
  });

  // Citation patterns
  const citationPattern = /\b(source|study|research|report)\b/g;
  const citations = (text.match(citationPattern) || []).length;
  expertiseScore += Math.min(20, citations * 4);

  return Math.min(100, Math.round(expertiseScore));
}

function calculateSemanticRelevance(
  content: any,
  focusKeywords: string[]
): number {
  const text = (
    (content.title || "") +
    " " +
    (content.content || "")
  ).toLowerCase();
  let relevanceScore = 0;

  for (const keyword of focusKeywords) {
    const keywordLower = keyword.toLowerCase();
    const keywordCount = (text.match(new RegExp(keywordLower, "g")) || [])
      .length;
    const wordCount = content.word_count || 1;

    // Calculate keyword density (ideal: 1-3%)
    const density = (keywordCount / wordCount) * 100;

    if (density >= 1 && density <= 3) {
      relevanceScore += 25;
    } else if (density >= 0.5 && density <= 5) {
      relevanceScore += 15;
    } else if (keywordCount > 0) {
      relevanceScore += 10;
    }
  }

  return Math.min(
    100,
    Math.round(relevanceScore / Math.max(1, focusKeywords.length))
  );
}

function calculateContentDepthScore(content: any): number {
  const wordCount = content.word_count || 0;
  const paragraphs = (content.content || "").split("\n\n").length;
  const hasImages = content.featured_image_url ? 1 : 0;

  let depthScore = 0;

  // Word count scoring
  if (wordCount >= 2000) depthScore += 40;
  else if (wordCount >= 1000) depthScore += 30;
  else if (wordCount >= 500) depthScore += 20;
  else depthScore += 10;

  // Structure scoring
  depthScore += Math.min(20, paragraphs * 2);

  // Media scoring
  depthScore += hasImages * 10;

  // Content organization (simplified)
  if (paragraphs >= 5) depthScore += 15;

  // Comprehensiveness bonus
  if (wordCount >= 1500 && paragraphs >= 6) depthScore += 15;

  return Math.min(100, Math.round(depthScore));
}

// Fallback functions
function getFallbackSemanticAnalysis(
  content: any,
  focusKeywords: string[]
): SemanticAnalysis {
  return {
    similarity_score: calculateSemanticRelevance(content, focusKeywords),
    topic_clusters: ["Main Topic", "Supporting Concepts", "Technical Details"],
    expertise_level: calculateExpertiseLevel(content),
    semantic_relevance: calculateSemanticRelevance(content, focusKeywords),
    content_depth_score: calculateContentDepthScore(content),
  };
}

function getFallbackEATAnalysis(content: any): EATAnalysis {
  const text = (content.content || "").toLowerCase();

  // Pattern-based E-A-T analysis
  const expertTerms = [
    "according to",
    "research shows",
    "studies indicate",
    "data suggests",
  ];
  const citationPatterns =
    text.match(/\b(source|study|research|report)\b/g) || [];
  const trustPatterns =
    text.match(/\b(fact|verified|confirmed|proven|evidence)\b/g) || [];

  const expertise = Math.min(
    100,
    expertTerms.filter(term => text.includes(term)).length * 20 + 40
  );
  const authoritativeness = Math.min(100, citationPatterns.length * 10 + 50);
  const trustworthiness = Math.min(100, trustPatterns.length * 15 + 45);

  return {
    overall_score: Math.round(
      (expertise + authoritativeness + trustworthiness) / 3
    ),
    expertise,
    authoritativeness,
    trustworthiness,
    signals: {
      citations: citationPatterns.length,
      author_mentions: (text.match(/\b(author|expert|specialist)\b/g) || [])
        .length,
      expert_language: expertTerms.filter(term => text.includes(term)).length,
      factual_accuracy: trustPatterns.length,
    },
  };
}

function getFallbackCompetitiveBenchmark(content: any): CompetitiveBenchmark {
  return {
    benchmark_score: 70,
    relative_performance: 75,
    content_gaps: ["Limited competitive data available"],
    opportunities: [
      {
        type: "content_expansion",
        impact: "medium",
        description: "Expand content depth to outperform competitors",
      },
    ],
    competitor_metrics: {
      avg_content_length: 1000,
      avg_readability_score: 70,
      avg_seo_score: 75,
    },
  };
}

function calculateCompetitorAverages(competitorData: any[]) {
  const metrics = competitorData.map(comp => ({
    content_length: comp.content_metrics?.word_count || 1000,
    readability_score: comp.content_metrics?.readability_score || 70,
    seo_score: comp.seo_metrics?.overall_score || 75,
  }));

  return {
    avg_content_length:
      metrics.reduce((sum, m) => sum + m.content_length, 0) / metrics.length,
    avg_readability_score:
      metrics.reduce((sum, m) => sum + m.readability_score, 0) / metrics.length,
    avg_seo_score:
      metrics.reduce((sum, m) => sum + m.seo_score, 0) / metrics.length,
  };
}

function analyzeCompetitiveGaps(content: any, competitorData: any[]) {
  const gaps: string[] = [];
  const opportunities: Array<{
    type: string;
    impact: "high" | "medium" | "low";
    description: string;
  }> = [];

  const avgCompetitorLength =
    competitorData.reduce(
      (sum, comp) => sum + (comp.content_metrics?.word_count || 1000),
      0
    ) / competitorData.length;

  const contentLength = content.word_count || 0;

  if (contentLength < avgCompetitorLength * 0.8) {
    gaps.push("Content length below competitive average");
    opportunities.push({
      type: "content_expansion",
      impact: "high",
      description: `Expand content by ${Math.round(avgCompetitorLength - contentLength)} words to match competitive standards`,
    });
  }

  // Add more gap analysis based on available competitor data
  if (competitorData.some(comp => comp.seo_metrics?.technical_score > 90)) {
    opportunities.push({
      type: "technical_seo",
      impact: "medium",
      description: "Improve technical SEO to match top-performing competitors",
    });
  }

  return { gaps, opportunities };
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
    const startTime = Date.now();

    try {
      // Basic analyses (backwards compatible)
      if (
        analysisType === "full" ||
        analysisType === "seo" ||
        analysisType === "enhanced"
      ) {
        analysisResult.seo = await analyzeSEO(content);
      }

      if (
        analysisType === "full" ||
        analysisType === "readability" ||
        analysisType === "enhanced"
      ) {
        analysisResult.readability = await analyzeReadability(content);
      }

      if (
        analysisType === "full" ||
        analysisType === "keywords" ||
        analysisType === "enhanced"
      ) {
        analysisResult.keywords = await analyzeKeywords(content);
      }

      // Enhanced analyses (new advanced algorithms)
      if (
        analysisType === "enhanced" ||
        (analysisType === "full" && body.options?.useAdvancedAlgorithms)
      ) {
        console.log("Starting enhanced analysis...");

        const focusKeywords = content.focus_keywords || [];

        // Parallel execution of advanced analyses for performance
        const [semanticAnalysis, eatAnalysis, competitiveBenchmark] =
          await Promise.allSettled([
            performSemanticAnalysis(content, focusKeywords),
            performEATAnalysis(content),
            body.options?.includeCompetitorAnalysis
              ? performCompetitiveBenchmarking(
                  supabase,
                  content,
                  content.project_id
                )
              : Promise.resolve(null),
          ]);

        // Add semantic analysis results
        if (semanticAnalysis.status === "fulfilled") {
          analysisResult.semantic = semanticAnalysis.value;
          console.log("Semantic analysis completed successfully");
        } else {
          console.error("Semantic analysis failed:", semanticAnalysis.reason);
          analysisResult.semantic = getFallbackSemanticAnalysis(
            content,
            focusKeywords
          );
        }

        // Add E-A-T analysis results
        if (eatAnalysis.status === "fulfilled") {
          analysisResult.eat = eatAnalysis.value;
          console.log("E-A-T analysis completed successfully");
        } else {
          console.error("E-A-T analysis failed:", eatAnalysis.reason);
          analysisResult.eat = getFallbackEATAnalysis(content);
        }

        // Add competitive benchmarking results
        if (
          competitiveBenchmark.status === "fulfilled" &&
          competitiveBenchmark.value
        ) {
          analysisResult.competitive = competitiveBenchmark.value;
          console.log("Competitive benchmarking completed successfully");
        } else if (body.options?.includeCompetitorAnalysis) {
          console.error(
            "Competitive benchmarking failed:",
            competitiveBenchmark.status === "rejected"
              ? competitiveBenchmark.reason
              : "Not requested"
          );
          analysisResult.competitive = getFallbackCompetitiveBenchmark(content);
        }
      }

      // Calculate enhanced overall score
      if (analysisType === "enhanced" || analysisType === "full") {
        const weights = getEnhancedScoringWeights(analysisType === "enhanced");
        analysisResult.overall_score = calculateEnhancedOverallScore(
          analysisResult,
          weights
        );

        // Add enhanced metadata
        analysisResult.enhanced_metadata = {
          analysis_version:
            analysisType === "enhanced" ? "2.0-enhanced" : "1.5-hybrid",
          processing_time_ms: Date.now() - startTime,
          algorithms_used: getAlgorithmsUsed(analysisResult),
          confidence_factors: calculateConfidenceFactors(analysisResult),
        };
      } else {
        // Legacy scoring for backwards compatibility
        const seoScore = analysisResult.seo?.score || 0;
        const readabilityScore = analysisResult.readability?.score || 0;
        analysisResult.overall_score = Math.round(
          (seoScore + readabilityScore) / 2
        );
      }
    } catch (error) {
      console.error("Analysis execution error:", error);
      // Ensure we still return some results even if enhanced features fail
      if (!analysisResult.seo)
        analysisResult.seo = { score: 50, issues: [], opportunities: [] };
      if (!analysisResult.readability)
        analysisResult.readability = {
          score: 50,
          grade_level: "Unknown",
          reading_time_minutes: 0,
          metrics: {},
          suggestions: [],
        };
      analysisResult.overall_score = 50;
      analysisResult.error_info = {
        message: "Some advanced features failed, basic analysis completed",
        fallback_used: true,
      };
    }

    // Save analysis result to database
    const confidenceScore = calculateDynamicConfidenceScore(
      analysisResult,
      analysisType
    );
    const expiresAt = new Date(
      Date.now() + (analysisType === "enhanced" ? 3 : 7) * 24 * 60 * 60 * 1000
    ).toISOString(); // Enhanced analysis expires faster due to dynamic competitive data

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
    return createErrorResponse(
      error instanceof Error
        ? `Analysis failed: ${error.message}`
        : "Internal server error",
      500
    );
  }
});

/**
 * Enhanced scoring weights based on analysis type
 */
function getEnhancedScoringWeights(isFullyEnhanced: boolean) {
  if (isFullyEnhanced) {
    // Enhanced algorithm weights
    return {
      technical_seo: 0.2, // Reduced from 30%
      content_depth: 0.25, // Enhanced analysis
      readability: 0.15, // Reduced from 20%
      semantic_relevance: 0.1, // Existing
      semantic_similarity: 0.1, // New
      eat_score: 0.15, // New - E-A-T scoring
      competitive_benchmark: 0.05, // New - competitive positioning
    };
  } else {
    // Hybrid weights (backwards compatible with some enhancements)
    return {
      technical_seo: 0.25,
      content_depth: 0.35,
      readability: 0.2,
      semantic_relevance: 0.1,
      semantic_similarity: 0.05,
      eat_score: 0.05,
      competitive_benchmark: 0.0,
    };
  }
}

/**
 * Calculate enhanced overall score using new weighting algorithm
 */
function calculateEnhancedOverallScore(
  analysisResult: any,
  weights: any
): number {
  let totalScore = 0;
  let totalWeight = 0;

  // Technical SEO
  if (analysisResult.seo?.score !== undefined) {
    totalScore += analysisResult.seo.score * weights.technical_seo;
    totalWeight += weights.technical_seo;
  }

  // Content Depth (enhanced calculation)
  const contentDepthScore = calculateEnhancedContentDepth(analysisResult);
  totalScore += contentDepthScore * weights.content_depth;
  totalWeight += weights.content_depth;

  // Readability
  if (analysisResult.readability?.score !== undefined) {
    totalScore += analysisResult.readability.score * weights.readability;
    totalWeight += weights.readability;
  }

  // Semantic Relevance (existing)
  const semanticRelevanceScore =
    calculateSemanticRelevanceFromKeywords(analysisResult);
  totalScore += semanticRelevanceScore * weights.semantic_relevance;
  totalWeight += weights.semantic_relevance;

  // Semantic Similarity (new)
  if (
    analysisResult.semantic?.similarity_score !== undefined &&
    weights.semantic_similarity > 0
  ) {
    totalScore +=
      analysisResult.semantic.similarity_score * weights.semantic_similarity;
    totalWeight += weights.semantic_similarity;
  }

  // E-A-T Score (new)
  if (
    analysisResult.eat?.overall_score !== undefined &&
    weights.eat_score > 0
  ) {
    totalScore += analysisResult.eat.overall_score * weights.eat_score;
    totalWeight += weights.eat_score;
  }

  // Competitive Benchmark (new)
  if (
    analysisResult.competitive?.benchmark_score !== undefined &&
    weights.competitive_benchmark > 0
  ) {
    totalScore +=
      analysisResult.competitive.benchmark_score *
      weights.competitive_benchmark;
    totalWeight += weights.competitive_benchmark;
  }

  return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 50;
}

/**
 * Enhanced content depth calculation
 */
function calculateEnhancedContentDepth(analysisResult: any): number {
  let depthScore = 0;
  let components = 0;

  // Base content depth from semantic analysis
  if (analysisResult.semantic?.content_depth_score !== undefined) {
    depthScore += analysisResult.semantic.content_depth_score * 0.4;
    components += 0.4;
  }

  // Topic coverage from semantic analysis
  if (analysisResult.semantic?.topic_clusters !== undefined) {
    const topicScore = Math.min(
      100,
      analysisResult.semantic.topic_clusters.length * 20
    );
    depthScore += topicScore * 0.3;
    components += 0.3;
  }

  // Expertise level
  if (analysisResult.semantic?.expertise_level !== undefined) {
    depthScore += analysisResult.semantic.expertise_level * 0.2;
    components += 0.2;
  }

  // E-A-T expertise component
  if (analysisResult.eat?.expertise !== undefined) {
    depthScore += analysisResult.eat.expertise * 0.1;
    components += 0.1;
  }

  return components > 0 ? Math.round(depthScore / components) : 75;
}

/**
 * Calculate semantic relevance from keyword analysis
 */
function calculateSemanticRelevanceFromKeywords(analysisResult: any): number {
  if (analysisResult.semantic?.semantic_relevance !== undefined) {
    return analysisResult.semantic.semantic_relevance;
  }

  // Fallback to keyword analysis
  if (analysisResult.keywords?.primary_keywords) {
    const avgRelevance =
      analysisResult.keywords.primary_keywords
        .slice(0, 5)
        .reduce((sum: number, kw: any) => sum + (kw.relevance_score || 0), 0) /
      5;
    return Math.round(avgRelevance);
  }

  return 60; // Default moderate relevance
}

/**
 * Determine which algorithms were used in analysis
 */
function getAlgorithmsUsed(analysisResult: any): string[] {
  const algorithms = ["basic_seo", "readability_flesch"];

  if (analysisResult.semantic) {
    algorithms.push("semantic_embeddings");
    if (analysisResult.semantic.topic_clusters?.length > 2) {
      algorithms.push("topic_clustering");
    }
  }

  if (analysisResult.eat) {
    algorithms.push("eat_analysis");
  }

  if (analysisResult.competitive) {
    algorithms.push("competitive_benchmarking");
  }

  return algorithms;
}

/**
 * Calculate confidence factors for the analysis
 */
function calculateConfidenceFactors(analysisResult: any): any {
  const factors: any = {
    data_completeness: 0,
    algorithm_coverage: 0,
    external_api_success: 0,
  };

  // Data completeness
  let dataPoints = 0;
  let availableDataPoints = 0;

  const requiredFields = ["seo", "readability", "keywords"];
  requiredFields.forEach(field => {
    availableDataPoints++;
    if (analysisResult[field]) dataPoints++;
  });

  const enhancedFields = ["semantic", "eat", "competitive"];
  enhancedFields.forEach(field => {
    availableDataPoints++;
    if (analysisResult[field]) dataPoints++;
  });

  factors.data_completeness = Math.round(
    (dataPoints / availableDataPoints) * 100
  );

  // Algorithm coverage
  const usedAlgorithms = getAlgorithmsUsed(analysisResult);
  factors.algorithm_coverage = Math.min(100, usedAlgorithms.length * 15);

  // External API success
  let apiSuccessCount = 0;
  let apiAttemptCount = 0;

  if (analysisResult.semantic && !analysisResult.semantic.fallback_used) {
    apiSuccessCount++;
  }
  if (analysisResult.semantic) apiAttemptCount++;

  if (analysisResult.eat && !analysisResult.eat.fallback_used) {
    apiSuccessCount++;
  }
  if (analysisResult.eat) apiAttemptCount++;

  factors.external_api_success =
    apiAttemptCount > 0
      ? Math.round((apiSuccessCount / apiAttemptCount) * 100)
      : 100;

  return factors;
}

/**
 * Calculate dynamic confidence score based on analysis completeness and success
 */
function calculateDynamicConfidenceScore(
  analysisResult: any,
  analysisType: string
): number {
  let baseConfidence = 90;

  // Adjust base confidence by analysis type
  if (analysisType === "enhanced") {
    baseConfidence = 95; // Higher confidence for enhanced analysis
  } else if (analysisType === "full") {
    baseConfidence = 85; // Moderate confidence for full analysis
  }

  // Factor in confidence factors if available
  if (analysisResult.enhanced_metadata?.confidence_factors) {
    const factors = analysisResult.enhanced_metadata.confidence_factors;

    // Weighted confidence calculation
    const dataWeight = 0.4;
    const algorithmWeight = 0.3;
    const apiWeight = 0.3;

    const adjustedConfidence =
      (factors.data_completeness * dataWeight +
        factors.algorithm_coverage * algorithmWeight +
        factors.external_api_success * apiWeight) /
      100;

    baseConfidence = Math.round(baseConfidence * adjustedConfidence);
  }

  // Penalize for errors
  if (analysisResult.error_info?.fallback_used) {
    baseConfidence -= 15;
  }

  // Boost for comprehensive analysis
  if (
    analysisResult.semantic &&
    analysisResult.eat &&
    analysisResult.competitive
  ) {
    baseConfidence += 5;
  }

  return Math.max(50, Math.min(100, baseConfidence));
}
