/**
 * Competitive Intelligence Engine
 * Advanced algorithms for market analysis and competitive insights
 */

import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env-helper";
import { z } from "zod";
import { enhancedOpenAIService } from "@/lib/openai-enhanced";
import { serpApiService } from "@/lib/external-apis/serp-api";
import {
  CompetitiveAnalysisResult,
  CompetitorCategory,
  ContentSimilarityScore,
  MarketPositionAnalysis,
} from "@/lib/competitive/types";

// Algorithm configuration schemas
const marketAnalysisConfigSchema = z.object({
  depth: z.enum(["surface", "standard", "deep"]),
  includeHistorical: z.boolean(),
  timeframe: z.number(), // days
  competitors: z.array(z.string()),
  markets: z.array(z.string()),
  signals: z.array(
    z.enum([
      "content",
      "seo",
      "social",
      "technology",
      "pricing",
      "partnerships",
      "hiring",
      "product",
    ])
  ),
});

const competitiveSignalSchema = z.object({
  type: z.string(),
  strength: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  source: z.string(),
  timestamp: z.string().datetime(),
  data: z.record(z.unknown()),
  implications: z.array(z.string()),
});

type MarketAnalysisConfig = z.infer<typeof marketAnalysisConfigSchema>;
type CompetitiveSignal = z.infer<typeof competitiveSignalSchema>;

interface MarketIntelligence {
  marketSize: number;
  growthRate: number;
  maturity: "emerging" | "growing" | "mature" | "declining";
  keyPlayers: CompetitorProfile[];
  opportunities: MarketOpportunity[];
  threats: MarketThreat[];
  predictions: MarketPrediction[];
}

interface CompetitorProfile {
  id: string;
  name: string;
  marketShare: number;
  strengths: string[];
  weaknesses: string[];
  strategy: string;
  trajectory: "rising" | "stable" | "declining";
}

interface MarketOpportunity {
  id: string;
  type: string;
  description: string;
  size: number;
  difficulty: number;
  timeToCapture: number; // months
  requiredCapabilities: string[];
}

interface MarketThreat {
  id: string;
  source: string;
  type: string;
  severity: number;
  probability: number;
  timeframe: string;
  mitigationOptions: string[];
}

interface MarketPrediction {
  scenario: string;
  probability: number;
  impact: "positive" | "negative" | "neutral";
  timeframe: string;
  indicators: string[];
}

export class CompetitiveIntelligenceEngine {
  private supabase: ReturnType<typeof createClient>;
  private signalProcessors: Map<string, any> = new Map();
  private marketModels: Map<string, any> = new Map();

  constructor() {
    const env = getSupabaseEnv();
    this.supabase = createClient(env.url, env.serviceRoleKey);

    this.initializeSignalProcessors();
    this.initializeMarketModels();
  }

  /**
   * Perform comprehensive competitive analysis
   */
  async analyzeCompetitivePosition(
    projectId: string,
    config: MarketAnalysisConfig
  ): Promise<MarketIntelligence> {
    // Gather competitive signals
    const signals = await this.gatherCompetitiveSignals(projectId, config);

    // Analyze market dynamics
    const marketAnalysis = await this.analyzeMarketDynamics(signals, config);

    // Profile competitors
    const competitorProfiles = await this.profileCompetitors(
      config.competitors,
      signals
    );

    // Identify opportunities and threats
    const opportunities = await this.identifyOpportunities(
      marketAnalysis,
      competitorProfiles,
      projectId
    );

    const threats = await this.identifyThreats(
      marketAnalysis,
      competitorProfiles,
      signals
    );

    // Generate predictions
    const predictions = await this.generateMarketPredictions(
      marketAnalysis,
      competitorProfiles,
      signals
    );

    // Store analysis results
    await this.storeAnalysisResults(projectId, {
      marketAnalysis,
      competitorProfiles,
      opportunities,
      threats,
      predictions,
    });

    return {
      marketSize: marketAnalysis.size,
      growthRate: marketAnalysis.growth,
      maturity: marketAnalysis.maturity,
      keyPlayers: competitorProfiles,
      opportunities,
      threats,
      predictions,
    };
  }

  /**
   * Real-time competitive monitoring
   */
  async monitorCompetitiveSignals(
    projectId: string,
    competitorIds: string[]
  ): Promise<CompetitiveSignal[]> {
    const signals: CompetitiveSignal[] = [];

    // Monitor various signal sources
    const signalPromises = competitorIds.map(async competitorId => {
      const competitor = await this.getCompetitor(competitorId);

      // Content changes
      const contentSignals = await this.detectContentChanges(competitor);
      signals.push(...contentSignals);

      // SEO movements
      const seoSignals = await this.detectSEOMovements(competitor);
      signals.push(...seoSignals);

      // Technology changes
      const techSignals = await this.detectTechnologyChanges(competitor);
      signals.push(...techSignals);

      // Social signals
      const socialSignals = await this.detectSocialSignals(competitor);
      signals.push(...socialSignals);
    });

    await Promise.all(signalPromises);

    // Process and enrich signals
    const enrichedSignals = await this.enrichSignals(signals);

    // Generate alerts for significant signals
    await this.generateCompetitiveAlerts(projectId, enrichedSignals);

    return enrichedSignals;
  }

  /**
   * Content similarity analysis using advanced NLP
   */
  async analyzeContentSimilarity(
    userContentId: string,
    competitorContentIds: string[]
  ): Promise<ContentSimilarityScore[]> {
    // Get content data
    const userContent = await this.getContent(userContentId);
    const competitorContents = await Promise.all(
      competitorContentIds.map(id => this.getContent(id))
    );

    // Generate embeddings
    const userEmbedding = await this.generateContentEmbedding(userContent);
    const competitorEmbeddings = await Promise.all(
      competitorContents.map(content => this.generateContentEmbedding(content))
    );

    // Calculate similarity scores
    const similarities = competitorEmbeddings.map((embedding, index) => {
      const semantic = this.cosineSimilarity(userEmbedding, embedding);
      const structural = this.structuralSimilarity(
        userContent,
        competitorContents[index]
      );
      const topical = this.topicalSimilarity(
        userContent,
        competitorContents[index]
      );

      return {
        contentId: competitorContentIds[index],
        overall: semantic * 0.5 + structural * 0.3 + topical * 0.2,
        semantic,
        structural,
        performanceCorrelation: 0, // Will be calculated separately
        breakdown: {
          topics: topical,
          keywords: this.keywordSimilarity(
            userContent,
            competitorContents[index]
          ),
          format: this.formatSimilarity(userContent, competitorContents[index]),
          style: this.styleSimilarity(userContent, competitorContents[index]),
        },
      };
    });

    // Calculate performance correlation
    const performanceData = await this.getPerformanceData([
      userContentId,
      ...competitorContentIds,
    ]);

    similarities.forEach((sim, index) => {
      sim.performanceCorrelation = this.calculatePerformanceCorrelation(
        performanceData[userContentId],
        performanceData[competitorContentIds[index]]
      );
    });

    return similarities;
  }

  /**
   * Market position analysis with strategic recommendations
   */
  async analyzeMarketPosition(
    projectId: string,
    competitorIds: string[]
  ): Promise<MarketPositionAnalysis> {
    // Gather comprehensive data
    const projectData = await this.getProjectData(projectId);
    const competitorData = await Promise.all(
      competitorIds.map(id => this.getCompetitorData(id))
    );

    // Calculate market position
    const position = await this.calculateMarketPosition(
      projectData,
      competitorData
    );

    // SWOT analysis
    const strengths = await this.identifyStrengths(projectData, competitorData);
    const weaknesses = await this.identifyWeaknesses(
      projectData,
      competitorData
    );
    const opportunities = await this.identifyMarketOpportunities(
      projectData,
      competitorData
    );
    const threats = await this.identifyMarketThreats(
      projectData,
      competitorData
    );

    // Strategic recommendations
    const recommendations = await this.generateStrategicRecommendations({
      position,
      strengths,
      weaknesses,
      opportunities,
      threats,
    });

    return {
      overallPosition: position,
      competitiveStrengths: strengths,
      competitiveWeaknesses: weaknesses,
      marketOpportunities: opportunities,
      threats,
      strategicRecommendations: recommendations,
    };
  }

  /**
   * Initialize signal processors
   */
  private initializeSignalProcessors(): void {
    // Content signal processor
    this.signalProcessors.set("content", {
      process: async (competitor: any) => {
        const signals: CompetitiveSignal[] = [];

        // Check for new content
        const recentContent = await this.getRecentCompetitorContent(
          competitor.id
        );
        if (recentContent.length > 0) {
          signals.push({
            type: "new_content",
            strength: 0.7,
            confidence: 0.9,
            source: "content_monitoring",
            timestamp: new Date().toISOString(),
            data: {
              count: recentContent.length,
              titles: recentContent.map(c => c.title),
            },
            implications: [
              "Increased content production",
              "Potential SEO push",
            ],
          });
        }

        // Analyze content strategy shifts
        const strategyShift = await this.detectContentStrategyShift(
          competitor.id
        );
        if (strategyShift) {
          signals.push({
            type: "strategy_shift",
            strength: strategyShift.magnitude,
            confidence: strategyShift.confidence,
            source: "content_analysis",
            timestamp: new Date().toISOString(),
            data: strategyShift,
            implications: strategyShift.implications,
          });
        }

        return signals;
      },
    });

    // SEO signal processor
    this.signalProcessors.set("seo", {
      process: async (competitor: any) => {
        const signals: CompetitiveSignal[] = [];

        // Check SERP movements
        const serpData = await serpApiService.analyzeRankings({
          domain: competitor.domain,
          keywords: await this.getTrackedKeywords(competitor.id),
          device: "desktop",
        });

        if (serpData.success && serpData.data) {
          const significantChanges = serpData.data.rankings.filter(
            r => Math.abs(r.position - (r as any).previousPosition) > 3
          );

          if (significantChanges.length > 0) {
            signals.push({
              type: "ranking_movement",
              strength:
                significantChanges.length / serpData.data.rankings.length,
              confidence: 0.85,
              source: "serp_monitoring",
              timestamp: new Date().toISOString(),
              data: { changes: significantChanges },
              implications: [
                "SEO strategy change",
                "Content optimization efforts",
              ],
            });
          }
        }

        return signals;
      },
    });

    // Technology signal processor
    this.signalProcessors.set("technology", {
      process: async (competitor: any) => {
        const signals: CompetitiveSignal[] = [];

        // Detect technology stack changes
        const techChanges = await this.detectTechStackChanges(
          competitor.domain
        );

        if (techChanges.length > 0) {
          signals.push({
            type: "tech_adoption",
            strength: 0.6,
            confidence: 0.7,
            source: "technology_scan",
            timestamp: new Date().toISOString(),
            data: { changes: techChanges },
            implications: techChanges.map(t => `Adopted ${t.technology}`),
          });
        }

        return signals;
      },
    });
  }

  /**
   * Initialize market models
   */
  private initializeMarketModels(): void {
    // Market size estimation model
    this.marketModels.set("size", {
      estimate: async (signals: CompetitiveSignal[]) => {
        // Aggregate market signals
        const volumeSignals = signals.filter(s => s.type.includes("volume"));
        const competitorCount = new Set(signals.map(s => s.data.competitorId))
          .size;

        // Use TAM/SAM/SOM framework
        const tam = await this.estimateTAM(signals);
        const sam = tam * 0.3; // Serviceable addressable market
        const som = sam * 0.1; // Serviceable obtainable market

        return {
          tam,
          sam,
          som,
          confidence: volumeSignals.length > 10 ? 0.8 : 0.6,
        };
      },
    });

    // Growth prediction model
    this.marketModels.set("growth", {
      predict: async (historicalData: any[], signals: CompetitiveSignal[]) => {
        // Time series analysis with signal adjustment
        const baseGrowth = this.calculateBaseGrowth(historicalData);
        const signalAdjustment = this.calculateGrowthAdjustment(signals);

        return {
          rate: baseGrowth * (1 + signalAdjustment),
          confidence: this.calculateGrowthConfidence(historicalData, signals),
        };
      },
    });
  }

  /**
   * Gather competitive signals from multiple sources
   */
  private async gatherCompetitiveSignals(
    projectId: string,
    config: MarketAnalysisConfig
  ): Promise<CompetitiveSignal[]> {
    const signals: CompetitiveSignal[] = [];

    for (const competitorId of config.competitors) {
      const competitor = await this.getCompetitor(competitorId);

      for (const signalType of config.signals) {
        const processor = this.signalProcessors.get(signalType);
        if (processor) {
          const competitorSignals = await processor.process(competitor);
          signals.push(...competitorSignals);
        }
      }
    }

    return signals;
  }

  /**
   * Analyze market dynamics
   */
  private async analyzeMarketDynamics(
    signals: CompetitiveSignal[],
    config: MarketAnalysisConfig
  ): Promise<any> {
    // Market size estimation
    const sizeModel = this.marketModels.get("size");
    const marketSize = await sizeModel.estimate(signals);

    // Growth analysis
    const growthModel = this.marketModels.get("growth");
    const historicalData = await this.getHistoricalMarketData(config);
    const growth = await growthModel.predict(historicalData, signals);

    // Maturity assessment
    const maturity = this.assessMarketMaturity(signals, growth.rate);

    // Competitive intensity
    const intensity = this.calculateCompetitiveIntensity(signals);

    return {
      size: marketSize.som,
      growth: growth.rate,
      maturity,
      intensity,
      confidence: (marketSize.confidence + growth.confidence) / 2,
    };
  }

  /**
   * Profile competitors with AI-powered analysis
   */
  private async profileCompetitors(
    competitorIds: string[],
    signals: CompetitiveSignal[]
  ): Promise<CompetitorProfile[]> {
    const profiles = await Promise.all(
      competitorIds.map(async competitorId => {
        const competitor = await this.getCompetitor(competitorId);
        const competitorSignals = signals.filter(
          s => s.data.competitorId === competitorId
        );

        // AI-powered strategy analysis
        const strategyAnalysis = await enhancedOpenAIService.chatCompletion({
          messages: [
            {
              role: "system",
              content:
                "Analyze competitive strategy based on signals and identify strengths, weaknesses, and strategic direction.",
            },
            {
              role: "user",
              content: JSON.stringify({
                competitor: competitor.name,
                signals: competitorSignals.map(s => ({
                  type: s.type,
                  data: s.data,
                  implications: s.implications,
                })),
              }),
            },
          ],
          model: "gpt-4o-mini",
          temperature: 0.3,
          responseFormat: { type: "json_object" },
        });

        const analysis = JSON.parse(strategyAnalysis.data?.content || "{}");

        return {
          id: competitorId,
          name: competitor.name,
          marketShare: await this.estimateMarketShare(competitorId, signals),
          strengths: analysis.strengths || [],
          weaknesses: analysis.weaknesses || [],
          strategy: analysis.strategy || "Unknown",
          trajectory: this.determineTrajectory(competitorSignals),
        };
      })
    );

    return profiles;
  }

  /**
   * Identify market opportunities
   */
  private async identifyOpportunities(
    marketAnalysis: any,
    competitors: CompetitorProfile[],
    projectId: string
  ): Promise<MarketOpportunity[]> {
    const opportunities: MarketOpportunity[] = [];

    // Gap analysis
    const gaps = await this.performGapAnalysis(projectId, competitors);

    // Underserved segments
    const underserved = await this.identifyUnderservedSegments(marketAnalysis);

    // Emerging trends
    const trends = await this.identifyEmergingTrends(marketAnalysis);

    // Convert to opportunities
    gaps.forEach(gap => {
      opportunities.push({
        id: `gap_${gap.id}`,
        type: "content_gap",
        description: gap.description,
        size: gap.potential * marketAnalysis.size,
        difficulty: gap.difficulty,
        timeToCapture: gap.estimatedTime,
        requiredCapabilities: gap.requirements,
      });
    });

    return opportunities;
  }

  /**
   * Identify market threats
   */
  private async identifyThreats(
    marketAnalysis: any,
    competitors: CompetitorProfile[],
    signals: CompetitiveSignal[]
  ): Promise<MarketThreat[]> {
    const threats: MarketThreat[] = [];

    // Analyze aggressive competitors
    const aggressiveCompetitors = competitors.filter(
      c => c.trajectory === "rising" && c.marketShare > 0.1
    );

    aggressiveCompetitors.forEach(competitor => {
      threats.push({
        id: `competitor_${competitor.id}`,
        source: competitor.name,
        type: "competitive_pressure",
        severity: competitor.marketShare * 10,
        probability: 0.7,
        timeframe: "6-12 months",
        mitigationOptions: [
          "Strengthen unique value proposition",
          "Accelerate innovation",
          "Improve customer retention",
        ],
      });
    });

    // Technology disruption threats
    const techSignals = signals.filter(s => s.type === "tech_adoption");
    if (techSignals.length > 3) {
      threats.push({
        id: "tech_disruption",
        source: "Market evolution",
        type: "technology_shift",
        severity: 7,
        probability: 0.6,
        timeframe: "12-18 months",
        mitigationOptions: [
          "Adopt emerging technologies",
          "Partner with tech providers",
          "Invest in R&D",
        ],
      });
    }

    return threats;
  }

  /**
   * Generate market predictions
   */
  private async generateMarketPredictions(
    marketAnalysis: any,
    competitors: CompetitorProfile[],
    signals: CompetitiveSignal[]
  ): Promise<MarketPrediction[]> {
    const predictions: MarketPrediction[] = [];

    // Consolidation prediction
    if (marketAnalysis.maturity === "mature" && competitors.length > 5) {
      predictions.push({
        scenario: "Market consolidation through M&A",
        probability: 0.65,
        impact: "neutral",
        timeframe: "18-24 months",
        indicators: [
          "Decreasing profit margins",
          "Increased acquisition activity",
          "Market saturation",
        ],
      });
    }

    // Growth scenario
    if (marketAnalysis.growth > 0.2) {
      predictions.push({
        scenario: "Continued rapid market expansion",
        probability: 0.8,
        impact: "positive",
        timeframe: "12-18 months",
        indicators: [
          "Increasing search volume",
          "New entrants",
          "Rising investment",
        ],
      });
    }

    // AI-powered scenario generation
    const aiPredictions = await this.generateAIPredictions(
      marketAnalysis,
      competitors,
      signals
    );
    predictions.push(...aiPredictions);

    return predictions;
  }

  // Helper methods
  private async generateContentEmbedding(content: any): Promise<number[]> {
    // In production, use OpenAI embeddings API
    return Array(1536)
      .fill(0)
      .map(() => Math.random());
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
    const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (mag1 * mag2);
  }

  private structuralSimilarity(content1: any, content2: any): number {
    // Compare document structure
    const struct1 = this.extractStructure(content1);
    const struct2 = this.extractStructure(content2);

    let similarity = 0;
    const features = ["headings", "paragraphs", "lists", "images"];

    features.forEach(feature => {
      const diff = Math.abs(struct1[feature] - struct2[feature]);
      similarity += 1 - diff / Math.max(struct1[feature], struct2[feature], 1);
    });

    return similarity / features.length;
  }

  private topicalSimilarity(content1: any, content2: any): number {
    // Extract and compare topics
    const topics1 = new Set(this.extractTopics(content1));
    const topics2 = new Set(this.extractTopics(content2));

    const intersection = new Set([...topics1].filter(t => topics2.has(t)));
    const union = new Set([...topics1, ...topics2]);

    return intersection.size / union.size;
  }

  private extractStructure(content: any): any {
    return {
      headings: (content.content?.match(/<h[1-6]/g) || []).length,
      paragraphs: (content.content?.match(/<p>/g) || []).length,
      lists: (content.content?.match(/<[uo]l>/g) || []).length,
      images: (content.content?.match(/<img/g) || []).length,
    };
  }

  private extractTopics(content: any): string[] {
    // Simplified topic extraction
    return content.focus_keywords || [];
  }

  private keywordSimilarity(content1: any, content2: any): number {
    const keywords1 = new Set(content1.focus_keywords || []);
    const keywords2 = new Set(content2.focus_keywords || []);

    const intersection = new Set([...keywords1].filter(k => keywords2.has(k)));
    const union = new Set([...keywords1, ...keywords2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private formatSimilarity(content1: any, content2: any): number {
    return content1.content_type === content2.content_type ? 1 : 0.5;
  }

  private styleSimilarity(content1: any, content2: any): number {
    // Compare writing style metrics
    const style1 = this.analyzeStyle(content1);
    const style2 = this.analyzeStyle(content2);

    const features = ["sentenceLength", "readability", "tone"];
    let similarity = 0;

    features.forEach(feature => {
      const diff = Math.abs(style1[feature] - style2[feature]);
      similarity += 1 - diff / 100; // Normalize to 0-1
    });

    return similarity / features.length;
  }

  private analyzeStyle(content: any): any {
    return {
      sentenceLength: 15, // Average words per sentence
      readability: content.readability_score || 70,
      tone: 50, // Formal to casual scale
    };
  }

  private calculatePerformanceCorrelation(perf1: any, perf2: any): number {
    if (!perf1 || !perf2) return 0;

    // Simplified correlation calculation
    const metrics = ["pageviews", "engagement", "conversion"];
    let correlation = 0;

    metrics.forEach(metric => {
      if (perf1[metric] && perf2[metric]) {
        const ratio =
          Math.min(perf1[metric], perf2[metric]) /
          Math.max(perf1[metric], perf2[metric]);
        correlation += ratio;
      }
    });

    return correlation / metrics.length;
  }

  private async getCompetitor(competitorId: string): Promise<any> {
    const { data } = await this.supabase
      .from("competitors")
      .select("*")
      .eq("id", competitorId)
      .single();
    return data;
  }

  private async getContent(contentId: string): Promise<any> {
    const { data } = await this.supabase
      .from("content_items")
      .select("*")
      .eq("id", contentId)
      .single();
    return data;
  }

  private async getPerformanceData(contentIds: string[]): Promise<any> {
    const { data } = await this.supabase
      .from("content_analytics")
      .select("*")
      .in("content_id", contentIds);

    const performanceMap: any = {};
    contentIds.forEach(id => {
      const metrics = data?.filter(d => d.content_id === id) || [];
      performanceMap[id] = this.aggregatePerformance(metrics);
    });

    return performanceMap;
  }

  private aggregatePerformance(metrics: any[]): any {
    if (metrics.length === 0) return null;

    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    const avg = (arr: number[]) => sum(arr) / arr.length;

    return {
      pageviews: sum(metrics.map(m => m.pageviews || 0)),
      engagement: avg(metrics.map(m => m.avg_session_duration || 0)),
      conversion: avg(metrics.map(m => m.conversion_rate || 0)),
    };
  }

  private async getProjectData(projectId: string): Promise<any> {
    const { data } = await this.supabase
      .from("projects")
      .select(
        `
        *,
        content_items (
          id,
          status,
          seo_score,
          content_analytics (
            pageviews,
            conversions
          )
        )
      `
      )
      .eq("id", projectId)
      .single();
    return data;
  }

  private async getCompetitorData(competitorId: string): Promise<any> {
    const { data } = await this.supabase
      .from("competitors")
      .select(
        `
        *,
        competitor_analytics (
          estimated_traffic,
          domain_authority,
          backlinks_count
        )
      `
      )
      .eq("id", competitorId)
      .single();
    return data;
  }

  private async calculateMarketPosition(
    projectData: any,
    competitorData: any[]
  ): Promise<any> {
    // Calculate relative position
    const projectScore = this.calculateCompetitiveScore(projectData);
    const competitorScores = competitorData.map(c =>
      this.calculateCompetitiveScore(c)
    );

    const allScores = [projectScore, ...competitorScores].sort((a, b) => b - a);
    const position = allScores.indexOf(projectScore) + 1;
    const percentile = ((allScores.length - position) / allScores.length) * 100;

    return {
      score: percentile,
      category: this.getPositionCategory(percentile),
      trend: "stable", // Would calculate from historical data
      competitiveAdvantages: await this.identifyAdvantages(
        projectData,
        competitorData
      ),
      positioningStatement: await this.generatePositioningStatement(
        projectData,
        percentile
      ),
    };
  }

  private calculateCompetitiveScore(data: any): number {
    let score = 0;

    // Traffic score
    const traffic =
      data.competitor_analytics?.[0]?.estimated_traffic ||
      data.content_items?.reduce(
        (sum: number, item: any) =>
          sum + (item.content_analytics?.[0]?.pageviews || 0),
        0
      ) ||
      0;
    score += Math.log10(traffic + 1) * 10;

    // Authority score
    const authority = data.competitor_analytics?.[0]?.domain_authority || 50;
    score += authority;

    // Content quality score
    const avgSeoScore =
      data.content_items?.reduce(
        (sum: number, item: any) => sum + (item.seo_score || 0),
        0
      ) / (data.content_items?.length || 1) || 0;
    score += avgSeoScore;

    return score;
  }

  private getPositionCategory(percentile: number): string {
    if (percentile >= 75) return "leader";
    if (percentile >= 50) return "challenger";
    if (percentile >= 25) return "follower";
    return "niche";
  }

  private async identifyAdvantages(
    projectData: any,
    competitorData: any[]
  ): Promise<string[]> {
    const advantages = [];

    // Content quality advantage
    const avgProjectSeo = this.calculateAvgSeoScore(projectData);
    const avgCompetitorSeo =
      this.calculateAvgCompetitorSeoScore(competitorData);

    if (avgProjectSeo > avgCompetitorSeo * 1.1) {
      advantages.push("Superior content quality");
    }

    // Add more advantage checks...

    return advantages;
  }

  private calculateAvgSeoScore(data: any): number {
    const scores =
      data.content_items?.map((item: any) => item.seo_score || 0) || [];
    return scores.length > 0
      ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length
      : 0;
  }

  private calculateAvgCompetitorSeoScore(competitors: any[]): number {
    // Simplified - would need actual competitor content data
    return 65;
  }

  private async generatePositioningStatement(
    projectData: any,
    percentile: number
  ): Promise<string> {
    const category = this.getPositionCategory(percentile);
    const statements: Record<string, string> = {
      leader:
        "Market leader with dominant position and strong competitive advantages",
      challenger:
        "Strong challenger with significant market presence and growth potential",
      follower:
        "Established player with opportunities for strategic differentiation",
      niche: "Specialized player with focused market approach",
    };

    return statements[category];
  }

  private async identifyStrengths(
    projectData: any,
    competitorData: any[]
  ): Promise<any[]> {
    const strengths = [];

    // Content production strength
    const contentVolume = projectData.content_items?.length || 0;
    const avgCompetitorVolume =
      competitorData.reduce((sum, c) => sum + (c.content_count || 0), 0) /
      competitorData.length;

    if (contentVolume > avgCompetitorVolume) {
      strengths.push({
        area: "Content Production",
        score: 85,
        description: "Above-average content creation velocity",
        impact: "high",
        sustainability: "sustainable",
      });
    }

    return strengths;
  }

  private async identifyWeaknesses(
    projectData: any,
    competitorData: any[]
  ): Promise<any[]> {
    const weaknesses = [];

    // Domain authority weakness
    const projectAuthority = projectData.domain_authority || 30;
    const avgCompetitorAuthority =
      competitorData.reduce(
        (sum, c) => sum + (c.competitor_analytics?.[0]?.domain_authority || 0),
        0
      ) / competitorData.length;

    if (projectAuthority < avgCompetitorAuthority * 0.8) {
      weaknesses.push({
        area: "Domain Authority",
        score: projectAuthority,
        description: "Below-average domain authority limiting organic reach",
        urgency: "high",
        improvementStrategy: "Focus on high-quality backlink acquisition",
      });
    }

    return weaknesses;
  }

  private async identifyMarketOpportunities(
    projectData: any,
    competitorData: any[]
  ): Promise<any[]> {
    // This would be more sophisticated in production
    return [
      {
        id: "opp_1",
        title: "Untapped keyword segments",
        description: "High-volume keywords with low competition",
        size: 50000,
        accessibility: 75,
        competitiveIntensity: 30,
        strategicFit: 85,
        priority: "high",
        timeframe: "3-6 months",
      },
    ];
  }

  private async identifyMarketThreats(
    projectData: any,
    competitorData: any[]
  ): Promise<any[]> {
    // This would be more sophisticated in production
    return [
      {
        id: "threat_1",
        source: "New market entrant",
        type: "competitive",
        severity: "high",
        probability: 60,
        impact: 70,
        timeline: "6-12 months",
        mitigationStrategy: "Strengthen customer relationships",
      },
    ];
  }

  private async generateStrategicRecommendations(swot: any): Promise<any[]> {
    // AI-powered recommendation generation
    const response = await enhancedOpenAIService.chatCompletion({
      messages: [
        {
          role: "system",
          content:
            "Generate strategic recommendations based on SWOT analysis for content marketing competitive positioning.",
        },
        {
          role: "user",
          content: JSON.stringify(swot),
        },
      ],
      model: "gpt-4o-mini",
      temperature: 0.7,
      responseFormat: { type: "json_object" },
    });

    const recommendations = JSON.parse(response.data?.content || "[]");

    return recommendations.map((rec: any, index: number) => ({
      id: `rec_${index}`,
      category: rec.category || "growth",
      priority: rec.priority || "medium",
      title: rec.title,
      description: rec.description,
      rationale: rec.rationale,
      expectedOutcome: rec.outcome,
      implementation: {
        timeline: rec.timeline || "3-6 months",
        resources: rec.resources || [],
        difficulty: rec.difficulty || "medium",
        cost: rec.cost || "medium",
      },
      metrics: rec.metrics || [],
    }));
  }

  // Additional helper methods...
  private async storeAnalysisResults(
    projectId: string,
    results: any
  ): Promise<void> {
    await this.supabase.from("competitive_analysis_results").insert({
      project_id: projectId,
      analysis_type: "comprehensive",
      results,
      confidence_score: results.marketAnalysis.confidence || 75,
      timestamp: new Date().toISOString(),
    });
  }

  private async getRecentCompetitorContent(
    competitorId: string
  ): Promise<any[]> {
    // In production, would scrape or use API
    return [];
  }

  private async detectContentStrategyShift(competitorId: string): Promise<any> {
    // Analyze content patterns over time
    return null;
  }

  private async getTrackedKeywords(competitorId: string): Promise<string[]> {
    const { data } = await this.supabase
      .from("keyword_opportunities")
      .select("keyword")
      .eq("competitor_id", competitorId)
      .limit(50);

    return data?.map(d => d.keyword) || [];
  }

  private async detectTechStackChanges(domain: string): Promise<any[]> {
    // Would use technology detection APIs
    return [];
  }

  private async detectContentChanges(
    competitor: any
  ): Promise<CompetitiveSignal[]> {
    return [];
  }

  private async detectSEOMovements(
    competitor: any
  ): Promise<CompetitiveSignal[]> {
    return [];
  }

  private async detectTechnologyChanges(
    competitor: any
  ): Promise<CompetitiveSignal[]> {
    return [];
  }

  private async detectSocialSignals(
    competitor: any
  ): Promise<CompetitiveSignal[]> {
    return [];
  }

  private async enrichSignals(
    signals: CompetitiveSignal[]
  ): Promise<CompetitiveSignal[]> {
    // Add context and implications
    return signals;
  }

  private async generateCompetitiveAlerts(
    projectId: string,
    signals: CompetitiveSignal[]
  ): Promise<void> {
    const significantSignals = signals.filter(s => s.strength > 0.7);

    for (const signal of significantSignals) {
      await this.supabase.from("competitive_alerts").insert({
        project_id: projectId,
        type: signal.type,
        severity: signal.strength > 0.9 ? "critical" : "high",
        title: `Competitive signal detected: ${signal.type}`,
        description: signal.implications.join(", "),
        data: signal.data,
        timestamp: signal.timestamp,
      });
    }
  }

  private async estimateTAM(signals: CompetitiveSignal[]): Promise<number> {
    // Total addressable market estimation
    return 10000000; // Simplified
  }

  private calculateBaseGrowth(historicalData: any[]): number {
    // Time series growth calculation
    return 0.15; // 15% growth
  }

  private calculateGrowthAdjustment(signals: CompetitiveSignal[]): number {
    // Adjust growth based on signals
    return 0.05;
  }

  private calculateGrowthConfidence(
    historicalData: any[],
    signals: CompetitiveSignal[]
  ): number {
    return 0.75;
  }

  private async getHistoricalMarketData(
    config: MarketAnalysisConfig
  ): Promise<any[]> {
    return [];
  }

  private assessMarketMaturity(
    signals: CompetitiveSignal[],
    growthRate: number
  ): "emerging" | "growing" | "mature" | "declining" {
    if (growthRate > 0.3) return "emerging";
    if (growthRate > 0.1) return "growing";
    if (growthRate > -0.05) return "mature";
    return "declining";
  }

  private calculateCompetitiveIntensity(signals: CompetitiveSignal[]): number {
    const competitiveSignals = signals.filter(
      s => s.type.includes("competitive") || s.type.includes("ranking")
    );
    return Math.min(competitiveSignals.length / signals.length, 1);
  }

  private async estimateMarketShare(
    competitorId: string,
    signals: CompetitiveSignal[]
  ): Promise<number> {
    // Simplified market share estimation
    return Math.random() * 0.3; // 0-30%
  }

  private determineTrajectory(
    signals: CompetitiveSignal[]
  ): "rising" | "stable" | "declining" {
    const positiveSignals = signals.filter(s => s.strength > 0.5).length;
    const negativeSignals = signals.filter(s => s.strength < 0.3).length;

    if (positiveSignals > negativeSignals * 2) return "rising";
    if (negativeSignals > positiveSignals * 2) return "declining";
    return "stable";
  }

  private async performGapAnalysis(
    projectId: string,
    competitors: CompetitorProfile[]
  ): Promise<any[]> {
    return [
      {
        id: "gap_1",
        description: "Long-form educational content",
        potential: 0.8,
        difficulty: 0.4,
        estimatedTime: 3,
        requirements: [
          "Subject matter expertise",
          "Content creation resources",
        ],
      },
    ];
  }

  private async identifyUnderservedSegments(
    marketAnalysis: any
  ): Promise<any[]> {
    return [];
  }

  private async identifyEmergingTrends(marketAnalysis: any): Promise<any[]> {
    return [];
  }

  private async generateAIPredictions(
    marketAnalysis: any,
    competitors: CompetitorProfile[],
    signals: CompetitiveSignal[]
  ): Promise<MarketPrediction[]> {
    const response = await enhancedOpenAIService.chatCompletion({
      messages: [
        {
          role: "system",
          content:
            "Generate market predictions based on competitive analysis data.",
        },
        {
          role: "user",
          content: JSON.stringify({
            marketAnalysis,
            competitors,
            signalSummary: signals.length,
          }),
        },
      ],
      model: "gpt-4o-mini",
      temperature: 0.5,
      responseFormat: { type: "json_object" },
    });

    return JSON.parse(response.data?.content || "[]");
  }
}

// Export singleton instance
export const competitiveIntelligenceEngine =
  new CompetitiveIntelligenceEngine();
