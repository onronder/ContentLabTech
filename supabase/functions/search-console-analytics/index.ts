/**
 * Google Search Console Analytics Edge Function
 * Provides search performance data and insights
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

interface SearchConsoleRequest {
  projectId: string;
  action: 'analytics' | 'queries' | 'pages' | 'indexing' | 'comparison';
  params?: {
    siteUrl?: string;
    startDate?: string;
    endDate?: string;
    dimensions?: string[];
    filters?: any[];
    pageUrl?: string;
    urls?: string[];
    rowLimit?: number;
    compareWith?: {
      startDate: string;
      endDate: string;
    };
  };
}

interface SearchConsoleMetrics {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

/**
 * Make Google Search Console API request
 */
async function makeGSCRequest(
  endpoint: string,
  siteUrl: string,
  requestBody?: any
): Promise<any> {
  const GOOGLE_SERVICE_ACCOUNT_KEY = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
  if (!GOOGLE_SERVICE_ACCOUNT_KEY) {
    throw new Error('Google Service Account credentials not configured');
  }

  let credentials;
  try {
    credentials = JSON.parse(GOOGLE_SERVICE_ACCOUNT_KEY);
  } catch (error) {
    throw new Error('Invalid Google Service Account credentials format');
  }

  // Get OAuth token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: await createJWT(credentials),
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error('Failed to get OAuth token');
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;

  // Make API request
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/${endpoint}`;
  
  const response = await fetch(url, {
    method: requestBody ? 'POST' : 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: requestBody ? JSON.stringify(requestBody) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Search Console API error: ${response.status} - ${error}`);
  }

  return await response.json();
}

/**
 * Create JWT for Google API authentication
 */
async function createJWT(credentials: any): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const signatureData = `${encodedHeader}.${encodedPayload}`;
  
  // Import private key
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    new TextEncoder().encode(credentials.private_key),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  // Sign the data
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(signatureData)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${signatureData}.${encodedSignature}`;
}

/**
 * Get search analytics data
 */
async function getSearchAnalytics(
  siteUrl: string,
  startDate: string,
  endDate: string,
  dimensions: string[] = ['query'],
  filters: any[] = [],
  rowLimit: number = 1000
): Promise<{
  rows: any[];
  totalMetrics: SearchConsoleMetrics;
}> {
  const requestBody = {
    startDate,
    endDate,
    dimensions,
    dimensionFilterGroups: filters.length > 0 ? [{ filters }] : undefined,
    rowLimit,
    startRow: 0,
  };

  const response = await makeGSCRequest('searchAnalytics/query', siteUrl, requestBody);
  const rows = response.rows || [];

  // Calculate total metrics
  const totalMetrics: SearchConsoleMetrics = rows.reduce(
    (total: SearchConsoleMetrics, row: any) => ({
      clicks: total.clicks + (row.clicks || 0),
      impressions: total.impressions + (row.impressions || 0),
      ctr: 0, // Will be calculated after reduction
      position: 0, // Will be calculated after reduction
    }),
    { clicks: 0, impressions: 0, ctr: 0, position: 0 }
  );

  totalMetrics.ctr = totalMetrics.impressions > 0 ? 
    (totalMetrics.clicks / totalMetrics.impressions) * 100 : 0;
  
  totalMetrics.position = rows.length > 0 ? 
    rows.reduce((sum: number, row: any) => sum + (row.position || 0), 0) / rows.length : 0;

  return { rows, totalMetrics };
}

/**
 * Get top performing queries
 */
async function getTopQueries(
  siteUrl: string,
  startDate: string,
  endDate: string,
  limit: number = 100,
  pageUrl?: string
): Promise<{
  queries: {
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }[];
  totalMetrics: SearchConsoleMetrics;
}> {
  const filters = pageUrl ? [{
    dimension: 'page',
    expression: pageUrl,
    operator: 'equals',
  }] : [];

  const { rows, totalMetrics } = await getSearchAnalytics(
    siteUrl,
    startDate,
    endDate,
    ['query'],
    filters,
    limit
  );

  const queries = rows.map((row: any) => ({
    query: row.keys[0] || '',
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: row.ctr || 0,
    position: row.position || 0,
  })).sort((a, b) => b.clicks - a.clicks);

  return { queries, totalMetrics };
}

/**
 * Get top performing pages
 */
async function getTopPages(
  siteUrl: string,
  startDate: string,
  endDate: string,
  limit: number = 100
): Promise<{
  pages: {
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }[];
  totalMetrics: SearchConsoleMetrics;
}> {
  const { rows, totalMetrics } = await getSearchAnalytics(
    siteUrl,
    startDate,
    endDate,
    ['page'],
    [],
    limit
  );

  const pages = rows.map((row: any) => ({
    page: row.keys[0] || '',
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: row.ctr || 0,
    position: row.position || 0,
  })).sort((a, b) => b.clicks - a.clicks);

  return { pages, totalMetrics };
}

/**
 * Get device performance data
 */
async function getDevicePerformance(
  siteUrl: string,
  startDate: string,
  endDate: string
): Promise<{
  devices: {
    device: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }[];
}> {
  const { rows } = await getSearchAnalytics(
    siteUrl,
    startDate,
    endDate,
    ['device']
  );

  const devices = rows.map((row: any) => ({
    device: row.keys[0] || '',
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: row.ctr || 0,
    position: row.position || 0,
  }));

  return { devices };
}

/**
 * Compare performance between two periods
 */
async function comparePerformance(
  siteUrl: string,
  currentStartDate: string,
  currentEndDate: string,
  previousStartDate: string,
  previousEndDate: string
): Promise<{
  current: SearchConsoleMetrics;
  previous: SearchConsoleMetrics;
  change: SearchConsoleMetrics;
  changePercent: SearchConsoleMetrics;
}> {
  const [currentData, previousData] = await Promise.all([
    getSearchAnalytics(siteUrl, currentStartDate, currentEndDate, []),
    getSearchAnalytics(siteUrl, previousStartDate, previousEndDate, []),
  ]);

  const current = currentData.totalMetrics;
  const previous = previousData.totalMetrics;

  const change = {
    clicks: current.clicks - previous.clicks,
    impressions: current.impressions - previous.impressions,
    ctr: current.ctr - previous.ctr,
    position: current.position - previous.position,
  };

  const changePercent = {
    clicks: previous.clicks > 0 ? (change.clicks / previous.clicks) * 100 : 0,
    impressions: previous.impressions > 0 ? (change.impressions / previous.impressions) * 100 : 0,
    ctr: previous.ctr > 0 ? (change.ctr / previous.ctr) * 100 : 0,
    position: previous.position > 0 ? (change.position / previous.position) * 100 : 0,
  };

  return {
    current,
    previous,
    change,
    changePercent,
  };
}

/**
 * Get indexing status for URLs
 */
async function getIndexingStatus(siteUrl: string, urls: string[]): Promise<{
  url: string;
  status: string;
  lastCrawlTime?: string;
  indexingState?: string;
  pageFetchState?: string;
}[]> {
  const results = [];

  for (const url of urls.slice(0, 10)) { // Limit to 10 URLs to avoid rate limits
    try {
      const response = await makeGSCRequest('urlInspection/index:inspect', siteUrl, {
        inspectionUrl: url,
        siteUrl: siteUrl,
      });

      const inspectionResult = response.inspectionResult;
      
      results.push({
        url,
        status: inspectionResult?.indexStatusResult?.verdict || 'UNKNOWN',
        lastCrawlTime: inspectionResult?.indexStatusResult?.lastCrawlTime,
        indexingState: inspectionResult?.indexStatusResult?.indexingState,
        pageFetchState: inspectionResult?.indexStatusResult?.pageFetchState,
      });
    } catch (error) {
      console.error(`Error inspecting URL ${url}:`, error);
      results.push({
        url,
        status: 'ERROR',
      });
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return results;
}

/**
 * Utility function to format dates
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get date range
 */
function getDateRange(days: number): { startDate: string; endDate: string } {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1); // GSC data is available with 1-day delay
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days + 1);

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  };
}

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
    const body: SearchConsoleRequest = await req.json();
    const { projectId, action, params = {} } = body;

    if (!projectId) {
      return createErrorResponse('Project ID is required');
    }

    // Get database client
    const supabase = createDatabaseClient();

    // Check user access to project
    const { data: project } = await supabase
      .from('projects')
      .select('team_id, website_url, settings')
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

    // Get site URL from params or project
    const siteUrl = params.siteUrl || project.website_url;
    if (!siteUrl) {
      return createErrorResponse('Site URL is required');
    }

    // Get date range
    const defaultDateRange = getDateRange(30);
    const startDate = params.startDate || defaultDateRange.startDate;
    const endDate = params.endDate || defaultDateRange.endDate;

    let result;

    switch (action) {
      case 'analytics': {
        const { totalMetrics } = await getSearchAnalytics(
          siteUrl,
          startDate,
          endDate,
          params.dimensions || [],
          params.filters || [],
          params.rowLimit || 1000
        );

        // Also get device breakdown
        const { devices } = await getDevicePerformance(siteUrl, startDate, endDate);

        result = {
          totalMetrics,
          devices,
          dateRange: { startDate, endDate },
        };
        break;
      }

      case 'queries': {
        result = await getTopQueries(
          siteUrl,
          startDate,
          endDate,
          params.rowLimit || 100,
          params.pageUrl
        );
        break;
      }

      case 'pages': {
        result = await getTopPages(
          siteUrl,
          startDate,
          endDate,
          params.rowLimit || 100
        );
        break;
      }

      case 'indexing': {
        if (!params.urls || params.urls.length === 0) {
          return createErrorResponse('URLs are required for indexing status');
        }
        
        result = {
          indexingStatus: await getIndexingStatus(siteUrl, params.urls),
        };
        break;
      }

      case 'comparison': {
        if (!params.compareWith) {
          return createErrorResponse('Comparison date range is required');
        }

        result = await comparePerformance(
          siteUrl,
          startDate,
          endDate,
          params.compareWith.startDate,
          params.compareWith.endDate
        );
        break;
      }

      default:
        return createErrorResponse('Invalid action specified');
    }

    // Save analytics data to database for historical tracking
    if (action === 'analytics' || action === 'queries' || action === 'pages') {
      try {
        await supabase.from('analysis_results').insert({
          project_id: projectId,
          analysis_type: 'search_console_analytics',
          results: {
            action,
            siteUrl,
            dateRange: { startDate, endDate },
            data: result,
          },
          confidence_score: 100, // GSC data is authoritative
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        });
      } catch (dbError) {
        console.error('Error saving analytics to database:', dbError);
        // Don't fail the request if database save fails
      }
    }

    return createResponse({
      action,
      projectId,
      siteUrl,
      result,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Search Console analytics error:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
});