/**
 * Content Card Component
 * Display card for content items with analytics and actions
 */

"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { fetch } from "@/lib/utils/fetch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  ExternalLink,
  Copy,
  Eye,
  Clock,
  FileText,
  Globe,
  TrendingUp,
  Calendar,
  Sparkles,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ContentItem {
  id: string;
  project_id: string;
  title: string;
  content: string;
  url?: string;
  content_type:
    | "article"
    | "blog_post"
    | "landing_page"
    | "product_page"
    | "category_page"
    | "other";
  status: "draft" | "published" | "archived" | "deleted";
  seo_score?: number;
  readability_score?: number;
  word_count?: number;
  meta_title?: string;
  meta_description?: string;
  focus_keywords?: string[];
  published_at?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  project: {
    id: string;
    name: string;
    description: string;
  };
  stats: {
    views: number;
    engagement: number;
    conversions: number;
    lastAnalyzed: string;
  };
}

interface ContentCardProps {
  content: ContentItem;
  variant?: "grid" | "list";
  onUpdate: (content: ContentItem) => void;
  onDelete: (contentId: string) => void;
}

export const ContentCard = ({
  content,
  variant = "grid",
  onUpdate,
  onDelete,
}: ContentCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-50 text-green-700 border-green-200";
      case "draft":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "archived":
        return "bg-gray-50 text-gray-700 border-gray-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getContentTypeLabel = (type: string) => {
    const labels = {
      article: "Article",
      blog_post: "Blog Post",
      landing_page: "Landing Page",
      product_page: "Product Page",
      category_page: "Category Page",
      other: "Other",
    };
    return labels[type as keyof typeof labels] || "Content";
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case "article":
        return <FileText className="h-4 w-4" />;
      case "blog_post":
        return <Edit className="h-4 w-4" />;
      case "landing_page":
        return <Globe className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getScoreColor = (score?: number) => {
    if (!score) return "text-gray-400";
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/content/${content.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete content");
      }

      onDelete(content.id);
    } catch (error) {
      console.error("Failed to delete content:", error);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleDuplicate = async () => {
    try {
      const response = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...content,
          title: `${content.title} (Copy)`,
          status: "draft",
          published_at: null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to duplicate content");
      }

      const newContent = await response.json();
      onUpdate(newContent);
    } catch (error) {
      console.error("Failed to duplicate content:", error);
    }
  };

  if (variant === "list") {
    return (
      <div className="flex items-center space-x-4 rounded-xl border border-gray-200 bg-white p-4 hover:shadow-sm">
        <div className="flex-shrink-0">
          <div className="rounded-lg bg-gray-50 p-2">
            {getContentTypeIcon(content.content_type)}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-2">
            <h3 className="truncate text-sm font-semibold text-gray-900">
              {content.title}
            </h3>
            <Badge variant="outline" className={getStatusColor(content.status)}>
              {content.status}
            </Badge>
          </div>
          <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
            <span>{content.project.name}</span>
            <span>{getContentTypeLabel(content.content_type)}</span>
            <span>{content.word_count} words</span>
            <span>
              Updated {formatDistanceToNow(new Date(content.updated_at))} ago
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {content.seo_score && (
            <div className="text-center">
              <div
                className={cn(
                  "text-sm font-semibold",
                  getScoreColor(content.seo_score)
                )}
              >
                {content.seo_score}
              </div>
              <div className="text-xs text-gray-500">SEO</div>
            </div>
          )}
          {content.readability_score && (
            <div className="text-center">
              <div
                className={cn(
                  "text-sm font-semibold",
                  getScoreColor(content.readability_score)
                )}
              >
                {content.readability_score}
              </div>
              <div className="text-xs text-gray-500">Readability</div>
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              {content.url && (
                <DropdownMenuItem>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Live
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Content</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{content.title}&quot;?
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="group relative rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center space-x-2">
          <div className="rounded-lg bg-gray-50 p-2">
            {getContentTypeIcon(content.content_type)}
          </div>
          <div>
            <Badge variant="outline" className={getStatusColor(content.status)}>
              {content.status}
            </Badge>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDuplicate}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
            {content.url && (
              <DropdownMenuItem>
                <ExternalLink className="mr-2 h-4 w-4" />
                View Live
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setShowDeleteDialog(true)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <div className="mb-4">
        <h3 className="mb-2 line-clamp-2 text-lg font-semibold text-gray-900">
          {content.title}
        </h3>
        <p className="line-clamp-3 text-sm text-gray-600">
          {content.meta_description ||
            content.content.replace(/<[^>]*>/g, "").substring(0, 150) + "..."}
        </p>
      </div>

      {/* Metadata */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center space-x-1">
            <FileText className="h-3 w-3" />
            <span>{content.project.name}</span>
          </span>
          <span>{getContentTypeLabel(content.content_type)}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center space-x-1">
            <FileText className="h-3 w-3" />
            <span>{content.word_count} words</span>
          </span>
          <span className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>{formatDistanceToNow(new Date(content.updated_at))} ago</span>
          </span>
        </div>
      </div>

      {/* Scores */}
      {(content.seo_score || content.readability_score) && (
        <div className="mb-4 flex items-center space-x-4">
          {content.seo_score && (
            <div className="flex items-center space-x-1">
              <Sparkles className="h-3 w-3 text-blue-500" />
              <span className="text-xs text-gray-500">SEO:</span>
              <span
                className={cn(
                  "text-xs font-semibold",
                  getScoreColor(content.seo_score)
                )}
              >
                {content.seo_score}/100
              </span>
            </div>
          )}
          {content.readability_score && (
            <div className="flex items-center space-x-1">
              <Eye className="h-3 w-3 text-green-500" />
              <span className="text-xs text-gray-500">Readability:</span>
              <span
                className={cn(
                  "text-xs font-semibold",
                  getScoreColor(content.readability_score)
                )}
              >
                {content.readability_score}/100
              </span>
            </div>
          )}
        </div>
      )}

      {/* Keywords */}
      {content.focus_keywords && content.focus_keywords.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {content.focus_keywords.slice(0, 3).map((keyword, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {keyword}
              </Badge>
            ))}
            {content.focus_keywords.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{content.focus_keywords.length - 3} more
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1">
            <Eye className="h-3 w-3" />
            <span>{content.stats.views.toLocaleString()}</span>
          </span>
          <span className="flex items-center space-x-1">
            <TrendingUp className="h-3 w-3" />
            <span>{content.stats.engagement}%</span>
          </span>
        </div>
        {content.published_at && (
          <span className="flex items-center space-x-1">
            <Calendar className="h-3 w-3" />
            <span>{new Date(content.published_at).toLocaleDateString()}</span>
          </span>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Content</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{content.title}&quot;? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
