import { NextRequest, NextResponse } from "next/server";
import {
  authenticatedApiHandler,
  createApiErrorResponse,
} from "@/lib/auth/api-handler";
import { z } from "zod";
import { competitiveCircuitBreaker } from "@/lib/competitive/circuit-breaker";
import { createClient } from "@/lib/supabase/server-auth";

// Validation schemas
const AlertRequestSchema = z.object({
  projectId: z.string().uuid("Valid project ID is required"),
  action: z.enum(["alerts", "create_alert", "update_alert", "test_alert"]),
  params: z
    .object({
      alertType: z
        .enum([
          "ranking_change",
          "traffic_change",
          "new_content",
          "keyword_opportunity",
          "technical_issue",
        ])
        .optional(),
      competitorUrl: z.string().url().optional(),
      keyword: z.string().min(1).optional(),
      threshold: z.number().min(0).max(100).optional(),
      frequency: z.enum(["immediate", "daily", "weekly"]).optional(),
      isActive: z.boolean().optional(),
    })
    .optional(),
});

const GetAlertsSchema = z.object({
  projectId: z.string().uuid("Valid project ID is required"),
  status: z.enum(["active", "inactive", "all"]).optional(),
  alertType: z
    .enum([
      "ranking_change",
      "traffic_change",
      "new_content",
      "keyword_opportunity",
      "technical_issue",
    ])
    .optional(),
  limit: z.number().min(1).max(100).optional(),
});

interface _AlertsRequest {
  projectId: string;
  action: "alerts" | "create_alert" | "update_alert" | "test_alert";
  params?: {
    alertType?:
      | "ranking_change"
      | "traffic_change"
      | "new_content"
      | "keyword_opportunity"
      | "technical_issue";
    competitorUrl?: string;
    keyword?: string;
    threshold?: number;
    frequency?: "immediate" | "daily" | "weekly";
    isActive?: boolean;
  };
}

export async function POST(request: NextRequest) {
  return authenticatedApiHandler(request, async (_user, team) => {
    const userId = _user.id; // Capture user ID for nested scopes
    return competitiveCircuitBreaker.execute(async () => {
      try {
        // Parse and validate request body
        const body = await request.json();
        const validatedData = AlertRequestSchema.parse(body);
        const { projectId, action, params = {} } = validatedData;

        // Project access is validated through team membership in authenticatedApiHandler
        const supabase = await createClient();

        let result;

        switch (action) {
          case "alerts": {
            // Get existing alerts for the project
            const { data: alerts, error: alertsError } = await supabase
              .from("competitor_alerts")
              .select(
                `
            *,
            competitor:competitors (
              competitor_name,
              competitor_url
            )
          `
              )
              .eq("project_id", projectId)
              .eq("team_id", team.id)
              .order("created_at", { ascending: false });

            if (alertsError) {
              console.error("Error fetching alerts:", alertsError);
              // Return empty result for now if table doesn't exist
              result = {
                alerts: [],
                recentTriggers: [],
                summary: {
                  total: 0,
                  active: 0,
                  recentlyTriggered: 0,
                },
              };
              break;
            }

            // Get recent triggered alerts
            const { data: recentTriggers } = await supabase
              .from("competitor_alerts")
              .select("*")
              .eq("project_id", projectId)
              .eq("is_active", true)
              .gte(
                "last_triggered",
                new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
              )
              .order("last_triggered", { ascending: false });

            result = {
              alerts: alerts || [],
              recentTriggers: recentTriggers || [],
              summary: {
                total: alerts?.length || 0,
                active: alerts?.filter(a => a.is_active)?.length || 0,
                recentlyTriggered: recentTriggers?.length || 0,
              },
            };

            break;
          }

          case "create_alert": {
            const {
              alertType,
              competitorUrl,
              keyword,
              threshold,
              frequency = "daily",
            } = params;

            if (!alertType) {
              return createApiErrorResponse("Alert type is required", 400);
            }

            // Validate competitor if specified
            let competitorId = null;
            if (competitorUrl) {
              const { data: competitor } = await supabase
                .from("competitors")
                .select("id")
                .eq("project_id", projectId)
                .eq("competitor_url", competitorUrl)
                .single();

              if (!competitor) {
                return createApiErrorResponse("Competitor not found", 404);
              }
              competitorId = competitor.id;
            }

            // Create alert configuration
            const alertConfig = {
              project_id: projectId,
              alert_type: alertType,
              competitor_id: competitorId,
              keyword,
              threshold: threshold || getDefaultThreshold(alertType),
              frequency,
              is_active: true,
              created_by: userId,
              alert_config: buildAlertConfig(alertType, params as AlertParams),
            };

            const { data: newAlert, error: createError } = await supabase
              .from("competitor_alerts")
              .insert(alertConfig)
              .select("*")
              .single();

            if (createError) {
              console.error("Error creating alert:", createError);
              return createApiErrorResponse("Failed to create alert", 500);
            }

            // Set up monitoring for the new alert
            try {
              await supabase.functions.invoke("competitor-monitoring", {
                body: {
                  action: "setup_alert",
                  alertId: newAlert.id,
                  projectId,
                  alertConfig,
                },
              });
            } catch (error) {
              console.error("Error setting up alert monitoring:", error);
            }

            // Log alert creation
            await supabase.from("user_events").insert({
              user_id: userId,
              event_type: "alert_created",
              event_data: {
                project_id: projectId,
                alert_type: alertType,
                competitor_url: competitorUrl,
                keyword,
              },
            });

            result = newAlert;
            break;
          }

          case "update_alert": {
            const alertId = request.url.split("/").pop();
            if (!alertId) {
              return createApiErrorResponse("Alert ID is required", 400);
            }

            // Get existing alert
            const { data: existingAlert } = await supabase
              .from("competitor_alerts")
              .select("*")
              .eq("id", alertId)
              .eq("project_id", projectId)
              .single();

            if (!existingAlert) {
              return createApiErrorResponse("Alert not found", 404);
            }

            // Update alert
            const updateData = {
              ...params,
              updated_at: new Date().toISOString(),
            };

            const { data: updatedAlert, error: updateError } = await supabase
              .from("competitor_alerts")
              .update(updateData)
              .eq("id", alertId)
              .select("*")
              .single();

            if (updateError) {
              console.error("Error updating alert:", updateError);
              return createApiErrorResponse("Failed to update alert", 500);
            }

            result = updatedAlert;
            break;
          }

          case "test_alert": {
            const alertId = request.url.split("/").pop();
            if (!alertId) {
              return createApiErrorResponse("Alert ID is required", 400);
            }

            // Get alert configuration
            const { data: alert } = await supabase
              .from("competitor_alerts")
              .select("*")
              .eq("id", alertId)
              .eq("project_id", projectId)
              .single();

            if (!alert) {
              return createApiErrorResponse("Alert not found", 404);
            }

            // Test the alert by simulating a trigger
            const testResult = await testAlert(supabase, alert, userId);

            result = {
              alertId,
              testResult,
              message: testResult.success
                ? "Alert test completed successfully"
                : "Alert test failed - check configuration",
            };

            break;
          }

          default:
            return createApiErrorResponse("Invalid action specified", 400);
        }

        return NextResponse.json({
          success: true,
          action,
          projectId,
          result,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("API error:", error);

        if (error instanceof z.ZodError) {
          return NextResponse.json(
            {
              error: "Validation failed",
              code: "VALIDATION_ERROR",
              details: error.errors.map(e => ({
                field: e.path.join("."),
                message: e.message,
              })),
            },
            { status: 400 }
          );
        }

        if (error instanceof SyntaxError) {
          return NextResponse.json(
            {
              error: "Invalid JSON format",
              code: "INVALID_JSON",
            },
            { status: 400 }
          );
        }

        return createApiErrorResponse("Internal server error", 500);
      }
    });
  });
}

export async function GET(request: NextRequest) {
  return authenticatedApiHandler(request, async (_user, team) => {
    return competitiveCircuitBreaker.execute(async () => {
      try {
        // Parse and validate query parameters
        const { searchParams } = new URL(request.url);
        const queryParams = {
          projectId: searchParams.get("projectId"),
          status: searchParams.get("status") as
            | "active"
            | "inactive"
            | "all"
            | null,
          alertType: searchParams.get("alertType"),
          limit: Math.min(parseInt(searchParams.get("limit") || "50"), 100),
        };

        const validatedParams = GetAlertsSchema.parse(queryParams);
        const { projectId, status, alertType, limit = 50 } = validatedParams;

        // Project access is validated through team membership in authenticatedApiHandler
        const supabase = await createClient();

        // Build query
        let query = supabase
          .from("competitor_alerts")
          .select(
            `
        *,
        competitor:competitors (
          id,
          competitor_name,
          competitor_url
        )
      `
          )
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (status && status !== "all") {
          query = query.eq("is_active", status === "active");
        }

        if (alertType) {
          query = query.eq("alert_type", alertType);
        }

        const { data: alerts, error } = await query;

        if (error) {
          console.error("Error fetching alerts:", error);
          return createApiErrorResponse("Failed to fetch alerts", 500);
        }

        // Get alert statistics
        const { data: alertStats } = await supabase
          .from("competitor_alerts")
          .select("alert_type, is_active, last_triggered")
          .eq("project_id", projectId);

        const stats = {
          total: alertStats?.length || 0,
          active: alertStats?.filter(a => a.is_active)?.length || 0,
          byType:
            alertStats?.reduce(
              (acc, alert) => {
                acc[alert.alert_type] = (acc[alert.alert_type] || 0) + 1;
                return acc;
              },
              {} as Record<string, number>
            ) || {},
          recentlyTriggered:
            alertStats?.filter(
              a =>
                a.last_triggered &&
                new Date(a.last_triggered) >
                  new Date(Date.now() - 24 * 60 * 60 * 1000)
            )?.length || 0,
        };

        return NextResponse.json({
          alerts: alerts || [],
          stats,
          filters: {
            status,
            alertType,
            limit,
          },
          projectId,
        });
      } catch (error) {
        console.error("API error:", error);

        if (error instanceof z.ZodError) {
          return NextResponse.json(
            {
              error: "Validation failed",
              code: "VALIDATION_ERROR",
              details: error.errors.map(e => ({
                field: e.path.join("."),
                message: e.message,
              })),
            },
            { status: 400 }
          );
        }

        return createApiErrorResponse("Internal server error", 500);
      }
    });
  });
}

// Helper functions
function getDefaultThreshold(alertType: string): number {
  switch (alertType) {
    case "ranking_change":
      return 5; // positions
    case "traffic_change":
      return 20; // percentage
    case "new_content":
      return 1; // count
    case "keyword_opportunity":
      return 70; // opportunity score
    case "technical_issue":
      return 1; // count
    default:
      return 0;
  }
}

interface AlertParams {
  direction?: "up" | "down" | "both";
  minimumPositions?: number;
  timeWindow?: string;
  contentTypes?: string[];
  includeUpdates?: boolean;
  minSearchVolume?: number;
  maxDifficulty?: number;
  issueTypes?: string[];
}

function buildAlertConfig(
  alertType: string,
  params: AlertParams
): Record<string, unknown> {
  const config: Record<string, unknown> = {
    type: alertType,
  };

  switch (alertType) {
    case "ranking_change":
      config["direction"] = params.direction || "both"; // 'up', 'down', 'both'
      config["minimumPositions"] = params.minimumPositions || 5;
      break;
    case "traffic_change":
      config["direction"] = params.direction || "both";
      config["timeWindow"] = params.timeWindow || "7d";
      break;
    case "new_content":
      config["contentTypes"] = params.contentTypes || ["blog", "page"];
      config["includeUpdates"] = params.includeUpdates || false;
      break;
    case "keyword_opportunity":
      config["minSearchVolume"] = params.minSearchVolume || 100;
      config["maxDifficulty"] = params.maxDifficulty || 70;
      break;
    case "technical_issue":
      config["issueTypes"] = params.issueTypes || [
        "broken_links",
        "slow_loading",
        "404_errors",
      ];
      break;
  }

  return config;
}

interface Alert {
  id: string;
  alert_type: string;
  alert_config?: Record<string, unknown>;
  threshold?: number;
}

async function testAlert(
  supabase: Awaited<ReturnType<typeof createClient>>,
  alert: Alert,
  userId: string
): Promise<{
  success: boolean;
  wouldTrigger?: boolean;
  testData?: unknown;
  condition?: Record<string, unknown>;
  error?: string;
}> {
  try {
    // Simulate alert trigger based on type
    const testData = generateTestData(alert.alert_type);

    // Check if alert would trigger
    const shouldTrigger = evaluateAlertCondition(alert, testData);

    if (shouldTrigger) {
      // Log test trigger
      await supabase.from("user_events").insert({
        user_id: userId,
        event_type: "alert_test_triggered",
        event_data: {
          alert_id: alert.id,
          alert_type: alert.alert_type,
          test_data: testData,
        },
      });
    }

    return {
      success: true,
      wouldTrigger: shouldTrigger,
      testData,
      condition: alert.alert_config || {},
    };
  } catch (error) {
    console.error("Error testing alert:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

function generateTestData(alertType: string): Record<string, unknown> {
  switch (alertType) {
    case "ranking_change":
      return {
        keyword: "test keyword",
        oldPosition: 15,
        newPosition: 8,
        change: -7,
      };
    case "traffic_change":
      return {
        oldTraffic: 1000,
        newTraffic: 1300,
        change: 30,
        timeWindow: "7d",
      };
    case "new_content":
      return {
        contentCount: 3,
        contentTypes: ["blog"],
        detectedAt: new Date().toISOString(),
      };
    default:
      return {};
  }
}

function evaluateAlertCondition(
  alert: Alert,
  testData: Record<string, unknown>
): boolean {
  const threshold = alert.threshold || 0;

  switch (alert.alert_type) {
    case "ranking_change":
      return Math.abs(Number(testData["change"]) || 0) >= threshold;
    case "traffic_change":
      return Math.abs(Number(testData["change"]) || 0) >= threshold;
    case "new_content":
      return Number(testData["contentCount"]) >= threshold;
    default:
      return false;
  }
}
