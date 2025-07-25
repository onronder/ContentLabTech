/**
 * Enterprise Redis Cache Manager
 * High-performance caching layer with intelligent invalidation
 */

import Redis from "ioredis";

interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  maxRetriesPerRequest: number;
  retryDelayOnFailover: number;
  connectTimeout: number;
  commandTimeout: number;
  maxMemoryPolicy: string;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  totalRequests: number;
  hitRate: number;
  averageResponseTime: number;
}

interface CacheItem<T = any> {
  value: T;
  expiry: number;
  tags: string[];
  version: number;
}

class RedisCache {
  private static instance: RedisCache;
  private redis: Redis;
  private metrics: CacheMetrics;
  private isConnected = false;

  private constructor() {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      totalRequests: 0,
      hitRate: 0,
      averageResponseTime: 0,
    };

    this.initializeRedis();
  }

  public static getInstance(): RedisCache {
    if (!RedisCache.instance) {
      RedisCache.instance = new RedisCache();
    }
    return RedisCache.instance;
  }

  private initializeRedis(): void {
    const config: CacheConfig = {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || "0"),
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      connectTimeout: 10000,
      commandTimeout: 5000,
      maxMemoryPolicy: "allkeys-lru",
    };

    console.log("🔌 Initializing Redis connection...", {
      host: config.host,
      port: config.port,
      db: config.db,
    });

    this.redis = new Redis({
      ...config,
      lazyConnect: true,
      keepAlive: 30000,
      family: 4, // Force IPv4
      retryDelayOnClusterDown: 300,
      retryDelayOnFailover: config.retryDelayOnFailover,
      maxRetriesPerRequest: config.maxRetriesPerRequest,
      reconnectOnError: (err) => {
        const targetError = "READONLY";
        return err.message.includes(targetError);
      },
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.redis.on("connect", () => {
      console.log("✅ Redis connected successfully");
      this.isConnected = true;
    });

    this.redis.on("ready", () => {
      console.log("🚀 Redis ready for operations");
      this.configureRedis();
    });

    this.redis.on("error", (error) => {
      console.error("❌ Redis connection error:", error.message);
      this.metrics.errors++;
      this.isConnected = false;
    });

    this.redis.on("close", () => {
      console.warn("⚠️ Redis connection closed");
      this.isConnected = false;
    });

    this.redis.on("reconnecting", (delay) => {
      console.log(`🔄 Redis reconnecting in ${delay}ms...`);
    });
  }

  private async configureRedis(): Promise<void> {
    try {
      // Configure Redis for optimal performance
      await this.redis.config("SET", "maxmemory-policy", "allkeys-lru");
      await this.redis.config("SET", "timeout", "300");
      await this.redis.config("SET", "tcp-keepalive", "60");
      
      console.log("⚙️ Redis configured for optimal performance");
    } catch (error) {
      console.error("❌ Failed to configure Redis:", error);
    }
  }

  public async connect(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.redis.connect();
      } catch (error) {
        console.error("❌ Failed to connect to Redis:", error);
        throw error;
      }
    }
  }

  // =====================================================
  // BASIC CACHE OPERATIONS
  // =====================================================

  public async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      await this.ensureConnection();
      
      const cached = await this.redis.get(this.formatKey(key));
      const responseTime = Date.now() - startTime;
      this.updateAverageResponseTime(responseTime);

      if (!cached) {
        this.metrics.misses++;
        return null;
      }

      const item: CacheItem<T> = JSON.parse(cached);
      
      // Check expiry
      if (item.expiry && Date.now() > item.expiry) {
        this.metrics.misses++;
        await this.delete(key); // Clean up expired item
        return null;
      }

      this.metrics.hits++;
      this.updateHitRate();
      
      return item.value;
    } catch (error) {
      this.metrics.errors++;
      console.error(`❌ Cache get error for key ${key}:`, error);
      return null;
    }
  }

  public async set<T>(
    key: string,
    value: T,
    options?: {
      ttl?: number; // TTL in seconds
      tags?: string[];
      version?: number;
    }
  ): Promise<boolean> {
    try {
      await this.ensureConnection();

      const item: CacheItem<T> = {
        value,
        expiry: options?.ttl ? Date.now() + (options.ttl * 1000) : 0,
        tags: options?.tags || [],
        version: options?.version || 1,
      };

      const result = await this.redis.set(
        this.formatKey(key),
        JSON.stringify(item),
        "EX",
        options?.ttl || 3600 // Default 1 hour TTL
      );

      this.metrics.sets++;
      
      // Add to tag indexes for cache invalidation
      if (options?.tags?.length) {
        await this.addToTagIndexes(key, options.tags);
      }

      return result === "OK";
    } catch (error) {
      this.metrics.errors++;
      console.error(`❌ Cache set error for key ${key}:`, error);
      return false;
    }
  }

  public async delete(key: string): Promise<boolean> {
    try {
      await this.ensureConnection();
      
      const result = await this.redis.del(this.formatKey(key));
      this.metrics.deletes++;
      
      return result > 0;
    } catch (error) {
      this.metrics.errors++;
      console.error(`❌ Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  // =====================================================
  // ADVANCED CACHE OPERATIONS
  // =====================================================

  public async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      await this.ensureConnection();
      
      const formattedKeys = keys.map(key => this.formatKey(key));
      const cached = await this.redis.mget(...formattedKeys);
      
      return cached.map((item, index) => {
        this.metrics.totalRequests++;
        
        if (!item) {
          this.metrics.misses++;
          return null;
        }

        try {
          const cacheItem: CacheItem<T> = JSON.parse(item);
          
          // Check expiry
          if (cacheItem.expiry && Date.now() > cacheItem.expiry) {
            this.metrics.misses++;
            this.delete(keys[index]); // Clean up expired item
            return null;
          }

          this.metrics.hits++;
          return cacheItem.value;
        } catch {
          this.metrics.misses++;
          return null;
        }
      });
    } catch (error) {
      this.metrics.errors++;
      console.error("❌ Cache mget error:", error);
      return keys.map(() => null);
    } finally {
      this.updateHitRate();
    }
  }

  public async mset<T>(
    items: Array<{
      key: string;
      value: T;
      ttl?: number;
      tags?: string[];
    }>
  ): Promise<boolean> {
    try {
      await this.ensureConnection();
      
      const pipeline = this.redis.pipeline();
      
      for (const item of items) {
        const cacheItem: CacheItem<T> = {
          value: item.value,
          expiry: item.ttl ? Date.now() + (item.ttl * 1000) : 0,
          tags: item.tags || [],
          version: 1,
        };

        pipeline.set(
          this.formatKey(item.key),
          JSON.stringify(cacheItem),
          "EX",
          item.ttl || 3600
        );

        // Add to tag indexes
        if (item.tags?.length) {
          for (const tag of item.tags) {
            pipeline.sadd(this.formatTagKey(tag), item.key);
          }
        }
      }

      const results = await pipeline.exec();
      this.metrics.sets += items.length;
      
      return results?.every(result => result[1] === "OK") || false;
    } catch (error) {
      this.metrics.errors++;
      console.error("❌ Cache mset error:", error);
      return false;
    }
  }

  // =====================================================
  // TAG-BASED CACHE INVALIDATION
  // =====================================================

  public async invalidateByTag(tag: string): Promise<number> {
    try {
      await this.ensureConnection();
      
      const tagKey = this.formatTagKey(tag);
      const keys = await this.redis.smembers(tagKey);
      
      if (keys.length === 0) {
        return 0;
      }

      const pipeline = this.redis.pipeline();
      
      // Delete all keys with this tag
      for (const key of keys) {
        pipeline.del(this.formatKey(key));
      }
      
      // Clean up the tag index
      pipeline.del(tagKey);
      
      const results = await pipeline.exec();
      const deletedCount = results?.filter(result => result[1] === 1).length || 0;
      
      this.metrics.deletes += deletedCount;
      
      console.log(`🧹 Invalidated ${deletedCount} cache entries for tag: ${tag}`);
      
      return deletedCount;
    } catch (error) {
      this.metrics.errors++;
      console.error(`❌ Cache invalidation error for tag ${tag}:`, error);
      return 0;
    }
  }

  public async invalidateByTags(tags: string[]): Promise<number> {
    let totalDeleted = 0;
    
    for (const tag of tags) {
      totalDeleted += await this.invalidateByTag(tag);
    }
    
    return totalDeleted;
  }

  // =====================================================
  // CACHE WARMING AND PRELOADING
  // =====================================================

  public async warmCache(
    warmupFunctions: Array<{
      key: string;
      fn: () => Promise<any>;
      ttl?: number;
      tags?: string[];
    }>
  ): Promise<void> {
    console.log(`🔥 Starting cache warm-up for ${warmupFunctions.length} functions...`);
    
    const startTime = Date.now();
    const results = await Promise.allSettled(
      warmupFunctions.map(async ({ key, fn, ttl, tags }) => {
        try {
          // Check if already cached
          const cached = await this.get(key);
          if (cached !== null) {
            return { key, status: "already_cached" };
          }

          // Load and cache the data
          const data = await fn();
          await this.set(key, data, { ttl, tags });
          
          return { key, status: "cached" };
        } catch (error) {
          console.error(`❌ Cache warm-up failed for key ${key}:`, error);
          return { key, status: "failed", error };
        }
      })
    );

    const successful = results.filter(result => 
      result.status === "fulfilled" && 
      result.value.status === "cached"
    ).length;

    const alreadyCached = results.filter(result => 
      result.status === "fulfilled" && 
      result.value.status === "already_cached"
    ).length;

    const failed = results.filter(result => 
      result.status === "rejected" || 
      (result.status === "fulfilled" && result.value.status === "failed")
    ).length;

    const duration = Date.now() - startTime;
    
    console.log(`✅ Cache warm-up completed in ${duration}ms`, {
      successful,
      alreadyCached,
      failed,
      total: warmupFunctions.length,
    });
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  private async ensureConnection(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }
  }

  private formatKey(key: string): string {
    return `contentlab:${key}`;
  }

  private formatTagKey(tag: string): string {
    return `contentlab:tags:${tag}`;
  }

  private async addToTagIndexes(key: string, tags: string[]): Promise<void> {
    if (tags.length === 0) return;

    const pipeline = this.redis.pipeline();
    for (const tag of tags) {
      pipeline.sadd(this.formatTagKey(tag), key);
    }
    await pipeline.exec();
  }

  private updateHitRate(): void {
    this.metrics.hitRate = (this.metrics.hits / this.metrics.totalRequests) * 100;
  }

  private updateAverageResponseTime(responseTime: number): void {
    const totalResponseTime = this.metrics.averageResponseTime * this.metrics.totalRequests;
    this.metrics.averageResponseTime = (totalResponseTime + responseTime) / (this.metrics.totalRequests + 1);
  }

  // =====================================================
  // MONITORING AND DIAGNOSTICS
  // =====================================================

  public getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  public async getCacheInfo(): Promise<any> {
    try {
      await this.ensureConnection();
      
      const info = await this.redis.info("memory");
      const stats = await this.redis.info("stats");
      
      return {
        connected: this.isConnected,
        metrics: this.getMetrics(),
        redis: {
          memory: this.parseRedisInfo(info),
          stats: this.parseRedisInfo(stats),
        },
      };
    } catch (error) {
      console.error("❌ Failed to get cache info:", error);
      return {
        connected: false,
        metrics: this.getMetrics(),
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private parseRedisInfo(info: string): Record<string, string> {
    const result: Record<string, string> = {};
    
    info.split("\n").forEach(line => {
      const [key, value] = line.split(":");
      if (key && value) {
        result[key.trim()] = value.trim();
      }
    });
    
    return result;
  }

  public async flushAll(): Promise<boolean> {
    try {
      await this.ensureConnection();
      await this.redis.flushall();
      
      // Reset metrics
      this.metrics = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        errors: 0,
        totalRequests: 0,
        hitRate: 0,
        averageResponseTime: 0,
      };
      
      console.log("🧹 Cache flushed successfully");
      return true;
    } catch (error) {
      console.error("❌ Failed to flush cache:", error);
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.isConnected = false;
      console.log("👋 Redis disconnected");
    }
  }
}

// =====================================================
// CACHE HELPER FUNCTIONS
// =====================================================

export const cache = RedisCache.getInstance();

export const withCache = async <T>(
  key: string,
  fn: () => Promise<T>,
  options?: {
    ttl?: number;
    tags?: string[];
    force?: boolean;
  }
): Promise<T> => {
  // Check cache first (unless forced refresh)
  if (!options?.force) {
    const cached = await cache.get<T>(key);
    if (cached !== null) {
      return cached;
    }
  }

  // Load data and cache it
  const data = await fn();
  await cache.set(key, data, {
    ttl: options?.ttl,
    tags: options?.tags,
  });

  return data;
};

// Common cache key generators
export const CacheKeys = {
  team: (teamId: string) => `team:${teamId}`,
  teamMembers: (teamId: string) => `team:${teamId}:members`,
  project: (projectId: string) => `project:${projectId}`,
  projectContent: (projectId: string) => `project:${projectId}:content`,
  projectCompetitors: (projectId: string) => `project:${projectId}:competitors`,
  userTeams: (userId: string) => `user:${userId}:teams`,
  userProjects: (userId: string) => `user:${userId}:projects`,
  contentAnalytics: (contentId: string, days: number) => `content:${contentId}:analytics:${days}d`,
  competitorTracking: (competitorId: string) => `competitor:${competitorId}:tracking`,
  dashboards: (projectId: string) => `project:${projectId}:dashboards`,
};

// Common cache tags for invalidation
export const CacheTags = {
  team: (teamId: string) => `team:${teamId}`,
  project: (projectId: string) => `project:${projectId}`,
  user: (userId: string) => `user:${userId}`,
  content: (contentId: string) => `content:${contentId}`,
  competitor: (competitorId: string) => `competitor:${competitorId}`,
  analytics: "analytics",
  dashboards: "dashboards",
};