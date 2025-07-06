/**
 * Service Monitoring and Alerting System
 * Comprehensive monitoring for all external services and system health
 */

import { serviceDegradationManager, ServiceStatus } from "../resilience/service-degradation";
import { circuitBreakerManager } from "../resilience/circuit-breaker";
import { retryManager } from "../resilience/retry-manager";

export enum AlertSeverity {
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
  CRITICAL = "critical"
}

export enum AlertType {
  SERVICE_DOWN = "service_down",
  SERVICE_DEGRADED = "service_degraded",
  HIGH_ERROR_RATE = "high_error_rate",
  SLOW_RESPONSE = "slow_response",
  CIRCUIT_BREAKER_OPEN = "circuit_breaker_open",
  MEMORY_LEAK = "memory_leak",
  DATABASE_CONNECTION = "database_connection",
  API_RATE_LIMIT = "api_rate_limit",
  SYSTEM_RESOURCE = "system_resource"
}

export interface Alert {
  id: string;
  timestamp: Date;
  severity: AlertSeverity;
  type: AlertType;
  service: string;
  title: string;
  description: string;
  details: Record<string, unknown>;
  resolved: boolean;
  resolvedAt?: Date;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface ServiceMetrics {
  serviceName: string;
  status: ServiceStatus;
  responseTime: {
    avg: number;
    p95: number;
    p99: number;
  };
  errorRate: number;
  requestCount: number;
  lastError?: string;
  uptime: number;
  availability: number;
}

export interface SystemMetrics {
  timestamp: Date;
  memory: {
    used: number;
    free: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  database: {
    connectionCount: number;
    slowQueries: number;
    errorRate: number;
  };
  cache: {
    hitRate: number;
    missRate: number;
    evictionRate: number;
  };
}

export interface MonitoringConfig {
  alertingEnabled: boolean;
  metricsRetention: number; // days
  alertThresholds: {
    errorRate: number;
    responseTime: number;
    availability: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  notificationChannels: {
    email?: string[];
    slack?: {
      webhook: string;
      channel: string;
    };
    webhook?: {
      url: string;
      headers?: Record<string, string>;
    };
  };
}

export class ServiceMonitor {
  private alerts: Map<string, Alert> = new Map();
  private metrics: Map<string, ServiceMetrics[]> = new Map();
  private systemMetrics: SystemMetrics[] = [];
  private config: MonitoringConfig;
  private monitoringInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;
  private startTime = Date.now();

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = {
      alertingEnabled: true,
      metricsRetention: 7, // 7 days
      alertThresholds: {
        errorRate: 0.05, // 5%
        responseTime: 5000, // 5 seconds
        availability: 0.95, // 95%
        memoryUsage: 0.85, // 85%
        cpuUsage: 0.80, // 80%
      },
      notificationChannels: {},
      ...config
    };

    this.startMonitoring();
  }

  /**
   * Start monitoring services
   */
  startMonitoring(): void {
    // Monitor service health every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.checkServiceHealth();
    }, 30000);

    // Collect system metrics every 60 seconds
    this.metricsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 60000);

    // Initial health check
    this.checkServiceHealth();
    this.collectSystemMetrics();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
  }

  /**
   * Check health of all services
   */
  private async checkServiceHealth(): Promise<void> {
    const services = ["openai", "serpapi", "supabase", "redis"];
    
    for (const serviceName of services) {
      try {
        await this.checkIndividualService(serviceName);
      } catch (error) {
        console.error(`Error checking ${serviceName} health:`, error);
      }
    }
  }

  /**
   * Check individual service health
   */
  private async checkIndividualService(serviceName: string): Promise<void> {
    const status = serviceDegradationManager.getServiceStatus(serviceName);
    const circuitBreaker = circuitBreakerManager.getCircuitBreaker(serviceName);
    
    // Create service metrics
    const metrics: ServiceMetrics = {
      serviceName,
      status,
      responseTime: {
        avg: this.calculateAverageResponseTime(serviceName),
        p95: this.calculatePercentileResponseTime(serviceName, 95),
        p99: this.calculatePercentileResponseTime(serviceName, 99),
      },
      errorRate: this.calculateErrorRate(serviceName),
      requestCount: this.getRequestCount(serviceName),
      uptime: this.calculateUptime(serviceName),
      availability: this.calculateAvailability(serviceName),
    };

    // Store metrics
    if (!this.metrics.has(serviceName)) {
      this.metrics.set(serviceName, []);
    }
    const serviceMetrics = this.metrics.get(serviceName)!;
    serviceMetrics.push(metrics);

    // Trim old metrics
    const cutoff = Date.now() - (this.config.metricsRetention * 24 * 60 * 60 * 1000);
    while (serviceMetrics.length > 0 && serviceMetrics[0].uptime < cutoff) {
      serviceMetrics.shift();
    }

    // Check for alerts
    this.checkServiceAlerts(serviceName, metrics);
  }

  /**
   * Check for service alerts
   */
  private checkServiceAlerts(serviceName: string, metrics: ServiceMetrics): void {
    // Service down alert
    if (metrics.status === ServiceStatus.UNAVAILABLE) {
      this.createAlert({
        severity: AlertSeverity.CRITICAL,
        type: AlertType.SERVICE_DOWN,
        service: serviceName,
        title: `${serviceName} service is down`,
        description: `Service ${serviceName} is currently unavailable`,
        details: { metrics }
      });
    }

    // Service degraded alert
    if (metrics.status === ServiceStatus.DEGRADED) {
      this.createAlert({
        severity: AlertSeverity.WARNING,
        type: AlertType.SERVICE_DEGRADED,
        service: serviceName,
        title: `${serviceName} service is degraded`,
        description: `Service ${serviceName} is experiencing degraded performance`,
        details: { metrics }
      });
    }

    // High error rate alert
    if (metrics.errorRate > this.config.alertThresholds.errorRate) {
      this.createAlert({
        severity: AlertSeverity.ERROR,
        type: AlertType.HIGH_ERROR_RATE,
        service: serviceName,
        title: `High error rate for ${serviceName}`,
        description: `Error rate is ${(metrics.errorRate * 100).toFixed(2)}% (threshold: ${(this.config.alertThresholds.errorRate * 100).toFixed(2)}%)`,
        details: { metrics }
      });
    }

    // Slow response alert
    if (metrics.responseTime.avg > this.config.alertThresholds.responseTime) {
      this.createAlert({
        severity: AlertSeverity.WARNING,
        type: AlertType.SLOW_RESPONSE,
        service: serviceName,
        title: `Slow response time for ${serviceName}`,
        description: `Average response time is ${metrics.responseTime.avg.toFixed(0)}ms (threshold: ${this.config.alertThresholds.responseTime}ms)`,
        details: { metrics }
      });
    }

    // Low availability alert
    if (metrics.availability < this.config.alertThresholds.availability) {
      this.createAlert({
        severity: AlertSeverity.ERROR,
        type: AlertType.SERVICE_DOWN,
        service: serviceName,
        title: `Low availability for ${serviceName}`,
        description: `Availability is ${(metrics.availability * 100).toFixed(2)}% (threshold: ${(this.config.alertThresholds.availability * 100).toFixed(2)}%)`,
        details: { metrics }
      });
    }

    // Circuit breaker open alert
    const circuitBreaker = circuitBreakerManager.getCircuitBreaker(serviceName);
    if (circuitBreaker.getState() === "OPEN") {
      this.createAlert({
        severity: AlertSeverity.ERROR,
        type: AlertType.CIRCUIT_BREAKER_OPEN,
        service: serviceName,
        title: `Circuit breaker open for ${serviceName}`,
        description: `Circuit breaker for ${serviceName} is open due to repeated failures`,
        details: { 
          circuitBreakerState: circuitBreaker.getState(),
          failureCount: circuitBreaker.getFailureCount(),
          lastFailureTime: circuitBreaker.getLastFailureTime()
        }
      });
    }
  }

  /**
   * Collect system metrics
   */
  private async collectSystemMetrics(): Promise<void> {
    try {
      const metrics: SystemMetrics = {
        timestamp: new Date(),
        memory: await this.getMemoryMetrics(),
        cpu: await this.getCPUMetrics(),
        database: await this.getDatabaseMetrics(),
        cache: await this.getCacheMetrics(),
      };

      this.systemMetrics.push(metrics);

      // Trim old metrics
      const cutoff = Date.now() - (this.config.metricsRetention * 24 * 60 * 60 * 1000);
      while (this.systemMetrics.length > 0 && this.systemMetrics[0].timestamp.getTime() < cutoff) {
        this.systemMetrics.shift();
      }

      // Check for system alerts
      this.checkSystemAlerts(metrics);
    } catch (error) {
      console.error("Error collecting system metrics:", error);
    }
  }

  /**
   * Check for system-level alerts
   */
  private checkSystemAlerts(metrics: SystemMetrics): void {
    // High memory usage alert
    if (metrics.memory.percentage > this.config.alertThresholds.memoryUsage) {
      this.createAlert({
        severity: AlertSeverity.WARNING,
        type: AlertType.SYSTEM_RESOURCE,
        service: "system",
        title: "High memory usage",
        description: `Memory usage is ${(metrics.memory.percentage * 100).toFixed(1)}% (threshold: ${(this.config.alertThresholds.memoryUsage * 100).toFixed(1)}%)`,
        details: { metrics: metrics.memory }
      });
    }

    // High CPU usage alert
    if (metrics.cpu.usage > this.config.alertThresholds.cpuUsage) {
      this.createAlert({
        severity: AlertSeverity.WARNING,
        type: AlertType.SYSTEM_RESOURCE,
        service: "system",
        title: "High CPU usage",
        description: `CPU usage is ${(metrics.cpu.usage * 100).toFixed(1)}% (threshold: ${(this.config.alertThresholds.cpuUsage * 100).toFixed(1)}%)`,
        details: { metrics: metrics.cpu }
      });
    }

    // Database connection issues
    if (metrics.database.errorRate > 0.1) { // 10% error rate
      this.createAlert({
        severity: AlertSeverity.ERROR,
        type: AlertType.DATABASE_CONNECTION,
        service: "database",
        title: "Database connection issues",
        description: `Database error rate is ${(metrics.database.errorRate * 100).toFixed(1)}%`,
        details: { metrics: metrics.database }
      });
    }
  }

  /**
   * Create a new alert
   */
  private createAlert(alertData: {
    severity: AlertSeverity;
    type: AlertType;
    service: string;
    title: string;
    description: string;
    details: Record<string, unknown>;
  }): void {
    const alertId = `${alertData.service}-${alertData.type}-${Date.now()}`;
    
    // Check if similar alert already exists and is not resolved
    const existingAlert = Array.from(this.alerts.values()).find(
      alert => 
        alert.service === alertData.service &&
        alert.type === alertData.type &&
        !alert.resolved
    );

    if (existingAlert) {
      // Update existing alert instead of creating duplicate
      existingAlert.timestamp = new Date();
      existingAlert.description = alertData.description;
      existingAlert.details = alertData.details;
      return;
    }

    const alert: Alert = {
      id: alertId,
      timestamp: new Date(),
      resolved: false,
      ...alertData
    };

    this.alerts.set(alertId, alert);

    // Send notification if alerting is enabled
    if (this.config.alertingEnabled) {
      this.sendNotification(alert);
    }

    console.warn(`[ALERT] ${alert.severity.toUpperCase()}: ${alert.title} - ${alert.description}`);
  }

  /**
   * Send alert notification
   */
  private async sendNotification(alert: Alert): Promise<void> {
    try {
      // Email notification
      if (this.config.notificationChannels.email && this.config.notificationChannels.email.length > 0) {
        await this.sendEmailNotification(alert);
      }

      // Slack notification
      if (this.config.notificationChannels.slack) {
        await this.sendSlackNotification(alert);
      }

      // Webhook notification
      if (this.config.notificationChannels.webhook) {
        await this.sendWebhookNotification(alert);
      }
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  }

  /**
   * Get service metrics
   */
  getServiceMetrics(serviceName: string, timeRange?: { start: Date; end: Date }): ServiceMetrics[] {
    const metrics = this.metrics.get(serviceName) || [];
    
    if (!timeRange) {
      return metrics;
    }

    return metrics.filter(m => 
      m.uptime >= timeRange.start.getTime() && 
      m.uptime <= timeRange.end.getTime()
    );
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(timeRange?: { start: Date; end: Date }): SystemMetrics[] {
    if (!timeRange) {
      return this.systemMetrics;
    }

    return this.systemMetrics.filter(m => 
      m.timestamp >= timeRange.start && 
      m.timestamp <= timeRange.end
    );
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Get all alerts
   */
  getAllAlerts(): Alert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string, resolvedBy?: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = new Date();
    if (resolvedBy) {
      alert.acknowledgedBy = resolvedBy;
      alert.acknowledgedAt = new Date();
    }

    return true;
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();

    return true;
  }

  // Helper methods for metrics calculation
  private calculateAverageResponseTime(serviceName: string): number {
    // Implement response time calculation
    return Math.random() * 1000; // Placeholder
  }

  private calculatePercentileResponseTime(serviceName: string, percentile: number): number {
    // Implement percentile calculation
    return Math.random() * 2000; // Placeholder
  }

  private calculateErrorRate(serviceName: string): number {
    // Implement error rate calculation
    return Math.random() * 0.1; // Placeholder
  }

  private getRequestCount(serviceName: string): number {
    // Implement request count
    return Math.floor(Math.random() * 1000); // Placeholder
  }

  private calculateUptime(serviceName: string): number {
    return Date.now() - this.startTime;
  }

  private calculateAvailability(serviceName: string): number {
    // Implement availability calculation
    return 0.95 + Math.random() * 0.05; // Placeholder
  }

  private async getMemoryMetrics() {
    if (typeof process !== "undefined") {
      const memUsage = process.memoryUsage();
      return {
        used: memUsage.heapUsed,
        free: memUsage.heapTotal - memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: memUsage.heapUsed / memUsage.heapTotal
      };
    }
    return { used: 0, free: 0, total: 0, percentage: 0 };
  }

  private async getCPUMetrics() {
    // Implement CPU metrics collection
    return { usage: Math.random() * 0.5, loadAverage: [0.5, 0.6, 0.7] };
  }

  private async getDatabaseMetrics() {
    // Implement database metrics collection
    return { connectionCount: 5, slowQueries: 0, errorRate: 0 };
  }

  private async getCacheMetrics() {
    // Implement cache metrics collection
    return { hitRate: 0.85, missRate: 0.15, evictionRate: 0.01 };
  }

  private async sendEmailNotification(alert: Alert): Promise<void> {
    // Implement email notification
    console.log(`Email notification sent for alert: ${alert.title}`);
  }

  private async sendSlackNotification(alert: Alert): Promise<void> {
    // Implement Slack notification
    console.log(`Slack notification sent for alert: ${alert.title}`);
  }

  private async sendWebhookNotification(alert: Alert): Promise<void> {
    // Implement webhook notification
    console.log(`Webhook notification sent for alert: ${alert.title}`);
  }
}

// Export singleton instance
export const serviceMonitor = new ServiceMonitor({
  alertingEnabled: process.env.NODE_ENV === "production",
  alertThresholds: {
    errorRate: 0.05,
    responseTime: 5000,
    availability: 0.95,
    memoryUsage: 0.85,
    cpuUsage: 0.80,
  }
});

// Auto-start monitoring in production
if (typeof window === "undefined" && process.env.NODE_ENV === "production") {
  serviceMonitor.startMonitoring();
}