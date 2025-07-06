/**
 * Performance Monitoring Middleware
 * Transparent performance tracking for API endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { metricsCollector } from './metrics-collector';
import crypto from 'crypto';

export interface RequestContext {
  traceId: string;
  startTime: number;
  endpoint: string;
  method: string;
  userAgent?: string;
  userId?: string;
  requestSize?: number;
}

const activeRequests = new Map<string, RequestContext>();

export function withPerformanceMonitoring(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const traceId = generateTraceId();
    const startTime = Date.now();
    const endpoint = new URL(req.url).pathname;
    const method = req.method;

    // Calculate request size
    const requestSize = await getRequestSize(req);

    const context: RequestContext = {
      traceId,
      startTime,
      endpoint,
      method,
      userAgent: req.headers.get('user-agent') || undefined,
      requestSize,
    };

    // Store active request
    activeRequests.set(traceId, context);

    let response: NextResponse;
    let error: Error | null = null;

    try {
      response = await handler(req);
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));
      
      // Create error response
      response = NextResponse.json(
        { error: 'Internal Server Error', traceId },
        { status: 500 }
      );
    } finally {
      // Clean up active request
      activeRequests.delete(traceId);
    }

    const responseTime = Date.now() - startTime;
    const responseSize = await getResponseSize(response);

    // Record performance metric
    metricsCollector.recordApiCall({
      endpoint,
      method,
      responseTime,
      statusCode: error ? 500 : response.status,
      timestamp: new Date().toISOString(),
      userAgent: context.userAgent,
      userId: context.userId,
      requestSize: context.requestSize,
      responseSize,
      traceId,
    });

    // Add performance headers
    const enhancedResponse = new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });

    enhancedResponse.headers.set('X-Response-Time', `${responseTime}ms`);
    enhancedResponse.headers.set('X-Trace-ID', traceId);
    enhancedResponse.headers.set('X-Timestamp', new Date().toISOString());
    
    // Add performance class based on response time
    const performanceClass = getPerformanceClass(responseTime);
    enhancedResponse.headers.set('X-Performance-Class', performanceClass);

    if (error) {
      enhancedResponse.headers.set('X-Error', 'true');
    }

    return enhancedResponse;
  };
}

export function createMonitoredHandler(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return withPerformanceMonitoring(handler);
}

export function withDatabaseMonitoring<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  context: {
    operation: string;
    table: string;
  }
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    let success = false;
    let rowsAffected: number | undefined;

    try {
      const result = await operation(...args);
      success = true;
      
      // Try to extract rows affected if it's a standard database result
      if (result && typeof result === 'object' && 'rowCount' in result) {
        rowsAffected = (result as any).rowCount;
      }

      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      
      metricsCollector.recordDatabaseQuery({
        operation: context.operation,
        table: context.table,
        duration,
        success,
        timestamp: new Date().toISOString(),
        rowsAffected,
        queryHash: generateQueryHash(context.operation, context.table),
      });
    }
  };
}

export function withCacheMonitoring<T>(
  operation: () => Promise<T>,
  context: {
    type: 'hit' | 'miss' | 'set' | 'evict' | 'delete';
    key: string;
    size?: number;
    ttl?: number;
  }
): Promise<T> {
  const startTime = Date.now();

  return operation().finally(() => {
    const duration = Date.now() - startTime;
    
    metricsCollector.recordCacheOperation({
      type: context.type,
      key: context.key,
      duration,
      timestamp: new Date().toISOString(),
      size: context.size,
      ttl: context.ttl,
    });
  });
}

// Middleware for automatic API route monitoring
export function middleware(request: NextRequest) {
  // This function can be used in Next.js middleware
  const traceId = generateTraceId();
  
  // Add trace ID to request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-trace-id', traceId);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// Helper functions
function generateTraceId(): string {
  return crypto.randomBytes(16).toString('hex');
}

function generateQueryHash(operation: string, table: string): string {
  return crypto
    .createHash('md5')
    .update(`${operation}:${table}`)
    .digest('hex')
    .substring(0, 8);
}

async function getRequestSize(req: NextRequest): Promise<number> {
  try {
    const contentLength = req.headers.get('content-length');
    if (contentLength) {
      return parseInt(contentLength, 10);
    }

    // For requests without content-length, estimate from body
    if (req.body) {
      const cloned = req.clone();
      const body = await cloned.text();
      return new Blob([body]).size;
    }

    return 0;
  } catch {
    return 0;
  }
}

async function getResponseSize(response: NextResponse): Promise<number> {
  try {
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      return parseInt(contentLength, 10);
    }

    // Estimate size from response body
    if (response.body) {
      const cloned = response.clone();
      const body = await cloned.text();
      return new Blob([body]).size;
    }

    return 0;
  } catch {
    return 0;
  }
}

function getPerformanceClass(responseTime: number): string {
  if (responseTime < 100) return 'excellent';
  if (responseTime < 300) return 'good';
  if (responseTime < 1000) return 'average';
  if (responseTime < 3000) return 'poor';
  return 'critical';
}

// Export active request tracker for monitoring
export function getActiveRequests(): RequestContext[] {
  return Array.from(activeRequests.values());
}

export function getRequestById(traceId: string): RequestContext | undefined {
  return activeRequests.get(traceId);
}

// Request analytics
export interface RequestAnalytics {
  totalActiveRequests: number;
  averageRequestTime: number;
  longestRunningRequest?: {
    traceId: string;
    duration: number;
    endpoint: string;
  };
  requestsByEndpoint: Record<string, number>;
}

export function getRequestAnalytics(): RequestAnalytics {
  const requests = Array.from(activeRequests.values());
  const now = Date.now();

  if (requests.length === 0) {
    return {
      totalActiveRequests: 0,
      averageRequestTime: 0,
      requestsByEndpoint: {},
    };
  }

  const durations = requests.map(req => now - req.startTime);
  const averageRequestTime = durations.reduce((a, b) => a + b, 0) / durations.length;

  const longestIndex = durations.indexOf(Math.max(...durations));
  const longestRunningRequest = requests[longestIndex] ? {
    traceId: requests[longestIndex].traceId,
    duration: durations[longestIndex],
    endpoint: requests[longestIndex].endpoint,
  } : undefined;

  const requestsByEndpoint: Record<string, number> = {};
  requests.forEach(req => {
    requestsByEndpoint[req.endpoint] = (requestsByEndpoint[req.endpoint] || 0) + 1;
  });

  return {
    totalActiveRequests: requests.length,
    averageRequestTime,
    longestRunningRequest,
    requestsByEndpoint,
  };
}