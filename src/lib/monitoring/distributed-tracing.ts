/**
 * Distributed Tracing and Performance Monitoring
 * OpenTelemetry-compatible distributed tracing with performance analytics
 */

import { performance } from "perf_hooks";
import { enterpriseLogger } from "./enterprise-logger";
import { enterpriseAlertingSystem } from "./enterprise-alerting";
import crypto from "crypto";

// Tracing interfaces
export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  traceFlags: number;
  baggage: Record<string, string>;
  sampled: boolean;
}

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  serviceName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: SpanStatus;
  tags: Record<string, any>;
  logs: SpanLog[];
  events: SpanEvent[];
  links: SpanLink[];
  baggage: Record<string, string>;
  kind: SpanKind;
  resource: Resource;
  instrumentationLibrary: InstrumentationLibrary;
}

export interface SpanLog {
  timestamp: number;
  fields: Record<string, any>;
}

export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes: Record<string, any>;
}

export interface SpanLink {
  traceId: string;
  spanId: string;
  attributes: Record<string, any>;
}

export interface Resource {
  serviceName: string;
  serviceVersion: string;
  serviceNamespace?: string;
  serviceInstance: string;
  environment: string;
  attributes: Record<string, any>;
}

export interface InstrumentationLibrary {
  name: string;
  version: string;
}

export enum SpanKind {
  INTERNAL = 'internal',
  SERVER = 'server',
  CLIENT = 'client',
  PRODUCER = 'producer',
  CONSUMER = 'consumer',
}

export enum SpanStatus {
  UNSET = 'unset',
  OK = 'ok',
  ERROR = 'error',
}

// Performance monitoring interfaces
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags: Record<string, string>;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
}

export interface PerformanceBenchmark {
  operationName: string;
  serviceName: string;
  baseline: {
    p50: number;
    p95: number;
    p99: number;
    mean: number;
    stddev: number;
  };
  current: {
    p50: number;
    p95: number;
    p99: number;
    mean: number;
    stddev: number;
  };
  degradation: {
    percentage: number;
    significant: boolean;
    threshold: number;
  };
  sampleSize: number;
  timeWindow: string;
}

export interface ServiceMap {
  services: ServiceNode[];
  dependencies: ServiceDependency[];
  errorRates: Record<string, number>;
  latencies: Record<string, number>;
  throughput: Record<string, number>;
}

export interface ServiceNode {
  name: string;
  type: 'service' | 'database' | 'cache' | 'external';
  version: string;
  environment: string;
  health: 'healthy' | 'degraded' | 'unhealthy';
  instances: number;
  endpoints: string[];
}

export interface ServiceDependency {
  from: string;
  to: string;
  type: 'http' | 'grpc' | 'database' | 'queue' | 'cache';
  latency: number;
  errorRate: number;
  throughput: number;
}

// Sampling strategies
export interface SamplingStrategy {
  type: 'probabilistic' | 'rate_limiting' | 'adaptive' | 'custom';
  config: Record<string, any>;
}

// Main distributed tracing class
export class DistributedTracer {
  private activeSpans: Map<string, Span> = new Map();
  private completedSpans: Span[] = [];
  private metrics: PerformanceMetric[] = [];
  private samplingStrategy: SamplingStrategy;
  private resource: Resource;
  private instrumentationLibrary: InstrumentationLibrary;
  private exporters: TraceExporter[] = [];
  private performanceBaselines: Map<string, PerformanceBenchmark> = new Map();

  constructor(config: {
    serviceName: string;
    serviceVersion: string;
    environment: string;
    samplingStrategy?: SamplingStrategy;
  }) {
    this.resource = {
      serviceName: config.serviceName,
      serviceVersion: config.serviceVersion,
      serviceNamespace: process.env.SERVICE_NAMESPACE,
      serviceInstance: process.env.INSTANCE_ID || process.pid.toString(),
      environment: config.environment,
      attributes: {
        'host.name': process.env.HOSTNAME || 'unknown',
        'os.type': process.platform,
        'process.pid': process.pid,
        'node.version': process.version,
      },
    };

    this.instrumentationLibrary = {
      name: '@contentlab/distributed-tracing',
      version: '1.0.0',
    };

    this.samplingStrategy = config.samplingStrategy || {
      type: 'probabilistic',
      config: { rate: 0.1 }, // 10% sampling
    };

    this.initializeExporters();
    this.startMetricsCollection();
    this.loadPerformanceBaselines();
  }

  /**
   * Start a new span
   */
  startSpan(
    operationName: string,
    parentContext?: TraceContext,
    options: {
      kind?: SpanKind;
      tags?: Record<string, any>;
      links?: SpanLink[];
      startTime?: number;
    } = {}
  ): { span: Span; context: TraceContext } {
    const now = options.startTime || performance.now();
    const traceId = parentContext?.traceId || this.generateTraceId();
    const spanId = this.generateSpanId();
    const parentSpanId = parentContext?.spanId;

    // Apply sampling
    const sampled = this.shouldSample(traceId, operationName);

    const span: Span = {
      traceId,
      spanId,
      parentSpanId,
      operationName,
      serviceName: this.resource.serviceName,
      startTime: now,
      status: SpanStatus.UNSET,
      tags: {
        'service.name': this.resource.serviceName,
        'service.version': this.resource.serviceVersion,
        'service.instance': this.resource.serviceInstance,
        'environment': this.resource.environment,
        ...options.tags,
      },
      logs: [],
      events: [],
      links: options.links || [],
      baggage: parentContext?.baggage || {},
      kind: options.kind || SpanKind.INTERNAL,
      resource: this.resource,
      instrumentationLibrary: this.instrumentationLibrary,
    };

    if (sampled) {
      this.activeSpans.set(spanId, span);
    }

    const context: TraceContext = {
      traceId,
      spanId,
      parentSpanId,
      traceFlags: sampled ? 1 : 0,
      baggage: span.baggage,
      sampled,
    };

    enterpriseLogger.performance(
      'Span started',
      { duration: 0 },
      {
        traceId,
        spanId,
        operationName,
        serviceName: this.resource.serviceName,
        sampled,
      }
    );

    return { span, context };
  }

  /**
   * Finish a span
   */
  finishSpan(
    spanId: string,
    options: {
      endTime?: number;
      status?: SpanStatus;
      error?: Error;
      finalTags?: Record<string, any>;
    } = {}
  ): void {
    const span = this.activeSpans.get(spanId);
    if (!span) {
      return;
    }

    const endTime = options.endTime || performance.now();
    span.endTime = endTime;
    span.duration = endTime - span.startTime;
    span.status = options.status || SpanStatus.OK;

    // Add final tags
    if (options.finalTags) {
      Object.assign(span.tags, options.finalTags);
    }

    // Handle errors
    if (options.error) {
      span.status = SpanStatus.ERROR;
      span.tags['error'] = true;
      span.tags['error.type'] = options.error.constructor.name;
      span.tags['error.message'] = options.error.message;
      
      this.addSpanEvent(spanId, 'exception', {
        'exception.type': options.error.constructor.name,
        'exception.message': options.error.message,
        'exception.stacktrace': options.error.stack,
      });
    }

    // Remove from active spans
    this.activeSpans.delete(spanId);
    this.completedSpans.push(span);

    // Export span
    this.exportSpan(span);

    // Collect performance metrics
    this.collectSpanMetrics(span);

    // Check for performance regressions
    this.checkPerformanceRegression(span);

    enterpriseLogger.performance(
      'Span finished',
      {
        duration: span.duration!,
      },
      {
        traceId: span.traceId,
        spanId: span.spanId,
        operationName: span.operationName,
        status: span.status,
        duration: span.duration,
      }
    );

    // Keep only recent completed spans in memory
    if (this.completedSpans.length > 10000) {
      this.completedSpans = this.completedSpans.slice(-5000);
    }
  }

  /**
   * Add a log to a span
   */
  addSpanLog(spanId: string, fields: Record<string, any>): void {
    const span = this.activeSpans.get(spanId);
    if (!span) return;

    span.logs.push({
      timestamp: performance.now(),
      fields,
    });
  }

  /**
   * Add an event to a span
   */
  addSpanEvent(spanId: string, name: string, attributes: Record<string, any> = {}): void {
    const span = this.activeSpans.get(spanId);
    if (!span) return;

    span.events.push({
      name,
      timestamp: performance.now(),
      attributes,
    });
  }

  /**
   * Set span tags
   */
  setSpanTags(spanId: string, tags: Record<string, any>): void {
    const span = this.activeSpans.get(spanId);
    if (!span) return;

    Object.assign(span.tags, tags);
  }

  /**
   * Add baggage to span
   */
  setBaggage(spanId: string, key: string, value: string): void {
    const span = this.activeSpans.get(spanId);
    if (!span) return;

    span.baggage[key] = value;
  }

  /**
   * Get current trace context
   */
  getCurrentContext(spanId?: string): TraceContext | null {
    if (spanId) {
      const span = this.activeSpans.get(spanId);
      if (span) {
        return {
          traceId: span.traceId,
          spanId: span.spanId,
          parentSpanId: span.parentSpanId,
          traceFlags: 1,
          baggage: span.baggage,
          sampled: true,
        };
      }
    }

    // Return the most recent active span
    const activeSpans = Array.from(this.activeSpans.values());
    if (activeSpans.length > 0) {
      const span = activeSpans[activeSpans.length - 1];
      return {
        traceId: span.traceId,
        spanId: span.spanId,
        parentSpanId: span.parentSpanId,
        traceFlags: 1,
        baggage: span.baggage,
        sampled: true,
      };
    }

    return null;
  }

  /**
   * Get trace by ID
   */
  getTrace(traceId: string): Span[] {
    return this.completedSpans.filter(span => span.traceId === traceId);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(timeWindow: number = 3600000): PerformanceMetric[] {
    const cutoff = Date.now() - timeWindow;
    return this.metrics.filter(metric => metric.timestamp > cutoff);
  }

  /**
   * Get service map
   */
  getServiceMap(): ServiceMap {
    const services = new Set<string>();
    const dependencies = new Map<string, ServiceDependency>();
    const errorRates: Record<string, number> = {};
    const latencies: Record<string, number> = {};
    const throughput: Record<string, number> = {};

    for (const span of this.completedSpans.slice(-1000)) {
      services.add(span.serviceName);

      // Calculate error rates
      const errorKey = span.serviceName;
      if (!errorRates[errorKey]) errorRates[errorKey] = 0;
      if (span.status === SpanStatus.ERROR) {
        errorRates[errorKey]++;
      }

      // Calculate latencies
      if (span.duration) {
        if (!latencies[span.serviceName]) latencies[span.serviceName] = 0;
        latencies[span.serviceName] += span.duration;
      }

      // Calculate throughput
      if (!throughput[span.serviceName]) throughput[span.serviceName] = 0;
      throughput[span.serviceName]++;

      // Identify dependencies
      if (span.parentSpanId) {
        const parentSpan = this.completedSpans.find(s => s.spanId === span.parentSpanId);
        if (parentSpan && parentSpan.serviceName !== span.serviceName) {
          const depKey = `${parentSpan.serviceName}->${span.serviceName}`;
          if (!dependencies.has(depKey)) {
            dependencies.set(depKey, {
              from: parentSpan.serviceName,
              to: span.serviceName,
              type: this.inferDependencyType(span),
              latency: 0,
              errorRate: 0,
              throughput: 0,
            });
          }
        }
      }
    }

    // Convert to percentages and averages
    for (const service of services) {
      const totalRequests = throughput[service] || 1;
      errorRates[service] = (errorRates[service] || 0) / totalRequests * 100;
      latencies[service] = (latencies[service] || 0) / totalRequests;
    }

    return {
      services: Array.from(services).map(name => ({
        name,
        type: 'service',
        version: this.resource.serviceVersion,
        environment: this.resource.environment,
        health: errorRates[name] > 5 ? 'unhealthy' : errorRates[name] > 1 ? 'degraded' : 'healthy',
        instances: 1,
        endpoints: this.getServiceEndpoints(name),
      })),
      dependencies: Array.from(dependencies.values()),
      errorRates,
      latencies,
      throughput,
    };
  }

  /**
   * Record custom metric
   */
  recordMetric(
    name: string,
    value: number,
    unit: string,
    type: 'counter' | 'gauge' | 'histogram' | 'summary',
    tags: Record<string, string> = {}
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      tags: {
        service: this.resource.serviceName,
        environment: this.resource.environment,
        ...tags,
      },
      type,
    };

    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > 100000) {
      this.metrics = this.metrics.slice(-50000);
    }
  }

  /**
   * Add trace exporter
   */
  addExporter(exporter: TraceExporter): void {
    this.exporters.push(exporter);
  }

  /**
   * Shutdown tracer
   */
  async shutdown(): Promise<void> {
    // Export remaining spans
    for (const span of this.activeSpans.values()) {
      this.finishSpan(span.spanId, { status: SpanStatus.ERROR });
    }

    // Shutdown exporters
    await Promise.all(this.exporters.map(exporter => exporter.shutdown()));

    enterpriseLogger.info('Distributed tracer shutdown completed');
  }

  // Private methods
  private generateTraceId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private generateSpanId(): string {
    return crypto.randomBytes(8).toString('hex');
  }

  private shouldSample(traceId: string, operationName: string): boolean {
    switch (this.samplingStrategy.type) {
      case 'probabilistic':
        const rate = this.samplingStrategy.config.rate || 0.1;
        return Math.random() < rate;
      
      case 'rate_limiting':
        // Implement rate limiting logic
        return true; // Simplified
      
      case 'adaptive':
        // Implement adaptive sampling based on service load
        return true; // Simplified
      
      default:
        return true;
    }
  }

  private exportSpan(span: Span): void {
    for (const exporter of this.exporters) {
      try {
        exporter.export([span]);
      } catch (error) {
        enterpriseLogger.error(
          'Failed to export span',
          error as Error,
          { spanId: span.spanId, exporter: exporter.constructor.name }
        );
      }
    }
  }

  private collectSpanMetrics(span: Span): void {
    // Record response time
    this.recordMetric(
      'span.duration',
      span.duration!,
      'milliseconds',
      'histogram',
      {
        operation: span.operationName,
        service: span.serviceName,
        status: span.status,
        kind: span.kind,
      }
    );

    // Record request count
    this.recordMetric(
      'span.requests',
      1,
      'count',
      'counter',
      {
        operation: span.operationName,
        service: span.serviceName,
        status: span.status,
        kind: span.kind,
      }
    );

    // Record error count
    if (span.status === SpanStatus.ERROR) {
      this.recordMetric(
        'span.errors',
        1,
        'count',
        'counter',
        {
          operation: span.operationName,
          service: span.serviceName,
          kind: span.kind,
        }
      );
    }
  }

  private checkPerformanceRegression(span: Span): void {
    const key = `${span.serviceName}.${span.operationName}`;
    const baseline = this.performanceBaselines.get(key);
    
    if (baseline && span.duration) {
      const degradationThreshold = baseline.baseline.p95 * 1.5; // 50% slower than p95
      
      if (span.duration > degradationThreshold) {
        enterpriseAlertingSystem.createAlert({
          title: 'Performance Regression Detected',
          description: `Operation ${span.operationName} is significantly slower than baseline`,
          severity: 'warning',
          source: 'performance',
          category: 'latency',
          tags: ['performance', 'regression', 'latency'],
          correlationId: span.traceId,
          metadata: {
            operationName: span.operationName,
            serviceName: span.serviceName,
            currentDuration: span.duration,
            baselineP95: baseline.baseline.p95,
            degradationPercent: ((span.duration - baseline.baseline.p95) / baseline.baseline.p95) * 100,
          },
        });
      }
    }
  }

  private inferDependencyType(span: Span): 'http' | 'grpc' | 'database' | 'queue' | 'cache' {
    const operation = span.operationName.toLowerCase();
    
    if (operation.includes('http') || operation.includes('api')) return 'http';
    if (operation.includes('grpc')) return 'grpc';
    if (operation.includes('db') || operation.includes('sql') || operation.includes('query')) return 'database';
    if (operation.includes('queue') || operation.includes('message')) return 'queue';
    if (operation.includes('cache') || operation.includes('redis')) return 'cache';
    
    return 'http'; // Default
  }

  private getServiceEndpoints(serviceName: string): string[] {
    const endpoints = new Set<string>();
    
    for (const span of this.completedSpans.slice(-1000)) {
      if (span.serviceName === serviceName && span.tags['http.route']) {
        endpoints.add(span.tags['http.route']);
      }
    }
    
    return Array.from(endpoints);
  }

  private initializeExporters(): void {
    // Add console exporter for development
    if (process.env.NODE_ENV === 'development') {
      this.addExporter(new ConsoleTraceExporter());
    }

    // Add OTLP exporter for production
    if (process.env.OTLP_ENDPOINT) {
      this.addExporter(new OTLPTraceExporter({
        endpoint: process.env.OTLP_ENDPOINT,
        headers: {
          'x-api-key': process.env.OTLP_API_KEY || '',
        },
      }));
    }

    // Add Jaeger exporter
    if (process.env.JAEGER_ENDPOINT) {
      this.addExporter(new JaegerTraceExporter({
        endpoint: process.env.JAEGER_ENDPOINT,
      }));
    }
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      this.collectSystemMetrics();
    }, 60000); // Every minute
  }

  private collectSystemMetrics(): void {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Memory metrics
    this.recordMetric('system.memory.heap_used', memoryUsage.heapUsed, 'bytes', 'gauge');
    this.recordMetric('system.memory.heap_total', memoryUsage.heapTotal, 'bytes', 'gauge');
    this.recordMetric('system.memory.rss', memoryUsage.rss, 'bytes', 'gauge');

    // CPU metrics
    this.recordMetric('system.cpu.user', cpuUsage.user / 1000000, 'milliseconds', 'counter');
    this.recordMetric('system.cpu.system', cpuUsage.system / 1000000, 'milliseconds', 'counter');

    // Active spans count
    this.recordMetric('tracer.active_spans', this.activeSpans.size, 'count', 'gauge');
  }

  private loadPerformanceBaselines(): void {
    // In a real implementation, this would load from a database or configuration
    // For now, we'll just initialize empty baselines
    enterpriseLogger.info('Performance baselines loaded', { count: this.performanceBaselines.size });
  }
}

// Trace exporters
export abstract class TraceExporter {
  abstract export(spans: Span[]): Promise<void>;
  abstract shutdown(): Promise<void>;
}

export class ConsoleTraceExporter extends TraceExporter {
  async export(spans: Span[]): Promise<void> {
    for (const span of spans) {
      console.log('Trace:', {
        traceId: span.traceId,
        spanId: span.spanId,
        operation: span.operationName,
        duration: span.duration,
        status: span.status,
      });
    }
  }

  async shutdown(): Promise<void> {
    // Nothing to shutdown for console exporter
  }
}

export class OTLPTraceExporter extends TraceExporter {
  constructor(private config: { endpoint: string; headers?: Record<string, string> }) {
    super();
  }

  async export(spans: Span[]): Promise<void> {
    try {
      const payload = this.formatOTLPPayload(spans);
      
      await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      enterpriseLogger.error('OTLP export failed', error as Error);
    }
  }

  private formatOTLPPayload(spans: Span[]): any {
    // Convert spans to OTLP format
    return {
      resourceSpans: [
        {
          resource: {
            attributes: spans[0]?.resource.attributes || {},
          },
          scopeSpans: [
            {
              scope: {
                name: spans[0]?.instrumentationLibrary.name || '',
                version: spans[0]?.instrumentationLibrary.version || '',
              },
              spans: spans.map(span => ({
                traceId: span.traceId,
                spanId: span.spanId,
                parentSpanId: span.parentSpanId,
                name: span.operationName,
                kind: span.kind,
                startTimeUnixNano: span.startTime * 1000000,
                endTimeUnixNano: (span.endTime || 0) * 1000000,
                attributes: Object.entries(span.tags).map(([key, value]) => ({
                  key,
                  value: { stringValue: String(value) },
                })),
                status: {
                  code: span.status === SpanStatus.ERROR ? 2 : 1,
                },
                events: span.events.map(event => ({
                  name: event.name,
                  timeUnixNano: event.timestamp * 1000000,
                  attributes: Object.entries(event.attributes).map(([key, value]) => ({
                    key,
                    value: { stringValue: String(value) },
                  })),
                })),
              })),
            },
          ],
        },
      ],
    };
  }

  async shutdown(): Promise<void> {
    // Flush remaining data if needed
  }
}

export class JaegerTraceExporter extends TraceExporter {
  constructor(private config: { endpoint: string }) {
    super();
  }

  async export(spans: Span[]): Promise<void> {
    try {
      const payload = this.formatJaegerPayload(spans);
      
      await fetch(`${this.config.endpoint}/api/traces`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      enterpriseLogger.error('Jaeger export failed', error as Error);
    }
  }

  private formatJaegerPayload(spans: Span[]): any {
    // Convert spans to Jaeger format
    const spansByTrace = new Map<string, Span[]>();
    
    for (const span of spans) {
      if (!spansByTrace.has(span.traceId)) {
        spansByTrace.set(span.traceId, []);
      }
      spansByTrace.get(span.traceId)!.push(span);
    }

    const data: any[] = [];
    
    for (const [traceId, traceSpans] of spansByTrace.entries()) {
      data.push({
        traceID: traceId,
        spans: traceSpans.map(span => ({
          traceID: span.traceId,
          spanID: span.spanId,
          parentSpanID: span.parentSpanId,
          operationName: span.operationName,
          startTime: span.startTime * 1000, // Jaeger expects microseconds
          duration: (span.duration || 0) * 1000,
          tags: Object.entries(span.tags).map(([key, value]) => ({
            key,
            type: 'string',
            value: String(value),
          })),
          process: {
            serviceName: span.serviceName,
            tags: Object.entries(span.resource.attributes).map(([key, value]) => ({
              key,
              type: 'string',
              value: String(value),
            })),
          },
          logs: span.logs.map(log => ({
            timestamp: log.timestamp * 1000,
            fields: Object.entries(log.fields).map(([key, value]) => ({
              key,
              value: String(value),
            })),
          })),
        })),
      });
    }

    return { data };
  }

  async shutdown(): Promise<void> {
    // Flush remaining data if needed
  }
}

// Export singleton instance
export const distributedTracer = new DistributedTracer({
  serviceName: process.env.SERVICE_NAME || 'contentlab-nexus',
  serviceVersion: process.env.npm_package_version || '1.0.0',
  environment: process.env.NODE_ENV || 'production',
  samplingStrategy: {
    type: 'probabilistic',
    config: { rate: parseFloat(process.env.TRACE_SAMPLE_RATE || '0.1') },
  },
});

// Global access
if (typeof globalThis !== 'undefined') {
  globalThis.DistributedTracer = distributedTracer;
}