/**
 * Competitive Content Analysis Component
 * Advanced content comparison interfaces and competitive content strategy development
 */

"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  FileText,
  Brain,
  Target,
  AlertTriangle,
  CheckCircle,
  Download,
  RefreshCw,
  Star,
  BookOpen,
} from "lucide-react";
import { useCompetitiveIntelligence } from "@/hooks/useCompetitiveIntelligence";
import type {
  CompetitiveContentAnalysis,
} from "@/lib/competitive/types";

interface CompetitiveContentAnalysisProps {
  projectId?: string;
  competitorId?: string;
}

interface ContentGapTableRow {
  topic: string;
  opportunityScore: number;
  difficulty: number;
  searchVolume: number;
  strategicRelevance: number;
  priority: "high" | "medium" | "low";
  recommendation: string;
  keywords: string[];
}

interface ContentMetric {
  name: string;
  userValue: number;
  competitorValue: number;
  unit: string;
  trend: "better" | "worse" | "equal";
  gap: number;
}

const CONTENT_COLORS = {
  primary: "#3b82f6",
  secondary: "#8b5cf6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#06b6d4",
};

const TOPIC_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];

export const CompetitiveContentAnalysis: React.FC<
  CompetitiveContentAnalysisProps
> = ({ projectId, competitorId }) => {
  const { data, loading, error, refresh } = useCompetitiveIntelligence(projectId);
  const [selectedCompetitor, setSelectedCompetitor] = useState(competitorId);
  const [topicFilter, setTopicFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("opportunityScore");
  const [_sortOrder, _setSortOrder] = useState<"asc" | "desc">("desc");
  const [refreshing, setRefreshing] = useState(false);

  // Get content analysis data for selected competitor
  const contentAnalysis = useMemo(() => {
    if (!data || !selectedCompetitor) return null;

    const analysisResult = data.analysisResults.find(
      (result) => result.competitorId === selectedCompetitor
    );

    return analysisResult?.data?.contentAnalysis || null;
  }, [data, selectedCompetitor]);

  // Process content gap data for table
  const contentGapData = useMemo(() => {
    if (!contentAnalysis?.topicAnalysis?.topicGaps) return [];

    let processedData = contentAnalysis.topicAnalysis.topicGaps.map(
      (gap): ContentGapTableRow => ({
        topic: gap.topic.name,
        opportunityScore: gap.opportunityScore,
        difficulty: gap.difficulty,
        searchVolume: gap.searchVolume,
        strategicRelevance: gap.strategicRelevance,
        priority: gap.opportunityScore >= 70 ? "high" : 
                 gap.opportunityScore >= 40 ? "medium" : "low",
        recommendation: gap.recommendation,
        keywords: gap.topic.keywords,
      })
    );

    // Apply filters
    if (topicFilter) {
      processedData = processedData.filter((row) =>
        row.topic.toLowerCase().includes(topicFilter.toLowerCase()) ||
        row.keywords.some(k => k.toLowerCase().includes(topicFilter.toLowerCase()))
      );
    }

    if (priorityFilter !== "all") {
      processedData = processedData.filter((row) => row.priority === priorityFilter);
    }

    // Apply sorting
    processedData.sort((a, b) => {
      const aValue = a[sortBy as keyof ContentGapTableRow] as number;
      const bValue = b[sortBy as keyof ContentGapTableRow] as number;
      
      if (sortOrder === "desc") {
        return bValue - aValue;
      } else {
        return aValue - bValue;
      }
    });

    return processedData;
  }, [contentAnalysis, topicFilter, priorityFilter, sortBy]);

  // Process content quality metrics
  const contentQualityMetrics = useMemo((): ContentMetric[] => {
    if (!contentAnalysis?.contentQuality) return [];

    const quality = contentAnalysis.contentQuality;
    
    return [
      {
        name: "Overall Quality Score",
        userValue: quality.userScore,
        competitorValue: quality.competitorScore,
        unit: "/100",
        trend: quality.userScore > quality.competitorScore ? "better" : 
               quality.userScore < quality.competitorScore ? "worse" : "equal",
        gap: quality.relativeDifference,
      },
      {
        name: "Content Depth",
        userValue: quality.qualityFactors.depth.userScore,
        competitorValue: quality.qualityFactors.depth.competitorScore,
        unit: "/100",
        trend: quality.qualityFactors.depth.gap > 0 ? "better" : 
               quality.qualityFactors.depth.gap < 0 ? "worse" : "equal",
        gap: quality.qualityFactors.depth.gap,
      },
      {
        name: "Readability",
        userValue: quality.qualityFactors.readability.userScore,
        competitorValue: quality.qualityFactors.readability.competitorScore,
        unit: "/100",
        trend: quality.qualityFactors.readability.gap > 0 ? "better" : 
               quality.qualityFactors.readability.gap < 0 ? "worse" : "equal",
        gap: quality.qualityFactors.readability.gap,
      },
      {
        name: "SEO Optimization",
        userValue: quality.qualityFactors.seoOptimization.userScore,
        competitorValue: quality.qualityFactors.seoOptimization.competitorScore,
        unit: "/100",
        trend: quality.qualityFactors.seoOptimization.gap > 0 ? "better" : 
               quality.qualityFactors.seoOptimization.gap < 0 ? "worse" : "equal",
        gap: quality.qualityFactors.seoOptimization.gap,
      },
      {
        name: "Engagement Potential",
        userValue: quality.qualityFactors.engagement.userScore,
        competitorValue: quality.qualityFactors.engagement.competitorScore,
        unit: "/100",
        trend: quality.qualityFactors.engagement.gap > 0 ? "better" : 
               quality.qualityFactors.engagement.gap < 0 ? "worse" : "equal",
        gap: quality.qualityFactors.engagement.gap,
      },
    ];
  }, [contentAnalysis]);

  // Process topic distribution data
  const topicDistributionData = useMemo(() => {
    if (!contentAnalysis?.topicAnalysis) return [];

    const topicAnalysis = contentAnalysis.topicAnalysis;
    
    return [
      {
        name: "Shared Topics",
        value: topicAnalysis.sharedTopics?.length || 0,
        color: CONTENT_COLORS.primary,
        description: "Topics both you and competitor cover",
      },
      {
        name: "Your Unique Topics",
        value: topicAnalysis.uniqueUserTopics?.length || 0,
        color: CONTENT_COLORS.success,
        description: "Topics only you cover",
      },
      {
        name: "Competitor Unique Topics",
        value: topicAnalysis.uniqueCompetitorTopics?.length || 0,
        color: CONTENT_COLORS.warning,
        description: "Topics only competitor covers",
      },
      {
        name: "Topic Gaps",
        value: topicAnalysis.topicGaps?.length || 0,
        color: CONTENT_COLORS.danger,
        description: "Opportunities for new content",
      },
      {
        name: "Emerging Topics",
        value: topicAnalysis.emergingTopics?.length || 0,
        color: CONTENT_COLORS.info,
        description: "Trending topics to consider",
      },
    ];
  }, [contentAnalysis]);

  // Process content volume data
  const contentVolumeData = useMemo(() => {
    if (!contentAnalysis?.contentVolume) return [];

    const volume = contentAnalysis.contentVolume;
    
    return [
      {
        category: "Total Content",
        user: volume.userContentCount,
        competitor: volume.competitorContentCount,
      },
      {
        category: "Daily Publishing",
        user: volume.publishingFrequency.user.daily,
        competitor: volume.publishingFrequency.competitor.daily,
      },
      {
        category: "Weekly Publishing",
        user: volume.publishingFrequency.user.weekly,
        competitor: volume.publishingFrequency.competitor.weekly,
      },
      {
        category: "Monthly Publishing",
        user: volume.publishingFrequency.user.monthly,
        competitor: volume.publishingFrequency.competitor.monthly,
      },
    ];
  }, [contentAnalysis]);

  // Process content type distribution
  const contentTypeData = useMemo(() => {
    if (!contentAnalysis?.contentVolume?.contentTypes) return { user: [], competitor: [] };

    const types = contentAnalysis.contentVolume.contentTypes;
    
    const userTypes = [
      { name: "Articles", value: types.user.articles, color: TOPIC_COLORS[0] },
      { name: "Videos", value: types.user.videos, color: TOPIC_COLORS[1] },
      { name: "Infographics", value: types.user.infographics, color: TOPIC_COLORS[2] },
      { name: "Podcasts", value: types.user.podcasts, color: TOPIC_COLORS[3] },
      { name: "Whitepapers", value: types.user.whitepapers, color: TOPIC_COLORS[4] },
      { name: "Other", value: types.user.other, color: TOPIC_COLORS[5] },
    ];

    const competitorTypes = [
      { name: "Articles", value: types.competitor.articles, color: TOPIC_COLORS[0] },
      { name: "Videos", value: types.competitor.videos, color: TOPIC_COLORS[1] },
      { name: "Infographics", value: types.competitor.infographics, color: TOPIC_COLORS[2] },
      { name: "Podcasts", value: types.competitor.podcasts, color: TOPIC_COLORS[3] },
      { name: "Whitepapers", value: types.competitor.whitepapers, color: TOPIC_COLORS[4] },
      { name: "Other", value: types.competitor.other, color: TOPIC_COLORS[5] },
    ];

    return { user: userTypes, competitor: competitorTypes };
  }, [contentAnalysis]);

  // Content similarity score
  const contentSimilarityData = useMemo(() => {
    if (!contentAnalysis?.contentSimilarity) return null;

    const similarity = contentAnalysis.contentSimilarity;
    
    return [
      { name: "Topics", score: similarity.breakdown.topics * 100 },
      { name: "Keywords", score: similarity.breakdown.keywords * 100 },
      { name: "Format", score: similarity.breakdown.format * 100 },
      { name: "Style", score: similarity.breakdown.style * 100 },
    ];
  }, [contentAnalysis]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleExportData = useCallback(() => {
    if (!contentGapData.length) return;

    const csvContent = [
      ["Topic", "Opportunity Score", "Difficulty", "Search Volume", "Strategic Relevance", "Priority", "Keywords"],
      ...contentGapData.map(row => [
        row.topic,
        row.opportunityScore.toString(),
        row.difficulty.toString(),
        row.searchVolume.toString(),
        row.strategicRelevance.toString(),
        row.priority,
        row.keywords.join("; "),
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `content-gaps-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [contentGapData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Content Analysis</h2>
            <p className="text-muted-foreground">Loading content analysis...</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 w-2/3 rounded bg-gray-200"></div>
                  <div className="h-8 w-1/2 rounded bg-gray-200"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const selectedCompetitorName = data?.competitors.find(
    (c) => c.id === selectedCompetitor
  )?.name || "Unknown Competitor";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <FileText className="h-6 w-6 text-purple-600" />
            Competitive Content Analysis
          </h2>
          <p className="text-muted-foreground">
            Advanced content comparison and strategic content planning
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedCompetitor} onValueChange={setSelectedCompetitor}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select competitor" />
            </SelectTrigger>
            <SelectContent>
              {data?.competitors.map((competitor) => (
                <SelectItem key={competitor.id} value={competitor.id}>
                  {competitor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {!selectedCompetitor && (
        <Alert>
          <Target className="h-4 w-4" />
          <AlertDescription>
            Please select a competitor to view detailed content analysis.
          </AlertDescription>
        </Alert>
      )}

      {selectedCompetitor && contentAnalysis && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Content Overview</TabsTrigger>
            <TabsTrigger value="quality">Quality Analysis</TabsTrigger>
            <TabsTrigger value="topics">Topic Analysis</TabsTrigger>
            <TabsTrigger value="gaps">Content Gaps</TabsTrigger>
            <TabsTrigger value="strategy">Content Strategy</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Content Quality Overview Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Content Similarity
                      </p>
                      <p className="text-2xl font-bold">
                        {Math.round((contentAnalysis.contentSimilarity?.overall || 0) * 100)}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Overall content overlap
                      </p>
                    </div>
                    <Brain className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Quality Score
                      </p>
                      <p className="text-2xl font-bold">
                        {contentAnalysis.contentQuality?.userScore || 0}/100
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        vs {contentAnalysis.contentQuality?.competitorScore || 0} (competitor)
                      </p>
                    </div>
                    <Star className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Content Volume
                      </p>
                      <p className="text-2xl font-bold">
                        {contentAnalysis.contentVolume?.userContentCount || 0}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        vs {contentAnalysis.contentVolume?.competitorContentCount || 0} (competitor)
                      </p>
                    </div>
                    <BookOpen className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Topic Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Topic Coverage Distribution</CardTitle>
                <CardDescription>
                  Breakdown of topic coverage compared to {selectedCompetitorName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={topicDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {topicDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  {topicDistributionData.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div 
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <div>
                        <span className="text-sm font-medium">{item.name}: {item.value}</span>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Content Volume Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Content Volume Comparison</CardTitle>
                <CardDescription>
                  Publishing frequency and content volume metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={contentVolumeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="user" fill={CONTENT_COLORS.primary} name="Your Content" />
                      <Bar dataKey="competitor" fill={CONTENT_COLORS.secondary} name="Competitor" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quality" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Content Quality Comparison</CardTitle>
                <CardDescription>
                  Detailed quality metrics comparison with {selectedCompetitorName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {contentQualityMetrics.map((metric, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{metric.name}</span>
                          {metric.trend === "better" && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                          {metric.trend === "worse" && (
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Gap: {metric.gap > 0 ? "+" : ""}{metric.gap}%
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="flex justify-between text-sm">
                            <span>Your Score</span>
                            <span>{metric.userValue}{metric.unit}</span>
                          </div>
                          <Progress value={metric.userValue} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm">
                            <span>Competitor Score</span>
                            <span>{metric.competitorValue}{metric.unit}</span>
                          </div>
                          <Progress value={metric.competitorValue} className="h-2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Content Type Distribution */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Your Content Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={contentTypeData.user}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                        >
                          {contentTypeData.user.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 space-y-2">
                    {contentTypeData.user.filter(item => item.value > 0).map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-sm">{item.name}</span>
                        </div>
                        <span className="text-sm font-medium">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Competitor Content Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={contentTypeData.competitor}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                        >
                          {contentTypeData.competitor.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 space-y-2">
                    {contentTypeData.competitor.filter(item => item.value > 0).map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-sm">{item.name}</span>
                        </div>
                        <span className="text-sm font-medium">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="topics" className="space-y-4">
            {/* Content Similarity Breakdown */}
            {contentSimilarityData && (
              <Card>
                <CardHeader>
                  <CardTitle>Content Similarity Analysis</CardTitle>
                  <CardDescription>
                    Detailed breakdown of content overlap with {selectedCompetitorName}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={contentSimilarityData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip formatter={(value) => [`${value}%`, "Similarity"]} />
                        <Bar dataKey="score" fill={CONTENT_COLORS.primary} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Shared Topics Table */}
            <Card>
              <CardHeader>
                <CardTitle>Shared Topics</CardTitle>
                <CardDescription>
                  Topics covered by both you and {selectedCompetitorName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {contentAnalysis.topicAnalysis?.sharedTopics && contentAnalysis.topicAnalysis.sharedTopics.length > 0 ? (
                  <div className="space-y-3">
                    {contentAnalysis.topicAnalysis.sharedTopics.slice(0, 10).map((topic, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <div className="font-medium">{topic.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Keywords: {topic.keywords.slice(0, 3).join(", ")}
                            {topic.keywords.length > 3 && ` +${topic.keywords.length - 3} more`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            Coverage: {Math.round(topic.coverage * 100)}%
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Performance: {Math.round(topic.performance)}/100
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="mx-auto h-12 w-12 mb-4" />
                    <p>No shared topics found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gaps" className="space-y-4">
            {/* Content Gap Analysis Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Content Gap Analysis</CardTitle>
                <CardDescription>
                  Content opportunities based on competitor analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex flex-wrap gap-4">
                  <div className="flex-1 min-w-64">
                    <Label htmlFor="topic-search">Search Topics</Label>
                    <Input
                      id="topic-search"
                      placeholder="Filter topics or keywords..."
                      value={topicFilter}
                      onChange={(e) => setTopicFilter(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="priority-filter">Priority</Label>
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger className="mt-1 w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="sort-by">Sort By</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="mt-1 w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="opportunityScore">Opportunity Score</SelectItem>
                        <SelectItem value="searchVolume">Search Volume</SelectItem>
                        <SelectItem value="difficulty">Difficulty</SelectItem>
                        <SelectItem value="strategicRelevance">Strategic Relevance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleExportData} variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                  </div>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Topic</TableHead>
                        <TableHead>Opportunity Score</TableHead>
                        <TableHead>Difficulty</TableHead>
                        <TableHead>Search Volume</TableHead>
                        <TableHead>Strategic Relevance</TableHead>
                        <TableHead>Priority</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contentGapData.slice(0, 20).map((row, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{row.topic}</div>
                              <div className="text-xs text-muted-foreground">
                                {row.keywords.slice(0, 2).join(", ")}
                                {row.keywords.length > 2 && ` +${row.keywords.length - 2}`}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-16 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500"
                                  style={{ width: `${row.opportunityScore}%` }}
                                />
                              </div>
                              <span className="text-sm">{row.opportunityScore}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-16 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-green-500 to-red-500"
                                  style={{ width: `${row.difficulty}%` }}
                                />
                              </div>
                              <span className="text-sm">{row.difficulty}%</span>
                            </div>
                          </TableCell>
                          <TableCell>{row.searchVolume.toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-16 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-purple-500"
                                  style={{ width: `${row.strategicRelevance}%` }}
                                />
                              </div>
                              <span className="text-sm">{row.strategicRelevance}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                row.priority === "high" ? "destructive" :
                                row.priority === "medium" ? "default" : "secondary"
                              }
                            >
                              {row.priority}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {contentGapData.length > 20 && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Showing 20 of {contentGapData.length} content gaps. Export for full data.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="strategy" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Content Strategy Insights</CardTitle>
                <CardDescription>
                  Strategic recommendations based on competitive analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Focus Areas */}
                  {contentAnalysis.contentStrategy?.focusAreas && (
                    <div>
                      <h4 className="font-medium mb-3">Recommended Focus Areas</h4>
                      <div className="flex flex-wrap gap-2">
                        {contentAnalysis.contentStrategy.focusAreas.map((area, index) => (
                          <Badge key={index} variant="outline">{area}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Content Pillars */}
                  {contentAnalysis.contentStrategy?.contentPillars && (
                    <div>
                      <h4 className="font-medium mb-3">Content Pillars</h4>
                      <div className="flex flex-wrap gap-2">
                        {contentAnalysis.contentStrategy.contentPillars.map((pillar, index) => (
                          <Badge key={index} variant="secondary">{pillar}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Strategic Recommendations */}
                  {contentAnalysis.contentStrategy?.strategicRecommendations && (
                    <div>
                      <h4 className="font-medium mb-4">Strategic Recommendations</h4>
                      <div className="space-y-4">
                        {contentAnalysis.contentStrategy.strategicRecommendations.slice(0, 5).map((rec, index) => (
                          <div key={index} className="rounded-lg border p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge 
                                    variant={
                                      rec.priority === "high" ? "destructive" :
                                      rec.priority === "medium" ? "default" : "secondary"
                                    }
                                  >
                                    {rec.priority} priority
                                  </Badge>
                                  <Badge variant="outline">{rec.type}</Badge>
                                </div>
                                <h5 className="font-medium">{rec.title}</h5>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {rec.description}
                                </p>
                                <div className="mt-3 text-sm">
                                  <span className="font-medium">Timeline:</span> {rec.timeframe}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-green-600">
                                  {rec.expectedImpact}%
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Expected Impact
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};