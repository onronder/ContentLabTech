/**
 * Metrics Collection Infrastructure
 * Comprehensive performance and system metrics collection
 */

export interface SystemMetrics {
  memory: {
    used: number;
    total: number;
    percentage: number;
    heapUsed: number;
    heapTotal: number;
    heapLimit: number;
    external: number;
    arrayBuffers: number;
  };
  performance: {
    apiResponseTimes: Record<string, number[]>;
    averageResponseTime: number;
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    requestCount: number;
    errorRate: number;
    throughput: number;
  };
  database: {
    connectionCount: number;
    queryCount: number;
    averageQueryTime: number;
    slowQueries: number;
    errorCount: number;
    activeConnections: number;
  };
  cache: {
    hitRate: number;
    missRate: number;
    evictionCount: number;
    memoryUsage: number;
    keyCount: number;
    avgTtl: number;
  };
  timestamp: string;
}

export interface PerformanceMetric {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: string;
  userId?: string;
  userAgent?: string;
  requestSize?: number;
  responseSize?: number;
  traceId?: string;
}

export interface DatabaseMetric {
  operation: string;
  table: string;
  duration: number;
  success: boolean;
  timestamp: string;
  rowsAffected?: number;
  queryHash?: string;
  userId?: string;
}

export interface CacheMetric {
  type: "hit" | "miss" | "set" | "evict" | "delete";
  key: string;
  duration?: number;
  timestamp: string;
  size?: number;
  ttl?: number;
}

export interface TimeWindowMetrics {
  last5Minutes: Partial<SystemMetrics>;
  last1Hour: Partial<SystemMetrics>;
  last24Hours: Partial<SystemMetrics>;
}

export class MetricsCollector {
  private metrics: Map<string, any[]> = new Map();
  private readonly MAX_METRICS_PER_TYPE = 1000;
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly TIME_WINDOWS = {
    FIVE_MINUTES: 5 * 60 * 1000,
    ONE_HOUR: 60 * 60 * 1000,
    TWENTY_FOUR_HOURS: 24 * 60 * 60 * 1000,
  };

  private cleanupTimer?: NodeJS.Timeout;

  constructor() {
    // Start cleanup timer
    this.cleanupTimer = setInterval(
      () => this.cleanupOldMetrics(),
      this.CLEANUP_INTERVAL
    );
  }

  recordApiCall(metric: PerformanceMetric): void {
    const key = `api_${this.sanitizeKey(metric.endpoint)}_${metric.method}`;
    const metrics = this.metrics.get(key) || [];

    metrics.push({
      ...metric,
      timestamp: new Date().toISOString(),
    });

    // Keep only recent metrics
    if (metrics.length > this.MAX_METRICS_PER_TYPE) {
      metrics.splice(0, metrics.length - this.MAX_METRICS_PER_TYPE);
    }

    this.metrics.set(key, metrics);

    // Also store in general API metrics
    const allApiMetrics = this.metrics.get("api_all") || [];
    allApiMetrics.push(metric);
    if (allApiMetrics.length > this.MAX_METRICS_PER_TYPE) {
      allApiMetrics.splice(0, allApiMetrics.length - this.MAX_METRICS_PER_TYPE);
    }
    this.metrics.set("api_all", allApiMetrics);
  }

  recordDatabaseQuery(metric: DatabaseMetric): void {
    const metrics = this.metrics.get("database_queries") || [];

    metrics.push({
      ...metric,
      timestamp: new Date().toISOString(),
    });

    if (metrics.length > this.MAX_METRICS_PER_TYPE) {
      metrics.splice(0, metrics.length - this.MAX_METRICS_PER_TYPE);
    }

    this.metrics.set("database_queries", metrics);
  }

  recordCacheOperation(metric: CacheMetric): void {
    const metrics = this.metrics.get("cache_operations") || [];

    metrics.push({
      ...metric,
      timestamp: new Date().toISOString(),
    });

    if (metrics.length > this.MAX_METRICS_PER_TYPE) {
      metrics.splice(0, metrics.length - this.MAX_METRICS_PER_TYPE);
    }

    this.metrics.set("cache_operations", metrics);
  }

  async getSystemMetrics(): Promise<SystemMetrics> {
    const memoryUsage = process.memoryUsage();
    const apiMetrics = this.calculateApiMetrics();
    const dbMetrics = this.calculateDatabaseMetrics();
    const cacheMetrics = this.calculateCacheMetrics();

    return {
      memory: {
        used: memoryUsage.rss,
        total: memoryUsage.rss + memoryUsage.external,
        percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        heapLimit:
          (process as any).constrainedMemory?.() || memoryUsage.heapTotal * 1.4,
        external: memoryUsage.external,
        arrayBuffers: memoryUsage.arrayBuffers,
      },
      performance: apiMetrics,
      database: dbMetrics,
      cache: cacheMetrics,
      timestamp: new Date().toISOString(),
    };
  }

  getTimeWindowMetrics(): TimeWindowMetrics {
    const now = Date.now();
    const windows = {
      last5Minutes: now - this.TIME_WINDOWS.FIVE_MINUTES,
      last1Hour: now - this.TIME_WINDOWS.ONE_HOUR,
      last24Hours: now - this.TIME_WINDOWS.TWENTY_FOUR_HOURS,
    };

    return {
      last5Minutes: this.calculateMetricsForWindow(windows.last5Minutes),
      last1Hour: this.calculateMetricsForWindow(windows.last1Hour),
      last24Hours: this.calculateMetricsForWindow(windows.last24Hours),
    };
  }

  private calculateApiMetrics() {
    const allApiMetrics: PerformanceMetric[] =
      this.metrics.get("api_all") || [];

    if (allApiMetrics.length === 0) {
      return {
        apiResponseTimes: {},
        averageResponseTime: 0,
        p50ResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        requestCount: 0,
        errorRate: 0,
        throughput: 0,
      };
    }

    const responseTimes = allApiMetrics.map(m => m.responseTime);
    const errorCount = allApiMetrics.filter(m => m.statusCode >= 400).length;
    const percentiles = this.calculatePercentiles(responseTimes);

    // Calculate response times by endpoint
    const responseTimesByEndpoint: Record<string, number[]> = {};
    allApiMetrics.forEach(metric => {
      const key = `${metric.method} ${metric.endpoint}`;
      if (!responseTimesByEndpoint[key]) {
        responseTimesByEndpoint[key] = [];
      }
      responseTimesByEndpoint[key].push(metric.responseTime);
    });

    // Calculate throughput (requests per minute)
    const recentMetrics = this.filterMetricsByTime(
      allApiMetrics,
      this.TIME_WINDOWS.FIVE_MINUTES
    );
    const throughput = (recentMetrics.length / 5) * 60; // Requests per minute

    return {
      apiResponseTimes: responseTimesByEndpoint,
      averageResponseTime:
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      p50ResponseTime: percentiles.p50,
      p95ResponseTime: percentiles.p95,
      p99ResponseTime: percentiles.p99,
      requestCount: allApiMetrics.length,
      errorRate: (errorCount / allApiMetrics.length) * 100,
      throughput,
    };
  }

  private calculateDatabaseMetrics() {
    const dbMetrics = this.metrics.get("database_queries") || [];

    if (dbMetrics.length === 0) {
      return {
        connectionCount: 1,
        queryCount: 0,
        averageQueryTime: 0,
        slowQueries: 0,
        errorCount: 0,
        activeConnections: 1,
      };
    }

    const durations = dbMetrics.map((m: any) => m.duration);
    const slowQueries = dbMetrics.filter((m: any) => m.duration > 1000).length;
    const errorCount = dbMetrics.filter((m: any) => !m.success).length;

    return {
      connectionCount: 1, // This would come from actual connection pool
      queryCount: dbMetrics.length,
      averageQueryTime:
        durations.length > 0
          ? durations.reduce((a: number, b: number) => a + b, 0) /
            durations.length
          : 0,
      slowQueries,
      errorCount,
      activeConnections: 1,
    };
  }

  private calculateCacheMetrics() {
    const cacheOps = this.metrics.get("cache_operations") || [];

    if (cacheOps.length === 0) {
      return {
        hitRate: 0,
        missRate: 0,
        evictionCount: 0,
        memoryUsage: 0,
        keyCount: 0,
        avgTtl: 0,
      };
    }

    const hits = cacheOps.filter((op: any) => op.type === "hit").length;
    const misses = cacheOps.filter((op: any) => op.type === "miss").length;
    const evictions = cacheOps.filter((op: any) => op.type === "evict").length;
    const sets = cacheOps.filter((op: any) => op.type === "set").length;

    const total = hits + misses;
    const totalMemoryUsage = cacheOps
      .filter((op: any) => op.size)
      .reduce((acc: number, op: any) => acc + op.size, 0);

    const ttls = cacheOps.filter((op: any) => op.ttl).map((op: any) => op.ttl);
    const avgTtl =
      ttls.length > 0 ? ttls.reduce((a, b) => a + b, 0) / ttls.length : 0;

    return {
      hitRate: total > 0 ? (hits / total) * 100 : 0,
      missRate: total > 0 ? (misses / total) * 100 : 0,
      evictionCount: evictions,
      memoryUsage: totalMemoryUsage,
      keyCount: sets,
      avgTtl,
    };
  }

  private calculateMetricsForWindow(
    windowStart: number
  ): Partial<SystemMetrics> {
    const windowMetrics: any = {};

    // Filter API metrics for window
    const apiMetrics = this.filterMetricsByTime(
      this.metrics.get("api_all") || [],
      Date.now() - windowStart
    );
    if (apiMetrics.length > 0) {
      const responseTimes = apiMetrics.map((m: any) => m.responseTime);
      const errorCount = apiMetrics.filter(
        (m: any) => m.statusCode >= 400
      ).length;
      const percentiles = this.calculatePercentiles(responseTimes);

      windowMetrics.performance = {
        averageResponseTime:
          responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
        p50ResponseTime: percentiles.p50,
        p95ResponseTime: percentiles.p95,
        p99ResponseTime: percentiles.p99,
        requestCount: apiMetrics.length,
        errorRate: (errorCount / apiMetrics.length) * 100,
      };
    }

    // Filter database metrics for window
    const dbMetrics = this.filterMetricsByTime(
      this.metrics.get("database_queries") || [],
      Date.now() - windowStart
    );
    if (dbMetrics.length > 0) {
      const durations = dbMetrics.map((m: any) => m.duration);
      const slowQueries = dbMetrics.filter(
        (m: any) => m.duration > 1000
      ).length;

      windowMetrics.database = {
        queryCount: dbMetrics.length,
        averageQueryTime:
          durations.reduce((a, b) => a + b, 0) / durations.length,
        slowQueries,
      };
    }

    return windowMetrics;
  }

  private calculatePercentiles(values: number[]): {
    p50: number;
    p95: number;
    p99: number;
  } {
    if (values.length === 0) return { p50: 0, p95: 0, p99: 0 };

    const sorted = [...values].sort((a, b) => a - b);
    const getPercentile = (p: number) => {
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      return sorted[Math.max(0, index)] || 0;
    };

    return {
      p50: getPercentile(50),
      p95: getPercentile(95),
      p99: getPercentile(99),
    };
  }

  private filterMetricsByTime(metrics: any[], windowSize: number): any[] {
    const cutoff = Date.now() - windowSize;
    return metrics.filter(metric => {
      const metricTime = new Date(metric.timestamp).getTime();
      return metricTime > cutoff;
    });
  }

  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - this.TIME_WINDOWS.TWENTY_FOUR_HOURS;

    for (const [key, metrics] of this.metrics.entries()) {
      const filteredMetrics = metrics.filter((metric: any) => {
        const metricTime = new Date(metric.timestamp).getTime();
        return metricTime > cutoffTime;
      });

      if (filteredMetrics.length !== metrics.length) {
        this.metrics.set(key, filteredMetrics);
      }

      // Clean up empty metric types
      if (filteredMetrics.length === 0) {
        this.metrics.delete(key);
      }
    }
  }

  private sanitizeKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9_-]/g, "_");
  }

  getMetricsSummary(): Record<string, any> {
    const summary: Record<string, any> = {};

    for (const [key, metrics] of this.metrics.entries()) {
      summary[key] = {
        count: metrics.length,
        latest: metrics[metrics.length - 1],
        oldest: metrics[0],
        timeSpan:
          metrics.length > 1
            ? {
                start: metrics[0]?.timestamp,
                end: metrics[metrics.length - 1]?.timestamp,
              }
            : null,
      };
    }

    return summary;
  }

  getMetricsForEndpoint(
    endpoint: string,
    method?: string
  ): PerformanceMetric[] {
    const key = method
      ? `api_${this.sanitizeKey(endpoint)}_${method}`
      : `api_${this.sanitizeKey(endpoint)}`;

    return this.metrics.get(key) || [];
  }

  clearMetrics(): void {
    this.metrics.clear();
  }

  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}

// Global metrics collector instance
export const metricsCollector = new MetricsCollector();
