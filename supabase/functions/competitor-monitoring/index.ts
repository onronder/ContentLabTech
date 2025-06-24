/**
 * Real-Time Competitor Monitoring Edge Function
 * Provides competitive intelligence and ranking analysis
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

interface CompetitorMonitoringRequest {
  projectId: string;
  action: 'analyze' | 'monitor' | 'rankings' | 'trends' | 'alerts';
  params?: {
    competitorIds?: string[];
    keywords?: string[];
    timeframe?: '24h' | '7d' | '30d';
    location?: string;
  };
}

interface RankingData {
  keyword: string;
  position: number;
  title: string;
  url: string;
  snippet: string;
  featured: boolean;
  change: number; // Position change from last check
}

interface CompetitorAnalysis {
  competitorId: string;
  domain: string;
  rankings: RankingData[];
  visibility: {
    estimatedTraffic: number;
    keywordCount: number;
    averagePosition: number;
    visibilityScore: number;
  };
  changes: {
    type: 'ranking' | 'content' | 'technical';
    description: string;
    impact: 'high' | 'medium' | 'low';
    timestamp: string;
  }[];
  opportunities: {
    type: 'keyword' | 'content' | 'technical';
    description: string;
    potential: number;
    effort: 'high' | 'medium' | 'low';
  }[];
}

/**
 * Make SERPAPI request for competitor analysis
 */
async function makeSerpApiRequest(params: Record<string, any>): Promise<any> {
  const SERPAPI_API_KEY = Deno.env.get('SERPAPI_API_KEY');
  if (!SERPAPI_API_KEY) {
    throw new Error('SERPAPI API key not configured');
  }

  const url = new URL('https://serpapi.com/search');
  url.searchParams.set('api_key', SERPAPI_API_KEY);
  url.searchParams.set('engine', 'google');
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url.toString());
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SERPAPI error: ${response.status} - ${error}`);
  }

  return await response.json();
}

/**
 * Analyze competitor rankings for specific keywords
 */
async function analyzeCompetitorRankings(
  competitors: any[],
  keywords: string[],
  location: string = 'United States'
): Promise<CompetitorAnalysis[]> {
  const analyses: CompetitorAnalysis[] = [];

  for (const competitor of competitors) {
    const analysis: CompetitorAnalysis = {
      competitorId: competitor.id,
      domain: extractDomain(competitor.website_url),
      rankings: [],
      visibility: {
        estimatedTraffic: 0,
        keywordCount: 0,
        averagePosition: 0,
        visibilityScore: 0,
      },
      changes: [],
      opportunities: [],
    };

    // Search for each keyword and find competitor positions
    for (const keyword of keywords) {
      try {
        const searchData = await makeSerpApiRequest({
          q: keyword,
          location,
          hl: 'en',
          gl: 'us',
          num: 100,
        });

        const organicResults = searchData.organic_results || [];
        const competitorResult = organicResults.find((result: any) => 
          extractDomain(result.link || '') === analysis.domain
        );

        if (competitorResult) {
          const position = organicResults.indexOf(competitorResult) + 1;
          
          analysis.rankings.push({
            keyword,
            position,
            title: competitorResult.title || '',
            url: competitorResult.link || '',
            snippet: competitorResult.snippet || '',
            featured: searchData.answer_box?.link?.includes(analysis.domain) || false,
            change: 0, // Would be calculated from historical data
          });
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error searching for keyword "${keyword}":`, error);
      }
    }

    // Calculate visibility metrics
    if (analysis.rankings.length > 0) {
      analysis.visibility.keywordCount = analysis.rankings.length;
      analysis.visibility.averagePosition = analysis.rankings.reduce(
        (sum, r) => sum + r.position, 0
      ) / analysis.rankings.length;
      
      // Calculate estimated traffic based on positions
      analysis.visibility.estimatedTraffic = analysis.rankings.reduce((traffic, r) => {
        const ctr = getEstimatedCTR(r.position);
        return traffic + (1000 * ctr); // Assume 1000 searches per keyword
      }, 0);

      // Calculate visibility score (0-100)
      analysis.visibility.visibilityScore = Math.max(0, Math.min(100, 
        (analysis.rankings.filter(r => r.position <= 20).length / keywords.length) * 100
      ));
    }

    // Generate opportunities based on rankings
    analysis.opportunities = generateOpportunities(analysis.rankings, keywords);

    analyses.push(analysis);
  }

  return analyses;
}

/**
 * Generate competitive opportunities
 */
function generateOpportunities(
  rankings: RankingData[],
  allKeywords: string[]
): CompetitorAnalysis['opportunities'] {
  const opportunities: CompetitorAnalysis['opportunities'] = [];

  // Keyword gaps (keywords not ranking for)
  const rankedKeywords = new Set(rankings.map(r => r.keyword));
  const missingKeywords = allKeywords.filter(k => !rankedKeywords.has(k));
  
  if (missingKeywords.length > 0) {
    opportunities.push({
      type: 'keyword',
      description: `Missing rankings for ${missingKeywords.length} target keywords: ${missingKeywords.slice(0, 3).join(', ')}${missingKeywords.length > 3 ? '...' : ''}`,
      potential: Math.min(100, missingKeywords.length * 10),
      effort: missingKeywords.length > 10 ? 'high' : missingKeywords.length > 5 ? 'medium' : 'low',
    });
  }

  // Low-hanging fruit (positions 11-30)
  const lowHangingFruit = rankings.filter(r => r.position > 10 && r.position <= 30);
  if (lowHangingFruit.length > 0) {
    opportunities.push({
      type: 'keyword',
      description: `${lowHangingFruit.length} keywords ranking 11-30 could be improved to page 1`,
      potential: lowHangingFruit.length * 15,
      effort: 'medium',
    });
  }

  // Featured snippet opportunities
  const featuredOpportunities = rankings.filter(r => r.position <= 5 && !r.featured);
  if (featuredOpportunities.length > 0) {
    opportunities.push({
      type: 'content',
      description: `${featuredOpportunities.length} top-ranking pages could target featured snippets`,
      potential: featuredOpportunities.length * 20,
      effort: 'low',
    });
  }

  return opportunities;
}

/**
 * Monitor competitor changes and generate alerts
 */
async function monitorCompetitorChanges(
  supabase: any,
  projectId: string,
  competitorIds: string[]
): Promise<{
  alerts: {
    competitorId: string;
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    data: any;
  }[];
  summary: {
    newAlerts: number;
    criticalAlerts: number;
    competitorsMonitored: number;
  };
}> {
  const alerts = [];
  let criticalAlerts = 0;

  for (const competitorId of competitorIds) {
    // Get competitor data
    const { data: competitor } = await supabase
      .from('competitors')
      .select('*')
      .eq('id', competitorId)
      .single();

    if (!competitor) continue;

    // Get recent analytics to detect changes
    const { data: recentAnalytics } = await supabase
      .from('competitor_analytics')
      .select('*')
      .eq('competitor_id', competitorId)
      .order('date', { ascending: false })
      .limit(7);

    if (recentAnalytics && recentAnalytics.length >= 2) {
      const latest = recentAnalytics[0];
      const previous = recentAnalytics[1];

      // Check for significant traffic changes
      const trafficChange = latest.estimated_traffic - previous.estimated_traffic;
      const trafficChangePercent = (trafficChange / previous.estimated_traffic) * 100;

      if (Math.abs(trafficChangePercent) > 20) {
        const severity = Math.abs(trafficChangePercent) > 50 ? 'critical' : 'high';
        if (severity === 'critical') criticalAlerts++;

        alerts.push({
          competitorId,
          type: 'traffic_change',
          message: `${competitor.name} traffic ${trafficChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(trafficChangePercent).toFixed(1)}%`,
          severity,
          data: {
            previousTraffic: previous.estimated_traffic,
            currentTraffic: latest.estimated_traffic,
            change: trafficChange,
            changePercent: trafficChangePercent,
          },
        });
      }

      // Check for domain authority changes
      const daChange = latest.domain_authority - previous.domain_authority;
      if (Math.abs(daChange) > 5) {
        alerts.push({
          competitorId,
          type: 'domain_authority_change',
          message: `${competitor.name} domain authority ${daChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(daChange)} points`,
          severity: Math.abs(daChange) > 10 ? 'high' : 'medium',
          data: {
            previousDA: previous.domain_authority,
            currentDA: latest.domain_authority,
            change: daChange,
          },
        });
      }

      // Check for new content activity
      const contentChange = latest.new_content_count - previous.new_content_count;
      if (contentChange > 5) {
        alerts.push({
          competitorId,
          type: 'content_activity',
          message: `${competitor.name} published ${contentChange} new pieces of content`,
          severity: contentChange > 20 ? 'high' : 'medium',
          data: {
            newContentCount: contentChange,
            totalContent: latest.new_content_count,
          },
        });
      }
    }
  }

  // Save alerts to database
  if (alerts.length > 0) {
    const alertsToInsert = alerts.map(alert => ({
      competitor_id: alert.competitorId,
      alert_type: alert.type,
      title: alert.message,
      message: alert.message,
      severity: alert.severity,
      data: alert.data,
    }));

    await supabase.from('competitor_alerts').insert(alertsToInsert);
  }

  return {
    alerts,
    summary: {
      newAlerts: alerts.length,
      criticalAlerts,
      competitorsMonitored: competitorIds.length,
    },
  };
}

/**
 * Get trending keywords in industry
 */
async function getTrendingKeywords(
  industry: string,
  timeframe: string = '7d'
): Promise<{
  keyword: string;
  trendScore: number;
  searchVolume: number;
  growth: number;
  relatedQueries: string[];
}[]> {
  const trendingQueries = [
    `${industry} trends`,
    `latest ${industry}`,
    `${industry} 2024`,
    `best ${industry}`,
  ];

  const keywords = new Map<string, number>();
  
  for (const query of trendingQueries) {
    try {
      const searchData = await makeSerpApiRequest({
        q: query,
        hl: 'en',
        gl: 'us',
        num: 20,
      });

      // Extract keywords from results
      const results = searchData.organic_results || [];
      results.forEach((result: any) => {
        const title = (result.title || '').toLowerCase();
        const words = title.match(/\b[\w-]+\b/g) || [];
        
        words.forEach(word => {
          if (word.length > 3 && !commonWords.includes(word)) {
            keywords.set(word, (keywords.get(word) || 0) + 1);
          }
        });
      });

      // Add related searches
      const relatedSearches = searchData.related_searches || [];
      relatedSearches.forEach((search: any) => {
        const query = search.query || '';
        if (query.length > 0) {
          keywords.set(query, (keywords.get(query) || 0) + 5); // Higher weight for related searches
        }
      });

      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error searching trending for "${query}":`, error);
    }
  }

  // Convert to trending keywords array
  return Array.from(keywords.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 50)
    .map(([keyword, score]) => ({
      keyword,
      trendScore: Math.min(100, score * 10),
      searchVolume: Math.floor(Math.random() * 5000) + 100, // Placeholder
      growth: (Math.random() - 0.5) * 200, // -100% to +100%
      relatedQueries: [], // Would be populated with actual related queries
    }));
}

/**
 * Utility functions
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function getEstimatedCTR(position: number): number {
  const ctrMap: { [key: number]: number } = {
    1: 0.28, 2: 0.15, 3: 0.11, 4: 0.08, 5: 0.06,
    6: 0.05, 7: 0.04, 8: 0.03, 9: 0.025, 10: 0.02,
  };
  
  return ctrMap[position] || (position <= 20 ? 0.01 : 0.005);
}

const commonWords = [
  'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'
];

Deno.serve(async req => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Authenticate user
    const user = await getAuthUser(req);
    const authError = requireAuth(user);
    if (authError) return authError;

    // Parse request
    const body: CompetitorMonitoringRequest = await req.json();
    const { projectId, action, params = {} } = body;

    if (!projectId) {
      return createErrorResponse('Project ID is required');
    }

    // Get database client
    const supabase = createDatabaseClient();

    // Check user access to project
    const { data: project } = await supabase
      .from('projects')
      .select('team_id')
      .eq('id', projectId)
      .single();

    if (!project) {
      return createErrorResponse('Project not found', 404);
    }

    const hasAccess = await getUserTeamAccess(
      supabase,
      user!.id,
      project.team_id
    );
    if (!hasAccess) {
      return createErrorResponse('Insufficient permissions', 403);
    }

    let result;

    switch (action) {
      case 'analyze': {
        // Get competitors for the project
        const { data: competitors } = await supabase
          .from('competitors')
          .select('*')
          .eq('project_id', projectId)
          .eq('monitoring_enabled', true);

        if (!competitors || competitors.length === 0) {
          return createErrorResponse('No competitors found for monitoring');
        }

        // Get project keywords
        const { data: projectData } = await supabase
          .from('projects')
          .select('target_keywords')
          .eq('id', projectId)
          .single();

        const keywords = params.keywords || projectData?.target_keywords || [];
        
        if (keywords.length === 0) {
          return createErrorResponse('No target keywords defined for project');
        }

        result = await analyzeCompetitorRankings(
          competitors,
          keywords,
          params.location
        );

        // Save analysis results
        for (const analysis of result) {
          await supabase.from('analysis_results').insert({
            project_id: projectId,
            competitor_id: analysis.competitorId,
            analysis_type: 'ai_competitor_intelligence',
            results: analysis,
            confidence_score: 85,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          });
        }
        break;
      }

      case 'monitor': {
        const competitorIds = params.competitorIds || [];
        if (competitorIds.length === 0) {
          // Get all competitors for the project
          const { data: competitors } = await supabase
            .from('competitors')
            .select('id')
            .eq('project_id', projectId)
            .eq('monitoring_enabled', true);

          competitorIds.push(...(competitors?.map(c => c.id) || []));
        }

        result = await monitorCompetitorChanges(supabase, projectId, competitorIds);
        break;
      }

      case 'trends': {
        // Get project industry from settings or infer from keywords
        const { data: projectData } = await supabase
          .from('projects')
          .select('settings, target_keywords')
          .eq('id', projectId)
          .single();

        const industry = projectData?.settings?.industry || 'digital marketing';
        result = await getTrendingKeywords(industry, params.timeframe);
        break;
      }

      case 'alerts': {
        // Get recent alerts for the project
        const { data: alerts } = await supabase
          .from('competitor_alerts')
          .select(`
            *,
            competitors:competitor_id (
              name,
              website_url
            )
          `)
          .in('competitor_id', 
            supabase
              .from('competitors')
              .select('id')
              .eq('project_id', projectId)
          )
          .order('created_at', { ascending: false })
          .limit(50);

        result = { alerts: alerts || [] };
        break;
      }

      default:
        return createErrorResponse('Invalid action specified');
    }

    return createResponse({
      action,
      projectId,
      result,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Competitor monitoring error:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
});