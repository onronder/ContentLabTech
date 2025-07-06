/**
 * Redis Health Check Endpoint
 * Dedicated endpoint for Redis connectivity and performance monitoring
 */

import { NextRequest, NextResponse } from "next/server";

interface RedisHealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  responseTime: number;
  details: {
    connected: boolean;
    host: string;
    port: number;
    error?: string;
    memory?: {
      used: string;
      peak: string;
    };
    stats?: {
      keyspace: Record<string, unknown>;
      clients: number;
    };
  };
}

export async function GET(_request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check if Redis configuration is available
    const redisHost = process.env["REDIS_HOST"];
    const redisPort = parseInt(process.env["REDIS_PORT"] || "6379");

    if (!redisHost) {
      return NextResponse.json(
        {
          status: "unhealthy",
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
          details: {
            connected: false,
            host: "not configured",
            port: redisPort,
            error: "REDIS_HOST environment variable not set",
          },
        } as RedisHealthCheck,
        {
          status: 503,
          headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
        }
      );
    }

    // Try to create Redis connection and test it
    try {
      // Dynamic import to avoid loading Redis if not needed
      const { createClient } = await import("redis");

      const redisPassword = process.env["REDIS_PASSWORD"];
      const client = createClient({
        socket: {
          host: redisHost,
          port: redisPort,
          ...(process.env["REDIS_TLS"] === "true" && { tls: true }),
        },
        ...(redisPassword && { password: redisPassword }),
      });

      // Set connection timeout
      const connectTimeout = setTimeout(() => {
        client.disconnect();
      }, 5000);

      await client.connect();
      clearTimeout(connectTimeout);

      // Test basic operations
      const pingStart = Date.now();
      await client.ping();
      const pingTime = Date.now() - pingStart;

      // Get Redis info
      await client.info();
      const memoryInfo = await client.info("memory");
      const stats = await client.info("stats");

      // Parse info for useful metrics
      const memoryMatch = memoryInfo.match(/used_memory_human:(.+)\r?\n/);
      const peakMemoryMatch = memoryInfo.match(
        /used_memory_peak_human:(.+)\r?\n/
      );
      const clientsMatch = stats.match(/connected_clients:(\d+)/);

      await client.disconnect();

      const responseTime = Date.now() - startTime;

      let status: "healthy" | "degraded" | "unhealthy" = "healthy";
      if (responseTime > 2000) {
        status = "degraded";
      }
      if (pingTime > 1000) {
        status = "degraded";
      }

      return NextResponse.json(
        {
          status,
          timestamp: new Date().toISOString(),
          responseTime,
          details: {
            connected: true,
            host: redisHost,
            port: redisPort,
            memory: {
              used: memoryMatch?.[1]?.trim() || "unknown",
              peak: peakMemoryMatch?.[1]?.trim() || "unknown",
            },
            stats: {
              keyspace: {}, // You can expand this based on your needs
              clients: parseInt(clientsMatch?.[1] || "0"),
              pingTime,
            },
          },
        } as RedisHealthCheck,
        {
          headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
        }
      );
    } catch (redisError) {
      return NextResponse.json(
        {
          status: "unhealthy",
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
          details: {
            connected: false,
            host: redisHost,
            port: redisPort,
            error:
              redisError instanceof Error
                ? redisError.message
                : "Unknown Redis error",
          },
        } as RedisHealthCheck,
        {
          status: 503,
          headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
        }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        details: {
          connected: false,
          host: "unknown",
          port: 0,
          error: `Health check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      } as RedisHealthCheck,
      {
        status: 503,
        headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
      }
    );
  }
}
