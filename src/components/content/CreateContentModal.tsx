/**
 * Create Content Modal Component
 * Modal interface for creating new content items
 */

"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth/context";
import { Loader2, FileText, PenTool, Sparkles } from "lucide-react";

interface ContentItem {
  id: string;
  project_id: string;
  title: string;
  content: string;
  url?: string;
  content_type: "article" | "blog_post" | "landing_page" | "product_page" | "category_page" | "other";
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

interface CreateContentModalProps {
  open: boolean;
  onClose: () => void;
  onContentCreated: (content: ContentItem) => void;
}

export const CreateContentModal = ({
  open,
  onClose,
  onContentCreated,
}: CreateContentModalProps) => {
  const { currentTeam } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    url: "",
    content_type: "article" as const,
    status: "draft" as const,
    meta_title: "",
    meta_description: "",
    focus_keywords: "",
    project_id: "",
  });

  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  // Load projects when modal opens
  React.useEffect(() => {
    if (open && currentTeam?.id) {
      loadProjects();
    }
  }, [open, currentTeam?.id]);

  const loadProjects = async () => {
    if (!currentTeam?.id) return;

    setProjectsLoading(true);
    try {
      const response = await fetch(`/api/projects?teamId=${currentTeam.id}&limit=100`);
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
        if (data.projects?.length > 0) {
          setFormData(prev => ({ ...prev, project_id: data.projects[0].id }));
        }
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
    } finally {
      setProjectsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTeam?.id || !formData.title.trim()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          focus_keywords: formData.focus_keywords 
            ? formData.focus_keywords.split(",").map(k => k.trim()).filter(Boolean)
            : [],
          team_id: currentTeam.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create content");
      }

      const newContent = await response.json();
      onContentCreated(newContent);
      handleClose();
    } catch (error) {
      console.error("Failed to create content:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: "",
      content: "",
      url: "",
      content_type: "article",
      status: "draft",
      meta_title: "",
      meta_description: "",
      focus_keywords: "",
      project_id: "",
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <div className="rounded-lg bg-green-50 p-2">
              <PenTool className="h-5 w-5 text-green-600" />
            </div>
            <span>Create New Content</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Selection */}
          <div className="space-y-2">
            <Label htmlFor="project">Project</Label>
            <Select
              value={formData.project_id}
              onValueChange={(value) =>
                setFormData(prev => ({ ...prev, project_id: value }))
              }
              disabled={projectsLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={projectsLoading ? "Loading projects..." : "Select a project"} />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, title: e.target.value }))
                }
                placeholder="Enter content title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content_type">Content Type</Label>
              <Select
                value={formData.content_type}
                onValueChange={(value) =>
                  setFormData(prev => ({ 
                    ...prev, 
                    content_type: value as typeof formData.content_type 
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="article">Article</SelectItem>
                  <SelectItem value="blog_post">Blog Post</SelectItem>
                  <SelectItem value="landing_page">Landing Page</SelectItem>
                  <SelectItem value="product_page">Product Page</SelectItem>
                  <SelectItem value="category_page">Category Page</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, content: e.target.value }))
              }
              placeholder="Enter your content here..."
              rows={6}
            />
          </div>

          {/* SEO Fields */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-blue-500" />
              <Label className="text-sm font-medium">SEO Optimization</Label>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="meta_title">Meta Title</Label>
              <Input
                id="meta_title"
                value={formData.meta_title}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, meta_title: e.target.value }))
                }
                placeholder="SEO title for search engines"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meta_description">Meta Description</Label>
              <Textarea
                id="meta_description"
                value={formData.meta_description}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, meta_description: e.target.value }))
                }
                placeholder="Brief description for search results"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="focus_keywords">Focus Keywords</Label>
              <Input
                id="focus_keywords"
                value={formData.focus_keywords}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, focus_keywords: e.target.value }))
                }
                placeholder="keyword1, keyword2, keyword3"
              />
              <p className="text-xs text-gray-500">
                Separate multiple keywords with commas
              </p>
            </div>
          </div>

          {/* Additional Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="url">URL (optional)</Label>
              <Input
                id="url"
                value={formData.url}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, url: e.target.value }))
                }
                placeholder="https://example.com/content"
                type="url"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData(prev => ({ 
                    ...prev, 
                    status: value as typeof formData.status 
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.title.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Create Content
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};