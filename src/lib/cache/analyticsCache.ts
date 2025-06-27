/**
 * Analytics Results Caching System
 * Production-grade caching with intelligent invalidation and data freshness management
 * Implements multi-layer caching strategy for optimal performance
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  version: string;
  projectId: string;
  analysisType: string;
}

interface CacheStats {
  hits: number;
  misses: number;
  invalidations: number;
  memoryUsage: number;
}

interface CacheConfig {
  defaultTTL: number; // Time to live in milliseconds
  maxMemoryUsage: number; // Maximum memory usage in bytes
  cleanupInterval: number; // Cleanup interval in milliseconds
  compressionThreshold: number; // Compress entries larger than this size
}

class AnalyticsCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    invalidations: 0,
    memoryUsage: 0,
  };
  
  private config: CacheConfig = {
    defaultTTL: 30 * 60 * 1000, // 30 minutes
    maxMemoryUsage: 100 * 1024 * 1024, // 100MB
    cleanupInterval: 5 * 60 * 1000, // 5 minutes
    compressionThreshold: 10 * 1024, // 10KB
  };
  
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<CacheConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.startCleanupTimer();
  }

  /**
   * Get cached analytical results with freshness validation
   */
  get<T>(projectId: string, analysisType: string, dataVersion?: string): T | null {
    const key = this.generateKey(projectId, analysisType);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateMemoryUsage();
      return null;
    }

    // Check data version compatibility
    if (dataVersion && entry.version !== dataVersion) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateMemoryUsage();
      return null;
    }

    this.stats.hits++;
    return entry.data as T;
  }

  /**
   * Store analytical results with intelligent TTL based on analysis type
   */
  set<T>(
    projectId: string, 
    analysisType: string, 
    data: T, 
    options?: {
      ttl?: number;
      version?: string;
      priority?: 'low' | 'normal' | 'high';
    }
  ): void {
    const key = this.generateKey(projectId, analysisType);
    const ttl = options?.ttl || this.getAnalysisTypeTTL(analysisType);
    const version = options?.version || this.generateVersion();
    
    const entry: CacheEntry<T> = {
      data: this.compressIfNeeded(data),
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
      version,
      projectId,
      analysisType,
    };

    // Check memory limits before storing
    if (this.willExceedMemoryLimit(entry)) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(key, entry);
    this.updateMemoryUsage();
  }

  /**
   * Invalidate cache for specific project and analysis type
   */
  invalidate(projectId: string, analysisType?: string): void {
    if (analysisType) {
      const key = this.generateKey(projectId, analysisType);
      this.cache.delete(key);
      this.stats.invalidations++;
    } else {
      // Invalidate all cache entries for the project
      const keysToDelete: string[] = [];
      for (const [key, entry] of this.cache.entries()) {
        if (entry.projectId === projectId) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => {
        this.cache.delete(key);
        this.stats.invalidations++;
      });
    }
    this.updateMemoryUsage();
  }

  /**
   * Invalidate all expired entries and cleanup memory
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    this.updateMemoryUsage();
  }

  /**
   * Get cache statistics for monitoring
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache hit ratio for performance monitoring
   */
  getHitRatio(): number {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      invalidations: 0,
      memoryUsage: 0,
    };
  }

  /**
   * Check if cache entry exists and is valid
   */
  has(projectId: string, analysisType: string): boolean {
    const key = this.generateKey(projectId, analysisType);
    const entry = this.cache.get(key);
    return !!entry && Date.now() <= entry.expiresAt;
  }

  /**
   * Get all cached analysis types for a project
   */
  getProjectAnalysisTypes(projectId: string): string[] {
    const analysisTypes: string[] = [];
    for (const entry of this.cache.values()) {
      if (entry.projectId === projectId && Date.now() <= entry.expiresAt) {
        analysisTypes.push(entry.analysisType);
      }
    }
    return [...new Set(analysisTypes)];
  }

  private generateKey(projectId: string, analysisType: string): string {
    return `${projectId}:${analysisType}`;
  }

  private generateVersion(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private getAnalysisTypeTTL(analysisType: string): number {
    // Different analysis types have different freshness requirements
    const ttlMap: Record<string, number> = {
      'content-analysis': 60 * 60 * 1000, // 1 hour - content changes less frequently
      'seo-health': 30 * 60 * 1000, // 30 minutes - SEO changes moderately
      'performance': 15 * 60 * 1000, // 15 minutes - performance can change quickly
      'competitive-intelligence': 4 * 60 * 60 * 1000, // 4 hours - competitive data changes slowly
      'industry-benchmarking': 24 * 60 * 60 * 1000, // 24 hours - industry data changes very slowly
      'project-health': 20 * 60 * 1000, // 20 minutes - aggregated health changes moderately
    };

    return ttlMap[analysisType] || this.config.defaultTTL;
  }

  private compressIfNeeded<T>(data: T): T {
    const dataSize = JSON.stringify(data).length;
    if (dataSize > this.config.compressionThreshold) {
      // In a real implementation, you would use compression here
      // For now, we'll just return the data as-is
      return data;
    }
    return data;
  }

  private willExceedMemoryLimit(entry: CacheEntry<unknown>): boolean {
    const entrySize = JSON.stringify(entry).length;
    return this.stats.memoryUsage + entrySize > this.config.maxMemoryUsage;
  }

  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private updateMemoryUsage(): void {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += JSON.stringify(entry).length;
    }
    this.stats.memoryUsage = totalSize;
  }

  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }
}

// Export singleton instance
export const analyticsCache = new AnalyticsCache();

// Export cache utilities
export const CacheKeys = {
  CONTENT_ANALYSIS: 'content-analysis',
  SEO_HEALTH: 'seo-health',
  PERFORMANCE: 'performance',
  COMPETITIVE_INTELLIGENCE: 'competitive-intelligence',
  INDUSTRY_BENCHMARKING: 'industry-benchmarking',
  PROJECT_HEALTH: 'project-health',
} as const;

export type CacheKey = typeof CacheKeys[keyof typeof CacheKeys];

// Cache warming utilities
export async function warmCache(projectId: string, analysisTypes: CacheKey[]): Promise<void> {
  // This would be implemented to pre-populate cache with frequently accessed data
  console.warn(`Warming cache for project ${projectId} with analysis types:`, analysisTypes);
}

// Cache monitoring utilities
export function getCacheMetrics() {
  return {
    stats: analyticsCache.getStats(),
    hitRatio: analyticsCache.getHitRatio(),
    cacheSize: analyticsCache.getStats().memoryUsage,
  };
}