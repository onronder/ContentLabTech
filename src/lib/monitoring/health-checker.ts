/**
 * Health Check Infrastructure
 * Comprehensive service health monitoring with enhanced error handling
 */

import { Redis } from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  timestamp: string;
  details?: Record<string, any>;
  error?: string;
}

export interface SystemHealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: HealthCheckResult[];
  timestamp: string;
  uptime: number;
  version: string;
  environment: {
    nodeVersion: string;
    platform: string;
    arch: string;
    memory: NodeJS.MemoryUsage;
    processUptime: number;
  };
}

export class HealthChecker {
  private redis: Redis;
  private supabase: ReturnType<typeof createClient>;
  private openai: OpenAI;
  private startTime: number;
  private healthCheckCache: Map<string, { result: HealthCheckResult; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds cache

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 5000,
      commandTimeout: 5000,
    });

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: {
          persistSession: false,
        },
      }
    );

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 10000, // 10 second timeout
    });

    this.startTime = Date.now();
  }

  async checkRedis(): Promise<HealthCheckResult> {
    const cacheKey = 'redis';
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const start = Date.now();
    try {
      // Test connection
      await this.redis.ping();
      
      // Get memory information
      const info = await this.redis.info('memory');
      const memoryUsage = this.parseRedisMemoryInfo(info);
      
      // Test basic operations
      const testKey = `health_check_${Date.now()}`;
      await this.redis.set(testKey, 'test', 'EX', 60);
      const testValue = await this.redis.get(testKey);
      await this.redis.del(testKey);
      
      const result: HealthCheckResult = {
        service: 'redis',
        status: memoryUsage > 0.8 ? 'degraded' : 'healthy',
        responseTime: Date.now() - start,
        timestamp: new Date().toISOString(),
        details: {
          memoryUsage: `${(memoryUsage * 100).toFixed(2)}%`,
          connected: true,
          operationsWorking: testValue === 'test',
          info: this.parseRedisInfo(info),
        },
      };

      this.setCachedResult(cacheKey, result);
      return result;
    } catch (error) {
      const result: HealthCheckResult = {
        service: 'redis',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          connected: false,
        },
      };

      this.setCachedResult(cacheKey, result);
      return result;
    }
  }

  async checkSupabase(): Promise<HealthCheckResult> {
    const cacheKey = 'supabase';
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const start = Date.now();
    try {
      // Use a simple query that doesn't require specific tables
      const { data, error } = await this.supabase.rpc('version');

      if (error) throw error;

      // Test auth service
      const { data: authUser, error: authError } = await this.supabase.auth.getUser();
      
      const result: HealthCheckResult = {
        service: 'supabase',
        status: 'healthy',
        responseTime: Date.now() - start,
        timestamp: new Date().toISOString(),
        details: {
          connected: true,
          version: data || 'Unknown',
          authServiceResponding: !authError,
          querySuccessful: true,
        },
      };

      this.setCachedResult(cacheKey, result);
      return result;
    } catch (error) {
      const result: HealthCheckResult = {
        service: 'supabase',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          connected: false,
        },
      };

      this.setCachedResult(cacheKey, result);
      return result;
    }
  }

  async checkOpenAI(): Promise<HealthCheckResult> {
    const cacheKey = 'openai';
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const start = Date.now();
    try {
      // Lightweight check - list available models
      const response = await this.openai.models.list();
      
      const models = response.data || [];
      const hasGPT4 = models.some(model => model.id.includes('gpt-4'));
      const hasGPT35 = models.some(model => model.id.includes('gpt-3.5'));
      
      const result: HealthCheckResult = {
        service: 'openai',
        status: models.length > 0 ? 'healthy' : 'degraded',
        responseTime: Date.now() - start,
        timestamp: new Date().toISOString(),
        details: {
          connected: true,
          modelsAvailable: models.length,
          hasGPT4,
          hasGPT35,
          availableModels: models.slice(0, 5).map(m => m.id), // First 5 models
        },
      };

      this.setCachedResult(cacheKey, result);
      return result;
    } catch (error) {
      const result: HealthCheckResult = {
        service: 'openai',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          connected: false,
        },
      };

      this.setCachedResult(cacheKey, result);
      return result;
    }
  }

  async checkBrightData(): Promise<HealthCheckResult> {
    const cacheKey = 'brightdata';
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const start = Date.now();
    try {
      // Simple connectivity check - use a lightweight endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('https://brightdata.com', {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'ContentLab-Health-Check/1.0',
        },
      });

      clearTimeout(timeoutId);

      const result: HealthCheckResult = {
        service: 'brightdata',
        status: response.ok ? 'healthy' : 'degraded',
        responseTime: Date.now() - start,
        timestamp: new Date().toISOString(),
        details: {
          connected: true,
          httpStatus: response.status,
          responseHeaders: Object.fromEntries(response.headers.entries()),
        },
      };

      this.setCachedResult(cacheKey, result);
      return result;
    } catch (error) {
      const result: HealthCheckResult = {
        service: 'brightdata',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          connected: false,
        },
      };

      this.setCachedResult(cacheKey, result);
      return result;
    }
  }

  async checkSystemHealth(): Promise<SystemHealthStatus> {
    const [redis, supabase, openai, brightdata] = await Promise.all([
      this.checkRedis().catch(error => ({
        service: 'redis',
        status: 'unhealthy' as const,
        responseTime: 0,
        timestamp: new Date().toISOString(),
        error: error.message,
      })),
      this.checkSupabase().catch(error => ({
        service: 'supabase',
        status: 'unhealthy' as const,
        responseTime: 0,
        timestamp: new Date().toISOString(),
        error: error.message,
      })),
      this.checkOpenAI().catch(error => ({
        service: 'openai',
        status: 'unhealthy' as const,
        responseTime: 0,
        timestamp: new Date().toISOString(),
        error: error.message,
      })),
      this.checkBrightData().catch(error => ({
        service: 'brightdata',
        status: 'unhealthy' as const,
        responseTime: 0,
        timestamp: new Date().toISOString(),
        error: error.message,
      })),
    ]);

    const services = [redis, supabase, openai, brightdata];
    const healthyCount = services.filter(s => s.status === 'healthy').length;
    const degradedCount = services.filter(s => s.status === 'degraded').length;
    
    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyCount === services.length) {
      overall = 'healthy';
    } else if (healthyCount + degradedCount >= services.length * 0.75) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }

    return {
      overall,
      services,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || '1.0.0',
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage(),
        processUptime: process.uptime() * 1000, // Convert to milliseconds
      },
    };
  }

  private parseRedisMemoryInfo(info: string): number {
    const lines = info.split('\r\n');
    const usedMemoryLine = lines.find(line => line.startsWith('used_memory:'));
    
    if (!usedMemoryLine) return 0;
    
    const usedMemory = parseInt(usedMemoryLine.split(':')[1]);
    
    // Handle maxmemory (can be 0 for unlimited)
    const maxMemoryLine = lines.find(line => line.startsWith('maxmemory:'));
    if (!maxMemoryLine) {
      // Try to get total system memory
      const systemMemoryLine = lines.find(line => line.startsWith('total_system_memory:'));
      if (systemMemoryLine) {
        const totalMemory = parseInt(systemMemoryLine.split(':')[1]);
        return totalMemory > 0 ? usedMemory / totalMemory : 0;
      }
      return 0;
    }
    
    const maxMemory = parseInt(maxMemoryLine.split(':')[1]);
    return maxMemory > 0 ? usedMemory / maxMemory : 0;
  }

  private parseRedisInfo(info: string): Record<string, string> {
    const lines = info.split('\r\n');
    const parsed: Record<string, string> = {};
    
    for (const line of lines) {
      if (line.includes(':') && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          parsed[key.trim()] = value.trim();
        }
      }
    }
    
    return parsed;
  }

  private getCachedResult(service: string): HealthCheckResult | null {
    const cached = this.healthCheckCache.get(service);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.result;
    }
    return null;
  }

  private setCachedResult(service: string, result: HealthCheckResult): void {
    this.healthCheckCache.set(service, {
      result,
      timestamp: Date.now(),
    });
  }

  async shutdown(): Promise<void> {
    await this.redis.quit();
  }
}

// Singleton instance
export const healthChecker = new HealthChecker();