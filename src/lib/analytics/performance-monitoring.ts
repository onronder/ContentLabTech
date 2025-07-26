/**
 * Model Performance Monitoring and Data Quality Dashboard
 * Enterprise-grade monitoring with drift detection and automated alerting
 */

import { createClient } from "@supabase/supabase-js";
import {
  statisticalEngine,
  type HypothesisTestResult,
} from "./statistical-engine";
import {
  dataValidationService,
  type DataQualityMetrics,
} from "./data-validation";

export interface ModelPerformanceMonitor {
  modelId: string;
  modelName: string;
  modelType: "classification" | "regression" | "clustering" | "forecasting";
  version: string;

  // Performance thresholds
  thresholds: {
    accuracy: { warning: number; critical: number };
    precision: { warning: number; critical: number };
    recall: { warning: number; critical: number };
    f1Score: { warning: number; critical: number };
    drift: { warning: number; critical: number };
    dataQuality: { warning: number; critical: number };
  };

  // Monitoring configuration
  monitoring: {
    enabled: boolean;
    checkInterval: number; // minutes
    alertChannels: string[]; // email, slack, webhook
    retentionDays: number;
  };

  createdAt: string;
  lastChecked?: string;
  status: "healthy" | "warning" | "critical" | "inactive";
}

export interface ModelMetrics {
  modelId: string;
  timestamp: string;

  // Performance metrics
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc?: number; // For classification
  rmse?: number; // For regression
  mae?: number; // For regression
  r2?: number; // For regression

  // Data quality metrics
  dataQuality: DataQualityMetrics;

  // Distribution metrics
  featureDistribution: Record<
    string,
    {
      mean: number;
      std: number;
      min: number;
      max: number;
      percentiles: Record<string, number>;
    }
  >;

  // Prediction distribution
  predictionDistribution: {
    mean: number;
    std: number;
    histogram: Array<{ bin: string; count: number }>;
  };

  // Sample statistics
  sampleSize: number;
  processingTime: number;
  errorRate: number;
}

export interface DriftDetectionResult {
  modelId: string;
  timestamp: string;

  // Overall drift assessment
  driftDetected: boolean;
  driftScore: number; // 0-1, higher indicates more drift
  severity: "none" | "low" | "medium" | "high";

  // Feature-level drift
  featureDrift: Record<
    string,
    {
      driftScore: number;
      pValue: number;
      testStatistic: number;
      testType: string;
      driftDetected: boolean;
    }
  >;

  // Prediction drift
  predictionDrift: {
    driftScore: number;
    distributionShift: boolean;
    meanShift: number;
    varianceShift: number;
  };

  // Statistical tests
  statisticalTests: {
    kolmogorovSmirnov: HypothesisTestResult;
    mannWhitney: HypothesisTestResult;
    chiSquare: HypothesisTestResult;
  };

  recommendations: string[];
}

export interface DataQualityReport {
  reportId: string;
  timestamp: string;

  // Overall quality score
  overallScore: number;
  status: "excellent" | "good" | "fair" | "poor";

  // Quality dimensions
  completeness: {
    score: number;
    missingValues: Record<string, number>;
    patterns: string[];
  };

  validity: {
    score: number;
    invalidValues: Record<string, number>;
    constraintViolations: string[];
  };

  accuracy: {
    score: number;
    outliers: Record<string, number[]>;
    anomalies: string[];
  };

  consistency: {
    score: number;
    duplicates: number;
    contradictions: string[];
  };

  timeliness: {
    score: number;
    latencyMinutes: number;
    staleRecords: number;
  };

  // Trend analysis
  qualityTrend: "improving" | "stable" | "declining";
  recommendations: string[];
}

export interface AlertConfig {
  alertId: string;
  name: string;
  description: string;
  type: "performance" | "drift" | "quality" | "system";

  // Trigger conditions
  conditions: Array<{
    metric: string;
    operator: ">" | "<" | ">=" | "<=" | "==" | "!=";
    threshold: number;
    timeWindow: number; // minutes
    occurrences: number; // consecutive occurrences needed
  }>;

  // Alert settings
  severity: "info" | "warning" | "critical";
  channels: AlertChannel[];
  suppressionMinutes: number; // prevent alert spam

  // Status
  enabled: boolean;
  lastTriggered?: string;
  triggerCount: number;
}

export interface AlertChannel {
  type: "email" | "slack" | "webhook" | "sms";
  target: string; // email address, webhook URL, etc.
  config?: Record<string, unknown>;
}

export interface MonitoringDashboard {
  dashboardId: string;
  name: string;
  description: string;

  // Dashboard layout
  widgets: DashboardWidget[];
  refreshInterval: number; // seconds

  // Access control
  visibility: "public" | "team" | "private";
  owners: string[];

  createdAt: string;
  lastModified: string;
}

export interface DashboardWidget {
  widgetId: string;
  type: "metric" | "chart" | "table" | "alert" | "text";
  title: string;
  position: { x: number; y: number; width: number; height: number };

  // Data configuration
  dataSource: {
    type: "model_metrics" | "drift_detection" | "data_quality" | "custom";
    config: Record<string, unknown>;
  };

  // Visualization configuration
  visualization: {
    chartType?: "line" | "bar" | "pie" | "scatter" | "heatmap";
    axes?: { x: string; y: string };
    colors?: string[];
    aggregation?: "sum" | "avg" | "count" | "min" | "max";
  };

  // Refresh settings
  autoRefresh: boolean;
  refreshInterval: number; // seconds
}

export class PerformanceMonitoringService {
  private supabase: ReturnType<typeof createClient>;
  private static instance: PerformanceMonitoringService;
  private monitoringInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.supabase = createClient(
      process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
      process.env["SUPABASE_SECRET_KEY"]!
    );
  }

  public static getInstance(): PerformanceMonitoringService {
    if (!PerformanceMonitoringService.instance) {
      PerformanceMonitoringService.instance =
        new PerformanceMonitoringService();
    }
    return PerformanceMonitoringService.instance;
  }

  /**
   * Register a model for monitoring
   */
  public async registerModel(
    monitor: Omit<ModelPerformanceMonitor, "createdAt" | "status">
  ): Promise<void> {
    const modelMonitor: ModelPerformanceMonitor = {
      ...monitor,
      createdAt: new Date().toISOString(),
      status: "healthy",
    };

    const { error } = await this.supabase.from("model_monitors").insert({
      model_id: modelMonitor.modelId,
      model_name: modelMonitor.modelName,
      model_type: modelMonitor.modelType,
      version: modelMonitor.version,
      config: modelMonitor,
      status: modelMonitor.status,
      created_at: modelMonitor.createdAt,
    });

    if (error) {
      throw new Error(`Failed to register model monitor: ${error.message}`);
    }

    console.log(
      `Registered model for monitoring: ${monitor.modelName} (${monitor.modelId})`
    );
  }

  /**
   * Record model performance metrics
   */
  public async recordMetrics(
    modelId: string,
    predictions: number[],
    actuals: number[],
    features: Record<string, number[]>,
    processingTime: number
  ): Promise<void> {
    if (predictions.length !== actuals.length) {
      throw new Error("Predictions and actuals must have the same length");
    }

    // Calculate performance metrics
    const performanceMetrics = this.calculatePerformanceMetrics(
      predictions,
      actuals
    );

    // Calculate data quality metrics
    const dataQuality = this.calculateDataQualityMetrics(features);

    // Calculate feature distributions
    const featureDistribution = this.calculateFeatureDistributions(features);

    // Calculate prediction distribution
    const predictionDistribution =
      this.calculatePredictionDistribution(predictions);

    const metrics: ModelMetrics = {
      modelId,
      timestamp: new Date().toISOString(),
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1Score: 0,
      ...performanceMetrics,
      dataQuality,
      featureDistribution,
      predictionDistribution,
      sampleSize: predictions.length,
      processingTime,
      errorRate: this.calculateErrorRate(predictions, actuals),
    };

    // Store metrics
    const { error } = await this.supabase.from("model_metrics").insert({
      model_id: metrics.modelId,
      timestamp: metrics.timestamp,
      metrics: metrics,
    });

    if (error) {
      console.error("Failed to record model metrics:", error);
    }

    // Check for alerts
    await this.checkAlerts(modelId, metrics);
  }

  /**
   * Detect model drift
   */
  public async detectDrift(
    modelId: string,
    currentFeatures: Record<string, number[]>,
    currentPredictions: number[],
    referenceWindow = 30 // days
  ): Promise<DriftDetectionResult> {
    // Get reference data from the last N days
    const referenceData = await this.getReferenceData(modelId, referenceWindow);

    if (!referenceData || referenceData.length === 0) {
      throw new Error("Insufficient reference data for drift detection");
    }

    // Feature drift detection
    const featureDrift: DriftDetectionResult["featureDrift"] = {};
    let overallDriftScore = 0;
    let driftedFeatures = 0;

    for (const [featureName, currentValues] of Object.entries(
      currentFeatures
    )) {
      const referenceValues = referenceData
        .map(d => d.featureDistribution[featureName]?.mean)
        .filter(v => v !== undefined);

      if (referenceValues.length === 0) continue;

      // Perform Kolmogorov-Smirnov test
      const ksResult = this.performKSTest(currentValues, referenceValues);

      // Calculate drift score
      const driftScore = this.calculateFeatureDriftScore(
        currentValues,
        referenceValues
      );

      featureDrift[featureName] = {
        driftScore,
        pValue: ksResult.pValue,
        testStatistic: ksResult.testStatistic,
        testType: ksResult.testType,
        driftDetected: ksResult.rejectNull,
      };

      overallDriftScore += driftScore;
      if (ksResult.rejectNull) driftedFeatures++;
    }

    const numFeatures = Object.keys(currentFeatures).length;
    overallDriftScore = numFeatures > 0 ? overallDriftScore / numFeatures : 0;

    // Prediction drift detection
    const referencePredictions = referenceData
      .map(d => d.predictionDistribution.mean)
      .filter(v => v !== undefined);

    const predictionDrift = this.calculatePredictionDrift(
      currentPredictions,
      referencePredictions
    );

    // Statistical tests
    const statisticalTests = {
      kolmogorovSmirnov: this.performKSTest(
        currentPredictions,
        referencePredictions
      ),
      mannWhitney: this.performMannWhitneyTest(
        currentPredictions,
        referencePredictions
      ),
      chiSquare: this.performChiSquareTest(
        currentPredictions,
        referencePredictions
      ),
    };

    // Overall assessment
    const driftDetected =
      overallDriftScore > 0.3 || driftedFeatures > numFeatures * 0.2;
    const severity = this.assessDriftSeverity(
      overallDriftScore,
      driftedFeatures,
      numFeatures
    );

    // Generate recommendations
    const recommendations = this.generateDriftRecommendations(
      driftDetected,
      severity,
      featureDrift,
      predictionDrift
    );

    const result: DriftDetectionResult = {
      modelId,
      timestamp: new Date().toISOString(),
      driftDetected,
      driftScore: Math.round(overallDriftScore * 10000) / 10000,
      severity,
      featureDrift,
      predictionDrift,
      statisticalTests,
      recommendations,
    };

    // Store drift detection results
    await this.storeDriftResults(result);

    return result;
  }

  /**
   * Generate data quality report
   */
  public async generateDataQualityReport(
    dataSource: string,
    timeWindow = 24 // hours
  ): Promise<DataQualityReport> {
    // Get data for quality analysis
    const data = await this.getDataForQualityAnalysis(dataSource, timeWindow);

    if (!data || data.length === 0) {
      throw new Error("No data available for quality analysis");
    }

    // Analyze completeness
    const completeness = this.analyzeCompleteness(data);

    // Analyze validity
    const validity = this.analyzeValidity(data);

    // Analyze accuracy (outlier detection)
    const accuracy = this.analyzeAccuracy(data);

    // Analyze consistency
    const consistency = this.analyzeConsistency(data);

    // Analyze timeliness
    const timeliness = this.analyzeTimeliness(data);

    // Calculate overall score
    const overallScore =
      completeness.score * 0.25 +
      validity.score * 0.25 +
      accuracy.score * 0.2 +
      consistency.score * 0.15 +
      timeliness.score * 0.15;

    const status = this.getQualityStatus(overallScore);
    const qualityTrend = await this.analyzeQualityTrend(dataSource);
    const recommendations = this.generateQualityRecommendations(
      completeness,
      validity,
      accuracy,
      consistency,
      timeliness
    );

    const report: DataQualityReport = {
      reportId: `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      overallScore: Math.round(overallScore * 100) / 100,
      status,
      completeness,
      validity,
      accuracy,
      consistency,
      timeliness,
      qualityTrend,
      recommendations,
    };

    // Store quality report
    await this.storeQualityReport(report);

    return report;
  }

  /**
   * Create monitoring dashboard
   */
  public async createDashboard(
    dashboard: Omit<
      MonitoringDashboard,
      "dashboardId" | "createdAt" | "lastModified"
    >
  ): Promise<MonitoringDashboard> {
    const monitoringDashboard: MonitoringDashboard = {
      ...dashboard,
      dashboardId: `dash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };

    const { error } = await this.supabase.from("monitoring_dashboards").insert({
      dashboard_id: monitoringDashboard.dashboardId,
      name: monitoringDashboard.name,
      description: monitoringDashboard.description,
      config: monitoringDashboard,
      created_at: monitoringDashboard.createdAt,
    });

    if (error) {
      throw new Error(`Failed to create dashboard: ${error.message}`);
    }

    return monitoringDashboard;
  }

  /**
   * Start continuous monitoring
   */
  public startMonitoring(): void {
    if (this.monitoringInterval) {
      return; // Already running
    }

    console.log("Starting continuous model monitoring...");

    this.monitoringInterval = setInterval(
      async () => {
        try {
          await this.runMonitoringCycle();
        } catch (error) {
          console.error("Monitoring cycle error:", error);
        }
      },
      5 * 60 * 1000
    ); // Run every 5 minutes
  }

  /**
   * Stop continuous monitoring
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log("Stopped continuous model monitoring");
    }
  }

  // Private helper methods

  private calculatePerformanceMetrics(
    predictions: number[],
    actuals: number[]
  ): Partial<ModelMetrics> {
    // Determine if this is classification or regression
    const isClassification = this.isClassificationProblem(actuals);

    if (isClassification) {
      return this.calculateClassificationMetrics(predictions, actuals);
    } else {
      return this.calculateRegressionMetrics(predictions, actuals);
    }
  }

  private isClassificationProblem(actuals: number[]): boolean {
    // Simple heuristic: if all values are integers in a small range, likely classification
    const uniqueValues = new Set(actuals);
    return (
      uniqueValues.size <= 10 && actuals.every(val => Number.isInteger(val))
    );
  }

  private calculateClassificationMetrics(
    predictions: number[],
    actuals: number[]
  ): Partial<ModelMetrics> {
    // Convert to binary classification for simplicity
    const threshold = 0.5;
    const binaryPredictions = predictions.map(p => (p >= threshold ? 1 : 0));
    const binaryActuals = actuals.map(a => (a >= threshold ? 1 : 0));

    let tp = 0,
      fp = 0,
      tn = 0,
      fn = 0;

    for (let i = 0; i < binaryPredictions.length; i++) {
      if (binaryActuals[i] === 1 && binaryPredictions[i] === 1) tp++;
      else if (binaryActuals[i] === 0 && binaryPredictions[i] === 1) fp++;
      else if (binaryActuals[i] === 0 && binaryPredictions[i] === 0) tn++;
      else if (binaryActuals[i] === 1 && binaryPredictions[i] === 0) fn++;
    }

    const accuracy = (tp + tn) / (tp + fp + tn + fn);
    const precision = tp / (tp + fp) || 0;
    const recall = tp / (tp + fn) || 0;
    const f1Score = (2 * (precision * recall)) / (precision + recall) || 0;

    return {
      accuracy: Math.round(accuracy * 10000) / 10000,
      precision: Math.round(precision * 10000) / 10000,
      recall: Math.round(recall * 10000) / 10000,
      f1Score: Math.round(f1Score * 10000) / 10000,
    };
  }

  private calculateRegressionMetrics(
    predictions: number[],
    actuals: number[]
  ): Partial<ModelMetrics> {
    const n = predictions.length;

    // Mean Absolute Error
    const mae =
      predictions.reduce(
        (sum, pred, i) => sum + Math.abs(pred - (actuals[i] || 0)),
        0
      ) / n;

    // Root Mean Square Error
    const mse =
      predictions.reduce(
        (sum, pred, i) => sum + Math.pow(pred - (actuals[i] || 0), 2),
        0
      ) / n;
    const rmse = Math.sqrt(mse);

    // R-squared
    const actualMean = actuals.reduce((sum, val) => sum + val, 0) / n;
    const totalSumSquares = actuals.reduce(
      (sum, val) => sum + Math.pow(val - actualMean, 2),
      0
    );
    const residualSumSquares = predictions.reduce(
      (sum, pred, i) => sum + Math.pow((actuals[i] || 0) - pred, 2),
      0
    );
    const r2 =
      totalSumSquares === 0 ? 0 : 1 - residualSumSquares / totalSumSquares;

    // Accuracy for regression (percentage of predictions within acceptable range)
    const tolerance = 0.1; // 10% tolerance
    const accurateCount = predictions.filter(
      (pred, i) =>
        Math.abs(pred - (actuals[i] || 0)) / Math.abs(actuals[i] || 0 || 1) <=
        tolerance
    ).length;
    const accuracy = accurateCount / n;

    return {
      accuracy: Math.round(accuracy * 10000) / 10000,
      mae: Math.round(mae * 100) / 100,
      rmse: Math.round(rmse * 100) / 100,
      r2: Math.round(r2 * 10000) / 10000,
      precision: accuracy, // Use accuracy as precision for regression
      recall: accuracy, // Use accuracy as recall for regression
      f1Score: accuracy, // Use accuracy as f1Score for regression
    };
  }

  private calculateDataQualityMetrics(
    features: Record<string, number[]>
  ): DataQualityMetrics {
    const featureNames = Object.keys(features);
    const totalFields = featureNames.length;

    if (totalFields === 0) {
      return {
        completeness: 0,
        validity: 0,
        accuracy: 0,
        consistency: 0,
        timeliness: 100, // Assume current data is timely
        overall: 0,
      };
    }

    let completenessSum = 0;
    let validitySum = 0;
    let accuracySum = 0;
    let consistencySum = 0;

    featureNames.forEach(featureName => {
      const values = features[featureName];

      if (!values || values.length === 0) return;

      // Completeness: percentage of non-null values
      const nonNullCount = values.filter(
        v => v !== null && v !== undefined && !isNaN(v)
      ).length;
      const completeness = (nonNullCount / values.length) * 100;
      completenessSum += completeness;

      // Validity: percentage of values within expected range
      const validValues = values.filter(
        v => typeof v === "number" && isFinite(v)
      );
      const validity = (validValues.length / values.length) * 100;
      validitySum += validity;

      // Accuracy: based on outlier detection
      const outliers = this.detectOutliers(validValues);
      const accuracy =
        ((validValues.length - outliers.length) / validValues.length) * 100;
      accuracySum += accuracy;

      // Consistency: measure of value distribution consistency
      const consistency = this.calculateConsistencyScore(validValues);
      consistencySum += consistency;
    });

    const completeness = completenessSum / totalFields;
    const validity = validitySum / totalFields;
    const accuracy = accuracySum / totalFields;
    const consistency = consistencySum / totalFields;
    const timeliness = 100; // Assume current data is timely
    const overall =
      completeness * 0.25 +
      validity * 0.25 +
      accuracy * 0.2 +
      consistency * 0.15 +
      timeliness * 0.15;

    return {
      completeness: Math.round(completeness * 100) / 100,
      validity: Math.round(validity * 100) / 100,
      accuracy: Math.round(accuracy * 100) / 100,
      consistency: Math.round(consistency * 100) / 100,
      timeliness: Math.round(timeliness * 100) / 100,
      overall: Math.round(overall * 100) / 100,
    };
  }

  private detectOutliers(values: number[]): number[] {
    if (values.length < 4) return [];

    // Use IQR method for outlier detection
    const sorted = [...values].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);
    const q1 = sorted[q1Index] || 0;
    const q3 = sorted[q3Index] || 0;
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    return values.filter(value => value < lowerBound || value > upperBound);
  }

  private calculateConsistencyScore(values: number[]): number {
    if (values.length < 2) return 100;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length;
    const coefficientOfVariation =
      Math.abs(mean) > 0 ? Math.sqrt(variance) / Math.abs(mean) : 0;

    // Convert coefficient of variation to consistency score (0-100)
    return Math.max(0, 100 - coefficientOfVariation * 100);
  }

  private calculateFeatureDistributions(
    features: Record<string, number[]>
  ): ModelMetrics["featureDistribution"] {
    const distributions: ModelMetrics["featureDistribution"] = {};

    Object.entries(features).forEach(([featureName, values]) => {
      const validValues = values.filter(
        v => typeof v === "number" && isFinite(v)
      );

      if (validValues.length === 0) {
        distributions[featureName] = {
          mean: 0,
          std: 0,
          min: 0,
          max: 0,
          percentiles: { "25": 0, "50": 0, "75": 0, "90": 0, "95": 0, "99": 0 },
        };
        return;
      }

      const sorted = [...validValues].sort((a, b) => a - b);
      const mean =
        validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
      const variance =
        validValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
        validValues.length;
      const std = Math.sqrt(variance);

      const percentiles = {
        "25": this.getPercentile(sorted, 0.25),
        "50": this.getPercentile(sorted, 0.5),
        "75": this.getPercentile(sorted, 0.75),
        "90": this.getPercentile(sorted, 0.9),
        "95": this.getPercentile(sorted, 0.95),
        "99": this.getPercentile(sorted, 0.99),
      };

      distributions[featureName] = {
        mean: Math.round(mean * 10000) / 10000,
        std: Math.round(std * 10000) / 10000,
        min: sorted[0] || 0,
        max: sorted[sorted.length - 1] || 0,
        percentiles,
      };
    });

    return distributions;
  }

  private getPercentile(sortedValues: number[], percentile: number): number {
    const index = Math.floor(sortedValues.length * percentile);
    return sortedValues[Math.min(index, sortedValues.length - 1)] || 0;
  }

  private calculatePredictionDistribution(
    predictions: number[]
  ): ModelMetrics["predictionDistribution"] {
    const validPredictions = predictions.filter(
      p => typeof p === "number" && isFinite(p)
    );

    if (validPredictions.length === 0) {
      return {
        mean: 0,
        std: 0,
        histogram: [],
      };
    }

    const mean =
      validPredictions.reduce((sum, val) => sum + val, 0) /
      validPredictions.length;
    const variance =
      validPredictions.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      validPredictions.length;
    const std = Math.sqrt(variance);

    // Create histogram
    const histogram = this.createHistogram(validPredictions, 10);

    return {
      mean: Math.round(mean * 10000) / 10000,
      std: Math.round(std * 10000) / 10000,
      histogram,
    };
  }

  private createHistogram(
    values: number[],
    bins: number
  ): Array<{ bin: string; count: number }> {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binWidth = (max - min) / bins;

    const histogram: Array<{ bin: string; count: number }> = [];

    for (let i = 0; i < bins; i++) {
      const binStart = min + i * binWidth;
      const binEnd = min + (i + 1) * binWidth;
      const count = values.filter(
        v => v >= binStart && (i === bins - 1 ? v <= binEnd : v < binEnd)
      ).length;

      histogram.push({
        bin: `${binStart.toFixed(2)}-${binEnd.toFixed(2)}`,
        count,
      });
    }

    return histogram;
  }

  private calculateErrorRate(predictions: number[], actuals: number[]): number {
    if (predictions.length !== actuals.length || predictions.length === 0) {
      return 0;
    }

    // For regression, use percentage of predictions outside acceptable tolerance
    const tolerance = 0.1; // 10%
    const errors = predictions.filter(
      (pred, i) =>
        Math.abs(pred - (actuals[i] || 0)) / Math.abs(actuals[i] || 0 || 1) >
        tolerance
    ).length;

    return (errors / predictions.length) * 100;
  }

  private async checkAlerts(
    modelId: string,
    metrics: ModelMetrics
  ): Promise<void> {
    // Get alerts configured for this model
    const { data: alerts } = await this.supabase
      .from("model_alerts")
      .select("*")
      .eq("model_id", modelId)
      .eq("enabled", true);

    if (!alerts || alerts.length === 0) return;

    for (const alert of alerts) {
      const config = alert.config as AlertConfig;
      const shouldTrigger = this.evaluateAlertConditions(
        config.conditions,
        metrics
      );

      if (shouldTrigger) {
        await this.triggerAlert(config, modelId, metrics);
      }
    }
  }

  private evaluateAlertConditions(
    conditions: AlertConfig["conditions"],
    metrics: ModelMetrics
  ): boolean {
    return conditions.every(condition => {
      const metricValue = this.getMetricValue(metrics, condition.metric);

      switch (condition.operator) {
        case ">":
          return metricValue > condition.threshold;
        case "<":
          return metricValue < condition.threshold;
        case ">=":
          return metricValue >= condition.threshold;
        case "<=":
          return metricValue <= condition.threshold;
        case "==":
          return metricValue === condition.threshold;
        case "!=":
          return metricValue !== condition.threshold;
        default:
          return false;
      }
    });
  }

  private getMetricValue(metrics: ModelMetrics, metricName: string): number {
    switch (metricName) {
      case "accuracy":
        return metrics.accuracy;
      case "precision":
        return metrics.precision;
      case "recall":
        return metrics.recall;
      case "f1Score":
        return metrics.f1Score;
      case "rmse":
        return metrics.rmse || 0;
      case "mae":
        return metrics.mae || 0;
      case "r2":
        return metrics.r2 || 0;
      case "dataQuality":
        return metrics.dataQuality.overall;
      case "errorRate":
        return metrics.errorRate;
      default:
        return 0;
    }
  }

  private async triggerAlert(
    alertConfig: AlertConfig,
    modelId: string,
    metrics: ModelMetrics
  ): Promise<void> {
    console.log(`Alert triggered: ${alertConfig.name} for model ${modelId}`);

    // Check suppression period
    if (alertConfig.lastTriggered) {
      const lastTriggered = new Date(alertConfig.lastTriggered);
      const suppressionEnd = new Date(
        lastTriggered.getTime() + alertConfig.suppressionMinutes * 60 * 1000
      );

      if (new Date() < suppressionEnd) {
        return; // Still in suppression period
      }
    }

    // Send alerts through configured channels
    for (const channel of alertConfig.channels) {
      try {
        await this.sendAlert(channel, alertConfig, modelId, metrics);
      } catch (error) {
        console.error(`Failed to send alert via ${channel.type}:`, error);
      }
    }

    // Update alert status
    await this.supabase
      .from("model_alerts")
      .update({
        last_triggered: new Date().toISOString(),
        trigger_count: alertConfig.triggerCount + 1,
      })
      .eq("alert_id", alertConfig.alertId);
  }

  private async sendAlert(
    channel: AlertChannel,
    alertConfig: AlertConfig,
    modelId: string,
    metrics: ModelMetrics
  ): Promise<void> {
    const message = this.formatAlertMessage(alertConfig, modelId, metrics);

    switch (channel.type) {
      case "email":
        // Would integrate with email service
        console.log(`Email alert to ${channel.target}: ${message}`);
        break;
      case "slack":
        // Would integrate with Slack API
        console.log(`Slack alert to ${channel.target}: ${message}`);
        break;
      case "webhook":
        try {
          await fetch(channel.target, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              alert: alertConfig.name,
              modelId,
              severity: alertConfig.severity,
              message,
              metrics,
              timestamp: new Date().toISOString(),
            }),
          });
        } catch (error) {
          console.error("Webhook alert failed:", error);
        }
        break;
      case "sms":
        // Would integrate with SMS service
        console.log(`SMS alert to ${channel.target}: ${message}`);
        break;
    }
  }

  private formatAlertMessage(
    alertConfig: AlertConfig,
    modelId: string,
    metrics: ModelMetrics
  ): string {
    return `Alert: ${alertConfig.name}
Model: ${modelId}
Severity: ${alertConfig.severity}
Timestamp: ${new Date().toISOString()}
Metrics: Accuracy=${metrics.accuracy}, Quality=${metrics.dataQuality.overall}%`;
  }

  private async getReferenceData(
    modelId: string,
    windowDays: number
  ): Promise<ModelMetrics[]> {
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - windowDays);

    const { data } = await this.supabase
      .from("model_metrics")
      .select("metrics")
      .eq("model_id", modelId)
      .gte("timestamp", windowStart.toISOString())
      .order("timestamp", { ascending: false });

    return (data || []).map(d => d.metrics as ModelMetrics);
  }

  private performKSTest(
    sample1: number[],
    sample2: number[]
  ): HypothesisTestResult {
    // Simplified Kolmogorov-Smirnov test implementation
    if (sample1.length === 0 || sample2.length === 0) {
      return {
        testStatistic: 0,
        pValue: 1,
        criticalValue: 0,
        rejectNull: false,
        confidenceLevel: 95,
        testType: "Kolmogorov-Smirnov",
      };
    }

    // Calculate empirical CDFs and find maximum difference
    const allValues = [...sample1, ...sample2].sort((a, b) => a - b);
    let maxDiff = 0;

    allValues.forEach(value => {
      const cdf1 = sample1.filter(v => v <= value).length / sample1.length;
      const cdf2 = sample2.filter(v => v <= value).length / sample2.length;
      maxDiff = Math.max(maxDiff, Math.abs(cdf1 - cdf2));
    });

    // Calculate critical value and p-value (simplified)
    const n1 = sample1.length;
    const n2 = sample2.length;
    const criticalValue = 1.36 * Math.sqrt((n1 + n2) / (n1 * n2));
    const testStatistic = maxDiff;
    const pValue = Math.exp(
      -2 * Math.pow(testStatistic * Math.sqrt((n1 * n2) / (n1 + n2)), 2)
    );

    return {
      testStatistic: Math.round(testStatistic * 10000) / 10000,
      pValue: Math.round(pValue * 10000) / 10000,
      criticalValue: Math.round(criticalValue * 10000) / 10000,
      rejectNull: testStatistic > criticalValue,
      confidenceLevel: 95,
      testType: "Kolmogorov-Smirnov",
    };
  }

  private performMannWhitneyTest(
    sample1: number[],
    sample2: number[]
  ): HypothesisTestResult {
    // Simplified Mann-Whitney U test
    const combined = [
      ...sample1.map(v => ({ value: v, group: 1 })),
      ...sample2.map(v => ({ value: v, group: 2 })),
    ];
    combined.sort((a, b) => a.value - b.value);

    // Assign ranks
    let rank = 1;
    combined.forEach((item, index) => {
      (item as any)["rank"] = rank;
      if (
        index < combined.length - 1 &&
        combined[index + 1]?.value !== item.value
      ) {
        rank = index + 2;
      }
    });

    const r1 = combined
      .filter(item => item.group === 1)
      .reduce((sum, item) => sum + (item as any)["rank"], 0);
    const n1 = sample1.length;
    const n2 = sample2.length;

    const u1 = r1 - (n1 * (n1 + 1)) / 2;
    const u2 = n1 * n2 - u1;
    const u = Math.min(u1, u2);

    // Normal approximation
    const mean = (n1 * n2) / 2;
    const std = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
    const z = (u - mean) / std;

    return {
      testStatistic: Math.round(z * 10000) / 10000,
      pValue: 2 * (1 - this.normalCDF(Math.abs(z))),
      criticalValue: 1.96,
      rejectNull: Math.abs(z) > 1.96,
      confidenceLevel: 95,
      testType: "Mann-Whitney U",
    };
  }

  private performChiSquareTest(
    sample1: number[],
    sample2: number[]
  ): HypothesisTestResult {
    // Simplified chi-square test for distribution comparison
    // Create bins and compare frequencies
    const allValues = [...sample1, ...sample2];
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const bins = 10;
    const binWidth = (max - min) / bins;

    let chiSquare = 0;
    const degreesOfFreedom = bins - 1;

    for (let i = 0; i < bins; i++) {
      const binStart = min + i * binWidth;
      const binEnd = min + (i + 1) * binWidth;

      const observed1 = sample1.filter(
        v => v >= binStart && (i === bins - 1 ? v <= binEnd : v < binEnd)
      ).length;
      const observed2 = sample2.filter(
        v => v >= binStart && (i === bins - 1 ? v <= binEnd : v < binEnd)
      ).length;

      const expected1 =
        (sample1.length / (sample1.length + sample2.length)) *
        (observed1 + observed2);
      const expected2 =
        (sample2.length / (sample1.length + sample2.length)) *
        (observed1 + observed2);

      if (expected1 > 0)
        chiSquare += Math.pow(observed1 - expected1, 2) / expected1;
      if (expected2 > 0)
        chiSquare += Math.pow(observed2 - expected2, 2) / expected2;
    }

    // Simplified p-value calculation
    const pValue = Math.exp(-chiSquare / 2);

    return {
      testStatistic: Math.round(chiSquare * 10000) / 10000,
      pValue: Math.round(pValue * 10000) / 10000,
      criticalValue: 18.31, // For df=10, alpha=0.05
      rejectNull: chiSquare > 18.31,
      confidenceLevel: 95,
      testType: "Chi-square",
    };
  }

  private normalCDF(z: number): number {
    // Standard normal CDF approximation
    return (1 + this.erf(z / Math.sqrt(2))) / 2;
  }

  private erf(x: number): number {
    // Error function approximation
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

  private calculateFeatureDriftScore(
    current: number[],
    reference: number[]
  ): number {
    if (current.length === 0 || reference.length === 0) return 0;

    // Calculate distribution differences
    const currentMean =
      current.reduce((sum, val) => sum + val, 0) / current.length;
    const referenceMean =
      reference.reduce((sum, val) => sum + val, 0) / reference.length;

    const currentStd = Math.sqrt(
      current.reduce((sum, val) => sum + Math.pow(val - currentMean, 2), 0) /
        current.length
    );
    const referenceStd = Math.sqrt(
      reference.reduce(
        (sum, val) => sum + Math.pow(val - referenceMean, 2),
        0
      ) / reference.length
    );

    // Normalized difference
    const meanDiff =
      Math.abs(currentMean - referenceMean) / (referenceStd || 1);
    const stdDiff = Math.abs(currentStd - referenceStd) / (referenceStd || 1);

    return Math.min(1, (meanDiff + stdDiff) / 2);
  }

  private calculatePredictionDrift(
    currentPredictions: number[],
    referencePredictions: number[]
  ): DriftDetectionResult["predictionDrift"] {
    if (currentPredictions.length === 0 || referencePredictions.length === 0) {
      return {
        driftScore: 0,
        distributionShift: false,
        meanShift: 0,
        varianceShift: 0,
      };
    }

    const currentMean =
      currentPredictions.reduce((sum, val) => sum + val, 0) /
      currentPredictions.length;
    const referenceMean =
      referencePredictions.reduce((sum, val) => sum + val, 0) /
      referencePredictions.length;

    const currentVariance =
      currentPredictions.reduce(
        (sum, val) => sum + Math.pow(val - currentMean, 2),
        0
      ) / currentPredictions.length;
    const referenceVariance =
      referencePredictions.reduce(
        (sum, val) => sum + Math.pow(val - referenceMean, 2),
        0
      ) / referencePredictions.length;

    const meanShift =
      (currentMean - referenceMean) / (Math.sqrt(referenceVariance) || 1);
    const varianceShift =
      (currentVariance - referenceVariance) / (referenceVariance || 1);

    const driftScore = Math.sqrt(
      Math.pow(meanShift, 2) + Math.pow(varianceShift, 2)
    );
    const distributionShift = driftScore > 0.5;

    return {
      driftScore: Math.round(driftScore * 10000) / 10000,
      distributionShift,
      meanShift: Math.round(meanShift * 10000) / 10000,
      varianceShift: Math.round(varianceShift * 10000) / 10000,
    };
  }

  private assessDriftSeverity(
    overallDriftScore: number,
    driftedFeatures: number,
    totalFeatures: number
  ): DriftDetectionResult["severity"] {
    const featureDriftRatio =
      totalFeatures > 0 ? driftedFeatures / totalFeatures : 0;

    if (overallDriftScore > 0.7 || featureDriftRatio > 0.5) return "high";
    if (overallDriftScore > 0.5 || featureDriftRatio > 0.3) return "medium";
    if (overallDriftScore > 0.3 || featureDriftRatio > 0.1) return "low";
    return "none";
  }

  private generateDriftRecommendations(
    driftDetected: boolean,
    severity: DriftDetectionResult["severity"],
    featureDrift: DriftDetectionResult["featureDrift"],
    predictionDrift: DriftDetectionResult["predictionDrift"]
  ): string[] {
    const recommendations: string[] = [];

    if (!driftDetected) {
      recommendations.push(
        "No significant drift detected. Continue monitoring."
      );
      return recommendations;
    }

    switch (severity) {
      case "high":
        recommendations.push(
          "High drift detected. Consider retraining the model immediately."
        );
        recommendations.push("Investigate data pipeline for potential issues.");
        break;
      case "medium":
        recommendations.push(
          "Moderate drift detected. Plan model retraining within the next week."
        );
        recommendations.push(
          "Analyze feature importance to identify root causes."
        );
        break;
      case "low":
        recommendations.push(
          "Low drift detected. Monitor closely and consider retraining if trend continues."
        );
        break;
    }

    // Feature-specific recommendations
    const driftedFeatures = Object.entries(featureDrift)
      .filter(([, drift]) => drift.driftDetected)
      .map(([name]) => name);

    if (driftedFeatures.length > 0) {
      recommendations.push(
        `Features showing drift: ${driftedFeatures.join(", ")}`
      );
      recommendations.push("Review data sources for these features.");
    }

    // Prediction drift recommendations
    if (predictionDrift.distributionShift) {
      recommendations.push(
        "Prediction distribution has shifted. Validate model assumptions."
      );
    }

    return recommendations;
  }

  private async storeDriftResults(result: DriftDetectionResult): Promise<void> {
    const { error } = await this.supabase
      .from("drift_detection_results")
      .insert({
        model_id: result.modelId,
        timestamp: result.timestamp,
        drift_detected: result.driftDetected,
        drift_score: result.driftScore,
        severity: result.severity,
        results: result,
      });

    if (error) {
      console.error("Failed to store drift results:", error);
    }
  }

  private async getDataForQualityAnalysis(
    dataSource: string,
    timeWindow: number
  ): Promise<Record<string, unknown>[]> {
    const windowStart = new Date();
    windowStart.setHours(windowStart.getHours() - timeWindow);

    const { data } = await this.supabase
      .from(dataSource)
      .select("*")
      .gte("created_at", windowStart.toISOString());

    return data || [];
  }

  private analyzeCompleteness(
    data: Record<string, unknown>[]
  ): DataQualityReport["completeness"] {
    if (data.length === 0) {
      return { score: 0, missingValues: {}, patterns: [] };
    }

    const missingValues: Record<string, number> = {};
    const columns = Object.keys(data[0] || {});

    columns.forEach(column => {
      const missingCount = data.filter(
        row =>
          row[column] === null ||
          row[column] === undefined ||
          row[column] === ""
      ).length;

      if (missingCount > 0) {
        missingValues[column] = (missingCount / data.length) * 100;
      }
    });

    const completenessRates = columns.map(
      column =>
        ((data.length -
          data.filter(
            row =>
              row[column] === null ||
              row[column] === undefined ||
              row[column] === ""
          ).length) /
          data.length) *
        100
    );

    const score =
      completenessRates.length > 0
        ? completenessRates.reduce((sum, rate) => sum + rate, 0) /
          completenessRates.length
        : 0;

    const patterns = this.identifyMissingPatterns(data, missingValues);

    return {
      score: Math.round(score * 100) / 100,
      missingValues,
      patterns,
    };
  }

  private identifyMissingPatterns(
    data: Record<string, unknown>[],
    missingValues: Record<string, number>
  ): string[] {
    const patterns: string[] = [];

    // Identify columns with high missing rates
    Object.entries(missingValues).forEach(([column, rate]) => {
      if (rate > 50) {
        patterns.push(`High missing rate in ${column}: ${rate.toFixed(1)}%`);
      }
    });

    // Identify correlated missing patterns
    const missingColumns = Object.keys(missingValues);
    for (let i = 0; i < missingColumns.length; i++) {
      for (let j = i + 1; j < missingColumns.length; j++) {
        const col1 = missingColumns[i];
        const col2 = missingColumns[j];

        const bothMissing = data.filter(
          row =>
            col1 &&
            col2 &&
            (row[col1] === null || row[col1] === undefined) &&
            (row[col2] === null || row[col2] === undefined)
        ).length;

        const correlation = (bothMissing / data.length) * 100;
        if (correlation > 20) {
          patterns.push(
            `Correlated missing values between ${col1} and ${col2}: ${correlation.toFixed(1)}%`
          );
        }
      }
    }

    return patterns;
  }

  private analyzeValidity(
    data: Record<string, unknown>[]
  ): DataQualityReport["validity"] {
    if (data.length === 0) {
      return { score: 0, invalidValues: {}, constraintViolations: [] };
    }

    const invalidValues: Record<string, number> = {};
    const constraintViolations: string[] = [];
    const columns = Object.keys(data[0] || {});

    columns.forEach(column => {
      const values = data.map(row => row[column]);
      const invalidCount = this.countInvalidValues(values, column);

      if (invalidCount > 0) {
        invalidValues[column] = (invalidCount / data.length) * 100;
      }
    });

    // Check common constraints
    this.checkCommonConstraints(data, constraintViolations);

    const validityRates = columns.map(column => {
      const invalidCount = this.countInvalidValues(
        data.map(row => row[column]),
        column
      );
      return ((data.length - invalidCount) / data.length) * 100;
    });

    const score =
      validityRates.length > 0
        ? validityRates.reduce((sum, rate) => sum + rate, 0) /
          validityRates.length
        : 0;

    return {
      score: Math.round(score * 100) / 100,
      invalidValues,
      constraintViolations,
    };
  }

  private countInvalidValues(values: unknown[], column: string): number {
    return values.filter(value => {
      // Check for common invalid patterns
      if (typeof value === "string") {
        // Email validation
        if (column.toLowerCase().includes("email")) {
          return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        }

        // URL validation
        if (column.toLowerCase().includes("url")) {
          try {
            new URL(value);
            return false;
          } catch {
            return true;
          }
        }

        // Phone validation (basic)
        if (column.toLowerCase().includes("phone")) {
          return !/^[\d\s\-\+\(\)]+$/.test(value);
        }
      }

      // Numeric validation
      if (
        column.toLowerCase().includes("age") ||
        column.toLowerCase().includes("count")
      ) {
        const num = Number(value);
        return isNaN(num) || num < 0;
      }

      return false;
    }).length;
  }

  private checkCommonConstraints(
    data: Record<string, unknown>[],
    violations: string[]
  ): void {
    // Check for future dates in creation timestamps
    const dateColumns = Object.keys(data[0] || {}).filter(
      col =>
        col.includes("date") ||
        col.includes("time") ||
        col.includes("created") ||
        col.includes("updated")
    );

    dateColumns.forEach(column => {
      const futureDates = data.filter(row => {
        const date = new Date(row[column] as string);
        return date > new Date();
      }).length;

      if (futureDates > 0) {
        violations.push(`${futureDates} future dates found in ${column}`);
      }
    });

    // Check for negative values in count/amount columns
    const numericColumns = Object.keys(data[0] || {}).filter(
      col =>
        col.includes("count") ||
        col.includes("amount") ||
        col.includes("price") ||
        col.includes("quantity")
    );

    numericColumns.forEach(column => {
      const negativeValues = data.filter(row => {
        const value = Number(row[column]);
        return !isNaN(value) && value < 0;
      }).length;

      if (negativeValues > 0) {
        violations.push(`${negativeValues} negative values found in ${column}`);
      }
    });
  }

  private analyzeAccuracy(
    data: Record<string, unknown>[]
  ): DataQualityReport["accuracy"] {
    if (data.length === 0) {
      return { score: 0, outliers: {}, anomalies: [] };
    }

    const outliers: Record<string, number[]> = {};
    const anomalies: string[] = [];
    const numericColumns = Object.keys(data[0] || {}).filter(column => {
      const values = data.map(row => row[column]);
      return values.some(
        value => typeof value === "number" || !isNaN(Number(value))
      );
    });

    numericColumns.forEach(column => {
      const values = data
        .map(row => Number(row[column]))
        .filter(value => !isNaN(value));

      if (values.length > 0) {
        const detectedOutliers = this.detectOutliers(values);
        if (detectedOutliers.length > 0) {
          outliers[column] = detectedOutliers;
        }
      }
    });

    // Detect common anomalies
    this.detectCommonAnomalies(data, anomalies);

    // Calculate accuracy score based on outlier percentage
    const totalValues = numericColumns.reduce((sum, column) => {
      return sum + data.filter(row => !isNaN(Number(row[column]))).length;
    }, 0);

    const totalOutliers = Object.values(outliers).reduce(
      (sum, outlierList) => sum + outlierList.length,
      0
    );
    const outlierRate = totalValues > 0 ? totalOutliers / totalValues : 0;
    const score = Math.max(0, (1 - outlierRate) * 100);

    return {
      score: Math.round(score * 100) / 100,
      outliers,
      anomalies,
    };
  }

  private detectCommonAnomalies(
    data: Record<string, unknown>[],
    anomalies: string[]
  ): void {
    // Detect impossible age values
    const ageColumn = Object.keys(data[0] || {}).find(col =>
      col.toLowerCase().includes("age")
    );
    if (ageColumn) {
      const impossibleAges = data.filter(row => {
        const age = Number(row[ageColumn]);
        return !isNaN(age) && (age < 0 || age > 150);
      }).length;

      if (impossibleAges > 0) {
        anomalies.push(`${impossibleAges} impossible age values detected`);
      }
    }

    // Detect impossible geographic coordinates
    const latColumn = Object.keys(data[0] || {}).find(col =>
      col.toLowerCase().includes("lat")
    );
    const lngColumn = Object.keys(data[0] || {}).find(
      col =>
        col.toLowerCase().includes("lng") || col.toLowerCase().includes("lon")
    );

    if (latColumn && lngColumn) {
      const invalidCoords = data.filter(row => {
        const lat = Number(row[latColumn]);
        const lng = Number(row[lngColumn]);
        return (
          !isNaN(lat) &&
          !isNaN(lng) &&
          (lat < -90 || lat > 90 || lng < -180 || lng > 180)
        );
      }).length;

      if (invalidCoords > 0) {
        anomalies.push(
          `${invalidCoords} invalid geographic coordinates detected`
        );
      }
    }
  }

  private analyzeConsistency(
    data: Record<string, unknown>[]
  ): DataQualityReport["consistency"] {
    if (data.length === 0) {
      return { score: 0, duplicates: 0, contradictions: [] };
    }

    // Count exact duplicates
    const duplicates = this.countDuplicates(data);

    // Detect contradictions
    const contradictions = this.detectContradictions(data);

    // Calculate consistency score
    const duplicateRate = duplicates / data.length;
    const contradictionRate = contradictions.length / data.length;
    const score = Math.max(0, (1 - duplicateRate - contradictionRate) * 100);

    return {
      score: Math.round(score * 100) / 100,
      duplicates,
      contradictions,
    };
  }

  private countDuplicates(data: Record<string, unknown>[]): number {
    const seen = new Set();
    let duplicates = 0;

    data.forEach(row => {
      const signature = JSON.stringify(row);
      if (seen.has(signature)) {
        duplicates++;
      } else {
        seen.add(signature);
      }
    });

    return duplicates;
  }

  private detectContradictions(data: Record<string, unknown>[]): string[] {
    const contradictions: string[] = [];

    // Group by potential identifier columns
    const idColumns = Object.keys(data[0] || {}).filter(
      col =>
        col.toLowerCase().includes("id") || col.toLowerCase().includes("email")
    );

    idColumns.forEach(idColumn => {
      const groups = new Map<string, Record<string, unknown>[]>();

      data.forEach(row => {
        const id = String(row[idColumn]);
        if (!groups.has(id)) {
          groups.set(id, []);
        }
        groups.get(id)!.push(row);
      });

      // Check for contradictions within groups
      groups.forEach((records, id) => {
        if (records.length > 1) {
          const firstRecord = records[0];
          const inconsistentFields = Object.keys(firstRecord || {}).filter(
            field => {
              const values = records.map(r => r[field]);
              const uniqueValues = new Set(values);
              return uniqueValues.size > 1;
            }
          );

          if (inconsistentFields.length > 0) {
            contradictions.push(
              `Contradictory values for ${id} in fields: ${inconsistentFields.join(", ")}`
            );
          }
        }
      });
    });

    return contradictions;
  }

  private analyzeTimeliness(
    data: Record<string, unknown>[]
  ): DataQualityReport["timeliness"] {
    if (data.length === 0) {
      return { score: 0, latencyMinutes: 0, staleRecords: 0 };
    }

    // Find timestamp columns
    const timestampColumns = Object.keys(data[0] || {}).filter(
      col =>
        col.includes("date") ||
        col.includes("time") ||
        col.includes("created") ||
        col.includes("updated")
    );

    if (timestampColumns.length === 0) {
      return { score: 100, latencyMinutes: 0, staleRecords: 0 };
    }

    const now = new Date();
    const timestamps = data
      .map(row => new Date(row[timestampColumns[0] || "timestamp"] as string))
      .filter(date => !isNaN(date.getTime()));

    if (timestamps.length === 0) {
      return { score: 0, latencyMinutes: 0, staleRecords: 0 };
    }

    // Calculate average latency
    const latencies = timestamps.map(
      timestamp => (now.getTime() - timestamp.getTime()) / (1000 * 60)
    );
    const avgLatency =
      latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;

    // Count stale records (older than 24 hours)
    const staleThreshold = 24 * 60; // 24 hours in minutes
    const staleRecords = latencies.filter(lat => lat > staleThreshold).length;

    // Calculate timeliness score
    const staleRate = staleRecords / data.length;
    const latencyScore = Math.max(0, 100 - avgLatency / 60); // Penalize high latency
    const score = Math.max(0, latencyScore * (1 - staleRate));

    return {
      score: Math.round(score * 100) / 100,
      latencyMinutes: Math.round(avgLatency * 100) / 100,
      staleRecords,
    };
  }

  private getQualityStatus(score: number): DataQualityReport["status"] {
    if (score >= 90) return "excellent";
    if (score >= 75) return "good";
    if (score >= 60) return "fair";
    return "poor";
  }

  private async analyzeQualityTrend(
    dataSource: string
  ): Promise<DataQualityReport["qualityTrend"]> {
    // Get historical quality scores
    const { data: historicalReports } = await this.supabase
      .from("data_quality_reports")
      .select("overall_score, timestamp")
      .eq("data_source", dataSource)
      .order("timestamp", { ascending: false })
      .limit(10);

    if (!historicalReports || historicalReports.length < 3) {
      return "stable";
    }

    const scores = historicalReports.map(r => Number(r.overall_score) || 0);
    const recentAvg =
      scores.slice(0, 3).reduce((sum, score) => sum + score, 0) / 3;
    const olderAvg =
      scores.slice(-3).reduce((sum, score) => sum + score, 0) / 3;
    const change = (recentAvg - olderAvg) / olderAvg;

    if (change > 0.05) return "improving";
    if (change < -0.05) return "declining";
    return "stable";
  }

  private generateQualityRecommendations(
    completeness: DataQualityReport["completeness"],
    validity: DataQualityReport["validity"],
    accuracy: DataQualityReport["accuracy"],
    consistency: DataQualityReport["consistency"],
    timeliness: DataQualityReport["timeliness"]
  ): string[] {
    const recommendations: string[] = [];

    if (completeness.score < 80) {
      recommendations.push(
        "Address missing data issues to improve completeness"
      );
      if (completeness.patterns.length > 0) {
        recommendations.push("Focus on identified missing data patterns");
      }
    }

    if (validity.score < 80) {
      recommendations.push("Implement stronger data validation rules");
      if (validity.constraintViolations.length > 0) {
        recommendations.push("Fix identified constraint violations");
      }
    }

    if (accuracy.score < 80) {
      recommendations.push("Investigate and handle outliers and anomalies");
      const totalOutliers = Object.values(accuracy.outliers).reduce(
        (sum, outliers) => sum + outliers.length,
        0
      );
      if (totalOutliers > 0) {
        recommendations.push(`Review ${totalOutliers} detected outliers`);
      }
    }

    if (consistency.score < 80) {
      recommendations.push("Resolve data inconsistencies and contradictions");
      if (consistency.duplicates > 0) {
        recommendations.push(
          `Remove ${consistency.duplicates} duplicate records`
        );
      }
    }

    if (timeliness.score < 80) {
      recommendations.push(
        "Improve data freshness and reduce processing latency"
      );
      if (timeliness.staleRecords > 0) {
        recommendations.push(`Update ${timeliness.staleRecords} stale records`);
      }
    }

    return recommendations;
  }

  private async storeQualityReport(report: DataQualityReport): Promise<void> {
    const { error } = await this.supabase.from("data_quality_reports").insert({
      report_id: report.reportId,
      timestamp: report.timestamp,
      overall_score: report.overallScore,
      status: report.status,
      report: report,
    });

    if (error) {
      console.error("Failed to store quality report:", error);
    }
  }

  private async runMonitoringCycle(): Promise<void> {
    console.log("Running monitoring cycle...");

    // Get all active model monitors
    const { data: monitors } = await this.supabase
      .from("model_monitors")
      .select("*")
      .eq("status", "healthy")
      .or("status.eq.warning,status.eq.critical");

    if (!monitors || monitors.length === 0) {
      return;
    }

    for (const monitor of monitors) {
      try {
        const config = monitor.config as ModelPerformanceMonitor;

        if (!config.monitoring.enabled) {
          continue;
        }

        // Check if it's time to monitor this model
        const lastChecked = new Date(
          (monitor.last_checked as string) || new Date().toISOString()
        );
        const nextCheck = new Date(
          lastChecked.getTime() + config.monitoring.checkInterval * 60 * 1000
        );

        if (new Date() < nextCheck) {
          continue;
        }

        // Perform drift detection
        await this.performScheduledDriftCheck(config.modelId);

        // Update last checked timestamp
        await this.supabase
          .from("model_monitors")
          .update({ last_checked: new Date().toISOString() })
          .eq("model_id", config.modelId);
      } catch (error) {
        console.error(`Error monitoring model ${monitor.model_id}:`, error);
      }
    }
  }

  private async performScheduledDriftCheck(modelId: string): Promise<void> {
    // This would get recent prediction data and perform drift detection
    // For now, just log that we would perform the check
    console.log(`Performing scheduled drift check for model ${modelId}`);

    // In a real implementation, this would:
    // 1. Get recent prediction data
    // 2. Extract features and predictions
    // 3. Call detectDrift method
    // 4. Store results and trigger alerts if needed
  }
}

// Export singleton instance
export const performanceMonitoring = PerformanceMonitoringService.getInstance();
