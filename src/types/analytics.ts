/**
 * Comprehensive Analytics Type Definitions
 * Production-grade TypeScript interfaces for analytical systems
 * Eliminates all 'any' types with strict type safety
 */

// ================================================
// Base Types
// ================================================

export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type AnalysisType = 'content-analysis' | 'seo-health' | 'performance' | 'competitive-intelligence' | 'industry-benchmarking';
export type Trend = 'up' | 'down' | 'stable';

// ================================================
// Content Analysis Types
// ================================================

export interface ContentRecommendation {
  type: 'content' | 'seo' | 'structure' | 'keywords' | 'readability';
  priority: Priority;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  implementation: string;
  expectedImprovement: number; // percentage
}

export interface ContentQualityResult {
  overallScore: number;
  technicalSeo: number;
  contentDepth: number;
  readability: number;
  semanticRelevance: number;
  recommendations: ContentRecommendation[];
  contentGaps: Array<{
    topic: string;
    importance: number;
    difficulty: 'easy' | 'medium' | 'hard';
    estimatedWordCount: number;
  }>;
  improvementTimeline: string;
  competitorAnalysis?: {
    averageScore: number;
    topPerformer: string;
    gaps: string[];
  };
}

// ================================================
// SEO Health Types
// ================================================

export interface SEOIssue {
  type: 'technical' | 'content' | 'structure' | 'performance' | 'mobile';
  severity: Severity;
  title: string;
  description: string;
  recommendation: string;
  impact: number; // 1-100
  effort: 'low' | 'medium' | 'high';
  priority: Priority;
}

export interface SEORecommendation {
  title: string;
  description: string;
  impact: number; // 1-100
  effort: 'low' | 'medium' | 'high';
  category: 'technical' | 'content' | 'performance' | 'mobile';
  implementation: {
    steps: string[];
    timeEstimate: string;
    difficulty: 'easy' | 'medium' | 'hard';
  };
}

export interface SEOComparison {
  competitor: string;
  scores: {
    overall: number;
    technical: number;
    content: number;
    performance: number;
  };
  advantages: string[];
  disadvantages: string[];
}

export interface SEOHealthResult {
  overallScore: number;
  technical: number;
  onPage: number;
  performance: number;
  mobile: number;
  criticalIssues: SEOIssue[];
  recommendations: SEORecommendation[];
  competitorComparison?: SEOComparison[];
  historicalData?: Array<{
    date: string;
    scores: {
      overall: number;
      technical: number;
      onPage: number;
      performance: number;
      mobile: number;
    };
  }>;
}

// ================================================
// Performance Analysis Types
// ================================================

export interface CoreWebVitals {
  lcp: number; // Largest Contentful Paint (ms)
  fid: number; // First Input Delay (ms)
  cls: number; // Cumulative Layout Shift
}

export interface PerformanceMetrics {
  speedIndex: number;
  firstContentfulPaint: number;
  timeToInteractive: number;
  totalBlockingTime: number;
}

export interface PerformanceRecommendation {
  type: 'critical' | 'important' | 'optimization';
  title: string;
  description: string;
  potentialSavings: {
    ms?: number;
    bytes?: number;
    score?: number;
  };
  implementation: string;
  priority: Priority;
}

export interface DevicePerformance {
  device: 'desktop' | 'mobile' | 'tablet';
  score: number;
  metrics: {
    speedIndex: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    timeToInteractive: number;
    cumulativeLayoutShift: number;
  };
}

export interface PerformanceResult {
  overallScore: number;
  coreWebVitals: CoreWebVitals;
  speedIndex: number;
  firstContentfulPaint: number;
  recommendations: PerformanceRecommendation[];
  deviceComparison: DevicePerformance[];
  opportunities?: Array<{
    type: string;
    title: string;
    description: string;
    savings: {
      ms?: number;
      bytes?: number;
    };
  }>;
}

// ================================================
// Competitive Intelligence Types
// ================================================

export interface CompetitiveOpportunity {
  title: string;
  description: string;
  potential: number; // 1-100
  timeframe: 'immediate' | 'short-term' | 'medium-term' | 'long-term';
  difficulty: 'easy' | 'medium' | 'hard';
  requiredResources: string[];
}

export interface CompetitiveThreat {
  title: string;
  description: string;
  severity: Severity;
  likelihood: number; // 1-100
  timeline: string;
  mitigation: string[];
}

export interface StrategicRecommendation {
  title: string;
  description: string;
  priority: Priority;
  impact: number; // 1-100
  effort: 'low' | 'medium' | 'high';
  category: 'content' | 'seo' | 'performance' | 'marketing' | 'product';
  timeline: string;
}

export interface CompetitiveIntelligenceResult {
  marketPosition: number; // 1-10 ranking
  competitiveScore: number; // 1-100
  opportunities: CompetitiveOpportunity[];
  threats: CompetitiveThreat[];
  strategicRecommendations: StrategicRecommendation[];
  competitorAnalysis?: Array<{
    name: string;
    url: string;
    strengths: string[];
    weaknesses: string[];
    marketShare: number;
  }>;
}

// ================================================
// Industry Benchmarking Types
// ================================================

export interface BenchmarkScore {
  metric: string;
  score: number;
  percentile: number;
  industry: string;
  benchmark: 'poor' | 'below-average' | 'average' | 'above-average' | 'excellent';
}

export interface IndustryTrend {
  metric: string;
  trend: Trend;
  change: number;
  period: string;
  significance: 'low' | 'medium' | 'high';
}

export interface IndustryBenchmarkingResult {
  industryPercentile: number;
  performanceRank: number;
  benchmarkScores: BenchmarkScore[];
  industryTrends: IndustryTrend[];
  recommendations?: Array<{
    title: string;
    description: string;
    benchmarkGap: number;
    priority: Priority;
  }>;
}

// ================================================
// Job Processing Types
// ================================================

export interface JobData {
  projectId: string;
  userId: string;
  teamId: string;
  params: Record<string, unknown>;
}

export interface ContentAnalysisJobData extends JobData {
  params: {
    websiteUrl: string;
    targetKeywords: string[];
    competitorUrls?: string[];
    analysisDepth: 'basic' | 'comprehensive' | 'enterprise';
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
    devices: Array<'desktop' | 'mobile' | 'tablet'>;
  };
}

export interface CompetitiveIntelligenceJobData extends JobData {
  params: {
    targetDomain: string;
    competitorDomains: string[];
    keywords: string[];
    analysisScope: 'basic' | 'comprehensive';
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

export interface ProjectHealthJobData extends JobData {
  params: {
    includeHistorical: boolean;
    timeframe: '7d' | '30d' | '90d' | '1y';
  };
}

// ================================================
// Project Health Types
// ================================================

export interface HealthIndicator {
  name: string;
  score: number;
  status: 'excellent' | 'good' | 'needs-attention' | 'critical';
  trend: Trend;
  description: string;
}

export interface ActionItem {
  title: string;
  description: string;
  priority: Priority;
  category: string;
  estimatedImpact: number;
  estimatedEffort: 'low' | 'medium' | 'high';
  dueDate?: string;
}

export interface TrendDataPoint {
  date: string;
  value: number;
  metric: string;
}

export interface ProjectHealthResult {
  overallScore: number;
  categoryScores: {
    content: number;
    seo: number;
    performance: number;
    competitive: number;
  };
  healthIndicators: HealthIndicator[];
  actionItems: ActionItem[];
  trendData: TrendDataPoint[];
  lastAssessment: string;
}

// ================================================
// Job Result Types
// ================================================

export interface JobResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  retryable: boolean;
  progress: number;
  progressMessage?: string;
  retryAfter?: number;
  metadata?: {
    processingTime?: number;
    resourcesUsed?: string[];
    qualityScore?: number;
  };
}

// ================================================
// Job Processor Interface
// ================================================

export interface JobProcessor<TJobData extends JobData, TResult> {
  process(job: Job<TJobData>): Promise<JobResult<TResult>>;
  validate(data: TJobData): boolean;
  estimateProcessingTime(data: TJobData): number;
}

// ================================================
// Job Interface
// ================================================

export interface Job<TData extends JobData = JobData> {
  id: string;
  type: AnalysisType;
  status: JobStatus;
  priority: Priority;
  data: TData;
  progress: number;
  progressMessage?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  retryCount: number;
  maxRetries: number;
  retryAfter?: number;
  metadata?: {
    estimatedDuration?: number;
    actualDuration?: number;
    resourcesAllocated?: string[];
  };
}

// ================================================
// Queue Types
// ================================================

export interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  processing_capacity: number;
}

export interface JobEventData {
  jobId: string;
  type: AnalysisType;
  status: JobStatus;
  progress: number;
  message?: string;
  error?: string;
}

// ================================================
// Analytics API Response Types
// ================================================

export interface AnalyticsStatus {
  projectId: string;
  jobs: Array<Pick<Job, 'id' | 'type' | 'status' | 'progress' | 'progressMessage' | 'createdAt' | 'completedAt' | 'error'>>;
  results: {
    contentAnalysis?: ContentQualityResult & { lastUpdated: string };
    seoHealth?: SEOHealthResult & { lastUpdated: string };
    performance?: PerformanceResult & { lastUpdated: string };
    competitive?: CompetitiveIntelligenceResult & { lastUpdated: string };
    industryBenchmark?: IndustryBenchmarkingResult & { lastUpdated: string };
  };
  queueStats: QueueStats;
  summary: {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    processingJobs: number;
    pendingJobs: number;
  };
}

// ================================================
// Database Types
// ================================================

export interface DatabaseRecord {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectRecord extends DatabaseRecord {
  team_id: string;
  name: string;
  description?: string;
  website_url?: string;
  target_keywords: string[];
  target_audience?: string;
  content_goals: string[];
  competitors: string[];
  settings: Record<string, unknown>;
  status: 'active' | 'inactive' | 'archived';
  created_by: string;
}

export interface ProcessingJobRecord extends DatabaseRecord {
  job_id: string;
  project_id: string;
  job_type: AnalysisType;
  status: JobStatus;
  priority: Priority;
  progress: number;
  progress_message?: string;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  retry_count: number;
  max_retries: number;
  job_data: Record<string, unknown>;
}

// ================================================
// Utility Types
// ================================================

export type Nullable<T> = T | null;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// ================================================
// API Error Types
// ================================================

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  requestId?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: {
    requestId: string;
    timestamp: string;
    processingTime: number;
    cached?: boolean;
    optimized?: boolean;
  };
}