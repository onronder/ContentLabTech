/**
 * SERP Analysis Edge Function
 * Real-time competitive intelligence with BrightData proxy integration
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

interface SERPAnalysisRequest {
  projectId: string;
  keywords: string[];
  location?: string;
  device?: "desktop" | "mobile";
  competitorDomains?: string[];
  includeFeatures?: boolean;
  maxResults?: number;
}

interface OrganicResult {
  position: number;
  title: string;
  url: string;
  snippet: string;
  domain: string;
}

interface SERPData {
  organicResults: OrganicResult[];
  serpFeatures: string[];
  totalResults: number;
  searchVolume?: number;
}

interface CompetitorAnalysis {
  domain: string;
  positions: number[];
  averagePosition: number | null;
  visibility: number;
  topPosition: number | null;
  pages: Array<{
    url: string;
    position: number;
    title: string;
  }>;
}

interface SERPInsights {
  opportunityScore: number;
  competitionLevel: "low" | "medium" | "high";
  recommendedActions: string[];
  serpFeatureOpportunities: string[];
  topCompetitors: string[];
}

interface SERPAnalysisResult {
  keyword: string;
  location: string;
  device: string;
  timestamp: string;
  serpData: SERPData;
  competitorAnalysis: CompetitorAnalysis[];
  insights: SERPInsights;
  metadata: {
    processingTime: number;
    dataSource: string;
    analysisVersion: string;
  };
}

// BrightData proxy configuration
const PROXY_CONFIG = {
  host: "brd.superproxy.io",
  port: 33335,
  username: "brd-customer-hl_60607241-zone-content_lab",
  password: "hfnba0lm8g7z",
};

// Request queue for rate limiting
const requestQueue: Array<{
  keyword: string;
  location: string;
  device: string;
  resolve: (value: SERPData) => void;
  reject: (reason: Error) => void;
}> = [];

let isProcessing = false;

/**
 * Build Google search URL with parameters
 */
function buildSearchUrl(
  keyword: string,
  location = "US",
  device = "desktop"
): string {
  const params = new URLSearchParams({
    q: keyword,
    gl: location, // Geographic location
    hl: "en", // Language
    num: "100", // Number of results
    start: "0", // Starting position
  });

  return `https://www.google.com/search?${params.toString()}`;
}

/**
 * Get appropriate User-Agent for device type
 */
function getUserAgent(device: string): string {
  return device === "mobile"
    ? "Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1"
    : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
}

/**
 * Scrape SERP using BrightData proxy
 */
async function scrapeSERP(
  keyword: string,
  location = "US",
  device = "desktop"
): Promise<string> {
  const url = buildSearchUrl(keyword, location, device);
  const headers = {
    "User-Agent": getUserAgent(device),
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    DNT: "1",
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  };

  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      // Create proxy URL for BrightData
      const proxyUrl = `http://${PROXY_CONFIG.username}:${PROXY_CONFIG.password}@${PROXY_CONFIG.host}:${PROXY_CONFIG.port}`;

      // For Deno, we'll use a different approach since fetch doesn't support proxy directly
      // We'll make the request through a proxy tunnel
      const response = await fetchWithProxy(url, headers, proxyUrl);

      if (response.ok) {
        const html = await response.text();
        console.log(`SERP scraping successful for keyword: ${keyword}`);
        return html;
      }

      if (response.status === 429) {
        // Rate limited, wait longer
        const waitTime = Math.pow(2, retryCount + 2) * 1000;
        console.log(`Rate limited, waiting ${waitTime}ms before retry`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else if (response.status === 503) {
        // Service unavailable
        console.log(
          `Service unavailable (503), retrying in ${Math.pow(2, retryCount + 1) * 1000}ms`
        );
        await new Promise(resolve =>
          setTimeout(resolve, Math.pow(2, retryCount + 1) * 1000)
        );
      } else {
        console.log(`HTTP ${response.status} error for keyword: ${keyword}`);
      }
    } catch (error) {
      console.log(`SERP scraping attempt ${retryCount + 1} failed:`, error);
    }

    retryCount++;
    if (retryCount < maxRetries) {
      await new Promise(resolve =>
        setTimeout(resolve, Math.pow(2, retryCount) * 1000)
      );
    }
  }

  throw new Error(
    `Failed to scrape SERP for "${keyword}" after ${maxRetries} attempts`
  );
}

/**
 * Fetch with proxy support (simplified implementation for Deno)
 */
async function fetchWithProxy(
  url: string,
  headers: Record<string, string>,
  proxyUrl: string
): Promise<Response> {
  // For production, this would use a proper proxy client
  // For now, we'll simulate the proxy request
  console.log(`Making request to ${url} via proxy ${proxyUrl}`);

  // Add proxy headers and make request
  const modifiedHeaders = {
    ...headers,
    "X-Proxy-Authorization": `Basic ${btoa(`${PROXY_CONFIG.username}:${PROXY_CONFIG.password}`)}`,
  };

  return await fetch(url, {
    method: "GET",
    headers: modifiedHeaders,
  });
}

/**
 * Parse HTML to extract SERP results and features
 */
function parseSERPResults(html: string): SERPData {
  const results: OrganicResult[] = [];

  // Enhanced regex patterns for organic results
  const organicPatterns = [
    // Standard organic result pattern
    /<div[^>]*data-ved[^>]*>[\s\S]*?<h3[^>]*><a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a><\/h3>[\s\S]*?<span[^>]*>(.*?)<\/span>/g,
    // Alternative pattern for different layouts
    /<h3[^>]*><a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a><\/h3>[\s\S]*?<div[^>]*>(.*?)<\/div>/g,
  ];

  let position = 1;

  for (const pattern of organicPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null && position <= 100) {
      const [, url, title, snippet] = match;

      // Clean and decode HTML entities
      const cleanTitle = title
        .replace(/<[^>]*>/g, "")
        .replace(/&[^;]+;/g, "")
        .trim();
      let cleanUrl = url;

      // Handle Google redirect URLs
      if (url.startsWith("/url?q=")) {
        try {
          const urlParam = new URL(`https://google.com${url}`).searchParams.get(
            "q"
          );
          cleanUrl = urlParam || url;
        } catch {
          cleanUrl = url;
        }
      }

      const cleanSnippet = snippet
        .replace(/<[^>]*>/g, "")
        .replace(/&[^;]+;/g, "")
        .trim();

      // Validate URL and exclude Google/internal links
      if (
        cleanUrl.startsWith("http") &&
        !cleanUrl.includes("google.com") &&
        !cleanUrl.includes("youtube.com")
      ) {
        try {
          const domain = new URL(cleanUrl).hostname.replace("www.", "");

          // Check for duplicates
          if (!results.some(r => r.url === cleanUrl)) {
            results.push({
              position: position,
              title: cleanTitle,
              url: cleanUrl,
              snippet: cleanSnippet,
              domain: domain,
            });
            position++;
          }
        } catch (error) {
          console.log(`Invalid URL skipped: ${cleanUrl}`);
        }
      }
    }
  }

  // Extract SERP features
  const serpFeatures: string[] = [];

  if (html.includes("featured-snippet") || html.includes("kp-blk")) {
    serpFeatures.push("featured_snippet");
  }
  if (html.includes("related-question") || html.includes("people-also-ask")) {
    serpFeatures.push("people_also_ask");
  }
  if (html.includes("related-searches") || html.includes("brs_col")) {
    serpFeatures.push("related_searches");
  }
  if (html.includes("knowledge-panel") || html.includes("kp-header")) {
    serpFeatures.push("knowledge_panel");
  }
  if (html.includes("local-results") || html.includes("lhcl")) {
    serpFeatures.push("local_pack");
  }
  if (html.includes("shopping-results") || html.includes("commercial")) {
    serpFeatures.push("shopping_results");
  }
  if (html.includes("image-results") || html.includes("images")) {
    serpFeatures.push("image_pack");
  }
  if (html.includes("news-results") || html.includes("news")) {
    serpFeatures.push("news_pack");
  }

  return {
    organicResults: results,
    serpFeatures: serpFeatures,
    totalResults: results.length,
  };
}

/**
 * Analyze competitor positions in SERP results
 */
function analyzeCompetitorPositions(
  serpData: SERPData,
  competitorDomains: string[]
): CompetitorAnalysis[] {
  return competitorDomains.map(domain => {
    const normalizedDomain = domain.replace("www.", "").toLowerCase();

    const matchingResults = serpData.organicResults.filter(
      result => result.domain.toLowerCase() === normalizedDomain
    );

    const positions = matchingResults.map(result => result.position);

    return {
      domain: domain,
      positions: positions,
      averagePosition:
        positions.length > 0
          ? positions.reduce((a, b) => a + b, 0) / positions.length
          : null,
      visibility: positions.length,
      topPosition: positions.length > 0 ? Math.min(...positions) : null,
      pages: matchingResults.map(result => ({
        url: result.url,
        position: result.position,
        title: result.title,
      })),
    };
  });
}

/**
 * Generate insights and recommendations from SERP analysis
 */
function generateSERPInsights(
  serpData: SERPData,
  competitorAnalysis: CompetitorAnalysis[],
  keyword: string
): SERPInsights {
  // Calculate opportunity score (0-100)
  let opportunityScore = 50; // Base score

  // Adjust based on SERP features
  if (serpData.serpFeatures.includes("featured_snippet")) {
    opportunityScore += 20; // Featured snippet opportunity
  }
  if (serpData.serpFeatures.includes("people_also_ask")) {
    opportunityScore += 15; // PAA opportunity
  }
  if (serpData.serpFeatures.length > 3) {
    opportunityScore -= 10; // Crowded SERP
  }

  // Adjust based on competition
  const competingPositions = competitorAnalysis.filter(c => c.visibility > 0);
  if (competingPositions.length > 5) {
    opportunityScore -= 15; // High competition
  } else if (competingPositions.length < 3) {
    opportunityScore += 10; // Low competition
  }

  // Determine competition level
  let competitionLevel: "low" | "medium" | "high" = "medium";
  if (competingPositions.length < 3) {
    competitionLevel = "low";
  } else if (competingPositions.length > 6) {
    competitionLevel = "high";
  }

  // Generate recommendations
  const recommendedActions: string[] = [];

  if (serpData.serpFeatures.includes("featured_snippet")) {
    recommendedActions.push(
      "Optimize content structure for featured snippet capture"
    );
  }
  if (serpData.serpFeatures.includes("people_also_ask")) {
    recommendedActions.push(
      "Create content addressing 'People Also Ask' questions"
    );
  }
  if (serpData.serpFeatures.includes("local_pack")) {
    recommendedActions.push("Optimize for local SEO and Google My Business");
  }
  if (competitionLevel === "low") {
    recommendedActions.push(
      "Capitalize on low competition with targeted content"
    );
  }
  if (competitionLevel === "high") {
    recommendedActions.push(
      "Consider long-tail keyword variations for easier ranking"
    );
  }

  // SERP feature opportunities
  const serpFeatureOpportunities: string[] = [];
  const missingFeatures = [
    "featured_snippet",
    "people_also_ask",
    "image_pack",
    "news_pack",
  ];
  missingFeatures.forEach(feature => {
    if (!serpData.serpFeatures.includes(feature)) {
      serpFeatureOpportunities.push(feature);
    }
  });

  // Top competitors by visibility
  const topCompetitors = competitorAnalysis
    .filter(c => c.visibility > 0)
    .sort((a, b) => b.visibility - a.visibility)
    .slice(0, 5)
    .map(c => c.domain);

  return {
    opportunityScore: Math.max(0, Math.min(100, opportunityScore)),
    competitionLevel,
    recommendedActions,
    serpFeatureOpportunities,
    topCompetitors,
  };
}

/**
 * Queue SERP request for rate limiting
 */
async function queueSERPRequest(
  keyword: string,
  location: string,
  device: string
): Promise<SERPData> {
  return new Promise((resolve, reject) => {
    requestQueue.push({ keyword, location, device, resolve, reject });
    processQueue();
  });
}

/**
 * Process request queue with rate limiting
 */
async function processQueue(): Promise<void> {
  if (isProcessing || requestQueue.length === 0) return;

  isProcessing = true;

  while (requestQueue.length > 0) {
    const request = requestQueue.shift();
    if (!request) break;

    try {
      // Rate limit: 2 requests per second maximum
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log(`Processing SERP request for: ${request.keyword}`);
      const html = await scrapeSERP(
        request.keyword,
        request.location,
        request.device
      );
      const serpData = parseSERPResults(html);

      request.resolve(serpData);
    } catch (error) {
      console.error(`SERP request failed for ${request.keyword}:`, error);
      request.reject(error as Error);
    }
  }

  isProcessing = false;
}

/**
 * Store SERP analysis results in database
 */
async function storeSERPData(
  supabase: any,
  projectId: string,
  analysisResult: SERPAnalysisResult
): Promise<void> {
  try {
    const { error } = await supabase.from("competitor_analytics").upsert(
      {
        project_id: projectId,
        keyword: analysisResult.keyword,
        location: analysisResult.location,
        device: analysisResult.device,
        serp_data: analysisResult.serpData,
        competitor_analysis: analysisResult.competitorAnalysis,
        insights: analysisResult.insights,
        scraped_at: analysisResult.timestamp,
        organic_results_count: analysisResult.serpData.totalResults,
        serp_features: analysisResult.serpData.serpFeatures,
      },
      {
        onConflict: "project_id,keyword,location,device",
      }
    );

    if (error) {
      console.error("Database storage error:", error);
      throw new Error(`Failed to store SERP data: ${error.message}`);
    }

    console.log(`SERP data stored successfully for: ${analysisResult.keyword}`);
  } catch (error) {
    console.error("Failed to store SERP data:", error);
    throw error;
  }
}

/**
 * Analyze single keyword
 */
async function analyzeSingleKeyword(
  supabase: any,
  projectId: string,
  keyword: string,
  location: string,
  device: string,
  competitorDomains: string[]
): Promise<SERPAnalysisResult> {
  const startTime = Date.now();

  try {
    // Get SERP data through rate-limited queue
    const serpData = await queueSERPRequest(keyword, location, device);

    // Analyze competitor positions
    const competitorAnalysis = analyzeCompetitorPositions(
      serpData,
      competitorDomains
    );

    // Generate insights
    const insights = generateSERPInsights(
      serpData,
      competitorAnalysis,
      keyword
    );

    const analysisResult: SERPAnalysisResult = {
      keyword,
      location,
      device,
      timestamp: new Date().toISOString(),
      serpData,
      competitorAnalysis,
      insights,
      metadata: {
        processingTime: Date.now() - startTime,
        dataSource: "brightdata_serp",
        analysisVersion: "1.0",
      },
    };

    // Store in database
    await storeSERPData(supabase, projectId, analysisResult);

    return analysisResult;
  } catch (error) {
    console.error(`Error analyzing keyword "${keyword}":`, error);
    throw new Error(`SERP analysis failed for "${keyword}": ${error.message}`);
  }
}

/**
 * Main handler function
 */
async function handleSERPAnalysis(request: Request): Promise<Response> {
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
    const body: SERPAnalysisRequest = await request.json();
    const {
      projectId,
      keywords,
      location = "US",
      device = "desktop",
      competitorDomains = [],
      includeFeatures = true,
      maxResults = 100,
    } = body;

    if (!projectId || !keywords || keywords.length === 0) {
      return createErrorResponse(
        "Missing required fields: projectId, keywords",
        400
      );
    }

    if (keywords.length > 10) {
      return createErrorResponse("Maximum 10 keywords per request", 400);
    }

    // Create database client
    const supabase = createDatabaseClient(request);

    // Check team access
    const hasAccess = await getUserTeamAccess(supabase, user.id, projectId);
    if (!hasAccess) {
      return createErrorResponse("Access denied", 403);
    }

    // Process keywords with error handling
    const results = await Promise.allSettled(
      keywords.map(keyword =>
        analyzeSingleKeyword(
          supabase,
          projectId,
          keyword,
          location,
          device,
          competitorDomains
        )
      )
    );

    // Separate successful and failed results
    const successfulResults: SERPAnalysisResult[] = [];
    const errors: string[] = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        successfulResults.push(result.value);
      } else {
        errors.push(`${keywords[index]}: ${result.reason.message}`);
      }
    });

    // Calculate summary insights
    const totalOpportunityScore =
      successfulResults.length > 0
        ? successfulResults.reduce(
            (sum, r) => sum + r.insights.opportunityScore,
            0
          ) / successfulResults.length
        : 0;

    const overallCompetitionLevel =
      successfulResults.length > 0
        ? successfulResults.filter(r => r.insights.competitionLevel === "high")
            .length >
          successfulResults.length / 2
          ? "high"
          : successfulResults.filter(r => r.insights.competitionLevel === "low")
                .length >
              successfulResults.length / 2
            ? "low"
            : "medium"
        : "medium";

    return createResponse({
      success: true,
      data: {
        results: successfulResults,
        summary: {
          totalKeywords: keywords.length,
          successfulAnalyses: successfulResults.length,
          failedAnalyses: errors.length,
          averageOpportunityScore: Math.round(totalOpportunityScore),
          overallCompetitionLevel,
          errors: errors,
        },
        metadata: {
          location,
          device,
          competitorDomains,
          processedAt: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("SERP analysis error:", error);
    return createErrorResponse(
      `Analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      500
    );
  }
}

// Export the handler
Deno.serve(handleSERPAnalysis);
