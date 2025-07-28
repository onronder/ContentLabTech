/**
 * Content Performance Predictor
 * Advanced ML model for predicting content engagement and performance
 */

import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env-helper";
import { z } from "zod";
import { enhancedOpenAIService } from "@/lib/openai-enhanced";
import { dataValidationService } from "@/lib/analytics/data-validation";

// Feature extraction schema
const contentFeaturesSchema = z.object({
  // Semantic features
  semanticEmbedding: z.array(z.number()).length(1536), // OpenAI embedding dimension
  topicRelevance: z.number().min(0).max(1),
  readabilityScore: z.number().min(0).max(100),
  sentimentScore: z.number().min(-1).max(1),
  emotionalTone: z.object({
    joy: z.number().min(0).max(1),
    trust: z.number().min(0).max(1),
    fear: z.number().min(0).max(1),
    surprise: z.number().min(0).max(1),
    sadness: z.number().min(0).max(1),
    disgust: z.number().min(0).max(1),
    anger: z.number().min(0).max(1),
    anticipation: z.number().min(0).max(1),
  }),

  // Structural features
  contentLength: z.number().positive(),
  paragraphCount: z.number().positive(),
  averageSentenceLength: z.number().positive(),
  headingStructure: z.object({
    h1Count: z.number().min(0),
    h2Count: z.number().min(0),
    h3Count: z.number().min(0),
    hierarchyScore: z.number().min(0).max(1),
  }),

  // SEO features
  keywordDensity: z.number().min(0).max(100),
  keywordInTitle: z.boolean(),
  keywordInMeta: z.boolean(),
  titleLength: z.number().positive(),
  metaDescriptionLength: z.number().positive(),
  urlOptimizationScore: z.number().min(0).max(1),

  // Visual features
  imageCount: z.number().min(0),
  videoCount: z.number().min(0),
  imageTextRatio: z.number().min(0).max(1),
  hasInfographics: z.boolean(),

  // Temporal features
  publishHour: z.number().min(0).max(23),
  publishDayOfWeek: z.number().min(0).max(6),
  publishMonth: z.number().min(1).max(12),
  contentAge: z.number().min(0), // days since publish
  updateFrequency: z.number().min(0), // updates per month

  // Competitive features
  competitiveDensity: z.number().min(0).max(1),
  uniquenessScore: z.number().min(0).max(1),
  marketSaturation: z.number().min(0).max(1),

  // Historical performance
  historicalEngagement: z.number().min(0),
  historicalConversion: z.number().min(0).max(100),
  historicalBounceRate: z.number().min(0).max(100),
  trendingScore: z.number().min(0).max(1),
});

const performancePredictionSchema = z.object({
  predictedEngagement: z.number().min(0),
  predictedPageviews: z.number().min(0),
  predictedTimeOnPage: z.number().min(0),
  predictedBounceRate: z.number().min(0).max(100),
  predictedConversionRate: z.number().min(0).max(100),
  predictedSocialShares: z.number().min(0),
  confidenceInterval: z.object({
    lower: z.number(),
    upper: z.number(),
  }),
  driverAnalysis: z.array(
    z.object({
      feature: z.string(),
      impact: z.number(),
      direction: z.enum(["positive", "negative"]),
    })
  ),
});

type ContentFeatures = z.infer<typeof contentFeaturesSchema>;
type PerformancePrediction = z.infer<typeof performancePredictionSchema>;

export class ContentPerformancePredictor {
  private supabase: ReturnType<typeof createClient>;
  private modelVersion = "v1.0.0";
  private modelCache = new Map<string, any>();

  constructor() {
    const env = getSupabaseEnv();
    this.supabase = createClient(env.url, env.serviceRoleKey);
  }

  /**
   * Extract features from content for ML processing
   */
  async extractFeatures(contentId: string): Promise<ContentFeatures> {
    // Fetch content data
    const { data: content, error } = await this.supabase
      .from("content_items")
      .select(
        `
        *,
        content_analytics (
          pageviews,
          unique_visitors,
          bounce_rate,
          avg_session_duration,
          conversions,
          conversion_rate
        ),
        projects!inner (
          target_keywords
        )
      `
      )
      .eq("id", contentId)
      .single();

    if (error || !content) {
      throw new Error(`Failed to fetch content: ${error?.message}`);
    }

    // Generate semantic embedding
    const contentText =
      typeof content.content === "string"
        ? content.content
        : JSON.stringify(content.content || "");
    const embedding = await this.generateEmbedding(contentText);

    // Calculate temporal features
    const publishDateStr = content.published_at || content.created_at;
    const publishDate = new Date(String(publishDateStr));
    const contentAge = Math.floor(
      (Date.now() - publishDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate structural features
    const structuralFeatures = this.analyzeStructure(contentText);
    const seoFeatures = this.analyzeSEO(
      content,
      Array.isArray(content.focus_keywords) ? content.focus_keywords : []
    );

    // Calculate historical performance
    const historicalPerf = this.calculateHistoricalPerformance(
      Array.isArray(content.content_analytics) ? content.content_analytics : []
    );

    // Get competitive context
    const competitiveContext = await this.getCompetitiveContext(
      String(content.project_id),
      Array.isArray(content.focus_keywords) ? content.focus_keywords : []
    );

    return contentFeaturesSchema.parse({
      // Semantic features
      semanticEmbedding: embedding,
      topicRelevance: await this.calculateTopicRelevance(content),
      readabilityScore: content.readability_score || 70,
      sentimentScore: await this.analyzeSentiment(contentText),
      emotionalTone: await this.analyzeEmotionalTone(contentText),

      // Structural features
      contentLength: content.word_count || 0,
      paragraphCount: structuralFeatures.paragraphCount,
      averageSentenceLength: structuralFeatures.avgSentenceLength,
      headingStructure: structuralFeatures.headings,

      // SEO features
      keywordDensity: seoFeatures.keywordDensity,
      keywordInTitle: seoFeatures.keywordInTitle,
      keywordInMeta: seoFeatures.keywordInMeta,
      titleLength: content.meta_title?.length || content.title.length,
      metaDescriptionLength: content.meta_description?.length || 0,
      urlOptimizationScore: seoFeatures.urlScore,

      // Visual features
      imageCount: structuralFeatures.imageCount,
      videoCount: structuralFeatures.videoCount,
      imageTextRatio: structuralFeatures.imageTextRatio,
      hasInfographics: structuralFeatures.hasInfographics,

      // Temporal features
      publishHour: publishDate.getHours(),
      publishDayOfWeek: publishDate.getDay(),
      publishMonth: publishDate.getMonth() + 1,
      contentAge,
      updateFrequency: await this.calculateUpdateFrequency(contentId),

      // Competitive features
      competitiveDensity: competitiveContext.density,
      uniquenessScore: competitiveContext.uniqueness,
      marketSaturation: competitiveContext.saturation,

      // Historical performance
      historicalEngagement: historicalPerf.engagement,
      historicalConversion: historicalPerf.conversion,
      historicalBounceRate: historicalPerf.bounceRate,
      trendingScore: await this.calculateTrendingScore(
        content.focus_keywords || []
      ),
    });
  }

  /**
   * Predict content performance using advanced ML
   */
  async predictPerformance(
    contentId: string,
    timeframe = 30 // days
  ): Promise<PerformancePrediction> {
    const features = await this.extractFeatures(contentId);

    // Use ensemble of models for prediction
    const predictions = await Promise.all([
      this.neuralNetworkPredict(features, timeframe),
      this.gradientBoostingPredict(features, timeframe),
      this.randomForestPredict(features, timeframe),
    ]);

    // Ensemble averaging with confidence weighting
    const ensemblePrediction = this.ensemblePredict(predictions);

    // Driver analysis
    const driverAnalysis = await this.performDriverAnalysis(
      features,
      ensemblePrediction
    );

    // Store prediction for evaluation
    await this.storePrediction(contentId, ensemblePrediction, timeframe);

    return performancePredictionSchema.parse({
      ...ensemblePrediction,
      driverAnalysis,
    });
  }

  /**
   * Neural network prediction using OpenAI
   */
  private async neuralNetworkPredict(
    features: ContentFeatures,
    timeframe: number
  ): Promise<any> {
    const response = await enhancedOpenAIService.chatCompletion({
      messages: [
        {
          role: "system",
          content: `You are an advanced content performance prediction model. Analyze the features and predict performance metrics for the next ${timeframe} days. Return a JSON object with predictions.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            features: this.serializeFeatures(features),
            timeframe,
            historicalContext: {
              averageEngagement: features.historicalEngagement,
              conversionRate: features.historicalConversion,
            },
          }),
        },
      ],
      model: "gpt-4o-mini",
      temperature: 0.3,
      responseFormat: { type: "json_object" },
    });

    if (response.success && response.data) {
      return JSON.parse(response.data.content);
    }

    throw new Error("Neural network prediction failed");
  }

  /**
   * Gradient boosting prediction (simulated)
   */
  private async gradientBoostingPredict(
    features: ContentFeatures,
    timeframe: number
  ): Promise<any> {
    // In production, this would use a real gradient boosting model
    // For now, we'll use feature-based heuristics

    const baseEngagement = features.historicalEngagement || 1000;
    const qualityMultiplier =
      (features.readabilityScore / 100) *
      features.topicRelevance *
      (1 - features.competitiveDensity);

    const temporalBoost = this.getTemporalBoost(features);
    const seoBoost = this.getSEOBoost(features);

    const predictedEngagement =
      baseEngagement * qualityMultiplier * temporalBoost * seoBoost;
    const predictedPageviews = predictedEngagement * 1.5;

    return {
      predictedEngagement,
      predictedPageviews,
      predictedTimeOnPage: 120 + (features.contentLength / 200) * 60, // seconds
      predictedBounceRate: Math.max(20, 80 - features.readabilityScore * 0.6),
      predictedConversionRate:
        features.historicalConversion * qualityMultiplier,
      predictedSocialShares: predictedEngagement * 0.05,
      confidence: 0.75,
    };
  }

  /**
   * Random forest prediction (simulated)
   */
  private async randomForestPredict(
    features: ContentFeatures,
    timeframe: number
  ): Promise<any> {
    // Simulate random forest with decision rules
    const trees = [
      this.decisionTree1(features),
      this.decisionTree2(features),
      this.decisionTree3(features),
    ];

    // Average tree predictions
    const avgPredictions = trees.reduce((acc, tree) => {
      Object.keys(tree).forEach(key => {
        if (typeof tree[key] === "number") {
          acc[key] = (acc[key] || 0) + tree[key] / trees.length;
        }
      });
      return acc;
    }, {} as any);

    return {
      ...avgPredictions,
      confidence: 0.7,
    };
  }

  /**
   * Ensemble prediction combining multiple models
   */
  private ensemblePredict(predictions: any[]): any {
    const weights = predictions.map(p => p.confidence || 0.5);
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    const ensemble = predictions.reduce((acc, pred, i) => {
      const weight = weights[i] / totalWeight;

      Object.keys(pred).forEach(key => {
        if (typeof pred[key] === "number" && key !== "confidence") {
          acc[key] = (acc[key] || 0) + pred[key] * weight;
        }
      });

      return acc;
    }, {} as any);

    // Calculate confidence interval
    const variance = this.calculateVariance(predictions);
    const stdDev = Math.sqrt(variance);

    return {
      ...ensemble,
      confidenceInterval: {
        lower: ensemble.predictedEngagement - 1.96 * stdDev,
        upper: ensemble.predictedEngagement + 1.96 * stdDev,
      },
    };
  }

  /**
   * Analyze which features drive predictions
   */
  private async performDriverAnalysis(
    features: ContentFeatures,
    prediction: any
  ): Promise<any[]> {
    const drivers = [];

    // Analyze impact of each feature group
    const featureGroups = {
      contentQuality: ["readabilityScore", "topicRelevance", "uniquenessScore"],
      seo: ["keywordDensity", "keywordInTitle", "urlOptimizationScore"],
      structure: ["headingStructure", "imageTextRatio", "contentLength"],
      timing: ["publishHour", "contentAge", "trendingScore"],
      competition: ["competitiveDensity", "marketSaturation"],
    };

    for (const [group, featureNames] of Object.entries(featureGroups)) {
      const impact = await this.calculateFeatureImpact(
        features,
        featureNames,
        prediction
      );

      drivers.push({
        feature: group,
        impact: impact.magnitude,
        direction: impact.direction,
      });
    }

    return drivers.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  }

  /**
   * Store prediction for later evaluation
   */
  private async storePrediction(
    contentId: string,
    prediction: any,
    timeframe: number
  ): Promise<void> {
    const { error } = await this.supabase.from("model_predictions").insert({
      content_id: contentId,
      project_id: await this.getProjectId(contentId),
      model_version: this.modelVersion,
      model_type: "content_performance",
      prediction_data: prediction,
      confidence_score: prediction.confidence || 75,
      confidence_level: this.getConfidenceLevel(prediction.confidence || 75),
      prediction_timeframe: timeframe,
      prediction_date: new Date().toISOString(),
    });

    if (error) {
      console.error("Failed to store prediction:", error);
    }
  }

  // Helper methods
  private async generateEmbedding(text: string): Promise<number[]> {
    // In production, use OpenAI embeddings API
    // For now, return mock embedding
    return Array(1536)
      .fill(0)
      .map(() => Math.random());
  }

  private analyzeStructure(content: string) {
    const paragraphs = content.split(/\n\n+/);
    const sentences = content.split(/[.!?]+/);
    const images = (content.match(/<img/g) || []).length;
    const videos = (content.match(/<video|<iframe.*youtube/g) || []).length;

    return {
      paragraphCount: paragraphs.length,
      avgSentenceLength:
        sentences.reduce((a, s) => a + s.split(/\s+/).length, 0) /
        sentences.length,
      headings: {
        h1Count: (content.match(/<h1/g) || []).length,
        h2Count: (content.match(/<h2/g) || []).length,
        h3Count: (content.match(/<h3/g) || []).length,
        hierarchyScore: 0.8, // Simplified
      },
      imageCount: images,
      videoCount: videos,
      imageTextRatio: images / (content.length / 1000),
      hasInfographics:
        content.includes("infographic") || content.includes("data-viz"),
    };
  }

  private analyzeSEO(content: any, targetKeywords: string[]) {
    const keywordMatches = targetKeywords.reduce((count, keyword) => {
      const regex = new RegExp(keyword, "gi");
      return count + (content.content?.match(regex) || []).length;
    }, 0);

    return {
      keywordDensity: (keywordMatches / (content.word_count || 1)) * 100,
      keywordInTitle: targetKeywords.some(k =>
        content.title.toLowerCase().includes(k.toLowerCase())
      ),
      keywordInMeta: targetKeywords.some(k =>
        content.meta_description?.toLowerCase().includes(k.toLowerCase())
      ),
      urlScore: content.url?.includes(targetKeywords[0]?.toLowerCase())
        ? 1
        : 0.5,
    };
  }

  private calculateHistoricalPerformance(analytics: any[]) {
    if (!analytics || analytics.length === 0) {
      return { engagement: 0, conversion: 0, bounceRate: 50 };
    }

    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

    return {
      engagement: avg(analytics.map(a => a.pageviews + a.unique_visitors)),
      conversion: avg(analytics.map(a => a.conversion_rate || 0)),
      bounceRate: avg(analytics.map(a => a.bounce_rate || 50)),
    };
  }

  private async getCompetitiveContext(projectId: string, keywords: string[]) {
    // Simplified competitive analysis
    return {
      density: 0.6,
      uniqueness: 0.7,
      saturation: 0.5,
    };
  }

  private async calculateTopicRelevance(content: any): Promise<number> {
    // Simplified topic relevance
    return 0.8;
  }

  private async analyzeSentiment(text: string): Promise<number> {
    // Simplified sentiment (-1 to 1)
    return 0.2;
  }

  private async analyzeEmotionalTone(text: string): Promise<any> {
    // Simplified emotional analysis
    return {
      joy: 0.6,
      trust: 0.7,
      fear: 0.1,
      surprise: 0.3,
      sadness: 0.1,
      disgust: 0.05,
      anger: 0.05,
      anticipation: 0.5,
    };
  }

  private async calculateUpdateFrequency(contentId: string): Promise<number> {
    // Simplified update frequency
    return 2; // updates per month
  }

  private async calculateTrendingScore(keywords: string[]): Promise<number> {
    // Simplified trending score
    return 0.6;
  }

  private serializeFeatures(features: ContentFeatures): any {
    // Exclude embedding for API calls
    const { semanticEmbedding, ...rest } = features;
    return rest;
  }

  private getTemporalBoost(features: ContentFeatures): number {
    // Weekend boost
    const weekendBoost = [0, 6].includes(features.publishDayOfWeek) ? 1.1 : 1;
    // Time of day boost (morning/evening)
    const timeBoost = [7, 8, 9, 17, 18, 19].includes(features.publishHour)
      ? 1.15
      : 1;
    // Freshness boost
    const freshnessBoost = Math.max(0.5, 1 - features.contentAge / 365);

    return weekendBoost * timeBoost * freshnessBoost;
  }

  private getSEOBoost(features: ContentFeatures): number {
    let boost = 1;
    if (features.keywordInTitle) boost *= 1.2;
    if (features.keywordInMeta) boost *= 1.1;
    if (features.urlOptimizationScore > 0.8) boost *= 1.1;
    if (features.keywordDensity > 1 && features.keywordDensity < 3)
      boost *= 1.1;
    return boost;
  }

  private decisionTree1(features: ContentFeatures): any {
    let engagement = 1000;

    if (features.readabilityScore > 70) {
      engagement *= 1.5;
      if (features.imageCount > 3) {
        engagement *= 1.3;
      }
    }

    if (features.competitiveDensity > 0.7) {
      engagement *= 0.8;
    }

    return {
      predictedEngagement: engagement,
      predictedPageviews: engagement * 1.4,
      predictedBounceRate: 100 - features.readabilityScore,
    };
  }

  private decisionTree2(features: ContentFeatures): any {
    // Another decision tree with different splits
    const base = features.historicalEngagement || 800;
    const multiplier =
      features.topicRelevance * (2 - features.marketSaturation);

    return {
      predictedEngagement: base * multiplier,
      predictedPageviews: base * multiplier * 1.6,
      predictedConversionRate: features.historicalConversion * multiplier,
    };
  }

  private decisionTree3(features: ContentFeatures): any {
    // Third tree focusing on content structure
    const structureScore =
      (features.headingStructure.hierarchyScore + features.imageTextRatio) / 2;
    const engagement = 1200 * structureScore * features.uniquenessScore;

    return {
      predictedEngagement: engagement,
      predictedTimeOnPage: 60 + (features.contentLength / 200) * 30,
      predictedSocialShares: engagement * 0.03,
    };
  }

  private calculateVariance(predictions: any[]): number {
    const engagements = predictions.map(p => p.predictedEngagement || 0);
    const mean = engagements.reduce((a, b) => a + b, 0) / engagements.length;
    const squaredDiffs = engagements.map(e => Math.pow(e - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / engagements.length;
  }

  private async calculateFeatureImpact(
    features: any,
    featureNames: string[],
    prediction: any
  ): Promise<{ magnitude: number; direction: "positive" | "negative" }> {
    // Simplified feature impact calculation
    const avgValue =
      featureNames.reduce((sum, name) => {
        const value = this.getNestedValue(features, name);
        return sum + (typeof value === "number" ? value : 0);
      }, 0) / featureNames.length;

    const magnitude = Math.abs(avgValue - 0.5) * 100;
    const direction = avgValue > 0.5 ? "positive" : "negative";

    return { magnitude, direction };
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((acc, part) => acc?.[part], obj);
  }

  private async getProjectId(contentId: string): Promise<string> {
    const { data } = await this.supabase
      .from("content_items")
      .select("project_id")
      .eq("id", contentId)
      .single();

    return data?.project_id || "";
  }

  private getConfidenceLevel(
    score: number
  ): "low" | "medium" | "high" | "very_high" {
    if (score < 50) return "low";
    if (score < 70) return "medium";
    if (score < 90) return "high";
    return "very_high";
  }

  /**
   * Evaluate model predictions against actual performance
   */
  async evaluatePredictions(daysBack = 30): Promise<any> {
    const { data: predictions } = await this.supabase
      .from("model_predictions")
      .select(
        `
        *,
        content_items (
          content_analytics (
            pageviews,
            unique_visitors,
            bounce_rate,
            conversions,
            conversion_rate
          )
        )
      `
      )
      .eq("model_type", "content_performance")
      .eq("is_evaluated", false)
      .lte(
        "prediction_date",
        new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()
      );

    if (!predictions || predictions.length === 0) {
      return { message: "No predictions to evaluate" };
    }

    const evaluations = await Promise.all(
      predictions.map(async pred => {
        const actual = this.calculateActualPerformance(
          pred.content_items.content_analytics
        );
        const accuracy = this.calculateAccuracy(pred.prediction_data, actual);

        // Update prediction with evaluation
        await this.supabase
          .from("model_predictions")
          .update({
            actual_results: actual,
            accuracy_score: accuracy,
            is_evaluated: true,
            evaluation_date: new Date().toISOString(),
          })
          .eq("id", pred.id);

        return { predictionId: pred.id, accuracy };
      })
    );

    const avgAccuracy =
      evaluations.reduce((sum, e) => sum + e.accuracy, 0) / evaluations.length;

    return {
      evaluatedCount: evaluations.length,
      averageAccuracy: avgAccuracy,
      evaluations,
    };
  }

  private calculateActualPerformance(analytics: any[]): any {
    if (!analytics || analytics.length === 0) {
      return {};
    }

    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    const avg = (arr: number[]) => sum(arr) / arr.length;

    return {
      actualEngagement: sum(
        analytics.map(a => a.pageviews + a.unique_visitors)
      ),
      actualPageviews: sum(analytics.map(a => a.pageviews)),
      actualBounceRate: avg(analytics.map(a => a.bounce_rate)),
      actualConversionRate: avg(analytics.map(a => a.conversion_rate || 0)),
    };
  }

  private calculateAccuracy(predicted: any, actual: any): number {
    const metrics = ["Engagement", "Pageviews", "BounceRate", "ConversionRate"];
    let totalAccuracy = 0;
    let count = 0;

    for (const metric of metrics) {
      const predKey = `predicted${metric}`;
      const actKey = `actual${metric}`;

      if (predicted[predKey] !== undefined && actual[actKey] !== undefined) {
        const error = Math.abs(predicted[predKey] - actual[actKey]);
        const relativeError = error / (actual[actKey] || 1);
        const accuracy = Math.max(0, 1 - relativeError) * 100;

        totalAccuracy += accuracy;
        count++;
      }
    }

    return count > 0 ? totalAccuracy / count : 0;
  }
}

// Export singleton instance
export const contentPerformancePredictor = new ContentPerformancePredictor();
