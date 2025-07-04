/**
 * Create Project Form Component
 * Full-page project creation form with role-based setup
 */

"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth/context";
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
  ArrowLeft,
  Crown,
  FileText,
  Database,
} from "lucide-react";

export const CreateProjectForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentTeam } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState("basic");
  const [success, setSuccess] = useState(false);

  // Get role from URL params
  const role = searchParams.get("role") || "executive";
  const source = searchParams.get("source") || "dashboard";

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

  // Role-based configuration
  const getRoleConfig = () => {
    switch (role) {
      case "executive":
        return {
          icon: Crown,
          title: "Strategic Project Setup",
          description:
            "Create a project focused on strategic insights and competitive intelligence",
          color: "purple",
        };
      case "content-manager":
        return {
          icon: FileText,
          title: "Content Project Setup",
          description:
            "Create a project focused on content optimization and editorial workflow",
          color: "blue",
        };
      case "analyst":
        return {
          icon: Database,
          title: "Analytics Project Setup",
          description:
            "Create a project focused on data analysis and performance tracking",
          color: "green",
        };
      default:
        return {
          icon: Target,
          title: "New Project Setup",
          description: "Create a comprehensive content marketing project",
          color: "blue",
        };
    }
  };

  const config = getRoleConfig();

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
        settings: { role, source },
      };

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create project");
      }

      setSuccess(true);

      setTimeout(() => {
        router.push("/projects");
      }, 2000);
    } catch (err) {
      console.error("Error creating project:", err);
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = formData.name.trim().length > 0;

  if (success) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900">
              Project Created Successfully!
            </h1>
            <p className="text-lg text-gray-600">
              Your project has been created and is ready for analysis.
            </p>
          </div>
          <div className="flex items-center justify-center space-x-4">
            <Button onClick={() => router.push("/projects")}>
              View Projects
            </Button>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl py-8">
      <div className="mb-8">
        <div className="mb-6 flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
        </div>

        <div className="space-y-6 text-center">
          <div className="flex justify-center">
            <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-blue-50 p-6">
              <config.icon className="h-12 w-12 text-purple-600" />
            </div>
          </div>

          <div className="space-y-4">
            <Badge
              variant="outline"
              className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50"
            >
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text font-medium text-transparent">
                {role.charAt(0).toUpperCase() + role.slice(1).replace("-", " ")}{" "}
                Project
              </span>
            </Badge>

            <h1 className="text-4xl font-bold text-gray-900">{config.title}</h1>

            <p className="mx-auto max-w-3xl text-xl leading-relaxed text-gray-600">
              {config.description}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-8">
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
                <Label htmlFor="name">Project Name *</Label>
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

          <div className="flex items-center justify-between border-t pt-6">
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
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isFormValid || loading}
                size="lg"
              >
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
      </div>
    </div>
  );
};
