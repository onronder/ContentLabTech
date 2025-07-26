/**
 * Enterprise A/B Testing Framework
 * Statistical significance testing, experiment design, and treatment/control group management
 */

import { createClient } from "@supabase/supabase-js";
import {
  statisticalEngine,
  type HypothesisTestResult,
} from "./statistical-engine";
import { dataValidationService } from "./data-validation";
import { getSupabaseEnv } from "@/lib/supabase/env-helper";

export interface ExperimentConfig {
  experimentId: string;
  name: string;
  description: string;
  hypothesis: string;

  // Experiment design
  trafficAllocation: number; // Percentage of traffic to include (0-100)
  treatments: ExperimentTreatment[];

  // Statistical parameters
  minimumSampleSize: number;
  minimumDetectableEffect: number; // Minimum effect size to detect
  statisticalPower: number; // Usually 0.8 (80%)
  significanceLevel: number; // Usually 0.05 (5%)

  // Duration and timing
  startDate: string;
  endDate?: string;
  maxDuration: number; // Maximum days to run

  // Success metrics
  primaryMetric: string;
  secondaryMetrics: string[];

  // Segment filters
  targetAudience?: {
    userTypes?: string[];
    geoLocations?: string[];
    deviceTypes?: string[];
    customFilters?: Record<string, unknown>;
  };

  status: "draft" | "active" | "paused" | "completed" | "terminated";
}

export interface ExperimentTreatment {
  treatmentId: string;
  name: string;
  description: string;
  allocation: number; // Percentage allocation (should sum to 100 across all treatments)
  isControl: boolean;
  configuration: Record<string, unknown>;
}

export interface ExperimentResult {
  experimentId: string;
  treatmentId: string;

  // Sample statistics
  sampleSize: number;
  conversionRate: number;
  averageValue: number;
  standardDeviation: number;
  confidence: number;

  // Metric values
  primaryMetricValue: number;
  secondaryMetricValues: Record<string, number>;

  // Statistical analysis
  statisticalSignificance: HypothesisTestResult;
  effectSize: number;
  confidenceInterval: [number, number];

  // Time series data
  dailyMetrics: Array<{
    date: string;
    participants: number;
    conversions: number;
    conversionRate: number;
    averageValue: number;
  }>;

  lastUpdated: string;
}

export interface ExperimentAnalysis {
  experimentId: string;
  overallStatus:
    | "insufficient_data"
    | "inconclusive"
    | "significant"
    | "complete";

  // Statistical analysis
  hasStatisticalPower: boolean;
  hasReachedMinimumSample: boolean;
  hasDetectedSignificantEffect: boolean;

  // Treatment comparisons
  treatmentComparisons: Array<{
    treatmentA: string;
    treatmentB: string;
    pValue: number;
    effectSize: number;
    confidence: number;
    winner?: "A" | "B" | "inconclusive";
    recommendation: string;
  }>;

  // Recommendations
  recommendation:
    | "continue"
    | "stop_winner"
    | "stop_no_effect"
    | "extend_duration";
  reasoning: string[];

  // Forecast
  projectedCompletionDate?: string;
  projectedSampleSize?: number;

  analyzedAt: string;
}

export interface UserAssignment {
  userId: string;
  experimentId: string;
  treatmentId: string;
  assignedAt: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export class ABTestingFramework {
  private supabase: ReturnType<typeof createClient>;
  private static instance: ABTestingFramework;

  private constructor() {
    const env = getSupabaseEnv();
    this.supabase = createClient(env.url, env.serviceRoleKey);
  }

  public static getInstance(): ABTestingFramework {
    if (!ABTestingFramework.instance) {
      ABTestingFramework.instance = new ABTestingFramework();
    }
    return ABTestingFramework.instance;
  }

  /**
   * Create a new A/B test experiment with proper power analysis
   */
  public async createExperiment(
    config: Omit<ExperimentConfig, "experimentId" | "status">
  ): Promise<ExperimentConfig> {
    // Validate experiment configuration
    this.validateExperimentConfig(config);

    // Calculate required sample size based on power analysis
    const requiredSampleSize = this.calculateRequiredSampleSize(
      config.minimumDetectableEffect,
      config.statisticalPower,
      config.significanceLevel
    );

    const experiment: ExperimentConfig = {
      ...config,
      experimentId: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      minimumSampleSize: Math.max(config.minimumSampleSize, requiredSampleSize),
      status: "draft",
    };

    // Store experiment configuration
    const { error } = await this.supabase.from("ab_experiments").insert({
      experiment_id: experiment.experimentId,
      name: experiment.name,
      description: experiment.description,
      hypothesis: experiment.hypothesis,
      config: experiment,
      status: experiment.status,
      created_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Failed to create experiment: ${error.message}`);
    }

    console.log(
      `Created A/B test experiment: ${experiment.name} (${experiment.experimentId})`
    );

    return experiment;
  }

  /**
   * Start an experiment and begin user assignment
   */
  public async startExperiment(experimentId: string): Promise<void> {
    const { data: experiment, error } = await this.supabase
      .from("ab_experiments")
      .select("*")
      .eq("experiment_id", experimentId)
      .single();

    if (error || !experiment) {
      throw new Error("Experiment not found");
    }

    const config = experiment.config as ExperimentConfig;

    // Validate experiment can be started
    if (config.status !== "draft") {
      throw new Error(`Cannot start experiment in status: ${config.status}`);
    }

    // Update experiment status
    const { error: updateError } = await this.supabase
      .from("ab_experiments")
      .update({
        status: "active",
        started_at: new Date().toISOString(),
      })
      .eq("experiment_id", experimentId);

    if (updateError) {
      throw new Error(`Failed to start experiment: ${updateError.message}`);
    }

    console.log(`Started A/B test experiment: ${experimentId}`);
  }

  /**
   * Assign user to treatment group using deterministic randomization
   */
  public async assignUserToTreatment(
    experimentId: string,
    userId: string,
    sessionId?: string,
    userMetadata?: Record<string, unknown>
  ): Promise<UserAssignment | null> {
    // Get active experiment
    const { data: experiment, error } = await this.supabase
      .from("ab_experiments")
      .select("*")
      .eq("experiment_id", experimentId)
      .eq("status", "active")
      .single();

    if (error || !experiment) {
      return null; // Experiment not active
    }

    const config = experiment.config as ExperimentConfig;

    // Check if user already assigned
    const { data: existingAssignment } = await this.supabase
      .from("ab_user_assignments")
      .select("*")
      .eq("experiment_id", experimentId)
      .eq("user_id", userId)
      .single();

    if (existingAssignment) {
      return {
        userId: existingAssignment.user_id as string,
        experimentId: existingAssignment.experiment_id as string,
        treatmentId: existingAssignment.treatment_id as string,
        assignedAt: existingAssignment.assigned_at as string,
        sessionId: existingAssignment.session_id as string | undefined,
        metadata: existingAssignment.metadata as
          | Record<string, unknown>
          | undefined,
      };
    }

    // Check if user meets targeting criteria
    if (!this.isUserEligible(config, userMetadata)) {
      return null;
    }

    // Determine if user should be included based on traffic allocation
    const userHash = this.hashUserId(userId, experimentId);
    if (userHash > config.trafficAllocation / 100) {
      return null; // User not included in experiment
    }

    // Assign to treatment group using deterministic randomization
    const treatmentId = this.assignTreatment(config.treatments, userHash);

    const assignment: UserAssignment = {
      userId,
      experimentId,
      treatmentId,
      assignedAt: new Date().toISOString(),
      sessionId,
      metadata: userMetadata,
    };

    // Store assignment
    const { error: insertError } = await this.supabase
      .from("ab_user_assignments")
      .insert({
        user_id: assignment.userId,
        experiment_id: assignment.experimentId,
        treatment_id: assignment.treatmentId,
        assigned_at: assignment.assignedAt,
        session_id: assignment.sessionId,
        metadata: assignment.metadata,
      });

    if (insertError) {
      console.error("Failed to store user assignment:", insertError);
      return null;
    }

    return assignment;
  }

  /**
   * Record experiment event (conversion, metric value, etc.)
   */
  public async recordEvent(
    experimentId: string,
    userId: string,
    eventType: string,
    value?: number,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    // Verify user is assigned to experiment
    const { data: assignment } = await this.supabase
      .from("ab_user_assignments")
      .select("treatment_id")
      .eq("experiment_id", experimentId)
      .eq("user_id", userId)
      .single();

    if (!assignment) {
      return; // User not in experiment
    }

    // Record event
    const { error } = await this.supabase.from("ab_experiment_events").insert({
      experiment_id: experimentId,
      user_id: userId,
      treatment_id: assignment.treatment_id,
      event_type: eventType,
      event_value: value || 0,
      metadata,
      recorded_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Failed to record experiment event:", error);
    }
  }

  /**
   * Analyze experiment results with statistical significance testing
   */
  public async analyzeExperiment(
    experimentId: string
  ): Promise<ExperimentAnalysis> {
    // Get experiment configuration
    const { data: experiment } = await this.supabase
      .from("ab_experiments")
      .select("*")
      .eq("experiment_id", experimentId)
      .single();

    if (!experiment) {
      throw new Error("Experiment not found");
    }

    const config = experiment.config as ExperimentConfig;

    // Get experiment results for each treatment
    const treatmentResults = await Promise.all(
      config.treatments.map(treatment =>
        this.calculateTreatmentResults(
          experimentId,
          treatment.treatmentId,
          config.primaryMetric
        )
      )
    );

    // Perform statistical analysis
    const analysis = await this.performStatisticalAnalysis(
      config,
      treatmentResults
    );

    return analysis;
  }

  /**
   * Get current experiment results
   */
  public async getExperimentResults(
    experimentId: string
  ): Promise<ExperimentResult[]> {
    const { data: experiment } = await this.supabase
      .from("ab_experiments")
      .select("*")
      .eq("experiment_id", experimentId)
      .single();

    if (!experiment) {
      throw new Error("Experiment not found");
    }

    const config = experiment.config as ExperimentConfig;

    return Promise.all(
      config.treatments.map(treatment =>
        this.calculateTreatmentResults(
          experimentId,
          treatment.treatmentId,
          config.primaryMetric
        )
      )
    );
  }

  /**
   * Stop experiment and declare winner
   */
  public async stopExperiment(
    experimentId: string,
    reason: string,
    winnerTreatmentId?: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from("ab_experiments")
      .update({
        status: "completed",
        ended_at: new Date().toISOString(),
        winner_treatment_id: winnerTreatmentId,
        stop_reason: reason,
      })
      .eq("experiment_id", experimentId);

    if (error) {
      throw new Error(`Failed to stop experiment: ${error.message}`);
    }

    console.log(
      `Stopped A/B test experiment: ${experimentId}, Winner: ${winnerTreatmentId || "None"}`
    );
  }

  // Private helper methods

  private validateExperimentConfig(
    config: Omit<ExperimentConfig, "experimentId" | "status">
  ): void {
    if (config.treatments.length < 2) {
      throw new Error("Experiment must have at least 2 treatments");
    }

    const totalAllocation = config.treatments.reduce(
      (sum, t) => sum + t.allocation,
      0
    );
    if (Math.abs(totalAllocation - 100) > 0.01) {
      throw new Error("Treatment allocations must sum to 100");
    }

    const controlTreatments = config.treatments.filter(t => t.isControl);
    if (controlTreatments.length !== 1) {
      throw new Error("Experiment must have exactly one control treatment");
    }

    if (config.trafficAllocation < 1 || config.trafficAllocation > 100) {
      throw new Error("Traffic allocation must be between 1 and 100");
    }

    if (config.significanceLevel < 0.01 || config.significanceLevel > 0.1) {
      throw new Error("Significance level must be between 0.01 and 0.1");
    }

    if (config.statisticalPower < 0.5 || config.statisticalPower > 0.99) {
      throw new Error("Statistical power must be between 0.5 and 0.99");
    }
  }

  private calculateRequiredSampleSize(
    effectSize: number,
    power: number,
    alpha: number
  ): number {
    // Simplified sample size calculation for two-proportion z-test
    // In production, use proper power analysis libraries

    const zAlpha = statisticalEngine["getZCritical"](1 - alpha / 2);
    const zBeta = statisticalEngine["getZCritical"](power);

    // Assume baseline conversion rate of 10% for calculation
    const p1 = 0.1;
    const p2 = p1 * (1 + effectSize);
    const pPooled = (p1 + p2) / 2;

    const numerator = Math.pow(zAlpha + zBeta, 2) * 2 * pPooled * (1 - pPooled);
    const denominator = Math.pow(p2 - p1, 2);

    return Math.ceil(numerator / denominator);
  }

  private isUserEligible(
    config: ExperimentConfig,
    userMetadata?: Record<string, unknown>
  ): boolean {
    if (!config.targetAudience) {
      return true;
    }

    const audience = config.targetAudience;

    // Check user type filter
    if (audience.userTypes && userMetadata?.userType) {
      if (!audience.userTypes.includes(userMetadata.userType as string)) {
        return false;
      }
    }

    // Check geo location filter
    if (audience.geoLocations && userMetadata?.geoLocation) {
      if (!audience.geoLocations.includes(userMetadata.geoLocation as string)) {
        return false;
      }
    }

    // Check device type filter
    if (audience.deviceTypes && userMetadata?.deviceType) {
      if (!audience.deviceTypes.includes(userMetadata.deviceType as string)) {
        return false;
      }
    }

    // Check custom filters
    if (audience.customFilters && userMetadata) {
      for (const [key, expectedValue] of Object.entries(
        audience.customFilters
      )) {
        if (userMetadata[key] !== expectedValue) {
          return false;
        }
      }
    }

    return true;
  }

  private hashUserId(userId: string, experimentId: string): number {
    // Simple hash function for deterministic randomization
    const input = `${userId}-${experimentId}`;
    let hash = 0;

    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Convert to 0-1 range
    return Math.abs(hash) / 2147483647;
  }

  private assignTreatment(
    treatments: ExperimentTreatment[],
    userHash: number
  ): string {
    let cumulativeAllocation = 0;

    for (const treatment of treatments) {
      cumulativeAllocation += treatment.allocation / 100;
      if (userHash <= cumulativeAllocation) {
        return treatment.treatmentId;
      }
    }

    // Fallback to last treatment
    return (
      treatments[treatments.length - 1]?.treatmentId ||
      treatments[0]?.treatmentId ||
      "default"
    );
  }

  private async calculateTreatmentResults(
    experimentId: string,
    treatmentId: string,
    primaryMetric: string
  ): Promise<ExperimentResult> {
    // Get user assignments for this treatment
    const { data: assignments } = await this.supabase
      .from("ab_user_assignments")
      .select("user_id")
      .eq("experiment_id", experimentId)
      .eq("treatment_id", treatmentId);

    const sampleSize = assignments?.length || 0;

    // Get events for this treatment
    const { data: events } = await this.supabase
      .from("ab_experiment_events")
      .select("*")
      .eq("experiment_id", experimentId)
      .eq("treatment_id", treatmentId);

    if (!events || sampleSize === 0) {
      return this.createEmptyResult(experimentId, treatmentId);
    }

    // Calculate primary metric
    const primaryMetricEvents = events.filter(
      e => e.event_type === primaryMetric
    );
    const conversionRate = primaryMetricEvents.length / sampleSize;
    const averageValue =
      primaryMetricEvents.length > 0
        ? primaryMetricEvents.reduce(
            (sum, e) => sum + (Number(e.event_value) || 0),
            0
          ) / primaryMetricEvents.length
        : 0;

    // Calculate standard deviation
    const values = primaryMetricEvents.map(e => Number(e.event_value) || 0);
    const variance =
      values.length > 1
        ? values.reduce(
            (sum, val) => sum + Math.pow(val - averageValue, 2),
            0
          ) /
          (values.length - 1)
        : 0;
    const standardDeviation = Math.sqrt(variance);

    // Calculate confidence interval for conversion rate
    const confidenceInterval = this.calculateConfidenceInterval(
      conversionRate,
      sampleSize,
      0.95
    );

    // Calculate daily metrics
    const dailyMetrics = this.calculateDailyMetrics(events, assignments || []);

    // Perform statistical significance test (will be compared with control later)
    const statisticalSignificance: HypothesisTestResult = {
      testStatistic: 0,
      pValue: 1,
      criticalValue: 1.96,
      rejectNull: false,
      confidenceLevel: 95,
      testType: "Two-proportion z-test",
    };

    return {
      experimentId,
      treatmentId,
      sampleSize,
      conversionRate: Math.round(conversionRate * 10000) / 100, // Convert to percentage
      averageValue: Math.round(averageValue * 100) / 100,
      standardDeviation: Math.round(standardDeviation * 100) / 100,
      confidence: 95,
      primaryMetricValue: averageValue,
      secondaryMetricValues: {},
      statisticalSignificance,
      effectSize: 0, // Will be calculated in comparison
      confidenceInterval,
      dailyMetrics,
      lastUpdated: new Date().toISOString(),
    };
  }

  private async performStatisticalAnalysis(
    config: ExperimentConfig,
    treatmentResults: ExperimentResult[]
  ): Promise<ExperimentAnalysis> {
    const controlResult = treatmentResults.find(
      r =>
        config.treatments.find(t => t.treatmentId === r.treatmentId)?.isControl
    );

    if (!controlResult) {
      throw new Error("Control treatment not found");
    }

    const treatmentComparisons = [];

    // Compare each treatment with control
    for (const result of treatmentResults) {
      if (result.treatmentId === controlResult.treatmentId) continue;

      // Perform statistical significance test
      const testResult = this.performTwoProportionTest(
        controlResult.sampleSize,
        controlResult.conversionRate / 100,
        result.sampleSize,
        result.conversionRate / 100,
        config.significanceLevel
      );

      // Calculate effect size (relative improvement)
      const effectSize =
        controlResult.conversionRate > 0
          ? (result.conversionRate - controlResult.conversionRate) /
            controlResult.conversionRate
          : 0;

      treatmentComparisons.push({
        treatmentA: controlResult.treatmentId,
        treatmentB: result.treatmentId,
        pValue: testResult.pValue,
        effectSize: Math.round(effectSize * 10000) / 100, // Convert to percentage
        confidence: (1 - testResult.pValue) * 100,
        winner: testResult.rejectNull
          ? result.conversionRate > controlResult.conversionRate
            ? ("B" as const)
            : ("A" as const)
          : ("inconclusive" as const),
        recommendation: this.generateRecommendation(
          testResult,
          effectSize,
          config
        ),
      });
    }

    // Determine overall status
    const hasReachedMinimumSample = treatmentResults.every(
      r => r.sampleSize >= config.minimumSampleSize
    );
    const hasDetectedSignificantEffect = treatmentComparisons.some(
      c => c.pValue < config.significanceLevel
    );
    const hasStatisticalPower = hasReachedMinimumSample; // Simplified

    let overallStatus: ExperimentAnalysis["overallStatus"];
    if (!hasReachedMinimumSample) {
      overallStatus = "insufficient_data";
    } else if (hasDetectedSignificantEffect) {
      overallStatus = "significant";
    } else {
      overallStatus = "inconclusive";
    }

    // Generate recommendation
    let recommendation: ExperimentAnalysis["recommendation"];
    const reasoning: string[] = [];

    if (!hasReachedMinimumSample) {
      recommendation = "continue";
      reasoning.push(
        "Sample size has not reached statistical significance threshold"
      );
    } else if (hasDetectedSignificantEffect) {
      const winner = treatmentComparisons.find(
        c => c.winner !== "inconclusive"
      );
      recommendation = "stop_winner";
      reasoning.push(
        `Significant effect detected (p < ${config.significanceLevel})`
      );
      if (winner) {
        reasoning.push(
          `Treatment ${winner.treatmentB} shows significant improvement`
        );
      }
    } else {
      recommendation = "stop_no_effect";
      reasoning.push("No significant effect detected with current sample size");
      reasoning.push("Consider increasing effect size or extending duration");
    }

    return {
      experimentId: config.experimentId,
      overallStatus,
      hasStatisticalPower,
      hasReachedMinimumSample,
      hasDetectedSignificantEffect,
      treatmentComparisons,
      recommendation,
      reasoning,
      analyzedAt: new Date().toISOString(),
    };
  }

  private createEmptyResult(
    experimentId: string,
    treatmentId: string
  ): ExperimentResult {
    return {
      experimentId,
      treatmentId,
      sampleSize: 0,
      conversionRate: 0,
      averageValue: 0,
      standardDeviation: 0,
      confidence: 95,
      primaryMetricValue: 0,
      secondaryMetricValues: {},
      statisticalSignificance: {
        testStatistic: 0,
        pValue: 1,
        criticalValue: 1.96,
        rejectNull: false,
        confidenceLevel: 95,
        testType: "Two-proportion z-test",
      },
      effectSize: 0,
      confidenceInterval: [0, 0],
      dailyMetrics: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  private calculateConfidenceInterval(
    proportion: number,
    sampleSize: number,
    confidenceLevel: number
  ): [number, number] {
    if (sampleSize === 0) return [0, 0];

    const z = 1.96; // 95% confidence
    const standardError = Math.sqrt(
      (proportion * (1 - proportion)) / sampleSize
    );
    const margin = z * standardError;

    return [
      Math.max(0, Math.round((proportion - margin) * 10000) / 100),
      Math.min(100, Math.round((proportion + margin) * 10000) / 100),
    ];
  }

  private calculateDailyMetrics(
    events: any[],
    assignments: any[]
  ): ExperimentResult["dailyMetrics"] {
    // Group events by date
    const dailyData = new Map<
      string,
      { conversions: number; totalParticipants: number }
    >();

    // Initialize with assignment dates
    assignments.forEach(assignment => {
      const date = assignment.assigned_at.split("T")[0];
      if (!dailyData.has(date)) {
        dailyData.set(date, { conversions: 0, totalParticipants: 0 });
      }
      dailyData.get(date)!.totalParticipants++;
    });

    // Add conversion events
    events.forEach(event => {
      const date = event.recorded_at.split("T")[0];
      if (dailyData.has(date)) {
        dailyData.get(date)!.conversions++;
      }
    });

    // Convert to array format
    return Array.from(dailyData.entries())
      .map(([date, data]) => ({
        date,
        participants: data.totalParticipants,
        conversions: data.conversions,
        conversionRate:
          data.totalParticipants > 0
            ? Math.round((data.conversions / data.totalParticipants) * 10000) /
              100
            : 0,
        averageValue: data.conversions, // Simplified
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private performTwoProportionTest(
    n1: number,
    p1: number,
    n2: number,
    p2: number,
    alpha: number
  ): HypothesisTestResult {
    if (n1 === 0 || n2 === 0) {
      return {
        testStatistic: 0,
        pValue: 1,
        criticalValue: 1.96,
        rejectNull: false,
        confidenceLevel: (1 - alpha) * 100,
        testType: "Two-proportion z-test",
      };
    }

    // Pooled proportion
    const pPooled = (n1 * p1 + n2 * p2) / (n1 + n2);

    // Standard error
    const standardError = Math.sqrt(
      pPooled * (1 - pPooled) * (1 / n1 + 1 / n2)
    );

    // Test statistic
    const zScore = standardError > 0 ? (p2 - p1) / standardError : 0;

    // P-value (two-tailed)
    const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)));

    // Critical value
    const criticalValue = 1.96; // For alpha = 0.05

    return {
      testStatistic: Math.round(zScore * 10000) / 10000,
      pValue: Math.round(pValue * 10000) / 10000,
      criticalValue,
      rejectNull: Math.abs(zScore) > criticalValue,
      confidenceLevel: (1 - alpha) * 100,
      testType: "Two-proportion z-test",
    };
  }

  private normalCDF(z: number): number {
    // Approximation of standard normal CDF
    return (1 + this.erf(z / Math.sqrt(2))) / 2;
  }

  private erf(x: number): number {
    // Approximation of error function
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y =
      1.0 -
      ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  private generateRecommendation(
    testResult: HypothesisTestResult,
    effectSize: number,
    config: ExperimentConfig
  ): string {
    if (testResult.rejectNull) {
      if (effectSize > config.minimumDetectableEffect) {
        return `Significant improvement detected (${effectSize.toFixed(2)}% effect size)`;
      } else {
        return "Statistically significant but effect size below threshold";
      }
    } else {
      return "No statistically significant difference detected";
    }
  }
}

// Export singleton instance
export const abTestingFramework = ABTestingFramework.getInstance();
