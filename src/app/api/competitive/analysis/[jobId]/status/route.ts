/**
 * Competitive Intelligence API - Analysis Status
 * RESTful API endpoint for checking competitive analysis job status
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type {
  AnalysisStatusResponse,
  CompetitiveIntelligenceResponse,
} from "@/lib/competitive/types";

const supabase = createClient(
  process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
  process.env["SUPABASE_SECRET_KEY"]!
);

/**
 * GET /api/competitive/analysis/[jobId]/status
 * Get the current status of a competitive analysis job
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const resolvedParams = await params;
    const jobId = resolvedParams.jobId;

    if (!jobId || typeof jobId !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid job ID",
          metadata: {
            timestamp: new Date(),
            version: "1.0.0",
            processingTime: 0,
          },
        } as CompetitiveIntelligenceResponse,
        { status: 400 }
      );
    }

    // Get job status from queue
    const { jobQueue } = await import("@/lib/jobs/queue");
    const job = await jobQueue.getJob(jobId);

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          error: "Job not found",
          metadata: {
            timestamp: new Date(),
            version: "1.0.0",
            processingTime: 0,
          },
        } as CompetitiveIntelligenceResponse,
        { status: 404 }
      );
    }

    // Get analysis results from database if completed
    let results = null;
    if (job.status === "completed") {
      const { data: analysisResult } = await supabase
        .from("competitive_analysis_results")
        .select("*")
        .eq("job_id", jobId)
        .single();

      if (analysisResult) {
        results = {
          id: analysisResult.id,
          projectId: analysisResult.project_id,
          competitorId: analysisResult.competitor_id,
          analysisType: analysisResult.analysis_type,
          timestamp: new Date(analysisResult.timestamp),
          status: analysisResult.status,
          progress: analysisResult.progress,
          data: analysisResult.data,
          confidence: analysisResult.confidence,
          metadata: analysisResult.metadata,
        };
      }
    }

    // Calculate estimated time remaining
    let estimatedTimeRemaining: number | undefined;
    if (job.status === "processing" && job.type === "competitive-analysis") {
      const { CompetitiveAnalysisProcessor } = await import(
        "@/lib/jobs/processors/competitive-analysis"
      );
      const processor = new CompetitiveAnalysisProcessor();
      const totalEstimatedTime = processor.estimateProcessingTime(
        job.data as import("@/lib/jobs/types").CompetitiveAnalysisJobData
      );
      const elapsedTime = Date.now() - job.createdAt.getTime();
      const progressRatio = job.progress / 100;

      if (progressRatio > 0) {
        const estimatedTotalTime = elapsedTime / progressRatio;
        estimatedTimeRemaining = Math.max(
          0,
          Math.round((estimatedTotalTime - elapsedTime) / 1000)
        );
      } else {
        estimatedTimeRemaining = Math.round(totalEstimatedTime);
      }
    }

    // Determine current step based on progress
    let currentStep = "Initializing...";
    if (job.status === "pending") {
      currentStep = "Queued for processing";
    } else if (job.status === "processing") {
      if (job.progress < 10) {
        currentStep = "Initializing competitive analysis...";
      } else if (job.progress < 20) {
        currentStep = "Loading competitor information...";
      } else if (job.progress < 50) {
        currentStep = "Analyzing competitive data...";
      } else if (job.progress < 85) {
        currentStep = "Processing analysis results...";
      } else if (job.progress < 95) {
        currentStep = "Generating competitive alerts and insights...";
      } else {
        currentStep = "Finalizing analysis...";
      }
    } else if (job.status === "completed") {
      currentStep = "Analysis completed successfully";
    } else if (job.status === "failed") {
      currentStep = "Analysis failed";
    }

    // Use progress message from job if available
    if (job.progressMessage) {
      currentStep = job.progressMessage;
    }

    const response: AnalysisStatusResponse = {
      jobId: job.id,
      status:
        job.status === "processing"
          ? "processing"
          : job.status === "completed"
            ? "completed"
            : job.status === "failed"
              ? "failed"
              : "pending",
      progress: job.progress,
      ...(estimatedTimeRemaining !== undefined && { estimatedTimeRemaining }),
      ...(currentStep && { currentStep }),
      ...(results && { results }),
    };

    return NextResponse.json({
      success: true,
      data: response,
      metadata: {
        timestamp: new Date(),
        version: "1.0.0",
        processingTime: 0,
      },
    } as CompetitiveIntelligenceResponse<AnalysisStatusResponse>);
  } catch (error) {
    console.error("Error getting analysis status:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        metadata: {
          timestamp: new Date(),
          version: "1.0.0",
          processingTime: 0,
        },
      } as CompetitiveIntelligenceResponse,
      { status: 500 }
    );
  }
}
