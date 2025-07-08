/**
 * Create Project Modal Component
 * Advanced project creation form with comprehensive options
 */

"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth/context";
import {
  authenticatedFetch,
  AuthenticationError,
  CSRFError,
} from "@/lib/auth/authenticated-fetch";
import { supabase } from "@/lib/supabase/client";
import {
  Globe,
  Target,
  Users,
  Plus,
  X,
  Sparkles,
  Zap,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  description?: string;
  website_url?: string;
  target_keywords?: string[];
  target_audience?: string;
  content_goals?: string[];
  competitors?: string[];
  status: string;
  settings?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string;
  team: {
    id: string;
    name: string;
    description: string;
    owner_id: string;
  };
  stats: {
    contentCount: number;
    competitorCount: number;
    lastActivity: string;
  };
}

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onProjectCreated: (project: Project) => void;
}

export const CreateProjectModal = ({
  open,
  onClose,
  onProjectCreated,
}: CreateProjectModalProps) => {
  const { currentTeam, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState("basic");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    website_url: "",
    target_audience: "",
  });

  const [targetKeywords, setTargetKeywords] = useState<string[]>([]);
  const [contentGoals, setContentGoals] = useState<string[]>([]);
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [goalInput, setGoalInput] = useState("");
  const [competitorInput, setCompetitorInput] = useState("");

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      website_url: "",
      target_audience: "",
    });
    setTargetKeywords([]);
    setContentGoals([]);
    setCompetitors([]);
    setKeywordInput("");
    setGoalInput("");
    setCompetitorInput("");
    setError(null);
    setCurrentTab("basic");
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  const addKeyword = () => {
    const keyword = keywordInput.trim();
    if (keyword && !targetKeywords.includes(keyword)) {
      setTargetKeywords(prev => [...prev, keyword]);
      setKeywordInput("");
    }
  };

  const removeKeyword = (keyword: string) => {
    setTargetKeywords(prev => prev.filter(k => k !== keyword));
  };

  const addGoal = () => {
    const goal = goalInput.trim();
    if (goal && !contentGoals.includes(goal)) {
      setContentGoals(prev => [...prev, goal]);
      setGoalInput("");
    }
  };

  const removeGoal = (goal: string) => {
    setContentGoals(prev => prev.filter(g => g !== goal));
  };

  const addCompetitor = () => {
    const competitor = competitorInput.trim();
    if (competitor && !competitors.includes(competitor)) {
      // Add https:// if no protocol specified
      const formattedCompetitor = competitor.startsWith("http")
        ? competitor
        : `https://${competitor}`;
      setCompetitors(prev => [...prev, formattedCompetitor]);
      setCompetitorInput("");
    }
  };

  const removeCompetitor = (competitor: string) => {
    setCompetitors(prev => prev.filter(c => c !== competitor));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTeam?.id) return;

    setLoading(true);
    setError(null);

    try {
      const payload = {
        teamId: currentTeam.id,
        name: formData.name,
        description: formData.description || undefined,
        website_url: formData.website_url || undefined,
        target_keywords: targetKeywords,
        target_audience: formData.target_audience || undefined,
        content_goals: contentGoals,
        competitors: competitors,
        settings: {},
      };

      // Use production-grade authenticated fetch
      const authContext = {
        session,
        refreshSession: async () => {
          // Refresh session if needed
          const {
            data: { session: newSession },
          } = await supabase.auth.getSession();
          if (newSession) {
            // Session would be updated by auth context automatically
            console.log("🔄 Session refreshed for project creation");
          }
        },
      };

      const response = await authenticatedFetch(
        "/api/projects",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        authContext
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create project");
      }

      const result = await response.json();
      onProjectCreated(result.project);
      resetForm();
    } catch (err) {
      console.error("Error creating project:", err);

      if (err instanceof AuthenticationError) {
        setError(
          "Authentication failed. Please refresh the page and try again."
        );
      } else if (err instanceof CSRFError) {
        setError(
          "Security validation failed. Please refresh the page and try again."
        );
      } else {
        setError(
          err instanceof Error ? err.message : "Failed to create project"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = formData.name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <div className="rounded-lg bg-blue-50 p-2">
              <Plus className="h-5 w-5 text-blue-600" />
            </div>
            <span>Create New Project</span>
          </DialogTitle>
          <DialogDescription>
            Set up a new content project with comprehensive analysis and
            tracking
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs value={currentTab} onValueChange={setCurrentTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger
                value="basic"
                className="flex items-center space-x-2"
              >
                <Globe className="h-4 w-4" />
                <span>Basic Info</span>
              </TabsTrigger>
              <TabsTrigger value="seo" className="flex items-center space-x-2">
                <Target className="h-4 w-4" />
                <span>SEO & Keywords</span>
              </TabsTrigger>
              <TabsTrigger
                value="competitive"
                className="flex items-center space-x-2"
              >
                <Users className="h-4 w-4" />
                <span>Competitors</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="required">
                  Project Name
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Enter project name..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Describe your project goals and objectives..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website_url">Website URL</Label>
                <Input
                  id="website_url"
                  type="url"
                  value={formData.website_url}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      website_url: e.target.value,
                    }))
                  }
                  placeholder="https://example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_audience">Target Audience</Label>
                <Input
                  id="target_audience"
                  value={formData.target_audience}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      target_audience: e.target.value,
                    }))
                  }
                  placeholder="Small business owners, marketing professionals..."
                />
              </div>
            </TabsContent>

            <TabsContent value="seo" className="space-y-4">
              <div className="space-y-2">
                <Label>Target Keywords</Label>
                <div className="flex space-x-2">
                  <Input
                    value={keywordInput}
                    onChange={e => setKeywordInput(e.target.value)}
                    placeholder="Add a keyword..."
                    onKeyPress={e =>
                      e.key === "Enter" && (e.preventDefault(), addKeyword())
                    }
                  />
                  <Button type="button" onClick={addKeyword} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {targetKeywords.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {targetKeywords.map(keyword => (
                      <Badge
                        key={keyword}
                        variant="secondary"
                        className="flex items-center space-x-1"
                      >
                        <span>{keyword}</span>
                        <button
                          type="button"
                          onClick={() => removeKeyword(keyword)}
                          className="ml-1 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Content Goals</Label>
                <div className="flex space-x-2">
                  <Input
                    value={goalInput}
                    onChange={e => setGoalInput(e.target.value)}
                    placeholder="Add a content goal..."
                    onKeyPress={e =>
                      e.key === "Enter" && (e.preventDefault(), addGoal())
                    }
                  />
                  <Button type="button" onClick={addGoal} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {contentGoals.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {contentGoals.map(goal => (
                      <Badge
                        key={goal}
                        variant="outline"
                        className="flex items-center space-x-1"
                      >
                        <span>{goal}</span>
                        <button
                          type="button"
                          onClick={() => removeGoal(goal)}
                          className="ml-1 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-blue-50 p-4">
                <div className="flex items-start space-x-3">
                  <Sparkles className="mt-0.5 h-5 w-5 text-blue-600" />
                  <div>
                    <h4 className="font-medium text-blue-900">AI Analysis</h4>
                    <p className="text-sm text-blue-700">
                      Adding keywords and goals enables advanced AI-powered
                      content analysis and optimization recommendations.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="competitive" className="space-y-4">
              <div className="space-y-2">
                <Label>Competitor Websites</Label>
                <div className="flex space-x-2">
                  <Input
                    value={competitorInput}
                    onChange={e => setCompetitorInput(e.target.value)}
                    placeholder="competitor.com"
                    onKeyPress={e =>
                      e.key === "Enter" && (e.preventDefault(), addCompetitor())
                    }
                  />
                  <Button
                    type="button"
                    onClick={addCompetitor}
                    variant="outline"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {competitors.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {competitors.map(competitor => (
                      <div
                        key={competitor}
                        className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                      >
                        <div className="flex items-center space-x-3">
                          <Globe className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium">
                            {competitor}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCompetitor(competitor)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-green-50 p-4">
                <div className="flex items-start space-x-3">
                  <Target className="mt-0.5 h-5 w-5 text-green-600" />
                  <div>
                    <h4 className="font-medium text-green-900">
                      Competitive Intelligence
                    </h4>
                    <p className="text-sm text-green-700">
                      Adding competitors enables SERP analysis, content gap
                      identification, and competitive benchmarking.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
                <div>
                  <h4 className="font-medium text-red-900">Error</h4>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              {isFormValid && (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Ready to create</span>
                </>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!isFormValid || loading}>
                {loading ? (
                  <>
                    <Zap className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Project
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
