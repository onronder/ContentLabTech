/**
 * SEO Competitive Analysis Component
 * Advanced SEO competitive intelligence with keyword gap analysis and technical SEO comparison
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
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Search,
  Target,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import { useCompetitiveIntelligence } from "@/hooks/useCompetitiveIntelligence";
import type {
  KeywordGap,
  CompetitiveKeyword,
} from "@/lib/competitive/types";

interface SEOCompetitiveAnalysisProps {
  projectId?: string;
  competitorId?: string;
}

interface KeywordGapTableRow {
  keyword: string;
  competitorRanking: number;
  userRanking: number | null;
  searchVolume: number;
  difficulty: number;
  opportunityScore: number;
  priority: "high" | "medium" | "low";
  trend: "rising" | "stable" | "declining";
  cpc?: number;
}

interface TechnicalSEOMetric {
  name: string;
  userScore: number;
  competitorScore: number;
  difference: number;
  status: "better" | "worse" | "equal";
  impact: "high" | "medium" | "low";
}

const COLORS = {
  primary: "#3b82f6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#6366f1",
};


export const SEOCompetitiveAnalysis: React.FC<SEOCompetitiveAnalysisProps> = ({
  projectId,
  competitorId,
}) => {
  const { data, loading, error, refresh } = useCompetitiveIntelligence(projectId);
  const [selectedCompetitor, setSelectedCompetitor] = useState(competitorId);
  const [keywordFilter, setKeywordFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("opportunityScore");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [refreshing, setRefreshing] = useState(false);

  // Get competitive analysis data for selected competitor
  const competitiveAnalysis = useMemo(() => {
    if (!data || !selectedCompetitor) return null;

    const analysisResult = data.analysisResults.find(
      (result) => result.competitorId === selectedCompetitor
    );

    return analysisResult?.data?.seoAnalysis || null;
  }, [data, selectedCompetitor]);

  // Process keyword gap data for table
  const keywordGapData = useMemo(() => {
    if (!competitiveAnalysis?.keywordAnalysis?.keywordGaps) return [];

    let processedData = competitiveAnalysis.keywordAnalysis.keywordGaps.map(
      (gap): KeywordGapTableRow => ({
        keyword: gap.keyword,
        competitorRanking: gap.competitorRanking,
        userRanking: null, // Gap means we don't rank for this keyword
        searchVolume: gap.searchVolume,
        difficulty: gap.difficulty,
        opportunityScore: gap.opportunityScore,
        priority: gap.priority,
        trend: "stable", // Default trend
        cpc: undefined,
      })
    );

    // Apply filters
    if (keywordFilter) {
      processedData = processedData.filter((row) =>
        row.keyword.toLowerCase().includes(keywordFilter.toLowerCase())
      );
    }

    if (priorityFilter !== "all") {
      processedData = processedData.filter((row) => row.priority === priorityFilter);
    }

    // Apply sorting
    processedData.sort((a, b) => {
      const aValue = a[sortBy as keyof KeywordGapTableRow] as number;
      const bValue = b[sortBy as keyof KeywordGapTableRow] as number;
      
      if (sortOrder === "desc") {
        return bValue - aValue;
      } else {
        return aValue - bValue;
      }
    });

    return processedData;
  }, [competitiveAnalysis, keywordFilter, priorityFilter, sortBy, sortOrder]);

  // Process technical SEO comparison data
  const technicalSEOData = useMemo(() => {
    if (!competitiveAnalysis?.technicalSEO) return [];

    const technical = competitiveAnalysis.technicalSEO;
    
    const metrics: TechnicalSEOMetric[] = [
      {
        name: "Site Speed",
        userScore: technical.siteSpeed.user,
        competitorScore: technical.siteSpeed.competitor,
        difference: technical.siteSpeed.gap,
        status: technical.siteSpeed.gap > 0 ? "better" : technical.siteSpeed.gap < 0 ? "worse" : "equal",
        impact: "high",
      },
      {
        name: "Mobile Optimization",
        userScore: technical.mobileOptimization.user,
        competitorScore: technical.mobileOptimization.competitor,
        difference: technical.mobileOptimization.gap,
        status: technical.mobileOptimization.gap > 0 ? "better" : technical.mobileOptimization.gap < 0 ? "worse" : "equal",
        impact: "high",
      },
      {
        name: "Core Web Vitals",
        userScore: technical.coreWebVitals.overall.user,
        competitorScore: technical.coreWebVitals.overall.competitor,
        difference: technical.coreWebVitals.overall.gap,
        status: technical.coreWebVitals.overall.gap > 0 ? "better" : technical.coreWebVitals.overall.gap < 0 ? "worse" : "equal",
        impact: "high",
      },
    ];

    return metrics;
  }, [competitiveAnalysis]);

  // SEO overview metrics
  const seoOverviewData = useMemo(() => {
    if (!competitiveAnalysis?.overallComparison) return null;

    const overview = competitiveAnalysis.overallComparison;
    
    return {
      userScore: overview.userScore,
      competitorScore: overview.competitorScore,
      gap: overview.gap,
      rankingComparison: overview.rankingComparison,
      visibilityMetrics: overview.visibilityMetrics,
    };
  }, [competitiveAnalysis]);

  // Keyword overlap analysis
  const keywordOverlapData = useMemo(() => {
    if (!competitiveAnalysis?.keywordAnalysis) return [];

    const keywordAnalysis = competitiveAnalysis.keywordAnalysis;
    
    return [
      {
        name: "Shared Keywords",
        value: keywordAnalysis.sharedKeywords?.length || 0,
        color: COLORS.primary,
      },
      {
        name: "Your Unique Keywords",
        value: keywordAnalysis.userUniqueKeywords?.length || 0,
        color: COLORS.success,
      },
      {
        name: "Competitor Unique Keywords",
        value: keywordAnalysis.competitorUniqueKeywords?.length || 0,
        color: COLORS.warning,
      },
      {
        name: "Keyword Gaps",
        value: keywordAnalysis.keywordGaps?.length || 0,
        color: COLORS.danger,
      },
    ];
  }, [competitiveAnalysis]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleExportData = useCallback(() => {
    if (!keywordGapData.length) return;

    const csvContent = [
      ["Keyword", "Competitor Ranking", "Search Volume", "Difficulty", "Opportunity Score", "Priority"],
      ...keywordGapData.map(row => [
        row.keyword,
        row.competitorRanking.toString(),
        row.searchVolume.toString(),
        row.difficulty.toString(),
        row.opportunityScore.toString(),
        row.priority,
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seo-keyword-gaps-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [keywordGapData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">SEO Competitive Analysis</h2>
            <p className="text-muted-foreground">Loading SEO competitive intelligence...</p>
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
            <Search className="h-6 w-6 text-blue-600" />
            SEO Competitive Analysis
          </h2>
          <p className="text-muted-foreground">
            Advanced SEO competitive intelligence and keyword gap analysis
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
            Please select a competitor to view detailed SEO analysis.
          </AlertDescription>
        </Alert>
      )}

      {selectedCompetitor && competitiveAnalysis && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">SEO Overview</TabsTrigger>
            <TabsTrigger value="keywords">Keyword Gap Analysis</TabsTrigger>
            <TabsTrigger value="technical">Technical SEO</TabsTrigger>
            <TabsTrigger value="rankings">Ranking Comparison</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* SEO Overview Cards */}
            {seoOverviewData && (
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Your SEO Score
                        </p>
                        <p className="text-2xl font-bold">{seoOverviewData.userScore}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-muted-foreground">
                          Competitor Score
                        </p>
                        <p className="text-2xl font-bold">{seoOverviewData.competitorScore}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      {seoOverviewData.gap > 0 ? (
                        <ArrowUp className="h-4 w-4 text-green-600" />
                      ) : seoOverviewData.gap < 0 ? (
                        <ArrowDown className="h-4 w-4 text-red-600" />
                      ) : (
                        <Minus className="h-4 w-4 text-gray-600" />
                      )}
                      <span className={`text-sm font-medium ${
                        seoOverviewData.gap > 0 ? "text-green-600" : 
                        seoOverviewData.gap < 0 ? "text-red-600" : "text-gray-600"
                      }`}>
                        {seoOverviewData.gap > 0 ? "+" : ""}{seoOverviewData.gap} point difference
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Organic Traffic
                        </p>
                        <p className="text-2xl font-bold">
                          {seoOverviewData.visibilityMetrics.organicTraffic.user.toLocaleString()}
                        </p>
                      </div>
                      <Eye className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground">
                        vs {seoOverviewData.visibilityMetrics.organicTraffic.competitor.toLocaleString()} (competitor)
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Keyword Visibility
                        </p>
                        <p className="text-2xl font-bold">
                          {seoOverviewData.visibilityMetrics.keywordVisibility.user}%
                        </p>
                      </div>
                      <Target className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground">
                        vs {seoOverviewData.visibilityMetrics.keywordVisibility.competitor}% (competitor)
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Keyword Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Keyword Distribution</CardTitle>
                <CardDescription>
                  Breakdown of keyword overlap vs unique keywords
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={keywordOverlapData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {keywordOverlapData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  {keywordOverlapData.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div 
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm">{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="keywords" className="space-y-4">
            {/* Keyword Gap Analysis Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Keyword Gap Analysis</CardTitle>
                <CardDescription>
                  Keywords your competitor ranks for but you don&apos;t
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex flex-wrap gap-4">
                  <div className="flex-1 min-w-64">
                    <Label htmlFor="keyword-search">Search Keywords</Label>
                    <Input
                      id="keyword-search"
                      placeholder="Filter keywords..."
                      value={keywordFilter}
                      onChange={(e) => setKeywordFilter(e.target.value)}
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
                        <SelectItem value="competitorRanking">Competitor Ranking</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                    >
                      {sortOrder === "desc" ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                    </Button>
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
                        <TableHead>Keyword</TableHead>
                        <TableHead>Competitor Rank</TableHead>
                        <TableHead>Search Volume</TableHead>
                        <TableHead>Difficulty</TableHead>
                        <TableHead>Opportunity Score</TableHead>
                        <TableHead>Priority</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {keywordGapData.slice(0, 50).map((row, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{row.keyword}</TableCell>
                          <TableCell>
                            <Badge variant="outline">#{row.competitorRanking}</Badge>
                          </TableCell>
                          <TableCell>{row.searchVolume.toLocaleString()}</TableCell>
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

                {keywordGapData.length > 50 && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Showing 50 of {keywordGapData.length} keywords. Export for full data.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="technical" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Technical SEO Comparison</CardTitle>
                <CardDescription>
                  Compare technical SEO metrics with {selectedCompetitorName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {technicalSEOData.map((metric, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{metric.name}</span>
                          {metric.status === "better" && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                          {metric.status === "worse" && (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          {metric.status === "equal" && (
                            <Minus className="h-4 w-4 text-gray-600" />
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {metric.userScore} vs {metric.competitorScore}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="flex justify-between text-sm">
                            <span>Your Score</span>
                            <span>{metric.userScore}</span>
                          </div>
                          <Progress value={metric.userScore} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm">
                            <span>Competitor Score</span>
                            <span>{metric.competitorScore}</span>
                          </div>
                          <Progress value={metric.competitorScore} className="h-2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rankings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Ranking Performance</CardTitle>
                <CardDescription>
                  Detailed ranking analysis and performance comparison
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {seoOverviewData?.rankingComparison && (
                    <>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <h4 className="font-medium">Average Position</h4>
                          <div className="text-2xl font-bold">
                            #{seoOverviewData.rankingComparison.averagePosition.user}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            vs #{seoOverviewData.rankingComparison.averagePosition.competitor} (competitor)
                          </p>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-medium">Top 10 Rankings</h4>
                          <div className="text-2xl font-bold">
                            {seoOverviewData.rankingComparison.topRankings.user}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            vs {seoOverviewData.rankingComparison.topRankings.competitor} (competitor)
                          </p>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-4">Ranking Improvement Opportunities</h4>
                        <div className="space-y-3">
                          {seoOverviewData.rankingComparison.improvementOpportunities.slice(0, 5).map((opportunity, index) => (
                            <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                              <div>
                                <div className="font-medium">{opportunity.keyword}</div>
                                <div className="text-sm text-muted-foreground">
                                  Current: #{opportunity.currentRanking} | Competitor: #{opportunity.competitorRanking}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium">
                                  {opportunity.improvementPotential}% potential
                                </div>
                                <Badge variant={
                                  opportunity.effort === "low" ? "default" :
                                  opportunity.effort === "medium" ? "secondary" : "destructive"
                                }>
                                  {opportunity.effort} effort
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
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