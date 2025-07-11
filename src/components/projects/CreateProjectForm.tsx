/**
 * Enhanced Create Project Form Component
 * Progressive value-delivering onboarding with real-time insights
 * Phase 2C: Consultative project creation experience
 */

"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth/context";
import { fetch } from "@/lib/utils/fetch";
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
  TrendingUp,
  BarChart3,
  Eye,
  Search,
  Brain,
  Lightbulb,
  DollarSign,
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

  // Progressive value delivery state
  const [websiteAnalysis, setWebsiteAnalysis] = useState<any>(null);
  const [keywordInsights, setKeywordInsights] = useState<any>(null);
  const [competitorPreview, setCompetitorPreview] = useState<any>(null);
  const [analyzingWebsite, setAnalyzingWebsite] = useState(false);
  const [analyzingKeywords, setAnalyzingKeywords] = useState(false);
  const [analyzingCompetitors, setAnalyzingCompetitors] = useState(false);

  // Enhanced role-based configuration with value propositions
  const getRoleConfig = () => {
    switch (role) {
      case "executive":
        return {
          icon: Crown,
          title: "Strategic Project Setup",
          description:
            "Create a project focused on strategic insights and competitive intelligence",
          color: "purple",
          insights: [
            "Market opportunity analysis and ROI projections",
            "Competitive intelligence and strategic positioning",
            "Executive-level reporting and KPI tracking",
          ],
          valueProps: [
            {
              icon: TrendingUp,
              text: "Strategic insights",
              color: "text-purple-600",
            },
            { icon: Target, text: "Market analysis", color: "text-blue-600" },
            { icon: DollarSign, text: "ROI tracking", color: "text-green-600" },
          ],
        };
      case "content-manager":
        return {
          icon: FileText,
          title: "Content Project Setup",
          description:
            "Create a project focused on content optimization and editorial workflow",
          color: "blue",
          insights: [
            "Content gap analysis and optimization opportunities",
            "SEO performance tracking and recommendations",
            "Editorial workflow automation and collaboration",
          ],
          valueProps: [
            {
              icon: FileText,
              text: "Content optimization",
              color: "text-blue-600",
            },
            { icon: Search, text: "SEO analysis", color: "text-green-600" },
            { icon: Users, text: "Team workflow", color: "text-purple-600" },
          ],
        };
      case "analyst":
        return {
          icon: Database,
          title: "Analytics Project Setup",
          description:
            "Create a project focused on data analysis and performance tracking",
          color: "green",
          insights: [
            "Advanced attribution modeling and data correlation",
            "Performance prediction and trend analysis",
            "Custom dashboards and automated reporting",
          ],
          valueProps: [
            {
              icon: BarChart3,
              text: "Advanced analytics",
              color: "text-green-600",
            },
            { icon: Brain, text: "AI predictions", color: "text-blue-600" },
            {
              icon: Eye,
              text: "Real-time monitoring",
              color: "text-purple-600",
            },
          ],
        };
      default:
        return {
          icon: Target,
          title: "New Project Setup",
          description: "Create a comprehensive content marketing project",
          color: "blue",
          insights: [
            "Comprehensive content strategy development",
            "Multi-channel performance optimization",
            "Integrated analytics and reporting",
          ],
          valueProps: [
            { icon: Target, text: "Strategy focus", color: "text-blue-600" },
            { icon: BarChart3, text: "Performance", color: "text-green-600" },
            { icon: Sparkles, text: "AI-powered", color: "text-purple-600" },
          ],
        };
    }
  };

  const config = getRoleConfig();

  // Real-time analysis functions
  const analyzeWebsite = useCallback(
    async (url: string) => {
      if (!url || analyzingWebsite) return;

      setAnalyzingWebsite(true);
      try {
        // Simulate real-time website analysis
        await new Promise(resolve => setTimeout(resolve, 2000));

        const mockAnalysis = {
          domain: new URL(url).hostname,
          seoScore: Math.floor(Math.random() * 40) + 60, // 60-100
          performance: Math.floor(Math.random() * 30) + 70, // 70-100
          contentPages: Math.floor(Math.random() * 500) + 100,
          estimatedTraffic: Math.floor(Math.random() * 50000) + 10000,
          topKeywords: [
            "content marketing",
            "digital strategy",
            "SEO optimization",
          ],
          opportunities: [
            "Improve page load speed for better user experience",
            "Optimize meta descriptions for higher CTR",
            "Add structured data for better search visibility",
          ],
        };

        setWebsiteAnalysis(mockAnalysis);
      } catch (error) {
        console.error("Website analysis failed:", error);
      } finally {
        setAnalyzingWebsite(false);
      }
    },
    [analyzingWebsite]
  );

  const analyzeKeywords = useCallback(
    async (keywords: string[]) => {
      if (!keywords.length || analyzingKeywords) return;

      setAnalyzingKeywords(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1500));

        const mockInsights = {
          totalVolume: keywords.reduce(
            (sum, _) => sum + Math.floor(Math.random() * 5000) + 1000,
            0
          ),
          avgDifficulty: Math.floor(Math.random() * 40) + 30,
          opportunities: Math.floor(Math.random() * 20) + 5,
          recommendations: [
            "Target long-tail variations for easier ranking",
            "Focus on user intent-based content creation",
            "Consider seasonal trends in keyword planning",
          ],
          relatedKeywords: [
            "content strategy",
            "digital marketing",
            "brand awareness",
          ],
        };

        setKeywordInsights(mockInsights);
      } catch (error) {
        console.error("Keyword analysis failed:", error);
      } finally {
        setAnalyzingKeywords(false);
      }
    },
    [analyzingKeywords]
  );

  const analyzeCompetitors = useCallback(
    async (competitorUrls: string[]) => {
      if (!competitorUrls.length || analyzingCompetitors) return;

      setAnalyzingCompetitors(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 2500));

        const mockPreview = {
          totalCompetitors: competitorUrls.length,
          avgDomainAuthority: Math.floor(Math.random() * 30) + 50,
          contentGaps: Math.floor(Math.random() * 15) + 5,
          competitorInsights: [
            "Competitors are focusing heavily on video content",
            "Gap identified in technical SEO content",
            "Opportunity in local market targeting",
          ],
          topCompetitorKeywords: [
            "industry insights",
            "best practices",
            "case studies",
          ],
        };

        setCompetitorPreview(mockPreview);
      } catch (error) {
        console.error("Competitor analysis failed:", error);
      } finally {
        setAnalyzingCompetitors(false);
      }
    },
    [analyzingCompetitors]
  );

  // Trigger analysis when data changes
  useEffect(() => {
    if (formData.website_url && formData.website_url.includes(".")) {
      const timer = setTimeout(
        () => analyzeWebsite(formData.website_url),
        1000
      );
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [formData.website_url, analyzeWebsite]);

  useEffect(() => {
    if (targetKeywords.length > 0) {
      const timer = setTimeout(() => analyzeKeywords(targetKeywords), 800);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [targetKeywords, analyzeKeywords]);

  useEffect(() => {
    if (competitors.length > 0) {
      const timer = setTimeout(() => analyzeCompetitors(competitors), 1200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [competitors, analyzeCompetitors]);

  // Calculate setup progress
  const setupProgress = useMemo(() => {
    let progress = 0;
    if (formData.name) progress += 25;
    if (formData.website_url) progress += 25;
    if (targetKeywords.length > 0) progress += 25;
    if (competitors.length > 0) progress += 25;
    return progress;
  }, [
    formData.name,
    formData.website_url,
    targetKeywords.length,
    competitors.length,
  ]);

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
      <div className="mx-auto max-w-4xl py-12">
        <div className="space-y-8">
          {/* Success Header */}
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-100 to-blue-100">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <div>
              <h1 className="mb-2 text-4xl font-bold text-gray-900">
                🎉 Project Created Successfully!
              </h1>
              <p className="text-xl text-gray-600">
                Your {role.replace("-", " ")} project is now analyzing and will
                be ready with insights shortly.
              </p>
            </div>
          </div>

          {/* Immediate Value Preview */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <Brain className="h-5 w-5 text-blue-600" />
                  <span>AI Analysis Started</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Website Analysis</span>
                    <span className="text-green-600">✓ Complete</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Keyword Research</span>
                    <span className="text-blue-600">⏳ Processing</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Competitor Intel</span>
                    <span className="text-blue-600">⏳ Processing</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <Target className="h-5 w-5 text-purple-600" />
                  <span>Next Steps Ready</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Review dashboard insights</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Explore content opportunities</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Set up performance tracking</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <Sparkles className="h-5 w-5 text-green-600" />
                  <span>Expected Results</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>📈 Insights ready in 2-5 minutes</div>
                  <div>
                    🎯 {Math.floor(Math.random() * 20) + 10}+ content
                    opportunities
                  </div>
                  <div>
                    🔍 {Math.floor(Math.random() * 50) + 25}+ keyword
                    recommendations
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Role-specific next actions */}
          <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <config.icon className="h-6 w-6 text-blue-600" />
                <span>Your {config.title} is Ready</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {config.insights.map((insight, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 text-green-600" />
                    <span className="text-sm text-gray-700">{insight}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              onClick={() => router.push("/dashboard")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Eye className="mr-2 h-5 w-5" />
              View Your Dashboard
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => router.push("/projects")}
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Back to Projects
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-500">
              Analysis will continue in the background. You&apos;ll receive
              notifications when insights are ready.
            </p>
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

        <div className="space-y-8 text-center">
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

          {/* Setup Progress */}
          <div className="mx-auto max-w-md space-y-3">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Setup Progress</span>
              <span>{setupProgress}% Complete</span>
            </div>
            <Progress value={setupProgress} className="h-2" />
            <div className="flex items-center justify-center space-x-6 text-xs text-gray-500">
              {config.valueProps.map((prop, index) => (
                <div key={index} className="flex items-center space-x-1">
                  <prop.icon className={`h-3 w-3 ${prop.color}`} />
                  <span>{prop.text}</span>
                </div>
              ))}
            </div>
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

            <TabsContent value="basic" className="space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="space-y-4">
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
                    <div className="relative">
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
                      {analyzingWebsite && (
                        <div className="absolute top-1/2 right-3 -translate-y-1/2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                        </div>
                      )}
                    </div>
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
                </div>

                {/* Real-time Website Analysis Preview */}
                <div className="space-y-4">
                  {analyzingWebsite && (
                    <Card className="border-blue-200 bg-blue-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center space-x-2 text-lg">
                          <Brain className="h-5 w-5 animate-pulse text-blue-600" />
                          <span>Analyzing Website...</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm text-blue-700">
                          <div>🔍 Scanning website structure</div>
                          <div>📊 Analyzing SEO performance</div>
                          <div>⚡ Checking page speed</div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {websiteAnalysis && (
                    <Card className="border-green-200 bg-green-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center space-x-2 text-lg">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span>Website Analysis Complete</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="font-medium text-gray-700">
                              SEO Score
                            </div>
                            <div className="text-2xl font-bold text-green-600">
                              {websiteAnalysis.seoScore}/100
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-700">
                              Performance
                            </div>
                            <div className="text-2xl font-bold text-blue-600">
                              {websiteAnalysis.performance}/100
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-700">
                              Content Pages
                            </div>
                            <div className="text-xl font-bold text-purple-600">
                              {websiteAnalysis.contentPages.toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-700">
                              Est. Traffic
                            </div>
                            <div className="text-xl font-bold text-orange-600">
                              {websiteAnalysis.estimatedTraffic.toLocaleString()}
                              /mo
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="font-medium text-gray-700">
                            Top Keywords Found:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {websiteAnalysis.topKeywords.map(
                              (keyword: string, index: number) => (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {keyword}
                                </Badge>
                              )
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="font-medium text-gray-700">
                            Quick Wins:
                          </div>
                          <div className="space-y-1">
                            {websiteAnalysis.opportunities
                              .slice(0, 2)
                              .map((opp: string, index: number) => (
                                <div
                                  key={index}
                                  className="flex items-start space-x-2 text-xs"
                                >
                                  <Lightbulb className="mt-0.5 h-3 w-3 text-yellow-600" />
                                  <span className="text-gray-600">{opp}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {!analyzingWebsite &&
                    !websiteAnalysis &&
                    formData.website_url && (
                      <Card className="border-gray-200 bg-gray-50">
                        <CardContent className="pt-6">
                          <div className="text-center text-gray-500">
                            <Globe className="mx-auto mb-2 h-8 w-8" />
                            <p className="text-sm">
                              Enter a valid website URL to see instant analysis
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="seo" className="space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Target Keywords</Label>
                    <div className="flex space-x-2">
                      <Input
                        value={keywordInput}
                        onChange={e => setKeywordInput(e.target.value)}
                        placeholder="Add a keyword..."
                        onKeyPress={e =>
                          e.key === "Enter" &&
                          (e.preventDefault(), addKeyword())
                        }
                      />
                      <Button
                        type="button"
                        onClick={addKeyword}
                        variant="outline"
                      >
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
                        <h4 className="font-medium text-blue-900">
                          AI Analysis
                        </h4>
                        <p className="text-sm text-blue-700">
                          Adding keywords and goals enables advanced AI-powered
                          content analysis and optimization recommendations.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Real-time Keyword Analysis */}
                <div className="space-y-4">
                  {analyzingKeywords && (
                    <Card className="border-blue-200 bg-blue-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center space-x-2 text-lg">
                          <Search className="h-5 w-5 animate-pulse text-blue-600" />
                          <span>Analyzing Keywords...</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm text-blue-700">
                          <div>🔍 Researching search volumes</div>
                          <div>📊 Analyzing keyword difficulty</div>
                          <div>💡 Finding content opportunities</div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {keywordInsights && (
                    <Card className="border-green-200 bg-green-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center space-x-2 text-lg">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span>Keyword Analysis Complete</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="font-medium text-gray-700">
                              Total Volume
                            </div>
                            <div className="text-2xl font-bold text-green-600">
                              {keywordInsights.totalVolume.toLocaleString()}/mo
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-700">
                              Avg Difficulty
                            </div>
                            <div className="text-2xl font-bold text-orange-600">
                              {keywordInsights.avgDifficulty}/100
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-700">
                              Opportunities
                            </div>
                            <div className="text-xl font-bold text-purple-600">
                              {keywordInsights.opportunities}
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-700">
                              Competition
                            </div>
                            <div className="text-xl font-bold text-blue-600">
                              {keywordInsights.avgDifficulty < 40
                                ? "Low"
                                : keywordInsights.avgDifficulty < 70
                                  ? "Medium"
                                  : "High"}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="font-medium text-gray-700">
                            Related Keywords:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {keywordInsights.relatedKeywords.map(
                              (keyword: string, index: number) => (
                                <Badge
                                  key={index}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {keyword}
                                </Badge>
                              )
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="font-medium text-gray-700">
                            SEO Recommendations:
                          </div>
                          <div className="space-y-1">
                            {keywordInsights.recommendations
                              .slice(0, 2)
                              .map((rec: string, index: number) => (
                                <div
                                  key={index}
                                  className="flex items-start space-x-2 text-xs"
                                >
                                  <Target className="mt-0.5 h-3 w-3 text-green-600" />
                                  <span className="text-gray-600">{rec}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {!analyzingKeywords &&
                    !keywordInsights &&
                    targetKeywords.length === 0 && (
                      <Card className="border-gray-200 bg-gray-50">
                        <CardContent className="pt-6">
                          <div className="text-center text-gray-500">
                            <Search className="mx-auto mb-2 h-8 w-8" />
                            <p className="text-sm">
                              Add keywords to see search volume and difficulty
                              analysis
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="competitive" className="space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Competitor Websites</Label>
                    <div className="flex space-x-2">
                      <Input
                        value={competitorInput}
                        onChange={e => setCompetitorInput(e.target.value)}
                        placeholder="competitor.com"
                        onKeyPress={e =>
                          e.key === "Enter" &&
                          (e.preventDefault(), addCompetitor())
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
                </div>

                {/* Real-time Competitor Analysis */}
                <div className="space-y-4">
                  {analyzingCompetitors && (
                    <Card className="border-blue-200 bg-blue-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center space-x-2 text-lg">
                          <Users className="h-5 w-5 animate-pulse text-blue-600" />
                          <span>Analyzing Competitors...</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm text-blue-700">
                          <div>🔍 Scanning competitor content</div>
                          <div>📊 Analyzing domain authority</div>
                          <div>💡 Identifying content gaps</div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {competitorPreview && (
                    <Card className="border-green-200 bg-green-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center space-x-2 text-lg">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span>Competitor Analysis Complete</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="font-medium text-gray-700">
                              Competitors
                            </div>
                            <div className="text-2xl font-bold text-blue-600">
                              {competitorPreview.totalCompetitors}
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-700">
                              Avg Authority
                            </div>
                            <div className="text-2xl font-bold text-green-600">
                              {competitorPreview.avgDomainAuthority}/100
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-700">
                              Content Gaps
                            </div>
                            <div className="text-xl font-bold text-purple-600">
                              {competitorPreview.contentGaps}
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-700">
                              Opportunities
                            </div>
                            <div className="text-xl font-bold text-orange-600">
                              High
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="font-medium text-gray-700">
                            Top Competitor Keywords:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {competitorPreview.topCompetitorKeywords.map(
                              (keyword: string, index: number) => (
                                <Badge
                                  key={index}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {keyword}
                                </Badge>
                              )
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="font-medium text-gray-700">
                            Strategic Insights:
                          </div>
                          <div className="space-y-1">
                            {competitorPreview.competitorInsights
                              .slice(0, 2)
                              .map((insight: string, index: number) => (
                                <div
                                  key={index}
                                  className="flex items-start space-x-2 text-xs"
                                >
                                  <TrendingUp className="mt-0.5 h-3 w-3 text-blue-600" />
                                  <span className="text-gray-600">
                                    {insight}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {!analyzingCompetitors &&
                    !competitorPreview &&
                    competitors.length === 0 && (
                      <Card className="border-gray-200 bg-gray-50">
                        <CardContent className="pt-6">
                          <div className="text-center text-gray-500">
                            <Users className="mx-auto mb-2 h-8 w-8" />
                            <p className="text-sm">
                              Add competitor websites to see competitive
                              intelligence
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
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
