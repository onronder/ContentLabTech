import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUser,
  createClient,
  validateProjectAccess,
  createErrorResponse,
} from "@/lib/auth/session";

interface PredictRequest {
  projectId: string;
  action: "predict" | "batch_predict" | "model_status";
  params: {
    contentId?: string;
    contentIds?: string[];
    timeframe?: number;
    analysisType?: "performance" | "ranking" | "engagement" | "conversion";
    includeConfidence?: boolean;
    generateInsights?: boolean;
    modelVersion?: string;
  };
}

interface PredictionResult {
  contentId: string;
  prediction: {
    pageviews?: number;
    organic_traffic?: number;
    conversion_rate?: number;
    confidence_score?: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return createErrorResponse("Authentication required", 401);
    }

    // Parse request body
    const body: PredictRequest = await request.json();
    const { projectId, action, params } = body;

    if (!projectId || !action) {
      return createErrorResponse("Project ID and action are required", 400);
    }

    // Validate project access
    const hasAccess = await validateProjectAccess(projectId, "viewer");
    if (!hasAccess) {
      return createErrorResponse("Insufficient permissions", 403);
    }

    const supabase = await createClient();

    let result;

    switch (action) {
      case "predict": {
        if (!params.contentId) {
          return createErrorResponse(
            "Content ID is required for predictions",
            400
          );
        }

        // Validate content access
        const { data: content, error: contentError } = await supabase
          .from("content_items")
          .select("id, title, project_id")
          .eq("id", params.contentId)
          .eq("project_id", projectId)
          .single();

        if (contentError || !content) {
          return createErrorResponse("Content not found", 404);
        }

        // Call the predictive analytics Edge Function
        const { data: prediction, error: predictionError } =
          await supabase.functions.invoke("predictive-analytics", {
            body: {
              action: "predict",
              projectId,
              contentId: params.contentId,
              timeframe: params.timeframe || 30,
              analysisType: params.analysisType || "performance",
              includeConfidence: params.includeConfidence !== false,
              generateInsights: params.generateInsights !== false,
              modelVersion: params.modelVersion || "v2.0.0",
            },
          });

        if (predictionError) {
          console.error("Prediction error:", predictionError);
          return createErrorResponse("Failed to generate prediction", 500);
        }

        // Store prediction in database
        if (prediction?.result) {
          await supabase.from("model_predictions").insert({
            project_id: projectId,
            content_id: params.contentId,
            model_type: "ml_performance_prediction",
            model_version: params.modelVersion || "v2.0.0",
            prediction_data: prediction.result,
            confidence_score: prediction.result.confidenceScore,
            prediction_date: new Date().toISOString(),
            created_by: user.id,
          });

          // Log prediction request
          await supabase.from("user_events").insert({
            user_id: user.id,
            event_type: "prediction_generated",
            event_data: {
              project_id: projectId,
              content_id: params.contentId,
              prediction_type: params.analysisType,
              timeframe: params.timeframe,
            },
          });
        }

        result = prediction?.result;
        break;
      }

      case "batch_predict": {
        if (!params.contentIds?.length) {
          return createErrorResponse(
            "Content IDs are required for batch predictions",
            400
          );
        }

        // Validate all content items belong to the project
        const { data: contents, error: contentsError } = await supabase
          .from("content_items")
          .select("id, title, project_id")
          .in("id", params.contentIds)
          .eq("project_id", projectId);

        if (contentsError || contents.length !== params.contentIds.length) {
          return createErrorResponse(
            "One or more content items not found",
            404
          );
        }

        // Generate predictions for each content item
        const batchPredictions = await Promise.allSettled(
          params.contentIds.map(async contentId => {
            const { data: prediction, error } = await supabase.functions.invoke(
              "predictive-analytics",
              {
                body: {
                  action: "predict",
                  projectId,
                  contentId,
                  timeframe: params.timeframe || 30,
                  analysisType: params.analysisType || "performance",
                  includeConfidence: params.includeConfidence !== false,
                  generateInsights: params.generateInsights !== false,
                  modelVersion: params.modelVersion || "v2.0.0",
                },
              }
            );

            if (error) {
              throw new Error(
                `Prediction failed for content ${contentId}: ${error.message}`
              );
            }

            // Store prediction
            if (prediction?.result) {
              await supabase.from("model_predictions").insert({
                project_id: projectId,
                content_id: contentId,
                model_type: "ml_performance_prediction",
                model_version: params.modelVersion || "v2.0.0",
                prediction_data: prediction.result,
                confidence_score: prediction.result.confidenceScore,
                prediction_date: new Date().toISOString(),
                created_by: user.id,
              });
            }

            return {
              contentId,
              prediction: prediction?.result,
            };
          })
        );

        const successful = batchPredictions
          .filter(p => p.status === "fulfilled")
          .map(p => (p as PromiseFulfilledResult<PredictionResult>).value);

        const failed = batchPredictions
          .filter(p => p.status === "rejected")
          .map(p => (p as PromiseRejectedResult).reason.message);

        result = {
          successful,
          failed,
          summary: {
            total: params.contentIds.length,
            successful: successful.length,
            failed: failed.length,
          },
        };

        // Log batch prediction
        await supabase.from("user_events").insert({
          user_id: user.id,
          event_type: "batch_prediction_generated",
          event_data: {
            project_id: projectId,
            content_count: params.contentIds.length,
            successful_count: successful.length,
            failed_count: failed.length,
          },
        });

        break;
      }

      case "model_status": {
        // Get model performance and status information
        const { data: modelInfo, error: modelError } =
          await supabase.functions.invoke("predictive-analytics", {
            body: {
              action: "model_status",
              projectId,
              modelVersion: params.modelVersion || "v2.0.0",
            },
          });

        if (modelError) {
          console.error("Model status error:", modelError);
          return createErrorResponse("Failed to get model status", 500);
        }

        // Get recent predictions for this project
        const { data: recentPredictions } = await supabase
          .from("model_predictions")
          .select("*")
          .eq("project_id", projectId)
          .eq("model_type", "ml_performance_prediction")
          .order("prediction_date", { ascending: false })
          .limit(10);

        result = {
          modelInfo: modelInfo?.result,
          recentPredictions: recentPredictions || [],
          projectId,
        };
        break;
      }

      default:
        return createErrorResponse("Invalid action specified", 400);
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
    return createErrorResponse("Internal server error", 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return createErrorResponse("Authentication required", 401);
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const contentId = searchParams.get("contentId");
    const modelType =
      searchParams.get("modelType") || "ml_performance_prediction";
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);

    if (!projectId) {
      return createErrorResponse("Project ID is required", 400);
    }

    // Validate project access
    const hasAccess = await validateProjectAccess(projectId, "viewer");
    if (!hasAccess) {
      return createErrorResponse("Insufficient permissions", 403);
    }

    const supabase = await createClient();

    // Build query
    let query = supabase
      .from("model_predictions")
      .select(
        `
        *,
        content:content_items (
          id,
          title,
          url,
          status
        )
      `
      )
      .eq("project_id", projectId)
      .eq("model_type", modelType)
      .order("prediction_date", { ascending: false })
      .limit(limit);

    if (contentId) {
      query = query.eq("content_id", contentId);
    }

    const { data: predictions, error } = await query;

    if (error) {
      console.error("Error fetching predictions:", error);
      return createErrorResponse("Failed to fetch predictions", 500);
    }

    // Get prediction summary statistics
    const { data: stats } = await supabase
      .from("model_predictions")
      .select("confidence_score, prediction_date")
      .eq("project_id", projectId)
      .eq("model_type", modelType)
      .gte(
        "prediction_date",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      );

    const avgConfidence =
      stats && stats.length > 0
        ? stats.reduce((sum, s) => sum + (s.confidence_score || 0), 0) /
          stats.length
        : 0;

    return NextResponse.json({
      predictions: predictions || [],
      summary: {
        total: predictions?.length || 0,
        avgConfidence: Math.round(avgConfidence),
        recentCount: stats ? stats.length : 0,
      },
      projectId,
      contentId,
      modelType,
    });
  } catch (error) {
    console.error("API error:", error);
    return createErrorResponse("Internal server error", 500);
  }
}
