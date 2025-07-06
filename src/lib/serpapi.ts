/**
 * SERPAPI Integration for Real-Time Competitive Intelligence
 * Provides search engine results and competitor analysis
 */

import { timeoutFetch } from "./resilience/timeout-fetch";
import { circuitBreakerManager } from "./resilience/circuit-breaker";
import { serviceDegradationManager } from "./resilience/service-degradation";

// Types for SERPAPI integration
export interface SearchParams {
  query: string;
  location?: string;
  device?: "desktop" | "mobile";
  language?: string;
  num?: number; // Number of results (1-100)
  start?: number; // Starting position
}

export interface SearchResult {
  position: number;
  title: string;
  link: string;
  snippet: string;
  domain: string;
  displayedLink?: string;
  cachedPage?: string;
  relatedPages?: string[];
  sitelinks?: {
    title: string;
    link: string;
  }[];
}

export interface CompetitorRanking {
  domain: string;
  rankings: {
    keyword: string;
    position: number;
    title: string;
    url: string;
    snippet: string;
    featured?: boolean;
  }[];
  visibility: {
    estimatedTraffic: number;
    keywordCount: number;
    averagePosition: number;
  };
}

export interface KeywordResearch {
  keyword: string;
  searchVolume: number;
  difficulty: number;
  cpc: number;
  competition: "low" | "medium" | "high";
  trend: number[];
  relatedKeywords: {
    keyword: string;
    searchVolume: number;
    relevance: number;
  }[];
  questions: string[];
  topResults: SearchResult[];
}

export interface FeaturedSnippet {
  type: "paragraph" | "list" | "table" | "video";
  content: string;
  source: {
    title: string;
    url: string;
    domain: string;
  };
  date?: string;
}

export interface SearchAnalytics {
  query: string;
  totalResults: number;
  searchTime: number;
  location: string;
  device: string;
  organicResults: SearchResult[];
  featuredSnippet?: FeaturedSnippet;
  peopleAlsoAsk: {
    question: string;
    answer: string;
    source: string;
  }[];
  relatedSearches: string[];
  knowledgeGraph?: {
    title: string;
    type: string;
    description: string;
    source: string;
  };
}

// SERPAPI response interfaces
interface SerpApiResponse {
  organic_results?: SerpApiResult[];
  people_also_ask?: SerpApiPeopleAlsoAsk[];
  related_searches?: SerpApiRelatedSearch[];
  answer_box?: SerpApiAnswerBox;
  knowledge_graph?: SerpApiKnowledgeGraph;
  search_information?: {
    total_results?: string;
    time_taken_displayed?: string;
  };
}

interface SerpApiResult {
  title?: string;
  link?: string;
  snippet?: string;
  displayed_link?: string;
  cached_page_link?: string;
  sitelinks?: SerpApiSitelink[];
}

interface SerpApiSitelink {
  title: string;
  link: string;
}

interface SerpApiPeopleAlsoAsk {
  question?: string;
  snippet?: string;
  link?: string;
}

interface SerpApiRelatedSearch {
  query?: string;
}

interface SerpApiAnswerBox {
  type?: string;
  answer?: string;
  snippet?: string;
  title?: string;
  link?: string;
  date?: string;
}

interface SerpApiKnowledgeGraph {
  title?: string;
  type?: string;
  description?: string;
  source?: string;
}

/**
 * Make SERPAPI request with timeout and circuit breaker
 */
async function makeSerpApiRequest(
  endpoint: string,
  params: Record<string, unknown>
): Promise<SerpApiResponse> {
  return circuitBreakerManager.execute(
    "serpapi-request",
    async () => {
      const SERPAPI_API_KEY = process.env["SERPAPI_API_KEY"];
      if (!SERPAPI_API_KEY) {
        throw new Error("SERPAPI API key not configured");
      }

      const url = new URL(`https://serpapi.com/${endpoint}`);
      url.searchParams.set("api_key", SERPAPI_API_KEY);

      // Add all parameters
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });

      const response = await timeoutFetch(url.toString(), {
        timeout: 15000, // 15 seconds timeout for SERPAPI
        method: "GET",
        headers: {
          "User-Agent": "ContentLab-Nexus/1.0",
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`SERPAPI error: ${response.status} - ${error}`);
      }

      const result = await response.json();
      
      // Record success
      serviceDegradationManager.recordSuccess("serpapi");
      return result;
    },
    // Fallback returns empty response structure
    async () => {
      serviceDegradationManager.recordFailure("serpapi", "Circuit breaker fallback triggered");
      return {
        organic_results: [],
        people_also_ask: [],
        related_searches: [],
        search_information: {
          total_results: "0",
          time_taken_displayed: "0",
        },
      };
    }
  );
}

/**
 * Search Google and get organic results
 */
export async function searchGoogle(
  params: SearchParams
): Promise<SearchAnalytics> {
  // Check if feature is available
  if (!serviceDegradationManager.isFeatureAvailable("serpapi", "search-analytics")) {
    const fallbackData = serviceDegradationManager.getFallbackData("serpapi", "searchResults");
    if (fallbackData) {
      return fallbackData as SearchAnalytics;
    }
  }

  try {
    const serpParams = {
      engine: "google",
      q: params.query,
      location: params.location || "United States",
      hl: params.language || "en",
      gl: "us",
      device: params.device || "desktop",
      num: params.num || 10,
      start: params.start || 0,
    };

    const data = await makeSerpApiRequest("search", serpParams);

    // Parse organic results
    const organicResults: SearchResult[] = (data.organic_results || []).map(
      (result: SerpApiResult, index: number) => {
        const searchResult: SearchResult = {
          position: (params.start || 0) + index + 1,
          title: result.title || "",
          link: result.link || "",
          snippet: result.snippet || "",
          domain: extractDomain(result.link || ""),
          sitelinks:
            result.sitelinks?.map((link: SerpApiSitelink) => ({
              title: link.title,
              link: link.link,
            })) || [],
        };

        // Conditionally add optional properties only if they exist
        if (result.displayed_link) {
          searchResult.displayedLink = result.displayed_link;
        }
        if (result.cached_page_link) {
          searchResult.cachedPage = result.cached_page_link;
        }

        return searchResult;
      }
    );

    // Parse featured snippet if present
    let featuredSnippet: FeaturedSnippet | undefined;
    if (data.answer_box) {
      const answerBoxType = data.answer_box.type;
      const validTypes = ["paragraph", "list", "table", "video"] as const;
      const type = validTypes.includes(
        answerBoxType as (typeof validTypes)[number]
      )
        ? (answerBoxType as "paragraph" | "list" | "table" | "video")
        : "paragraph";

      featuredSnippet = {
        type,
        content: data.answer_box.answer || data.answer_box.snippet || "",
        source: {
          title: data.answer_box.title || "",
          url: data.answer_box.link || "",
          domain: extractDomain(data.answer_box.link || ""),
        },
      };

      if (data.answer_box.date) {
        featuredSnippet.date = data.answer_box.date;
      }
    }

    // Parse people also ask
    const peopleAlsoAsk = (data.people_also_ask || []).map(
      (item: SerpApiPeopleAlsoAsk) => ({
        question: item.question || "",
        answer: item.snippet || "",
        source: item.link || "",
      })
    );

    // Parse related searches
    const relatedSearches = (data.related_searches || []).map(
      (item: SerpApiRelatedSearch) => item.query || ""
    );

    const result: SearchAnalytics = {
      query: params.query,
      totalResults: parseInt(data.search_information?.total_results || "0"),
      searchTime: parseFloat(
        data.search_information?.time_taken_displayed || "0"
      ),
      location: params.location || "United States",
      device: params.device || "desktop",
      organicResults,
      peopleAlsoAsk,
      relatedSearches,
    };

    // Conditionally add optional properties
    if (featuredSnippet) {
      result.featuredSnippet = featuredSnippet;
    }

    if (data.knowledge_graph) {
      result.knowledgeGraph = {
        title: data.knowledge_graph.title || "",
        type: data.knowledge_graph.type || "",
        description: data.knowledge_graph.description || "",
        source: data.knowledge_graph.source || "",
      };
    }

    return result;
  } catch (error) {
    console.error("Error searching Google via SERPAPI:", error);
    throw new Error("Failed to search Google");
  }
}

/**
 * Analyze competitor rankings for multiple keywords
 */
export async function analyzeCompetitorRankings(
  keywords: string[],
  competitorDomains: string[],
  location?: string
): Promise<CompetitorRanking[]> {
  try {
    const rankings: CompetitorRanking[] = competitorDomains.map(domain => ({
      domain,
      rankings: [],
      visibility: {
        estimatedTraffic: 0,
        keywordCount: 0,
        averagePosition: 0,
      },
    }));

    // Search for each keyword and track competitor positions
    for (const keyword of keywords) {
      const searchParams: SearchParams = {
        query: keyword,
        num: 100, // Get more results to capture competitor positions
      };

      if (location) {
        searchParams.location = location;
      }

      const searchResults = await searchGoogle(searchParams);

      // Find competitor positions in results
      competitorDomains.forEach((domain, domainIndex) => {
        const result = searchResults.organicResults.find(
          r => r.domain === domain
        );
        if (result && rankings[domainIndex]) {
          rankings[domainIndex].rankings.push({
            keyword,
            position: result.position,
            title: result.title,
            url: result.link,
            snippet: result.snippet,
            featured: searchResults.featuredSnippet?.source.domain === domain,
          });
        }
      });

      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Calculate visibility metrics
    rankings.forEach(ranking => {
      if (ranking.rankings.length > 0) {
        ranking.visibility.keywordCount = ranking.rankings.length;
        ranking.visibility.averagePosition =
          ranking.rankings.reduce((sum, r) => sum + r.position, 0) /
          ranking.rankings.length;

        // Estimate traffic based on positions (simplified formula)
        ranking.visibility.estimatedTraffic = ranking.rankings.reduce(
          (traffic, r) => {
            const ctr = getEstimatedCTR(r.position);
            return traffic + 1000 * ctr; // Assume 1000 searches per keyword
          },
          0
        );
      }
    });

    return rankings;
  } catch (error) {
    console.error("Error analyzing competitor rankings:", error);
    throw new Error("Failed to analyze competitor rankings");
  }
}

/**
 * Research keywords and get comprehensive data
 */
export async function researchKeyword(
  keyword: string,
  location?: string
): Promise<KeywordResearch> {
  try {
    // Get search results
    const searchParams: SearchParams = {
      query: keyword,
      num: 20,
    };

    if (location) {
      searchParams.location = location;
    }

    const searchResults = await searchGoogle(searchParams);

    // Get keyword suggestions (simulated - SERPAPI doesn't provide volume directly)
    const relatedKeywords = searchResults.relatedSearches
      .slice(0, 10)
      .map((related, index) => ({
        keyword: related,
        searchVolume: Math.floor(Math.random() * 5000) + 100, // Placeholder
        relevance: Math.max(0.3, 1 - index * 0.1),
      }));

    // Extract questions from People Also Ask
    const questions = searchResults.peopleAlsoAsk.map(item => item.question);

    // Calculate difficulty based on competition analysis
    const topDomains = searchResults.organicResults
      .slice(0, 10)
      .map(r => r.domain);
    const uniqueDomains = new Set(topDomains);
    const difficulty = Math.min(100, (uniqueDomains.size / 10) * 100);

    return {
      keyword,
      searchVolume: Math.floor(Math.random() * 10000) + 500, // Placeholder - real implementation would use keyword tools
      difficulty,
      cpc: Math.random() * 5 + 0.5, // Placeholder
      competition:
        difficulty < 30 ? "low" : difficulty < 70 ? "medium" : "high",
      trend: Array.from({ length: 12 }, () => Math.floor(Math.random() * 100)), // Placeholder trend data
      relatedKeywords,
      questions,
      topResults: searchResults.organicResults.slice(0, 10),
    };
  } catch (error) {
    console.error("Error researching keyword:", error);
    throw new Error("Failed to research keyword");
  }
}

/**
 * Monitor competitor content changes
 */
export async function monitorCompetitorContent(
  competitorUrls: string[]
): Promise<
  {
    url: string;
    changes: {
      type: "title" | "content" | "meta" | "structure";
      description: string;
      timestamp: string;
    }[];
    currentRankings: {
      keyword: string;
      position: number;
    }[];
  }[]
> {
  try {
    const results = [];

    for (const url of competitorUrls) {
      const domain = extractDomain(url);

      // Search for the domain across multiple keywords to find current rankings
      const sampleKeywords = [
        "content marketing",
        "seo tools",
        "digital marketing",
      ]; // This should be dynamic
      const currentRankings = [];

      for (const keyword of sampleKeywords) {
        const searchResults = await searchGoogle({
          query: keyword,
          num: 50,
        });

        const ranking = searchResults.organicResults.find(
          r => r.domain === domain
        );
        if (ranking) {
          currentRankings.push({
            keyword,
            position: ranking.position,
          });
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      results.push({
        url,
        changes: [], // This would be populated by comparing with stored data
        currentRankings,
      });
    }

    return results;
  } catch (error) {
    console.error("Error monitoring competitor content:", error);
    throw new Error("Failed to monitor competitor content");
  }
}

/**
 * Get trending keywords in industry
 */
export async function getTrendingKeywords(industry: string): Promise<
  {
    keyword: string;
    trendScore: number;
    searchVolume: number;
    growth: number;
  }[]
> {
  try {
    // Search for industry-related trending topics
    const trendingQueries = [
      `${industry} trends`,
      `latest ${industry} news`,
      `${industry} 2024`,
      `best ${industry} tools`,
    ];

    const allKeywords = new Set<string>();

    for (const query of trendingQueries) {
      const results = await searchGoogle({
        query,
        num: 20,
      });

      // Extract keywords from titles and snippets
      results.organicResults.forEach(result => {
        const words =
          (result.title + " " + result.snippet)
            .toLowerCase()
            .match(/\b[\w-]+\b/g) || [];

        words.forEach(word => {
          if (word.length > 3 && !commonWords.includes(word)) {
            allKeywords.add(word);
          }
        });
      });

      // Add related searches
      results.relatedSearches.forEach(search => allKeywords.add(search));

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Convert to trending keywords with scores
    return Array.from(allKeywords)
      .slice(0, 50)
      .map(keyword => ({
        keyword,
        trendScore: Math.floor(Math.random() * 100),
        searchVolume: Math.floor(Math.random() * 5000) + 100,
        growth: (Math.random() - 0.5) * 200, // -100% to +100%
      }))
      .sort((a, b) => b.trendScore - a.trendScore);
  } catch (error) {
    console.error("Error getting trending keywords:", error);
    throw new Error("Failed to get trending keywords");
  }
}

/**
 * Utility functions
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function getEstimatedCTR(position: number): number {
  // Estimated CTR based on position (simplified)
  const ctrMap: { [key: number]: number } = {
    1: 0.28,
    2: 0.15,
    3: 0.11,
    4: 0.08,
    5: 0.06,
    6: 0.05,
    7: 0.04,
    8: 0.03,
    9: 0.025,
    10: 0.02,
  };

  return ctrMap[position] || (position <= 20 ? 0.01 : 0.005);
}

const commonWords = [
  "the",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "up",
  "about",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "between",
  "among",
  "this",
  "that",
  "these",
  "those",
  "is",
  "are",
  "was",
  "were",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "must",
  "can",
  "cannot",
];

/**
 * Health check for SERPAPI
 */
export async function healthCheck(): Promise<boolean> {
  return circuitBreakerManager.execute(
    "serpapi-health-check",
    async () => {
      const result = await searchGoogle({
        query: "test",
        num: 1,
      });

      return result.organicResults.length > 0;
    },
    // Fallback returns false to indicate service is down
    async () => false
  );
}
