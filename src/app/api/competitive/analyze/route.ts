import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, createClient, validateProjectAccess, createErrorResponse } from '@/lib/auth/session';

interface CompetitiveAnalysisRequest {
  projectId: string;
  action: 'analyze' | 'monitor' | 'compare' | 'keywords';
  params: {
    competitorUrls?: string[];
    competitorId?: string;
    keywords?: string[];
    analysisType?: 'ranking' | 'content' | 'backlinks' | 'keywords' | 'comprehensive';
    includeContentGaps?: boolean;
    includeTechnicalSeo?: boolean;
    monitoringFrequency?: 'daily' | 'weekly' | 'monthly';
  };
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return createErrorResponse('Authentication required', 401);
    }

    // Parse request body
    const body: CompetitiveAnalysisRequest = await request.json();
    const { projectId, action, params } = body;

    if (!projectId || !action) {
      return createErrorResponse('Project ID and action are required', 400);
    }

    // Validate project access
    const hasAccess = await validateProjectAccess(projectId, 'member');
    if (!hasAccess) {
      return createErrorResponse('Insufficient permissions', 403);
    }

    const supabase = createClient();

    let result;

    switch (action) {
      case 'analyze': {
        if (!params.competitorUrls?.length && !params.competitorId) {
          return createErrorResponse('Competitor URLs or competitor ID required for analysis', 400);
        }

        let competitorUrls = params.competitorUrls || [];

        // If competitorId provided, get the competitor URL
        if (params.competitorId) {
          const { data: competitor } = await supabase
            .from('competitors')
            .select('competitor_url')
            .eq('id', params.competitorId)
            .eq('project_id', projectId)
            .single();

          if (competitor) {
            competitorUrls = [competitor.competitor_url];
          } else {
            return createErrorResponse('Competitor not found', 404);
          }
        }

        // Get project keywords for analysis
        const { data: project } = await supabase
          .from('projects')
          .select('target_keywords')
          .eq('id', projectId)
          .single();

        const keywords = params.keywords || project?.target_keywords || [];

        // Call the competitor monitoring Edge Function
        const { data: analysis, error: analysisError } = await supabase.functions.invoke(
          'competitor-monitoring',
          {
            body: {
              action: 'analyze_competitors',
              projectId,
              competitorUrls,
              keywords,
              analysisType: params.analysisType || 'comprehensive',
              options: {
                includeContentGaps: params.includeContentGaps !== false,
                includeTechnicalSeo: params.includeTechnicalSeo !== false,
              },
            },
          }
        );

        if (analysisError) {
          console.error('Competitive analysis error:', analysisError);
          return createErrorResponse('Failed to analyze competitors', 500);
        }

        // Store analysis results
        if (analysis?.result) {
          await Promise.all(
            competitorUrls.map(async (url) => {
              // Update or create competitor record
              await supabase
                .from('competitors')
                .upsert({
                  project_id: projectId,
                  competitor_url: url,
                  competitor_name: extractDomainName(url),
                  is_active: true,
                  added_by: user.id,
                  last_analyzed: new Date().toISOString(),
                }, {
                  onConflict: 'project_id,competitor_url',
                });

              // Store analysis result
              const competitorAnalysis = analysis.result.competitors?.find(
                (c: any) => c.url === url
              );

              if (competitorAnalysis) {
                await supabase
                  .from('competitor_analytics')
                  .insert({
                    project_id: projectId,
                    competitor_url: url,
                    analysis_date: new Date().toISOString().split('T')[0],
                    ranking_data: competitorAnalysis.rankings || {},
                    traffic_data: competitorAnalysis.traffic || {},
                    content_data: competitorAnalysis.content || {},
                    technical_data: competitorAnalysis.technical || {},
                    keyword_data: competitorAnalysis.keywords || {},
                  });
              }
            })
          );

          // Log competitive analysis
          await supabase
            .from('user_events')
            .insert({
              user_id: user.id,
              event_type: 'competitive_analysis_performed',
              event_data: {
                project_id: projectId,
                competitor_count: competitorUrls.length,
                analysis_type: params.analysisType,
                keywords_analyzed: keywords.length,
              },
            });
        }

        result = analysis?.result;
        break;
      }

      case 'monitor': {
        // Set up competitive monitoring
        const { data: competitors } = await supabase
          .from('competitors')
          .select('*')
          .eq('project_id', projectId)
          .eq('is_active', true);

        if (!competitors?.length) {
          return createErrorResponse('No active competitors found for monitoring', 400);
        }

        // Call monitoring setup
        const { data: monitoringSetup, error: monitoringError } = await supabase.functions.invoke(
          'competitor-monitoring',
          {
            body: {
              action: 'setup_monitoring',
              projectId,
              competitors: competitors.map(c => ({
                id: c.id,
                url: c.competitor_url,
                name: c.competitor_name,
              })),
              frequency: params.monitoringFrequency || 'weekly',
              keywords: params.keywords || [],
            },
          }
        );

        if (monitoringError) {
          console.error('Monitoring setup error:', monitoringError);
          return createErrorResponse('Failed to setup competitive monitoring', 500);
        }

        result = monitoringSetup?.result;
        break;
      }

      case 'compare': {
        if (!params.competitorUrls?.length || params.competitorUrls.length < 2) {
          return createErrorResponse('At least 2 competitor URLs required for comparison', 400);
        }

        // Get recent analytics for comparison
        const { data: competitorAnalytics } = await supabase
          .from('competitor_analytics')
          .select('*')
          .eq('project_id', projectId)
          .in('competitor_url', params.competitorUrls)
          .gte('analysis_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .order('analysis_date', { ascending: false });

        // Group by competitor
        const competitorComparison = params.competitorUrls.map(url => {
          const analytics = competitorAnalytics?.filter(a => a.competitor_url === url) || [];
          const latestAnalytics = analytics[0];

          return {
            url,
            name: extractDomainName(url),
            latestData: latestAnalytics,
            analytics: analytics.slice(0, 10), // Last 10 data points
            summary: calculateCompetitorSummary(analytics),
          };
        });

        result = {
          comparison: competitorComparison,
          timeframe: 30,
          analysisCount: competitorAnalytics?.length || 0,
        };

        break;
      }

      case 'keywords': {
        // Keyword gap analysis
        const { data: keywordGaps, error: keywordError } = await supabase.functions.invoke(
          'competitor-monitoring',
          {
            body: {
              action: 'keyword_gap_analysis',
              projectId,
              competitorUrls: params.competitorUrls || [],
              targetKeywords: params.keywords || [],
            },
          }
        );

        if (keywordError) {
          console.error('Keyword gap analysis error:', keywordError);
          return createErrorResponse('Failed to perform keyword gap analysis', 500);
        }

        // Store keyword opportunities
        if (keywordGaps?.result?.opportunities) {
          const opportunities = keywordGaps.result.opportunities.map((opp: any) => ({
            project_id: projectId,
            keyword: opp.keyword,
            search_volume: opp.searchVolume || 0,
            keyword_difficulty: opp.difficulty || 0,
            competition_level: opp.competition || 'medium',
            opportunity_score: opp.opportunityScore || 0,
            current_ranking: opp.currentRanking || null,
            competitor_rankings: opp.competitorRankings || {},
            identified_by: user.id,
          }));

          await supabase
            .from('keyword_opportunities')
            .upsert(opportunities, {
              onConflict: 'project_id,keyword',
            });
        }

        result = keywordGaps?.result;
        break;
      }

      default:
        return createErrorResponse('Invalid action specified', 400);
    }

    return NextResponse.json({
      success: true,
      action,
      projectId,
      result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return createErrorResponse('Authentication required', 401);
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const competitorUrl = searchParams.get('competitorUrl');
    const timeframe = parseInt(searchParams.get('timeframe') || '30');
    const analysisType = searchParams.get('analysisType');

    if (!projectId) {
      return createErrorResponse('Project ID is required', 400);
    }

    // Validate project access
    const hasAccess = await validateProjectAccess(projectId, 'viewer');
    if (!hasAccess) {
      return createErrorResponse('Insufficient permissions', 403);
    }

    const supabase = createClient();

    // Get competitors
    let query = supabase
      .from('competitors')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true);

    if (competitorUrl) {
      query = query.eq('competitor_url', competitorUrl);
    }

    const { data: competitors, error: competitorError } = await query;

    if (competitorError) {
      console.error('Error fetching competitors:', competitorError);
      return createErrorResponse('Failed to fetch competitors', 500);
    }

    // Get recent analytics
    const startDate = new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000);
    const competitorUrls = competitors?.map(c => c.competitor_url) || [];

    let analyticsQuery = supabase
      .from('competitor_analytics')
      .select('*')
      .eq('project_id', projectId)
      .gte('analysis_date', startDate.toISOString().split('T')[0])
      .order('analysis_date', { ascending: false });

    if (competitorUrls.length > 0) {
      analyticsQuery = analyticsQuery.in('competitor_url', competitorUrls);
    }

    const { data: analytics, error: analyticsError } = await analyticsQuery;

    if (analyticsError) {
      console.error('Error fetching analytics:', analyticsError);
      return createErrorResponse('Failed to fetch competitive analytics', 500);
    }

    // Get keyword opportunities
    const { data: keywordOpportunities } = await supabase
      .from('keyword_opportunities')
      .select('*')
      .eq('project_id', projectId)
      .order('opportunity_score', { ascending: false })
      .limit(20);

    // Process and group data
    const competitorData = competitors?.map(competitor => {
      const competitorAnalytics = analytics?.filter(a => a.competitor_url === competitor.competitor_url) || [];
      return {
        ...competitor,
        analytics: competitorAnalytics,
        latestAnalysis: competitorAnalytics[0] || null,
        summary: calculateCompetitorSummary(competitorAnalytics),
      };
    }) || [];

    return NextResponse.json({
      competitors: competitorData,
      keywordOpportunities: keywordOpportunities || [],
      summary: {
        totalCompetitors: competitors?.length || 0,
        activeMonitoring: competitors?.filter(c => c.last_analyzed).length || 0,
        keywordOpportunities: keywordOpportunities?.length || 0,
        lastUpdated: analytics?.[0]?.analysis_date || null,
      },
      timeframe,
      projectId,
    });

  } catch (error) {
    console.error('API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

// Helper functions
function extractDomainName(url: string): string {
  try {
    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    const domain = new URL(url).hostname;
    return domain.replace('www.', '');
  } catch (error) {
    // If URL parsing fails, return the original string cleaned up
    return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  }
}

function calculateCompetitorSummary(analytics: any[]): any {
  if (!analytics.length) {
    return {
      avgRanking: 0,
      trafficTrend: 'stable',
      lastUpdated: null,
      dataPoints: 0,
    };
  }

  // Sort by date
  const sortedAnalytics = analytics.sort((a, b) => 
    new Date(a.analysis_date).getTime() - new Date(b.analysis_date).getTime()
  );

  // Calculate average ranking from ranking data
  const rankingData = sortedAnalytics
    .map(a => a.ranking_data)
    .filter(rd => rd && typeof rd === 'object');

  let avgRanking = 0;
  if (rankingData.length > 0) {
    const totalPositions = rankingData.reduce((sum, rd) => {
      const positions = Object.values(rd).filter(p => typeof p === 'number') as number[];
      return sum + (positions.length > 0 ? positions.reduce((a, b) => a + b, 0) / positions.length : 0);
    }, 0);
    avgRanking = totalPositions / rankingData.length;
  }

  // Determine traffic trend (simplified)
  let trafficTrend = 'stable';
  if (sortedAnalytics.length >= 2) {
    const firstTraffic = sortedAnalytics[0].traffic_data?.estimated_traffic || 0;
    const lastTraffic = sortedAnalytics[sortedAnalytics.length - 1].traffic_data?.estimated_traffic || 0;
    
    if (lastTraffic > firstTraffic * 1.1) {
      trafficTrend = 'increasing';
    } else if (lastTraffic < firstTraffic * 0.9) {
      trafficTrend = 'decreasing';
    }
  }

  return {
    avgRanking: Math.round(avgRanking),
    trafficTrend,
    lastUpdated: sortedAnalytics[sortedAnalytics.length - 1]?.analysis_date,
    dataPoints: analytics.length,
  };
}