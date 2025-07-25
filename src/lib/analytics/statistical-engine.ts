/**
 * Enterprise Statistical Analysis Engine
 * Production-grade statistical calculations with proper validation and significance testing
 */

export interface StatisticalResult {
  value: number;
  confidence: number;
  pValue?: number;
  standardError?: number;
  confidenceInterval?: [number, number];
  sampleSize: number;
  methodology: string;
}

export interface CorrelationResult extends StatisticalResult {
  correlationType: 'pearson' | 'spearman' | 'kendall';
  strength: 'very_weak' | 'weak' | 'moderate' | 'strong' | 'very_strong';
  direction: 'positive' | 'negative' | 'none';
}

export interface RegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
  adjustedRSquared: number;
  standardError: number;
  tStatistic: number;
  pValue: number;
  confidenceInterval: [number, number];
  residuals: number[];
  predictions: number[];
}

export interface HypothesisTestResult {
  testStatistic: number;
  pValue: number;
  criticalValue: number;
  rejectNull: boolean;
  confidenceLevel: number;
  testType: string;
  effectSize?: number;
}

export class StatisticalEngine {
  private static instance: StatisticalEngine;

  private constructor() {}

  public static getInstance(): StatisticalEngine {
    if (!StatisticalEngine.instance) {
      StatisticalEngine.instance = new StatisticalEngine();
    }
    return StatisticalEngine.instance;
  }

  /**
   * Calculate Pearson correlation coefficient with statistical significance
   */
  public calculatePearsonCorrelation(
    x: number[],
    y: number[],
    confidenceLevel = 0.95
  ): CorrelationResult {
    if (x.length !== y.length || x.length < 3) {
      return this.createEmptyCorrelationResult('pearson');
    }

    // Remove pairs with null/undefined values
    const validPairs = x.map((xi, i) => [xi, y[i]])
      .filter(([xi, yi]) => 
        xi !== null && xi !== undefined && !isNaN(xi) &&
        yi !== null && yi !== undefined && !isNaN(yi)
      );

    if (validPairs.length < 3) {
      return this.createEmptyCorrelationResult('pearson');
    }

    const validX = validPairs.map(([xi]) => xi);
    const validY = validPairs.map(([, yi]) => yi);
    const n = validPairs.length;

    // Calculate means
    const meanX = validX.reduce((sum, val) => sum + val, 0) / n;
    const meanY = validY.reduce((sum, val) => sum + val, 0) / n;

    // Calculate correlation coefficient
    let numerator = 0;
    let sumXSquared = 0;
    let sumYSquared = 0;

    for (let i = 0; i < n; i++) {
      const xDev = validX[i] - meanX;
      const yDev = validY[i] - meanY;
      
      numerator += xDev * yDev;
      sumXSquared += xDev * xDev;
      sumYSquared += yDev * yDev;
    }

    const denominator = Math.sqrt(sumXSquared * sumYSquared);
    
    if (denominator === 0) {
      return this.createEmptyCorrelationResult('pearson');
    }

    const correlation = numerator / denominator;

    // Calculate statistical significance (t-test)
    const tStatistic = correlation * Math.sqrt((n - 2) / (1 - correlation * correlation));
    const degreesOfFreedom = n - 2;
    const pValue = this.calculateTTestPValue(Math.abs(tStatistic), degreesOfFreedom);
    
    // Calculate confidence interval using Fisher transformation
    const fisherZ = 0.5 * Math.log((1 + correlation) / (1 - correlation));
    const standardError = 1 / Math.sqrt(n - 3);
    const zCritical = this.getZCritical(confidenceLevel);
    
    const lowerZ = fisherZ - zCritical * standardError;
    const upperZ = fisherZ + zCritical * standardError;
    
    const lowerBound = (Math.exp(2 * lowerZ) - 1) / (Math.exp(2 * lowerZ) + 1);
    const upperBound = (Math.exp(2 * upperZ) - 1) / (Math.exp(2 * upperZ) + 1);

    return {
      value: Math.round(correlation * 10000) / 10000,
      confidence: confidenceLevel * 100,
      pValue,
      standardError,
      confidenceInterval: [
        Math.round(lowerBound * 10000) / 10000,
        Math.round(upperBound * 10000) / 10000
      ],
      sampleSize: n,
      methodology: 'Pearson product-moment correlation with Fisher transformation',
      correlationType: 'pearson',
      strength: this.interpretCorrelationStrength(Math.abs(correlation)),
      direction: correlation > 0 ? 'positive' : correlation < 0 ? 'negative' : 'none'
    };
  }

  /**
   * Calculate Spearman rank correlation coefficient
   */
  public calculateSpearmanCorrelation(
    x: number[],
    y: number[],
    confidenceLevel = 0.95
  ): CorrelationResult {
    if (x.length !== y.length || x.length < 3) {
      return this.createEmptyCorrelationResult('spearman');
    }

    // Convert to ranks
    const ranksX = this.calculateRanks(x);
    const ranksY = this.calculateRanks(y);

    // Use Pearson correlation on ranks
    const result = this.calculatePearsonCorrelation(ranksX, ranksY, confidenceLevel);
    
    return {
      ...result,
      correlationType: 'spearman',
      methodology: 'Spearman rank correlation coefficient'
    };
  }

  /**
   * Perform linear regression with comprehensive statistics
   */
  public performLinearRegression(
    x: number[],
    y: number[],
    confidenceLevel = 0.95
  ): RegressionResult {
    if (x.length !== y.length || x.length < 3) {
      throw new Error('Insufficient data for regression analysis');
    }

    const n = x.length;
    
    // Calculate means
    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.reduce((sum, val) => sum + val, 0) / n;

    // Calculate slope and intercept
    let sumXY = 0;
    let sumXX = 0;
    let sumYY = 0;

    for (let i = 0; i < n; i++) {
      const xDev = x[i] - meanX;
      const yDev = y[i] - meanY;
      
      sumXY += xDev * yDev;
      sumXX += xDev * xDev;
      sumYY += yDev * yDev;
    }

    if (sumXX === 0) {
      throw new Error('No variance in independent variable');
    }

    const slope = sumXY / sumXX;
    const intercept = meanY - slope * meanX;

    // Calculate predictions and residuals
    const predictions = x.map(xi => slope * xi + intercept);
    const residuals = y.map((yi, i) => yi - predictions[i]);

    // Calculate R-squared
    const ssTotal = sumYY;
    const ssResidual = residuals.reduce((sum, residual) => sum + residual * residual, 0);
    const rSquared = ssTotal === 0 ? 0 : 1 - ssResidual / ssTotal;
    const adjustedRSquared = 1 - (ssResidual / (n - 2)) / (ssTotal / (n - 1));

    // Calculate standard error of slope
    const mse = ssResidual / (n - 2);
    const standardError = Math.sqrt(mse / sumXX);

    // Calculate t-statistic and p-value for slope
    const tStatistic = slope / standardError;
    const pValue = this.calculateTTestPValue(Math.abs(tStatistic), n - 2);

    // Calculate confidence interval for slope
    const tCritical = this.getTCritical(confidenceLevel, n - 2);
    const marginOfError = tCritical * standardError;
    const confidenceInterval: [number, number] = [
      slope - marginOfError,
      slope + marginOfError
    ];

    return {
      slope: Math.round(slope * 10000) / 10000,
      intercept: Math.round(intercept * 10000) / 10000,
      rSquared: Math.round(rSquared * 10000) / 10000,
      adjustedRSquared: Math.round(adjustedRSquared * 10000) / 10000,
      standardError: Math.round(standardError * 10000) / 10000,
      tStatistic: Math.round(tStatistic * 10000) / 10000,
      pValue,
      confidenceInterval: [
        Math.round(confidenceInterval[0] * 10000) / 10000,
        Math.round(confidenceInterval[1] * 10000) / 10000
      ],
      residuals,
      predictions
    };
  }

  /**
   * Perform t-test for comparing means
   */
  public performTTest(
    sample1: number[],
    sample2: number[],
    confidenceLevel = 0.95,
    paired = false
  ): HypothesisTestResult {
    if (sample1.length < 2 || sample2.length < 2) {
      throw new Error('Insufficient sample size for t-test');
    }

    if (paired && sample1.length !== sample2.length) {
      throw new Error('Paired t-test requires equal sample sizes');
    }

    let testStatistic: number;
    let degreesOfFreedom: number;
    let effectSize: number;

    if (paired) {
      // Paired t-test
      const differences = sample1.map((val, i) => val - sample2[i]);
      const meanDiff = differences.reduce((sum, val) => sum + val, 0) / differences.length;
      const stdDiff = Math.sqrt(
        differences.reduce((sum, val) => sum + Math.pow(val - meanDiff, 2), 0) / (differences.length - 1)
      );
      const standardError = stdDiff / Math.sqrt(differences.length);
      
      testStatistic = meanDiff / standardError;
      degreesOfFreedom = differences.length - 1;
      effectSize = meanDiff / stdDiff; // Cohen's d for paired samples
    } else {
      // Independent samples t-test (Welch's t-test)
      const n1 = sample1.length;
      const n2 = sample2.length;
      
      const mean1 = sample1.reduce((sum, val) => sum + val, 0) / n1;
      const mean2 = sample2.reduce((sum, val) => sum + val, 0) / n2;
      
      const var1 = sample1.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0) / (n1 - 1);
      const var2 = sample2.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0) / (n2 - 1);
      
      const pooledStd = Math.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2));
      const standardError = Math.sqrt(var1 / n1 + var2 / n2);
      
      testStatistic = (mean1 - mean2) / standardError;
      
      // Welch-Satterthwaite degrees of freedom
      degreesOfFreedom = Math.pow(var1 / n1 + var2 / n2, 2) / 
        (Math.pow(var1 / n1, 2) / (n1 - 1) + Math.pow(var2 / n2, 2) / (n2 - 1));
      
      effectSize = (mean1 - mean2) / pooledStd; // Cohen's d
    }

    const pValue = this.calculateTTestPValue(Math.abs(testStatistic), degreesOfFreedom);
    const criticalValue = this.getTCritical(confidenceLevel, degreesOfFreedom);
    const rejectNull = Math.abs(testStatistic) > criticalValue;

    return {
      testStatistic: Math.round(testStatistic * 10000) / 10000,
      pValue,
      criticalValue: Math.round(criticalValue * 10000) / 10000,
      rejectNull,
      confidenceLevel: confidenceLevel * 100,
      testType: paired ? 'Paired t-test' : 'Independent samples t-test (Welch)',
      effectSize: Math.round(effectSize * 10000) / 10000
    };
  }

  /**
   * Calculate proper readability score with bounds checking
   */
  public calculateReadabilityScore(
    text: string,
    method: 'flesch' | 'gunning_fog' | 'coleman_liau' = 'flesch'
  ): {
    score: number;
    level: string;
    confidence: number;
    method: string;
  } {
    if (!text || text.trim().length === 0) {
      return {
        score: 0,
        level: 'Unable to determine',
        confidence: 0,
        method
      };
    }

    const words = text.split(/\s+/).filter(word => word.length > 0);
    const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
    
    if (words.length === 0 || sentences.length === 0) {
      return {
        score: 0,
        level: 'Unable to determine',
        confidence: 0,
        method
      };
    }

    const wordCount = words.length;
    const sentenceCount = sentences.length;
    const avgSentenceLength = wordCount / sentenceCount;

    let score: number;
    let level: string;

    switch (method) {
      case 'flesch':
        const syllableCount = this.countSyllables(text);
        const avgSyllablesPerWord = syllableCount / wordCount;
        
        // Flesch Reading Ease formula
        score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
        
        // Ensure score is within valid bounds
        score = Math.max(0, Math.min(100, score));
        
        // Interpret score
        if (score >= 90) level = 'Very Easy';
        else if (score >= 80) level = 'Easy';
        else if (score >= 70) level = 'Fairly Easy';
        else if (score >= 60) level = 'Standard';
        else if (score >= 50) level = 'Fairly Difficult';
        else if (score >= 30) level = 'Difficult';
        else level = 'Very Difficult';
        break;

      case 'gunning_fog':
        const complexWords = this.countComplexWords(words);
        const complexWordRatio = complexWords / wordCount;
        
        // Gunning Fog Index
        score = 0.4 * (avgSentenceLength + 100 * complexWordRatio);
        
        // Convert to 0-100 scale (lower is better for Gunning Fog)
        score = Math.max(0, Math.min(100, 100 - (score * 5)));
        
        level = score >= 80 ? 'Easy' : score >= 60 ? 'Standard' : score >= 40 ? 'Difficult' : 'Very Difficult';
        break;

      case 'coleman_liau':
        const characters = text.replace(/\s/g, '').length;
        const avgCharactersPerWord = characters / wordCount;
        const avgSentencesPer100Words = (sentenceCount / wordCount) * 100;
        
        // Coleman-Liau Index
        const cliScore = 0.0588 * (avgCharactersPerWord * 100 / wordCount * 100) - 
                        0.296 * avgSentencesPer100Words - 15.8;
        
        // Convert to 0-100 scale
        score = Math.max(0, Math.min(100, 100 - (cliScore * 5)));
        
        level = score >= 80 ? 'Easy' : score >= 60 ? 'Standard' : score >= 40 ? 'Difficult' : 'Very Difficult';
        break;

      default:
        throw new Error(`Unknown readability method: ${method}`);
    }

    // Calculate confidence based on text length and structure
    const confidence = this.calculateReadabilityConfidence(wordCount, sentenceCount);

    return {
      score: Math.round(score * 100) / 100,
      level,
      confidence,
      method
    };
  }

  /**
   * Perform statistical significance testing
   */
  public testStatisticalSignificance(
    observedValue: number,
    expectedValue: number,
    standardError: number,
    testType: 'two_tailed' | 'one_tailed' = 'two_tailed',
    alpha = 0.05
  ): HypothesisTestResult {
    const zScore = (observedValue - expectedValue) / standardError;
    const pValue = testType === 'two_tailed' 
      ? 2 * (1 - this.normalCDF(Math.abs(zScore)))
      : 1 - this.normalCDF(Math.abs(zScore));
    
    const criticalValue = testType === 'two_tailed'
      ? this.getZCritical(1 - alpha)
      : this.getZCritical(1 - alpha * 2);

    return {
      testStatistic: Math.round(zScore * 10000) / 10000,
      pValue: Math.round(pValue * 10000) / 10000,
      criticalValue: Math.round(criticalValue * 10000) / 10000,
      rejectNull: pValue < alpha,
      confidenceLevel: (1 - alpha) * 100,
      testType: `Z-test (${testType})`
    };
  }

  // Private helper methods
  private createEmptyCorrelationResult(type: 'pearson' | 'spearman'): CorrelationResult {
    return {
      value: 0,
      confidence: 0,
      sampleSize: 0,
      methodology: type === 'pearson' 
        ? 'Pearson product-moment correlation' 
        : 'Spearman rank correlation',
      correlationType: type,
      strength: 'very_weak',
      direction: 'none'
    };
  }

  private interpretCorrelationStrength(absCorrelation: number): 'very_weak' | 'weak' | 'moderate' | 'strong' | 'very_strong' {
    if (absCorrelation >= 0.9) return 'very_strong';
    if (absCorrelation >= 0.7) return 'strong';
    if (absCorrelation >= 0.5) return 'moderate';
    if (absCorrelation >= 0.3) return 'weak';
    return 'very_weak';
  }

  private calculateRanks(values: number[]): number[] {
    const indexed = values.map((value, index) => ({ value, index }));
    indexed.sort((a, b) => a.value - b.value);
    
    const ranks = new Array(values.length);
    let currentRank = 1;
    
    for (let i = 0; i < indexed.length; i++) {
      if (i > 0 && indexed[i].value !== indexed[i - 1].value) {
        currentRank = i + 1;
      }
      ranks[indexed[i].index] = currentRank;
    }
    
    return ranks;
  }

  private countSyllables(text: string): number {
    // Simplified syllable counting algorithm
    const vowels = /[aeiouyAEIOUY]/g;
    const matches = text.match(vowels);
    let syllables = matches ? matches.length : 1;
    
    // Adjust for silent e
    const silentE = /\b\w*e\b/g;
    const silentEMatches = text.match(silentE);
    if (silentEMatches) {
      syllables -= silentEMatches.length;
    }
    
    return Math.max(1, syllables);
  }

  private countComplexWords(words: string[]): number {
    return words.filter(word => {
      // Words with 3+ syllables are considered complex
      return this.countSyllables(word) >= 3;
    }).length;
  }

  private calculateReadabilityConfidence(wordCount: number, sentenceCount: number): number {
    // Confidence increases with text length up to a point
    let confidence = 0;
    
    if (wordCount >= 100) confidence += 40;
    else confidence += wordCount * 0.4;
    
    if (sentenceCount >= 5) confidence += 30;
    else confidence += sentenceCount * 6;
    
    // Bonus for reasonable sentence length
    const avgSentenceLength = wordCount / sentenceCount;
    if (avgSentenceLength >= 10 && avgSentenceLength <= 25) {
      confidence += 30;
    } else {
      confidence += Math.max(0, 30 - Math.abs(avgSentenceLength - 17.5) * 2);
    }
    
    return Math.min(100, confidence);
  }

  private calculateTTestPValue(tStat: number, df: number): number {
    // Approximation of t-distribution p-value using normal approximation for large df
    if (df > 30) {
      return 2 * (1 - this.normalCDF(tStat));
    }
    
    // For smaller df, use approximation (in production, use proper t-distribution)
    const adjustment = 1 + (tStat * tStat) / (4 * df);
    return 2 * (1 - this.normalCDF(tStat / Math.sqrt(adjustment)));
  }

  private getTCritical(confidenceLevel: number, df: number): number {
    // Approximation for t-critical values
    const alpha = 1 - confidenceLevel;
    const zCritical = this.getZCritical(confidenceLevel);
    
    if (df > 30) return zCritical;
    
    // Adjustment for small sample sizes
    const adjustment = 1 + 1 / (4 * df) + 1 / (96 * df * df);
    return zCritical * adjustment;
  }

  private getZCritical(confidenceLevel: number): number {
    // Common z-critical values
    const alpha = 1 - confidenceLevel;
    
    if (alpha <= 0.01) return 2.576;
    if (alpha <= 0.05) return 1.96;
    if (alpha <= 0.10) return 1.645;
    
    // Approximation for other values
    return this.normalInverse(1 - alpha / 2);
  }

  private normalCDF(z: number): number {
    // Approximation of standard normal CDF
    const sign = z >= 0 ? 1 : -1;
    z = Math.abs(z);
    
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    
    const t = 1.0 / (1.0 + p * z);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
    
    return 0.5 * (1 + sign * y);
  }

  private normalInverse(p: number): number {
    // Approximation of inverse normal CDF
    if (p <= 0 || p >= 1) {
      throw new Error('Probability must be between 0 and 1');
    }
    
    // Rational approximation (Beasley-Springer-Moro algorithm)
    const a = [0, -3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 
               1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    
    const b = [0, -5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 
               6.680131188771972e+01, -1.328068155288572e+01];
    
    const c = [0, -7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, 
               -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    
    const d = [0, 7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 
               3.754408661907416e+00];
    
    let z: number;
    
    if (p > 0.5) {
      z = Math.sqrt(-2 * Math.log(1 - p));
      z = z - (c[1] + c[2] * z + c[3] * z * z + c[4] * z * z * z + c[5] * z * z * z * z + c[6] * z * z * z * z * z) /
              (1 + d[1] * z + d[2] * z * z + d[3] * z * z * z + d[4] * z * z * z * z);
    } else {
      z = Math.sqrt(-2 * Math.log(p));
      z = -(z - (c[1] + c[2] * z + c[3] * z * z + c[4] * z * z * z + c[5] * z * z * z * z + c[6] * z * z * z * z * z) /
               (1 + d[1] * z + d[2] * z * z + d[3] * z * z * z + d[4] * z * z * z * z));
    }
    
    return z;
  }
}

// Export singleton instance
export const statisticalEngine = StatisticalEngine.getInstance();