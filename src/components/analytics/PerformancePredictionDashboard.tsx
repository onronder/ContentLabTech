"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fetch } from "@/lib/utils/fetch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  Brain,
  Clock,
  Target,
  Eye,
  Users,
  DollarSign,
  BarChart3,
  Activity,
  AlertTriangle,
  CheckCircle,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

interface PerformancePredictionDashboardProps {
  projectId: string;
  contentId?: string;
}

interface PredictionMetric {
  predicted: number;
  range: [number, number];
  trend: "increasing" | "decreasing" | "stable";
}

interface PerformancePrediction {
  predictionId: string;
  contentId: string;
  modelVersion: string;
  timeframe: number;
  confidence: "low" | "medium" | "high" | "very_high";
  confidenceScore: number;
  predictions: {
    pageviews: PredictionMetric;
    organicTraffic: PredictionMetric;
    conversionRate: PredictionMetric;
    engagementScore: PredictionMetric;
  };
  insights: {
    keyFactors: string[];
    recommendations: string[];
    riskFactors: string[];
    opportunities: string[];
  };
  metadata: {
    trainingDataSize: number;
    modelAccuracy: number;
    featuresUsed: number;
    processingTime: number;
    createdAt: string;
  };
}

interface TrendData {
  date: string;
  actual: number;
  predicted: number;
  confidence: number;
}

export function PerformancePredictionDashboard({
  projectId,
  contentId,
}: PerformancePredictionDashboardProps) {
  const [prediction, setPrediction] = useState<PerformancePrediction | null>(
    null
  );
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState("30");
  const [selectedContent] = useState(contentId || "");

  const generatePrediction = useCallback(async () => {
    if (!selectedContent) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analytics/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          action: "predict",
          params: {
            contentId: selectedContent,
            timeframe: parseInt(selectedTimeframe),
            analysisType: "performance",
            includeConfidence: true,
            generateInsights: true,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate prediction");
      }

      const data = await response.json();
      setPrediction(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [selectedContent, selectedTimeframe, projectId]);

  const loadTrendData = useCallback(async () => {
    try {
      const response = await fetch("/api/analytics/trends", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          action: "trends",
          params: {
            contentId: selectedContent,
            timeframe: parseInt(selectedTimeframe),
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTrendData(data.result.trends || []);
      }
    } catch (err) {
      console.error("Failed to load trend data:", err);
    }
  }, [selectedContent, selectedTimeframe, projectId]);

  useEffect(() => {
    if (selectedContent) {
      generatePrediction();
      loadTrendData();
    }
  }, [selectedContent, selectedTimeframe, generatePrediction, loadTrendData]);

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "very_high":
        return "text-green-600";
      case "high":
        return "text-blue-600";
      case "medium":
        return "text-yellow-600";
      case "low":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getConfidenceBadgeVariant = (confidence: string) => {
    switch (confidence) {
      case "very_high":
        return "default";
      case "high":
        return "secondary";
      case "medium":
        return "outline";
      case "low":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "increasing":
        return <ArrowUpRight className="h-4 w-4 text-green-600" />;
      case "decreasing":
        return <ArrowDownRight className="h-4 w-4 text-red-600" />;
      case "stable":
        return <Minus className="h-4 w-4 text-gray-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatPercentage = (num: number) => `${num.toFixed(2)}%`;

  // Dynamic chart colors based on theme
  const chartColors = [
    "hsl(var(--primary))",
    "hsl(var(--secondary))",
    "hsl(var(--accent))",
    "hsl(var(--muted))",
    "hsl(var(--card))",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Brain className="h-6 w-6 text-purple-600" />
            Performance Predictions
          </h2>
          <p className="text-muted-foreground">
            AI-powered content performance forecasting and insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedTimeframe}
            onValueChange={setSelectedTimeframe}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 Days</SelectItem>
              <SelectItem value="30">30 Days</SelectItem>
              <SelectItem value="90">90 Days</SelectItem>
              <SelectItem value="365">1 Year</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={generatePrediction}
            disabled={isLoading || !selectedContent}
          >
            {isLoading ? (
              <>
                <Activity className="mr-2 h-4 w-4 animate-spin" />
                Predicting...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Generate Prediction
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {prediction && (
        <div className="space-y-6">
          {/* Confidence & Overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Prediction Confidence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span
                    className={`text-2xl font-bold ${getConfidenceColor(prediction.confidence)}`}
                  >
                    {prediction.confidenceScore.toFixed(0)}%
                  </span>
                  <Badge
                    variant={getConfidenceBadgeVariant(prediction.confidence)}
                  >
                    {prediction.confidence.replace("_", " ")}
                  </Badge>
                </div>
                <Progress value={prediction.confidenceScore} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Model Accuracy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-blue-600">
                    {(prediction.metadata.modelAccuracy * 100).toFixed(0)}%
                  </span>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  v{prediction.modelVersion}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Features Used
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-orange-600">
                    {prediction.metadata.featuresUsed}
                  </span>
                  <BarChart3 className="h-5 w-5 text-orange-600" />
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  Training data:{" "}
                  {prediction.metadata.trainingDataSize.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Processing Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-purple-600">
                    {prediction.metadata.processingTime}ms
                  </span>
                  <Clock className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {new Date(prediction.metadata.createdAt).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="predictions" className="space-y-4">
            <TabsList>
              <TabsTrigger value="predictions">Predictions</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="predictions" className="space-y-4">
              {/* Prediction Metrics */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5 text-blue-600" />
                      Pageviews
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-3xl font-bold text-blue-600">
                            {formatNumber(
                              prediction.predictions.pageviews.predicted
                            )}
                          </span>
                          <div className="mt-1 flex items-center gap-2">
                            {getTrendIcon(
                              prediction.predictions.pageviews.trend
                            )}
                            <span className="text-muted-foreground text-sm">
                              {prediction.predictions.pageviews.trend}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Range:</span>
                          <span>
                            {formatNumber(
                              prediction.predictions.pageviews.range[0]
                            )}{" "}
                            -{" "}
                            {formatNumber(
                              prediction.predictions.pageviews.range[1]
                            )}
                          </span>
                        </div>
                        <Progress value={75} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-green-600" />
                      Organic Traffic
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-3xl font-bold text-green-600">
                            {formatNumber(
                              prediction.predictions.organicTraffic.predicted
                            )}
                          </span>
                          <div className="mt-1 flex items-center gap-2">
                            {getTrendIcon(
                              prediction.predictions.organicTraffic.trend
                            )}
                            <span className="text-muted-foreground text-sm">
                              {prediction.predictions.organicTraffic.trend}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Range:</span>
                          <span>
                            {formatNumber(
                              prediction.predictions.organicTraffic.range[0]
                            )}{" "}
                            -{" "}
                            {formatNumber(
                              prediction.predictions.organicTraffic.range[1]
                            )}
                          </span>
                        </div>
                        <Progress value={75} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-yellow-600" />
                      Conversion Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-3xl font-bold text-yellow-600">
                            {formatPercentage(
                              prediction.predictions.conversionRate.predicted
                            )}
                          </span>
                          <div className="mt-1 flex items-center gap-2">
                            {getTrendIcon(
                              prediction.predictions.conversionRate.trend
                            )}
                            <span className="text-muted-foreground text-sm">
                              {prediction.predictions.conversionRate.trend}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Range:</span>
                          <span>
                            {formatPercentage(
                              prediction.predictions.conversionRate.range[0]
                            )}{" "}
                            -{" "}
                            {formatPercentage(
                              prediction.predictions.conversionRate.range[1]
                            )}
                          </span>
                        </div>
                        <Progress value={75} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-purple-600" />
                      Engagement Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-3xl font-bold text-purple-600">
                            {prediction.predictions.engagementScore.predicted}
                          </span>
                          <div className="mt-1 flex items-center gap-2">
                            {getTrendIcon(
                              prediction.predictions.engagementScore.trend
                            )}
                            <span className="text-muted-foreground text-sm">
                              {prediction.predictions.engagementScore.trend}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Range:</span>
                          <span>
                            {prediction.predictions.engagementScore.range[0]} -{" "}
                            {prediction.predictions.engagementScore.range[1]}
                          </span>
                        </div>
                        <Progress
                          value={
                            prediction.predictions.engagementScore.predicted
                          }
                          className="h-2"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="trends" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Prediction vs Actual Trends</CardTitle>
                  <CardDescription>
                    Historical accuracy and future predictions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="actual"
                          stackId="1"
                          stroke={chartColors[0]}
                          fill={chartColors[0]}
                          fillOpacity={0.6}
                          name="Actual"
                        />
                        <Area
                          type="monotone"
                          dataKey="predicted"
                          stackId="2"
                          stroke={chartColors[1]}
                          fill={chartColors[1]}
                          fillOpacity={0.6}
                          name="Predicted"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="insights" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-green-600">
                      Key Factors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {prediction.insights.keyFactors.map((factor, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                          <span className="text-sm">{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-blue-600">
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {prediction.insights.recommendations.map(
                        (recommendation, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <TrendingUp className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                            <span className="text-sm">{recommendation}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-red-600">Risk Factors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {prediction.insights.riskFactors.map((risk, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
                          <span className="text-sm">{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-purple-600">
                      Opportunities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {prediction.insights.opportunities.map(
                        (opportunity, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <Target className="mt-0.5 h-4 w-4 flex-shrink-0 text-purple-600" />
                            <span className="text-sm">{opportunity}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Prediction Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Prediction ID</p>
                      <p className="text-muted-foreground font-mono text-sm">
                        {prediction.predictionId}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Content ID</p>
                      <p className="text-muted-foreground font-mono text-sm">
                        {prediction.contentId}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Model Version</p>
                      <p className="text-muted-foreground text-sm">
                        {prediction.modelVersion}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Timeframe</p>
                      <p className="text-muted-foreground text-sm">
                        {prediction.timeframe} days
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Training Data Size</p>
                      <p className="text-muted-foreground text-sm">
                        {prediction.metadata.trainingDataSize.toLocaleString()}{" "}
                        samples
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Features Used</p>
                      <p className="text-muted-foreground text-sm">
                        {prediction.metadata.featuresUsed} features
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {!prediction && !isLoading && selectedContent && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Brain className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <h3 className="mb-2 text-lg font-medium">No Predictions Yet</h3>
              <p className="text-muted-foreground mb-4">
                Generate ML-powered performance predictions for this content
              </p>
              <Button onClick={generatePrediction}>
                <Zap className="mr-2 h-4 w-4" />
                Generate Prediction
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
