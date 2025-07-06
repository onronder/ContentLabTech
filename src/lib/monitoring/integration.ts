/**
 * Monitoring System Integration
 * Integrates monitoring with existing error boundaries, retry systems, and API routes
 */

import { logger } from './logger';
import { errorTracker, setupGlobalErrorHandling } from './error-tracker';
import { metricsCollector } from './metrics-collector';
import { healthChecker } from './health-checker';
import { withPerformanceMonitoring, withDatabaseMonitoring, withCacheMonitoring } from './performance-middleware';
import { NextRequest, NextResponse } from 'next/server';

// Integration setup function
export function setupMonitoringIntegration() {
  // Setup global error handling
  setupGlobalErrorHandling();

  // Log system startup
  logger.info('Monitoring system initialized', {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
  }, ['startup', 'monitoring']);

  // Start periodic health checks
  startPeriodicHealthChecks();

  // Log successful integration
  logger.info('Monitoring integration completed', {}, ['startup', 'integration']);
}

// Periodic health check scheduler
function startPeriodicHealthChecks() {
  const HEALTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

  setInterval(async () => {
    try {
      const systemHealth = await healthChecker.checkSystemHealth();
      
      logger.info('Periodic health check completed', {
        overall: systemHealth.overall,
        serviceCount: systemHealth.services.length,
        healthyServices: systemHealth.services.filter(s => s.status === 'healthy').length,
        uptime: systemHealth.uptime,
      }, ['health-check', 'periodic']);

      // Track unhealthy services as errors
      systemHealth.services
        .filter(service => service.status === 'unhealthy')
        .forEach(service => {
          const error = new Error(`Service ${service.name} is unhealthy: ${service.message}`);
          errorTracker.trackError(error, {
            category: 'network',
            severity: 'high',
            endpoint: service.name,
            additional: {
              serviceStatus: service.status,
              responseTime: service.responseTime,
              lastCheck: service.lastCheck,
            },
          });
        });

    } catch (error) {
      logger.error('Periodic health check failed', error instanceof Error ? error : new Error(String(error)), {}, ['health-check', 'error']);
    }
  }, HEALTH_CHECK_INTERVAL);
}

// Enhanced API route wrapper with monitoring
export function withMonitoring<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  options: {
    name: string;
    category?: 'api' | 'database' | 'cache' | 'external';
    trackPerformance?: boolean;
    trackErrors?: boolean;
  } = { name: 'unknown', trackPerformance: true, trackErrors: true }
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    const traceId = crypto.randomUUID();
    
    try {
      logger.debug(`Starting ${options.name}`, {
        traceId,
        category: options.category,
        args: args.length,
      }, ['monitoring', options.category || 'api']);

      const result = await handler(...args);
      
      if (options.trackPerformance) {
        const duration = Date.now() - startTime;
        
        logger.performance({
          operation: options.name,
          duration,
          success: true,
          details: {
            traceId,
            category: options.category,
          }
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (options.trackErrors && error instanceof Error) {
        const errorId = errorTracker.trackError(error, {
          category: options.category === 'api' ? 'business' : options.category || 'runtime',
          additional: {
            operation: options.name,
            duration,
            traceId,
          }
        });

        logger.error(`${options.name} failed`, error, {
          errorId,
          traceId,
          duration,
          category: options.category,
        }, ['monitoring', 'error']);
      }

      throw error;
    }
  };
}

// Next.js API route monitoring wrapper
export function monitorApiRoute(
  handler: (req: NextRequest) => Promise<NextResponse>
): (req: NextRequest) => Promise<NextResponse> {
  return withPerformanceMonitoring(async (req: NextRequest) => {
    const endpoint = new URL(req.url).pathname;
    
    try {
      const response = await handler(req);
      
      // Track successful API call
      logger.http({
        method: req.method,
        url: endpoint,
        status: response.status,
        responseTime: Date.now() - performance.now(),
        userAgent: req.headers.get('user-agent') || undefined,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      });

      return response;
    } catch (error) {
      // Track API error
      if (error instanceof Error) {
        errorTracker.trackError(error, {
          endpoint,
          method: req.method,
          category: 'business',
          severity: 'medium',
          additional: {
            userAgent: req.headers.get('user-agent'),
            ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
          }
        });
      }

      throw error;
    }
  });
}

// Database operation monitoring
export function monitorDatabaseOperation<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  context: {
    operation: string;
    table: string;
  }
): (...args: T) => Promise<R> {
  return withDatabaseMonitoring(
    withMonitoring(operation, {
      name: `DB: ${context.operation} on ${context.table}`,
      category: 'database',
    }),
    context
  );
}

// Cache operation monitoring
export function monitorCacheOperation<T>(
  operation: () => Promise<T>,
  context: {
    type: 'hit' | 'miss' | 'set' | 'evict' | 'delete';
    key: string;
    size?: number;
    ttl?: number;
  }
): Promise<T> {
  return withCacheMonitoring(
    withMonitoring(operation, {
      name: `Cache: ${context.type} ${context.key}`,
      category: 'cache',
    }),
    context
  );
}

// External service monitoring
export function monitorExternalService<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  serviceName: string
): (...args: T) => Promise<R> {
  return withMonitoring(operation, {
    name: `External: ${serviceName}`,
    category: 'external',
  });
}

// React Error Boundary integration
export function createMonitoredErrorBoundary(componentName: string) {
  return class MonitoredErrorBoundary extends Error {
    static getDerivedStateFromError(error: Error) {
      const errorId = errorTracker.trackError(error, {
        endpoint: componentName,
        category: 'runtime',
        severity: 'high',
        additional: {
          type: 'react-error-boundary',
          component: componentName,
        }
      });

      logger.error('React error boundary caught error', error, {
        errorId,
        componentName,
      }, ['react', 'error-boundary']);

      return { hasError: true, errorId };
    }

    componentDidCatch(error: Error, errorInfo: any) {
      logger.error('React error boundary additional info', error, {
        componentStack: errorInfo.componentStack,
        errorBoundary: componentName,
      }, ['react', 'error-info']);
    }
  };
}

// Monitoring status checker
export async function getMonitoringStatus() {
  try {
    const [systemHealth, systemMetrics, errorMetrics] = await Promise.all([
      healthChecker.checkSystemHealth(),
      metricsCollector.getSystemMetrics(),
      errorTracker.getErrorMetrics(),
    ]);

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      systemHealth,
      systemMetrics,
      errorMetrics,
      loggerConfig: logger.getConfig(),
    };
  } catch (error) {
    logger.error('Failed to get monitoring status', error instanceof Error ? error : new Error(String(error)));
    
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Graceful shutdown
export async function shutdownMonitoring() {
  logger.info('Starting monitoring system shutdown', {}, ['shutdown']);

  try {
    // Shutdown components
    await Promise.all([
      logger.shutdown(),
      errorTracker.shutdown(),
      metricsCollector.shutdown(),
    ]);

    console.log('Monitoring system shut down successfully');
  } catch (error) {
    console.error('Error during monitoring shutdown:', error);
  }
}

// Process cleanup handlers
process.on('SIGTERM', shutdownMonitoring);
process.on('SIGINT', shutdownMonitoring);

// Integration with existing error boundaries
export function enhanceErrorBoundary(errorBoundary: any, componentName: string) {
  const originalComponentDidCatch = errorBoundary.componentDidCatch;
  
  errorBoundary.componentDidCatch = function(error: Error, errorInfo: any) {
    // Track error with monitoring system
    const errorId = errorTracker.trackError(error, {
      endpoint: componentName,
      category: 'runtime',
      additional: {
        componentStack: errorInfo.componentStack,
        errorInfo,
      }
    });

    logger.error('Enhanced error boundary caught error', error, {
      errorId,
      componentName,
      errorInfo,
    }, ['react', 'enhanced-error-boundary']);

    // Call original handler if it exists
    if (originalComponentDidCatch) {
      originalComponentDidCatch.call(this, error, errorInfo);
    }
  };

  return errorBoundary;
}

// Performance monitoring middleware for middleware.ts
export function createPerformanceMiddleware() {
  return async (req: NextRequest) => {
    const startTime = Date.now();
    const pathname = req.nextUrl.pathname;

    // Skip monitoring for static assets and internal Next.js routes
    if (
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/api/_') ||
      pathname.includes('.') // Static files
    ) {
      return NextResponse.next();
    }

    try {
      const response = NextResponse.next();
      
      // Track page load performance
      const duration = Date.now() - startTime;
      
      logger.performance({
        operation: `Page: ${pathname}`,
        duration,
        success: true,
        details: {
          method: req.method,
          userAgent: req.headers.get('user-agent'),
        }
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error instanceof Error) {
        errorTracker.trackError(error, {
          endpoint: pathname,
          method: req.method,
          category: 'runtime',
          additional: {
            duration,
            userAgent: req.headers.get('user-agent'),
          }
        });
      }

      throw error;
    }
  };
}

export {
  logger,
  errorTracker,
  metricsCollector,
  healthChecker
};