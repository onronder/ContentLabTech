/**
 * Performance Benchmark API
 * Endpoint to run database performance benchmarks and monitoring
 */

import { NextRequest, NextResponse } from "next/server";
import { performanceBenchmark, quickPerformanceCheck } from "@/lib/testing/performance-benchmark";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testType = searchParams.get("type") || "quick";
    const format = searchParams.get("format") as "json" | "csv" || "json";

    console.log("🔍 Performance benchmark API called", {
      testType,
      format,
      timestamp: new Date().toISOString()
    });

    if (testType === "quick") {
      // Quick health check
      const healthCheck = await quickPerformanceCheck();
      
      return NextResponse.json({
        success: true,
        type: "quick_check",
        timestamp: new Date().toISOString(),
        results: healthCheck,
        recommendations: generateHealthRecommendations(healthCheck)
      });
      
    } else if (testType === "full") {
      // Full benchmark suite
      console.log("🚀 Starting full performance benchmark suite...");
      
      const benchmarkResults = await performanceBenchmark.runFullSuite();
      
      if (format === "csv") {
        const csvData = performanceBenchmark.exportResults("csv");
        return new NextResponse(csvData, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="performance-benchmark-${Date.now()}.csv"`
          }
        });
      }
      
      return NextResponse.json({
        success: true,
        type: "full_benchmark",
        timestamp: new Date().toISOString(),
        results: benchmarkResults,
        recommendations: generateBenchmarkRecommendations(benchmarkResults)
      });
      
    } else if (testType === "history") {
      // Get benchmark history
      const allResults = performanceBenchmark.getAllResults();
      
      return NextResponse.json({
        success: true,
        type: "history",
        timestamp: new Date().toISOString(),
        results: allResults,
        summary: {
          totalRuns: allResults.length,
          latestRun: allResults[allResults.length - 1]?.startTime,
          averagePerformance: calculateAveragePerformance(allResults)
        }
      });
      
    } else {
      return NextResponse.json({
        success: false,
        error: "Invalid test type",
        validTypes: ["quick", "full", "history"]
      }, { status: 400 });
    }

  } catch (error) {
    console.error("❌ Performance benchmark API error:", error);
    
    return NextResponse.json({
      success: false,
      error: "Failed to run performance benchmark",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, options } = body;

    console.log("📝 Performance benchmark POST request", {
      action,
      options,
      timestamp: new Date().toISOString()
    });

    if (action === "run_benchmark") {
      const testType = options?.type || "full";
      
      if (testType === "full") {
        const results = await performanceBenchmark.runFullSuite();
        
        return NextResponse.json({
          success: true,
          action: "benchmark_completed",
          timestamp: new Date().toISOString(),
          results,
          recommendations: generateBenchmarkRecommendations(results)
        });
      } else {
        return NextResponse.json({
          success: false,
          error: "Invalid benchmark type for POST action"
        }, { status: 400 });
      }
      
    } else if (action === "export_results") {
      const format = options?.format || "json";
      const exportData = performanceBenchmark.exportResults(format as "json" | "csv");
      
      if (format === "csv") {
        return new NextResponse(exportData, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="performance-results-${Date.now()}.csv"`
          }
        });
      }
      
      return NextResponse.json({
        success: true,
        action: "export_completed",
        timestamp: new Date().toISOString(),
        data: JSON.parse(exportData)
      });
      
    } else {
      return NextResponse.json({
        success: false,
        error: "Invalid action",
        validActions: ["run_benchmark", "export_results"]
      }, { status: 400 });
    }

  } catch (error) {
    console.error("❌ Performance benchmark POST error:", error);
    
    return NextResponse.json({
      success: false,
      error: "Failed to process benchmark request",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

function generateHealthRecommendations(healthCheck: any): string[] {
  const recommendations: string[] = [];
  
  if (!healthCheck.connectionPool) {
    recommendations.push("Connection pool is not responding - check database connectivity");
    recommendations.push("Verify database credentials and network connectivity");
  }
  
  if (!healthCheck.cache) {
    recommendations.push("Redis cache is not accessible - check Redis server status");
    recommendations.push("Verify Redis configuration and connection settings");
  }
  
  if (!healthCheck.database) {
    recommendations.push("Database is not accessible - check PostgreSQL/Supabase status");
    recommendations.push("Verify database permissions and RLS policies");
  }
  
  if (healthCheck.overallHealth === "degraded") {
    recommendations.push("System is partially degraded - monitor performance closely");
    recommendations.push("Consider running full benchmark to identify bottlenecks");
  }
  
  if (healthCheck.overallHealth === "critical") {
    recommendations.push("System is in critical state - immediate attention required");
    recommendations.push("Check all database and cache connections");
    recommendations.push("Review system logs for errors");
  }
  
  if (recommendations.length === 0) {
    recommendations.push("All systems are healthy - no immediate action required");
    recommendations.push("Consider running periodic full benchmarks for performance monitoring");
  }
  
  return recommendations;
}

function generateBenchmarkRecommendations(benchmarkResults: any): string[] {
  const recommendations: string[] = [];
  const results = benchmarkResults.results || [];
  
  // Analyze slow queries
  const slowTests = results.filter((r: any) => r.recordsPerSecond < 100);
  if (slowTests.length > 0) {
    recommendations.push(`${slowTests.length} tests show poor performance (<100 records/sec)`);
    recommendations.push("Consider optimizing database indexes and query patterns");
    
    slowTests.forEach((test: any) => {
      recommendations.push(`- Optimize "${test.testName}": ${Math.round(test.recordsPerSecond)} records/sec`);
    });
  }
  
  // Analyze memory usage
  const highMemoryTests = results.filter((r: any) => r.memoryUsage.used > 50 * 1024 * 1024);
  if (highMemoryTests.length > 0) {
    recommendations.push(`${highMemoryTests.length} tests show high memory usage (>50MB)`);
    recommendations.push("Consider optimizing query result sizes and data structures");
  }
  
  // Analyze error rate
  const failedTests = results.filter((r: any) => r.status === "error");
  if (failedTests.length > 0) {
    recommendations.push(`${failedTests.length} tests failed - investigate error causes`);
    failedTests.forEach((test: any) => {
      recommendations.push(`- Fix "${test.testName}": ${test.error}`);
    });
  }
  
  // Overall performance analysis
  const { overallThroughput } = benchmarkResults.summary || {};
  if (overallThroughput < 500) {
    recommendations.push("Overall system throughput is low (<500 records/sec)");
    recommendations.push("Consider implementing connection pooling optimizations");
    recommendations.push("Review database configuration and hardware resources");
  } else if (overallThroughput > 2000) {
    recommendations.push("Excellent performance! System is well-optimized");
    recommendations.push("Continue monitoring for performance regression");
  }
  
  // Connection pool analysis
  const connectionTests = results.filter((r: any) => r.testName.includes("Connection"));
  if (connectionTests.length > 0 && connectionTests.some((t: any) => t.duration > 1000)) {
    recommendations.push("Connection pool may be under stress");
    recommendations.push("Consider increasing max connections or optimizing query patterns");
  }
  
  // Cache performance analysis
  const cacheTests = results.filter((r: any) => r.testName.includes("Cache"));
  if (cacheTests.length > 0 && cacheTests.some((t: any) => t.recordsPerSecond < 1000)) {
    recommendations.push("Cache performance could be improved");
    recommendations.push("Check Redis configuration and network latency");
  }
  
  if (recommendations.length === 0) {
    recommendations.push("All benchmarks show good performance");
    recommendations.push("System is operating within optimal parameters");
    recommendations.push("Continue regular monitoring to maintain performance");
  }
  
  return recommendations;
}

function calculateAveragePerformance(allResults: any[]): any {
  if (allResults.length === 0) return null;
  
  const totalThroughput = allResults.reduce((sum, result) => 
    sum + (result.summary?.overallThroughput || 0), 0
  );
  
  const totalDuration = allResults.reduce((sum, result) => 
    sum + (result.totalDuration || 0), 0
  );
  
  const totalTests = allResults.reduce((sum, result) => 
    sum + (result.summary?.totalTests || 0), 0
  );
  
  const totalPassed = allResults.reduce((sum, result) => 
    sum + (result.summary?.passed || 0), 0
  );
  
  return {
    averageThroughput: totalThroughput / allResults.length,
    averageDuration: totalDuration / allResults.length,
    averageSuccessRate: (totalPassed / totalTests) * 100,
    totalRuns: allResults.length,
    performanceTrend: allResults.length >= 2 
      ? calculatePerformanceTrend(allResults)
      : "insufficient_data"
  };
}

function calculatePerformanceTrend(results: any[]): "improving" | "stable" | "declining" {
  if (results.length < 2) return "stable";
  
  const recent = results.slice(-3); // Last 3 runs
  const older = results.slice(-6, -3); // Previous 3 runs
  
  if (recent.length === 0 || older.length === 0) return "stable";
  
  const recentAvg = recent.reduce((sum: number, r: any) => 
    sum + (r.summary?.overallThroughput || 0), 0
  ) / recent.length;
  
  const olderAvg = older.reduce((sum: number, r: any) => 
    sum + (r.summary?.overallThroughput || 0), 0
  ) / older.length;
  
  const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;
  
  if (changePercent > 5) return "improving";
  if (changePercent < -5) return "declining";
  return "stable";
}