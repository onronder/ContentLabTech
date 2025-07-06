/**
 * Structured Logging Infrastructure
 * Comprehensive logging system with security and performance considerations
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  traceId?: string;
  stack?: string;
  tags?: string[];
  source?: string;
  correlationId?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  bufferSize: number;
  flushInterval: number;
  maxRetries: number;
  enableSanitization: boolean;
  sensitiveFields: string[];
  maxLogSize: number;
}

export interface LogQuery {
  level?: LogLevel;
  startTime?: Date;
  endTime?: Date;
  userId?: string;
  tags?: string[];
  search?: string;
  limit?: number;
  offset?: number;
}

export class Logger {
  private config: LoggerConfig;
  private buffer: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;
  private retryCount = 0;
  private isShuttingDown = false;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableRemote: false,
      bufferSize: 100,
      flushInterval: 5000, // 5 seconds
      maxRetries: 3,
      enableSanitization: true,
      sensitiveFields: [
        'password',
        'token',
        'apiKey',
        'secret',
        'authorization',
        'cookie',
        'session',
        'ssn',
        'creditCard',
        'bankAccount',
      ],
      maxLogSize: 10000, // 10KB per log entry
      ...config,
    };

    if (this.config.enableRemote) {
      this.startFlushTimer();
    }
  }

  debug(message: string, context?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.DEBUG, message, context, tags);
  }

  info(message: string, context?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.INFO, message, context, tags);
  }

  warn(message: string, context?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.WARN, message, context, tags);
  }

  error(message: string, error?: Error, context?: Record<string, any>, tags?: string[]): void {
    const logContext = {
      ...context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause,
      } : undefined,
    };

    this.log(LogLevel.ERROR, message, logContext, tags, error?.stack);
  }

  critical(message: string, error?: Error, context?: Record<string, any>, tags?: string[]): void {
    const logContext = {
      ...context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause,
      } : undefined,
    };

    this.log(LogLevel.CRITICAL, message, logContext, tags, error?.stack);
  }

  // Structured logging methods
  http(request: {
    method: string;
    url: string;
    status: number;
    responseTime: number;
    userAgent?: string;
    ip?: string;
    userId?: string;
  }): void {
    this.info('HTTP Request', {
      type: 'http',
      method: request.method,
      url: request.url,
      status: request.status,
      responseTime: request.responseTime,
      userAgent: request.userAgent,
      ip: request.ip,
      userId: request.userId,
    }, ['http', 'request']);
  }

  security(event: {
    type: 'auth' | 'access' | 'suspicious' | 'attack';
    action: string;
    userId?: string;
    ip?: string;
    details?: Record<string, any>;
  }): void {
    const level = event.type === 'attack' || event.type === 'suspicious' ? LogLevel.CRITICAL : LogLevel.WARN;
    
    this.log(level, `Security Event: ${event.action}`, {
      type: 'security',
      eventType: event.type,
      action: event.action,
      userId: event.userId,
      ip: event.ip,
      ...event.details,
    }, ['security', event.type]);
  }

  performance(metric: {
    operation: string;
    duration: number;
    success: boolean;
    details?: Record<string, any>;
  }): void {
    const level = metric.duration > 5000 ? LogLevel.WARN : LogLevel.INFO;
    
    this.log(level, `Performance: ${metric.operation}`, {
      type: 'performance',
      operation: metric.operation,
      duration: metric.duration,
      success: metric.success,
      ...metric.details,
    }, ['performance']);
  }

  business(event: {
    type: string;
    action: string;
    userId?: string;
    details?: Record<string, any>;
  }): void {
    this.info(`Business Event: ${event.action}`, {
      type: 'business',
      eventType: event.type,
      action: event.action,
      userId: event.userId,
      ...event.details,
    }, ['business', event.type]);
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    tags?: string[],
    stack?: string
  ): void {
    if (level < this.config.level || this.isShuttingDown) {
      return;
    }

    // Sanitize message and context
    const sanitizedMessage = this.config.enableSanitization 
      ? this.sanitizeString(message)
      : message;
    
    const sanitizedContext = this.config.enableSanitization && context
      ? this.sanitizeObject(context)
      : context;

    const entry: LogEntry = {
      level,
      message: sanitizedMessage,
      timestamp: new Date().toISOString(),
      context: sanitizedContext,
      tags: tags ? [...new Set(tags)] : undefined, // Remove duplicates
      stack: stack ? this.sanitizeString(stack) : undefined,
      source: this.getCallerInfo(),
    };

    // Check log size
    const entrySize = JSON.stringify(entry).length;
    if (entrySize > this.config.maxLogSize) {
      entry.message = `${entry.message.substring(0, 100)}... [TRUNCATED: ${entrySize} bytes]`;
      entry.context = { truncated: true, originalSize: entrySize };
    }

    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    if (this.config.enableRemote) {
      this.buffer.push(entry);
      
      if (this.buffer.length >= this.config.bufferSize) {
        this.flush();
      }
    }
  }

  private logToConsole(entry: LogEntry): void {
    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'];
    const levelName = levelNames[entry.level];
    const timestamp = new Date(entry.timestamp).toISOString();
    
    const logMessage = `[${timestamp}] ${levelName}: ${entry.message}`;
    const logData = {
      ...entry.context,
      tags: entry.tags,
      source: entry.source,
    };
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(logMessage, logData);
        break;
      case LogLevel.INFO:
        console.info(logMessage, logData);
        break;
      case LogLevel.WARN:
        console.warn(logMessage, logData);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(logMessage, logData);
        if (entry.stack) {
          console.error('Stack trace:', entry.stack);
        }
        break;
    }
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0 || !this.config.remoteEndpoint) {
      return;
    }

    const entries = [...this.buffer];
    this.buffer = [];

    try {
      const response = await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Log-Batch-Size': entries.length.toString(),
          'X-Log-Timestamp': new Date().toISOString(),
        },
        body: JSON.stringify({ 
          entries,
          metadata: {
            service: 'contentlab-nexus',
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV,
            hostname: process.env.HOSTNAME,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Remote logging failed: ${response.status} ${response.statusText}`);
      }

      this.retryCount = 0;
    } catch (error) {
      console.error('Failed to send logs to remote endpoint:', error);
      
      // Re-add entries to buffer for retry if we haven't exceeded max retries
      if (this.retryCount < this.config.maxRetries) {
        this.buffer.unshift(...entries);
        this.retryCount++;
        
        // Exponential backoff for retries
        setTimeout(() => this.flush(), Math.pow(2, this.retryCount) * 1000);
      } else {
        console.error(`Max retries (${this.config.maxRetries}) exceeded, dropping ${entries.length} log entries`);
        this.retryCount = 0;
      }
    }
  }

  private sanitizeString(str: string): string {
    // Remove potential script injection
    let sanitized = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '[SCRIPT_REMOVED]');
    
    // Remove potential SQL injection patterns
    sanitized = sanitized.replace(/('|(\\x27)|(\\x2D))+/gi, '[QUOTE_REMOVED]');
    
    // Replace potential sensitive patterns
    this.config.sensitiveFields.forEach(field => {
      const regex = new RegExp(`"${field}"\\s*:\\s*"[^"]*"`, 'gi');
      sanitized = sanitized.replace(regex, `"${field}":"[REDACTED]"`);
    });

    return sanitized;
  }

  private sanitizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return typeof obj === 'string' ? this.sanitizeString(obj) : obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (this.config.sensitiveFields.some(field => 
        key.toLowerCase().includes(field.toLowerCase())
      )) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = this.sanitizeObject(value);
      }
    }

    return sanitized;
  }

  private getCallerInfo(): string {
    const stack = new Error().stack;
    if (!stack) return 'unknown';

    const lines = stack.split('\n');
    // Skip the first few lines to get to the actual caller
    const callerLine = lines[4] || lines[3] || 'unknown';
    
    // Extract file and line info
    const match = callerLine.match(/\((.+):(\d+):(\d+)\)/) || callerLine.match(/at (.+):(\d+):(\d+)/);
    if (match) {
      const [, file, line] = match;
      const fileName = file.split('/').pop() || file;
      return `${fileName}:${line}`;
    }

    return 'unknown';
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  // Query logs (for in-memory logs or when implementing log storage)
  queryLogs(query: LogQuery): LogEntry[] {
    // This is a placeholder implementation
    // In a real system, you would query your log storage system
    return [];
  }

  // Get log statistics
  getLogStats(): {
    totalLogs: number;
    logsByLevel: Record<string, number>;
    recentErrors: LogEntry[];
    topTags: Array<{ tag: string; count: number }>;
  } {
    // This would be implemented with actual log storage
    return {
      totalLogs: 0,
      logsByLevel: {},
      recentErrors: [],
      topTags: [],
    };
  }

  // Configuration management
  updateConfig(newConfig: Partial<LoggerConfig>): void {
    const oldRemoteEnabled = this.config.enableRemote;
    this.config = { ...this.config, ...newConfig };

    // Handle remote logging state changes
    if (this.config.enableRemote && !oldRemoteEnabled) {
      this.startFlushTimer();
    } else if (!this.config.enableRemote && oldRemoteEnabled) {
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
        this.flushTimer = undefined;
      }
    }
  }

  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // Final flush
    await this.flush();
  }
}

// Global logger instance
export const logger = new Logger({
  level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  enableConsole: true,
  enableRemote: process.env.NODE_ENV === 'production',
  remoteEndpoint: process.env.LOG_ENDPOINT,
  sensitiveFields: [
    'password',
    'token',
    'apiKey',
    'secret',
    'authorization',
    'cookie',
    'session',
    'ssn',
    'creditCard',
    'bankAccount',
    'email', // Optionally include email for GDPR compliance
  ],
});

// Convenience logging functions
export const log = {
  debug: (message: string, context?: Record<string, any>, tags?: string[]) => 
    logger.debug(message, context, tags),
  info: (message: string, context?: Record<string, any>, tags?: string[]) => 
    logger.info(message, context, tags),
  warn: (message: string, context?: Record<string, any>, tags?: string[]) => 
    logger.warn(message, context, tags),
  error: (message: string, error?: Error, context?: Record<string, any>, tags?: string[]) => 
    logger.error(message, error, context, tags),
  critical: (message: string, error?: Error, context?: Record<string, any>, tags?: string[]) => 
    logger.critical(message, error, context, tags),
  http: (request: Parameters<typeof logger.http>[0]) => logger.http(request),
  security: (event: Parameters<typeof logger.security>[0]) => logger.security(event),
  performance: (metric: Parameters<typeof logger.performance>[0]) => logger.performance(metric),
  business: (event: Parameters<typeof logger.business>[0]) => logger.business(event),
};