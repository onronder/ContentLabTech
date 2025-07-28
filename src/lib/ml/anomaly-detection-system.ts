/**
 * Anomaly Detection System
 * Real-time detection of unusual patterns in content performance and user behavior
 */

import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env-helper";
import { z } from "zod";
import { EventEmitter } from "events";

// Anomaly detection schemas
const anomalyConfigSchema = z.object({
  type: z.enum([
    "statistical",
    "ml_based",
    "rule_based",
    "time_series",
    "behavioral",
    "composite",
  ]),
  sensitivity: z.enum(["low", "medium", "high", "ultra"]),
  timeWindow: z.number().positive(), // minutes
  baseline: z.object({
    period: z.number().positive(), // days
    method: z.enum(["mean", "median", "percentile", "adaptive"]),
  }),
  thresholds: z.object({
    warning: z.number(),
    critical: z.number(),
    emergency: z.number(),
  }),
  features: z.array(z.string()),
  enabled: z.boolean(),
});

const anomalyAlertSchema = z.object({
  id: z.string(),
  type: z.enum([
    "traffic_spike",
    "traffic_drop",
    "engagement_anomaly",
    "conversion_drop",
    "security_threat",
    "data_quality",
    "performance_degradation",
    "user_behavior",
    "competitive_threat",
    "content_anomaly",
    "composite_anomaly",
  ]),
  severity: z.enum(["info", "warning", "critical", "emergency"]),
  score: z.number().min(0).max(1), // anomaly score
  confidence: z.number().min(0).max(1),
  timestamp: z.string().datetime(),
  data: z.record(z.unknown()),
  context: z.object({
    feature: z.string(),
    expectedValue: z.number(),
    actualValue: z.number(),
    deviation: z.number(),
    baselineStats: z.record(z.union([z.number(), z.string()])),
  }),
  recommendations: z.array(z.string()),
  status: z.enum(["new", "investigating", "resolved", "false_positive"]),
});

type AnomalyConfig = z.infer<typeof anomalyConfigSchema>;
type AnomalyAlert = z.infer<typeof anomalyAlertSchema>;

interface DetectorState {
  baseline: Map<string, number[]>;
  statistics: Map<string, any>;
  lastUpdate: Date;
  alertHistory: AnomalyAlert[];
}

interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

export class AnomalyDetectionSystem extends EventEmitter {
  private supabase: ReturnType<typeof createClient>;
  private detectors: Map<string, any> = new Map();
  private detectorStates: Map<string, DetectorState> = new Map();
  private isRunning = false;
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
    const env = getSupabaseEnv();
    this.supabase = createClient(env.url, env.serviceRoleKey);

    this.initializeDetectors();
  }

  /**
   * Start anomaly detection monitoring
   */
  async startMonitoring(
    projectId: string,
    configs: AnomalyConfig[]
  ): Promise<void> {
    if (this.isRunning) {
      console.warn("Anomaly detection already running");
      return;
    }

    this.isRunning = true;

    // Initialize detectors for each configuration
    for (const config of configs) {
      const detectorId = `${projectId}_${config.type}`;

      // Initialize detector state
      this.detectorStates.set(detectorId, {
        baseline: new Map(),
        statistics: new Map(),
        lastUpdate: new Date(),
        alertHistory: [],
      });

      // Start monitoring for this detector
      await this.startDetectorMonitoring(detectorId, projectId, config);
    }

    this.emit("monitoring:started", { projectId });
  }

  /**
   * Stop anomaly detection monitoring
   */
  async stopMonitoring(): Promise<void> {
    this.isRunning = false;

    // Clear all monitoring intervals
    for (const [detectorId, interval] of Array.from(
      this.monitoringIntervals.entries()
    )) {
      clearInterval(interval);
      this.monitoringIntervals.delete(detectorId);
    }

    this.emit("monitoring:stopped");
  }

  /**
   * Detect anomalies in real-time data point
   */
  async detectAnomalies(
    projectId: string,
    dataPoint: Record<string, any>,
    timestamp?: Date
  ): Promise<AnomalyAlert[]> {
    const alerts: AnomalyAlert[] = [];
    const ts = timestamp || new Date();

    // Run through all active detectors
    for (const [detectorId, detector] of Array.from(this.detectors.entries())) {
      if (!detectorId.startsWith(projectId)) continue;

      try {
        const detectedAnomalies = await detector.detect(dataPoint, ts);
        alerts.push(...detectedAnomalies);
      } catch (error) {
        console.error(`Detector ${detectorId} failed:`, error);
      }
    }

    // Process and enrich alerts
    const enrichedAlerts = await this.enrichAlerts(alerts, projectId);

    // Store alerts
    await this.storeAlerts(enrichedAlerts);

    // Emit alerts
    for (const alert of enrichedAlerts) {
      this.emit("anomaly:detected", alert);

      if (alert.severity === "critical" || alert.severity === "emergency") {
        this.emit("anomaly:critical", alert);
      }
    }

    return enrichedAlerts;
  }

  /**
   * Initialize anomaly detectors
   */
  private initializeDetectors(): void {
    // Statistical anomaly detector (Z-score based)
    this.detectors.set("statistical", this.createStatisticalDetector());

    // Time series anomaly detector
    this.detectors.set("time_series", this.createTimeSeriesDetector());

    // Behavioral anomaly detector
    this.detectors.set("behavioral", this.createBehavioralDetector());

    // ML-based anomaly detector
    this.detectors.set("ml_based", this.createMLBasedDetector());

    // Rule-based anomaly detector
    this.detectors.set("rule_based", this.createRuleBasedDetector());

    // Composite anomaly detector
    this.detectors.set("composite", this.createCompositeDetector());
  }

  /**
   * Create statistical anomaly detector
   */
  private createStatisticalDetector(): any {
    return {
      detect: async (
        dataPoint: any,
        timestamp: Date
      ): Promise<AnomalyAlert[]> => {
        const alerts: AnomalyAlert[] = [];

        // Z-score based detection
        for (const [feature, value] of Object.entries(dataPoint)) {
          if (typeof value !== "number") continue;

          const stats = await this.getFeatureStatistics(feature);
          if (!stats || stats.count < 30) continue; // Need minimum samples

          const zScore = Math.abs((value - stats.mean) / stats.stdDev);

          if (zScore > 3) {
            // 3-sigma rule
            alerts.push({
              id: `stat_${Date.now()}_${Math.random()}`,
              type: this.classifyAnomalyType(feature, value, stats),
              severity: zScore > 4 ? "critical" : "warning",
              score: Math.min(zScore / 6, 1), // Normalize to 0-1
              confidence: this.calculateConfidence(zScore, stats.count),
              timestamp: timestamp.toISOString(),
              data: { feature, value, zScore },
              context: {
                feature,
                expectedValue: stats.mean,
                actualValue: value,
                deviation: zScore,
                baselineStats: stats,
              },
              recommendations: this.generateStatisticalRecommendations(
                feature,
                zScore
              ),
              status: "new",
            });
          }
        }

        return alerts;
      },
    };
  }

  /**
   * Create time series anomaly detector
   */
  private createTimeSeriesDetector(): any {
    return {
      detect: async (
        dataPoint: any,
        timestamp: Date
      ): Promise<AnomalyAlert[]> => {
        const alerts: AnomalyAlert[] = [];

        for (const [feature, value] of Object.entries(dataPoint)) {
          if (typeof value !== "number") continue;

          // Get time series data
          const timeSeries = await this.getTimeSeriesData(feature, 168); // 1 week
          if (timeSeries.length < 24) continue; // Need minimum data

          // Detect seasonal patterns
          const seasonality = this.detectSeasonality(timeSeries);

          // Forecast expected value
          const forecast = this.forecastValue(
            timeSeries,
            timestamp,
            seasonality
          );

          // Calculate residual
          const residual = Math.abs(value - forecast.predicted);
          const threshold =
            forecast.confidenceInterval.upper - forecast.predicted;

          if (residual > threshold * 2) {
            alerts.push({
              id: `ts_${Date.now()}_${Math.random()}`,
              type: this.classifyTimeSeriesAnomaly(feature, value, forecast),
              severity: residual > threshold * 3 ? "critical" : "warning",
              score: Math.min(residual / (threshold * 4), 1),
              confidence: forecast.confidence,
              timestamp: timestamp.toISOString(),
              data: {
                feature,
                value,
                forecast: forecast.predicted,
                residual,
                seasonality,
              },
              context: {
                feature,
                expectedValue: forecast.predicted,
                actualValue: value,
                deviation: residual / threshold,
                baselineStats: forecast,
              },
              recommendations: this.generateTimeSeriesRecommendations(
                feature,
                residual,
                threshold
              ),
              status: "new",
            });
          }
        }

        return alerts;
      },
    };
  }

  /**
   * Create behavioral anomaly detector
   */
  private createBehavioralDetector(): any {
    return {
      detect: async (
        dataPoint: any,
        timestamp: Date
      ): Promise<AnomalyAlert[]> => {
        const alerts: AnomalyAlert[] = [];

        // User behavior patterns
        if (dataPoint.userId) {
          const userProfile = await this.getUserBehaviorProfile(
            dataPoint.userId
          );
          const currentBehavior = this.extractBehaviorFeatures(dataPoint);

          const behaviorScore = this.calculateBehaviorAnomalyScore(
            userProfile,
            currentBehavior
          );

          if (behaviorScore > 0.7) {
            alerts.push({
              id: `behavior_${Date.now()}_${Math.random()}`,
              type: "user_behavior",
              severity: behaviorScore > 0.9 ? "critical" : "warning",
              score: behaviorScore,
              confidence: 0.8,
              timestamp: timestamp.toISOString(),
              data: {
                userId: dataPoint.userId,
                currentBehavior,
                userProfile,
                behaviorScore,
              },
              context: {
                feature: "user_behavior",
                expectedValue: userProfile.normalScore || 0.5,
                actualValue: behaviorScore,
                deviation: behaviorScore - (userProfile.normalScore || 0.5),
                baselineStats: userProfile,
              },
              recommendations:
                this.generateBehaviorRecommendations(behaviorScore),
              status: "new",
            });
          }
        }

        // Session behavior patterns
        if (dataPoint.sessionId) {
          const sessionAnomaly = await this.detectSessionAnomaly(dataPoint);
          if (sessionAnomaly) {
            alerts.push(sessionAnomaly);
          }
        }

        return alerts;
      },
    };
  }

  /**
   * Create ML-based anomaly detector
   */
  private createMLBasedDetector(): any {
    return {
      detect: async (
        dataPoint: any,
        timestamp: Date
      ): Promise<AnomalyAlert[]> => {
        const alerts: AnomalyAlert[] = [];

        // Isolation Forest approach (simplified)
        const features = this.extractNumericalFeatures(dataPoint);
        if (features.length === 0) return alerts;

        // Get historical feature data
        const historicalData = await this.getHistoricalFeatureData(
          features.map(f => f.name)
        );

        // Calculate isolation score
        const isolationScore = this.calculateIsolationScore(
          features,
          historicalData
        );

        if (isolationScore > 0.6) {
          const anomalyType = this.classifyMLAnomaly(features, isolationScore);

          alerts.push({
            id: `ml_${Date.now()}_${Math.random()}`,
            type: anomalyType,
            severity: isolationScore > 0.8 ? "critical" : "warning",
            score: isolationScore,
            confidence: 0.75,
            timestamp: timestamp.toISOString(),
            data: {
              features,
              isolationScore,
              method: "isolation_forest",
            },
            context: {
              feature: "multivariate_pattern",
              expectedValue: 0.5, // Normal isolation score
              actualValue: isolationScore,
              deviation: isolationScore - 0.5,
              baselineStats: {
                method: "isolation_forest",
                dataPoints: historicalData.length.toString(),
              },
            },
            recommendations: this.generateMLRecommendations(
              anomalyType,
              isolationScore
            ),
            status: "new",
          });
        }

        return alerts;
      },
    };
  }

  /**
   * Create rule-based anomaly detector
   */
  private createRuleBasedDetector(): any {
    return {
      detect: async (
        dataPoint: any,
        timestamp: Date
      ): Promise<AnomalyAlert[]> => {
        const alerts: AnomalyAlert[] = [];

        // Define business rules
        const rules = [
          // Traffic spike rule
          {
            condition: (data: any) =>
              data.pageviews > 10000 && data.previousHourPageviews < 1000,
            type: "traffic_spike",
            severity: "warning" as const,
            message: "Unusual traffic spike detected",
          },

          // Conversion drop rule
          {
            condition: (data: any) =>
              data.conversionRate < 0.01 && data.previousDayConversion > 0.05,
            type: "conversion_drop",
            severity: "critical" as const,
            message: "Significant conversion rate drop",
          },

          // Security rule
          {
            condition: (data: any) =>
              data.failedLogins > 10 || data.suspiciousActivity === true,
            type: "security_threat",
            severity: "emergency" as const,
            message: "Potential security threat detected",
          },

          // Data quality rule
          {
            condition: (data: any) =>
              data.missingDataFields > 5 || data.dataConsistencyScore < 0.8,
            type: "data_quality",
            severity: "warning" as const,
            message: "Data quality issues detected",
          },
        ];

        // Evaluate rules
        for (const rule of rules) {
          if (rule.condition(dataPoint)) {
            alerts.push({
              id: `rule_${Date.now()}_${Math.random()}`,
              type: rule.type as AnomalyAlert["type"],
              severity: rule.severity,
              score: 0.8, // High confidence for rule-based detection
              confidence: 0.9,
              timestamp: timestamp.toISOString(),
              data: {
                rule: rule.message,
                triggeredCondition: rule.condition.toString(),
                dataPoint,
              },
              context: {
                feature: rule.type,
                expectedValue: 0,
                actualValue: 1,
                deviation: 1,
                baselineStats: { rule: rule.message },
              },
              recommendations: this.generateRuleBasedRecommendations(rule.type),
              status: "new",
            });
          }
        }

        return alerts;
      },
    };
  }

  /**
   * Create composite anomaly detector
   */
  private createCompositeDetector(): any {
    return {
      detect: async (
        dataPoint: any,
        timestamp: Date
      ): Promise<AnomalyAlert[]> => {
        const alerts: AnomalyAlert[] = [];

        // Run multiple detectors and combine results
        const detectorResults = await Promise.all([
          this.detectors.get("statistical").detect(dataPoint, timestamp),
          this.detectors.get("time_series").detect(dataPoint, timestamp),
          this.detectors.get("behavioral").detect(dataPoint, timestamp),
        ]);

        // Analyze overlapping anomalies
        const overlappingFeatures =
          this.findOverlappingAnomalies(detectorResults);

        for (const feature of overlappingFeatures) {
          const relatedAlerts = detectorResults
            .flat()
            .filter(alert => alert.context.feature === feature);

          if (relatedAlerts.length >= 2) {
            // Create composite alert
            const compositeScore = relatedAlerts.reduce(
              (max, alert) => Math.max(max, alert.score),
              0
            );

            alerts.push({
              id: `composite_${Date.now()}_${Math.random()}`,
              type: "composite_anomaly" as AnomalyAlert["type"],
              severity: compositeScore > 0.8 ? "critical" : "warning",
              score: compositeScore,
              confidence: Math.min(
                (relatedAlerts.reduce(
                  (sum, alert) => sum + alert.confidence,
                  0
                ) /
                  relatedAlerts.length) *
                  1.2,
                1
              ),
              timestamp: timestamp.toISOString(),
              data: {
                feature,
                detectedBy: relatedAlerts.map(a => a.type),
                individualAlerts: relatedAlerts,
              },
              context: {
                feature: `composite_${feature}`,
                expectedValue: relatedAlerts[0].context.expectedValue,
                actualValue: relatedAlerts[0].context.actualValue,
                deviation: compositeScore,
                baselineStats: { compositeOf: relatedAlerts.length },
              },
              recommendations: this.generateCompositeRecommendations(
                feature,
                relatedAlerts
              ),
              status: "new",
            });
          }
        }

        return alerts;
      },
    };
  }

  /**
   * Start monitoring for a specific detector
   */
  private async startDetectorMonitoring(
    detectorId: string,
    projectId: string,
    config: AnomalyConfig
  ): Promise<void> {
    if (!config.enabled) return;

    const interval = setInterval(
      async () => {
        try {
          // Fetch recent data
          const recentData = await this.fetchRecentData(projectId, config);

          // Run detection
          const alerts = await this.runDetectionBatch(
            detectorId,
            recentData,
            config
          );

          // Process alerts
          if (alerts.length > 0) {
            await this.processAlerts(alerts, projectId);
          }

          // Update baseline if needed
          await this.updateBaseline(detectorId, recentData, config);
        } catch (error) {
          console.error(`Detector monitoring failed for ${detectorId}:`, error);
        }
      },
      config.timeWindow * 60 * 1000
    ); // Convert minutes to milliseconds

    this.monitoringIntervals.set(detectorId, interval);
  }

  /**
   * Fetch recent data for anomaly detection
   */
  private async fetchRecentData(
    projectId: string,
    config: AnomalyConfig
  ): Promise<any[]> {
    const endTime = new Date();
    const startTime = new Date(
      endTime.getTime() - config.timeWindow * 60 * 1000
    );

    // Fetch data based on features
    const queries = config.features.map(async feature => {
      if (feature.startsWith("content_")) {
        return this.fetchContentMetrics(projectId, startTime, endTime);
      } else if (feature.startsWith("user_")) {
        return this.fetchUserMetrics(projectId, startTime, endTime);
      } else if (feature.startsWith("performance_")) {
        return this.fetchPerformanceMetrics(projectId, startTime, endTime);
      }
      return [];
    });

    const results = await Promise.all(queries);
    return results.flat();
  }

  /**
   * Process detected alerts
   */
  private async processAlerts(
    alerts: AnomalyAlert[],
    projectId: string
  ): Promise<void> {
    for (const alert of alerts) {
      // Store alert
      await this.storeAlert(alert, projectId);

      // Send notifications based on severity
      if (alert.severity === "critical" || alert.severity === "emergency") {
        await this.sendAlertNotification(alert, projectId);
      }

      // Update alert history
      const state = this.detectorStates.get(alert.id);
      if (state) {
        state.alertHistory.push(alert);
        // Keep only last 100 alerts
        if (state.alertHistory.length > 100) {
          state.alertHistory = state.alertHistory.slice(-100);
        }
      }
    }
  }

  // Helper methods
  private async getFeatureStatistics(feature: string): Promise<any> {
    // Get historical statistics for the feature
    const { data } = await this.supabase
      .from("feature_statistics")
      .select("*")
      .eq("feature_name", feature)
      .single();

    return data;
  }

  private classifyAnomalyType(
    feature: string,
    value: number,
    stats: any
  ): AnomalyAlert["type"] {
    if (feature.includes("traffic") || feature.includes("pageview")) {
      return value > stats.mean ? "traffic_spike" : "traffic_drop";
    }
    if (feature.includes("engagement")) {
      return "engagement_anomaly";
    }
    if (feature.includes("conversion")) {
      return "conversion_drop";
    }
    return "data_quality";
  }

  private calculateConfidence(zScore: number, sampleCount: number): number {
    const sampleConfidence = Math.min(sampleCount / 100, 1);
    const scoreConfidence = Math.min(zScore / 6, 1);
    return (sampleConfidence + scoreConfidence) / 2;
  }

  private generateStatisticalRecommendations(
    feature: string,
    zScore: number
  ): string[] {
    const recommendations = [];

    if (zScore > 4) {
      recommendations.push(
        "Investigate immediately - extreme deviation detected"
      );
    }

    if (feature.includes("traffic")) {
      recommendations.push("Check referral sources and marketing campaigns");
      recommendations.push("Verify server capacity and performance");
    }

    if (feature.includes("conversion")) {
      recommendations.push("Review checkout process and user experience");
      recommendations.push("Check for technical issues affecting conversions");
    }

    return recommendations;
  }

  private async getTimeSeriesData(
    feature: string,
    hours: number
  ): Promise<TimeSeriesPoint[]> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

    const { data } = await this.supabase
      .from("time_series_data")
      .select("*")
      .eq("feature", feature)
      .gte("timestamp", startTime.toISOString())
      .lte("timestamp", endTime.toISOString())
      .order("timestamp");

    if (!data) return [];

    // Map the data to TimeSeriesPoint format
    return data.map((item: any) => ({
      timestamp: new Date(item.timestamp),
      value: Number(item.value) || 0,
      metadata: item.metadata || {},
    }));
  }

  private detectSeasonality(timeSeries: TimeSeriesPoint[]): any {
    // Simplified seasonality detection
    const hourlyPattern = new Array(24).fill(0);
    const dailyPattern = new Array(7).fill(0);

    timeSeries.forEach(point => {
      const hour = point.timestamp.getHours();
      const day = point.timestamp.getDay();
      hourlyPattern[hour] += point.value;
      dailyPattern[day] += point.value;
    });

    return {
      hourly: hourlyPattern.map(v => v / timeSeries.length),
      daily: dailyPattern.map(v => v / timeSeries.length),
    };
  }

  private forecastValue(
    timeSeries: TimeSeriesPoint[],
    timestamp: Date,
    seasonality: any
  ): any {
    // Simple moving average with seasonal adjustment
    const recent = timeSeries.slice(-24); // Last 24 points
    const average = recent.reduce((sum, p) => sum + p.value, 0) / recent.length;

    // Apply seasonal adjustment
    const hour = timestamp.getHours();
    const day = timestamp.getDay();
    const seasonalMultiplier =
      (seasonality.hourly[hour] + seasonality.daily[day]) / 2;

    const predicted = average * (seasonalMultiplier || 1);
    const variance = this.calculateVariance(recent.map(p => p.value));
    const stdDev = Math.sqrt(variance);

    return {
      predicted,
      confidence: 0.8,
      confidenceInterval: {
        lower: predicted - 1.96 * stdDev,
        upper: predicted + 1.96 * stdDev,
      },
    };
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((sum, d) => sum + d, 0) / values.length;
  }

  private classifyTimeSeriesAnomaly(
    feature: string,
    value: number,
    forecast: any
  ): AnomalyAlert["type"] {
    if (value > forecast.predicted) {
      return feature.includes("traffic")
        ? "traffic_spike"
        : "performance_degradation";
    } else {
      return feature.includes("conversion")
        ? "conversion_drop"
        : "traffic_drop";
    }
  }

  private generateTimeSeriesRecommendations(
    feature: string,
    residual: number,
    threshold: number
  ): string[] {
    const severity = residual / threshold;
    const recommendations = [];

    if (severity > 3) {
      recommendations.push("Immediate investigation required");
    }

    recommendations.push("Compare with historical patterns");
    recommendations.push("Check for external factors or events");

    return recommendations;
  }

  private async getUserBehaviorProfile(userId: string): Promise<any> {
    // Get user behavior profile
    const { data } = await this.supabase
      .from("user_behavior_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    return data || { normalScore: 0.5 };
  }

  private extractBehaviorFeatures(dataPoint: any): any {
    return {
      sessionDuration: dataPoint.sessionDuration || 0,
      pageViews: dataPoint.pageViews || 0,
      clickRate: dataPoint.clickRate || 0,
      scrollDepth: dataPoint.scrollDepth || 0,
    };
  }

  private calculateBehaviorAnomalyScore(
    userProfile: any,
    currentBehavior: any
  ): number {
    // Compare current behavior with user's normal pattern
    let score = 0;
    const features = Object.keys(currentBehavior);

    features.forEach(feature => {
      const normal = userProfile[feature] || 0.5;
      const current = currentBehavior[feature];
      const deviation = Math.abs(current - normal) / (normal || 1);
      score += Math.min(deviation, 1);
    });

    return score / features.length;
  }

  private generateBehaviorRecommendations(behaviorScore: number): string[] {
    const recommendations = [];

    if (behaviorScore > 0.8) {
      recommendations.push("Potential bot or fraudulent activity");
      recommendations.push("Review user authentication and access patterns");
    }

    recommendations.push("Monitor user's continued activity");

    return recommendations;
  }

  private async detectSessionAnomaly(
    dataPoint: any
  ): Promise<AnomalyAlert | null> {
    // Detect unusual session patterns
    return null; // Simplified
  }

  private extractNumericalFeatures(dataPoint: any): any[] {
    const features = [];

    for (const [key, value] of Object.entries(dataPoint)) {
      if (typeof value === "number") {
        features.push({ name: key, value });
      }
    }

    return features;
  }

  private async getHistoricalFeatureData(
    featureNames: string[]
  ): Promise<any[]> {
    // Get historical data for features
    return []; // Simplified
  }

  private calculateIsolationScore(
    features: any[],
    historicalData: any[]
  ): number {
    // Simplified isolation forest score
    return Math.random() * 0.5; // Would use real algorithm
  }

  private classifyMLAnomaly(
    features: any[],
    isolationScore: number
  ): AnomalyAlert["type"] {
    // Classify based on which features contributed most to the anomaly
    return "data_quality";
  }

  private generateMLRecommendations(
    anomalyType: string,
    isolationScore: number
  ): string[] {
    return [
      "Review data quality and collection processes",
      "Check for systematic changes in user behavior",
      "Investigate potential technical issues",
    ];
  }

  private generateRuleBasedRecommendations(ruleType: string): string[] {
    const recommendationMap: Record<string, string[]> = {
      traffic_spike: [
        "Check server capacity and scaling",
        "Verify traffic sources are legitimate",
        "Monitor conversion rates during spike",
      ],
      conversion_drop: [
        "Review checkout process functionality",
        "Check for payment system issues",
        "Analyze user feedback and support tickets",
      ],
      security_threat: [
        "Enable additional security measures",
        "Review access logs and authentication",
        "Consider temporary access restrictions",
      ],
      data_quality: [
        "Audit data collection processes",
        "Check integration and API connections",
        "Validate data transformation pipelines",
      ],
    };

    return recommendationMap[ruleType] || ["Investigate the detected issue"];
  }

  private findOverlappingAnomalies(
    detectorResults: AnomalyAlert[][]
  ): string[] {
    const featureCounts = new Map<string, number>();

    detectorResults.flat().forEach(alert => {
      const feature = alert.context.feature;
      featureCounts.set(feature, (featureCounts.get(feature) || 0) + 1);
    });

    return Array.from(featureCounts.entries())
      .filter(([_, count]) => count >= 2)
      .map(([feature, _]) => feature);
  }

  private generateCompositeRecommendations(
    feature: string,
    relatedAlerts: AnomalyAlert[]
  ): string[] {
    const allRecommendations = relatedAlerts.flatMap(
      alert => alert.recommendations
    );
    const uniqueRecommendations = [...new Set(allRecommendations)];

    uniqueRecommendations.unshift(
      `Multiple detection methods identified anomaly in ${feature} - high confidence alert`
    );

    return uniqueRecommendations;
  }

  private async enrichAlerts(
    alerts: AnomalyAlert[],
    projectId: string
  ): Promise<AnomalyAlert[]> {
    // Enrich alerts with additional context
    return alerts; // Simplified
  }

  private async storeAlerts(alerts: AnomalyAlert[]): Promise<void> {
    for (const alert of alerts) {
      await this.supabase.from("anomaly_alerts").insert({
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        score: alert.score,
        confidence: alert.confidence,
        timestamp: alert.timestamp,
        data: alert.data,
        context: alert.context,
        recommendations: alert.recommendations,
        status: alert.status,
      });
    }
  }

  private async storeAlert(
    alert: AnomalyAlert,
    projectId: string
  ): Promise<void> {
    await this.supabase.from("anomaly_alerts").insert({
      ...alert,
      project_id: projectId,
    });
  }

  private async sendAlertNotification(
    alert: AnomalyAlert,
    projectId: string
  ): Promise<void> {
    // Send notification via email, Slack, etc.
    console.log(
      `ALERT [${alert.severity}]: ${alert.type} detected for project ${projectId}`
    );
  }

  private async runDetectionBatch(
    detectorId: string,
    data: any[],
    config: AnomalyConfig
  ): Promise<AnomalyAlert[]> {
    const detector = this.detectors.get(config.type);
    if (!detector) return [];

    const alerts = [];
    for (const dataPoint of data) {
      const pointAlerts = await detector.detect(dataPoint, new Date());
      alerts.push(...pointAlerts);
    }

    return alerts;
  }

  private async updateBaseline(
    detectorId: string,
    data: any[],
    config: AnomalyConfig
  ): Promise<void> {
    const state = this.detectorStates.get(detectorId);
    if (!state) return;

    // Update baseline statistics
    for (const dataPoint of data) {
      for (const [feature, value] of Object.entries(dataPoint)) {
        if (typeof value === "number") {
          const baseline = state.baseline.get(feature) || [];
          baseline.push(value);

          // Keep only recent data for baseline
          const maxBaseline = config.baseline.period * 24; // Daily points
          if (baseline.length > maxBaseline) {
            baseline.splice(0, baseline.length - maxBaseline);
          }

          state.baseline.set(feature, baseline);

          // Update statistics
          state.statistics.set(feature, {
            mean: baseline.reduce((sum, v) => sum + v, 0) / baseline.length,
            stdDev: Math.sqrt(this.calculateVariance(baseline)),
            count: baseline.length,
          });
        }
      }
    }

    state.lastUpdate = new Date();
  }

  private async fetchContentMetrics(
    projectId: string,
    startTime: Date,
    endTime: Date
  ): Promise<any[]> {
    const { data } = await this.supabase
      .from("content_analytics")
      .select("*")
      .eq("project_id", projectId)
      .gte("created_at", startTime.toISOString())
      .lte("created_at", endTime.toISOString());

    return data || [];
  }

  private async fetchUserMetrics(
    projectId: string,
    startTime: Date,
    endTime: Date
  ): Promise<any[]> {
    const { data } = await this.supabase
      .from("user_analytics")
      .select("*")
      .eq("project_id", projectId)
      .gte("created_at", startTime.toISOString())
      .lte("created_at", endTime.toISOString());

    return data || [];
  }

  private async fetchPerformanceMetrics(
    projectId: string,
    startTime: Date,
    endTime: Date
  ): Promise<any[]> {
    const { data } = await this.supabase
      .from("performance_metrics")
      .select("*")
      .eq("project_id", projectId)
      .gte("created_at", startTime.toISOString())
      .lte("created_at", endTime.toISOString());

    return data || [];
  }

  /**
   * Get detection status and metrics
   */
  getDetectionStatus(): any {
    return {
      isRunning: this.isRunning,
      activeDetectors: this.detectors.size,
      monitoringIntervals: this.monitoringIntervals.size,
      detectorStates: Array.from(this.detectorStates.entries()).map(
        ([id, state]) => ({
          id,
          lastUpdate: state.lastUpdate,
          alertCount: state.alertHistory.length,
          features: state.baseline.size,
        })
      ),
    };
  }

  /**
   * Get recent alerts
   */
  async getRecentAlerts(
    projectId: string,
    limit = 50
  ): Promise<AnomalyAlert[]> {
    const { data } = await this.supabase
      .from("anomaly_alerts")
      .select("*")
      .eq("project_id", projectId)
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (!data) return [];

    // Validate and return the alerts
    return data.map((alert: any) => ({
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      score: alert.score,
      confidence: alert.confidence,
      timestamp: alert.timestamp,
      data: alert.data || {},
      context: alert.context || {
        feature: "",
        expectedValue: 0,
        actualValue: 0,
        deviation: 0,
        baselineStats: {},
      },
      recommendations: alert.recommendations || [],
      status: alert.status || "new",
    })) as AnomalyAlert[];
  }
}

// Export singleton instance
export const anomalyDetectionSystem = new AnomalyDetectionSystem();
