/**
 * Graceful Degradation System
 * Production-grade fallback strategies for service unavailability
 * Implements intelligent fallback mechanisms and user experience preservation
 */

import { analyticsCache, CacheKeys } from '@/lib/cache/analyticsCache';
import { AppError, createGracefulResponse, ErrorCategory } from '@/lib/errors/errorHandling';

// ================================================
// Fallback Data Types
// ================================================

interface FallbackAnalytics {
  contentAnalysis?: {
    overallScore: number;
    technicalSeo: number;
    contentDepth: number;
    readability: number;
    semanticRelevance: number;
    recommendations: Array<{
      type: string;
      title: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
    }>;
    lastUpdated: string;
    fallback: true;
  };
  seoHealth?: {
    overallScore: number;
    technical: number;
    onPage: number;
    performance: number;
    mobile: number;
    criticalIssues: Array<{
      type: string;
      severity: string;
      title: string;
      description: string;
    }>;
    recommendations: Array<{
      title: string;
      description: string;
      impact: number;
    }>;
    lastUpdated: string;
    fallback: true;
  };
  performance?: {
    overallScore: number;
    coreWebVitals: {
      lcp: number;
      fid: number;
      cls: number;
    };
    speedIndex: number;
    firstContentfulPaint: number;
    recommendations: Array<{
      type: string;
      title: string;
      description: string;
    }>;
    lastUpdated: string;
    fallback: true;
  };
}

interface DegradationStrategy {
  useCache: boolean;
  usePlaceholder: boolean;
  useEstimation: boolean;
  userMessage: string;
  limitations: string[];
}

// ================================================
// Degradation Strategies
// ================================================

const DEGRADATION_STRATEGIES: Record<string, DegradationStrategy> = {
  database_unavailable: {
    useCache: true,
    usePlaceholder: false,
    useEstimation: false,
    userMessage: 'Using cached data while we restore database connectivity.',
    limitations: ['Data may be up to 24 hours old', 'New analysis requests are queued'],
  },
  
  external_api_failure: {
    useCache: true,
    usePlaceholder: true,
    useEstimation: true,
    userMessage: 'External services are temporarily unavailable. Showing cached and estimated data.',
    limitations: ['Some features may be limited', 'Fresh analysis temporarily unavailable'],
  },
  
  processing_overload: {
    useCache: true,
    usePlaceholder: false,
    useEstimation: true,
    userMessage: 'High system load detected. Prioritizing existing data and estimates.',
    limitations: ['New analysis may be delayed', 'Some real-time features limited'],
  },
  
  partial_service_failure: {
    useCache: true,
    usePlaceholder: true,
    useEstimation: false,
    userMessage: 'Some services are experiencing issues. Showing available data.',
    limitations: ['Limited functionality', 'Some metrics may be unavailable'],
  },
};

// ================================================
// Fallback Data Generators
// ================================================

class FallbackDataGenerator {
  /**
   * Generate fallback analytics data based on available information
   */
  generateFallbackAnalytics(
    projectId: string,
    availableData?: Partial<FallbackAnalytics>,
    strategy: DegradationStrategy = DEGRADATION_STRATEGIES.external_api_failure
  ): FallbackAnalytics {
    const fallbackData: FallbackAnalytics = {};
    
    // Try to get cached data first
    if (strategy.useCache) {
      const cachedContent = analyticsCache.get(projectId, CacheKeys.CONTENT_ANALYSIS);
      const cachedSEO = analyticsCache.get(projectId, CacheKeys.SEO_HEALTH);
      const cachedPerformance = analyticsCache.get(projectId, CacheKeys.PERFORMANCE);
      
      if (cachedContent) {
        fallbackData.contentAnalysis = { ...cachedContent, fallback: true };
      }
      if (cachedSEO) {
        fallbackData.seoHealth = { ...cachedSEO, fallback: true };
      }
      if (cachedPerformance) {
        fallbackData.performance = { ...cachedPerformance, fallback: true };
      }
    }
    
    // Generate placeholder data if needed
    if (strategy.usePlaceholder) {
      if (!fallbackData.contentAnalysis && availableData?.contentAnalysis) {
        fallbackData.contentAnalysis = this.generateContentAnalysisFallback();
      }
      if (!fallbackData.seoHealth && availableData?.seoHealth) {
        fallbackData.seoHealth = this.generateSEOHealthFallback();
      }
      if (!fallbackData.performance && availableData?.performance) {
        fallbackData.performance = this.generatePerformanceFallback();
      }
    }
    
    // Use estimation if enabled
    if (strategy.useEstimation) {
      this.addEstimatedMetrics(fallbackData);
    }
    
    return fallbackData;
  }

  private generateContentAnalysisFallback() {
    return {
      overallScore: 75,
      technicalSeo: 78,
      contentDepth: 72,
      readability: 80,
      semanticRelevance: 70,
      recommendations: [
        {
          type: 'content',
          title: 'Improve Content Depth',
          description: 'Add more comprehensive information to improve content value.',
          priority: 'medium' as const,
        },
        {
          type: 'seo',
          title: 'Optimize Technical SEO',
          description: 'Review technical SEO implementation for better search visibility.',
          priority: 'high' as const,
        },
      ],
      lastUpdated: new Date().toISOString(),
      fallback: true,
    };
  }

  private generateSEOHealthFallback() {
    return {
      overallScore: 73,
      technical: 76,
      onPage: 71,
      performance: 75,
      mobile: 70,
      criticalIssues: [
        {
          type: 'technical',
          severity: 'medium',
          title: 'Page Speed Optimization',
          description: 'Page loading speed could be improved for better user experience.',
        },
      ],
      recommendations: [
        {
          title: 'Optimize Meta Descriptions',
          description: 'Add compelling meta descriptions to improve click-through rates.',
          impact: 85,
        },
        {
          title: 'Improve Mobile Experience',
          description: 'Enhance mobile usability and responsive design.',
          impact: 78,
        },
      ],
      lastUpdated: new Date().toISOString(),
      fallback: true,
    };
  }

  private generatePerformanceFallback() {
    return {
      overallScore: 71,
      coreWebVitals: {
        lcp: 2800,
        fid: 120,
        cls: 0.12,
      },
      speedIndex: 3500,
      firstContentfulPaint: 2200,
      recommendations: [
        {
          type: 'optimization',
          title: 'Optimize Images',
          description: 'Compress and optimize images to improve loading times.',
        },
        {
          type: 'caching',
          title: 'Implement Browser Caching',
          description: 'Set up proper caching headers to improve repeat visit performance.',
        },
      ],
      lastUpdated: new Date().toISOString(),
      fallback: true,
    };
  }

  private addEstimatedMetrics(fallbackData: FallbackAnalytics): void {
    // Add estimated improvements and projections based on available data
    if (fallbackData.contentAnalysis) {
      fallbackData.contentAnalysis.recommendations.push({
        type: 'estimation',
        title: 'Estimated Improvement Potential',
        description: 'Based on similar projects, implementing our recommendations could improve your score by 15-25%.',
        priority: 'medium',
      });
    }
    
    if (fallbackData.seoHealth) {
      fallbackData.seoHealth.recommendations.push({
        title: 'Projected SEO Impact',
        description: 'Addressing critical issues could improve search rankings within 2-4 weeks.',
        impact: 90,
      });
    }
  }
}

// ================================================
// Graceful Degradation Manager
// ================================================

export class GracefulDegradationManager {
  private fallbackGenerator = new FallbackDataGenerator();
  private serviceStatus = new Map<string, boolean>();

  /**
   * Handle analytics API failures with appropriate fallback strategies
   */
  async handleAnalyticsFailure(
    projectId: string,
    error: AppError,
    availableData?: Partial<FallbackAnalytics>
  ): Promise<{
    data: FallbackAnalytics;
    strategy: DegradationStrategy;
    userMessage: string;
  }> {
    const strategy = this.selectDegradationStrategy(error);
    const fallbackData = this.fallbackGenerator.generateFallbackAnalytics(
      projectId,
      availableData,
      strategy
    );
    
    return {
      data: fallbackData,
      strategy,
      userMessage: strategy.userMessage,
    };
  }

  /**
   * Handle job queue failures
   */
  handleJobQueueFailure(_error: AppError): {
    message: string;
    alternativeActions: Array<{
      title: string;
      description: string;
      action: string;
    }>;
  } {
    return {
      message: 'Analysis queue is temporarily unavailable. Your request has been saved and will be processed when service is restored.',
      alternativeActions: [
        {
          title: 'View Cached Results',
          description: 'Access previously analyzed data while we restore service',
          action: 'view_cache',
        },
        {
          title: 'Download Report',
          description: 'Export existing analysis results for offline viewing',
          action: 'download_report',
        },
        {
          title: 'Get Notified',
          description: 'Receive an email when your analysis is complete',
          action: 'enable_notifications',
        },
      ],
    };
  }

  /**
   * Handle dashboard loading failures
   */
  handleDashboardFailure(
    _projectId: string,
    _error: AppError
  ): {
    limitedModeData: Record<string, unknown>;
    userGuidance: {
      title: string;
      description: string;
      actions: Array<{
        title: string;
        description: string;
        url?: string;
      }>;
    };
  } {
    const limitedModeData = {
      status: 'limited_mode',
      message: 'Dashboard is running in limited mode due to service issues.',
      availableFeatures: [
        'View cached analytics',
        'Access project settings',
        'Export existing reports',
      ],
      unavailableFeatures: [
        'Real-time data updates',
        'New analysis requests',
        'Live collaboration features',
      ],
    };

    const userGuidance = {
      title: 'Limited Mode Active',
      description: 'Some features are temporarily unavailable. You can still access your most important data and settings.',
      actions: [
        {
          title: 'Refresh Page',
          description: 'Try refreshing to restore full functionality',
        },
        {
          title: 'Check System Status',
          description: 'View current system status and estimated recovery time',
          url: '/status',
        },
        {
          title: 'Contact Support',
          description: 'Get assistance from our technical team',
          url: '/support',
        },
      ],
    };

    return { limitedModeData, userGuidance };
  }

  private selectDegradationStrategy(error: AppError): DegradationStrategy {
    switch (error.details.category) {
      case ErrorCategory.DATABASE:
        return DEGRADATION_STRATEGIES.database_unavailable;
      
      case ErrorCategory.EXTERNAL_SERVICE:
        return DEGRADATION_STRATEGIES.external_api_failure;
      
      case ErrorCategory.PROCESSING:
        return DEGRADATION_STRATEGIES.processing_overload;
      
      default:
        return DEGRADATION_STRATEGIES.partial_service_failure;
    }
  }

  /**
   * Monitor service health and update degradation strategies
   */
  updateServiceStatus(serviceName: string, isHealthy: boolean): void {
    this.serviceStatus.set(serviceName, isHealthy);
  }

  /**
   * Get overall system health for degradation decisions
   */
  getSystemHealth(): {
    overall: 'healthy' | 'degraded' | 'critical';
    services: Record<string, boolean>;
    recommendations: string[];
  } {
    const services = Object.fromEntries(this.serviceStatus);
    const totalServices = this.serviceStatus.size;
    const healthyServices = Array.from(this.serviceStatus.values()).filter(Boolean).length;
    
    let overall: 'healthy' | 'degraded' | 'critical';
    const recommendations: string[] = [];
    
    if (totalServices === 0 || healthyServices === totalServices) {
      overall = 'healthy';
    } else if (healthyServices / totalServices >= 0.7) {
      overall = 'degraded';
      recommendations.push('Some services are experiencing issues. Limited functionality may be available.');
    } else {
      overall = 'critical';
      recommendations.push('Multiple services are down. System is running in emergency mode.');
      recommendations.push('Consider using cached data and postponing non-critical operations.');
    }
    
    return { overall, services, recommendations };
  }
}

// ================================================
// Singleton Instance
// ================================================

export const gracefulDegradationManager = new GracefulDegradationManager();

// ================================================
// Utility Functions
// ================================================

/**
 * Wrap API calls with graceful degradation
 */
export async function withGracefulDegradation<T>(
  operation: () => Promise<T>,
  fallbackOperation: () => Promise<T>,
  context: { projectId?: string; operationType: string }
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.warn(`${context.operationType} failed, using fallback:`, error);
    
    if (error instanceof AppError) {
      gracefulDegradationManager.updateServiceStatus(context.operationType, false);
    }
    
    return await fallbackOperation();
  }
}

/**
 * Create fallback response for API endpoints
 */
export function createFallbackResponse(
  error: AppError,
  fallbackData: unknown,
  userMessage?: string
) {
  return createGracefulResponse(error, {
    fallbackData,
    userMessage: userMessage || 'Using cached or limited data due to service unavailability.',
  });
}