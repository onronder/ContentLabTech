/**
 * Competitive Intelligence Types and Interfaces
 * Production-grade type definitions for competitive analysis system
 */

// ================================================
// Core Competitive Entity Types
// ================================================

export interface Competitor {
  id: string;
  name: string;
  domain: string;
  category: CompetitorCategory;
  priority: CompetitorPriority;
  status: CompetitorStatus;
  addedAt: Date;
  lastAnalyzed?: Date;
  metadata: CompetitorMetadata;
}

export interface CompetitorMetadata {
  industry: string;
  size: CompanySize;
  location: string;
  description?: string;
  tags: string[];
  customFields: Record<string, unknown>;
}

export type CompetitorCategory =
  | "direct"
  | "indirect"
  | "emerging"
  | "aspirational";
export type CompetitorPriority = "critical" | "high" | "medium" | "low";
export type CompetitorStatus =
  | "active"
  | "inactive"
  | "monitoring"
  | "archived";
export type CompanySize =
  | "startup"
  | "small"
  | "medium"
  | "large"
  | "enterprise";

// ================================================
// Competitive Analysis Results
// ================================================

export interface CompetitiveAnalysisResult {
  id: string;
  projectId: string;
  competitorId: string;
  analysisType: AnalysisType;
  timestamp: Date;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  data: CompetitiveAnalysisData;
  confidence: ConfidenceScore;
  metadata: AnalysisMetadata;
}

export interface CompetitiveAnalysisData {
  contentAnalysis?: CompetitiveContentAnalysis;
  seoAnalysis?: CompetitiveSEOAnalysis;
  performanceAnalysis?: CompetitivePerformanceAnalysis;
  marketPosition?: MarketPositionAnalysis;
  contentGaps?: ContentGapAnalysis;
  alerts?: CompetitiveAlert[];
}

export type AnalysisType =
  | "content-similarity"
  | "seo-comparison"
  | "performance-benchmark"
  | "market-position"
  | "content-gaps"
  | "comprehensive";

// ================================================
// Content Analysis Types
// ================================================

export interface CompetitiveContentAnalysis {
  contentSimilarity: ContentSimilarityScore;
  contentQuality: ContentQualityComparison;
  topicAnalysis: TopicAnalysis;
  contentVolume: ContentVolumeAnalysis;
  contentStrategy: ContentStrategyInsights;
}

export interface ContentSimilarityScore {
  overall: number; // 0-1 scale
  semantic: number;
  structural: number;
  performanceCorrelation: number;
  breakdown: {
    topics: number;
    keywords: number;
    format: number;
    style: number;
  };
}

export interface ContentQualityComparison {
  userScore: number; // 0-100 scale
  competitorScore: number;
  relativeDifference: number; // percentage difference
  qualityFactors: {
    depth: QualityFactor;
    readability: QualityFactor;
    seoOptimization: QualityFactor;
    engagement: QualityFactor;
  };
}

export interface QualityFactor {
  userScore: number;
  competitorScore: number;
  gap: number;
  recommendation?: string;
}

export interface TopicAnalysis {
  sharedTopics: Topic[];
  uniqueUserTopics: Topic[];
  uniqueCompetitorTopics: Topic[];
  topicGaps: TopicGap[];
  emergingTopics: Topic[];
}

export interface Topic {
  id: string;
  name: string;
  keywords: string[];
  coverage: number; // 0-1 scale
  performance: number; // engagement/traffic score
  competitiveDensity: number;
}

export interface TopicGap {
  topic: Topic;
  opportunityScore: number; // 0-100 scale
  difficulty: number; // 0-100 scale
  searchVolume: number;
  strategicRelevance: number;
  recommendation: string;
}

export interface ContentVolumeAnalysis {
  userContentCount: number;
  competitorContentCount: number;
  publishingFrequency: {
    user: PublishingFrequency;
    competitor: PublishingFrequency;
  };
  contentTypes: {
    user: ContentTypeDistribution;
    competitor: ContentTypeDistribution;
  };
}

export interface PublishingFrequency {
  daily: number;
  weekly: number;
  monthly: number;
  trend: "increasing" | "stable" | "decreasing";
}

export interface ContentTypeDistribution {
  articles: number;
  videos: number;
  infographics: number;
  podcasts: number;
  whitepapers: number;
  other: number;
}

export interface ContentStrategyInsights {
  focusAreas: string[];
  contentPillars: string[];
  targetAudience: AudienceInsights;
  messagingThemes: string[];
  strategicRecommendations: StrategyRecommendation[];
}

export interface AudienceInsights {
  segments: string[];
  demographics: Record<string, unknown>;
  interests: string[];
  behaviorPatterns: string[];
}

export interface StrategyRecommendation {
  type: "content" | "seo" | "distribution" | "messaging";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  expectedImpact: number; // 0-100 scale
  implementationEffort: number; // 0-100 scale
  timeframe: string;
}

// ================================================
// SEO Analysis Types
// ================================================

export interface CompetitiveSEOAnalysis {
  overallComparison: SEOComparison;
  keywordAnalysis: KeywordAnalysis;
  technicalSEO: TechnicalSEOComparison;
  contentOptimization: ContentOptimizationComparison;
  linkProfile: LinkProfileComparison;
}

export interface SEOComparison {
  userScore: number; // 0-100 scale
  competitorScore: number;
  gap: number; // positive = user ahead, negative = competitor ahead
  rankingComparison: RankingComparison;
  visibilityMetrics: VisibilityMetrics;
}

export interface KeywordAnalysis {
  sharedKeywords: CompetitiveKeyword[];
  userUniqueKeywords: CompetitiveKeyword[];
  competitorUniqueKeywords: CompetitiveKeyword[];
  keywordGaps: KeywordGap[];
  rankingOverlap: number; // percentage of keywords both rank for
}

export interface CompetitiveKeyword {
  keyword: string;
  userRanking?: number;
  competitorRanking?: number;
  searchVolume: number;
  difficulty: number;
  cpc?: number;
  trend: "rising" | "stable" | "declining";
}

export interface KeywordGap {
  keyword: string;
  competitorRanking: number;
  searchVolume: number;
  difficulty: number;
  opportunityScore: number; // 0-100 scale
  priority: "high" | "medium" | "low";
}

export interface RankingComparison {
  averagePosition: {
    user: number;
    competitor: number;
  };
  topRankings: {
    user: number; // count of top 10 rankings
    competitor: number;
  };
  improvementOpportunities: RankingOpportunity[];
}

export interface RankingOpportunity {
  keyword: string;
  currentRanking: number;
  competitorRanking: number;
  improvementPotential: number;
  effort: "low" | "medium" | "high";
}

export interface VisibilityMetrics {
  organicTraffic: {
    user: number;
    competitor: number;
    gap: number;
  };
  keywordVisibility: {
    user: number;
    competitor: number;
    gap: number;
  };
  featuredSnippets: {
    user: number;
    competitor: number;
  };
}

export interface TechnicalSEOComparison {
  siteSpeed: MetricComparison;
  mobileOptimization: MetricComparison;
  coreWebVitals: CoreWebVitalsComparison;
  technicalIssues: TechnicalIssueComparison;
}

export interface MetricComparison {
  user: number;
  competitor: number;
  gap: number;
  advantage: "user" | "competitor" | "tie";
}

export interface CoreWebVitalsComparison {
  lcp: MetricComparison;
  fid: MetricComparison;
  cls: MetricComparison;
  overall: MetricComparison;
}

export interface TechnicalIssueComparison {
  userIssues: TechnicalIssue[];
  competitorIssues: TechnicalIssue[];
  comparativeAdvantages: string[];
}

export interface TechnicalIssue {
  type: string;
  severity: "critical" | "warning" | "info";
  count: number;
  impact: string;
}

export interface ContentOptimizationComparison {
  titleOptimization: MetricComparison;
  metaDescriptions: MetricComparison;
  headingStructure: MetricComparison;
  internalLinking: MetricComparison;
  schemaMarkup: MetricComparison;
}

export interface LinkProfileComparison {
  domainAuthority: MetricComparison;
  backlinks: {
    total: MetricComparison;
    dofollow: MetricComparison;
    referringDomains: MetricComparison;
  };
  linkQuality: LinkQualityAnalysis;
  linkOpportunities: LinkOpportunity[];
}

export interface LinkQualityAnalysis {
  userProfile: LinkProfile;
  competitorProfile: LinkProfile;
  qualityGap: number;
}

export interface LinkProfile {
  averageDomainAuthority: number;
  topLinkingSites: string[];
  linkTypes: Record<string, number>;
  anchorTextDistribution: Record<string, number>;
}

export interface LinkOpportunity {
  domain: string;
  domainAuthority: number;
  relevance: number;
  difficulty: "low" | "medium" | "high";
  priority: number;
}

// ================================================
// Performance Analysis Types
// ================================================

export interface CompetitivePerformanceAnalysis {
  speedComparison: SpeedComparison;
  userExperience: UXComparison;
  mobilePerformance: MobilePerformanceComparison;
  performanceOpportunities: PerformanceOpportunity[];
}

export interface SpeedComparison {
  loadTime: MetricComparison;
  firstContentfulPaint: MetricComparison;
  largestContentfulPaint: MetricComparison;
  firstInputDelay: MetricComparison;
  cumulativeLayoutShift: MetricComparison;
}

export interface UXComparison {
  overallScore: MetricComparison;
  navigation: MetricComparison;
  accessibility: MetricComparison;
  bestPractices: MetricComparison;
}

export interface MobilePerformanceComparison {
  mobileSpeed: MetricComparison;
  mobileUX: MetricComparison;
  responsiveness: MetricComparison;
  mobileOptimization: MetricComparison;
}

export interface PerformanceOpportunity {
  metric: string;
  currentValue: number;
  competitorValue: number;
  improvementPotential: number;
  implementation: {
    difficulty: "low" | "medium" | "high";
    effort: string;
    expectedImpact: number;
  };
}

// ================================================
// Market Position Analysis Types
// ================================================

export interface MarketPositionAnalysis {
  overallPosition: MarketPosition;
  competitiveStrengths: CompetitiveStrength[];
  competitiveWeaknesses: CompetitiveWeakness[];
  marketOpportunities: MarketOpportunity[];
  threats: CompetitiveThreat[];
  strategicRecommendations: StrategicRecommendation[];
}

export interface MarketPosition {
  score: number; // 0-100 percentile ranking
  category: "leader" | "challenger" | "follower" | "niche";
  trend: "improving" | "stable" | "declining";
  competitiveAdvantages: string[];
  positioningStatement: string;
}

export interface CompetitiveStrength {
  area: string;
  score: number;
  description: string;
  impact: "high" | "medium" | "low";
  sustainability: "sustainable" | "at-risk" | "temporary";
}

export interface CompetitiveWeakness {
  area: string;
  score: number;
  description: string;
  urgency: "critical" | "high" | "medium" | "low";
  improvementStrategy: string;
}

export interface MarketOpportunity {
  id: string;
  title: string;
  description: string;
  size: number; // market size or potential impact
  accessibility: number; // 0-100 ease of entry
  competitiveIntensity: number; // 0-100 level of competition
  strategicFit: number; // 0-100 alignment with capabilities
  priority: "high" | "medium" | "low";
  timeframe: string;
}

export interface CompetitiveThreat {
  id: string;
  source: string; // competitor name or market force
  type: "competitive" | "technological" | "market" | "regulatory";
  severity: "critical" | "high" | "medium" | "low";
  probability: number; // 0-100 likelihood
  impact: number; // 0-100 potential damage
  timeline: string;
  mitigationStrategy: string;
}

export interface StrategicRecommendation {
  id: string;
  category: "positioning" | "differentiation" | "growth" | "defense";
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  rationale: string;
  expectedOutcome: string;
  implementation: {
    timeline: string;
    resources: string[];
    difficulty: "low" | "medium" | "high";
    cost: "low" | "medium" | "high";
  };
  metrics: string[];
}

// ================================================
// Content Gap Analysis Types
// ================================================

export interface ContentGapAnalysis {
  topicGaps: TopicGap[];
  keywordGaps: KeywordGap[];
  formatGaps: FormatGap[];
  audienceGaps: AudienceGap[];
  opportunityMatrix: OpportunityMatrix;
  prioritizedRecommendations: GapRecommendation[];
}

export interface FormatGap {
  format: string;
  userCoverage: number; // 0-100 percentage
  competitorCoverage: number;
  audiencePreference: number; // 0-100 audience preference for format
  opportunityScore: number;
  difficulty: number;
}

export interface AudienceGap {
  segment: string;
  userCoverage: number;
  competitorCoverage: number;
  segmentSize: number;
  engagementPotential: number;
  acquisitionDifficulty: number;
}

export interface OpportunityMatrix {
  highImpactLowEffort: OpportunityItem[];
  highImpactHighEffort: OpportunityItem[];
  lowImpactLowEffort: OpportunityItem[];
  lowImpactHighEffort: OpportunityItem[];
}

export interface OpportunityItem {
  type: "topic" | "keyword" | "format" | "audience";
  title: string;
  impact: number; // 0-100
  effort: number; // 0-100
  timeline: string;
  description: string;
}

export interface GapRecommendation {
  id: string;
  type: "content-creation" | "optimization" | "distribution" | "strategic";
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  opportunity: string;
  implementation: {
    steps: string[];
    timeline: string;
    resources: string[];
    success_metrics: string[];
  };
  expectedImpact: {
    traffic: number; // percentage increase
    engagement: number;
    rankings: number;
    conversions: number;
  };
}

// ================================================
// Alert and Monitoring Types
// ================================================

export interface CompetitiveAlert {
  id: string;
  competitorId: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  timestamp: Date;
  status: AlertStatus;
  metadata: AlertMetadata;
  actionRequired: boolean;
  recommendations: AlertRecommendation[];
}

export type AlertType =
  | "content-published"
  | "ranking-change"
  | "backlink-gained"
  | "strategy-shift"
  | "performance-improvement"
  | "market-movement"
  | "threat-detected"
  | "opportunity-identified";

export type AlertSeverity = "critical" | "high" | "medium" | "low" | "info";
export type AlertStatus =
  | "new"
  | "acknowledged"
  | "in-progress"
  | "resolved"
  | "dismissed";

export interface AlertMetadata {
  source: string;
  confidence: number; // 0-100
  impact: number; // 0-100
  urgency: number; // 0-100
  relatedEntities: string[];
  data: Record<string, unknown>;
}

export interface AlertRecommendation {
  action: string;
  priority: "immediate" | "short-term" | "medium-term" | "long-term";
  description: string;
  expectedOutcome: string;
  effort: "low" | "medium" | "high";
}

// ================================================
// Confidence and Quality Metrics
// ================================================

export interface ConfidenceScore {
  overall: number; // 0-100
  dataQuality: number;
  sampleSize: number;
  recency: number;
  sourceReliability: number;
  analysisAccuracy: number;
}

export interface AnalysisMetadata {
  version: string;
  algorithm: string;
  parameters: Record<string, unknown>;
  executionTime: number; // milliseconds
  dataSourceInfo: DataSourceInfo[];
  limitations: string[];
  notes?: string;
}

export interface DataSourceInfo {
  source: string;
  type: "api" | "scraping" | "manual" | "third-party";
  lastUpdate: Date;
  coverage: number; // 0-100 percentage of data collected
  reliability: number; // 0-100 reliability score
}

// ================================================
// Job Queue Integration Types
// ================================================

export interface CompetitiveAnalysisJobData {
  projectId: string;
  userId: string;
  teamId: string;
  competitorIds: string[];
  analysisTypes: AnalysisType[];
  options: AnalysisOptions;
}

export interface AnalysisOptions {
  depth: "basic" | "standard" | "comprehensive";
  includeHistorical: boolean;
  alertsEnabled: boolean;
  customParameters?: Record<string, unknown>;
}

// ================================================
// API Response Types
// ================================================

export interface CompetitiveIntelligenceResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata: {
    timestamp: Date;
    version: string;
    processingTime: number;
    confidence?: ConfidenceScore;
  };
}

export interface CompetitorListResponse {
  competitors: Competitor[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    hasNext: boolean;
  };
  filters: {
    applied: Record<string, unknown>;
    available: Record<string, string[]>;
  };
}

export interface AnalysisStatusResponse {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number; // 0-100
  estimatedTimeRemaining?: number; // seconds
  currentStep?: string;
  results?: CompetitiveAnalysisResult;
}
