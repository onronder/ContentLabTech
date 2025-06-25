import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUser,
  createClient,
  validateProjectAccess,
  createErrorResponse,
} from "@/lib/auth/session";

interface ImplementRecommendationsRequest {
  contentId: string;
  projectId: string;
  recommendationIds: string[];
  options?: {
    autoApply?: boolean;
    reviewRequired?: boolean;
    notifyTeam?: boolean;
  };
}

interface RecommendationData {
  suggested_title?: string;
  suggested_meta_description?: string;
  suggested_keywords?: string[];
  improved_content?: string;
  improved_structure?: string;
  suggested_links?: Array<{
    anchor_text?: string;
    url?: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return createErrorResponse("Authentication required", 401);
    }

    // Parse request body
    const body: ImplementRecommendationsRequest = await request.json();
    const { contentId, projectId, recommendationIds, options = {} } = body;

    if (!contentId || !projectId || !recommendationIds?.length) {
      return createErrorResponse(
        "Content ID, project ID, and recommendation IDs are required",
        400
      );
    }

    // Validate project access
    const hasAccess = await validateProjectAccess(projectId, "member");
    if (!hasAccess) {
      return createErrorResponse("Insufficient permissions", 403);
    }

    const supabase = await createClient();

    // Get content item
    const { data: content, error: contentError } = await supabase
      .from("content_items")
      .select("*")
      .eq("id", contentId)
      .eq("project_id", projectId)
      .single();

    if (contentError || !content) {
      return createErrorResponse("Content not found", 404);
    }

    // Get recommendations to implement
    const { data: recommendations, error: recommendationsError } =
      await supabase
        .from("content_recommendations")
        .select("*")
        .in("id", recommendationIds)
        .eq("content_id", contentId);

    if (recommendationsError || !recommendations?.length) {
      return createErrorResponse("Recommendations not found", 404);
    }

    const results = [];
    let hasErrors = false;

    // Process each recommendation
    for (const recommendation of recommendations) {
      try {
        const recommendationData =
          (recommendation.recommendation_data as RecommendationData) || {};
        const updatedContent = { ...content };
        let applied = false;

        // Apply recommendation based on type
        switch (recommendation.recommendation_type) {
          case "title_optimization":
            if (recommendationData.suggested_title) {
              updatedContent.title = recommendationData.suggested_title;
              applied = true;
            }
            break;

          case "meta_description":
            if (recommendationData.suggested_meta_description) {
              updatedContent.meta_description =
                recommendationData.suggested_meta_description;
              applied = true;
            }
            break;

          case "keyword_optimization":
            if (recommendationData.suggested_keywords) {
              const currentKeywords = content.focus_keywords || [];
              const newKeywords = [
                ...currentKeywords,
                ...recommendationData.suggested_keywords,
              ];
              updatedContent.focus_keywords = [...new Set(newKeywords)]; // Remove duplicates
              applied = true;
            }
            break;

          case "content_improvement":
            if (recommendationData.improved_content) {
              updatedContent.content = recommendationData.improved_content;
              applied = true;
            }
            break;

          case "structure_optimization":
            if (recommendationData.improved_structure) {
              // Update headings, paragraph structure, etc.
              updatedContent.content = recommendationData.improved_structure;
              applied = true;
            }
            break;

          case "internal_linking":
            if (
              recommendationData.suggested_links &&
              Array.isArray(recommendationData.suggested_links)
            ) {
              // Add internal links to content
              let contentWithLinks = updatedContent.content;
              recommendationData.suggested_links.forEach(link => {
                if (
                  link.anchor_text &&
                  link.url &&
                  typeof link.anchor_text === "string" &&
                  typeof link.url === "string"
                ) {
                  contentWithLinks = contentWithLinks.replace(
                    new RegExp(`\\b${link.anchor_text}\\b`, "gi"),
                    `<a href="${link.url}">${link.anchor_text}</a>`
                  );
                }
              });
              updatedContent.content = contentWithLinks;
              applied = true;
            }
            break;

          default:
            // Custom recommendation type - store in content metadata
            if (
              !updatedContent.metadata ||
              typeof updatedContent.metadata !== "object"
            ) {
              updatedContent.metadata = {};
            }

            const metadata = updatedContent.metadata as Record<string, unknown>;
            if (!Array.isArray(metadata["applied_recommendations"])) {
              metadata["applied_recommendations"] = [];
            }

            (
              metadata["applied_recommendations"] as Array<
                Record<string, unknown>
              >
            ).push({
              id: recommendation.id,
              type: recommendation.recommendation_type,
              data: recommendationData,
              applied_at: new Date().toISOString(),
              applied_by: user.id,
            });
            applied = true;
            break;
        }

        if (applied) {
          // Update content in database
          const { error: updateError } = await supabase
            .from("content_items")
            .update({
              ...updatedContent,
              updated_at: new Date().toISOString(),
            })
            .eq("id", contentId);

          if (updateError) {
            console.error("Error updating content:", updateError);
            hasErrors = true;
            results.push({
              recommendationId: recommendation.id,
              success: false,
              error: "Failed to update content",
            });
            continue;
          }

          // Mark recommendation as implemented
          const { error: markError } = await supabase
            .from("content_recommendations")
            .update({
              status: "implemented",
              implemented_at: new Date().toISOString(),
              implemented_by: user.id,
            })
            .eq("id", recommendation.id);

          if (markError) {
            console.error(
              "Error marking recommendation as implemented:",
              markError
            );
          }

          // Log implementation in optimization sessions
          await supabase.from("optimization_sessions").insert({
            content_id: contentId,
            session_type: "recommendation_implementation",
            ai_model: "manual",
            optimization_score: recommendation.impact_score || 0,
            status: "completed",
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            processing_time_ms: 0,
            tokens_used: 0,
            cost_usd: 0,
            input_data: {
              recommendation_id: recommendation.id,
              recommendation_type: recommendation.recommendation_type,
            },
            output_data: {
              changes_applied: recommendationData,
              applied_by: user.id,
            },
          });

          results.push({
            recommendationId: recommendation.id,
            success: true,
            changes: recommendationData,
          });
        } else {
          results.push({
            recommendationId: recommendation.id,
            success: false,
            error: "Unable to apply recommendation - no valid changes found",
          });
        }
      } catch (error) {
        console.error("Error processing recommendation:", error);
        hasErrors = true;
        results.push({
          recommendationId: recommendation.id,
          success: false,
          error: "Processing failed",
        });
      }
    }

    // Recalculate content scores after changes
    try {
      await supabase.functions.invoke("content-analysis", {
        body: {
          contentId,
          analysisType: "full",
          updateScores: true,
        },
      });
    } catch (error) {
      console.error("Error recalculating content scores:", error);
    }

    // Send team notification if requested
    if (options.notifyTeam) {
      try {
        const successCount = results.filter(r => r.success).length;
        if (successCount > 0) {
          await supabase.functions.invoke("send-email", {
            body: {
              template: "recommendation_implemented",
              data: {
                contentTitle: content.title,
                implementedCount: successCount,
                totalCount: recommendationIds.length,
                implementedBy: user.email,
              },
              teamId: content.project?.team_id,
            },
          });
        }
      } catch (error) {
        console.error("Error sending team notification:", error);
      }
    }

    return NextResponse.json({
      success: !hasErrors,
      results,
      summary: {
        total: recommendationIds.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      },
      contentId,
      updatedAt: new Date().toISOString(),
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get("contentId");
    const status = searchParams.get("status") || "pending";

    if (!contentId) {
      return createErrorResponse("Content ID is required", 400);
    }

    const supabase = await createClient();

    // Get content and verify access
    const { data: content, error: contentError } = await supabase
      .from("content_items")
      .select(
        `
        id,
        project_id,
        project:projects (
          team_id
        )
      `
      )
      .eq("id", contentId)
      .single();

    if (contentError || !content) {
      return createErrorResponse("Content not found", 404);
    }

    // Check team access
    const hasAccess = await validateProjectAccess(content.project_id, "viewer");
    if (!hasAccess) {
      return createErrorResponse("Insufficient permissions", 403);
    }

    // Get recommendations
    const { data: recommendations, error: recommendationsError } =
      await supabase
        .from("content_recommendations")
        .select(
          `
        id,
        recommendation_type,
        recommendation_text,
        impact_score,
        confidence_score,
        priority,
        status,
        implemented_at,
        implemented_by,
        recommendation_data,
        created_at
      `
        )
        .eq("content_id", contentId)
        .eq("status", status)
        .order("created_at", { ascending: false });

    if (recommendationsError) {
      return createErrorResponse("Failed to fetch recommendations", 500);
    }

    return NextResponse.json({
      recommendations: recommendations || [],
      contentId,
      status,
    });
  } catch (error) {
    console.error("API error:", error);
    return createErrorResponse("Internal server error", 500);
  }
}
