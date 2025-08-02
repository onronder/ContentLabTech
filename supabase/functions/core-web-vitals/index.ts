/**
 * Core Web Vitals Analysis Edge Function
 * Google PageSpeed Insights API integration with comprehensive scoring
 */

import {
  handleCors,
  createResponse,
  createErrorResponse,
} from "../_shared/cors.ts";
import { getAuthUser, requireAuth } from "../_shared/auth.ts";
import {
  createDatabaseClient,
  getUserTeamAccess,
} from "../_shared/database.ts";

interface CoreWebVitalsRequest {
  projectId: string;
  url: string;
  strategy?: "mobile" | "desktop";
  includeOptimizationSuggestions?: boolean;
}

interface CoreWebVitalsMetrics {
  lcp: number; // Largest Contentful Paint (ms)
  fid: number; // First Input Delay (ms)
  cls: number; // Cumulative Layout Shift (score)
  fcp: number; // First Contentful Paint (ms)
  speedIndex: number; // Speed Index
}

interface CoreWebVitalsScores {
  lcp: number;
  fid: number;
  cls: number;
  fcp: number;
  speedIndex: number;
  overall: number;
}

interface OptimizationSuggestion {
  type: "critical" | "important" | "minor";
  category: "images" | "javascript" | "css" | "server" | "caching" | "fonts";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  effort: "low" | "medium" | "high";
  potentialSavings: {
    timeMs?: number;
    bytes?: number;
  };
  implementation: string;
}

interface CoreWebVitalsResult {
  url: string;
  strategy: "mobile" | "desktop";
  timestamp: string;
  metrics: CoreWebVitalsMetrics;
  scores: CoreWebVitalsScores;
  loadingExperience: {
    overall_category: "FAST" | "AVERAGE" | "SLOW";
    metrics: {
      LARGEST_CONTENTFUL_PAINT_MS: { category: string; percentile: number };
      FIRST_INPUT_DELAY_MS: { category: string; percentile: number };
      CUMULATIVE_LAYOUT_SHIFT_SCORE: { category: string; percentile: number };
    };
  };
  optimizationSuggestions: OptimizationSuggestion[];
  lighthouseData: any;
}

/**
 * Google's official Core Web Vitals thresholds
 */
const CORE_WEB_VITALS_THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000 }, // ms
  FID: { good: 100, needsImprovement: 300 }, // ms
  CLS: { good: 0.1, needsImprovement: 0.25 }, // score
  FCP: { good: 1800, needsImprovement: 3000 }, // ms
  SPEED_INDEX: { good: 3400, needsImprovement: 5800 }, // score
};

/**
 * Calculate Core Web Vitals scores based on Google's thresholds
 */
function calculateCoreWebVitalsScores(
  metrics: CoreWebVitalsMetrics
): CoreWebVitalsScores {
  const calculateScore = (
    value: number,
    thresholds: { good: number; needsImprovement: number }
  ) => {
    if (value <= thresholds.good) return 100;
    if (value <= thresholds.needsImprovement) {
      // Linear interpolation between 90 and 50
      const ratio =
        (value - thresholds.good) /
        (thresholds.needsImprovement - thresholds.good);
      return Math.round(90 - ratio * 40);
    }
    // Poor performance, score between 0-50
    const poorRatio = Math.min(
      1,
      (value - thresholds.needsImprovement) / thresholds.needsImprovement
    );
    return Math.round(50 - poorRatio * 50);
  };

  const scores = {
    lcp: calculateScore(metrics.lcp, CORE_WEB_VITALS_THRESHOLDS.LCP),
    fid: calculateScore(metrics.fid, CORE_WEB_VITALS_THRESHOLDS.FID),
    cls: calculateScore(metrics.cls, CORE_WEB_VITALS_THRESHOLDS.CLS),
    fcp: calculateScore(metrics.fcp, CORE_WEB_VITALS_THRESHOLDS.FCP),
    speedIndex: calculateScore(
      metrics.speedIndex,
      CORE_WEB_VITALS_THRESHOLDS.SPEED_INDEX
    ),
    overall: 0,
  };

  // Calculate weighted overall score
  // LCP (30%), FID (25%), CLS (25%), FCP (10%), Speed Index (10%)
  scores.overall = Math.round(
    scores.lcp * 0.3 +
      scores.fid * 0.25 +
      scores.cls * 0.25 +
      scores.fcp * 0.1 +
      scores.speedIndex * 0.1
  );

  return scores;
}

/**
 * Extract Core Web Vitals metrics from Lighthouse data
 */
function extractCoreWebVitalsMetrics(
  lighthouseData: any
): CoreWebVitalsMetrics {
  const audits = lighthouseData.audits || {};

  return {
    lcp: audits["largest-contentful-paint"]?.numericValue || 0,
    fid: audits["max-potential-fid"]?.numericValue || 0, // FID approximation
    cls: audits["cumulative-layout-shift"]?.numericValue || 0,
    fcp: audits["first-contentful-paint"]?.numericValue || 0,
    speedIndex: audits["speed-index"]?.numericValue || 0,
  };
}

/**
 * Generate optimization suggestions based on Lighthouse audits
 */
function generateOptimizationSuggestions(
  lighthouseData: any
): OptimizationSuggestion[] {
  const audits = lighthouseData.audits || {};
  const suggestions: OptimizationSuggestion[] = [];

  // Image optimization
  if (
    audits["unused-css-rules"]?.score !== null &&
    audits["unused-css-rules"].score < 0.9
  ) {
    suggestions.push({
      type: "important",
      category: "css",
      title: "Remove unused CSS",
      description:
        "Eliminate unused CSS rules to reduce render-blocking resources",
      impact: "medium",
      effort: "medium",
      potentialSavings: {
        timeMs: audits["unused-css-rules"].details?.overallSavingsMs || 0,
        bytes: audits["unused-css-rules"].details?.overallSavingsBytes || 0,
      },
      implementation:
        "Analyze CSS usage and remove unused rules, consider CSS tree-shaking",
    });
  }

  // JavaScript optimization
  if (
    audits["unused-javascript"]?.score !== null &&
    audits["unused-javascript"].score < 0.9
  ) {
    suggestions.push({
      type: "critical",
      category: "javascript",
      title: "Reduce unused JavaScript",
      description: "Remove unused JavaScript to improve load times",
      impact: "high",
      effort: "medium",
      potentialSavings: {
        timeMs: audits["unused-javascript"].details?.overallSavingsMs || 0,
        bytes: audits["unused-javascript"].details?.overallSavingsBytes || 0,
      },
      implementation:
        "Implement code splitting and lazy loading for JavaScript modules",
    });
  }

  // Image optimization
  if (
    audits["uses-optimized-images"]?.score !== null &&
    audits["uses-optimized-images"].score < 0.9
  ) {
    suggestions.push({
      type: "important",
      category: "images",
      title: "Optimize images",
      description:
        "Serve images in next-gen formats (WebP, AVIF) and properly sized",
      impact: "high",
      effort: "low",
      potentialSavings: {
        timeMs: audits["uses-optimized-images"].details?.overallSavingsMs || 0,
        bytes:
          audits["uses-optimized-images"].details?.overallSavingsBytes || 0,
      },
      implementation:
        "Convert images to WebP/AVIF format and implement responsive images",
    });
  }

  // Server response time
  if (
    audits["server-response-time"]?.score !== null &&
    audits["server-response-time"].score < 0.9
  ) {
    suggestions.push({
      type: "critical",
      category: "server",
      title: "Improve server response time",
      description: "Reduce server response time to improve initial page load",
      impact: "high",
      effort: "high",
      potentialSavings: {
        timeMs: audits["server-response-time"].numericValue || 0,
      },
      implementation:
        "Optimize server-side processing, implement caching, consider CDN",
    });
  }

  // Font optimization
  if (
    audits["font-display"]?.score !== null &&
    audits["font-display"].score < 1
  ) {
    suggestions.push({
      type: "minor",
      category: "fonts",
      title: "Optimize font loading",
      description: "Use font-display: swap to improve perceived performance",
      impact: "medium",
      effort: "low",
      potentialSavings: {
        timeMs: 100, // Estimated improvement
      },
      implementation: "Add font-display: swap to CSS font declarations",
    });
  }

  return suggestions.sort((a, b) => {
    const typeOrder = { critical: 3, important: 2, minor: 1 };
    const impactOrder = { high: 3, medium: 2, low: 1 };

    if (typeOrder[a.type] !== typeOrder[b.type]) {
      return typeOrder[b.type] - typeOrder[a.type];
    }
    return impactOrder[b.impact] - impactOrder[a.impact];
  });
}

/**
 * Call Google PageSpeed Insights API
 */
async function callPageSpeedInsightsAPI(
  url: string,
  strategy: "mobile" | "desktop"
): Promise<any> {
  const apiKey = Deno.env.get("GOOGLE_PAGESPEED_API_KEY");
  if (!apiKey) {
    throw new Error("Google PageSpeed Insights API key not configured");
  }

  const apiUrl = new URL(
    "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
  );
  apiUrl.searchParams.set("url", url);
  apiUrl.searchParams.set("key", apiKey);
  apiUrl.searchParams.set("strategy", strategy);
  apiUrl.searchParams.set("category", "PERFORMANCE");

  const response = await fetch(apiUrl.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `PageSpeed Insights API error: ${response.status} - ${errorText}`
    );
  }

  return await response.json();
}

/**
 * Store Core Web Vitals data in database
 */
async function storeCoreWebVitalsData(
  supabase: any,
  projectId: string,
  url: string,
  strategy: "mobile" | "desktop",
  metrics: CoreWebVitalsMetrics,
  scores: CoreWebVitalsScores,
  lighthouseData: any
): Promise<void> {
  const { error } = await supabase.from("core_web_vitals_history").insert({
    project_id: projectId,
    url: url,
    device_type: strategy,
    lcp_value: metrics.lcp,
    fid_value: metrics.fid,
    cls_value: metrics.cls,
    fcp_value: metrics.fcp,
    speed_index: metrics.speedIndex,
    lcp_score: scores.lcp,
    fid_score: scores.fid,
    cls_score: scores.cls,
    fcp_score: scores.fcp,
    speed_index_score: scores.speedIndex,
    overall_performance_score: scores.overall,
    lighthouse_data: lighthouseData,
  });

  if (error) {
    console.error("Database error:", error);
    throw new Error(`Failed to store Core Web Vitals data: ${error.message}`);
  }
}

/**
 * Main handler function
 */
async function handleCoreWebVitalsAnalysis(
  request: Request
): Promise<Response> {
  try {
    // Handle CORS
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    // Authentication
    const user = await getAuthUser(request);
    if (!user) {
      return createErrorResponse("Authentication required", 401);
    }

    // Parse request
    const body: CoreWebVitalsRequest = await request.json();
    const {
      projectId,
      url,
      strategy = "mobile",
      includeOptimizationSuggestions = true,
    } = body;

    if (!projectId || !url) {
      return createErrorResponse(
        "Missing required fields: projectId, url",
        400
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return createErrorResponse("Invalid URL format", 400);
    }

    // Create database client
    const supabase = createDatabaseClient();

    // Check team access
    const hasAccess = await getUserTeamAccess(supabase, user.id, projectId);
    if (!hasAccess) {
      return createErrorResponse("Access denied", 403);
    }

    // Call PageSpeed Insights API with retry logic
    let pageSpeedData;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        pageSpeedData = await callPageSpeedInsightsAPI(url, strategy);
        break;
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          console.error(
            `PageSpeed API failed after ${maxRetries} attempts:`,
            error
          );
          return createErrorResponse(
            `PageSpeed Insights API unavailable. Please try again later.`,
            503
          );
        }
        // Exponential backoff
        await new Promise(resolve =>
          setTimeout(resolve, Math.pow(2, retryCount) * 1000)
        );
      }
    }

    // Extract metrics and calculate scores
    const lighthouseData = pageSpeedData.lighthouseResult;
    const metrics = extractCoreWebVitalsMetrics(lighthouseData);
    const scores = calculateCoreWebVitalsScores(metrics);

    // Generate optimization suggestions
    const optimizationSuggestions = includeOptimizationSuggestions
      ? generateOptimizationSuggestions(lighthouseData)
      : [];

    // Store in database
    await storeCoreWebVitalsData(
      supabase,
      projectId,
      url,
      strategy,
      metrics,
      scores,
      lighthouseData
    );

    // Prepare response
    const result: CoreWebVitalsResult = {
      url,
      strategy,
      timestamp: new Date().toISOString(),
      metrics,
      scores,
      loadingExperience: pageSpeedData.loadingExperience || {
        overall_category: "UNKNOWN",
        metrics: {},
      },
      optimizationSuggestions,
      lighthouseData: {
        performance: lighthouseData.categories?.performance?.score || 0,
        audits: lighthouseData.audits,
      },
    };

    return createResponse(result);
  } catch (error) {
    console.error("Core Web Vitals analysis error:", error);
    return createErrorResponse(
      `Analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      500
    );
  }
}

// Export the handler
Deno.serve(handleCoreWebVitalsAnalysis);
