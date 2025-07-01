/**
 * Advanced Semantic Analysis Engine
 * Production-grade content similarity and semantic analysis
 */

import { z } from "zod";
import natural from "natural";
import nlp from "compromise";
import Sentiment from "sentiment";

// Initialize sentiment analyzer
const sentiment = new Sentiment();

// Configuration schema
const semanticAnalysisConfigSchema = z.object({
  enableTfIdf: z.boolean().default(true),
  enableNgrams: z.boolean().default(true),
  enableSentiment: z.boolean().default(true),
  enableEntityExtraction: z.boolean().default(true),
  minSimilarityThreshold: z.number().min(0).max(1).default(0.1),
  ngramSize: z.number().min(1).max(5).default(3),
});

// Request schemas
const contentAnalysisRequestSchema = z.object({
  primaryContent: z.string(),
  comparisonContents: z.array(z.string()),
  options: z
    .object({
      includeTopics: z.boolean().default(true),
      includeSentiment: z.boolean().default(true),
      includeEntities: z.boolean().default(true),
      includeKeywords: z.boolean().default(true),
      includeReadability: z.boolean().default(true),
    })
    .default({}),
});

const keywordOpportunityRequestSchema = z.object({
  targetContent: z.string(),
  competitorContents: z.array(z.string()),
  seedKeywords: z.array(z.string()).optional(),
  options: z
    .object({
      maxKeywords: z.number().default(50),
      minLength: z.number().default(2),
      maxLength: z.number().default(3),
      includeSearchVolume: z.boolean().default(false),
    })
    .default({}),
});

// Response schemas
const semanticSimilaritySchema = z.object({
  overall: z.number().min(0).max(1),
  lexical: z.number().min(0).max(1),
  semantic: z.number().min(0).max(1),
  structural: z.number().min(0).max(1),
  topical: z.number().min(0).max(1),
});

const contentAnalysisResultSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      primaryAnalysis: z.object({
        wordCount: z.number(),
        sentenceCount: z.number(),
        paragraphCount: z.number(),
        readabilityScore: z.number(),
        sentiment: z.object({
          score: z.number(),
          comparative: z.number(),
          label: z.enum(["positive", "negative", "neutral"]),
        }),
        topics: z.array(z.string()),
        entities: z.array(
          z.object({
            text: z.string(),
            type: z.string(),
            confidence: z.number(),
          })
        ),
        keywords: z.array(
          z.object({
            term: z.string(),
            frequency: z.number(),
            importance: z.number(),
          })
        ),
      }),
      comparisons: z.array(
        z.object({
          index: z.number(),
          similarity: semanticSimilaritySchema,
          sharedTopics: z.array(z.string()),
          uniqueTopics: z.array(z.string()),
          contentGaps: z.array(z.string()),
        })
      ),
    })
    .optional(),
  error: z.string().optional(),
  metadata: z.object({
    processingTime: z.number(),
    algorithm: z.string(),
    confidence: z.number(),
  }),
});

const keywordOpportunityResultSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      opportunities: z.array(
        z.object({
          keyword: z.string(),
          competitorUsage: z.number(),
          targetUsage: z.number(),
          opportunity: z.number().min(0).max(100),
          difficulty: z.enum(["low", "medium", "high"]),
          priority: z.number().min(0).max(100),
          searchVolume: z.number().optional(),
          relatedTerms: z.array(z.string()),
        })
      ),
      gaps: z.array(
        z.object({
          topic: z.string(),
          missingKeywords: z.array(z.string()),
          competitorAdvantage: z.number(),
        })
      ),
      recommendations: z.array(
        z.object({
          action: z.string(),
          keywords: z.array(z.string()),
          priority: z.number(),
          estimatedImpact: z.string(),
        })
      ),
    })
    .optional(),
  error: z.string().optional(),
  metadata: z.object({
    processingTime: z.number(),
    totalKeywordsAnalyzed: z.number(),
    confidence: z.number(),
  }),
});

type ContentAnalysisRequest = z.infer<typeof contentAnalysisRequestSchema>;
type KeywordOpportunityRequest = z.infer<
  typeof keywordOpportunityRequestSchema
>;
type ContentAnalysisResult = z.infer<typeof contentAnalysisResultSchema>;
type KeywordOpportunityResult = z.infer<typeof keywordOpportunityResultSchema>;

export class SemanticAnalysisEngine {
  private config: z.infer<typeof semanticAnalysisConfigSchema>;
  private tfidfVectorizer: natural.TfIdf;
  private stemmer = natural.PorterStemmer;

  constructor(
    config: Partial<z.infer<typeof semanticAnalysisConfigSchema>> = {}
  ) {
    this.config = semanticAnalysisConfigSchema.parse(config);
    this.tfidfVectorizer = new natural.TfIdf();
  }

  /**
   * Perform comprehensive content analysis and comparison
   */
  async analyzeContent(
    request: ContentAnalysisRequest
  ): Promise<ContentAnalysisResult> {
    const startTime = Date.now();

    try {
      const validatedRequest = contentAnalysisRequestSchema.parse(request);

      // Analyze primary content
      const primaryAnalysis = await this.analyzeSingleContent(
        validatedRequest.primaryContent,
        validatedRequest.options
      );

      // Analyze comparison contents and calculate similarities
      const comparisons = [];
      for (let i = 0; i < validatedRequest.comparisonContents.length; i++) {
        const comparisonContent = validatedRequest.comparisonContents[i]!;
        const comparison = await this.compareContents(
          validatedRequest.primaryContent,
          comparisonContent,
          validatedRequest.options
        );
        comparisons.push({
          index: i,
          ...comparison,
        });
      }

      return {
        success: true,
        data: {
          primaryAnalysis,
          comparisons,
        },
        metadata: {
          processingTime: Date.now() - startTime,
          algorithm: "TF-IDF + NLP + Semantic Analysis",
          confidence: this.calculateAnalysisConfidence(
            primaryAnalysis,
            comparisons
          ),
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Content analysis failed",
        metadata: {
          processingTime: Date.now() - startTime,
          algorithm: "TF-IDF + NLP + Semantic Analysis",
          confidence: 0,
        },
      };
    }
  }

  /**
   * Identify keyword opportunities through competitive analysis
   */
  async identifyKeywordOpportunities(
    request: KeywordOpportunityRequest
  ): Promise<KeywordOpportunityResult> {
    const startTime = Date.now();

    try {
      const validatedRequest = keywordOpportunityRequestSchema.parse(request);

      // Extract keywords from all contents
      const targetKeywords = this.extractKeywords(
        validatedRequest.targetContent,
        validatedRequest.options
      );
      const competitorKeywordSets = validatedRequest.competitorContents.map(
        content => this.extractKeywords(content, validatedRequest.options)
      );

      // Analyze keyword opportunities
      const opportunities = this.analyzeKeywordGaps(
        targetKeywords,
        competitorKeywordSets,
        validatedRequest.options
      );

      // Identify content gaps
      const gaps = this.identifyContentGaps(
        targetKeywords,
        competitorKeywordSets
      );

      // Generate recommendations
      const recommendations = this.generateKeywordRecommendations(
        opportunities,
        gaps
      );

      return {
        success: true,
        data: {
          opportunities,
          gaps,
          recommendations,
        },
        metadata: {
          processingTime: Date.now() - startTime,
          totalKeywordsAnalyzed:
            targetKeywords.length + competitorKeywordSets.flat().length,
          confidence: this.calculateKeywordConfidence(opportunities),
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Keyword opportunity analysis failed",
        metadata: {
          processingTime: Date.now() - startTime,
          totalKeywordsAnalyzed: 0,
          confidence: 0,
        },
      };
    }
  }

  /**
   * Analyze a single piece of content
   */
  private async analyzeSingleContent(
    content: string,
    options: any
  ): Promise<any> {
    const doc = nlp(content);

    // Basic metrics
    const wordCount = doc.wordCount();
    const sentenceCount = doc.sentences().length;
    const paragraphCount = content.split(/\n\s*\n/).length;

    // Readability score (Flesch-Kincaid)
    const readabilityScore = this.calculateReadabilityScore(
      content,
      wordCount,
      sentenceCount
    );

    // Sentiment analysis
    const sentimentResult = sentiment.analyze(content);
    const sentimentLabel =
      sentimentResult.comparative > 0.1
        ? "positive"
        : sentimentResult.comparative < -0.1
          ? "negative"
          : "neutral";

    // Topic extraction
    const topics = options.includeTopics ? this.extractTopics(content) : [];

    // Entity extraction
    const entities = options.includeEntities ? this.extractEntities(doc) : [];

    // Keyword extraction
    const keywords = options.includeKeywords
      ? this.extractKeywords(content, { maxKeywords: 20 })
      : [];

    return {
      wordCount,
      sentenceCount,
      paragraphCount,
      readabilityScore,
      sentiment: {
        score: sentimentResult.score,
        comparative: sentimentResult.comparative,
        label: sentimentLabel,
      },
      topics,
      entities,
      keywords: keywords.map(k => ({
        term: k.term,
        frequency: k.frequency,
        importance: k.importance,
      })),
    };
  }

  /**
   * Compare two pieces of content for similarity
   */
  private async compareContents(
    primaryContent: string,
    comparisonContent: string,
    options: any
  ): Promise<any> {
    // Calculate different types of similarity
    const lexicalSimilarity = this.calculateLexicalSimilarity(
      primaryContent,
      comparisonContent
    );
    const semanticSimilarity = this.calculateSemanticSimilarity(
      primaryContent,
      comparisonContent
    );
    const structuralSimilarity = this.calculateStructuralSimilarity(
      primaryContent,
      comparisonContent
    );
    const topicalSimilarity = this.calculateTopicalSimilarity(
      primaryContent,
      comparisonContent
    );

    // Overall similarity (weighted average)
    const overall =
      lexicalSimilarity * 0.3 +
      semanticSimilarity * 0.4 +
      structuralSimilarity * 0.15 +
      topicalSimilarity * 0.15;

    // Extract shared and unique topics
    const primaryTopics = this.extractTopics(primaryContent);
    const comparisonTopics = this.extractTopics(comparisonContent);
    const sharedTopics = primaryTopics.filter(topic =>
      comparisonTopics.includes(topic)
    );
    const uniqueTopics = comparisonTopics.filter(
      topic => !primaryTopics.includes(topic)
    );

    // Identify content gaps
    const contentGaps = this.identifyContentGapsFromComparison(
      primaryContent,
      comparisonContent
    );

    return {
      similarity: {
        overall,
        lexical: lexicalSimilarity,
        semantic: semanticSimilarity,
        structural: structuralSimilarity,
        topical: topicalSimilarity,
      },
      sharedTopics,
      uniqueTopics,
      contentGaps,
    };
  }

  /**
   * Calculate lexical similarity using TF-IDF
   */
  private calculateLexicalSimilarity(
    content1: string,
    content2: string
  ): number {
    // Create fresh TF-IDF instance for this comparison
    const tfidf = new natural.TfIdf();

    // Process both documents
    const processedContent1 = this.preprocessText(content1);
    const processedContent2 = this.preprocessText(content2);

    tfidf.addDocument(processedContent1);
    tfidf.addDocument(processedContent2);

    // Get TF-IDF vectors
    const vector1: number[] = [];
    const vector2: number[] = [];
    const allTerms = new Set<string>();

    // Collect all terms
    tfidf.listTerms(0).forEach(item => allTerms.add(item.term));
    tfidf.listTerms(1).forEach(item => allTerms.add(item.term));

    // Build vectors
    Array.from(allTerms).forEach(term => {
      vector1.push(tfidf.tfidf(term, 0));
      vector2.push(tfidf.tfidf(term, 1));
    });

    // Calculate cosine similarity
    return this.cosineSimilarity(vector1, vector2);
  }

  /**
   * Calculate semantic similarity using word embeddings approximation
   */
  private calculateSemanticSimilarity(
    content1: string,
    content2: string
  ): number {
    // Extract meaningful terms from both contents
    const terms1 = this.extractMeaningfulTerms(content1);
    const terms2 = this.extractMeaningfulTerms(content2);

    // Calculate term overlap with semantic weighting
    let similarity = 0;
    let totalWeight = 0;

    terms1.forEach(term1 => {
      terms2.forEach(term2 => {
        const termSimilarity = this.calculateTermSimilarity(term1, term2);
        similarity += termSimilarity;
        totalWeight += 1;
      });
    });

    return totalWeight > 0 ? similarity / totalWeight : 0;
  }

  /**
   * Calculate structural similarity
   */
  private calculateStructuralSimilarity(
    content1: string,
    content2: string
  ): number {
    const doc1 = nlp(content1);
    const doc2 = nlp(content2);

    // Compare structural elements
    const sentenceCount1 = doc1.sentences().length;
    const sentenceCount2 = doc2.sentences().length;
    const sentenceRatio =
      Math.min(sentenceCount1, sentenceCount2) /
      Math.max(sentenceCount1, sentenceCount2);

    const wordCount1 = doc1.wordCount();
    const wordCount2 = doc2.wordCount();
    const wordRatio =
      Math.min(wordCount1, wordCount2) / Math.max(wordCount1, wordCount2);

    // Average of structural similarities
    return (sentenceRatio + wordRatio) / 2;
  }

  /**
   * Calculate topical similarity
   */
  private calculateTopicalSimilarity(
    content1: string,
    content2: string
  ): number {
    const topics1 = this.extractTopics(content1);
    const topics2 = this.extractTopics(content2);

    if (topics1.length === 0 && topics2.length === 0) return 1;
    if (topics1.length === 0 || topics2.length === 0) return 0;

    const sharedTopics = topics1.filter(topic => topics2.includes(topic));
    const totalTopics = new Set([...topics1, ...topics2]).size;

    return sharedTopics.length / totalTopics;
  }

  /**
   * Extract keywords with frequency and importance scoring
   */
  private extractKeywords(content: string, options: any): any[] {
    const processedContent = this.preprocessText(content);
    const tfidf = new natural.TfIdf();
    tfidf.addDocument(processedContent);

    const terms = tfidf.listTerms(0);
    const keywords = terms
      .filter(term => term.term.length >= (options.minLength || 2))
      .filter(term => term.term.length <= (options.maxLength || 20))
      .slice(0, options.maxKeywords || 50)
      .map(term => ({
        term: term.term,
        frequency: this.countTermFrequency(term.term, content),
        importance: term.tfidf,
      }));

    return keywords;
  }

  /**
   * Analyze keyword gaps between target and competitor content
   */
  private analyzeKeywordGaps(
    targetKeywords: any[],
    competitorKeywordSets: any[][],
    options: any
  ): any[] {
    const allCompetitorKeywords = competitorKeywordSets.flat();
    const competitorKeywordMap = new Map<string, number>();

    // Count competitor keyword usage
    allCompetitorKeywords.forEach(keyword => {
      const count = competitorKeywordMap.get(keyword.term) || 0;
      competitorKeywordMap.set(keyword.term, count + keyword.frequency);
    });

    const targetKeywordMap = new Map<string, number>();
    targetKeywords.forEach(keyword => {
      targetKeywordMap.set(keyword.term, keyword.frequency);
    });

    const opportunities: any[] = [];

    // Analyze each competitor keyword for opportunities
    competitorKeywordMap.forEach((competitorUsage, keyword) => {
      const targetUsage = targetKeywordMap.get(keyword) || 0;
      const usageGap = competitorUsage - targetUsage;

      if (usageGap > 0) {
        const opportunity = Math.min(100, (usageGap / competitorUsage) * 100);
        const difficulty = this.assessKeywordDifficulty(
          keyword,
          competitorUsage
        );
        const priority = this.calculateKeywordPriority(
          opportunity,
          difficulty,
          competitorUsage
        );

        opportunities.push({
          keyword,
          competitorUsage,
          targetUsage,
          opportunity,
          difficulty,
          priority,
          relatedTerms: this.findRelatedTerms(keyword, allCompetitorKeywords),
        });
      }
    });

    return opportunities.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Identify content gaps by topic analysis
   */
  private identifyContentGaps(
    targetKeywords: any[],
    competitorKeywordSets: any[][]
  ): any[] {
    const targetTopics = this.groupKeywordsByTopic(targetKeywords);
    const competitorTopics = this.groupKeywordsByTopic(
      competitorKeywordSets.flat()
    );

    const gaps: any[] = [];

    Object.entries(competitorTopics).forEach(([topic, keywords]) => {
      const targetTopicKeywords = targetTopics[topic] || [];
      const missingKeywords = keywords
        .filter(
          keyword => !targetTopicKeywords.some(tk => tk.term === keyword.term)
        )
        .map(k => k.term);

      if (missingKeywords.length > 0) {
        const competitorAdvantage =
          keywords.reduce((sum, k) => sum + k.importance, 0) / keywords.length;

        gaps.push({
          topic,
          missingKeywords,
          competitorAdvantage,
        });
      }
    });

    return gaps.sort((a, b) => b.competitorAdvantage - a.competitorAdvantage);
  }

  /**
   * Generate keyword recommendations
   */
  private generateKeywordRecommendations(
    opportunities: any[],
    gaps: any[]
  ): any[] {
    const recommendations: any[] = [];

    // High-priority keyword opportunities
    const highPriorityKeywords = opportunities
      .filter(opp => opp.priority >= 70 && opp.difficulty !== "high")
      .slice(0, 10);

    if (highPriorityKeywords.length > 0) {
      recommendations.push({
        action: "Target high-opportunity keywords",
        keywords: highPriorityKeywords.map(k => k.keyword),
        priority: 90,
        estimatedImpact:
          "High - significant traffic potential with reasonable difficulty",
      });
    }

    // Content gap recommendations
    const topGaps = gaps.slice(0, 5);
    topGaps.forEach(gap => {
      recommendations.push({
        action: `Create content around ${gap.topic} topic`,
        keywords: gap.missingKeywords.slice(0, 8),
        priority: Math.round(gap.competitorAdvantage * 100),
        estimatedImpact:
          "Medium - address competitor advantages in specific topics",
      });
    });

    // Long-tail keyword opportunities
    const longTailKeywords = opportunities
      .filter(
        opp => opp.keyword.split(" ").length >= 3 && opp.difficulty === "low"
      )
      .slice(0, 15);

    if (longTailKeywords.length > 0) {
      recommendations.push({
        action: "Target long-tail keywords",
        keywords: longTailKeywords.map(k => k.keyword),
        priority: 60,
        estimatedImpact: "Medium - easier to rank, targeted traffic",
      });
    }

    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Preprocess text for analysis
   */
  private preprocessText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Extract meaningful terms (nouns, adjectives, verbs)
   */
  private extractMeaningfulTerms(content: string): string[] {
    const doc = nlp(content);
    const terms: string[] = [];

    // Extract nouns
    doc.nouns().forEach(noun => {
      terms.push(noun.text());
    });

    // Extract adjectives
    doc.adjectives().forEach(adj => {
      terms.push(adj.text());
    });

    // Extract verbs
    doc.verbs().forEach(verb => {
      terms.push(verb.text());
    });

    return terms.filter(term => term.length > 2);
  }

  /**
   * Calculate term similarity using string similarity and semantic approximation
   */
  private calculateTermSimilarity(term1: string, term2: string): number {
    if (term1 === term2) return 1;

    // String similarity
    const stringSimilarity = natural.JaroWinklerDistance(term1, term2);

    // Stem similarity
    const stem1 = this.stemmer.stem(term1);
    const stem2 = this.stemmer.stem(term2);
    const stemSimilarity = stem1 === stem2 ? 1 : 0;

    // Combined similarity
    return Math.max(stringSimilarity, stemSimilarity);
  }

  /**
   * Extract topics from content
   */
  private extractTopics(content: string): string[] {
    const doc = nlp(content);
    const topics: string[] = [];

    // Extract noun phrases as topics
    doc.match("#Noun+ #Noun").forEach(phrase => {
      const topic = phrase.text().toLowerCase();
      if (topic.length > 3 && !topics.includes(topic)) {
        topics.push(topic);
      }
    });

    // Extract single important nouns
    doc.nouns().forEach(noun => {
      const topic = noun.text().toLowerCase();
      if (topic.length > 3 && !topics.includes(topic)) {
        topics.push(topic);
      }
    });

    return topics.slice(0, 20); // Limit to top 20 topics
  }

  /**
   * Extract entities using NLP
   */
  private extractEntities(doc: any): any[] {
    const entities: any[] = [];

    // Extract people
    doc.people().forEach((person: any) => {
      entities.push({
        text: person.text(),
        type: "person",
        confidence: 0.8,
      });
    });

    // Extract places
    doc.places().forEach((place: any) => {
      entities.push({
        text: place.text(),
        type: "place",
        confidence: 0.8,
      });
    });

    // Extract organizations
    doc.organizations().forEach((org: any) => {
      entities.push({
        text: org.text(),
        type: "organization",
        confidence: 0.7,
      });
    });

    return entities;
  }

  /**
   * Calculate readability score (simplified Flesch-Kincaid)
   */
  private calculateReadabilityScore(
    content: string,
    wordCount: number,
    sentenceCount: number
  ): number {
    if (sentenceCount === 0) return 0;

    const syllableCount = this.countSyllables(content);
    const avgSentenceLength = wordCount / sentenceCount;
    const avgSyllablesPerWord = syllableCount / wordCount;

    // Flesch Reading Ease formula
    const score =
      206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;

    // Convert to 0-100 scale where higher is better
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Count syllables in text (approximation)
   */
  private countSyllables(text: string): number {
    return text
      .toLowerCase()
      .replace(/[^a-z]/g, "")
      .replace(/[aeiou]+/g, "a").length;
  }

  /**
   * Count term frequency in content
   */
  private countTermFrequency(term: string, content: string): number {
    const regex = new RegExp(`\\b${term}\\b`, "gi");
    const matches = content.match(regex);
    return matches ? matches.length : 0;
  }

  /**
   * Assess keyword difficulty
   */
  private assessKeywordDifficulty(
    keyword: string,
    competitorUsage: number
  ): "low" | "medium" | "high" {
    const wordCount = keyword.split(" ").length;

    if (wordCount >= 3 && competitorUsage < 5) return "low";
    if (wordCount >= 2 && competitorUsage < 10) return "medium";
    if (competitorUsage >= 20) return "high";

    return "medium";
  }

  /**
   * Calculate keyword priority score
   */
  private calculateKeywordPriority(
    opportunity: number,
    difficulty: string,
    competitorUsage: number
  ): number {
    const difficultyScore =
      difficulty === "low" ? 1 : difficulty === "medium" ? 0.7 : 0.4;
    const usageScore = Math.min(1, competitorUsage / 10); // Normalize usage

    return Math.round(
      opportunity * 0.5 + difficultyScore * 30 + usageScore * 20
    );
  }

  /**
   * Find related terms for a keyword
   */
  private findRelatedTerms(keyword: string, allKeywords: any[]): string[] {
    const relatedTerms: string[] = [];
    const keywordStem = this.stemmer.stem(keyword);

    allKeywords.forEach(k => {
      if (k.term !== keyword) {
        const similarity = this.calculateTermSimilarity(keyword, k.term);
        const stemSimilarity =
          this.stemmer.stem(k.term) === keywordStem ? 1 : 0;

        if (similarity > 0.7 || stemSimilarity === 1) {
          relatedTerms.push(k.term);
        }
      }
    });

    return relatedTerms.slice(0, 5);
  }

  /**
   * Group keywords by topic
   */
  private groupKeywordsByTopic(keywords: any[]): Record<string, any[]> {
    const topics: Record<string, any[]> = {};

    keywords.forEach(keyword => {
      // Simple topic assignment based on first word or semantic category
      const firstWord = keyword.term.split(" ")[0];
      const topic = this.categorizeKeyword(keyword.term);

      if (!topics[topic]) {
        topics[topic] = [];
      }
      topics[topic].push(keyword);
    });

    return topics;
  }

  /**
   * Categorize keyword into topic
   */
  private categorizeKeyword(keyword: string): string {
    // Simple keyword categorization
    if (
      keyword.includes("price") ||
      keyword.includes("cost") ||
      keyword.includes("buy")
    ) {
      return "pricing";
    }
    if (
      keyword.includes("review") ||
      keyword.includes("rating") ||
      keyword.includes("comparison")
    ) {
      return "reviews";
    }
    if (
      keyword.includes("how") ||
      keyword.includes("tutorial") ||
      keyword.includes("guide")
    ) {
      return "tutorials";
    }
    if (
      keyword.includes("best") ||
      keyword.includes("top") ||
      keyword.includes("recommended")
    ) {
      return "recommendations";
    }

    // Default to first word as topic
    return keyword.split(" ")[0] || "general";
  }

  /**
   * Identify content gaps from direct comparison
   */
  private identifyContentGapsFromComparison(
    primaryContent: string,
    comparisonContent: string
  ): string[] {
    const primaryTopics = this.extractTopics(primaryContent);
    const comparisonTopics = this.extractTopics(comparisonContent);

    return comparisonTopics.filter(topic => !primaryTopics.includes(topic));
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i]! * vectorB[i]!;
      normA += vectorA[i]! * vectorA[i]!;
      normB += vectorB[i]! * vectorB[i]!;
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (normA * normB);
  }

  /**
   * Calculate analysis confidence
   */
  private calculateAnalysisConfidence(
    primaryAnalysis: any,
    comparisons: any[]
  ): number {
    let confidence = 50; // Base confidence

    // Boost confidence based on content length
    if (primaryAnalysis.wordCount > 500) confidence += 20;
    if (primaryAnalysis.wordCount > 1000) confidence += 10;

    // Boost confidence based on number of comparisons
    confidence += Math.min(20, comparisons.length * 5);

    // Reduce confidence if similarities are very low (might indicate poor analysis)
    const avgSimilarity =
      comparisons.reduce((sum, comp) => sum + comp.similarity.overall, 0) /
      comparisons.length;
    if (avgSimilarity < 0.1) confidence -= 20;

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Calculate keyword analysis confidence
   */
  private calculateKeywordConfidence(opportunities: any[]): number {
    if (opportunities.length === 0) return 0;

    const avgPriority =
      opportunities.reduce((sum, opp) => sum + opp.priority, 0) /
      opportunities.length;
    return Math.min(100, avgPriority);
  }

  /**
   * Health check for the semantic analysis engine
   */
  async healthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    components: Record<string, boolean>;
    error?: string;
  }> {
    const components: Record<string, boolean> = {};

    try {
      // Test natural library
      const testText = "This is a test sentence for health check.";
      const tfidf = new natural.TfIdf();
      tfidf.addDocument(testText);
      components["natural"] = tfidf.listTerms(0).length > 0;

      // Test compromise library
      const doc = nlp(testText);
      components["nlp"] = doc.wordCount() > 0;

      // Test sentiment analysis
      const sentimentResult = sentiment.analyze(testText);
      components["sentiment"] = typeof sentimentResult.score === "number";

      const healthyComponents =
        Object.values(components).filter(Boolean).length;
      const totalComponents = Object.keys(components).length;

      if (healthyComponents === totalComponents) {
        return { status: "healthy", components };
      } else if (healthyComponents > 0) {
        return { status: "degraded", components };
      } else {
        return {
          status: "unhealthy",
          components,
          error: "All components failed",
        };
      }
    } catch (error) {
      return {
        status: "unhealthy",
        components,
        error: error instanceof Error ? error.message : "Health check failed",
      };
    }
  }
}

// Export singleton instance
export const semanticAnalysisEngine = new SemanticAnalysisEngine();

// Export types
export type {
  ContentAnalysisRequest,
  KeywordOpportunityRequest,
  ContentAnalysisResult,
  KeywordOpportunityResult,
};
