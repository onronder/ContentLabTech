/**
 * Automated A/B Testing Framework
 * Intelligent experimentation with Bayesian optimization
 */

import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env-helper";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// Experiment schemas
const experimentConfigSchema = z.object({
  name: z.string(),
  description: z.string(),
  hypothesis: z.string(),
  variants: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      allocation: z.number().min(0).max(1), // percentage
      config: z.record(z.unknown()),
    })
  ),
  metrics: z.object({
    primary: z.string(),
    secondary: z.array(z.string()).optional(),
    guardrails: z
      .array(
        z.object({
          metric: z.string(),
          threshold: z.number(),
          direction: z.enum(["increase", "decrease"]),
        })
      )
      .optional(),
  }),
  targeting: z.object({
    audience: z.string().optional(),
    segments: z.array(z.string()).optional(),
    percentage: z.number().min(0).max(100),
  }),
  schedule: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional(),
    minSampleSize: z.number().positive(),
    maxDuration: z.number().positive(), // days
  }),
  settings: z.object({
    type: z.enum(["ab", "multivariate", "bandit"]),
    statisticalMethod: z.enum(["frequentist", "bayesian"]),
    confidenceLevel: z.number().min(0.8).max(0.99),
    minimumDetectableEffect: z.number().positive(),
    enableEarlyStopping: z.boolean(),
  }),
});

const experimentResultSchema = z.object({
  variantId: z.string(),
  sampleSize: z.number(),
  metrics: z.record(
    z.object({
      value: z.number(),
      variance: z.number(),
      confidenceInterval: z.tuple([z.number(), z.number()]),
    })
  ),
  probability: z.number().min(0).max(1), // probability of being best
  uplift: z.number(), // percentage improvement
  significance: z.number().min(0).max(1),
});

type ExperimentConfig = z.infer<typeof experimentConfigSchema>;
type ExperimentResult = z.infer<typeof experimentResultSchema>;

interface BayesianState {
  alpha: number[];
  beta: number[];
  samples: number[];
}

export class AutomatedABTestingFramework {
  private supabase: ReturnType<typeof createClient>;
  private activeExperiments: Map<string, any> = new Map();
  private bayesianStates: Map<string, BayesianState> = new Map();

  constructor() {
    const env = getSupabaseEnv();
    this.supabase = createClient(env.url, env.serviceRoleKey);
  }

  /**
   * Create a new A/B test experiment
   */
  async createExperiment(
    projectId: string,
    config: ExperimentConfig
  ): Promise<{ id: string; status: string }> {
    const experimentId = uuidv4();

    // Validate configuration
    const validatedConfig = experimentConfigSchema.parse(config);

    // Ensure variant allocations sum to 1
    const totalAllocation = validatedConfig.variants.reduce(
      (sum, v) => sum + v.allocation,
      0
    );
    if (Math.abs(totalAllocation - 1) > 0.001) {
      throw new Error("Variant allocations must sum to 1");
    }

    // Initialize Bayesian priors for bandit experiments
    if (validatedConfig.settings.type === "bandit") {
      this.initializeBayesianState(
        experimentId,
        validatedConfig.variants.length
      );
    }

    // Store experiment
    const { error } = await this.supabase.from("ab_experiments").insert({
      id: experimentId,
      project_id: projectId,
      name: validatedConfig.name,
      description: validatedConfig.description,
      hypothesis: validatedConfig.hypothesis,
      config: validatedConfig,
      status: "draft",
      created_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Failed to create experiment: ${error.message}`);
    }

    return { id: experimentId, status: "draft" };
  }

  /**
   * Start an experiment
   */
  async startExperiment(experimentId: string): Promise<void> {
    const { data: experiment, error } = await this.supabase
      .from("ab_experiments")
      .select("*")
      .eq("id", experimentId)
      .single();

    if (error || !experiment) {
      throw new Error("Experiment not found");
    }

    if (experiment.status !== "draft") {
      throw new Error("Experiment must be in draft status to start");
    }

    // Update status
    await this.supabase
      .from("ab_experiments")
      .update({
        status: "running",
        started_at: new Date().toISOString(),
      })
      .eq("id", experimentId);

    // Start monitoring
    this.activeExperiments.set(experimentId, {
      config: experiment.config as ExperimentConfig,
      startTime: Date.now(),
      assignments: new Map(),
    });

    // Schedule periodic analysis
    this.scheduleAnalysis(experimentId);
  }

  /**
   * Assign user to variant
   */
  async assignVariant(
    experimentId: string,
    userId: string,
    context?: Record<string, any>
  ): Promise<{ variantId: string; variant: any }> {
    const experiment = this.activeExperiments.get(experimentId);
    if (!experiment) {
      throw new Error("Experiment not active");
    }

    // Check if user already assigned
    const existingAssignment = await this.getUserAssignment(
      experimentId,
      userId
    );
    if (existingAssignment) {
      return existingAssignment;
    }

    // Determine variant based on experiment type
    let variantId: string;
    if (experiment.config.settings.type === "bandit") {
      variantId = await this.thompsonSampling(
        experimentId,
        experiment.config.variants
      );
    } else {
      variantId = this.randomAssignment(experiment.config.variants, userId);
    }

    // Store assignment
    await this.supabase.from("ab_assignments").insert({
      experiment_id: experimentId,
      user_id: userId,
      variant_id: variantId,
      context,
      assigned_at: new Date().toISOString(),
    });

    const variant = experiment.config.variants.find(
      (v: any) => v.id === variantId
    );
    return { variantId, variant };
  }

  /**
   * Track experiment event
   */
  async trackEvent(
    experimentId: string,
    userId: string,
    eventType: string,
    value?: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    const assignment = await this.getUserAssignment(experimentId, userId);
    if (!assignment) {
      return; // User not in experiment
    }

    // Store event
    await this.supabase.from("ab_events").insert({
      experiment_id: experimentId,
      user_id: userId,
      variant_id: assignment.variantId,
      event_type: eventType,
      value,
      metadata,
      timestamp: new Date().toISOString(),
    });

    // Update Bayesian state for bandits
    const experiment = this.activeExperiments.get(experimentId);
    if (experiment?.config.settings.type === "bandit") {
      await this.updateBayesianState(
        experimentId,
        assignment.variantId,
        eventType,
        value
      );
    }
  }

  /**
   * Analyze experiment results
   */
  async analyzeExperiment(experimentId: string): Promise<{
    status: string;
    results: ExperimentResult[];
    winner?: string;
    recommendation: string;
  }> {
    const { data: experiment } = await this.supabase
      .from("ab_experiments")
      .select("*")
      .eq("id", experimentId)
      .single();

    if (!experiment) {
      throw new Error("Experiment not found");
    }

    // Get all events
    const { data: events } = await this.supabase
      .from("ab_events")
      .select("*")
      .eq("experiment_id", experimentId);

    if (!events || events.length === 0) {
      return {
        status: "insufficient_data",
        results: [],
        recommendation: "Continue collecting data",
      };
    }

    // Calculate results for each variant
    const results = await Promise.all(
      (experiment.config as ExperimentConfig).variants.map((variant: any) =>
        this.calculateVariantResults(
          variant.id,
          events.filter(e => e.variant_id === variant.id),
          experiment.config
        )
      )
    );

    // Determine winner
    const analysis = this.performStatisticalAnalysis(
      results,
      experiment.config
    );

    // Check for early stopping
    const config = experiment.config as ExperimentConfig;
    if (config.settings.enableEarlyStopping) {
      const shouldStop = await this.checkEarlyStopping(results, config);
      if (shouldStop) {
        await this.stopExperiment(experimentId, analysis.winner);
      }
    }

    return {
      status: analysis.status,
      results,
      winner: analysis.winner,
      recommendation: analysis.recommendation,
    };
  }

  /**
   * Initialize Bayesian state for multi-armed bandit
   */
  private initializeBayesianState(
    experimentId: string,
    numVariants: number
  ): void {
    this.bayesianStates.set(experimentId, {
      alpha: Array(numVariants).fill(1), // successes + 1
      beta: Array(numVariants).fill(1), // failures + 1
      samples: Array(numVariants).fill(0),
    });
  }

  /**
   * Thompson sampling for variant selection
   */
  private async thompsonSampling(
    experimentId: string,
    variants: any[]
  ): Promise<string> {
    const state = this.bayesianStates.get(experimentId);
    if (!state) {
      throw new Error("Bayesian state not initialized");
    }

    // Sample from Beta distributions
    const samples = variants.map((_, i) =>
      this.sampleBeta(state.alpha[i] || 1, state.beta[i] || 1)
    );

    // Select variant with highest sample
    const maxIndex = samples.indexOf(Math.max(...samples));
    if (state.samples[maxIndex] !== undefined) {
      state.samples[maxIndex]++;
    }

    return variants[maxIndex].id;
  }

  /**
   * Update Bayesian state based on observed outcome
   */
  private async updateBayesianState(
    experimentId: string,
    variantId: string,
    eventType: string,
    value?: number
  ): Promise<void> {
    const state = this.bayesianStates.get(experimentId);
    const experiment = this.activeExperiments.get(experimentId);

    if (!state || !experiment) return;

    const variantIndex = experiment.config.variants.findIndex(
      (v: any) => v.id === variantId
    );

    if (variantIndex === -1) return;

    // Update based on success/failure
    const config = experiment.config as ExperimentConfig;
    const isSuccess = this.isSuccessEvent(eventType, value, config);
    if (isSuccess) {
      state.alpha[variantIndex]++;
    } else {
      state.beta[variantIndex]++;
    }
  }

  /**
   * Random variant assignment
   */
  private randomAssignment(variants: any[], userId: string): string {
    // Use consistent hashing for deterministic assignment
    const hash = this.hashUserId(userId);
    const random = hash / 0xffffffff; // normalize to 0-1

    let cumulative = 0;
    for (const variant of variants) {
      cumulative += variant.allocation;
      if (random < cumulative) {
        return variant.id;
      }
    }

    return variants[variants.length - 1].id;
  }

  /**
   * Calculate results for a variant
   */
  private async calculateVariantResults(
    variantId: string,
    events: any[],
    config: any
  ): Promise<ExperimentResult> {
    const primaryMetric = config.metrics.primary;
    const relevantEvents = events.filter(e => e.event_type === primaryMetric);

    // Calculate conversion rate
    const uniqueUsers = new Set(events.map(e => e.user_id)).size;
    const conversions = relevantEvents.length;
    const conversionRate = uniqueUsers > 0 ? conversions / uniqueUsers : 0;

    // Calculate variance
    const variance = (conversionRate * (1 - conversionRate)) / uniqueUsers;

    // Calculate confidence interval
    const zScore = this.getZScore(config.settings.confidenceLevel);
    const margin = zScore * Math.sqrt(variance);
    const confidenceInterval: [number, number] = [
      Math.max(0, conversionRate - margin),
      Math.min(1, conversionRate + margin),
    ];

    // Calculate probability of being best (for Bayesian)
    const probability = await this.calculateProbabilityBest(variantId, config);

    return {
      variantId,
      sampleSize: uniqueUsers,
      metrics: {
        [primaryMetric]: {
          value: conversionRate,
          variance,
          confidenceInterval,
        },
      },
      probability,
      uplift: 0, // calculated relative to control
      significance: 0, // calculated in statistical analysis
    };
  }

  /**
   * Perform statistical analysis
   */
  private performStatisticalAnalysis(
    results: ExperimentResult[],
    config: any
  ): any {
    if (results.length < 2) {
      return {
        status: "insufficient_variants",
        recommendation: "Need at least 2 variants for comparison",
      };
    }

    // Find control variant (first one by convention)
    const control = results[0];
    if (!control) {
      return {
        status: "insufficient_data",
        recommendation: "No control variant found",
      };
    }

    const primaryMetric = config.metrics.primary;

    // Calculate statistics for each variant
    const analysisResults = results.map(result => {
      if (result.variantId === control.variantId) {
        return { ...result, uplift: 0, significance: 1 };
      }

      // Calculate uplift
      const controlMetric = control.metrics[primaryMetric];
      const variantMetric = result.metrics[primaryMetric];
      if (!controlMetric || !variantMetric) {
        return { ...result, uplift: 0, significance: 0 };
      }

      const controlValue = controlMetric.value;
      const variantValue = variantMetric.value;
      const uplift =
        controlValue > 0
          ? ((variantValue - controlValue) / controlValue) * 100
          : 0;

      // Calculate significance
      const significance = this.calculateSignificance(
        control,
        result,
        primaryMetric,
        config
      );

      return { ...result, uplift, significance };
    });

    // Determine winner
    const significantResults = analysisResults.filter(
      r => r.significance >= config.settings.confidenceLevel && r.uplift > 0
    );

    let winner: string | undefined;
    let recommendation: string;

    if (significantResults.length > 0) {
      // Sort by uplift
      significantResults.sort((a, b) => b.uplift - a.uplift);
      winner = significantResults[0].variantId;
      recommendation = `Variant ${winner} is the winner with ${significantResults[0].uplift.toFixed(1)}% uplift`;
    } else {
      // Check sample size
      const minSampleReached = results.every(
        r => r.sampleSize >= config.schedule.minSampleSize
      );

      if (!minSampleReached) {
        recommendation =
          "Continue collecting data to reach minimum sample size";
      } else {
        recommendation =
          "No significant difference detected. Consider stopping the experiment.";
      }
    }

    return {
      status: winner ? "winner_found" : "no_winner",
      winner,
      recommendation,
      results: analysisResults,
    };
  }

  /**
   * Calculate statistical significance
   */
  private calculateSignificance(
    control: ExperimentResult,
    variant: ExperimentResult,
    metric: string,
    config: any
  ): number {
    const controlMetric = control.metrics[metric];
    const variantMetric = variant.metrics[metric];

    if (!controlMetric || !variantMetric) {
      return 0;
    }

    if (config.settings.statisticalMethod === "bayesian") {
      // Use probability of being best
      return variant.probability;
    } else {
      // Frequentist approach - Z-test
      const pooledVariance =
        (controlMetric.variance * control.sampleSize +
          variantMetric.variance * variant.sampleSize) /
        (control.sampleSize + variant.sampleSize);

      const standardError = Math.sqrt(
        pooledVariance * (1 / control.sampleSize + 1 / variant.sampleSize)
      );

      if (standardError === 0) return 0;

      const zStat =
        Math.abs(variantMetric.value - controlMetric.value) / standardError;
      const pValue = 2 * (1 - this.normalCDF(zStat));

      return 1 - pValue;
    }
  }

  /**
   * Check if experiment should stop early
   */
  private async checkEarlyStopping(
    results: ExperimentResult[],
    config: any
  ): Promise<boolean> {
    // Check guardrail metrics
    if (config.metrics.guardrails) {
      for (const guardrail of config.metrics.guardrails) {
        const violated = results.some(result => {
          const metric = result.metrics[guardrail.metric];
          if (!metric) return false;

          if (guardrail.direction === "increase") {
            return metric.value < guardrail.threshold;
          } else {
            return metric.value > guardrail.threshold;
          }
        });

        if (violated) {
          return true; // Stop due to guardrail violation
        }
      }
    }

    // Check for futility
    const maxPossibleEffect = this.calculateMaxPossibleEffect(results, config);
    if (maxPossibleEffect < config.settings.minimumDetectableEffect) {
      return true; // Stop due to futility
    }

    // Check for overwhelming evidence
    const highestProbability = Math.max(...results.map(r => r.probability));
    if (highestProbability > 0.99) {
      return true; // Stop due to overwhelming evidence
    }

    return false;
  }

  /**
   * Stop an experiment
   */
  private async stopExperiment(
    experimentId: string,
    winnerId?: string
  ): Promise<void> {
    await this.supabase
      .from("ab_experiments")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        winner_id: winnerId,
      })
      .eq("id", experimentId);

    this.activeExperiments.delete(experimentId);
    this.bayesianStates.delete(experimentId);
  }

  /**
   * Schedule periodic analysis
   */
  private scheduleAnalysis(experimentId: string): void {
    const analyzeInterval = setInterval(async () => {
      try {
        const analysis = await this.analyzeExperiment(experimentId);

        // Store analysis results
        await this.supabase.from("ab_analyses").insert({
          experiment_id: experimentId,
          results: analysis,
          analyzed_at: new Date().toISOString(),
        });

        // Check if experiment should stop
        if (
          analysis.status === "winner_found" ||
          analysis.status === "stopped"
        ) {
          clearInterval(analyzeInterval);
        }
      } catch (error) {
        console.error("Analysis failed:", error);
      }
    }, 3600000); // Run every hour
  }

  // Helper methods
  private async getUserAssignment(
    experimentId: string,
    userId: string
  ): Promise<{ variantId: string; variant: any } | null> {
    const { data } = await this.supabase
      .from("ab_assignments")
      .select("variant_id")
      .eq("experiment_id", experimentId)
      .eq("user_id", userId)
      .single();

    if (!data) return null;

    const experiment = this.activeExperiments.get(experimentId);
    const variant = experiment?.config.variants.find(
      (v: any) => v.id === data.variant_id
    );

    return variant ? { variantId: data.variant_id as string, variant } : null;
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private sampleBeta(alpha: number, beta: number): number {
    // Thompson sampling from Beta distribution
    // Using inverse transform sampling
    const x = Math.random();
    return this.betaInverseCDF(x, alpha, beta);
  }

  private betaInverseCDF(p: number, alpha: number, beta: number): number {
    // Simplified - in production use proper statistical library
    // This is an approximation for demonstration
    return p; // Would use actual inverse CDF calculation
  }

  private isSuccessEvent(eventType: string, value: any, config: any): boolean {
    // Define success based on metric type
    const primaryMetric = config.metrics.primary;
    return eventType === primaryMetric && (!value || value > 0);
  }

  private async calculateProbabilityBest(
    variantId: string,
    config: any
  ): Promise<number> {
    // Simplified probability calculation
    // In production, use Monte Carlo simulation
    return Math.random(); // Placeholder
  }

  private getZScore(confidenceLevel: number): number {
    const zScores: Record<number, number> = {
      0.8: 1.282,
      0.85: 1.44,
      0.9: 1.645,
      0.95: 1.96,
      0.99: 2.576,
    };
    return zScores[confidenceLevel] || 1.96;
  }

  private normalCDF(z: number): number {
    // Approximation of normal CDF
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp((-z * z) / 2);
    const p =
      d *
      t *
      (0.3193815 +
        t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - p : p;
  }

  private calculateMaxPossibleEffect(
    results: ExperimentResult[],
    config: any
  ): number {
    // Calculate maximum possible effect given current data
    // Used for futility analysis
    const control = results[0];
    if (!control) return 0;

    const maxUplift = results.slice(1).reduce((max, result) => {
      const resultMetric = result.metrics[config.metrics.primary];
      const controlMetric = control.metrics[config.metrics.primary];

      if (!resultMetric || !controlMetric) return max;

      const upperBound = resultMetric.confidenceInterval[1];
      const controlValue = controlMetric.value;
      const possibleUplift =
        controlValue > 0
          ? ((upperBound - controlValue) / controlValue) * 100
          : 0;
      return Math.max(max, possibleUplift);
    }, 0);

    return maxUplift;
  }

  /**
   * Get experiment recommendations
   */
  async getRecommendations(projectId: string): Promise<any[]> {
    // Analyze historical experiments to suggest new ones
    const { data: experiments } = await this.supabase
      .from("ab_experiments")
      .select("*")
      .eq("project_id", projectId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(10);

    if (!experiments || experiments.length === 0) {
      return this.getDefaultRecommendations();
    }

    // Analyze patterns
    const recommendations = [];

    // Look for successful patterns
    const winners = experiments.filter(e => e.winner_id);
    if (winners.length > 0) {
      const winningPatterns = this.analyzeWinningPatterns(winners);
      recommendations.push(...winningPatterns);
    }

    // Identify untested areas
    const untestedAreas = this.identifyUntestedAreas(experiments);
    recommendations.push(...untestedAreas);

    return recommendations;
  }

  private getDefaultRecommendations(): any[] {
    return [
      {
        type: "headline_testing",
        title: "Test Different Headline Formulas",
        description: "Try questions vs. statements, numbers vs. words",
        expectedImpact: "15-30% CTR improvement",
        difficulty: "low",
      },
      {
        type: "cta_optimization",
        title: "Optimize Call-to-Action Buttons",
        description: "Test button colors, text, and placement",
        expectedImpact: "10-25% conversion improvement",
        difficulty: "low",
      },
      {
        type: "content_length",
        title: "Test Content Length Impact",
        description: "Compare short vs. long-form content performance",
        expectedImpact: "20-40% engagement improvement",
        difficulty: "medium",
      },
    ];
  }

  private analyzeWinningPatterns(winners: any[]): any[] {
    // Analyze what made variants win
    const patterns = new Map<string, number>();

    for (const experiment of winners) {
      const winningVariant = experiment.config.variants.find(
        (v: any) => v.id === experiment.winner_id
      );

      if (winningVariant?.config) {
        Object.entries(winningVariant.config).forEach(([key, value]) => {
          const pattern = `${key}:${value}`;
          patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
        });
      }
    }

    // Convert to recommendations
    return Array.from(patterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([pattern, count]) => ({
        type: "pattern_based",
        title: `Apply Winning Pattern: ${pattern}`,
        description: `This pattern won in ${count} experiments`,
        expectedImpact: "Based on historical data",
        difficulty: "low",
      }));
  }

  private identifyUntestedAreas(experiments: any[]): any[] {
    const testedTypes = new Set(experiments.map(e => e.config.settings.type));
    const recommendations = [];

    if (!testedTypes.has("bandit")) {
      recommendations.push({
        type: "methodology",
        title: "Try Multi-Armed Bandit Testing",
        description: "Automatically allocate traffic to winning variants",
        expectedImpact: "Faster convergence, less opportunity cost",
        difficulty: "medium",
      });
    }

    return recommendations;
  }
}

// Export singleton instance
export const automatedABTesting = new AutomatedABTestingFramework();
