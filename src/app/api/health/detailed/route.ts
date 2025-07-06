/**
 * Detailed Health Check API Endpoint
 * Provides comprehensive system health information including metrics
 */

import { NextRequest, NextResponse } from "next/server";
import { healthChecker } from "@/lib/monitoring/health-checker";
import os from "os";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeMetrics = searchParams.get("metrics") !== "false";
    const includeEnvironment = searchParams.get("environment") !== "false";

    const systemHealth = await healthChecker.checkSystemHealth();

    const detailedHealth: Record<string, unknown> = {
      ...systemHealth,
      requestTime: new Date().toISOString(),
      responseGenerated: true,
    };

    if (includeEnvironment) {
      detailedHealth.environment = {
        ...systemHealth.environment,
        env: process.env.NODE_ENV,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        cpuCount: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        loadAverage: os.loadavg(),
        networkInterfaces: Object.keys(os.networkInterfaces()),
      };
    }

    if (includeMetrics) {
      // Add process metrics
      detailedHealth.processMetrics = {
        pid: process.pid,
        ppid: process.ppid,
        title: process.title,
        version: process.version,
        versions: process.versions,
        execPath: process.execPath,
        execArgv: process.execArgv,
        argv: process.argv.slice(0, 3), // Limit to avoid sensitive info
        cwd: process.cwd(),
        umask: process.umask?.() || "N/A",
        gid: process.getgid?.() || "N/A",
        uid: process.getuid?.() || "N/A",
        features: process.features,
      };

      // Add resource usage
      if (process.resourceUsage) {
        detailedHealth.resourceUsage = process.resourceUsage();
      }

      // Add performance marks if available
      if (typeof performance !== "undefined") {
        detailedHealth.performance = {
          now: performance.now(),
          timeOrigin: performance.timeOrigin,
        };
      }
    }

    const status =
      systemHealth.overall === "healthy"
        ? 200
        : systemHealth.overall === "degraded"
          ? 200
          : 503;

    return NextResponse.json(detailedHealth, {
      status,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        "X-Health-Check-Detailed": "true",
        "X-Response-Time": new Date().toISOString(),
      },
    });
  } catch (error) {
    // Log error without console.error for production
    if (process.env.NODE_ENV === "development") {
      console.error("Detailed health check failed:", error);
    }

    return NextResponse.json(
      {
        overall: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        services: [],
        uptime: 0,
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  }
}
