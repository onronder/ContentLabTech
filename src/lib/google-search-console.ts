/**
 * Google Search Console API Integration
 * Provides search performance data and insights
 */

import { google } from 'googleapis';

// Types for Google Search Console integration
export interface SearchConsoleMetrics {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface QueryData extends SearchConsoleMetrics {
  query: string;
  change?: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
}

export interface PageData extends SearchConsoleMetrics {
  page: string;
  topQueries: QueryData[];
}

export interface DeviceData extends SearchConsoleMetrics {
  device: 'desktop' | 'mobile' | 'tablet';
}

export interface CountryData extends SearchConsoleMetrics {
  country: string;
}

export interface SearchAnalyticsRequest {
  siteUrl: string;
  startDate: string;
  endDate: string;
  dimensions?: ('query' | 'page' | 'country' | 'device' | 'searchAppearance')[];
  filters?: {
    dimension: string;
    expression: string;
    operator: 'equals' | 'notEquals' | 'contains' | 'notContains';
  }[];
  rowLimit?: number;
  startRow?: number;
}

export interface SearchAnalyticsResponse {
  queries: QueryData[];
  pages: PageData[];
  devices: DeviceData[];
  countries: CountryData[];
  totalMetrics: SearchConsoleMetrics;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

export interface IndexingStatus {
  url: string;
  status: 'SUBMITTED' | 'DUPLICATE_WITHOUT_USER_SUBMITTED_CANONICAL' | 'CRAWLED_AS_GOOGLE' | 'SUBMITTED_AND_INDEXED' | 'DUPLICATE_GOOGLE_CHOSE_CANONICAL' | 'DUPLICATE_USER_CHOSE_CANONICAL' | 'DUPLICATE_SUBMITTED_URL_NOT_SELECTED_AS_CANONICAL' | 'EXCLUDED_BY_ROBOTS_TXT' | 'EXCLUDED_BY_NOINDEX_TAG' | 'EXCLUDED_BY_HTTP_STATUS_CODE' | 'BLOCKED_BY_PAGE_REMOVAL_TOOL' | 'BLOCKED_BY_OTHER' | 'REDIRECT_ERROR' | 'ACCESS_DENIED' | 'SERVER_ERROR' | 'DISCOVERY_ERROR' | 'SOFT_404' | 'BLOCKED_BY_ROBOTS_TXT_4XX' | 'DUPLICATE_WITHOUT_USER_SUBMITTED_CANONICAL_BUT_CRAWLED' | 'UNKNOWN';
  lastCrawlTime?: string;
  indexingState?: 'INDEXING_ALLOWED' | 'BLOCKED_BY_META_TAG' | 'BLOCKED_BY_HTTP_HEADER' | 'BLOCKED_BY_ROBOTS_TXT';
  pageFetchState?: 'SUCCESSFUL' | 'SOFT_404' | 'BLOCKED_ROBOTS_TXT' | 'NOT_FOUND' | 'ACCESS_DENIED' | 'SERVER_ERROR' | 'REDIRECT_ERROR' | 'ACCESS_FORBIDDEN' | 'BLOCKED_4XX' | 'INTERNAL_CRAWL_ERROR' | 'INVALID_URL';
}

export interface SitemapInfo {
  path: string;
  lastSubmitted?: string;
  isPending: boolean;
  isSitemapsIndex: boolean;
  type: 'WEB' | 'IMAGE' | 'VIDEO' | 'NEWS';
  lastDownloaded?: string;
  warnings: number;
  errors: number;
  contents?: {
    type: 'WEB' | 'IMAGE' | 'VIDEO' | 'NEWS';
    submitted: number;
    indexed: number;
  }[];
}

class GoogleSearchConsoleClient {
  private searchConsole: any;
  private auth: any;

  constructor() {
    // Initialize Google APIs client
    this.auth = new google.auth.GoogleAuth({
      credentials: this.getCredentials(),
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });

    this.searchConsole = google.searchconsole({
      version: 'v1',
      auth: this.auth,
    });
  }

  private getCredentials() {
    const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!credentials) {
      throw new Error('Google Service Account credentials not configured');
    }

    try {
      return JSON.parse(credentials);
    } catch (error) {
      throw new Error('Invalid Google Service Account credentials format');
    }
  }

  /**
   * Get search analytics data
   */
  async getSearchAnalytics(request: SearchAnalyticsRequest): Promise<SearchAnalyticsResponse> {
    try {
      const response = await this.searchConsole.searchanalytics.query({
        siteUrl: request.siteUrl,
        requestBody: {
          startDate: request.startDate,
          endDate: request.endDate,
          dimensions: request.dimensions || ['query'],
          dimensionFilterGroups: request.filters ? [{
            filters: request.filters.map(filter => ({
              dimension: filter.dimension,
              expression: filter.expression,
              operator: filter.operator,
            })),
          }] : undefined,
          rowLimit: request.rowLimit || 1000,
          startRow: request.startRow || 0,
        },
      });

      const rows = response.data.rows || [];
      
      // Parse data based on dimensions
      const queries: QueryData[] = [];
      const pages: PageData[] = [];
      const devices: DeviceData[] = [];
      const countries: CountryData[] = [];

      rows.forEach((row: any) => {
        const metrics: SearchConsoleMetrics = {
          clicks: row.clicks || 0,
          impressions: row.impressions || 0,
          ctr: row.ctr || 0,
          position: row.position || 0,
        };

        if (request.dimensions?.includes('query')) {
          queries.push({
            query: row.keys[0] || '',
            ...metrics,
          });
        }

        if (request.dimensions?.includes('page')) {
          const pageIndex = request.dimensions.indexOf('page');
          pages.push({
            page: row.keys[pageIndex] || '',
            topQueries: [], // Would need separate query to get top queries
            ...metrics,
          });
        }

        if (request.dimensions?.includes('device')) {
          const deviceIndex = request.dimensions.indexOf('device');
          devices.push({
            device: row.keys[deviceIndex] as 'desktop' | 'mobile' | 'tablet',
            ...metrics,
          });
        }

        if (request.dimensions?.includes('country')) {
          const countryIndex = request.dimensions.indexOf('country');
          countries.push({
            country: row.keys[countryIndex] || '',
            ...metrics,
          });
        }
      });

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

      return {
        queries,
        pages,
        devices,
        countries,
        totalMetrics,
        dateRange: {
          startDate: request.startDate,
          endDate: request.endDate,
        },
      };
    } catch (error) {
      console.error('Error fetching search analytics:', error);
      throw new Error('Failed to fetch search analytics data');
    }
  }

  /**
   * Get top performing queries
   */
  async getTopQueries(
    siteUrl: string,
    startDate: string,
    endDate: string,
    limit: number = 100
  ): Promise<QueryData[]> {
    const response = await this.getSearchAnalytics({
      siteUrl,
      startDate,
      endDate,
      dimensions: ['query'],
      rowLimit: limit,
    });

    return response.queries.sort((a, b) => b.clicks - a.clicks);
  }

  /**
   * Get top performing pages
   */
  async getTopPages(
    siteUrl: string,
    startDate: string,
    endDate: string,
    limit: number = 100
  ): Promise<PageData[]> {
    const response = await this.getSearchAnalytics({
      siteUrl,
      startDate,
      endDate,
      dimensions: ['page'],
      rowLimit: limit,
    });

    return response.pages.sort((a, b) => b.clicks - a.clicks);
  }

  /**
   * Get performance by device
   */
  async getDevicePerformance(
    siteUrl: string,
    startDate: string,
    endDate: string
  ): Promise<DeviceData[]> {
    const response = await this.getSearchAnalytics({
      siteUrl,
      startDate,
      endDate,
      dimensions: ['device'],
    });

    return response.devices;
  }

  /**
   * Get performance by country
   */
  async getCountryPerformance(
    siteUrl: string,
    startDate: string,
    endDate: string,
    limit: number = 50
  ): Promise<CountryData[]> {
    const response = await this.getSearchAnalytics({
      siteUrl,
      startDate,
      endDate,
      dimensions: ['country'],
      rowLimit: limit,
    });

    return response.countries.sort((a, b) => b.clicks - a.clicks);
  }

  /**
   * Get queries for a specific page
   */
  async getPageQueries(
    siteUrl: string,
    pageUrl: string,
    startDate: string,
    endDate: string,
    limit: number = 100
  ): Promise<QueryData[]> {
    const response = await this.getSearchAnalytics({
      siteUrl,
      startDate,
      endDate,
      dimensions: ['query'],
      filters: [{
        dimension: 'page',
        expression: pageUrl,
        operator: 'equals',
      }],
      rowLimit: limit,
    });

    return response.queries.sort((a, b) => b.clicks - a.clicks);
  }

  /**
   * Get indexing status for URLs
   */
  async getIndexingStatus(siteUrl: string, urls: string[]): Promise<IndexingStatus[]> {
    try {
      const results: IndexingStatus[] = [];

      for (const url of urls) {
        try {
          const response = await this.searchConsole.urlInspection.index.inspect({
            requestBody: {
              inspectionUrl: url,
              siteUrl: siteUrl,
            },
          });

          const inspectionResult = response.data.inspectionResult;
          
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
            status: 'UNKNOWN',
          });
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return results;
    } catch (error) {
      console.error('Error getting indexing status:', error);
      throw new Error('Failed to get indexing status');
    }
  }

  /**
   * Get sitemap information
   */
  async getSitemaps(siteUrl: string): Promise<SitemapInfo[]> {
    try {
      const response = await this.searchConsole.sitemaps.list({
        siteUrl: siteUrl,
      });

      const sitemaps = response.data.sitemap || [];
      
      return sitemaps.map((sitemap: any) => ({
        path: sitemap.path || '',
        lastSubmitted: sitemap.lastSubmitted,
        isPending: sitemap.isPending || false,
        isSitemapsIndex: sitemap.isSitemapsIndex || false,
        type: sitemap.type || 'WEB',
        lastDownloaded: sitemap.lastDownloaded,
        warnings: sitemap.warnings || 0,
        errors: sitemap.errors || 0,
        contents: sitemap.contents || [],
      }));
    } catch (error) {
      console.error('Error fetching sitemaps:', error);
      throw new Error('Failed to fetch sitemap information');
    }
  }

  /**
   * Submit sitemap
   */
  async submitSitemap(siteUrl: string, sitemapUrl: string): Promise<boolean> {
    try {
      await this.searchConsole.sitemaps.submit({
        siteUrl: siteUrl,
        feedpath: sitemapUrl,
      });

      return true;
    } catch (error) {
      console.error('Error submitting sitemap:', error);
      return false;
    }
  }

  /**
   * Get search appearance data (rich results, etc.)
   */
  async getSearchAppearance(
    siteUrl: string,
    startDate: string,
    endDate: string
  ): Promise<{
    type: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }[]> {
    const response = await this.getSearchAnalytics({
      siteUrl,
      startDate,
      endDate,
      dimensions: ['searchAppearance'],
    });

    return response.queries.map(q => ({
      type: q.query, // In this case, query represents the search appearance type
      clicks: q.clicks,
      impressions: q.impressions,
      ctr: q.ctr,
      position: q.position,
    }));
  }

  /**
   * Compare performance between two date ranges
   */
  async comparePerformance(
    siteUrl: string,
    currentStartDate: string,
    currentEndDate: string,
    previousStartDate: string,
    previousEndDate: string
  ): Promise<{
    current: SearchConsoleMetrics;
    previous: SearchConsoleMetrics;
    change: {
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    };
    changePercent: {
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    };
  }> {
    const [currentData, previousData] = await Promise.all([
      this.getSearchAnalytics({
        siteUrl,
        startDate: currentStartDate,
        endDate: currentEndDate,
        dimensions: [],
      }),
      this.getSearchAnalytics({
        siteUrl,
        startDate: previousStartDate,
        endDate: previousEndDate,
        dimensions: [],
      }),
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
}

// Export singleton instance
export const googleSearchConsole = new GoogleSearchConsoleClient();

/**
 * Utility functions
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function getDateRange(days: number): { startDate: string; endDate: string } {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  };
}

export function getPreviousDateRange(days: number): { startDate: string; endDate: string } {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - days);
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  };
}

/**
 * Health check for Google Search Console API
 */
export async function healthCheck(): Promise<boolean> {
  try {
    // Try to make a simple API call
    const testSiteUrl = process.env.TEST_SITE_URL || 'https://example.com';
    const { startDate, endDate } = getDateRange(7);
    
    await googleSearchConsole.getSearchAnalytics({
      siteUrl: testSiteUrl,
      startDate,
      endDate,
      dimensions: ['query'],
      rowLimit: 1,
    });
    
    return true;
  } catch (error) {
    console.error('Google Search Console health check failed:', error);
    return false;
  }
}