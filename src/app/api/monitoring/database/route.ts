/**
 * Database Performance Monitoring API
 * Real-time database metrics and health monitoring
 */

import { NextRequest, NextResponse } from "next/server";
import {
  withDatabaseConnection,
  connectionPool,
} from "@/lib/database/connection-pool";
import { cache } from "@/lib/cache/redis-cache";
import {
  getQueryMetrics,
  getSlowQueries,
} from "@/lib/database/optimized-queries";
import { enterpriseLogger } from "@/lib/monitoring/enterprise-logger";

interface DatabaseMetrics {
  connectionPool: {
    status: string;
    metrics: any;
  };
  queryPerformance: {
    totalQueries: number;
    slowQueries: any[];
    averageResponseTime: number;
  };
  indexEfficiency: any[];
  tablePerformance: any[];
  cacheMetrics: any;
  systemHealth: {
    status: "healthy" | "degraded" | "critical";
    issues: string[];
    recommendations: string[];
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeDetails = searchParams.get("details") === "true";
    const timeframe = searchParams.get("timeframe") || "1h";

    enterpriseLogger.info("Database monitoring request received", {
      includeDetails,
      timeframe,
      timestamp: new Date().toISOString(),
    });

    // Get connection pool metrics
    const poolMetrics = connectionPool.getMetrics();

    // Get query performance metrics
    const queryMetrics = getQueryMetrics();
    const slowQueries = getSlowQueries(1000); // Queries slower than 1000ms

    // Get cache metrics
    const cacheMetrics = await cache.getCacheInfo();

    // Get database statistics if details requested
    let indexEfficiency: any[] = [];
    let tablePerformance: any[] = [];

    if (includeDetails) {
      try {
        indexEfficiency = await withDatabaseConnection(async client => {
          const { data, error } = await client
            .from("index_efficiency_analysis")
            .select("*")
            .order("times_used", { ascending: false })
            .limit(50);

          if (error) {
            enterpriseLogger.error(
              "Error fetching index efficiency",
              new Error(error.message),
              { includeDetails, timeframe }
            );
            return [];
          }

          return data || [];
        });

        tablePerformance = await withDatabaseConnection(async client => {
          const { data, error } = await client
            .from("table_performance_metrics")
            .select("*")
            .order("total_size", { ascending: false })
            .limit(20);

          if (error) {
            enterpriseLogger.error(
              "Error fetching table performance",
              new Error(error.message),
              { includeDetails, timeframe }
            );
            return [];
          }

          return data || [];
        });
      } catch (error) {
        enterpriseLogger.error(
          "Error fetching detailed metrics",
          error instanceof Error ? error : new Error(String(error)),
          { includeDetails, timeframe }
        );
        indexEfficiency = [];
        tablePerformance = [];
      }
    }

    // Analyze system health
    const systemHealth = analyzeSystemHealth(
      poolMetrics,
      queryMetrics,
      slowQueries,
      cacheMetrics,
      indexEfficiency,
      tablePerformance
    );

    const metrics: DatabaseMetrics = {
      connectionPool: {
        status: poolMetrics.poolStatus,
        metrics: poolMetrics,
      },
      queryPerformance: {
        totalQueries: queryMetrics.length,
        slowQueries: slowQueries.slice(0, 10), // Top 10 slowest
        averageResponseTime:
          queryMetrics.length > 0
            ? queryMetrics.reduce((sum, q) => sum + q.executionTime, 0) /
              queryMetrics.length
            : 0,
      },
      indexEfficiency,
      tablePerformance,
      cacheMetrics,
      systemHealth,
    };

    enterpriseLogger.info("Database monitoring completed", {
      poolStatus: poolMetrics.poolStatus,
      totalQueries: queryMetrics.length,
      slowQueriesCount: slowQueries.length,
      cacheHitRate: cacheMetrics.metrics?.hitRate || 0,
      systemStatus: systemHealth.status,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      timeframe,
      metrics,
    });
  } catch (error) {
    enterpriseLogger.error(
      "Database monitoring error",
      error instanceof Error ? error : new Error(String(error)),
      { timeframe: request.url }
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch database metrics",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

function analyzeSystemHealth(
  poolMetrics: any,
  queryMetrics: any[],
  slowQueries: any[],
  cacheMetrics: any,
  indexEfficiency: any[],
  tablePerformance: any[]
): {
  status: "healthy" | "degraded" | "critical";
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let status: "healthy" | "degraded" | "critical" = "healthy";

  // Connection pool health
  if (poolMetrics.poolStatus === "critical") {
    issues.push("Connection pool is in critical state");
    recommendations.push("Check database connectivity and increase pool size");
    status = "critical";
  } else if (poolMetrics.poolStatus === "degraded") {
    issues.push("Connection pool performance is degraded");
    recommendations.push(
      "Monitor connection usage patterns and optimize queries"
    );
    if (status === "healthy") status = "degraded";
  }

  // High connection usage
  if (poolMetrics.activeConnections / poolMetrics.totalConnections > 0.8) {
    issues.push("High connection pool utilization (>80%)");
    recommendations.push(
      "Consider increasing max connections or optimizing connection usage"
    );
    if (status === "healthy") status = "degraded";
  }

  // Slow queries
  const recentSlowQueries = slowQueries.filter(
    q => Date.now() - new Date(q.timestamp || 0).getTime() < 300000 // Last 5 minutes
  );

  if (recentSlowQueries.length > 10) {
    issues.push(
      `${recentSlowQueries.length} slow queries detected in last 5 minutes`
    );
    recommendations.push(
      "Analyze and optimize slow queries, add missing indexes"
    );
    status = "critical";
  } else if (recentSlowQueries.length > 5) {
    issues.push(`${recentSlowQueries.length} slow queries detected`);
    recommendations.push("Review query performance and consider optimization");
    if (status === "healthy") status = "degraded";
  }

  // Average query time
  const avgQueryTime =
    queryMetrics.length > 0
      ? queryMetrics.reduce((sum, q) => sum + q.executionTime, 0) /
        queryMetrics.length
      : 0;

  if (avgQueryTime > 500) {
    issues.push(`High average query time: ${Math.round(avgQueryTime)}ms`);
    recommendations.push("Review database indexes and query optimization");
    if (status === "healthy") status = "degraded";
  }

  // Cache performance
  if (cacheMetrics.connected && cacheMetrics.metrics) {
    const hitRate = cacheMetrics.metrics.hitRate || 0;

    if (hitRate < 50) {
      issues.push(`Low cache hit rate: ${Math.round(hitRate)}%`);
      recommendations.push("Review cache strategy and TTL settings");
      if (status === "healthy") status = "degraded";
    }

    if (cacheMetrics.metrics.errors > 10) {
      issues.push(`High cache error count: ${cacheMetrics.metrics.errors}`);
      recommendations.push("Check Redis connectivity and error logs");
      if (status === "healthy") status = "degraded";
    }
  } else {
    issues.push("Cache is not connected or unavailable");
    recommendations.push("Check Redis configuration and connectivity");
    status = "critical";
  }

  // Index efficiency (if detailed metrics available)
  if (indexEfficiency.length > 0) {
    const unusedIndexes = indexEfficiency.filter(
      idx => idx.times_used === 0 || idx.efficiency_status === "UNUSED"
    );

    if (unusedIndexes.length > 5) {
      issues.push(`${unusedIndexes.length} unused indexes detected`);
      recommendations.push(
        "Review and remove unused indexes to improve write performance"
      );
    }

    const lowEfficiencyIndexes = indexEfficiency.filter(
      idx => idx.efficiency_status === "LOW_EFFICIENCY"
    );

    if (lowEfficiencyIndexes.length > 3) {
      issues.push(
        `${lowEfficiencyIndexes.length} low-efficiency indexes detected`
      );
      recommendations.push("Analyze and optimize low-efficiency indexes");
    }
  }

  // Table performance (if detailed metrics available)
  if (tablePerformance.length > 0) {
    const highDeadTupleTables = tablePerformance.filter(
      table => parseFloat(table.dead_tuple_percentage || "0") > 20
    );

    if (highDeadTupleTables.length > 0) {
      issues.push(
        `${highDeadTupleTables.length} tables with high dead tuple percentage`
      );
      recommendations.push("Run VACUUM ANALYZE on affected tables");
    }

    const highSeqScanTables = tablePerformance.filter(
      table => table.seq_scan > 1000 && table.idx_scan < table.seq_scan
    );

    if (highSeqScanTables.length > 0) {
      issues.push(
        `${highSeqScanTables.length} tables with high sequential scan ratio`
      );
      recommendations.push("Add missing indexes for frequently scanned tables");
    }
  }

  // Failed connections
  if (poolMetrics.failedConnections > 5) {
    issues.push(
      `High failed connection count: ${poolMetrics.failedConnections}`
    );
    recommendations.push(
      "Check database availability and network connectivity"
    );
    if (status === "healthy") status = "degraded";
  }

  return { status, issues, recommendations };
}

// Health check endpoint for monitoring systems
export async function HEAD(request: NextRequest) {
  try {
    const poolMetrics = connectionPool.getMetrics();
    const cacheInfo = await cache.getCacheInfo();

    // Simple health check - return 200 if basic services are healthy
    if (poolMetrics.poolStatus === "critical" || !cacheInfo.connected) {
      return new NextResponse(null, { status: 503 }); // Service Unavailable
    }

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}
