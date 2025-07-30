/**
 * Content Stats Component
 * Statistics overview for content management
 */

"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Eye, Target, Sparkles } from "lucide-react";

interface ContentItem {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  description?: string;
  content?: string;
  url?: string;
  content_type:
    | "document"
    | "image"
    | "video"
    | "social"
    | "blog_post"
    | "article"
    | "landing_page"
    | "product_page"
    | "category_page"
    | "other";
  status: "draft" | "published" | "under_review" | "archived" | "deleted";
  seo_score?: number;
  readability_score?: number;
  word_count?: number;
  file_size?: number;
  mime_type?: string;
  metadata?: any;
  meta_title?: string;
  meta_description?: string;
  focus_keywords?: string[];
  published_at?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  project?: {
    id: string;
    name: string;
    description?: string;
    team_id: string;
  };
  stats?: {
    views: number;
    engagement: number;
    conversions: number;
    lastAnalyzed: string;
  };
}

interface ContentStatsProps {
  content: ContentItem[];
  loading: boolean;
}

export const ContentStats = ({ content, loading }: ContentStatsProps) => {
  const stats = React.useMemo(() => {
    if (loading || content.length === 0) {
      return {
        totalContent: 0,
        publishedContent: 0,
        draftContent: 0,
        avgSeoScore: 0,
        avgReadabilityScore: 0,
        totalViews: 0,
        avgEngagement: 0,
        aiOptimizedContent: 0,
      };
    }

    const published = content.filter(c => c.status === "published");
    const drafts = content.filter(c => c.status === "draft");
    const withSeoScore = content.filter(c => c.seo_score);
    const withReadabilityScore = content.filter(c => c.readability_score);
    const aiOptimized = content.filter(c => c.seo_score && c.seo_score >= 70);

    return {
      totalContent: content.length,
      publishedContent: published.length,
      draftContent: drafts.length,
      avgSeoScore:
        withSeoScore.length > 0
          ? Math.round(
              withSeoScore.reduce((sum, c) => sum + (c.seo_score || 0), 0) /
                withSeoScore.length
            )
          : 0,
      avgReadabilityScore:
        withReadabilityScore.length > 0
          ? Math.round(
              withReadabilityScore.reduce(
                (sum, c) => sum + (c.readability_score || 0),
                0
              ) / withReadabilityScore.length
            )
          : 0,
      totalViews: content.reduce((sum, c) => sum + (c.stats?.views || 0), 0),
      avgEngagement:
        content.length > 0
          ? Math.round(
              content.reduce((sum, c) => sum + (c.stats?.engagement || 0), 0) /
                content.length
            )
          : 0,
      aiOptimizedContent: aiOptimized.length,
    };
  }, [content, loading]);

  if (loading) {
    return (
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
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Content */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Total Content
          </CardTitle>
          <FileText className="h-4 w-4 text-gray-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">
            {stats.totalContent}
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <span>{stats.publishedContent} published</span>
            <span>•</span>
            <span>{stats.draftContent} drafts</span>
          </div>
        </CardContent>
      </Card>

      {/* AI Optimized */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            AI Optimized
          </CardTitle>
          <Sparkles className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">
            {stats.aiOptimizedContent}
          </div>
          <div className="text-xs text-gray-500">SEO score ≥ 70</div>
        </CardContent>
      </Card>

      {/* Average SEO Score */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Avg SEO Score
          </CardTitle>
          <Target className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">
            {stats.avgSeoScore}
            <span className="text-sm font-normal text-gray-500">/100</span>
          </div>
          <div className="text-xs text-gray-500">
            Readability: {stats.avgReadabilityScore}/100
          </div>
        </CardContent>
      </Card>

      {/* Total Views */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Total Views
          </CardTitle>
          <Eye className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">
            {stats.totalViews.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">
            {stats.avgEngagement}% avg engagement
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
