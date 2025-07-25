/**
 * Enterprise Data Validation and Quality Assurance System
 * Ensures data accuracy and reliability for billion-dollar analytics platform
 */

export interface DataQualityMetrics {
  completeness: number;
  validity: number;
  accuracy: number;
  consistency: number;
  timeliness: number;
  overall: number;
}

export interface DataValidationResult {
  isValid: boolean;
  quality: DataQualityMetrics;
  errors: string[];
  warnings: string[];
  anomalies: string[];
  confidence: number;
  timestamp: string;
}

export interface DataSourceConfig {
  name: string;
  required: boolean;
  type: 'numeric' | 'string' | 'date' | 'boolean' | 'array' | 'object';
  minValue?: number;
  maxValue?: number;
  pattern?: RegExp;
  allowNull?: boolean;
  dependencies?: string[];
}

export interface AnalyticsDataPoint {
  timestamp: string;
  projectId: string;
  contentId?: string;
  metrics: Record<string, number>;
  metadata: Record<string, unknown>;
  source: string;
  quality?: DataQualityMetrics;
}

export class DataValidationService {
  private static instance: DataValidationService;
  private validationRules: Map<string, DataSourceConfig[]> = new Map();
  private qualityThresholds = {
    completeness: 0.95,
    validity: 0.98,
    accuracy: 0.95,
    consistency: 0.90,
    timeliness: 0.85,
    overall: 0.90
  };

  private constructor() {
    this.initializeValidationRules();
  }

  public static getInstance(): DataValidationService {
    if (!DataValidationService.instance) {
      DataValidationService.instance = new DataValidationService();
    }
    return DataValidationService.instance;
  }

  private initializeValidationRules(): void {
    // Analytics data validation rules
    this.validationRules.set('analytics', [
      {
        name: 'pageviews',
        required: true,
        type: 'numeric',
        minValue: 0,
        maxValue: 10000000
      },
      {
        name: 'unique_visitors',
        required: true,
        type: 'numeric',
        minValue: 0,
        maxValue: 1000000
      },
      {
        name: 'bounce_rate',
        required: true,
        type: 'numeric',
        minValue: 0,
        maxValue: 100
      },
      {
        name: 'session_duration',
        required: true,
        type: 'numeric',
        minValue: 0,
        maxValue: 86400 // 24 hours in seconds
      },
      {
        name: 'conversion_rate',
        required: true,
        type: 'numeric',
        minValue: 0,
        maxValue: 100
      }
    ]);

    // Content data validation rules
    this.validationRules.set('content', [
      {
        name: 'content_length',
        required: true,
        type: 'numeric',
        minValue: 0,
        maxValue: 100000
      },
      {
        name: 'seo_score',
        required: true,
        type: 'numeric',
        minValue: 0,
        maxValue: 100
      },
      {
        name: 'readability_score',
        required: true,
        type: 'numeric',
        minValue: 0,
        maxValue: 100
      },
      {
        name: 'keyword_density',
        required: true,
        type: 'numeric',
        minValue: 0,
        maxValue: 20
      }
    ]);

    // Performance data validation rules
    this.validationRules.set('performance', [
      {
        name: 'load_time',
        required: true,
        type: 'numeric',
        minValue: 0,
        maxValue: 30000 // 30 seconds in ms
      },
      {
        name: 'core_web_vitals_score',
        required: true,
        type: 'numeric',
        minValue: 0,
        maxValue: 100
      },
      {
        name: 'lighthouse_score',
        required: true,
        type: 'numeric',
        minValue: 0,
        maxValue: 100
      }
    ]);
  }

  /**
   * Validate analytics data point with comprehensive quality checks
   */
  public validateDataPoint(
    dataType: string,
    data: Record<string, unknown>
  ): DataValidationResult {
    const rules = this.validationRules.get(dataType);
    if (!rules) {
      return {
        isValid: false,
        quality: this.getZeroQuality(),
        errors: [`Unknown data type: ${dataType}`],
        warnings: [],
        anomalies: [],
        confidence: 0,
        timestamp: new Date().toISOString()
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const anomalies: string[] = [];

    // Validate each field according to rules
    const fieldValidation = this.validateFields(data, rules, errors, warnings);
    
    // Detect anomalies
    const anomalyDetection = this.detectAnomalies(dataType, data, anomalies);
    
    // Calculate quality metrics
    const quality = this.calculateQualityMetrics(data, rules, fieldValidation);
    
    // Calculate overall confidence
    const confidence = this.calculateConfidence(quality, errors.length, warnings.length);

    return {
      isValid: errors.length === 0 && quality.overall >= this.qualityThresholds.overall,
      quality,
      errors,
      warnings,
      anomalies,
      confidence,
      timestamp: new Date().toISOString()
    };
  }

  private validateFields(
    data: Record<string, unknown>,
    rules: DataSourceConfig[],
    errors: string[],
    warnings: string[]
  ): Map<string, boolean> {
    const fieldValidation = new Map<string, boolean>();

    for (const rule of rules) {
      const value = data[rule.name];
      let isValid = true;

      // Check required fields
      if (rule.required && (value === undefined || value === null)) {
        errors.push(`Required field '${rule.name}' is missing`);
        isValid = false;
      }

      // Skip validation if field is missing but not required
      if (value === undefined || value === null) {
        if (!rule.allowNull) {
          warnings.push(`Field '${rule.name}' is null or undefined`);
        }
        fieldValidation.set(rule.name, isValid);
        continue;
      }

      // Type validation
      if (!this.validateType(value, rule.type)) {
        errors.push(`Field '${rule.name}' has invalid type. Expected ${rule.type}`);
        isValid = false;
      }

      // Range validation for numeric fields
      if (rule.type === 'numeric' && typeof value === 'number') {
        if (rule.minValue !== undefined && value < rule.minValue) {
          errors.push(`Field '${rule.name}' value ${value} is below minimum ${rule.minValue}`);
          isValid = false;
        }
        if (rule.maxValue !== undefined && value > rule.maxValue) {
          errors.push(`Field '${rule.name}' value ${value} exceeds maximum ${rule.maxValue}`);
          isValid = false;
        }
      }

      // Pattern validation for strings
      if (rule.type === 'string' && rule.pattern && typeof value === 'string') {
        if (!rule.pattern.test(value)) {
          errors.push(`Field '${rule.name}' does not match required pattern`);
          isValid = false;
        }
      }

      fieldValidation.set(rule.name, isValid);
    }

    return fieldValidation;
  }

  private validateType(value: unknown, expectedType: string): boolean {
    switch (expectedType) {
      case 'numeric':
        return typeof value === 'number' && !isNaN(value) && isFinite(value);
      case 'string':
        return typeof value === 'string';
      case 'date':
        return value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)));
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return false;
    }
  }

  private detectAnomalies(
    dataType: string,
    data: Record<string, unknown>,
    anomalies: string[]
  ): void {
    // Statistical anomaly detection
    if (dataType === 'analytics') {
      this.detectAnalyticsAnomalies(data, anomalies);
    } else if (dataType === 'content') {
      this.detectContentAnomalies(data, anomalies);
    } else if (dataType === 'performance') {
      this.detectPerformanceAnomalies(data, anomalies);
    }
  }

  private detectAnalyticsAnomalies(data: Record<string, unknown>, anomalies: string[]): void {
    const pageviews = data.pageviews as number;
    const uniqueVisitors = data.unique_visitors as number;
    const bounceRate = data.bounce_rate as number;
    const conversionRate = data.conversion_rate as number;

    // Logical consistency checks
    if (pageviews && uniqueVisitors && uniqueVisitors > pageviews) {
      anomalies.push('Unique visitors cannot exceed total pageviews');
    }

    if (bounceRate && bounceRate > 95) {
      anomalies.push(`Extremely high bounce rate detected: ${bounceRate}%`);
    }

    if (conversionRate && conversionRate > 20) {
      anomalies.push(`Unusually high conversion rate detected: ${conversionRate}%`);
    }

    // Statistical outlier detection (simplified Z-score method)
    if (pageviews && Math.abs(pageviews - 1000) / 500 > 3) {
      anomalies.push(`Pageviews appear to be a statistical outlier: ${pageviews}`);
    }
  }

  private detectContentAnomalies(data: Record<string, unknown>, anomalies: string[]): void {
    const contentLength = data.content_length as number;
    const seoScore = data.seo_score as number;
    const readabilityScore = data.readability_score as number;
    const keywordDensity = data.keyword_density as number;

    if (contentLength && contentLength < 100) {
      anomalies.push(`Very short content detected: ${contentLength} characters`);
    }

    if (seoScore && readabilityScore && Math.abs(seoScore - readabilityScore) > 50) {
      anomalies.push('Large discrepancy between SEO and readability scores');
    }

    if (keywordDensity && keywordDensity > 10) {
      anomalies.push(`Potential keyword stuffing detected: ${keywordDensity}% density`);
    }
  }

  private detectPerformanceAnomalies(data: Record<string, unknown>, anomalies: string[]): void {
    const loadTime = data.load_time as number;
    const coreWebVitalsScore = data.core_web_vitals_score as number;
    const lighthouseScore = data.lighthouse_score as number;

    if (loadTime && loadTime > 10000) {
      anomalies.push(`Extremely slow load time detected: ${loadTime}ms`);
    }

    if (coreWebVitalsScore && lighthouseScore) {
      const scoreDiff = Math.abs(coreWebVitalsScore - lighthouseScore);
      if (scoreDiff > 30) {
        anomalies.push('Significant discrepancy between Core Web Vitals and Lighthouse scores');
      }
    }
  }

  private calculateQualityMetrics(
    data: Record<string, unknown>,
    rules: DataSourceConfig[],
    fieldValidation: Map<string, boolean>
  ): DataQualityMetrics {
    const totalFields = rules.length;
    const requiredFields = rules.filter(r => r.required).length;
    
    // Completeness: percentage of required fields present
    const presentRequiredFields = rules
      .filter(r => r.required)
      .filter(r => data[r.name] !== undefined && data[r.name] !== null)
      .length;
    const completeness = requiredFields > 0 ? (presentRequiredFields / requiredFields) * 100 : 100;

    // Validity: percentage of fields that pass validation
    const validFields = Array.from(fieldValidation.values()).filter(v => v).length;
    const validity = totalFields > 0 ? (validFields / totalFields) * 100 : 100;

    // Accuracy: simplified metric based on anomaly detection
    const accuracy = 95; // This would be calculated from historical accuracy metrics

    // Consistency: check for logical consistency across fields
    const consistency = this.calculateConsistency(data);

    // Timeliness: check if data is recent (simplified)
    const timeliness = this.calculateTimeliness(data);

    // Overall quality score
    const overall = (completeness * 0.25 + validity * 0.25 + accuracy * 0.2 + consistency * 0.15 + timeliness * 0.15);

    return {
      completeness: Math.round(completeness * 100) / 100,
      validity: Math.round(validity * 100) / 100,
      accuracy: Math.round(accuracy * 100) / 100,
      consistency: Math.round(consistency * 100) / 100,
      timeliness: Math.round(timeliness * 100) / 100,
      overall: Math.round(overall * 100) / 100
    };
  }

  private calculateConsistency(data: Record<string, unknown>): number {
    // Check logical consistency between related fields
    let consistencyScore = 100;
    
    // Example consistency checks
    if (data.pageviews && data.unique_visitors) {
      const pageviews = data.pageviews as number;
      const uniqueVisitors = data.unique_visitors as number;
      if (uniqueVisitors > pageviews) {
        consistencyScore -= 20;
      }
    }

    if (data.bounce_rate && data.session_duration) {
      const bounceRate = data.bounce_rate as number;
      const sessionDuration = data.session_duration as number;
      // High bounce rate should correlate with low session duration
      if (bounceRate > 80 && sessionDuration > 180) {
        consistencyScore -= 15;
      }
    }

    return Math.max(0, consistencyScore);
  }

  private calculateTimeliness(data: Record<string, unknown>): number {
    const timestamp = data.timestamp as string;
    if (!timestamp) return 50; // No timestamp available

    const dataTime = new Date(timestamp).getTime();
    const now = Date.now();
    const ageHours = (now - dataTime) / (1000 * 60 * 60);

    // Data is considered timely if it's less than 24 hours old
    if (ageHours <= 24) return 100;
    if (ageHours <= 48) return 80;
    if (ageHours <= 72) return 60;
    if (ageHours <= 168) return 40; // 1 week
    return 20;
  }

  private calculateConfidence(
    quality: DataQualityMetrics,
    errorCount: number,
    warningCount: number
  ): number {
    let confidence = quality.overall;

    // Reduce confidence based on errors and warnings
    confidence -= errorCount * 10;
    confidence -= warningCount * 2;

    return Math.max(0, Math.min(100, confidence));
  }

  private getZeroQuality(): DataQualityMetrics {
    return {
      completeness: 0,
      validity: 0,
      accuracy: 0,
      consistency: 0,
      timeliness: 0,
      overall: 0
    };
  }

  /**
   * Batch validate multiple data points
   */
  public validateBatch(
    dataType: string,
    dataPoints: Record<string, unknown>[]
  ): DataValidationResult[] {
    return dataPoints.map(data => this.validateDataPoint(dataType, data));
  }

  /**
   * Get quality threshold for specific metric
   */
  public getQualityThreshold(metric: keyof DataQualityMetrics): number {
    return this.qualityThresholds[metric];
  }

  /**
   * Update quality thresholds
   */
  public updateQualityThresholds(thresholds: Partial<typeof this.qualityThresholds>): void {
    this.qualityThresholds = { ...this.qualityThresholds, ...thresholds };
  }
}

export const dataValidationService = DataValidationService.getInstance();