/**
 * Enhanced AI Content Suggestions API Route
 * Uses the enhanced OpenAI service with comprehensive error handling
 * Provides intelligent content recommendations with fallback strategies
 */

import { NextRequest, NextResponse } from "next/server";
import { enhancedOpenAIService } from "@/lib/openai-enhanced";
import { getCurrentUser } from "@/lib/auth/session";

interface ContentSuggestionsRequest {
  topic: string;
  targetAudience?: string;
  contentType?:
    | "blog_post"
    | "video"
    | "infographic"
    | "social_post"
    | "email"
    | "landing_page";
  industry?: string;
  tone?: "professional" | "casual" | "technical" | "marketing" | "educational";
  options?: {
    count?: number; // Number of suggestions to generate
    includeKeywords?: boolean;
    includeOutline?: boolean;
    competitorAnalysis?: boolean;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser();

    // Parse request body
    const body: ContentSuggestionsRequest = await request.json();
    const {
      topic,
      targetAudience = "general audience",
      contentType = "blog_post",
      industry = "general",
      tone = "professional",
      options = {},
    } = body;

    // Validate input
    if (!topic || typeof topic !== "string") {
      return NextResponse.json(
        { error: "Valid topic is required for content suggestions" },
        { status: 400 }
      );
    }

    if (topic.length > 500) {
      return NextResponse.json(
        { error: "Topic too long. Maximum 500 characters allowed." },
        { status: 400 }
      );
    }

    if (topic.length < 3) {
      return NextResponse.json(
        { error: "Topic too short. Minimum 3 characters required." },
        { status: 400 }
      );
    }

    const count = Math.min(options.count || 5, 10); // Max 10 suggestions

    console.log(`🤖 Enhanced AI Content Suggestions API called:`, {
      topic,
      targetAudience,
      contentType,
      industry,
      tone,
      count,
      userId: user?.id,
      timestamp: new Date().toISOString(),
    });

    // Create enhanced prompt for content suggestions
    const enhancedPrompt = `Generate ${count} creative and engaging content suggestions for the topic "${topic}" in the ${industry} industry.

Target Audience: ${targetAudience}
Content Type: ${contentType}
Tone: ${tone}

Please provide suggestions in JSON format:
{
  "suggestions": [
    {
      "title": "Compelling content title",
      "type": "${contentType}",
      "description": "Brief description explaining the content concept",
      "keywords": ["relevant", "keywords", "for", "seo"],
      "estimated_engagement": "high|medium|low",
      "difficulty": "easy|medium|hard",
      "target_audience_fit": "excellent|good|fair",
      ${options.includeOutline ? '"outline": ["Main point 1", "Main point 2", "Main point 3"],' : ""}
      "unique_angle": "What makes this content unique"
    }
  ],
  "strategy_notes": "Overall content strategy recommendations",
  "trending_topics": ["related", "trending", "topics"],
  "competitor_gaps": ["opportunities", "to", "differentiate"]
}`;

    // Use the enhanced OpenAI service
    const response = await enhancedOpenAIService.chatCompletion({
      messages: [
        {
          role: "system",
          content: `You are an expert content marketing strategist with deep knowledge of ${industry} industry trends, audience behavior, and content performance. Generate creative, data-driven content suggestions that will engage the target audience and drive results.`,
        },
        {
          role: "user",
          content: enhancedPrompt,
        },
      ],
      model: "gpt-4o-mini", // Cost-effective model for content suggestions
      temperature: 0.7, // Higher creativity for content ideas
      maxTokens: 2000,
      responseFormat: { type: "json_object" },
    });

    if (!response.success || !response.data) {
      throw new Error(
        response.error?.message || "Failed to generate content suggestions"
      );
    }

    // Parse the JSON response
    let suggestions;
    try {
      suggestions = JSON.parse(response.data.content);
    } catch (parseError) {
      throw new Error("Invalid JSON response from AI service");
    }

    console.log(`✅ Enhanced AI Content Suggestions completed:`, {
      topic,
      suggestionsCount: suggestions.suggestions?.length || 0,
      tokensUsed: response.metadata.tokensUsed,
      success: true,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      suggestions: suggestions.suggestions || [],
      strategy: {
        notes: suggestions.strategy_notes || "",
        trending_topics: suggestions.trending_topics || [],
        competitor_gaps: suggestions.competitor_gaps || [],
      },
      metadata: {
        topic,
        targetAudience,
        contentType,
        industry,
        tone,
        count: suggestions.suggestions?.length || 0,
        tokensUsed: response.metadata.tokensUsed,
        estimatedCost: response.metadata.estimatedCost,
        responseTime: response.metadata.responseTime,
        timestamp: new Date().toISOString(),
        userId: user?.id,
      },
    });
  } catch (error: any) {
    console.error("❌ Enhanced AI Content Suggestions API error:", error);

    // Enhanced error handling with specific error types
    if (
      error.message.includes("quota") ||
      error.message.includes("insufficient_quota")
    ) {
      return NextResponse.json(
        {
          error:
            "AI content generation quota exceeded. Please try again later.",
          code: "QUOTA_EXCEEDED",
          retryAfter: 3600,
          fallback: {
            suggestions: [
              {
                title: "Content Ideas for Your Topic",
                type: "blog_post",
                description:
                  "AI service is temporarily unavailable. Consider researching trending topics in your industry and creating original content around current events or frequently asked questions.",
                keywords: ["content", "marketing", "strategy"],
                estimated_engagement: "medium",
                difficulty: "medium",
                target_audience_fit: "good",
                unique_angle: "Manual content planning approach",
              },
            ],
            strategy_notes:
              "While AI suggestions are unavailable, focus on audience research, competitor analysis, and trending topics in your industry.",
          },
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
          retryAfter: 60,
        },
        { status: 429 }
      );
    }

    if (
      error.message.includes("timeout") ||
      error.message.includes("Timeout")
    ) {
      return NextResponse.json(
        {
          error: "Content suggestion request timed out. Please try again.",
          code: "TIMEOUT",
          suggestion: "Try with a more specific topic or simpler requirements",
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
          "AI content suggestion service temporarily unavailable. Please try again later.",
        code: "SERVICE_UNAVAILABLE",
      },
      { status: 503 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeMetrics = searchParams.get("metrics") === "true";

    if (includeMetrics) {
      // Get service health and metrics
      const healthCheck = await enhancedOpenAIService.healthCheck();
      const metrics = enhancedOpenAIService.getMetrics();

      return NextResponse.json({
        service: "Enhanced AI Content Suggestions",
        status: healthCheck.status,
        metrics: {
          totalRequests: metrics.totalRequests,
          successfulRequests: metrics.successfulRequests,
          errorRate: metrics.errorRate,
          averageResponseTime: metrics.averageResponseTime,
          tokenUsage: metrics.tokenUsage,
          modelUsage: metrics.modelUsage,
        },
        recommendations: healthCheck.recommendations,
        timestamp: new Date().toISOString(),
      });
    }

    // Return available content types and options
    return NextResponse.json({
      service: "Enhanced AI Content Suggestions",
      availableContentTypes: [
        "blog_post",
        "video",
        "infographic",
        "social_post",
        "email",
        "landing_page",
      ],
      availableTones: [
        "professional",
        "casual",
        "technical",
        "marketing",
        "educational",
      ],
      maxSuggestions: 10,
      maxTopicLength: 500,
      features: [
        "SEO keyword integration",
        "Audience targeting",
        "Industry-specific suggestions",
        "Trend analysis",
        "Competitor gap identification",
        "Content outline generation",
      ],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting AI suggestions service info:", error);
    return NextResponse.json(
      { error: "Unable to retrieve service information" },
      { status: 500 }
    );
  }
}
