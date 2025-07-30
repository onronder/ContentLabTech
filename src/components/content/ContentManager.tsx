/**
 * Content Manager Component
 * Comprehensive content management interface with AI-powered analysis
 */

"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/context";
import { endpoints } from "@/lib/api/client";
import {
  Plus,
  Search,
  FileText,
  Sparkles,
  BarChart3,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";

// Components
import { ContentCard } from "./ContentCard";
import { CreateContentModal } from "./CreateContentModal";
import { ContentFilters } from "./ContentFilters";
import { ContentStats } from "./ContentStats";
import { ContentEmptyState } from "./ContentEmptyState";

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

interface ContentFilters {
  projectId?: string | undefined;
  status?: string | undefined;
  contentType?: string | undefined;
  search?: string | undefined;
  limit: number;
  offset: number;
}

type ViewMode = "grid" | "list" | "analytics";

export const ContentManager = () => {
  const { currentTeam, teams, teamsLoading } = useAuth();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filters, setFilters] = useState<ContentFilters>({
    limit: 12,
    offset: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [totalContent, setTotalContent] = useState(0);
  const [isCreatingSample, setIsCreatingSample] = useState(false);

  // Enhanced debugging for team context with better error handling
  useEffect(() => {
    console.log("🔍 ContentManager: Team context debug:", {
      currentTeam: currentTeam,
      teamId: currentTeam?.id,
      teamName: currentTeam?.name,
      teamsCount: teams?.length || 0,
      teamsLoading,
      filters,
    });

    if (currentTeam?.id) {
      console.log("✅ Team available, loading content for:", currentTeam.name);
      loadContent();
    } else if (!teamsLoading) {
      console.log(
        "❌ No team available and not loading, checking fallback options"
      );
      if (teams && teams.length > 0) {
        console.log(
          "🔄 Teams available but no currentTeam, content loading disabled"
        );
        setError(
          "Please select a team to view content. Go to Settings to create or join a team."
        );
        setLoading(false);
      } else {
        console.log("🆕 No teams found, showing empty state");
        setLoading(false);
        setError(
          "No team found. Create a team first to start managing content."
        );
      }
    } else {
      console.log("⏳ Teams still loading, waiting...");
    }
  }, [currentTeam?.id, filters, teams, teamsLoading]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== filters.search) {
        setFilters(prev => ({
          ...prev,
          search: searchTerm || undefined,
          offset: 0,
        }));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, filters.search]);

  const loadContent = async () => {
    if (!currentTeam?.id) {
      console.log("❌ loadContent: No team ID available");
      return;
    }

    console.log("📡 Starting content API call for team:", currentTeam.id);
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, any> = {
        limit: filters.limit,
        offset: filters.offset,
        fallback: "team",
      };

      if (filters.status) params.status = filters.status;
      if (filters.contentType) params.contentType = filters.contentType;
      if (filters.projectId) params.projectId = filters.projectId;
      if (filters.search) params.search = filters.search;

      const response = await endpoints.content(currentTeam.id, params);

      if (!response.success) {
        console.error("❌ Content API Error:", response.error);
        throw new Error(response.error || "Failed to load content");
      }

      console.log("📡 Content API Success:", response.data);
      setContent(response.data?.content || []);
      setTotalContent(response.data?.total || 0);
    } catch (err) {
      console.error("❌ Content API Error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load content";

      // Check for specific error types
      if (errorMessage.includes("401")) {
        setError("Authentication required. Please log in again.");
      } else if (errorMessage.includes("403")) {
        setError("Insufficient permissions. Please check your team access.");
      } else {
        setError(`Content loading failed: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContentCreated = (newContent: ContentItem) => {
    setContent(prev => [newContent, ...prev]);
    setTotalContent(prev => prev + 1);
    setShowCreateModal(false);
  };

  const handleContentUpdated = (updatedContent: ContentItem) => {
    setContent(prev =>
      prev.map(c => (c.id === updatedContent.id ? updatedContent : c))
    );
  };

  const handleContentDeleted = (contentId: string) => {
    setContent(prev => prev.filter(c => c.id !== contentId));
    setTotalContent(prev => prev - 1);
  };

  const handleLoadMore = () => {
    setFilters(prev => ({
      ...prev,
      offset: prev.offset + prev.limit,
    }));
  };

  const handleCreateSampleContent = async () => {
    if (!currentTeam?.id) {
      setError("No team selected. Please select a team first.");
      return;
    }

    setIsCreatingSample(true);
    try {
      const response = await fetch("/api/content/sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create sample content");
      }

      const result = await response.json();
      console.log("✅ Sample content created:", result);

      // Reload content to show the new samples
      loadContent();
    } catch (err) {
      console.error("❌ Failed to create sample content:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create sample content";
      setError(`Sample content creation failed: ${errorMessage}`);
    } finally {
      setIsCreatingSample(false);
    }
  };

  if (loading && content.length === 0) {
    return (
      <div className="space-y-8">
        {/* Loading Header */}
        <div className="space-y-4">
          <div className="h-8 w-1/3 animate-pulse rounded-md bg-gray-200" />
          <div className="h-4 w-1/2 animate-pulse rounded-md bg-gray-200" />
        </div>

        {/* Loading Controls */}
        <div className="flex items-center justify-between">
          <div className="h-10 w-80 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-10 w-32 animate-pulse rounded-lg bg-gray-200" />
        </div>

        {/* Loading Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-xl bg-gray-200"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-2 flex items-center space-x-3">
            <div className="rounded-lg bg-green-50 p-2">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Content</h1>
              <p className="text-lg text-gray-600">
                Create, analyze, and optimize your content with AI
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Badge
            variant="outline"
            className="border-green-200 bg-green-50 text-green-700"
          >
            <Sparkles className="mr-1 h-3 w-3" />
            AI-Powered Analysis
          </Badge>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Content
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <ContentStats content={content} loading={loading} />

      {/* Controls */}
      <div className="flex items-center justify-between space-x-4">
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search content..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-80 pl-10"
            />
          </div>

          {/* Status Filter */}
          <Select
            value={filters.status || "all"}
            onValueChange={value =>
              setFilters(prev => ({
                ...prev,
                status: value === "all" ? undefined : value,
                offset: 0,
              }))
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          {/* Content Type Filter */}
          <Select
            value={filters.contentType || "all"}
            onValueChange={value =>
              setFilters(prev => ({
                ...prev,
                contentType: value === "all" ? undefined : value,
                offset: 0,
              }))
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="document">Document</SelectItem>
              <SelectItem value="image">Image</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="social">Social</SelectItem>
              <SelectItem value="blog_post">Blog Post</SelectItem>
              <SelectItem value="article">Article</SelectItem>
              <SelectItem value="landing_page">Landing Page</SelectItem>
              <SelectItem value="product_page">Product Page</SelectItem>
              <SelectItem value="category_page">Category Page</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* View Mode */}
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <div className="grid h-4 w-4 grid-cols-2 gap-0.5">
              <div className="rounded-sm bg-current" />
              <div className="rounded-sm bg-current" />
              <div className="rounded-sm bg-current" />
              <div className="rounded-sm bg-current" />
            </div>
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <div className="space-y-1">
              <div className="h-0.5 w-4 bg-current" />
              <div className="h-0.5 w-4 bg-current" />
              <div className="h-0.5 w-4 bg-current" />
            </div>
          </Button>
          <Button
            variant={viewMode === "analytics" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("analytics")}
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 p-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-red-900">
            Failed to load content
          </h3>
          <p className="mb-4 text-red-700">{error}</p>
          <Button onClick={loadContent} variant="outline">
            Try Again
          </Button>
        </div>
      ) : content.length === 0 && !loading ? (
        <ContentEmptyState
          onCreateContent={() => setShowCreateModal(true)}
          onCreateSampleContent={
            currentTeam?.id ? handleCreateSampleContent : undefined
          }
          isCreatingSample={isCreatingSample}
        />
      ) : (
        <div className="space-y-6">
          {/* Content Grid/List */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {content.map(item => (
                <ContentCard
                  key={item.id}
                  content={item}
                  onUpdate={handleContentUpdated}
                  onDelete={handleContentDeleted}
                />
              ))}
            </div>
          )}

          {viewMode === "list" && (
            <div className="space-y-4">
              {content.map(item => (
                <ContentCard
                  key={item.id}
                  content={item}
                  variant="list"
                  onUpdate={handleContentUpdated}
                  onDelete={handleContentDeleted}
                />
              ))}
            </div>
          )}

          {viewMode === "analytics" && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="mb-4 flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Content Analytics
                </h3>
              </div>
              <div className="text-center text-gray-500">
                <TrendingUp className="mx-auto mb-2 h-8 w-8" />
                <p>Advanced content analytics coming soon</p>
              </div>
            </div>
          )}

          {/* Load More */}
          {content.length < totalContent && (
            <div className="text-center">
              <Button
                onClick={handleLoadMore}
                variant="outline"
                disabled={loading}
              >
                {loading ? "Loading..." : "Load More Content"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Create Content Modal */}
      <CreateContentModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onContentCreated={handleContentCreated}
      />
    </div>
  );
};

// Old EmptyState component replaced with ContentEmptyState
// const EmptyState = ({ onCreateContent }: { onCreateContent: () => void }) => (...)
