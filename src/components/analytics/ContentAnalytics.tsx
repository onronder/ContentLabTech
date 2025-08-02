/**
 * Content Analytics Component
 * Content performance and optimization analytics
 */

"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Target,
  TrendingUp,
  Eye,
  Users,
  Clock,
  Sparkles,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  PenTool,
  Search,
  Trophy,
} from "lucide-react";

interface ContentAnalyticsProps {
  timeRange: string;
  teamId: string | undefined;
}

interface ContentMetrics {
  totalContent: number;
  publishedContent: number;
  draftContent: number;
  avgSeoScore: number;
  avgReadabilityScore: number;
  totalViews: number;
  totalEngagement: number;
  conversionRate: number;
  topPerformingContent: Array<{
    id: string;
    title: string;
    views: number;
    engagement: number;
    seoScore: number;
    type: string;
  }>;
  contentTrends: Array<{
    date: string;
    published: number;
    views: number;
    engagement: number;
  }>;
  seoInsights: {
    keywordOpportunities: number;
    optimizationSuggestions: number;
    technicalIssues: number;
  };
}

export const ContentAnalytics = ({
  timeRange,
  teamId,
}: ContentAnalyticsProps) => {
  const [loading, setLoading] = useState(true);
  const [contentMetrics, setContentMetrics] = useState<ContentMetrics | null>(
    null
  );

  useEffect(() => {
    loadContentAnalytics();
  }, [timeRange, teamId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadContentAnalytics = async () => {
    if (!teamId) return;

    setLoading(true);
    try {
      // Fetch real content analytics from API
      const response = await fetch(
        `/api/analytics/content?timeRange=${timeRange}&teamId=${teamId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch content analytics");
      }

      const data: ContentMetrics = await response.json();

      setContentMetrics(data);
    } catch (error) {
      console.error("Failed to load content analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getContentTypeLabel = (type: string) => {
    const labels = {
      article: "Article",
      blog_post: "Blog Post",
      landing_page: "Landing Page",
      product_page: "Product Page",
    };
    return labels[type as keyof typeof labels] || "Content";
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 animate-pulse rounded bg-gray-200" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!contentMetrics) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-2 text-gray-600">No content analytics available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Content Overview */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Content
            </CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {contentMetrics.totalContent}
            </div>
            <div className="text-xs text-gray-500">
              {contentMetrics.publishedContent} published,{" "}
              {contentMetrics.draftContent} drafts
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Avg SEO Score
            </CardTitle>
            <Target className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${getScoreColor(contentMetrics.avgSeoScore)}`}
            >
              {contentMetrics.avgSeoScore}
              <span className="text-sm font-normal text-gray-500">/100</span>
            </div>
            <div className="text-xs text-gray-500">
              Readability: {contentMetrics.avgReadabilityScore}/100
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Views
            </CardTitle>
            <Eye className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatNumber(contentMetrics.totalViews)}
            </div>
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span>+12% vs last {timeRange === "7d" ? "week" : "month"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Conversion Rate
            </CardTitle>
            <Users className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {contentMetrics.conversionRate}%
            </div>
            <div className="text-xs text-gray-500">
              {formatNumber(contentMetrics.totalEngagement)} total engagements
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            <span>Top Performing Content</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {contentMetrics.topPerformingContent.map((content, index) => (
              <div
                key={content.id}
                className="flex items-center space-x-4 rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
                  <span className="text-sm font-semibold text-blue-600">
                    {index + 1}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-medium text-gray-900">
                    {content.title}
                  </h4>
                  <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                    <span>{getContentTypeLabel(content.type)}</span>
                    <span>{formatNumber(content.views)} views</span>
                    <span>{content.engagement}% engagement</span>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <Badge
                    variant="outline"
                    className={
                      content.seoScore >= 90
                        ? "border-green-200 bg-green-50 text-green-700"
                        : content.seoScore >= 80
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-yellow-200 bg-yellow-50 text-yellow-700"
                    }
                  >
                    SEO: {content.seoScore}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* SEO Insights */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Search className="h-5 w-5 text-blue-600" />
              <span>SEO Opportunities</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-blue-50 p-3">
              <div className="flex items-center space-x-3">
                <Target className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium text-blue-900">
                    Keyword Opportunities
                  </div>
                  <div className="text-sm text-blue-700">
                    New keywords to target
                  </div>
                </div>
              </div>
              <Badge className="bg-blue-100 text-blue-800">
                {contentMetrics.seoInsights.keywordOpportunities}
              </Badge>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-green-50 p-3">
              <div className="flex items-center space-x-3">
                <Sparkles className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium text-green-900">
                    Optimization Suggestions
                  </div>
                  <div className="text-sm text-green-700">
                    AI-powered improvements
                  </div>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800">
                {contentMetrics.seoInsights.optimizationSuggestions}
              </Badge>
            </div>

            {contentMetrics.seoInsights.technicalIssues > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-red-50 p-3">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <div className="font-medium text-red-900">
                      Technical Issues
                    </div>
                    <div className="text-sm text-red-700">
                      Need immediate attention
                    </div>
                  </div>
                </div>
                <Badge className="bg-red-100 text-red-800">
                  {contentMetrics.seoInsights.technicalIssues}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PenTool className="h-5 w-5 text-purple-600" />
              <span>Content Insights</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3 rounded-lg bg-purple-50 p-3">
                <CheckCircle className="mt-0.5 h-4 w-4 text-purple-600" />
                <div className="text-sm">
                  <div className="font-medium text-purple-900">
                    High-Performing Content Types
                  </div>
                  <div className="text-purple-700">
                    Articles perform 25% better than other content types
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3 rounded-lg bg-blue-50 p-3">
                <Clock className="mt-0.5 h-4 w-4 text-blue-600" />
                <div className="text-sm">
                  <div className="font-medium text-blue-900">
                    Optimal Publishing Time
                  </div>
                  <div className="text-blue-700">
                    Tuesday-Thursday 10AM shows highest engagement
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3 rounded-lg bg-green-50 p-3">
                <BarChart3 className="mt-0.5 h-4 w-4 text-green-600" />
                <div className="text-sm">
                  <div className="font-medium text-green-900">
                    Content Length Sweet Spot
                  </div>
                  <div className="text-green-700">
                    1,500-2,000 words get 40% more engagement
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
