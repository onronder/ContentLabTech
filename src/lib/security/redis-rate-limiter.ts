/**
 * Production-Grade Redis Rate Limiter
 * Implements sliding window rate limiting with Redis backend
 */

import { createClient, RedisClientType } from "redis";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalHits: number;
}

export interface RateLimitRule {
  identifier: string;
  limit: number;
  windowMs: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (identifier: string) => string;
}

export class RedisRateLimiter {
  private client: RedisClientType;
  private connected = false;
  private rules: Map<string, RateLimitRule> = new Map();

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
      password: process.env.REDIS_PASSWORD,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: retries => Math.min(retries * 50, 2000),
      },
    });

    this.client.on("error", err => {
      console.error("Redis Rate Limiter Error:", err);
      this.connected = false;
    });

    this.client.on("connect", () => {
      this.connected = true;
      console.info("Redis Rate Limiter connected");
    });

    this.setupDefaultRules();
    this.connect();
  }

  private async connect() {
    if (!this.connected) {
      try {
        await this.client.connect();
      } catch (error) {
        console.error("Failed to connect to Redis:", error);
      }
    }
  }

  private setupDefaultRules() {
    // Authentication endpoints - stricter limits
    this.addRule("auth", {
      identifier: "auth",
      limit: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
      keyGenerator: id => `auth:${id}`,
    });

    // API endpoints - standard limits
    this.addRule("api", {
      identifier: "api",
      limit: 100,
      windowMs: 60 * 1000, // 1 minute
      keyGenerator: id => `api:${id}`,
    });

    // Heavy operations - restrictive limits
    this.addRule("heavy", {
      identifier: "heavy",
      limit: 10,
      windowMs: 60 * 1000, // 1 minute
      keyGenerator: id => `heavy:${id}`,
    });

    // WebSocket connections
    this.addRule("websocket", {
      identifier: "websocket",
      limit: 20,
      windowMs: 60 * 1000, // 1 minute
      keyGenerator: id => `ws:${id}`,
    });

    // Content uploads
    this.addRule("upload", {
      identifier: "upload",
      limit: 5,
      windowMs: 60 * 1000, // 1 minute
      keyGenerator: id => `upload:${id}`,
    });
  }

  addRule(name: string, rule: RateLimitRule) {
    this.rules.set(name, rule);
  }

  async checkRateLimit(
    ruleName: string,
    identifier: string,
    cost = 1
  ): Promise<RateLimitResult> {
    const rule = this.rules.get(ruleName);
    if (!rule) {
      return {
        allowed: true,
        remaining: -1,
        resetTime: 0,
        totalHits: 0,
      };
    }

    // Fallback to in-memory if Redis is not available
    if (!this.connected) {
      return this.fallbackRateLimit(rule, identifier, cost);
    }

    const key = rule.keyGenerator?.(identifier) || `${ruleName}:${identifier}`;
    const now = Date.now();
    const window = Math.floor(now / rule.windowMs);
    const windowKey = `${key}:${window}`;

    try {
      const pipeline = this.client.multi();

      // Remove old entries
      pipeline.zRemRangeByScore(windowKey, 0, now - rule.windowMs);

      // Count current entries
      pipeline.zCard(windowKey);

      // Add current request
      for (let i = 0; i < cost; i++) {
        pipeline.zAdd(windowKey, {
          score: now,
          value: `${now}-${Math.random().toString(36).substr(2, 9)}`,
        });
      }

      // Set expiration
      pipeline.expire(windowKey, Math.ceil(rule.windowMs / 1000));

      const results = await pipeline.exec();
      const currentCount = (results?.[1] as any)?.[1] || 0;

      const totalHits = currentCount + cost;
      const remaining = Math.max(0, rule.limit - totalHits);
      const resetTime = (window + 1) * rule.windowMs;

      return {
        allowed: totalHits <= rule.limit,
        remaining,
        resetTime,
        totalHits,
      };
    } catch (error) {
      console.error("Redis rate limit error:", error);
      return this.fallbackRateLimit(rule, identifier, cost);
    }
  }

  private fallbackRateLimit(
    rule: RateLimitRule,
    identifier: string,
    cost: number
  ): RateLimitResult {
    // Simple in-memory fallback
    const key = `${rule.identifier}:${identifier}`;
    const now = Date.now();

    if (!this.memoryStore) {
      this.memoryStore = new Map();
    }

    const existing = this.memoryStore.get(key);

    if (!existing || now > existing.resetTime) {
      const resetTime = now + rule.windowMs;
      this.memoryStore.set(key, {
        count: cost,
        resetTime,
      });

      return {
        allowed: cost <= rule.limit,
        remaining: rule.limit - cost,
        resetTime,
        totalHits: cost,
      };
    }

    existing.count += cost;
    const remaining = Math.max(0, rule.limit - existing.count);

    return {
      allowed: existing.count <= rule.limit,
      remaining,
      resetTime: existing.resetTime,
      totalHits: existing.count,
    };
  }

  private memoryStore?: Map<string, { count: number; resetTime: number }>;

  async getStats(
    ruleName: string,
    identifier: string
  ): Promise<{
    currentUsage: number;
    limit: number;
    resetTime: number;
  }> {
    const rule = this.rules.get(ruleName);
    if (!rule || !this.connected) {
      return { currentUsage: 0, limit: 0, resetTime: 0 };
    }

    const key = rule.keyGenerator?.(identifier) || `${ruleName}:${identifier}`;
    const now = Date.now();
    const window = Math.floor(now / rule.windowMs);
    const windowKey = `${key}:${window}`;

    try {
      const count = await this.client.zCard(windowKey);
      return {
        currentUsage: count,
        limit: rule.limit,
        resetTime: (window + 1) * rule.windowMs,
      };
    } catch (error) {
      console.error("Redis stats error:", error);
      return { currentUsage: 0, limit: rule.limit, resetTime: 0 };
    }
  }

  async resetLimit(ruleName: string, identifier: string): Promise<void> {
    const rule = this.rules.get(ruleName);
    if (!rule || !this.connected) return;

    const key = rule.keyGenerator?.(identifier) || `${ruleName}:${identifier}`;
    const now = Date.now();
    const window = Math.floor(now / rule.windowMs);
    const windowKey = `${key}:${window}`;

    try {
      await this.client.del(windowKey);
    } catch (error) {
      console.error("Redis reset error:", error);
    }
  }

  async close(): Promise<void> {
    if (this.connected) {
      await this.client.quit();
    }
  }

  // Get rate limit rule for external use
  getRule(ruleName: string): RateLimitRule | undefined {
    return this.rules.get(ruleName);
  }

  // Update rule dynamically
  updateRule(ruleName: string, updates: Partial<RateLimitRule>): void {
    const existing = this.rules.get(ruleName);
    if (existing) {
      this.rules.set(ruleName, { ...existing, ...updates });
    }
  }
}

// Export singleton instance
export const redisRateLimiter = new RedisRateLimiter();

// Graceful shutdown
if (typeof process !== "undefined") {
  process.on("SIGTERM", async () => {
    await redisRateLimiter.close();
  });

  process.on("SIGINT", async () => {
    await redisRateLimiter.close();
  });
}
