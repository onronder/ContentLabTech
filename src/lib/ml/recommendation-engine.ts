/**
 * Content Recommendation Engine
 * Advanced ML-powered content recommendations using collaborative filtering,
 * content-based filtering, and deep learning embeddings
 */

import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env-helper";
import { z } from "zod";
import { enhancedOpenAIService } from "@/lib/openai-enhanced";

// Recommendation schemas
const recommendationRequestSchema = z.object({
  userId: z.string().uuid().optional(),
  contentId: z.string().uuid().optional(),
  sessionId: z.string(),
  context: z
    .object({
      currentTopic: z.string().optional(),
      readingHistory: z.array(z.string()).optional(),
      preferences: z.record(z.number()).optional(),
      timeOfDay: z.number().min(0).max(23).optional(),
      device: z.enum(["mobile", "tablet", "desktop"]).optional(),
      location: z.string().optional(),
    })
    .optional(),
  count: z.number().min(1).max(50).default(10),
  algorithm: z
    .enum([
      "collaborative",
      "content_based",
      "hybrid",
      "trending",
      "personalized_ai",
      "similarity_based",
    ])
    .default("hybrid"),
});

const recommendationResultSchema = z.object({
  contentId: z.string().uuid(),
  score: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  algorithm: z.string(),
  metadata: z.object({
    contentType: z.string(),
    estimatedReadTime: z.number(),
    difficultyLevel: z.enum(["beginner", "intermediate", "advanced"]),
    topics: z.array(z.string()),
    publishedDate: z.string().datetime(),
    authorId: z.string().optional(),
    engagement: z.object({
      views: z.number(),
      shares: z.number(),
      comments: z.number(),
      avgRating: z.number().optional(),
    }),
  }),
});

const userProfileSchema = z.object({
  userId: z.string().uuid(),
  preferences: z.object({
    topics: z.record(z.number()), // topic -> affinity score
    contentTypes: z.record(z.number()),
    authors: z.record(z.number()),
    readingTime: z.object({
      preferred: z.number(), // minutes
      tolerance: z.number(),
    }),
    difficultyLevel: z.enum(["beginner", "intermediate", "advanced"]),
    freshness: z.number().min(0).max(1), // preference for recent content
  }),
  behavior: z.object({
    avgSessionDuration: z.number(),
    readingSpeed: z.number(), // words per minute
    engagementPatterns: z.record(z.number()),
    peakActivity: z.array(z.number()), // hours of day
    devicePreference: z.string(),
  }),
  embeddings: z.object({
    contentEmbedding: z.array(z.number()).length(1536),
    topicEmbedding: z.array(z.number()).length(512),
    lastUpdated: z.string().datetime(),
  }),
});

type RecommendationRequest = z.infer<typeof recommendationRequestSchema>;
type RecommendationResult = z.infer<typeof recommendationResultSchema>;
type UserProfile = z.infer<typeof userProfileSchema>;

interface ContentEmbedding {
  contentId: string;
  embedding: number[];
  metadata: any;
  lastUpdated: Date;
}

export class RecommendationEngine {
  private supabase: ReturnType<typeof createClient>;
  private userProfiles: Map<string, UserProfile> = new Map();
  private contentEmbeddings: Map<string, ContentEmbedding> = new Map();
  private collaborativeMatrix: Map<string, Map<string, number>> = new Map();
  private trendingCache: Map<string, any> = new Map();

  constructor() {
    const env = getSupabaseEnv();
    this.supabase = createClient(env.url, env.serviceRoleKey);

    this.initializeRecommendationSystem();
  }

  /**
   * Get personalized content recommendations
   */
  async getRecommendations(
    projectId: string,
    request: RecommendationRequest
  ): Promise<RecommendationResult[]> {
    const validatedRequest = recommendationRequestSchema.parse(request);

    // Get or build user profile
    const userProfile = validatedRequest.userId
      ? (await this.getUserProfile(validatedRequest.userId)) ||
        (await this.createUserProfile(validatedRequest.userId))
      : await this.buildAnonymousProfile(
          validatedRequest.sessionId,
          validatedRequest.context
        );

    // Run different recommendation algorithms
    const algorithms = this.getAlgorithmsToRun(validatedRequest.algorithm);
    const recommendations = await Promise.all(
      algorithms.map(algo =>
        this.runAlgorithm(algo, projectId, validatedRequest, userProfile)
      )
    );

    // Merge and rank recommendations
    const mergedResults = this.mergeRecommendations(
      recommendations,
      validatedRequest.algorithm
    );

    // Apply diversity and freshness filters
    const diverseResults = this.applyDiversityFilters(
      mergedResults,
      userProfile
    );

    // Apply context-based adjustments
    const contextualResults = this.applyContextualAdjustments(
      diverseResults,
      validatedRequest.context
    );

    // Limit to requested count
    const finalResults = contextualResults.slice(0, validatedRequest.count);

    // Track recommendations for learning
    await this.trackRecommendations(projectId, validatedRequest, finalResults);

    return finalResults.map(result => recommendationResultSchema.parse(result));
  }

  /**
   * Get content-to-content similarities (for "more like this")
   */
  async getSimilarContent(
    contentId: string,
    count = 5
  ): Promise<RecommendationResult[]> {
    const contentEmbedding = await this.getContentEmbedding(contentId);
    if (!contentEmbedding) {
      throw new Error("Content embedding not found");
    }

    // Find similar content using cosine similarity
    const similarities = await this.calculateContentSimilarities(
      contentEmbedding,
      count * 3 // Get more for filtering
    );

    // Filter and enrich results
    const enrichedResults = await Promise.all(
      similarities.slice(0, count).map(async sim => {
        const metadata = await this.getContentMetadata(sim.contentId);
        return {
          contentId: sim.contentId,
          score: sim.similarity,
          confidence: 0.85,
          reasoning: `${(sim.similarity * 100).toFixed(1)}% content similarity`,
          algorithm: "similarity_based",
          metadata,
        };
      })
    );

    return enrichedResults;
  }

  /**
   * Update user profile based on interaction
   */
  async updateUserProfile(
    userId: string,
    interaction: {
      contentId: string;
      action: "view" | "like" | "share" | "bookmark" | "complete";
      duration?: number;
      rating?: number;
      context?: any;
    }
  ): Promise<void> {
    const profile =
      (await this.getUserProfile(userId)) ||
      (await this.createUserProfile(userId));

    // Update preferences based on interaction
    const contentMetadata = await this.getContentMetadata(
      interaction.contentId
    );

    // Update topic preferences
    for (const topic of contentMetadata.topics) {
      const current = profile.preferences.topics[topic] || 0;
      const boost = this.getInteractionBoost(
        interaction.action,
        interaction.rating
      );
      profile.preferences.topics[topic] = Math.min(1, current + boost * 0.1);
    }

    // Update content type preferences
    const contentType = contentMetadata.contentType;
    const currentType = profile.preferences.contentTypes[contentType] || 0;
    const typeBoost = this.getInteractionBoost(
      interaction.action,
      interaction.rating
    );
    profile.preferences.contentTypes[contentType] = Math.min(
      1,
      currentType + typeBoost * 0.1
    );

    // Update behavioral patterns
    if (interaction.duration) {
      profile.behavior.avgSessionDuration =
        profile.behavior.avgSessionDuration * 0.9 + interaction.duration * 0.1;
    }

    // Update embeddings
    await this.updateUserEmbeddings(
      userId,
      interaction.contentId,
      interaction.action
    );

    // Store updated profile
    await this.storeUserProfile(userId, profile);
    this.userProfiles.set(userId, profile);
  }

  /**
   * Initialize the recommendation system
   */
  private async initializeRecommendationSystem(): Promise<void> {
    // Load content embeddings
    await this.loadContentEmbeddings();

    // Build collaborative filtering matrix
    await this.buildCollaborativeMatrix();

    // Initialize trending cache
    await this.updateTrendingCache();

    console.log("Recommendation engine initialized");
  }

  /**
   * Run collaborative filtering algorithm
   */
  private async runCollaborativeFiltering(
    projectId: string,
    request: RecommendationRequest,
    userProfile: UserProfile
  ): Promise<any[]> {
    if (!request.userId) return [];

    // Find similar users
    const similarUsers = await this.findSimilarUsers(request.userId, 50);

    // Get their preferences
    const recommendations = new Map<string, { score: number; count: number }>();

    for (const { userId: similarUserId, similarity } of similarUsers) {
      const userInteractions = this.collaborativeMatrix.get(similarUserId);
      if (!userInteractions) continue;

      for (const [contentId, rating] of Array.from(
        userInteractions.entries()
      )) {
        if (rating > 0.6) {
          // Only consider positive interactions
          const current = recommendations.get(contentId) || {
            score: 0,
            count: 0,
          };
          recommendations.set(contentId, {
            score: current.score + rating * similarity,
            count: current.count + 1,
          });
        }
      }
    }

    // Convert to results
    const results = Array.from(recommendations.entries())
      .map(([contentId, data]) => ({
        contentId,
        score: data.score / data.count,
        confidence: Math.min(data.count / 10, 0.9),
        reasoning: `Recommended by ${data.count} similar users`,
        algorithm: "collaborative",
      }))
      .sort((a, b) => b.score - a.score);

    return results;
  }

  /**
   * Run content-based filtering algorithm
   */
  private async runContentBasedFiltering(
    projectId: string,
    request: RecommendationRequest,
    userProfile: UserProfile
  ): Promise<any[]> {
    const { data: allContent } = await this.supabase
      .from("content_items")
      .select("id, title, focus_keywords, content_type, created_at")
      .eq("project_id", projectId)
      .eq("status", "published")
      .limit(500);

    if (!allContent) return [];

    const recommendations = await Promise.all(
      allContent.map(async content => {
        const score = await this.calculateContentBasedScore(
          content,
          userProfile
        );
        return {
          contentId: content.id,
          score,
          confidence: 0.8,
          reasoning: "Based on your content preferences and reading history",
          algorithm: "content_based",
        };
      })
    );

    return recommendations
      .filter(r => r.score > 0.3)
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Run AI-powered personalized recommendations
   */
  private async runPersonalizedAI(
    projectId: string,
    request: RecommendationRequest,
    userProfile: UserProfile
  ): Promise<any[]> {
    // Get user's recent interactions
    const recentInteractions = await this.getUserRecentInteractions(
      request.userId || request.sessionId,
      50
    );

    // Get available content
    const { data: availableContent } = await this.supabase
      .from("content_items")
      .select("id, title, focus_keywords, content_type, meta_description")
      .eq("project_id", projectId)
      .eq("status", "published")
      .limit(200);

    if (!availableContent) return [];

    // Use OpenAI to generate personalized recommendations
    const response = await enhancedOpenAIService.chatCompletion({
      messages: [
        {
          role: "system",
          content: `You are an advanced content recommendation AI. Analyze user preferences and behavior to recommend the most relevant content.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            userProfile: {
              topicPreferences: userProfile.preferences.topics,
              contentTypePreferences: userProfile.preferences.contentTypes,
              readingTime: userProfile.preferences.readingTime,
              difficultyLevel: userProfile.preferences.difficultyLevel,
            },
            recentInteractions: recentInteractions.slice(0, 10),
            availableContent: availableContent.slice(0, 50),
            context: request.context,
            requestedCount: request.count,
          }),
        },
      ],
      model: "gpt-4o-mini",
      temperature: 0.3,
      responseFormat: { type: "json_object" },
    });

    if (response.success && response.data) {
      const aiRecommendations = JSON.parse(response.data.content);
      return (
        aiRecommendations.recommendations?.map((rec: any) => ({
          contentId: rec.contentId,
          score: rec.score || 0.7,
          confidence: rec.confidence || 0.8,
          reasoning: rec.reasoning || "AI-powered personalized recommendation",
          algorithm: "personalized_ai",
        })) || []
      );
    }

    return [];
  }

  /**
   * Run trending content algorithm
   */
  private async runTrendingAlgorithm(
    projectId: string,
    request: RecommendationRequest,
    userProfile: UserProfile
  ): Promise<any[]> {
    const trendingContent = this.trendingCache.get(projectId);
    if (!trendingContent) return [];

    // Apply user preferences to trending content
    const personalizedTrending = trendingContent
      .map((item: any) => {
        const personalizedScore = this.applyPersonalizedWeights(
          item,
          userProfile
        );
        return {
          contentId: item.contentId,
          score: personalizedScore,
          confidence: 0.75,
          reasoning: `Trending content personalized for your interests`,
          algorithm: "trending",
        };
      })
      .sort((a: any, b: any) => b.score - a.score);

    return personalizedTrending.slice(0, request.count);
  }

  /**
   * Calculate content-based score for a piece of content
   */
  private async calculateContentBasedScore(
    content: any,
    userProfile: UserProfile
  ): Promise<number> {
    let score = 0;

    // Topic affinity
    const contentTopics = content.focus_keywords || [];
    for (const topic of contentTopics) {
      const affinity = userProfile.preferences.topics[topic] || 0;
      score += affinity * 0.4;
    }

    // Content type preference
    const typePreference =
      userProfile.preferences.contentTypes[content.content_type] || 0.5;
    score += typePreference * 0.3;

    // Freshness preference
    const age = Math.floor(
      (Date.now() - new Date(content.created_at).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const freshnessScore =
      Math.exp(-age / 30) * userProfile.preferences.freshness;
    score += freshnessScore * 0.3;

    return Math.min(score, 1);
  }

  /**
   * Find users similar to the given user
   */
  private async findSimilarUsers(
    userId: string,
    limit: number
  ): Promise<Array<{ userId: string; similarity: number }>> {
    const userInteractions = this.collaborativeMatrix.get(userId);
    if (!userInteractions) return [];

    const similarities = new Map<string, number>();

    // Calculate cosine similarity with other users
    for (const [otherUserId, otherInteractions] of Array.from(
      this.collaborativeMatrix.entries()
    )) {
      if (otherUserId === userId) continue;

      const similarity = this.calculateCosineSimilarity(
        Array.from(userInteractions.values()),
        Array.from(otherInteractions.values())
      );

      if (similarity > 0.1) {
        similarities.set(otherUserId, similarity);
      }
    }

    return Array.from(similarities.entries())
      .map(([userId, similarity]) => ({ userId, similarity }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private calculateCosineSimilarity(
    vectorA: number[],
    vectorB: number[]
  ): number {
    const dotProduct = vectorA.reduce(
      (sum, a, i) => sum + a * (vectorB[i] || 0),
      0
    );
    const magnitudeA = Math.sqrt(vectorA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vectorB.reduce((sum, b) => sum + b * b, 0));

    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Merge recommendations from multiple algorithms
   */
  private mergeRecommendations(
    recommendations: any[][],
    primaryAlgorithm: string
  ): any[] {
    const merged = new Map<string, any>();
    const weights = this.getAlgorithmWeights(primaryAlgorithm);

    recommendations.forEach((recs, algorithmIndex) => {
      const weight = weights[algorithmIndex] || 0.2;

      recs.forEach(rec => {
        const existing = merged.get(rec.contentId);
        if (existing) {
          existing.score = (existing.score + rec.score * weight) / 2;
          existing.confidence = Math.max(existing.confidence, rec.confidence);
          existing.reasoning += ` + ${rec.reasoning}`;
        } else {
          merged.set(rec.contentId, {
            ...rec,
            score: rec.score * weight,
          });
        }
      });
    });

    return Array.from(merged.values()).sort((a, b) => b.score - a.score);
  }

  /**
   * Apply diversity filters to avoid echo chambers
   */
  private applyDiversityFilters(
    recommendations: any[],
    userProfile: UserProfile
  ): any[] {
    const diversified = [];
    const seenTopics = new Set<string>();
    const seenTypes = new Set<string>();

    for (const rec of recommendations) {
      const metadata = rec.metadata;
      if (!metadata) continue;

      // Ensure topic diversity
      const newTopics = metadata.topics.filter(
        (t: string) => !seenTopics.has(t)
      );
      if (newTopics.length === 0 && seenTopics.size > 3) continue;

      // Ensure content type diversity
      if (seenTypes.has(metadata.contentType) && seenTypes.size > 2) {
        if (Math.random() > 0.7) continue; // 30% chance to include
      }

      diversified.push(rec);
      metadata.topics.forEach((t: string) => seenTopics.add(t));
      seenTypes.add(metadata.contentType);

      if (diversified.length >= recommendations.length * 0.8) break;
    }

    return diversified;
  }

  /**
   * Apply contextual adjustments based on time, device, etc.
   */
  private applyContextualAdjustments(
    recommendations: any[],
    context?: any
  ): any[] {
    if (!context) return recommendations;

    return recommendations.map(rec => {
      let adjustedScore = rec.score;

      // Time of day adjustments
      if (context.timeOfDay !== undefined) {
        const metadata = rec.metadata;
        if (metadata?.estimatedReadTime) {
          // Shorter content for late hours
          if (context.timeOfDay > 22 || context.timeOfDay < 6) {
            if (metadata.estimatedReadTime < 5) {
              adjustedScore *= 1.2;
            } else if (metadata.estimatedReadTime > 15) {
              adjustedScore *= 0.8;
            }
          }
        }
      }

      // Device adjustments
      if (context.device === "mobile") {
        const metadata = rec.metadata;
        if (metadata?.estimatedReadTime && metadata.estimatedReadTime < 8) {
          adjustedScore *= 1.15; // Boost shorter content on mobile
        }
      }

      return {
        ...rec,
        score: Math.min(adjustedScore, 1),
      };
    });
  }

  /**
   * Load content embeddings from database
   */
  private async loadContentEmbeddings(): Promise<void> {
    const { data: embeddings } = await this.supabase
      .from("content_embeddings")
      .select("content_id, embedding, metadata, updated_at")
      .limit(10000);

    if (embeddings) {
      for (const embedding of embeddings) {
        this.contentEmbeddings.set(String(embedding.content_id), {
          contentId: String(embedding.content_id),
          embedding: embedding.embedding as number[],
          metadata: embedding.metadata as any,
          lastUpdated: new Date(String(embedding.updated_at)),
        });
      }
    }
  }

  /**
   * Build collaborative filtering matrix
   */
  private async buildCollaborativeMatrix(): Promise<void> {
    const { data: interactions } = await this.supabase
      .from("user_content_interactions")
      .select("user_id, content_id, interaction_type, rating, duration")
      .limit(100000);

    if (!interactions) return;

    for (const interaction of interactions) {
      if (!this.collaborativeMatrix.has(interaction.user_id as string)) {
        this.collaborativeMatrix.set(interaction.user_id as string, new Map());
      }

      const userMap = this.collaborativeMatrix.get(
        interaction.user_id as string
      )!;
      const score = this.calculateInteractionScore(interaction);
      userMap.set(interaction.content_id as string, score);
    }
  }

  /**
   * Update trending content cache
   */
  private async updateTrendingCache(): Promise<void> {
    const { data: trending } = await this.supabase
      .from("content_analytics")
      .select(
        `
        content_id,
        pageviews,
        unique_visitors,
        avg_session_duration,
        created_at,
        content_items!inner (
          project_id,
          focus_keywords,
          content_type
        )
      `
      )
      .gte(
        "created_at",
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      )
      .order("pageviews", { ascending: false })
      .limit(1000);

    if (!trending) return;

    // Group by project
    const projectTrending = new Map<string, any[]>();

    for (const item of trending) {
      const projectId = (item.content_items as any)?.project_id as string;
      if (!projectTrending.has(projectId)) {
        projectTrending.set(projectId, []);
      }

      const trendScore = this.calculateTrendingScore(item);
      projectTrending.get(projectId)!.push({
        contentId: item.content_id,
        trendScore,
        pageviews: item.pageviews,
        engagement: item.avg_session_duration,
      });
    }

    // Sort and cache
    for (const [projectId, items] of Array.from(projectTrending.entries())) {
      const sorted = items.sort((a, b) => b.trendScore - a.trendScore);
      this.trendingCache.set(projectId, sorted.slice(0, 50));
    }
  }

  // Helper methods
  private getAlgorithmsToRun(algorithm: string): string[] {
    switch (algorithm) {
      case "hybrid":
        return [
          "collaborative",
          "content_based",
          "personalized_ai",
          "trending",
        ];
      case "collaborative":
        return ["collaborative"];
      case "content_based":
        return ["content_based"];
      case "personalized_ai":
        return ["personalized_ai"];
      case "trending":
        return ["trending"];
      case "similarity_based":
        return ["similarity_based"];
      default:
        return ["hybrid"];
    }
  }

  private async runAlgorithm(
    algorithm: string,
    projectId: string,
    request: RecommendationRequest,
    userProfile: UserProfile
  ): Promise<any[]> {
    switch (algorithm) {
      case "collaborative":
        return this.runCollaborativeFiltering(projectId, request, userProfile);
      case "content_based":
        return this.runContentBasedFiltering(projectId, request, userProfile);
      case "personalized_ai":
        return this.runPersonalizedAI(projectId, request, userProfile);
      case "trending":
        return this.runTrendingAlgorithm(projectId, request, userProfile);
      default:
        return [];
    }
  }

  private getAlgorithmWeights(primaryAlgorithm: string): number[] {
    const weights: Record<string, number[]> = {
      hybrid: [0.3, 0.3, 0.25, 0.15], // collaborative, content, AI, trending
      collaborative: [1.0],
      content_based: [1.0],
      personalized_ai: [1.0],
      trending: [1.0],
    };

    return weights[primaryAlgorithm] || [0.25, 0.25, 0.25, 0.25];
  }

  private calculateInteractionScore(interaction: any): number {
    let score = 0;

    switch (interaction.interaction_type) {
      case "view":
        score = 0.1;
        break;
      case "like":
        score = 0.5;
        break;
      case "share":
        score = 0.8;
        break;
      case "bookmark":
        score = 0.9;
        break;
      case "complete":
        score = 1.0;
        break;
    }

    // Adjust for rating if available
    if (interaction.rating) {
      score *= interaction.rating / 5;
    }

    // Adjust for duration if available
    if (interaction.duration && interaction.duration > 30) {
      score *= Math.min(interaction.duration / 300, 2); // Cap at 2x boost
    }

    return Math.min(score, 1);
  }

  private calculateTrendingScore(item: any): number {
    const recency = Math.exp(
      -(Date.now() - new Date(item.created_at).getTime()) /
        (1000 * 60 * 60 * 24 * 3)
    );
    const engagement = Math.log(item.pageviews + 1) / 10;
    const quality = Math.min(item.avg_session_duration / 180, 1);

    return recency * 0.4 + engagement * 0.4 + quality * 0.2;
  }

  private async getUserProfile(userId: string): Promise<UserProfile | null> {
    if (this.userProfiles.has(userId)) {
      return this.userProfiles.get(userId)!;
    }

    const { data } = await this.supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    return data ? userProfileSchema.parse(data) : null;
  }

  private async buildAnonymousProfile(
    sessionId: string,
    context?: any
  ): Promise<UserProfile> {
    // Build basic profile from context
    return {
      userId: sessionId,
      preferences: {
        topics: {},
        contentTypes: {},
        authors: {},
        readingTime: { preferred: 10, tolerance: 5 },
        difficultyLevel: "intermediate",
        freshness: 0.7,
      },
      behavior: {
        avgSessionDuration: 300,
        readingSpeed: 200,
        engagementPatterns: {},
        peakActivity: [9, 10, 11, 14, 15, 16],
        devicePreference: context?.device || "desktop",
      },
      embeddings: {
        contentEmbedding: Array(1536).fill(0),
        topicEmbedding: Array(512).fill(0),
        lastUpdated: new Date().toISOString(),
      },
    };
  }

  private getInteractionBoost(action: string, rating?: number): number {
    const boosts: Record<string, number> = {
      view: 0.1,
      like: 0.3,
      share: 0.5,
      bookmark: 0.7,
      complete: 1.0,
    };

    let boost = boosts[action] || 0.1;
    if (rating) {
      boost *= rating / 5;
    }

    return boost;
  }

  private async getContentEmbedding(
    contentId: string
  ): Promise<ContentEmbedding | null> {
    return this.contentEmbeddings.get(contentId) || null;
  }

  private async calculateContentSimilarities(
    targetEmbedding: ContentEmbedding,
    count: number
  ): Promise<Array<{ contentId: string; similarity: number }>> {
    const similarities = [];

    for (const [contentId, embedding] of Array.from(
      this.contentEmbeddings.entries()
    )) {
      if (contentId === targetEmbedding.contentId) continue;

      const similarity = this.calculateCosineSimilarity(
        targetEmbedding.embedding,
        embedding.embedding
      );

      similarities.push({ contentId, similarity });
    }

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, count);
  }

  private async getContentMetadata(contentId: string): Promise<any> {
    const { data } = await this.supabase
      .from("content_items")
      .select(
        `
        id,
        title,
        content_type,
        word_count,
        readability_score,
        focus_keywords,
        published_at,
        author_id,
        content_analytics (
          pageviews,
          unique_visitors,
          avg_session_duration
        )
      `
      )
      .eq("id", contentId)
      .single();

    if (!data) return {};

    return {
      contentType: data.content_type as string,
      estimatedReadTime: Math.ceil(((data.word_count as number) || 800) / 200),
      difficultyLevel:
        (data.readability_score as number) > 70
          ? "beginner"
          : (data.readability_score as number) > 50
            ? "intermediate"
            : "advanced",
      topics: (data.focus_keywords as string[]) || [],
      publishedDate: data.published_at as string,
      authorId: data.author_id as string,
      engagement: {
        views: 0, // Simplified - would get from analytics
        shares: 0, // Would need social sharing data
        comments: 0, // Would need comments data
        avgRating: undefined,
      },
    };
  }

  private async trackRecommendations(
    projectId: string,
    request: RecommendationRequest,
    results: RecommendationResult[]
  ): Promise<void> {
    const { error } = await this.supabase.from("recommendation_logs").insert({
      project_id: projectId,
      user_id: request.userId,
      session_id: request.sessionId,
      algorithm: request.algorithm,
      request_context: request.context,
      recommended_content: results.map(r => r.contentId),
      recommendation_scores: results.map(r => r.score),
      timestamp: new Date().toISOString(),
    });

    if (error) {
      console.error("Failed to track recommendations:", error);
    }
  }

  private async getUserRecentInteractions(
    userIdOrSession: string,
    limit: number
  ): Promise<any[]> {
    const { data } = await this.supabase
      .from("user_content_interactions")
      .select("content_id, interaction_type, rating, created_at")
      .or(`user_id.eq.${userIdOrSession},session_id.eq.${userIdOrSession}`)
      .order("created_at", { ascending: false })
      .limit(limit);

    return data || [];
  }

  private applyPersonalizedWeights(
    item: any,
    userProfile: UserProfile
  ): number {
    // Apply user preferences to trending score
    let score = item.trendScore;

    // Adjust based on user preferences (would need content metadata)
    score *= 0.7 + userProfile.preferences.freshness * 0.3;

    return score;
  }

  private async createUserProfile(userId: string): Promise<UserProfile> {
    const profile: UserProfile = {
      userId,
      preferences: {
        topics: {},
        contentTypes: {},
        authors: {},
        readingTime: { preferred: 10, tolerance: 5 },
        difficultyLevel: "intermediate",
        freshness: 0.7,
      },
      behavior: {
        avgSessionDuration: 300,
        readingSpeed: 200,
        engagementPatterns: {},
        peakActivity: [9, 10, 11, 14, 15, 16],
        devicePreference: "desktop",
      },
      embeddings: {
        contentEmbedding: Array(1536).fill(0),
        topicEmbedding: Array(512).fill(0),
        lastUpdated: new Date().toISOString(),
      },
    };

    await this.storeUserProfile(userId, profile);
    return profile;
  }

  private async storeUserProfile(
    userId: string,
    profile: UserProfile
  ): Promise<void> {
    const { error } = await this.supabase.from("user_profiles").upsert({
      user_id: userId,
      preferences: profile.preferences,
      behavior: profile.behavior,
      embeddings: profile.embeddings,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Failed to store user profile:", error);
    }
  }

  private async updateUserEmbeddings(
    userId: string,
    contentId: string,
    action: string
  ): Promise<void> {
    // Simplified embedding update - in production would use proper vector operations
    console.log(
      `Updating embeddings for user ${userId} based on ${action} on ${contentId}`
    );
  }

  /**
   * Get recommendation performance analytics
   */
  async getRecommendationAnalytics(
    projectId: string,
    timeframe = 30
  ): Promise<any> {
    const startDate = new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000);

    const { data: logs } = await this.supabase
      .from("recommendation_logs")
      .select(
        `
        *,
        recommendation_clicks (
          content_id,
          clicked_at,
          conversion
        )
      `
      )
      .eq("project_id", projectId)
      .gte("timestamp", startDate.toISOString());

    if (!logs) return {};

    // Calculate metrics
    const totalRecommendations = logs.length;
    const totalClicks = logs.reduce(
      (sum, log) => sum + (log.recommendation_clicks?.length || 0),
      0
    );
    const clickThroughRate = totalClicks / totalRecommendations;

    // Algorithm performance
    const algorithmPerformance = new Map();
    for (const log of logs) {
      const algo = log.algorithm;
      const current = algorithmPerformance.get(algo) || { recs: 0, clicks: 0 };
      current.recs++;
      current.clicks += log.recommendation_clicks?.length || 0;
      algorithmPerformance.set(algo, current);
    }

    return {
      totalRecommendations,
      totalClicks,
      clickThroughRate,
      algorithmPerformance: Array.from(algorithmPerformance.entries()).map(
        ([algo, stats]) => ({
          algorithm: algo,
          recommendations: stats.recs,
          clicks: stats.clicks,
          ctr: stats.clicks / stats.recs,
        })
      ),
    };
  }
}

// Export singleton instance
export const recommendationEngine = new RecommendationEngine();
