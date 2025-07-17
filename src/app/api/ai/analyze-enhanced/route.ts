/**
 * Enhanced AI Analysis API Route
 * Uses the enhanced OpenAI service with comprehensive error handling
 * Addresses high error rate (6.63%) with robust retry logic and circuit breakers
 */

import { NextRequest, NextResponse } from "next/server";
import { enhancedOpenAIService } from "@/lib/openai-enhanced";
import { getCurrentUser } from "@/lib/auth/session";

interface AnalyzeContentRequest {
  content: string;
  analysisType?: "general" | "seo" | "competitive";
  options?: {
    includeRecommendations?: boolean;
    targetKeywords?: string[];
    competitorUrls?: string[];
    maxTokens?: number;
    temperature?: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Get current user (optional for now, but good for tracking)
    const user = await getCurrentUser();

    // Parse request body
    const body: AnalyzeContentRequest = await request.json();
    const { content, analysisType = "general", options = {} } = body;

    // Validate input
    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Valid content is required for analysis" },
        { status: 400 }
      );
    }

    if (content.length > 20000) {
      return NextResponse.json(
        { error: "Content too long. Maximum 20,000 characters allowed." },
        { status: 400 }
      );
    }

    if (content.length < 10) {
      return NextResponse.json(
        { error: "Content too short. Minimum 10 characters required." },
        { status: 400 }
      );
    }

    console.log(`🤖 Enhanced AI Analysis API called:`, {
      contentLength: content.length,
      analysisType,
      userId: user?.id,
      timestamp: new Date().toISOString(),
    });

    // Perform analysis with enhanced error handling
    const analysisResult = await enhancedOpenAIService.analyzeContent(
      content,
      analysisType
    );

    console.log(`✅ Enhanced AI Analysis completed:`, {
      analysisType,
      success: true,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
      metadata: {
        analysisType,
        contentLength: content.length,
        timestamp: new Date().toISOString(),
        userId: user?.id,
      },
    });
  } catch (error: any) {
    console.error("❌ Enhanced AI Analysis API error:", error);

    // Enhanced error handling with specific error types
    if (
      error.message.includes("quota") ||
      error.message.includes("insufficient_quota")
    ) {
      return NextResponse.json(
        {
          error:
            "AI analysis quota exceeded. Please try again later or contact support.",
          code: "QUOTA_EXCEEDED",
          retryAfter: 3600, // 1 hour
        },
        { status: 429 }
      );
    }

    if (
      error.message.includes("rate limit") ||
      error.message.includes("Rate limit")
    ) {
      return NextResponse.json(
        {
          error: "AI service rate limit exceeded. Please wait before retrying.",
          code: "RATE_LIMITED",
          retryAfter: 60, // 1 minute
        },
        { status: 429 }
      );
    }

    if (
      error.message.includes("authentication") ||
      error.message.includes("unauthorized")
    ) {
      return NextResponse.json(
        {
          error: "AI service configuration error. Please contact support.",
          code: "AUTHENTICATION_ERROR",
        },
        { status: 503 }
      );
    }

    if (
      error.message.includes("timeout") ||
      error.message.includes("Timeout")
    ) {
      return NextResponse.json(
        {
          error:
            "AI analysis request timed out. Please try again with shorter content.",
          code: "TIMEOUT",
          suggestion: "Try analyzing smaller chunks of content",
        },
        { status: 408 }
      );
    }

    if (error.message.includes("Invalid JSON")) {
      return NextResponse.json(
        {
          error: "AI service returned invalid response. Please try again.",
          code: "INVALID_RESPONSE",
        },
        { status: 502 }
      );
    }

    // Generic error handling
    return NextResponse.json(
      {
        error:
          "AI analysis service temporarily unavailable. Please try again later.",
        code: "SERVICE_UNAVAILABLE",
      },
      { status: 503 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get service health and metrics
    const healthCheck = await enhancedOpenAIService.healthCheck();
    const metrics = enhancedOpenAIService.getMetrics();

    return NextResponse.json({
      service: "Enhanced OpenAI Analysis",
      status: healthCheck.status,
      metrics: {
        totalRequests: metrics.totalRequests,
        successfulRequests: metrics.successfulRequests,
        errorRate: metrics.errorRate,
        averageResponseTime: metrics.averageResponseTime,
        circuitBreakerState: metrics.circuitBreakerMetrics.state,
        tokenUsage: {
          totalTokens: metrics.tokenUsage.totalTokens,
          estimatedCost: metrics.tokenUsage.estimatedCost,
          averageTokensPerRequest: metrics.tokenUsage.averageTokensPerRequest,
        },
      },
      recommendations: healthCheck.recommendations,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting AI service status:", error);
    return NextResponse.json(
      { error: "Unable to retrieve service status" },
      { status: 500 }
    );
  }
}
