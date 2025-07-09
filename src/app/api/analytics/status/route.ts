/**
 * Analytics Status API
 * Provides real-time status of analysis jobs and results
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  withApiAuth,
  createApiSuccessResponse,
  createApiErrorResponse,
  validateTeamAccess,
} from "@/lib/auth/api-auth";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { jobQueue } from "@/lib/jobs/queue";
import { analyticsCache, CacheKeys } from "@/lib/cache/analyticsCache";
import {
  createOptimizedResponse,
  detectOptimizationNeeds,
} from "@/lib/api/responseOptimization";
import {
  AppError,
  createDatabaseError,
  createErrorContext,
  createGracefulResponse,
} from "@/lib/errors/errorHandling";
import {
  gracefulDegradationManager,
  withGracefulDegradation,
} from "@/lib/resilience/gracefulDegradation";
// import { retryDatabaseOperation } from "@/lib/resilience/retryMechanism";

export const GET = withApiAuth(async (request: NextRequest, user) => {
  try {
    console.log("🚀 Analytics Status API GET - Starting request handling");
    console.log("👤 Authenticated user:", { id: user.id, email: user.email });

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const teamId = searchParams.get("teamId");
    const jobId = searchParams.get("jobId");

    if (!projectId && !jobId && !teamId) {
      return createApiErrorResponse(
        "Either projectId, teamId, or jobId is required",
        400,
        "INVALID_REQUEST"
      );
    }

    const supabase = createClient(
      process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
      process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // If specific job ID requested
    if (jobId) {
      const job = jobQueue.getJob(jobId);
      if (!job) {
        return createApiErrorResponse("Job not found", 404, "JOB_NOT_FOUND");
      }

      // Validate team access for the job's project
      const { data: project } = await supabase
        .from("projects")
        .select("team_id")
        .eq("id", job.data.projectId)
        .single();

      if (!project) {
        return createApiErrorResponse(
          "Project not found",
          404,
          "PROJECT_NOT_FOUND"
        );
      }

      const teamAccess = await validateTeamAccess(
        user.id,
        project.team_id,
        "viewer"
      );
      if (!teamAccess.hasAccess) {
        return createApiErrorResponse(
          teamAccess.error || "Insufficient permissions",
          403,
          "INSUFFICIENT_PERMISSIONS"
        );
      }

      const optimizationOptions = detectOptimizationNeeds(request);

      return createOptimizedResponse(
        {
          job: {
            id: job.id,
            type: job.type,
            status: job.status,
            progress: job.progress,
            progressMessage: job.progressMessage,
            createdAt: job.createdAt,
            completedAt: job.completedAt,
            error: job.error,
          },
        },
        optimizationOptions
      );
    }

    // If team ID requested, get all jobs for team projects
    if (teamId && !projectId) {
      // Get projects for this team
      const { data: teamProjects } = await supabase
        .from("projects")
        .select("id")
        .eq("team_id", teamId);

      if (!teamProjects?.length) {
        const optimizationOptions = detectOptimizationNeeds(request);

        return createOptimizedResponse(
          {
            teamId,
            jobs: [],
            results: {},
            queueStats: {
              total: 0,
              pending: 0,
              processing: 0,
              completed: 0,
              failed: 0,
              processing_capacity: 1,
            },
            summary: {
              totalJobs: 0,
              completedJobs: 0,
              failedJobs: 0,
              processingJobs: 0,
              pendingJobs: 0,
            },
          },
          optimizationOptions
        );
      }

      // Get all jobs for all projects in team
      const allProjectJobs = teamProjects.flatMap(project =>
        jobQueue.getProjectJobs(project.id)
      );

      // Get aggregated analysis results for all projects
      const teamAnalysisResults: Record<string, unknown> = {};
      for (const project of teamProjects) {
        const analysisResults = await withGracefulDegradation(
          () => getAnalysisResultsCached(supabase, project.id),
          () => getAnalysisResultsFromCache(project.id),
          { projectId: project.id, operationType: "analytics-results" }
        );

        if (Object.keys(analysisResults).length > 0) {
          teamAnalysisResults[project.id] = analysisResults;
        }
      }

      const queueStats = jobQueue.getStats();
      const optimizationOptions = detectOptimizationNeeds(request);

      const responseData = {
        teamId,
        projectCount: teamProjects.length,
        jobs: allProjectJobs.map(job => ({
          id: job.id,
          type: job.type,
          status: job.status,
          progress: job.progress,
          progressMessage: job.progressMessage,
          createdAt: job.createdAt,
          completedAt: job.completedAt,
          error: job.error,
          projectId: job.data.projectId,
        })),
        results: teamAnalysisResults,
        queueStats,
        summary: {
          totalJobs: allProjectJobs.length,
          completedJobs: allProjectJobs.filter(j => j.status === "completed")
            .length,
          failedJobs: allProjectJobs.filter(j => j.status === "failed").length,
          processingJobs: allProjectJobs.filter(j => j.status === "processing")
            .length,
          pendingJobs: allProjectJobs.filter(j => j.status === "pending")
            .length,
        },
      };

      return createOptimizedResponse(responseData, optimizationOptions);
    }

    // If project ID requested, get all jobs for project
    if (projectId) {
      // Validate project access
      const { data: project } = await supabase
        .from("projects")
        .select("team_id")
        .eq("id", projectId)
        .single();

      if (!project) {
        return createErrorResponse("Project not found", 404);
      }

      const hasAccess = await validateTeamAccess(project.team_id, "viewer");
      if (!hasAccess) {
        return createErrorResponse("Insufficient permissions", 403);
      }

      // Get all jobs for project
      const projectJobs = jobQueue.getProjectJobs(projectId);

      // Get analysis results with graceful degradation
      const analysisResults = await withGracefulDegradation(
        () => getAnalysisResultsCached(supabase, projectId),
        () => getAnalysisResultsFromCache(projectId),
        { projectId, operationType: "analytics-results" }
      );

      // Get queue statistics
      const queueStats = jobQueue.getStats();

      // Detect optimization needs for this request
      const optimizationOptions = detectOptimizationNeeds(request);

      const responseData = {
        projectId,
        jobs: projectJobs.map(job => ({
          id: job.id,
          type: job.type,
          status: job.status,
          progress: job.progress,
          progressMessage: job.progressMessage,
          createdAt: job.createdAt,
          completedAt: job.completedAt,
          error: job.error,
        })),
        results: analysisResults,
        queueStats,
        summary: {
          totalJobs: projectJobs.length,
          completedJobs: projectJobs.filter(j => j.status === "completed")
            .length,
          failedJobs: projectJobs.filter(j => j.status === "failed").length,
          processingJobs: projectJobs.filter(j => j.status === "processing")
            .length,
          pendingJobs: projectJobs.filter(j => j.status === "pending").length,
        },
      };

      return createOptimizedResponse(responseData, optimizationOptions);
    }

    // This shouldn't be reached due to validation above, but TypeScript needs it
    return createErrorResponse("Invalid request parameters", 400);
  } catch (error) {
    console.error("Analytics status API error:", error);

    const context = createErrorContext(request, {
      operation: "analytics-status",
      projectId: new URL(request.url).searchParams.get("projectId"),
    });

    // Handle different error types with appropriate responses
    if (error instanceof AppError) {
      // For certain errors, provide graceful degradation
      if (
        error.details.category === "database" ||
        error.details.category === "external_service"
      ) {
        const projectId = context.additionalData?.["projectId"] as string;
        if (projectId) {
          const degradationResult =
            await gracefulDegradationManager.handleAnalyticsFailure(
              projectId,
              error
            );

          return createGracefulResponse(error, {
            fallbackData: {
              projectId,
              jobs: [],
              results: degradationResult.data,
              queueStats: {
                total: 0,
                pending: 0,
                processing: 0,
                completed: 0,
                failed: 0,
                processing_capacity: 1,
              },
              summary: {
                totalJobs: 0,
                completedJobs: 0,
                failedJobs: 0,
                processingJobs: 0,
                pendingJobs: 0,
              },
              fallbackMode: true,
              message: degradationResult.userMessage,
            },
            userMessage: degradationResult.userMessage,
          });
        }
      }

      return createApiErrorResponse(
        error.details.userMessage,
        500,
        "ANALYTICS_ERROR"
      );
    }

    // Handle unknown errors
    const unknownError = createDatabaseError(error as Error, context);
    return createApiErrorResponse(
      unknownError.details.userMessage,
      500,
      "INTERNAL_ERROR"
    );
  }
});

/**
 * Get analysis results with intelligent caching
 */
async function getAnalysisResultsCached(
  supabase: SupabaseClient<Database>,
  projectId: string
) {
  const results: Record<string, unknown> = {};

  // Check cache first for complete results
  const cachedResults = analyticsCache.get(projectId, "complete-analytics");

  if (cachedResults) {
    return cachedResults;
  }

  try {
    // Content analysis results with caching
    let contentAnalysis = analyticsCache.get(
      projectId,
      CacheKeys.CONTENT_ANALYSIS
    );
    if (!contentAnalysis) {
      const { data: contentResults } = await supabase
        .from("content_analysis_results")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (contentResults?.[0]) {
        contentAnalysis = {
          overallScore: contentResults[0].overall_score,
          technicalSeo: contentResults[0].technical_seo,
          contentDepth: contentResults[0].content_depth,
          readability: contentResults[0].readability,
          semanticRelevance: contentResults[0].semantic_relevance,
          recommendations: contentResults[0].recommendations,
          lastUpdated: contentResults[0].created_at,
        };

        // Cache with content-specific TTL
        analyticsCache.set(
          projectId,
          CacheKeys.CONTENT_ANALYSIS,
          contentAnalysis
        );
      }
    }

    if (contentAnalysis) {
      results["contentAnalysis"] = contentAnalysis;
    }

    // SEO health results with caching
    let seoHealth = analyticsCache.get(projectId, CacheKeys.SEO_HEALTH);
    if (!seoHealth) {
      const { data: seoResults } = await supabase
        .from("seo_health_results")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (seoResults?.[0]) {
        seoHealth = {
          overallScore: seoResults[0].overall_score,
          technical: seoResults[0].technical,
          onPage: seoResults[0].on_page,
          performance: seoResults[0].performance,
          mobile: seoResults[0].mobile,
          criticalIssues: seoResults[0].critical_issues,
          recommendations: seoResults[0].recommendations,
          lastUpdated: seoResults[0].created_at,
        };

        // Cache with SEO-specific TTL
        analyticsCache.set(projectId, CacheKeys.SEO_HEALTH, seoHealth);
      }
    }

    if (seoHealth) {
      results["seoHealth"] = seoHealth;
    }

    // Performance analysis results with caching
    let performance = analyticsCache.get(projectId, CacheKeys.PERFORMANCE);
    if (!performance) {
      const { data: performanceResults } = await supabase
        .from("performance_analysis_results")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (performanceResults?.[0]) {
        performance = {
          overallScore: performanceResults[0].overall_score,
          coreWebVitals: {
            lcp: performanceResults[0].largest_contentful_paint,
            fid: performanceResults[0].first_input_delay,
            cls: performanceResults[0].cumulative_layout_shift,
          },
          speedIndex: performanceResults[0].speed_index,
          firstContentfulPaint: performanceResults[0].first_contentful_paint,
          recommendations: performanceResults[0].recommendations,
          lastUpdated: performanceResults[0].created_at,
        };

        // Cache with performance-specific TTL (shorter due to frequent changes)
        analyticsCache.set(projectId, CacheKeys.PERFORMANCE, performance);
      }
    }

    if (performance) {
      results["performance"] = performance;
    }

    // Competitive intelligence results with caching
    let competitive = analyticsCache.get(
      projectId,
      CacheKeys.COMPETITIVE_INTELLIGENCE
    );
    if (!competitive) {
      const { data: competitiveResults } = await supabase
        .from("competitive_intelligence_results")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (competitiveResults?.[0]) {
        competitive = {
          marketPosition: competitiveResults[0].market_position,
          competitiveScore: competitiveResults[0].competitive_score,
          opportunities: competitiveResults[0].opportunities,
          threats: competitiveResults[0].threats,
          strategicRecommendations:
            competitiveResults[0].strategic_recommendations,
          lastUpdated: competitiveResults[0].created_at,
        };

        // Cache with longer TTL for competitive data
        analyticsCache.set(
          projectId,
          CacheKeys.COMPETITIVE_INTELLIGENCE,
          competitive
        );
      }
    }

    if (competitive) {
      results["competitive"] = competitive;
    }

    // Industry benchmark results with caching
    let industryBenchmark = analyticsCache.get(
      projectId,
      CacheKeys.INDUSTRY_BENCHMARKING
    );
    if (!industryBenchmark) {
      const { data: benchmarkResults } = await supabase
        .from("industry_benchmark_results")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (benchmarkResults?.[0]) {
        industryBenchmark = {
          industryPercentile: benchmarkResults[0].industry_percentile,
          performanceRank: benchmarkResults[0].performance_rank,
          benchmarkScores: benchmarkResults[0].benchmark_scores,
          industryTrends: benchmarkResults[0].industry_trends,
          lastUpdated: benchmarkResults[0].created_at,
        };

        // Cache with longest TTL for industry data
        analyticsCache.set(
          projectId,
          CacheKeys.INDUSTRY_BENCHMARKING,
          industryBenchmark
        );
      }
    }

    if (industryBenchmark) {
      results["industryBenchmark"] = industryBenchmark;
    }

    // Cache the complete results for faster subsequent requests
    analyticsCache.set(projectId, "complete-analytics", results, {
      ttl: 10 * 60 * 1000, // 10 minutes for complete analytics
    });
  } catch (error) {
    console.error("Error fetching analysis results:", error);
  }

  return results;
}

/**
 * Fallback function to get analysis results from cache only
 */
async function getAnalysisResultsFromCache(
  projectId: string
): Promise<Record<string, unknown>> {
  const results: Record<string, unknown> = {};

  // Try to get data from cache
  const contentAnalysis = analyticsCache.get(
    projectId,
    CacheKeys.CONTENT_ANALYSIS
  );
  const seoHealth = analyticsCache.get(projectId, CacheKeys.SEO_HEALTH);
  const performance = analyticsCache.get(projectId, CacheKeys.PERFORMANCE);
  const competitive = analyticsCache.get(
    projectId,
    CacheKeys.COMPETITIVE_INTELLIGENCE
  );
  const industryBenchmark = analyticsCache.get(
    projectId,
    CacheKeys.INDUSTRY_BENCHMARKING
  );

  if (contentAnalysis) {
    results["contentAnalysis"] = { ...contentAnalysis, fallback: true };
  }
  if (seoHealth) {
    results["seoHealth"] = { ...seoHealth, fallback: true };
  }
  if (performance) {
    results["performance"] = { ...performance, fallback: true };
  }
  if (competitive) {
    results["competitive"] = { ...competitive, fallback: true };
  }
  if (industryBenchmark) {
    results["industryBenchmark"] = { ...industryBenchmark, fallback: true };
  }

  return results;
}
