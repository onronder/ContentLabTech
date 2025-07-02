/**
 * Job Queue System Types
 * Comprehensive type definitions for background processing
 */

export type JobType =
  | "content-analysis"
  | "seo-health-check"
  | "performance-analysis"
  | "competitive-analysis"
  | "competitive-intelligence"
  | "competitive-monitoring"
  | "industry-benchmarking"
  | "project-health-scoring";

export type JobPriority = "critical" | "high" | "normal" | "low";

export type JobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "retrying";

export interface JobData {
  projectId: string;
  userId: string;
  teamId: string;
  params: Record<string, unknown>;
}

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  priority: JobPriority;
  data: JobData;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
  result?: unknown;
  progress: number; // 0-100
  progressMessage?: string;
}

export interface JobResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  retryable: boolean;
  retryAfter?: number;
  progress: number;
  progressMessage?: string;
}

export interface ContentAnalysisJobData extends JobData {
  params: {
    websiteUrl: string;
    targetKeywords: string[];
    competitorUrls?: string[];
    analysisDepth: "basic" | "comprehensive";
  };
}

export interface SEOHealthJobData extends JobData {
  params: {
    websiteUrl: string;
    pages: string[];
    includePerformance: boolean;
    includeMobile: boolean;
  };
}

export interface PerformanceAnalysisJobData extends JobData {
  params: {
    websiteUrl: string;
    pages: string[];
    locations: string[];
    devices: ("desktop" | "mobile")[];
  };
}

export interface CompetitiveAnalysisJobData extends JobData {
  params: {
    targetDomain: string;
    competitorIds: string[];
    analysisTypes: (
      | "content-similarity"
      | "seo-comparison"
      | "performance-benchmark"
      | "market-position"
      | "content-gaps"
      | "comprehensive"
    )[];
    options: {
      depth: "basic" | "standard" | "comprehensive";
      includeHistorical: boolean;
      alertsEnabled: boolean;
      customParameters?: Record<string, unknown>;
    };
  };
}

export interface CompetitiveIntelligenceJobData extends JobData {
  params: {
    targetDomain: string;
    competitorDomains: string[];
    keywords: string[];
    analysisScope: "content" | "technical" | "comprehensive";
  };
}

export interface CompetitiveMonitoringJobData extends JobData {
  params: {
    competitorIds: string[];
    monitoringTypes: (
      | "content-published"
      | "ranking-change"
      | "backlink-gained"
      | "strategy-shift"
      | "performance-improvement"
    )[];
    alertThresholds: {
      rankingChange: number;
      contentFrequency: number;
      performanceChange: number;
    };
    scheduledFrequency: "hourly" | "daily" | "weekly";
  };
}

export interface IndustryBenchmarkingJobData extends JobData {
  params: {
    industry: string;
    businessType: string;
    targetMetrics: string[];
    region: string;
  };
}

// Type aliases for missing exports
export type ProjectHealthJobData = ProjectHealthScoringJobData;

export interface ProjectHealthScoringJobData extends JobData {
  params: {
    analysisHistory: unknown[];
    implementationProgress: Array<{
      phase: string;
      completed: boolean;
      timestamp: string;
      notes?: string;
    }>;
    marketConditions: {
      industry: string;
      competitiveness: number;
      trends: string[];
      seasonality?: Record<string, number>;
    };
  };
}

// Job Processing Interface
export interface JobProcessor<T extends JobData = JobData, R = unknown> {
  process(job: Job): Promise<JobResult<R>>;
  validate(data: T): boolean;
  estimateProcessingTime(data: T): number; // in seconds
}

// Job Queue Configuration
export interface JobQueueConfig {
  concurrency: number;
  defaultPriority: JobPriority;
  maxRetries: number;
  retryDelay: number; // in milliseconds
  cleanupInterval: number; // in milliseconds
  maxJobAge: number; // in milliseconds
}

// Progress Tracking
export interface JobProgress {
  jobId: string;
  progress: number;
  message: string;
  estimatedCompletion?: Date;
  partialResults?: unknown;
}

// Job Events
export type JobEvent =
  | "job.created"
  | "job.started"
  | "job.progress"
  | "job.completed"
  | "job.failed"
  | "job.cancelled";

export interface JobEventData {
  jobId: string;
  event: JobEvent;
  timestamp: Date;
  data?: unknown;
}

// Analytics Data Types
export interface ContentQualityResult {
  overallScore: number;
  technicalSeo: number;
  contentDepth: number;
  readability: number;
  semanticRelevance: number;
  recommendations: ContentRecommendation[];
  contentGaps: string[];
  improvementTimeline: string;
  metadata?: {
    semanticSimilarity: number;
    eatScore: number;
    competitiveBenchmark: number;
    topicClusters: string[];
    expertiseLevel: number;
    analysisVersion: string;
  };
}

export interface ContentRecommendation {
  type:
    | "title"
    | "meta"
    | "content"
    | "structure"
    | "keywords"
    | "authority"
    | "expertise"
    | "competitive";
  priority: "high" | "medium" | "low";
  impact: "high" | "medium" | "low";
  effort: "high" | "medium" | "low";
  title: string;
  description: string;
  implementation: string;
  expectedImprovement: number;
}

export interface SEOHealthResult {
  overallScore: number;
  technical: number;
  onPage: number;
  performance: number;
  mobile: number;
  criticalIssues: SEOIssue[];
  recommendations: SEORecommendation[];
  competitorComparison?: SEOComparison;
}

export interface SEOIssue {
  type: "critical" | "warning" | "recommendation";
  category: "technical" | "content" | "performance" | "mobile";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  fixComplexity: "easy" | "medium" | "hard";
  howToFix: string;
}

export interface SEORecommendation {
  category: string;
  title: string;
  description: string;
  impact: number;
  difficulty: number;
  timeframe: string;
  resources: string[];
}

export interface SEOComparison {
  averageScore: number;
  topPerformerScore: number;
  yourPosition: number;
  improvementPotential: number;
}

export interface PerformanceResult {
  overallScore: number;
  coreWebVitals: {
    lcp: number;
    fid: number;
    cls: number;
  };
  speedIndex: number;
  firstContentfulPaint: number;
  recommendations: PerformanceRecommendation[];
  deviceComparison: DevicePerformance[];
}

export interface PerformanceRecommendation {
  type: "critical" | "important" | "optimization";
  title: string;
  description: string;
  potentialSavings: {
    bytes?: number;
    ms?: number;
  };
  implementation: string;
}

export interface DevicePerformance {
  device: "desktop" | "mobile";
  score: number;
  metrics: {
    speedIndex: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    timeToInteractive: number;
    cumulativeLayoutShift: number;
  };
}

export interface CompetitiveAnalysisResult {
  id: string;
  projectId: string;
  competitorId: string;
  analysisType:
    | "content-similarity"
    | "seo-comparison"
    | "performance-benchmark"
    | "market-position"
    | "content-gaps"
    | "comprehensive";
  timestamp: Date;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  data: {
    contentAnalysis?: {
      contentSimilarity: {
        overall: number;
        semantic: number;
        structural: number;
        performanceCorrelation: number;
        breakdown: {
          topics: number;
          keywords: number;
          format: number;
          style: number;
        };
      };
      contentQuality: {
        userScore: number;
        competitorScore: number;
        relativeDifference: number;
      };
      topicAnalysis: {
        sharedTopics: string[];
        uniqueUserTopics: string[];
        uniqueCompetitorTopics: string[];
        topicGaps: {
          topic: string;
          opportunityScore: number;
          difficulty: number;
          searchVolume: number;
          strategicRelevance: number;
          recommendation: string;
        }[];
      };
    };
    seoAnalysis?: {
      overallComparison: {
        userScore: number;
        competitorScore: number;
        gap: number;
      };
      keywordAnalysis: {
        sharedKeywords: {
          keyword: string;
          userRanking?: number;
          competitorRanking?: number;
          searchVolume: number;
          difficulty: number;
        }[];
        keywordGaps: {
          keyword: string;
          competitorRanking: number;
          searchVolume: number;
          difficulty: number;
          opportunityScore: number;
          priority: "high" | "medium" | "low";
        }[];
      };
    };
    performanceAnalysis?: {
      speedComparison: {
        loadTime: { user: number; competitor: number; gap: number };
        firstContentfulPaint: { user: number; competitor: number; gap: number };
        largestContentfulPaint: {
          user: number;
          competitor: number;
          gap: number;
        };
      };
    };
    marketPosition?: {
      overallPosition: {
        score: number;
        category: "leader" | "challenger" | "follower" | "niche";
        trend: "improving" | "stable" | "declining";
      };
      competitiveStrengths: {
        area: string;
        score: number;
        description: string;
        impact: "high" | "medium" | "low";
      }[];
      marketOpportunities: {
        title: string;
        description: string;
        size: number;
        accessibility: number;
        competitiveIntensity: number;
        strategicFit: number;
        priority: "high" | "medium" | "low";
      }[];
    };
  };
  confidence: {
    overall: number;
    dataQuality: number;
    sampleSize: number;
    recency: number;
    sourceReliability: number;
  };
  metadata: {
    version: string;
    algorithm: string;
    executionTime: number;
    limitations: string[];
  };
}

export interface CompetitiveIntelligenceResult {
  marketPosition: number; // 0-100
  competitiveScore: number; // 0-100
  competitiveGaps: string[];
  opportunities: CompetitiveOpportunity[];
  threats: CompetitiveThreat[];
  strategicRecommendations: string[];
  competitorAnalysis: CompetitorAnalysis[];
}

export interface CompetitiveMonitoringResult {
  alertsGenerated: {
    id: string;
    competitorId: string;
    type:
      | "content-published"
      | "ranking-change"
      | "backlink-gained"
      | "strategy-shift"
      | "performance-improvement"
      | "market-movement"
      | "threat-detected"
      | "opportunity-identified";
    severity: "critical" | "high" | "medium" | "low" | "info";
    title: string;
    description: string;
    timestamp: Date;
    status: "new" | "acknowledged" | "in-progress" | "resolved" | "dismissed";
    actionRequired: boolean;
    recommendations: {
      action: string;
      priority: "immediate" | "short-term" | "medium-term" | "long-term";
      description: string;
      expectedOutcome: string;
      effort: "low" | "medium" | "high";
    }[];
  }[];
  monitoringSummary: {
    totalCompetitors: number;
    activeAlerts: number;
    newThreats: number;
    newOpportunities: number;
    averageCompetitorActivity: number;
  };
}

export interface CompetitiveOpportunity {
  type: "content" | "technical" | "market";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  effort: "high" | "medium" | "low";
  timeframe: string;
  estimatedRoi: number;
}

export interface CompetitiveThreat {
  type: "content" | "technical" | "market";
  competitor: string;
  threat: string;
  severity: "high" | "medium" | "low";
  mitigation: string;
}

export interface CompetitorAnalysis {
  domain: string;
  strengths: string[];
  weaknesses: string[];
  contentStrategy: string[];
  technicalAdvantages: string[];
  marketShare: number;
}

export interface IndustryBenchmarkResult {
  industryPercentile: number;
  performanceRank: number;
  totalIndustrySample: number;
  benchmarkScores: BenchmarkMetric[];
  industryTrends: IndustryTrend[];
  improvementOpportunities: BenchmarkOpportunity[];
}

export interface BenchmarkMetric {
  metric: string;
  yourScore: number;
  industryAverage: number;
  topPerformer: number;
  percentile: number;
}

export interface IndustryTrend {
  metric: string;
  direction: "up" | "down" | "stable";
  magnitude: number;
  timeframe: string;
  implications: string[];
}

export interface BenchmarkOpportunity {
  area: string;
  currentGap: number;
  potentialImprovement: number;
  implementationPath: string[];
  estimatedTimeline: string;
}

export interface ProjectHealthResult {
  overallScore: number;
  overallHealth: number;
  progressVelocity: number;
  implementationQuality: number;
  marketAdaptation: number;
  successPrediction: number;
  categoryScores: Record<string, number>;
  healthIndicators: string[];
  actionItems: string[];
  trendData: number[];
  riskFactors: RiskFactor[];
  milestoneProgress: MilestoneProgress[];
  recommendations: ProjectRecommendation[];
}

export interface RiskFactor {
  type: "technical" | "market" | "resource" | "timeline";
  description: string;
  probability: number;
  impact: number;
  mitigation: string[];
}

export interface MilestoneProgress {
  milestone: string;
  target: Date;
  progress: number;
  onTrack: boolean;
  blockers?: string[];
}

export interface ProjectRecommendation {
  category: "optimization" | "resource" | "strategy" | "timeline";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  expectedImpact: number;
  implementation: string[];
}
