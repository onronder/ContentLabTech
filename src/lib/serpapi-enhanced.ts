/**
 * Enhanced SERPAPI Integration with Robust Error Handling
 * Addresses high error rate (9.46%) with comprehensive resilience patterns
 * Implements multiple fallback strategies and advanced error recovery
 */

import { timeoutFetch } from "./resilience/timeout-fetch";
import { circuitBreakerManager } from "./resilience/circuit-breaker";
import { serviceDegradationManager } from "./resilience/service-degradation";

// Enhanced types with better error tracking
export interface SerpApiConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  rateLimit?: {
    requestsPerMinute: number;
    burstLimit: number;
  };
  circuitBreaker?: {
    failureThreshold: number;
    resetTimeout: number;
    monitoringPeriod: number;
  };
}

export interface SerpApiRequest {
  query: string;
  engine?: "google" | "bing" | "yahoo";
  location?: string;
  language?: string;
  country?: string;
  device?: "desktop" | "mobile";
  num?: number;
  start?: number;
  includeAnswerBox?: boolean;
  includeRelatedQuestions?: boolean;
  includeRelatedSearches?: boolean;
}

export interface SerpApiResponse {
  success: boolean;
  data?: {
    searchParameters: {
      query: string;
      engine: string;
      location?: string;
      language: string;
      country: string;
      device: string;
    };
    organicResults: Array<{
      position: number;
      title: string;
      link: string;
      snippet: string;
      domain: string;
      displayedLink?: string;
      sitelinks?: Array<{
        title: string;
        link: string;
      }>;
    }>;
    featuredSnippet?: {
      type: "paragraph" | "list" | "table" | "video";
      title: string;
      snippet: string;
      link: string;
      domain: string;
    };
    peopleAlsoAsk?: Array<{
      question: string;
      snippet: string;
      link: string;
      domain: string;
    }>;
    relatedSearches?: Array<{
      query: string;
    }>;
    searchInformation?: {
      totalResults: string;
      timeTakenDisplayed: string;
    };
  };
  error?: {
    code: string;
    message: string;
    retryable: boolean;
    quotaExhausted?: boolean;
    rateLimited?: boolean;
  };
  metadata: {
    requestId: string;
    timestamp: string;
    responseTime: number;
    retryCount: number;
    circuitBreakerState: string;
    fromCache?: boolean;
    apiCreditsUsed?: number;
  };
}

export interface SerpApiMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  errorRate: number;
  quotaUsage: {
    used: number;
    limit: number;
    resetTime?: string;
  };
  circuitBreakerMetrics: {
    state: string;
    failureCount: number;
    lastFailureTime?: string;
  };
}

class EnhancedSerpApiService {
  private config: Required<SerpApiConfig>;
  private requestQueue: Array<{
    request: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
    priority: number;
    retryCount: number;
    timestamp: number;
  }> = [];
  private processing = false;
  private metrics: SerpApiMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    errorRate: 0,
    quotaUsage: { used: 0, limit: 1000 },
    circuitBreakerMetrics: { state: "CLOSED", failureCount: 0 },
  };
  private rateLimitState = {
    requests: [] as number[],
    lastReset: Date.now(),
  };

  constructor(config: SerpApiConfig) {
    this.config = {
      baseUrl: "https://serpapi.com",
      timeout: 15000,
      retryAttempts: 3,
      retryDelay: 1000,
      rateLimit: {
        requestsPerMinute: 100,
        burstLimit: 10,
      },
      circuitBreaker: {
        failureThreshold: 5,
        resetTimeout: 30000,
        monitoringPeriod: 60000,
      },
      ...config,
    };

    // Initialize circuit breaker - it will be created when first accessed
    // The circuit breaker manager will create it automatically when getCircuitBreaker is called
  }

  /**
   * Enhanced search with comprehensive error handling and fallback strategies
   */
  async search(request: SerpApiRequest): Promise<SerpApiResponse> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    return this.enqueueRequest(
      async () => {
        let lastError: any = null;
        let retryCount = 0;

        while (retryCount <= this.config.retryAttempts) {
          try {
            // Check rate limiting
            await this.enforceRateLimit();

            // Check if service is available
            if (
              !serviceDegradationManager.isFeatureAvailable("serpapi", "search")
            ) {
              const fallbackData = serviceDegradationManager.getFallbackData(
                "serpapi",
                "search"
              );
              if (fallbackData) {
                return this.createSuccessResponse(
                  request,
                  fallbackData,
                  requestId,
                  startTime,
                  retryCount,
                  true
                );
              }
            }

            // Execute request through circuit breaker
            const result = await circuitBreakerManager
              .getCircuitBreaker("serpapi-enhanced")
              .execute(
                () => this.executeRequest(request, requestId, retryCount),
                () =>
                  this.handleCircuitBreakerFallback(
                    request,
                    requestId,
                    startTime,
                    retryCount
                  )
              );

            if (result.success && result.data) {
              this.updateMetrics(true, Date.now() - startTime);
              serviceDegradationManager.recordSuccess("serpapi");
              return result.data;
            }

            throw result.error || new Error("Request failed");
          } catch (error) {
            lastError = error;
            retryCount++;

            // Determine if error is retryable
            const errorInfo = this.analyzeError(error);

            if (
              !errorInfo.retryable ||
              retryCount > this.config.retryAttempts
            ) {
              break;
            }

            // Calculate exponential backoff delay
            const delay = this.calculateRetryDelay(retryCount, errorInfo);
            await this.delay(delay);

            // Update degradation manager with failure
            serviceDegradationManager.recordFailure(
              "serpapi",
              errorInfo.message
            );
          }
        }

        // All retries exhausted, return error response
        this.updateMetrics(false, Date.now() - startTime);
        return this.createErrorResponse(
          request,
          lastError,
          requestId,
          startTime,
          retryCount
        );
      },
      request.query.includes("urgent") ? 1 : 0
    ); // Priority queue for urgent requests
  }

  /**
   * Execute the actual SerpAPI request
   */
  private async executeRequest(
    request: SerpApiRequest,
    requestId: string,
    retryCount: number
  ): Promise<any> {
    const url = this.buildRequestUrl(request);

    const result = await timeoutFetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "ContentLab-Nexus/1.0 Enhanced",
        "X-Request-ID": requestId,
        "X-Retry-Count": retryCount.toString(),
      },
      timeout: this.config.timeout,
      circuitBreaker: "serpapi-enhanced",
    });

    if (!result.success) {
      throw result.error || new Error("Request failed");
    }

    const data = result.data;

    // Check for API-level errors
    if (data && typeof data === "object" && "error" in data) {
      const apiError = new Error(`SerpAPI Error: ${data.error}`);
      (apiError as any).code = "API_ERROR";
      (apiError as any).details = data;
      throw apiError;
    }

    return this.transformResponse(
      data,
      request,
      requestId,
      Date.now(),
      retryCount
    );
  }

  /**
   * Build the complete request URL with all parameters
   */
  private buildRequestUrl(request: SerpApiRequest): string {
    const params = new URLSearchParams({
      api_key: this.config.apiKey,
      engine: request.engine || "google",
      q: request.query,
      hl: request.language || "en",
      gl: request.country || "us",
      device: request.device || "desktop",
      num: (request.num || 10).toString(),
    });

    if (request.location) {
      params.set("location", request.location);
    }

    if (request.start) {
      params.set("start", request.start.toString());
    }

    // Include additional result types based on request
    if (request.includeAnswerBox !== false) {
      params.set("include_answer_box", "true");
    }

    return `${this.config.baseUrl}/search?${params.toString()}`;
  }

  /**
   * Transform raw API response to our standardized format
   */
  private transformResponse(
    rawData: any,
    request: SerpApiRequest,
    requestId: string,
    timestamp: number,
    retryCount: number
  ): SerpApiResponse {
    return {
      success: true,
      data: {
        searchParameters: {
          query: request.query,
          engine: request.engine || "google",
          location: request.location,
          language: request.language || "en",
          country: request.country || "us",
          device: request.device || "desktop",
        },
        organicResults: this.parseOrganicResults(rawData.organic_results || []),
        featuredSnippet: this.parseFeaturedSnippet(rawData.answer_box),
        peopleAlsoAsk: this.parsePeopleAlsoAsk(rawData.related_questions || []),
        relatedSearches: this.parseRelatedSearches(
          rawData.related_searches || []
        ),
        searchInformation: {
          totalResults: rawData.search_information?.total_results || "0",
          timeTakenDisplayed:
            rawData.search_information?.time_taken_displayed || "0",
        },
      },
      metadata: {
        requestId,
        timestamp: new Date(timestamp).toISOString(),
        responseTime: Date.now() - timestamp,
        retryCount,
        circuitBreakerState: circuitBreakerManager
          .getCircuitBreaker("serpapi-enhanced")
          .getMetrics().state,
        apiCreditsUsed: 1,
      },
    };
  }

  /**
   * Parse organic search results with error handling
   */
  private parseOrganicResults(results: any[]): any {
    return results.map((result, index) => ({
      position: result.position || index + 1,
      title: result.title || "",
      link: result.link || "",
      snippet: result.snippet || "",
      domain: this.extractDomain(result.link || ""),
      displayedLink: result.displayed_link,
      sitelinks: result.sitelinks?.map((link: any) => ({
        title: link.title || "",
        link: link.link || "",
      })),
    }));
  }

  /**
   * Parse featured snippet with type validation
   */
  private parseFeaturedSnippet(answerBox: any): any {
    if (!answerBox) return undefined;

    const validTypes = ["paragraph", "list", "table", "video"];
    const type = validTypes.includes(answerBox.type)
      ? answerBox.type
      : "paragraph";

    return {
      type,
      title: answerBox.title || "",
      snippet: answerBox.snippet || answerBox.answer || "",
      link: answerBox.link || "",
      domain: this.extractDomain(answerBox.link || ""),
    };
  }

  /**
   * Parse People Also Ask questions
   */
  private parsePeopleAlsoAsk(questions: any[]): any {
    return questions.map(q => ({
      question: q.question || "",
      snippet: q.snippet || "",
      link: q.link || "",
      domain: this.extractDomain(q.link || ""),
    }));
  }

  /**
   * Parse related searches
   */
  private parseRelatedSearches(searches: any[]): any {
    return searches.map(s => ({
      query: s.query || "",
    }));
  }

  /**
   * Analyze error to determine retry strategy
   */
  private analyzeError(error: any): {
    code: string;
    message: string;
    retryable: boolean;
    quotaExhausted?: boolean;
    rateLimited?: boolean;
  } {
    if (error.name === "TimeoutError") {
      return {
        code: "TIMEOUT",
        message: "Request timeout",
        retryable: true,
      };
    }

    if (
      error.message?.includes("rate limit") ||
      error.message?.includes("429")
    ) {
      return {
        code: "RATE_LIMITED",
        message: "Rate limit exceeded",
        retryable: true,
        rateLimited: true,
      };
    }

    if (
      error.message?.includes("quota") ||
      error.message?.includes("credits")
    ) {
      return {
        code: "QUOTA_EXHAUSTED",
        message: "API quota exhausted",
        retryable: false,
        quotaExhausted: true,
      };
    }

    if (
      error.message?.includes("401") ||
      error.message?.includes("unauthorized")
    ) {
      return {
        code: "UNAUTHORIZED",
        message: "Invalid API key",
        retryable: false,
      };
    }

    if (
      error.message?.includes("500") ||
      error.message?.includes("502") ||
      error.message?.includes("503")
    ) {
      return {
        code: "SERVER_ERROR",
        message: "Server error",
        retryable: true,
      };
    }

    // Network or other errors
    return {
      code: "UNKNOWN",
      message: error.message || "Unknown error",
      retryable: true,
    };
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateRetryDelay(retryCount: number, errorInfo: any): number {
    let baseDelay = this.config.retryDelay;

    // Special handling for rate limiting
    if (errorInfo.rateLimited) {
      baseDelay = 60000; // Wait 1 minute for rate limits
    }

    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, retryCount - 1);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter

    return Math.min(exponentialDelay + jitter, 300000); // Max 5 minutes
  }

  /**
   * Enforce rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    // Clean old requests
    this.rateLimitState.requests = this.rateLimitState.requests.filter(
      t => t > windowStart
    );

    // Check if we're at the limit
    if (
      this.rateLimitState.requests.length >=
      this.config.rateLimit.requestsPerMinute
    ) {
      const oldestRequest = Math.min(...this.rateLimitState.requests);
      const waitTime = oldestRequest + 60000 - now;

      if (waitTime > 0) {
        await this.delay(waitTime);
        return this.enforceRateLimit(); // Re-check after waiting
      }
    }

    // Record this request
    this.rateLimitState.requests.push(now);
  }

  /**
   * Handle circuit breaker fallback
   */
  private async handleCircuitBreakerFallback(
    request: SerpApiRequest,
    requestId: string,
    startTime: number,
    retryCount: number
  ): Promise<SerpApiResponse> {
    // Try to get cached data
    const cachedData = serviceDegradationManager.getFallbackData(
      "serpapi",
      "search"
    );
    if (cachedData) {
      return this.createSuccessResponse(
        request,
        cachedData,
        requestId,
        startTime,
        retryCount,
        true
      );
    }

    // Return empty but valid response
    return {
      success: true,
      data: {
        searchParameters: {
          query: request.query,
          engine: request.engine || "google",
          language: request.language || "en",
          country: request.country || "us",
          device: request.device || "desktop",
        },
        organicResults: [],
        searchInformation: {
          totalResults: "0",
          timeTakenDisplayed: "0",
        },
      },
      metadata: {
        requestId,
        timestamp: new Date(startTime).toISOString(),
        responseTime: Date.now() - startTime,
        retryCount,
        circuitBreakerState: "OPEN",
        fromCache: true,
      },
    };
  }

  /**
   * Create success response
   */
  private createSuccessResponse(
    request: SerpApiRequest,
    data: any,
    requestId: string,
    startTime: number,
    retryCount: number,
    fromCache = false
  ): SerpApiResponse {
    return {
      success: true,
      data,
      metadata: {
        requestId,
        timestamp: new Date(startTime).toISOString(),
        responseTime: Date.now() - startTime,
        retryCount,
        circuitBreakerState: circuitBreakerManager
          .getCircuitBreaker("serpapi-enhanced")
          .getMetrics().state,
        fromCache,
      },
    };
  }

  /**
   * Create error response
   */
  private createErrorResponse(
    request: SerpApiRequest,
    error: any,
    requestId: string,
    startTime: number,
    retryCount: number
  ): SerpApiResponse {
    const errorInfo = this.analyzeError(error);

    return {
      success: false,
      error: errorInfo,
      metadata: {
        requestId,
        timestamp: new Date(startTime).toISOString(),
        responseTime: Date.now() - startTime,
        retryCount,
        circuitBreakerState: circuitBreakerManager
          .getCircuitBreaker("serpapi-enhanced")
          .getMetrics().state,
      },
    };
  }

  /**
   * Queue management for request prioritization
   */
  private async enqueueRequest<T>(
    request: () => Promise<T>,
    priority = 0
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        request,
        resolve,
        reject,
        priority,
        retryCount: 0,
        timestamp: Date.now(),
      });

      // Sort by priority (higher priority first)
      this.requestQueue.sort((a, b) => b.priority - a.priority);

      this.processQueue();
    });
  }

  /**
   * Process request queue with concurrency control
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.requestQueue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.requestQueue.length > 0) {
      const item = this.requestQueue.shift()!;

      try {
        const result = await item.request();
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      }

      // Add delay between requests to respect rate limits
      await this.delay(100);
    }

    this.processing = false;
  }

  /**
   * Update service metrics
   */
  private updateMetrics(success: boolean, responseTime: number): void {
    this.metrics.totalRequests++;

    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    // Update average response time
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) +
        responseTime) /
      this.metrics.totalRequests;

    // Update error rate
    this.metrics.errorRate =
      (this.metrics.failedRequests / this.metrics.totalRequests) * 100;

    // Update circuit breaker metrics
    const cbMetrics = circuitBreakerManager
      .getCircuitBreaker("serpapi-enhanced")
      .getMetrics();
    this.metrics.circuitBreakerMetrics = {
      state: cbMetrics.state,
      failureCount: cbMetrics.failureCount,
      lastFailureTime: cbMetrics.lastFailureTime
        ? new Date(cbMetrics.lastFailureTime).toISOString()
        : undefined,
    };
  }

  /**
   * Get current service metrics
   */
  getMetrics(): SerpApiMetrics {
    return { ...this.metrics };
  }

  /**
   * Health check for the enhanced service
   */
  async healthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    metrics: SerpApiMetrics;
    recommendations: string[];
  }> {
    const recommendations: string[] = [];
    const metrics = this.getMetrics();

    // Determine status based on error rate and circuit breaker state
    let status: "healthy" | "degraded" | "unhealthy";

    if (
      metrics.errorRate > 20 ||
      metrics.circuitBreakerMetrics.state === "OPEN"
    ) {
      status = "unhealthy";
      recommendations.push(
        "High error rate or circuit breaker open - immediate attention required"
      );
    } else if (metrics.errorRate > 5 || metrics.averageResponseTime > 10000) {
      status = "degraded";
      recommendations.push(
        "Elevated error rate or slow response times - monitor closely"
      );
    } else {
      status = "healthy";
    }

    // Add specific recommendations
    if (metrics.errorRate > 5) {
      recommendations.push(
        `Current error rate (${metrics.errorRate.toFixed(2)}%) exceeds threshold (5%)`
      );
    }

    if (metrics.averageResponseTime > 5000) {
      recommendations.push(
        "High average response time - consider optimizing requests"
      );
    }

    if (metrics.quotaUsage.used / metrics.quotaUsage.limit > 0.8) {
      recommendations.push("Approaching API quota limit - monitor usage");
    }

    return {
      status,
      metrics,
      recommendations,
    };
  }

  /**
   * Utility methods
   */
  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return "";
    }
  }

  private generateRequestId(): string {
    return `serpapi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
const apiKey = process.env["SERPAPI_API_KEY"];
if (!apiKey) {
  console.warn(
    "SERPAPI_API_KEY not configured - SerpAPI functionality will be limited"
  );
}

export const enhancedSerpApiService = new EnhancedSerpApiService({
  apiKey: apiKey || "not_configured",
  timeout: 15000,
  retryAttempts: 3,
  retryDelay: 2000,
  rateLimit: {
    requestsPerMinute: 100,
    burstLimit: 10,
  },
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 60000,
    monitoringPeriod: 300000, // 5 minutes
  },
});

// Types are already exported as interfaces above
