/**
 * Monitoring API Endpoint
 * Provides access to service metrics, alerts, and health status
 */

import { NextRequest, NextResponse } from "next/server";
import { serviceMonitor } from "@/lib/monitoring/service-monitor";
import { serviceDegradationManager } from "@/lib/resilience/service-degradation";
import { circuitBreakerManager } from "@/lib/resilience/circuit-breaker";
import { retryManager } from "@/lib/resilience/retry-manager";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "overview";
    const service = searchParams.get("service");
    const timeRange = searchParams.get("timeRange") || "1h";

    // Calculate time range
    const endTime = new Date();
    const startTime = new Date();
    switch (timeRange) {
      case "1h":
        startTime.setHours(endTime.getHours() - 1);
        break;
      case "24h":
        startTime.setHours(endTime.getHours() - 24);
        break;
      case "7d":
        startTime.setDate(endTime.getDate() - 7);
        break;
      default:
        startTime.setHours(endTime.getHours() - 1);
    }

    switch (type) {
      case "overview":
        return NextResponse.json({
          timestamp: new Date().toISOString(),
          status: "healthy",
          services: serviceDegradationManager.getHealthSummary(),
          activeAlerts: serviceMonitor.getActiveAlerts(),
          systemMetrics: serviceMonitor.getSystemMetrics({ start: startTime, end: endTime }).slice(-1)[0] || null,
          circuitBreakers: circuitBreakerManager.getAllCircuitBreakers(),
        });

      case "alerts":
        const alerts = searchParams.get("active") === "true" 
          ? serviceMonitor.getActiveAlerts()
          : serviceMonitor.getAllAlerts();
        
        return NextResponse.json({
          alerts: alerts.slice(0, 100), // Limit to 100 most recent
          total: alerts.length,
          active: serviceMonitor.getActiveAlerts().length,
        });

      case "metrics":
        if (service) {
          return NextResponse.json({
            service,
            metrics: serviceMonitor.getServiceMetrics(service, { start: startTime, end: endTime }),
            retryConfig: retryManager.getRetryStats(service),
          });
        } else {
          return NextResponse.json({
            systemMetrics: serviceMonitor.getSystemMetrics({ start: startTime, end: endTime }),
            services: ["openai", "serpapi", "supabase", "redis"].map(serviceName => ({
              name: serviceName,
              metrics: serviceMonitor.getServiceMetrics(serviceName, { start: startTime, end: endTime }).slice(-10), // Last 10 data points
            })),
          });
        }

      case "health":
        const healthSummary = serviceDegradationManager.getHealthSummary();
        const allHealthy = Object.values(healthSummary).every(s => s.status === "healthy");
        
        return NextResponse.json({
          status: allHealthy ? "healthy" : "degraded",
          timestamp: new Date().toISOString(),
          services: healthSummary,
          uptime: Date.now() - serviceMonitor["startTime"], // Access private property for demo
        });

      case "circuit-breakers":
        return NextResponse.json({
          circuitBreakers: circuitBreakerManager.getAllCircuitBreakers(),
        });

      case "retry-stats":
        const services = ["openai", "serpapi", "supabase", "redis"];
        return NextResponse.json({
          retryConfigs: Object.fromEntries(
            services.map(serviceName => [
              serviceName,
              retryManager.getRetryStats(serviceName)
            ])
          ),
        });

      default:
        return NextResponse.json(
          { error: "Invalid monitoring type" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error in monitoring endpoint:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const body = await request.json();

    switch (action) {
      case "acknowledge-alert":
        const { alertId, acknowledgedBy } = body;
        const acknowledged = serviceMonitor.acknowledgeAlert(alertId, acknowledgedBy);
        
        return NextResponse.json({
          success: acknowledged,
          message: acknowledged ? "Alert acknowledged" : "Alert not found",
        });

      case "resolve-alert":
        const { alertId: resolveAlertId, resolvedBy } = body;
        const resolved = serviceMonitor.resolveAlert(resolveAlertId, resolvedBy);
        
        return NextResponse.json({
          success: resolved,
          message: resolved ? "Alert resolved" : "Alert not found",
        });

      case "update-thresholds":
        // Update monitoring thresholds
        // This would typically require admin authentication
        return NextResponse.json({
          success: false,
          message: "Threshold updates not implemented",
        });

      case "test-alert":
        // Create a test alert for testing notification systems
        return NextResponse.json({
          success: false,
          message: "Test alerts not implemented",
        });

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error in monitoring POST endpoint:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}