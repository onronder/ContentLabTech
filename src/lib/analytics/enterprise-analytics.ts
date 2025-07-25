/**
 * Enterprise Analytics Module
 * Advanced analytics including cohort analysis, forecasting, custom metrics, and real-time processing
 */

import { createClient } from "@supabase/supabase-js";
import { statisticalEngine, type RegressionResult } from "./statistical-engine";
import { dataValidationService } from "./data-validation";

export interface CohortAnalysisConfig {
  cohortId: string;
  name: string;
  description: string;

  // Cohort definition
  cohortDefinition: {
    timeColumn: string; // Column to define cohort (e.g., 'first_visit', 'signup_date')
    eventColumn: string; // Column for tracking events (e.g., 'visit_date', 'purchase_date')
    valueColumn?: string; // Optional value column for revenue cohorts
    userIdColumn: string; // User identifier column
  };

  // Time parameters
  cohortPeriod: "daily" | "weekly" | "monthly" | "quarterly";
  analysisPeriods: number; // Number of periods to analyze (e.g., 12 months)

  // Filters
  filters?: Record<string, unknown>;
  segmentBy?: string[]; // Additional segmentation dimensions

  // Metrics to calculate
  metrics: CohortMetric[];
}

export interface CohortMetric {
  name: string;
  type: "retention" | "revenue" | "frequency" | "custom";
  aggregation: "count" | "sum" | "avg" | "median" | "unique";
  formula?: string; // For custom metrics
}

export interface CohortAnalysisResult {
  cohortId: string;
  cohortTable: CohortData[][];
  cohortSummary: {
    totalCohorts: number;
    totalUsers: number;
    avgCohortSize: number;
    retentionRates: number[];
    lifetimeValue?: number[];
  };
  insights: {
    bestPerformingCohort: string;
    worstPerformingCohort: string;
    retentionTrend: "improving" | "declining" | "stable";
    recommendations: string[];
  };
  generatedAt: string;
}

export interface CohortData {
  cohortPeriod: string;
  analysisPeriod: number;
  userCount: number;
  retentionRate: number;
  value: number;
  percentage: number;
}

export interface ForecastConfig {
  forecastId: string;
  name: string;
  description: string;

  // Data source
  dataSource: {
    table: string;
    dateColumn: string;
    valueColumn: string;
    filters?: Record<string, unknown>;
  };

  // Forecast parameters
  forecastHorizon: number; // Number of periods to forecast
  forecastFrequency: "daily" | "weekly" | "monthly" | "quarterly";
  confidence: number[]; // Confidence intervals (e.g., [0.8, 0.95])

  // Model configuration
  models: ("linear" | "exponential" | "seasonal" | "arima")[];
  seasonalityPeriod?: number; // For seasonal models

  // Validation
  holdoutPeriods: number; // Periods to hold out for validation
}

export interface ForecastResult {
  forecastId: string;
  modelUsed: string;
  accuracy: {
    mape: number; // Mean Absolute Percentage Error
    rmse: number; // Root Mean Square Error
    mae: number; // Mean Absolute Error
    r2: number; // R-squared
  };

  forecast: ForecastPoint[];
  historical: ForecastPoint[];

  confidence: {
    level: number;
    intervals: Array<{
      period: string;
      lower: number;
      upper: number;
    }>;
  }[];

  insights: {
    trend: "increasing" | "decreasing" | "stable";
    seasonality: boolean;
    changePoints: string[];
    risks: string[];
    opportunities: string[];
  };

  generatedAt: string;
  nextUpdate: string;
}

export interface ForecastPoint {
  period: string;
  actual?: number;
  predicted: number;
  residual?: number;
}

export interface CustomMetricConfig {
  metricId: string;
  name: string;
  description: string;
  category: string;

  // Calculation definition
  formula: string; // SQL-like formula or expression
  dataSource: {
    tables: string[];
    joins?: Array<{
      table: string;
      condition: string;
    }>;
    filters?: Record<string, unknown>;
  };

  // Aggregation
  aggregation: "sum" | "avg" | "count" | "median" | "percentile" | "custom";
  dimensions?: string[]; // Grouping dimensions

  // Refresh settings
  refreshInterval: number; // Minutes
  dependencies?: string[]; // Other metrics this depends on

  // Validation
  expectedRange?: [number, number];
  alertThresholds?: {
    warning: number;
    critical: number;
  };
}

export interface CustomMetricResult {
  metricId: string;
  value: number;
  dimensions?: Record<string, unknown>;
  calculatedAt: string;
  dataQuality: {
    completeness: number;
    freshness: number; // Minutes since last data point
    accuracy: number;
  };
  historicalValues?: Array<{
    period: string;
    value: number;
  }>;
}

export interface RealTimeStreamConfig {
  streamId: string;
  name: string;
  description: string;

  // Data source
  source: {
    type: "webhook" | "database" | "queue" | "file";
    endpoint?: string;
    table?: string;
    pollInterval?: number; // For database/file sources
  };

  // Processing rules
  transformations: Array<{
    type: "filter" | "aggregate" | "enrich" | "validate";
    config: Record<string, unknown>;
  }>;

  // Output targets
  outputs: Array<{
    type: "dashboard" | "alert" | "webhook" | "database";
    config: Record<string, unknown>;
  }>;

  // Processing settings
  batchSize: number;
  bufferTime: number; // Milliseconds
  errorHandling: "retry" | "skip" | "alert";
}

export class EnterpriseAnalytics {
  private supabase: ReturnType<typeof createClient>;
  private static instance: EnterpriseAnalytics;

  private constructor() {
    this.supabase = createClient(
      process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
      process.env["SUPABASE_SECRET_KEY"]!
    );
  }

  public static getInstance(): EnterpriseAnalytics {
    if (!EnterpriseAnalytics.instance) {
      EnterpriseAnalytics.instance = new EnterpriseAnalytics();
    }
    return EnterpriseAnalytics.instance;
  }

  /**
   * Perform cohort analysis
   */
  public async performCohortAnalysis(
    config: CohortAnalysisConfig
  ): Promise<CohortAnalysisResult> {
    console.log(`Starting cohort analysis: ${config.name}`);

    // Build cohort query
    const cohortQuery = this.buildCohortQuery(config);

    // Execute cohort analysis
    const { data: cohortData, error } = await this.supabase.rpc(
      "analyze_cohorts",
      {
        query: cohortQuery,
        config: config,
      }
    );

    if (error) {
      console.error("Cohort analysis failed:", error);
      throw new Error(`Cohort analysis failed: ${error.message}`);
    }

    // Process and structure cohort data
    const cohortTable = this.processCohortData(cohortData, config);

    // Calculate summary statistics
    const cohortSummary = this.calculateCohortSummary(cohortTable);

    // Generate insights
    const insights = this.generateCohortInsights(cohortTable, cohortSummary);

    return {
      cohortId: config.cohortId,
      cohortTable,
      cohortSummary,
      insights,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate forecast with multiple models
   */
  public async generateForecast(
    config: ForecastConfig
  ): Promise<ForecastResult> {
    console.log(`Generating forecast: ${config.name}`);

    // Get historical data
    const historicalData = await this.getHistoricalData(config);

    if (historicalData.length < 10) {
      throw new Error(
        "Insufficient historical data for forecasting (minimum 10 periods required)"
      );
    }

    // Split data for validation
    const trainData = historicalData.slice(0, -config.holdoutPeriods);
    const testData = historicalData.slice(-config.holdoutPeriods);

    // Train and evaluate multiple models
    const modelResults = await Promise.all(
      config.models.map(modelType =>
        this.trainForecastModel(modelType, trainData, testData, config)
      )
    );

    // Select best model based on accuracy
    const bestModel = modelResults.reduce((best, current) =>
      current.accuracy.mape < best.accuracy.mape ? current : best
    );

    // Generate forecast with best model
    const forecast = await this.generateForecastPoints(bestModel, config);

    // Calculate confidence intervals
    const confidenceIntervals = config.confidence.map(level => ({
      level,
      intervals: this.calculateConfidenceIntervals(forecast, level),
    }));

    // Generate insights
    const insights = this.generateForecastInsights(historicalData, forecast);

    return {
      forecastId: config.forecastId,
      modelUsed: bestModel.type,
      accuracy: bestModel.accuracy,
      forecast,
      historical: historicalData,
      confidence: confidenceIntervals,
      insights,
      generatedAt: new Date().toISOString(),
      nextUpdate: this.calculateNextUpdate(config.forecastFrequency),
    };
  }

  /**
   * Calculate custom metric
   */
  public async calculateCustomMetric(
    config: CustomMetricConfig
  ): Promise<CustomMetricResult> {
    console.log(`Calculating custom metric: ${config.name}`);

    try {
      // Build and execute query
      const query = this.buildCustomMetricQuery(config);
      const { data, error } = await this.supabase.rpc(
        "calculate_custom_metric",
        {
          query,
          config,
        }
      );

      if (error) {
        throw new Error(`Custom metric calculation failed: ${error.message}`);
      }

      // Validate result
      const validation = this.validateCustomMetricResult(data, config);

      // Get historical values for trend analysis
      const historicalValues = await this.getMetricHistory(config.metricId);

      return {
        metricId: config.metricId,
        value: data.value,
        dimensions: data.dimensions,
        calculatedAt: new Date().toISOString(),
        dataQuality: validation,
        historicalValues,
      };
    } catch (error) {
      console.error("Custom metric calculation failed:", error);
      throw error;
    }
  }

  /**
   * Setup real-time analytics stream
   */
  public async setupRealTimeStream(
    config: RealTimeStreamConfig
  ): Promise<void> {
    console.log(`Setting up real-time stream: ${config.name}`);

    // Store stream configuration
    const { error } = await this.supabase.from("realtime_streams").upsert({
      stream_id: config.streamId,
      name: config.name,
      description: config.description,
      config: config,
      status: "active",
      created_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Failed to setup stream: ${error.message}`);
    }

    // Initialize stream processor based on source type
    switch (config.source.type) {
      case "webhook":
        await this.setupWebhookStream(config);
        break;
      case "database":
        await this.setupDatabaseStream(config);
        break;
      case "queue":
        await this.setupQueueStream(config);
        break;
      case "file":
        await this.setupFileStream(config);
        break;
    }

    console.log(`Real-time stream ${config.streamId} is now active`);
  }

  /**
   * Process real-time data batch
   */
  public async processRealTimeBatch(
    streamId: string,
    data: Record<string, unknown>[]
  ): Promise<void> {
    // Get stream configuration
    const { data: streamConfig } = await this.supabase
      .from("realtime_streams")
      .select("config")
      .eq("stream_id", streamId)
      .single();

    if (!streamConfig) {
      throw new Error(`Stream ${streamId} not found`);
    }

    const config = streamConfig.config as RealTimeStreamConfig;

    // Apply transformations
    let processedData = data;
    for (const transformation of config.transformations) {
      processedData = await this.applyTransformation(
        processedData,
        transformation
      );
    }

    // Validate processed data
    const validData = processedData.filter(record => {
      const validation = dataValidationService.validateDataPoint(
        "analytics",
        record
      );
      return validation.isValid;
    });

    // Send to outputs
    for (const output of config.outputs) {
      await this.sendToOutput(validData, output);
    }

    // Update processing metrics
    await this.updateStreamMetrics(streamId, {
      processed: data.length,
      valid: validData.length,
      invalid: data.length - validData.length,
      lastProcessed: new Date().toISOString(),
    });
  }

  // Private helper methods

  private buildCohortQuery(config: CohortAnalysisConfig): string {
    const { cohortDefinition, cohortPeriod, analysisPeriods } = config;

    // This would build a complex SQL query for cohort analysis
    // Simplified version here
    return `
      WITH cohorts AS (
        SELECT 
          ${this.formatCohortPeriod(cohortDefinition.timeColumn, cohortPeriod)} as cohort_period,
          ${cohortDefinition.userIdColumn} as user_id,
          MIN(${cohortDefinition.timeColumn}) as first_event
        FROM ${config.cohortDefinition.timeColumn.split(".")[0]}
        GROUP BY cohort_period, user_id
      ),
      events AS (
        SELECT 
          ${cohortDefinition.userIdColumn} as user_id,
          ${this.formatCohortPeriod(cohortDefinition.eventColumn, cohortPeriod)} as event_period,
          ${cohortDefinition.valueColumn || "1"} as event_value
        FROM ${config.cohortDefinition.eventColumn.split(".")[0]}
      )
      SELECT 
        c.cohort_period,
        DATEDIFF(${cohortPeriod}, c.cohort_period, e.event_period) as period_number,
        COUNT(DISTINCT e.user_id) as user_count,
        SUM(e.event_value) as total_value
      FROM cohorts c
      LEFT JOIN events e ON c.user_id = e.user_id
      WHERE period_number <= ${analysisPeriods}
      GROUP BY c.cohort_period, period_number
      ORDER BY c.cohort_period, period_number
    `;
  }

  private formatCohortPeriod(column: string, period: string): string {
    switch (period) {
      case "daily":
        return `DATE(${column})`;
      case "weekly":
        return `DATE_TRUNC('week', ${column})`;
      case "monthly":
        return `DATE_TRUNC('month', ${column})`;
      case "quarterly":
        return `DATE_TRUNC('quarter', ${column})`;
      default:
        return `DATE(${column})`;
    }
  }

  private processCohortData(
    rawData: any[],
    config: CohortAnalysisConfig
  ): CohortData[][] {
    // Group data by cohort period and analysis period
    const cohortMap = new Map<string, Map<number, CohortData>>();

    rawData.forEach(row => {
      const cohortPeriod = row.cohort_period;
      const analysisPeriod = row.period_number;

      if (!cohortMap.has(cohortPeriod)) {
        cohortMap.set(cohortPeriod, new Map());
      }

      const retentionRate =
        row.user_count / (row.cohort_size || row.user_count);

      cohortMap.get(cohortPeriod)!.set(analysisPeriod, {
        cohortPeriod,
        analysisPeriod,
        userCount: row.user_count,
        retentionRate: Math.round(retentionRate * 10000) / 100,
        value: row.total_value || 0,
        percentage: retentionRate * 100,
      });
    });

    // Convert to 2D array format
    const cohortPeriods = Array.from(cohortMap.keys()).sort();
    const maxPeriods = config.analysisPeriods;

    return cohortPeriods.map(cohortPeriod => {
      const cohortData = cohortMap.get(cohortPeriod)!;
      const row: CohortData[] = [];

      for (let period = 0; period <= maxPeriods; period++) {
        row.push(
          cohortData.get(period) || {
            cohortPeriod,
            analysisPeriod: period,
            userCount: 0,
            retentionRate: 0,
            value: 0,
            percentage: 0,
          }
        );
      }

      return row;
    });
  }

  private calculateCohortSummary(
    cohortTable: CohortData[][]
  ): CohortAnalysisResult["cohortSummary"] {
    const totalCohorts = cohortTable.length;
    const totalUsers = cohortTable.reduce(
      (sum, cohort) => sum + (cohort[0]?.userCount || 0),
      0
    );
    const avgCohortSize = totalCohorts > 0 ? totalUsers / totalCohorts : 0;

    // Calculate average retention rates by period
    const retentionRates: number[] = [];
    const maxPeriods = cohortTable[0]?.length || 0;

    for (let period = 0; period < maxPeriods; period++) {
      const rates = cohortTable
        .map(cohort => cohort[period]?.retentionRate || 0)
        .filter(rate => rate > 0);

      const avgRate =
        rates.length > 0
          ? rates.reduce((sum, rate) => sum + rate, 0) / rates.length
          : 0;

      retentionRates.push(Math.round(avgRate * 100) / 100);
    }

    return {
      totalCohorts,
      totalUsers,
      avgCohortSize: Math.round(avgCohortSize),
      retentionRates,
    };
  }

  private generateCohortInsights(
    cohortTable: CohortData[][],
    summary: CohortAnalysisResult["cohortSummary"]
  ): CohortAnalysisResult["insights"] {
    // Find best and worst performing cohorts
    const cohortPerformance = cohortTable.map((cohort, index) => ({
      index,
      cohortPeriod: cohort[0].cohortPeriod,
      avgRetention:
        cohort
          .slice(1, 4)
          .reduce((sum, period) => sum + period.retentionRate, 0) / 3,
    }));

    cohortPerformance.sort((a, b) => b.avgRetention - a.avgRetention);

    const bestPerformingCohort = cohortPerformance[0]?.cohortPeriod || "None";
    const worstPerformingCohort =
      cohortPerformance[cohortPerformance.length - 1]?.cohortPeriod || "None";

    // Analyze retention trend
    const retentionTrend = this.analyzeRetentionTrend(summary.retentionRates);

    // Generate recommendations
    const recommendations = this.generateCohortRecommendations(
      cohortTable,
      summary,
      retentionTrend
    );

    return {
      bestPerformingCohort,
      worstPerformingCohort,
      retentionTrend,
      recommendations,
    };
  }

  private analyzeRetentionTrend(
    retentionRates: number[]
  ): "improving" | "declining" | "stable" {
    if (retentionRates.length < 3) return "stable";

    const recent = retentionRates.slice(-3);
    const earlier = retentionRates.slice(0, 3);

    const recentAvg =
      recent.reduce((sum, rate) => sum + rate, 0) / recent.length;
    const earlierAvg =
      earlier.reduce((sum, rate) => sum + rate, 0) / earlier.length;

    const change = (recentAvg - earlierAvg) / earlierAvg;

    if (change > 0.05) return "improving";
    if (change < -0.05) return "declining";
    return "stable";
  }

  private generateCohortRecommendations(
    cohortTable: CohortData[][],
    summary: CohortAnalysisResult["cohortSummary"],
    trend: "improving" | "declining" | "stable"
  ): string[] {
    const recommendations: string[] = [];

    // Retention rate recommendations
    if (summary.retentionRates[1] < 20) {
      recommendations.push(
        "Early retention is low. Focus on improving onboarding experience."
      );
    }

    if (trend === "declining") {
      recommendations.push(
        "Retention trend is declining. Investigate recent product changes or market factors."
      );
    }

    // Cohort size recommendations
    if (summary.avgCohortSize < 100) {
      recommendations.push(
        "Small cohort sizes may limit statistical significance. Consider longer analysis periods."
      );
    }

    // Performance variation recommendations
    const retentionVariation = this.calculateRetentionVariation(cohortTable);
    if (retentionVariation > 0.3) {
      recommendations.push(
        "High variation in cohort performance. Analyze external factors affecting different time periods."
      );
    }

    return recommendations;
  }

  private calculateRetentionVariation(cohortTable: CohortData[][]): number {
    const firstPeriodRates = cohortTable.map(
      cohort => cohort[1]?.retentionRate || 0
    );
    const mean =
      firstPeriodRates.reduce((sum, rate) => sum + rate, 0) /
      firstPeriodRates.length;
    const variance =
      firstPeriodRates.reduce(
        (sum, rate) => sum + Math.pow(rate - mean, 2),
        0
      ) / firstPeriodRates.length;
    return Math.sqrt(variance) / mean; // Coefficient of variation
  }

  private async getHistoricalData(
    config: ForecastConfig
  ): Promise<ForecastPoint[]> {
    const { data, error } = await this.supabase
      .from(config.dataSource.table)
      .select(
        `${config.dataSource.dateColumn}, ${config.dataSource.valueColumn}`
      )
      .order(config.dataSource.dateColumn, { ascending: true });

    if (error) {
      throw new Error(`Failed to get historical data: ${error.message}`);
    }

    return (data || []).map(row => ({
      period: row[config.dataSource.dateColumn],
      actual: row[config.dataSource.valueColumn],
      predicted: row[config.dataSource.valueColumn], // Same as actual for historical data
    }));
  }

  private async trainForecastModel(
    modelType: string,
    trainData: ForecastPoint[],
    testData: ForecastPoint[],
    config: ForecastConfig
  ): Promise<{
    type: string;
    accuracy: ForecastResult["accuracy"];
    model: any;
  }> {
    // Extract values for training
    const trainValues = trainData.map(point => point.actual!);
    const testValues = testData.map(point => point.actual!);

    let predictions: number[] = [];
    let model: any = {};

    switch (modelType) {
      case "linear":
        // Linear trend model
        const linearRegression = statisticalEngine.performLinearRegression(
          Array.from({ length: trainValues.length }, (_, i) => i),
          trainValues
        );
        model = linearRegression;

        // Generate predictions
        predictions = testData.map(
          (_, i) =>
            linearRegression.slope * (trainValues.length + i) +
            linearRegression.intercept
        );
        break;

      case "exponential":
        // Exponential smoothing
        model = this.trainExponentialSmoothing(trainValues);
        predictions = this.predictExponentialSmoothing(model, testData.length);
        break;

      case "seasonal":
        // Seasonal decomposition with trend
        model = this.trainSeasonalModel(
          trainValues,
          config.seasonalityPeriod || 12
        );
        predictions = this.predictSeasonalModel(model, testData.length);
        break;

      default:
        // Simple moving average as fallback
        const windowSize = Math.min(5, trainValues.length);
        const movingAvg =
          trainValues.slice(-windowSize).reduce((sum, val) => sum + val, 0) /
          windowSize;
        predictions = testData.map(() => movingAvg);
        model = { type: "moving_average", value: movingAvg };
    }

    // Calculate accuracy metrics
    const accuracy = this.calculateForecastAccuracy(testValues, predictions);

    return {
      type: modelType,
      accuracy,
      model,
    };
  }

  private trainExponentialSmoothing(data: number[]): {
    alpha: number;
    level: number;
  } {
    // Simple exponential smoothing
    const alpha = 0.3; // Smoothing parameter
    let level = data[0];

    for (let i = 1; i < data.length; i++) {
      level = alpha * data[i] + (1 - alpha) * level;
    }

    return { alpha, level };
  }

  private predictExponentialSmoothing(
    model: { alpha: number; level: number },
    periods: number
  ): number[] {
    // For simple exponential smoothing, forecast is flat
    return Array(periods).fill(model.level);
  }

  private trainSeasonalModel(
    data: number[],
    seasonPeriod: number
  ): {
    trend: number;
    seasonal: number[];
    level: number;
  } {
    // Simplified seasonal decomposition
    const level = data.reduce((sum, val) => sum + val, 0) / data.length;

    // Calculate trend
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    const firstAvg =
      firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    const trend = (secondAvg - firstAvg) / (data.length / 2);

    // Calculate seasonal factors
    const seasonal: number[] = [];
    for (let s = 0; s < seasonPeriod; s++) {
      const seasonalValues = [];
      for (let i = s; i < data.length; i += seasonPeriod) {
        seasonalValues.push(data[i]);
      }
      const seasonalAvg =
        seasonalValues.reduce((sum, val) => sum + val, 0) /
        seasonalValues.length;
      seasonal.push(seasonalAvg / level); // Multiplicative seasonal factor
    }

    return { trend, seasonal, level };
  }

  private predictSeasonalModel(
    model: { trend: number; seasonal: number[]; level: number },
    periods: number
  ): number[] {
    const predictions: number[] = [];

    for (let i = 0; i < periods; i++) {
      const seasonalIndex = i % model.seasonal.length;
      const seasonalFactor = model.seasonal[seasonalIndex];
      const forecast = (model.level + model.trend * i) * seasonalFactor;
      predictions.push(forecast);
    }

    return predictions;
  }

  private calculateForecastAccuracy(
    actual: number[],
    predicted: number[]
  ): ForecastResult["accuracy"] {
    if (actual.length !== predicted.length || actual.length === 0) {
      return { mape: 100, rmse: 0, mae: 0, r2: 0 };
    }

    // Mean Absolute Percentage Error
    const mape =
      (actual.reduce((sum, act, i) => {
        const error = Math.abs(act - predicted[i]) / Math.abs(act || 1);
        return sum + error;
      }, 0) /
        actual.length) *
      100;

    // Root Mean Square Error
    const mse =
      actual.reduce((sum, act, i) => {
        return sum + Math.pow(act - predicted[i], 2);
      }, 0) / actual.length;
    const rmse = Math.sqrt(mse);

    // Mean Absolute Error
    const mae =
      actual.reduce((sum, act, i) => {
        return sum + Math.abs(act - predicted[i]);
      }, 0) / actual.length;

    // R-squared
    const actualMean =
      actual.reduce((sum, val) => sum + val, 0) / actual.length;
    const totalSumSquares = actual.reduce(
      (sum, val) => sum + Math.pow(val - actualMean, 2),
      0
    );
    const residualSumSquares = actual.reduce(
      (sum, act, i) => sum + Math.pow(act - predicted[i], 2),
      0
    );
    const r2 =
      totalSumSquares === 0 ? 0 : 1 - residualSumSquares / totalSumSquares;

    return {
      mape: Math.round(mape * 100) / 100,
      rmse: Math.round(rmse * 100) / 100,
      mae: Math.round(mae * 100) / 100,
      r2: Math.round(r2 * 10000) / 10000,
    };
  }

  private async generateForecastPoints(
    bestModel: { type: string; model: any },
    config: ForecastConfig
  ): Promise<ForecastPoint[]> {
    const forecast: ForecastPoint[] = [];
    const startDate = new Date();

    for (let i = 0; i < config.forecastHorizon; i++) {
      const forecastDate = new Date(startDate);

      switch (config.forecastFrequency) {
        case "daily":
          forecastDate.setDate(startDate.getDate() + i);
          break;
        case "weekly":
          forecastDate.setDate(startDate.getDate() + i * 7);
          break;
        case "monthly":
          forecastDate.setMonth(startDate.getMonth() + i);
          break;
        case "quarterly":
          forecastDate.setMonth(startDate.getMonth() + i * 3);
          break;
      }

      // Generate prediction based on model type
      let predicted = 0;
      switch (bestModel.type) {
        case "linear":
          predicted = bestModel.model.slope * i + bestModel.model.intercept;
          break;
        case "exponential":
          predicted = bestModel.model.level;
          break;
        case "seasonal":
          const seasonalIndex = i % bestModel.model.seasonal.length;
          predicted =
            (bestModel.model.level + bestModel.model.trend * i) *
            bestModel.model.seasonal[seasonalIndex];
          break;
        default:
          predicted = bestModel.model.value || 0;
      }

      forecast.push({
        period: forecastDate.toISOString().split("T")[0],
        predicted: Math.max(0, Math.round(predicted * 100) / 100),
      });
    }

    return forecast;
  }

  private calculateConfidenceIntervals(
    forecast: ForecastPoint[],
    confidenceLevel: number
  ): ForecastResult["confidence"][0]["intervals"] {
    // Simplified confidence interval calculation
    // In production, this would use proper statistical methods
    const zScore =
      confidenceLevel === 0.95 ? 1.96 : confidenceLevel === 0.8 ? 1.28 : 1.64;

    return forecast.map(point => {
      const margin = point.predicted * 0.1 * zScore; // 10% base uncertainty
      return {
        period: point.period,
        lower: Math.max(0, Math.round((point.predicted - margin) * 100) / 100),
        upper: Math.round((point.predicted + margin) * 100) / 100,
      };
    });
  }

  private generateForecastInsights(
    historical: ForecastPoint[],
    forecast: ForecastPoint[]
  ): ForecastResult["insights"] {
    // Analyze trend
    const recentValues = historical.slice(-5).map(p => p.actual!);
    const forecastValues = forecast.slice(0, 5).map(p => p.predicted);

    const historicalAvg =
      recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const forecastAvg =
      forecastValues.reduce((sum, val) => sum + val, 0) / forecastValues.length;

    const trendChange = (forecastAvg - historicalAvg) / historicalAvg;

    let trend: "increasing" | "decreasing" | "stable";
    if (trendChange > 0.05) trend = "increasing";
    else if (trendChange < -0.05) trend = "decreasing";
    else trend = "stable";

    // Detect seasonality (simplified)
    const seasonality = this.detectSeasonality(historical.map(p => p.actual!));

    // Generate risks and opportunities
    const risks: string[] = [];
    const opportunities: string[] = [];

    if (trend === "decreasing") {
      risks.push("Forecast shows declining trend");
    }
    if (trend === "increasing") {
      opportunities.push("Forecast indicates growth opportunity");
    }
    if (seasonality) {
      opportunities.push(
        "Seasonal patterns detected - optimize for peak periods"
      );
    }

    return {
      trend,
      seasonality,
      changePoints: [], // Would be calculated from actual change point detection
      risks,
      opportunities,
    };
  }

  private detectSeasonality(data: number[]): boolean {
    // Simple seasonality detection using autocorrelation
    if (data.length < 24) return false;

    const periods = [7, 12, 24]; // Weekly, monthly, yearly patterns

    for (const period of periods) {
      if (data.length < period * 2) continue;

      const correlation = this.calculateAutocorrelation(data, period);
      if (Math.abs(correlation) > 0.3) {
        return true;
      }
    }

    return false;
  }

  private calculateAutocorrelation(data: number[], lag: number): number {
    if (data.length <= lag) return 0;

    const x = data.slice(0, -lag);
    const y = data.slice(lag);

    return statisticalEngine.calculatePearsonCorrelation(x, y).value;
  }

  private buildCustomMetricQuery(config: CustomMetricConfig): string {
    // Build SQL query from configuration
    // This is a simplified version - production would have full SQL parsing
    let query = `SELECT ${config.formula} as value`;

    if (config.dimensions && config.dimensions.length > 0) {
      query += `, ${config.dimensions.join(", ")}`;
    }

    query += ` FROM ${config.dataSource.tables.join(", ")}`;

    if (config.dataSource.joins) {
      config.dataSource.joins.forEach(join => {
        query += ` JOIN ${join.table} ON ${join.condition}`;
      });
    }

    if (config.dataSource.filters) {
      const filterConditions = Object.entries(config.dataSource.filters).map(
        ([key, value]) => `${key} = '${value}'`
      );
      query += ` WHERE ${filterConditions.join(" AND ")}`;
    }

    if (config.dimensions && config.dimensions.length > 0) {
      query += ` GROUP BY ${config.dimensions.join(", ")}`;
    }

    return query;
  }

  private validateCustomMetricResult(
    data: any,
    config: CustomMetricConfig
  ): CustomMetricResult["dataQuality"] {
    let completeness = 100;
    let accuracy = 100;
    const freshness = 0; // Assume real-time for now

    // Check expected range
    if (config.expectedRange) {
      const [min, max] = config.expectedRange;
      if (data.value < min || data.value > max) {
        accuracy -= 20;
      }
    }

    // Check for null/undefined values
    if (data.value === null || data.value === undefined) {
      completeness = 0;
      accuracy = 0;
    }

    return {
      completeness,
      freshness,
      accuracy,
    };
  }

  private async getMetricHistory(
    metricId: string
  ): Promise<CustomMetricResult["historicalValues"]> {
    const { data } = await this.supabase
      .from("custom_metric_history")
      .select("period, value")
      .eq("metric_id", metricId)
      .order("period", { ascending: false })
      .limit(30);

    return data || [];
  }

  private calculateNextUpdate(frequency: string): string {
    const now = new Date();
    switch (frequency) {
      case "daily":
        now.setDate(now.getDate() + 1);
        break;
      case "weekly":
        now.setDate(now.getDate() + 7);
        break;
      case "monthly":
        now.setMonth(now.getMonth() + 1);
        break;
      case "quarterly":
        now.setMonth(now.getMonth() + 3);
        break;
    }
    return now.toISOString();
  }

  // Real-time stream processing methods

  private async setupWebhookStream(
    config: RealTimeStreamConfig
  ): Promise<void> {
    // Setup webhook endpoint to receive data
    console.log(`Setting up webhook stream for ${config.streamId}`);
    // Implementation would setup actual webhook endpoint
  }

  private async setupDatabaseStream(
    config: RealTimeStreamConfig
  ): Promise<void> {
    // Setup database polling
    console.log(`Setting up database stream for ${config.streamId}`);
    // Implementation would setup polling mechanism
  }

  private async setupQueueStream(config: RealTimeStreamConfig): Promise<void> {
    // Setup queue consumer
    console.log(`Setting up queue stream for ${config.streamId}`);
    // Implementation would setup queue consumer
  }

  private async setupFileStream(config: RealTimeStreamConfig): Promise<void> {
    // Setup file monitoring
    console.log(`Setting up file stream for ${config.streamId}`);
    // Implementation would setup file watcher
  }

  private async applyTransformation(
    data: Record<string, unknown>[],
    transformation: RealTimeStreamConfig["transformations"][0]
  ): Promise<Record<string, unknown>[]> {
    switch (transformation.type) {
      case "filter":
        return data.filter(record =>
          this.applyFilter(record, transformation.config)
        );
      case "aggregate":
        return this.applyAggregation(data, transformation.config);
      case "enrich":
        return await this.applyEnrichment(data, transformation.config);
      case "validate":
        return data.filter(record =>
          this.validateRecord(record, transformation.config)
        );
      default:
        return data;
    }
  }

  private applyFilter(
    record: Record<string, unknown>,
    config: Record<string, unknown>
  ): boolean {
    // Apply filter conditions
    for (const [key, value] of Object.entries(config)) {
      if (record[key] !== value) {
        return false;
      }
    }
    return true;
  }

  private applyAggregation(
    data: Record<string, unknown>[],
    config: Record<string, unknown>
  ): Record<string, unknown>[] {
    // Simple aggregation implementation
    const groupBy = config.groupBy as string[];
    const aggregate = config.aggregate as Record<string, string>;

    const groups = new Map<string, Record<string, unknown>[]>();

    // Group data
    data.forEach(record => {
      const key = groupBy.map(field => record[field]).join("|");
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(record);
    });

    // Apply aggregations
    return Array.from(groups.entries()).map(([key, records]) => {
      const result: Record<string, unknown> = {};

      // Add grouping fields
      groupBy.forEach((field, index) => {
        result[field] = key.split("|")[index];
      });

      // Apply aggregation functions
      Object.entries(aggregate).forEach(([field, func]) => {
        const values = records
          .map(r => r[field] as number)
          .filter(v => typeof v === "number");

        switch (func) {
          case "sum":
            result[`${field}_sum`] = values.reduce((sum, val) => sum + val, 0);
            break;
          case "avg":
            result[`${field}_avg`] =
              values.length > 0
                ? values.reduce((sum, val) => sum + val, 0) / values.length
                : 0;
            break;
          case "count":
            result[`${field}_count`] = records.length;
            break;
          case "max":
            result[`${field}_max`] =
              values.length > 0 ? Math.max(...values) : 0;
            break;
          case "min":
            result[`${field}_min`] =
              values.length > 0 ? Math.min(...values) : 0;
            break;
        }
      });

      return result;
    });
  }

  private async applyEnrichment(
    data: Record<string, unknown>[],
    config: Record<string, unknown>
  ): Promise<Record<string, unknown>[]> {
    // Enrich data with additional information
    // This could involve database lookups, API calls, etc.
    return data.map(record => ({
      ...record,
      enriched_at: new Date().toISOString(),
      // Add other enrichment fields based on config
      ...((config.additionalFields as Record<string, unknown>) || {}),
    }));
  }

  private validateRecord(
    record: Record<string, unknown>,
    config: Record<string, unknown>
  ): boolean {
    const requiredFields = (config.requiredFields as string[]) || [];
    return requiredFields.every(
      field => record[field] !== null && record[field] !== undefined
    );
  }

  private async sendToOutput(
    data: Record<string, unknown>[],
    output: RealTimeStreamConfig["outputs"][0]
  ): Promise<void> {
    switch (output.type) {
      case "dashboard":
        // Send to real-time dashboard
        console.log(`Sending ${data.length} records to dashboard`);
        break;
      case "alert":
        // Check alert conditions and send notifications
        await this.checkAlertConditions(data, output.config);
        break;
      case "webhook":
        // Send to external webhook
        await this.sendWebhook(data, output.config);
        break;
      case "database":
        // Store in database
        await this.storeInDatabase(data, output.config);
        break;
    }
  }

  private async checkAlertConditions(
    data: Record<string, unknown>[],
    config: Record<string, unknown>
  ): Promise<void> {
    // Check if any records trigger alert conditions
    const conditions = config.conditions as Array<{
      field: string;
      operator: string;
      value: number;
      severity: string;
    }>;

    data.forEach(record => {
      conditions.forEach(condition => {
        const fieldValue = record[condition.field] as number;
        let triggered = false;

        switch (condition.operator) {
          case ">":
            triggered = fieldValue > condition.value;
            break;
          case "<":
            triggered = fieldValue < condition.value;
            break;
          case ">=":
            triggered = fieldValue >= condition.value;
            break;
          case "<=":
            triggered = fieldValue <= condition.value;
            break;
          case "==":
            triggered = fieldValue === condition.value;
            break;
        }

        if (triggered) {
          console.log(
            `Alert triggered: ${condition.field} ${condition.operator} ${condition.value} (${condition.severity})`
          );
          // In production, would send actual alerts via email, Slack, etc.
        }
      });
    });
  }

  private async sendWebhook(
    data: Record<string, unknown>[],
    config: Record<string, unknown>
  ): Promise<void> {
    const url = config.url as string;
    const headers = (config.headers as Record<string, string>) || {};

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify({ data }),
      });

      if (!response.ok) {
        console.error(
          `Webhook failed: ${response.status} ${response.statusText}`
        );
      }
    } catch (error) {
      console.error("Webhook error:", error);
    }
  }

  private async storeInDatabase(
    data: Record<string, unknown>[],
    config: Record<string, unknown>
  ): Promise<void> {
    const table = config.table as string;

    const { error } = await this.supabase.from(table).insert(data);

    if (error) {
      console.error("Database storage error:", error);
    }
  }

  private async updateStreamMetrics(
    streamId: string,
    metrics: {
      processed: number;
      valid: number;
      invalid: number;
      lastProcessed: string;
    }
  ): Promise<void> {
    await this.supabase.from("realtime_stream_metrics").upsert({
      stream_id: streamId,
      ...metrics,
      updated_at: new Date().toISOString(),
    });
  }
}

// Export singleton instance
export const enterpriseAnalytics = EnterpriseAnalytics.getInstance();
