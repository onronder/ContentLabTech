/**
 * Simple In-Memory Rate Limiter for Next.js Middleware
 * Production-ready fallback when Redis is unavailable
 */

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
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  hits: number[];
}

export class SimpleRateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private rules: Map<string, RateLimitRule> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.setupDefaultRules();

    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  private setupDefaultRules(): void {
    this.rules.set("api", {
      identifier: "api",
      limit: 100,
      windowMs: 60 * 1000, // 1 minute
    });

    this.rules.set("auth", {
      identifier: "auth",
      limit: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
    });

    this.rules.set("heavy", {
      identifier: "heavy",
      limit: 10,
      windowMs: 60 * 1000, // 1 minute
    });

    this.rules.set("websocket", {
      identifier: "websocket",
      limit: 50,
      windowMs: 60 * 1000, // 1 minute
    });
  }

  async checkRateLimit(
    ruleName: string,
    identifier: string
  ): Promise<RateLimitResult> {
    const rule = this.rules.get(ruleName);
    if (!rule) {
      throw new Error(`Rate limit rule '${ruleName}' not found`);
    }

    const key = `${ruleName}:${identifier}`;
    const now = Date.now();
    const windowStart = now - rule.windowMs;

    let entry = this.store.get(key);

    if (!entry) {
      entry = {
        count: 0,
        resetTime: now + rule.windowMs,
        hits: [],
      };
      this.store.set(key, entry);
    }

    // Remove old hits outside the window
    entry.hits = entry.hits.filter(hitTime => hitTime > windowStart);

    // Add current hit
    entry.hits.push(now);
    entry.count = entry.hits.length;

    // Update reset time if needed
    if (now > entry.resetTime) {
      entry.resetTime = now + rule.windowMs;
    }

    const allowed = entry.count <= rule.limit;
    const remaining = Math.max(0, rule.limit - entry.count);

    return {
      allowed,
      remaining,
      resetTime: entry.resetTime,
      totalHits: entry.count,
    };
  }

  getRule(ruleName: string): RateLimitRule | undefined {
    return this.rules.get(ruleName);
  }

  addRule(name: string, rule: RateLimitRule): void {
    this.rules.set(name, rule);
  }

  private cleanup(): void {
    const now = Date.now();

    for (const [key, entry] of this.store.entries()) {
      // Remove entries that are completely expired
      if (entry.resetTime < now && entry.hits.length === 0) {
        this.store.delete(key);
      }
    }
  }

  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// Export singleton instance
export const simpleRateLimiter = new SimpleRateLimiter();

// Graceful shutdown
if (typeof process !== "undefined") {
  process.on("SIGTERM", () => {
    simpleRateLimiter.shutdown();
  });

  process.on("SIGINT", () => {
    simpleRateLimiter.shutdown();
  });
}
