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
  Image,
  Video,
  Share2,
  File,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
      case "under_review":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "archived":
        return "bg-gray-50 text-gray-700 border-gray-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getContentTypeLabel = (type: string) => {
    const labels = {
      document: "Document",
      image: "Image",
      video: "Video",
      social: "Social",
      blog_post: "Blog Post",
      article: "Article",
      landing_page: "Landing Page",
      product_page: "Product Page",
      category_page: "Category Page",
      other: "Other",
    };
    return labels[type as keyof typeof labels] || "Content";
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case "document":
        return <FileText className="h-4 w-4" />;
      case "image":
        return <Image className="h-4 w-4" />;
      case "video":
        return <Video className="h-4 w-4" />;
      case "social":
        return <Share2 className="h-4 w-4" />;
      case "blog_post":
        return <Edit className="h-4 w-4" />;
      case "article":
        return <FileText className="h-4 w-4" />;
      case "landing_page":
        return <Globe className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
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
      <div className="card-interactive flex items-center space-x-4 bg-white p-4 hover:shadow-md">
        <div className="flex-shrink-0">
          <div className="bg-gradient-neutral rounded-lg p-2 shadow-xs">
            {getContentTypeIcon(content.content_type)}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-2">
            <h3 className="font-display truncate text-sm font-semibold text-neutral-900">
              {content.title}
            </h3>
            <Badge variant="outline" className={getStatusColor(content.status)}>
              {content.status}
            </Badge>
          </div>
          <div className="mt-2 flex items-center space-x-4 text-xs text-neutral-500">
            <span className="font-medium">
              {content.project?.name || "Unknown Project"}
            </span>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
              {getContentTypeLabel(content.content_type)}
            </span>
            <span>{content.word_count || 0} words</span>
            <span className="text-neutral-400">
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
    <div className="card-elevated group relative bg-white p-6 hover:shadow-lg">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-neutral rounded-lg p-2 shadow-xs">
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
        <h3 className="font-display mb-3 line-clamp-2 text-lg font-semibold text-neutral-900">
          {content.title}
        </h3>
        <p className="font-body line-clamp-3 text-sm leading-relaxed text-neutral-600">
          {content.description ||
            content.meta_description ||
            (content.content
              ? content.content.replace(/<[^>]*>/g, "").substring(0, 150) +
                "..."
              : "No description available")}
        </p>
      </div>

      {/* Metadata */}
      <div className="mb-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span className="flex items-center space-x-2">
            <FileText className="text-primary-400 h-3 w-3" />
            <span className="font-medium">
              {content.project?.name || "Unknown Project"}
            </span>
          </span>
          <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700">
            {getContentTypeLabel(content.content_type)}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span className="flex items-center space-x-2">
            <FileText className="text-secondary-400 h-3 w-3" />
            <span>{content.word_count || 0} words</span>
          </span>
          <span className="flex items-center space-x-2">
            <Clock className="h-3 w-3 text-neutral-400" />
            <span>{formatDistanceToNow(new Date(content.updated_at))} ago</span>
          </span>
        </div>
      </div>

      {/* Scores */}
      {(content.seo_score || content.readability_score) && (
        <div className="mb-4 flex items-center space-x-4">
          {content.seo_score && (
            <div className="bg-info-50 flex items-center space-x-2 rounded-lg px-3 py-2">
              <Sparkles className="text-info-500 h-3 w-3" />
              <span className="text-info-700 text-xs font-medium">SEO:</span>
              <span
                className={cn(
                  "text-xs font-bold",
                  getScoreColor(content.seo_score)
                )}
              >
                {content.seo_score}/100
              </span>
            </div>
          )}
          {content.readability_score && (
            <div className="bg-success-50 flex items-center space-x-2 rounded-lg px-3 py-2">
              <Eye className="text-success-500 h-3 w-3" />
              <span className="text-success-700 text-xs font-medium">
                Readability:
              </span>
              <span
                className={cn(
                  "text-xs font-bold",
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
          <div className="flex flex-wrap gap-2">
            {content.focus_keywords.slice(0, 3).map((keyword, index) => (
              <Badge key={index} variant="ghost" className="text-xs shadow-xs">
                {keyword}
              </Badge>
            ))}
            {content.focus_keywords.length > 3 && (
              <Badge
                variant="outline"
                className="border-primary-200 text-primary-700 text-xs"
              >
                +{content.focus_keywords.length - 3} more
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between border-t border-neutral-100 pt-4 text-xs text-neutral-500">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-2 rounded-md bg-neutral-50 px-2 py-1">
            <Eye className="text-primary-400 h-3 w-3" />
            <span className="font-medium">
              {content.stats?.views?.toLocaleString() || "0"}
            </span>
          </span>
          <span className="flex items-center space-x-2 rounded-md bg-neutral-50 px-2 py-1">
            <TrendingUp className="text-success-400 h-3 w-3" />
            <span className="font-medium">
              {content.stats?.engagement || 0}%
            </span>
          </span>
        </div>
        {content.published_at && (
          <span className="flex items-center space-x-2 text-neutral-400">
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
