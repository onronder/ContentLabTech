/**
 * Monitoring API Endpoint
 * Provides access to service metrics, alerts, and health status
 */

import { NextRequest, NextResponse } from "next/server";
import { serviceMonitor } from "@/lib/monitoring/service-monitor";
import { serviceDegradationManager } from "@/lib/resilience/service-degradation";
import { circuitBreakerManager } from "@/lib/resilience/circuit-breaker";
import { retryManager } from "@/lib/resilience/retry-manager";
import { enhancedSerpApiService } from "@/lib/serpapi-enhanced";
import { enhancedOpenAIService } from "@/lib/openai-enhanced";

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
        // Get enhanced service metrics for overview
        const serpApiMetrics = enhancedSerpApiService.getMetrics();
        const serpApiHealth = await enhancedSerpApiService.healthCheck();
        const openaiMetrics = enhancedOpenAIService.getMetrics();
        const openaiHealth = await enhancedOpenAIService.healthCheck();
        const healthSummary = serviceDegradationManager.getHealthSummary();

        // Determine overall system status including both SerpAPI and OpenAI
        let overallStatus = "healthy";
        if (serpApiMetrics.errorRate > 10 || openaiMetrics.errorRate > 10) {
          overallStatus = "unhealthy";
        } else if (
          serpApiMetrics.errorRate > 5 ||
          openaiMetrics.errorRate > 5 ||
          serpApiHealth.status === "degraded" ||
          openaiHealth.status === "degraded"
        ) {
          overallStatus = "degraded";
        }

        return NextResponse.json({
          timestamp: new Date().toISOString(),
          status: overallStatus,
          services: {
            ...healthSummary,
            serpapi_enhanced: {
              status: serpApiHealth.status,
              errorRate: serpApiMetrics.errorRate,
              responseTime: serpApiMetrics.averageResponseTime,
              circuitBreakerState: serpApiMetrics.circuitBreakerMetrics.state,
            },
            openai_enhanced: {
              status: openaiHealth.status,
              errorRate: openaiMetrics.errorRate,
              responseTime: openaiMetrics.averageResponseTime,
              circuitBreakerState: openaiMetrics.circuitBreakerMetrics.state,
              tokenUsage: openaiMetrics.tokenUsage,
            },
          },
          activeAlerts: serviceMonitor.getActiveAlerts(),
          systemMetrics:
            serviceMonitor
              .getSystemMetrics({ start: startTime, end: endTime })
              .slice(-1)[0] || null,
          circuitBreakers: circuitBreakerManager.getAllCircuitBreakers(),
          serpApiStatus: {
            errorRate: serpApiMetrics.errorRate,
            threshold: 5.0,
            exceedsThreshold: serpApiMetrics.errorRate > 5.0,
            recommendations: serpApiHealth.recommendations,
          },
          openaiStatus: {
            errorRate: openaiMetrics.errorRate,
            threshold: 5.0,
            exceedsThreshold: openaiMetrics.errorRate > 5.0,
            recommendations: openaiHealth.recommendations,
            costTracking: {
              totalCost: openaiMetrics.tokenUsage.estimatedCost,
              averageTokensPerRequest:
                openaiMetrics.tokenUsage.averageTokensPerRequest,
              totalTokens: openaiMetrics.tokenUsage.totalTokens,
            },
          },
        });

      case "alerts":
        const alerts =
          searchParams.get("active") === "true"
            ? serviceMonitor.getActiveAlerts()
            : serviceMonitor.getAllAlerts();

        return NextResponse.json({
          alerts: alerts.slice(0, 100), // Limit to 100 most recent
          total: alerts.length,
          active: serviceMonitor.getActiveAlerts().length,
        });

      case "metrics":
        if (service) {
          // Special handling for SerpAPI metrics
          if (service === "serpapi") {
            const serpApiMetrics = enhancedSerpApiService.getMetrics();
            const serpApiHealth = await enhancedSerpApiService.healthCheck();

            return NextResponse.json({
              service,
              metrics: serviceMonitor.getServiceMetrics(service, {
                start: startTime,
                end: endTime,
              }),
              retryConfig: retryManager.getRetryStats(service),
              enhanced: {
                serpapi: {
                  metrics: serpApiMetrics,
                  health: serpApiHealth,
                  errorRateThreshold: 5.0, // 5% threshold
                  currentErrorRate: serpApiMetrics.errorRate,
                  exceedsThreshold: serpApiMetrics.errorRate > 5.0,
                },
              },
            });
          }

          // Special handling for OpenAI metrics
          if (service === "openai") {
            const openaiMetrics = enhancedOpenAIService.getMetrics();
            const openaiHealth = await enhancedOpenAIService.healthCheck();

            return NextResponse.json({
              service,
              metrics: serviceMonitor.getServiceMetrics(service, {
                start: startTime,
                end: endTime,
              }),
              retryConfig: retryManager.getRetryStats(service),
              enhanced: {
                openai: {
                  metrics: openaiMetrics,
                  health: openaiHealth,
                  errorRateThreshold: 5.0, // 5% threshold
                  currentErrorRate: openaiMetrics.errorRate,
                  exceedsThreshold: openaiMetrics.errorRate > 5.0,
                  costAnalysis: {
                    totalCost: openaiMetrics.tokenUsage.estimatedCost,
                    averageCostPerRequest:
                      openaiMetrics.tokenUsage.estimatedCost /
                      (openaiMetrics.successfulRequests || 1),
                    tokenEfficiency:
                      openaiMetrics.tokenUsage.averageTokensPerRequest,
                    modelUsage: openaiMetrics.modelUsage,
                  },
                },
              },
            });
          }

          return NextResponse.json({
            service,
            metrics: serviceMonitor.getServiceMetrics(service, {
              start: startTime,
              end: endTime,
            }),
            retryConfig: retryManager.getRetryStats(service),
          });
        } else {
          // Include both SerpAPI and OpenAI enhanced metrics in system overview
          const serpApiMetrics = enhancedSerpApiService.getMetrics();
          const serpApiHealth = await enhancedSerpApiService.healthCheck();
          const openaiMetrics = enhancedOpenAIService.getMetrics();
          const openaiHealth = await enhancedOpenAIService.healthCheck();

          return NextResponse.json({
            systemMetrics: serviceMonitor.getSystemMetrics({
              start: startTime,
              end: endTime,
            }),
            services: ["openai", "serpapi", "supabase", "redis"].map(
              serviceName => ({
                name: serviceName,
                metrics: serviceMonitor
                  .getServiceMetrics(serviceName, {
                    start: startTime,
                    end: endTime,
                  })
                  .slice(-10), // Last 10 data points
              })
            ),
            enhanced: {
              serpapi: {
                metrics: serpApiMetrics,
                health: serpApiHealth,
                errorRateAlert: serpApiMetrics.errorRate > 5.0,
                criticalAlert: serpApiMetrics.errorRate > 10.0,
              },
              openai: {
                metrics: openaiMetrics,
                health: openaiHealth,
                errorRateAlert: openaiMetrics.errorRate > 5.0,
                criticalAlert: openaiMetrics.errorRate > 10.0,
                costAlert: openaiMetrics.tokenUsage.estimatedCost > 50.0,
              },
            },
          });
        }

      case "health":
        const healthSummaryForHealth =
          serviceDegradationManager.getHealthSummary();
        const allHealthy = Object.values(healthSummaryForHealth).every(
          s => s.status === "healthy"
        );

        return NextResponse.json({
          status: allHealthy ? "healthy" : "degraded",
          timestamp: new Date().toISOString(),
          services: healthSummaryForHealth,
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
              retryManager.getRetryStats(serviceName),
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
        timestamp: new Date().toISOString(),
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
        const acknowledged = serviceMonitor.acknowledgeAlert(
          alertId,
          acknowledgedBy
        );

        return NextResponse.json({
          success: acknowledged,
          message: acknowledged ? "Alert acknowledged" : "Alert not found",
        });

      case "resolve-alert":
        const { alertId: resolveAlertId, resolvedBy } = body;
        const resolved = serviceMonitor.resolveAlert(
          resolveAlertId,
          resolvedBy
        );

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
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error in monitoring POST endpoint:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
