/**
 * Enterprise Database Connection Pool Manager
 * Implements connection pooling, health monitoring, and failover for production scale
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

interface ConnectionPoolConfig {
  minConnections: number;
  maxConnections: number;
  idleTimeout: number;
  connectionTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  healthCheckInterval: number;
}

interface ConnectionMetrics {
  activeConnections: number;
  idleConnections: number;
  totalConnections: number;
  totalQueries: number;
  failedConnections: number;
  averageQueryTime: number;
  lastHealthCheck: Date;
  poolStatus: 'healthy' | 'degraded' | 'critical';
}

interface PooledConnection {
  id: string;
  client: SupabaseClient<Database>;
  isActive: boolean;
  lastUsed: Date;
  createdAt: Date;
  queryCount: number;
  totalQueryTime: number;
}

class DatabaseConnectionPool {
  private static instance: DatabaseConnectionPool;
  private connections: Map<string, PooledConnection> = new Map();
  private config: ConnectionPoolConfig;
  private metrics: ConnectionMetrics;
  private healthCheckTimer?: NodeJS.Timeout;
  private isShuttingDown = false;

  private constructor() {
    this.config = {
      minConnections: parseInt(process.env.DB_POOL_MIN_CONNECTIONS || "5"),
      maxConnections: parseInt(process.env.DB_POOL_MAX_CONNECTIONS || "20"),
      idleTimeout: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || "300000"), // 5 minutes
      connectionTimeout: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || "10000"), // 10 seconds
      retryAttempts: parseInt(process.env.DB_POOL_RETRY_ATTEMPTS || "3"),
      retryDelay: parseInt(process.env.DB_POOL_RETRY_DELAY || "1000"), // 1 second
      healthCheckInterval: parseInt(process.env.DB_POOL_HEALTH_CHECK_INTERVAL || "30000"), // 30 seconds
    };

    this.metrics = {
      activeConnections: 0,
      idleConnections: 0,
      totalConnections: 0,
      totalQueries: 0,
      failedConnections: 0,
      averageQueryTime: 0,
      lastHealthCheck: new Date(),
      poolStatus: 'healthy'
    };

    this.initialize();
  }

  public static getInstance(): DatabaseConnectionPool {
    if (!DatabaseConnectionPool.instance) {
      DatabaseConnectionPool.instance = new DatabaseConnectionPool();
    }
    return DatabaseConnectionPool.instance;
  }

  private async initialize(): Promise<void> {
    console.log("🏊‍♂️ Initializing database connection pool...", {
      config: this.config,
      timestamp: new Date().toISOString()
    });

    // Create minimum connections
    for (let i = 0; i < this.config.minConnections; i++) {
      await this.createConnection();
    }

    // Start health monitoring
    this.startHealthCheck();

    // Setup graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());

    console.log("✅ Database connection pool initialized", {
      initialConnections: this.connections.size,
      config: this.config
    });
  }

  private async createConnection(): Promise<PooledConnection> {
    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const client = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
          global: {
            headers: {
              'X-Client-Info': `contentlab-nexus-pool-${connectionId}`,
              'X-Pool-Connection-Id': connectionId,
            },
          },
          db: {
            schema: 'public',
          },
          realtime: {
            enabled: false, // Disable realtime for pooled connections
          },
        }
      );

      const connection: PooledConnection = {
        id: connectionId,
        client,
        isActive: false,
        lastUsed: new Date(),
        createdAt: new Date(),
        queryCount: 0,
        totalQueryTime: 0,
      };

      // Test connection
      await this.testConnection(client);

      this.connections.set(connectionId, connection);
      this.updateMetrics();

      console.log("✅ Created new database connection", {
        connectionId,
        totalConnections: this.connections.size
      });

      return connection;
    } catch (error) {
      this.metrics.failedConnections++;
      console.error("❌ Failed to create database connection", {
        connectionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  private async testConnection(client: SupabaseClient<Database>): Promise<void> {
    try {
      const { error } = await client.from('teams').select('id').limit(1);
      if (error) {
        throw new Error(`Connection test failed: ${error.message}`);
      }
    } catch (error) {
      throw new Error(`Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async getConnection(): Promise<PooledConnection> {
    if (this.isShuttingDown) {
      throw new Error("Connection pool is shutting down");
    }

    // Find available idle connection
    for (const [id, connection] of this.connections) {
      if (!connection.isActive) {
        connection.isActive = true;
        connection.lastUsed = new Date();
        this.updateMetrics();
        return connection;
      }
    }

    // Create new connection if under max limit
    if (this.connections.size < this.config.maxConnections) {
      const connection = await this.createConnection();
      connection.isActive = true;
      this.updateMetrics();
      return connection;
    }

    // Wait for available connection with timeout
    return this.waitForConnection();
  }

  private async waitForConnection(): Promise<PooledConnection> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < this.config.connectionTimeout) {
      for (const [id, connection] of this.connections) {
        if (!connection.isActive) {
          connection.isActive = true;
          connection.lastUsed = new Date();
          this.updateMetrics();
          return connection;
        }
      }
      
      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error("Connection timeout: No available connections in pool");
  }

  public releaseConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.isActive = false;
      connection.lastUsed = new Date();
      this.updateMetrics();
    }
  }

  public async executeQuery<T>(
    queryFn: (client: SupabaseClient<Database>) => Promise<T>
  ): Promise<T> {
    let connection: PooledConnection | null = null;
    const queryStart = Date.now();

    try {
      connection = await this.getConnection();
      
      const result = await queryFn(connection.client);
      
      const queryTime = Date.now() - queryStart;
      connection.queryCount++;
      connection.totalQueryTime += queryTime;
      this.metrics.totalQueries++;
      
      // Update average query time
      const totalTime = Array.from(this.connections.values())
        .reduce((sum, conn) => sum + conn.totalQueryTime, 0);
      this.metrics.averageQueryTime = totalTime / this.metrics.totalQueries;

      return result;
    } catch (error) {
      console.error("❌ Query execution failed", {
        connectionId: connection?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        queryTime: Date.now() - queryStart
      });
      throw error;
    } finally {
      if (connection) {
        this.releaseConnection(connection.id);
      }
    }
  }

  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  private async performHealthCheck(): Promise<void> {
    this.metrics.lastHealthCheck = new Date();
    let healthyConnections = 0;
    let unhealthyConnections = 0;

    for (const [id, connection] of this.connections) {
      if (!connection.isActive) {
        try {
          await this.testConnection(connection.client);
          healthyConnections++;
          
          // Remove old idle connections
          const idleTime = Date.now() - connection.lastUsed.getTime();
          if (idleTime > this.config.idleTimeout && this.connections.size > this.config.minConnections) {
            this.connections.delete(id);
            console.log("🧹 Removed idle connection", {
              connectionId: id,
              idleTime: Math.round(idleTime / 1000) + 's'
            });
          }
        } catch (error) {
          unhealthyConnections++;
          this.connections.delete(id);
          console.error("❌ Removed unhealthy connection", {
            connectionId: id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      } else {
        healthyConnections++;
      }
    }

    // Ensure minimum connections
    while (this.connections.size < this.config.minConnections) {
      try {
        await this.createConnection();
      } catch (error) {
        console.error("❌ Failed to maintain minimum connections", error);
        break;
      }
    }

    // Update pool status
    const totalConnections = this.connections.size;
    if (unhealthyConnections > totalConnections * 0.5) {
      this.metrics.poolStatus = 'critical';
    } else if (unhealthyConnections > totalConnections * 0.2) {
      this.metrics.poolStatus = 'degraded';
    } else {
      this.metrics.poolStatus = 'healthy';
    }

    this.updateMetrics();

    console.log("🏥 Database pool health check completed", {
      status: this.metrics.poolStatus,
      totalConnections,
      healthyConnections,
      unhealthyConnections,
      metrics: this.metrics
    });
  }

  private updateMetrics(): void {
    this.metrics.totalConnections = this.connections.size;
    this.metrics.activeConnections = Array.from(this.connections.values())
      .filter(conn => conn.isActive).length;
    this.metrics.idleConnections = this.metrics.totalConnections - this.metrics.activeConnections;
  }

  public getMetrics(): ConnectionMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  public async shutdown(): Promise<void> {
    if (this.isShuttingDown) return;
    
    console.log("🛑 Shutting down database connection pool...");
    this.isShuttingDown = true;

    // Stop health checks
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    // Wait for active connections to complete (with timeout)
    const shutdownTimeout = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (this.metrics.activeConnections > 0 && Date.now() - startTime < shutdownTimeout) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.updateMetrics();
      console.log(`⏳ Waiting for ${this.metrics.activeConnections} active connections to complete...`);
    }

    // Clear all connections
    this.connections.clear();
    this.updateMetrics();

    console.log("✅ Database connection pool shutdown completed");
  }
}

// Singleton instance
export const connectionPool = DatabaseConnectionPool.getInstance();

// Helper function for easy usage
export async function withDatabaseConnection<T>(
  queryFn: (client: SupabaseClient<Database>) => Promise<T>
): Promise<T> {
  return connectionPool.executeQuery(queryFn);
}

// Export types
export type { ConnectionMetrics, ConnectionPoolConfig, PooledConnection };