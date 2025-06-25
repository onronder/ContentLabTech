'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bot, 
  Lightbulb, 
  TrendingUp, 
  Search, 
  FileText,
  Clock,
  DollarSign,
  AlertTriangle,
  Info
} from 'lucide-react';

interface ContentOptimizerProps {
  contentId: string;
  projectId: string;
}

interface Recommendation {
  type: 'title' | 'meta' | 'content' | 'keywords' | 'structure';
  priority: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  before?: string;
  after?: string;
}

interface SEOAnalysis {
  titleOptimization: {
    score: number;
    suggestions: string[];
  };
  contentStructure: {
    score: number;
    suggestions: string[];
  };
  keywordDensity: {
    score: number;
    suggestions: string[];
  };
  readability: {
    score: number;
    suggestions: string[];
  };
}

interface OptimizationResult {
  contentId: string;
  analysisType: string;
  overallScore: number;
  recommendations: Recommendation[];
  seoAnalysis: SEOAnalysis;
  generatedAt: string;
  processingTimeMs: number;
  tokensUsed: number;
  costUsd: number;
}

export function ContentOptimizer({ contentId, projectId }: ContentOptimizerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecommendations, setSelectedRecommendations] = useState<Set<string>>(new Set());

  const analyzeContent = async (analysisType: 'full' | 'seo' | 'keywords' | 'competitor' = 'full') => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/optimize-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentId,
          analysisType,
          options: {
            includeCompetitorAnalysis: true,
            generateRecommendations: true,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze content');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const implementRecommendations = async () => {
    if (selectedRecommendations.size === 0) return;

    try {
      const response = await fetch('/api/ai/implement-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentId,
          projectId,
          recommendationIds: Array.from(selectedRecommendations),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to implement recommendations');
      }

      // Refresh the analysis
      await analyzeContent();
      setSelectedRecommendations(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to implement recommendations');
    }
  };

  const toggleRecommendation = (index: number) => {
    const newSelected = new Set(selectedRecommendations);
    if (newSelected.has(index.toString())) {
      newSelected.delete(index.toString());
    } else {
      newSelected.add(index.toString());
    }
    setSelectedRecommendations(newSelected);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'high': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'medium': return <TrendingUp className="h-4 w-4 text-yellow-600" />;
      case 'low': return <TrendingUp className="h-4 w-4 text-gray-600" />;
      default: return <TrendingUp className="h-4 w-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'title': return <FileText className="h-4 w-4" />;
      case 'meta': return <Search className="h-4 w-4" />;
      case 'content': return <FileText className="h-4 w-4" />;
      case 'keywords': return <Search className="h-4 w-4" />;
      case 'structure': return <FileText className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-blue-600" />
            AI Content Optimizer
          </h2>
          <p className="text-muted-foreground">
            Get AI-powered recommendations to improve your content performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => analyzeContent('seo')}
            variant="outline"
            disabled={isAnalyzing}
          >
            SEO Analysis
          </Button>
          <Button
            onClick={() => analyzeContent('keywords')}
            variant="outline"
            disabled={isAnalyzing}
          >
            Keyword Analysis
          </Button>
          <Button
            onClick={() => analyzeContent('full')}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? 'Analyzing...' : 'Full Analysis'}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isAnalyzing && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-4">
              <Bot className="h-8 w-8 animate-pulse text-blue-600" />
              <div>
                <p className="text-lg font-medium">Analyzing your content...</p>
                <p className="text-sm text-muted-foreground">
                  This may take a few moments while our AI analyzes your content
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && !isAnalyzing && (
        <div className="space-y-6">
          {/* Overall Score */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Overall Optimization Score</span>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {result.processingTimeMs}ms
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    ${result.costUsd.toFixed(4)}
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold">{result.overallScore}/100</span>
                  <Badge variant={result.overallScore >= 80 ? 'default' : result.overallScore >= 60 ? 'secondary' : 'destructive'}>
                    {result.overallScore >= 80 ? 'Excellent' : result.overallScore >= 60 ? 'Good' : 'Needs Improvement'}
                  </Badge>
                </div>
                <Progress value={result.overallScore} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="recommendations" className="space-y-4">
            <TabsList>
              <TabsTrigger value="recommendations">
                Recommendations ({result.recommendations.length})
              </TabsTrigger>
              <TabsTrigger value="seo-analysis">SEO Analysis</TabsTrigger>
              <TabsTrigger value="technical">Technical Details</TabsTrigger>
            </TabsList>

            <TabsContent value="recommendations" className="space-y-4">
              {result.recommendations.length > 0 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Select recommendations to implement ({selectedRecommendations.size} selected)
                  </p>
                  {selectedRecommendations.size > 0 && (
                    <Button onClick={implementRecommendations} size="sm">
                      Implement Selected
                    </Button>
                  )}
                </div>
              )}

              <div className="space-y-4">
                {result.recommendations.map((rec, index) => (
                  <Card
                    key={index}
                    className={`cursor-pointer transition-colors ${
                      selectedRecommendations.has(index.toString())
                        ? 'ring-2 ring-blue-500 bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => toggleRecommendation(index)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(rec.type)}
                            <h3 className="font-medium">{rec.title}</h3>
                          </div>
                          <div className="flex items-center gap-2">
                            {getImpactIcon(rec.impact)}
                            <Badge variant={getPriorityColor(rec.priority)} size="sm">
                              {rec.priority} priority
                            </Badge>
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">
                          {rec.description}
                        </p>
                        
                        {rec.before && rec.after && (
                          <div className="space-y-2">
                            <div className="p-2 bg-red-50 rounded text-sm">
                              <strong>Before:</strong> {rec.before}
                            </div>
                            <div className="p-2 bg-green-50 rounded text-sm">
                              <strong>After:</strong> {rec.after}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Impact: {rec.impact}</span>
                          <span>Effort: {rec.effort}</span>
                          <span>Type: {rec.type}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="seo-analysis" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(result.seoAnalysis).map(([key, analysis]) => (
                  <Card key={key}>
                    <CardHeader>
                      <CardTitle className="text-base capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{analysis.score}/100</span>
                          <Badge variant={analysis.score >= 80 ? 'default' : analysis.score >= 60 ? 'secondary' : 'destructive'}>
                            {analysis.score >= 80 ? 'Good' : analysis.score >= 60 ? 'Fair' : 'Poor'}
                          </Badge>
                        </div>
                        <Progress value={analysis.score} className="h-1" />
                        <ScrollArea className="h-20">
                          <ul className="text-sm space-y-1">
                            {analysis.suggestions.map((suggestion, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <Info className="h-3 w-3 mt-0.5 text-blue-500 flex-shrink-0" />
                                {suggestion}
                              </li>
                            ))}
                          </ul>
                        </ScrollArea>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="technical" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Analysis Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Content ID</p>
                      <p className="text-sm text-muted-foreground font-mono">{result.contentId}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Analysis Type</p>
                      <p className="text-sm text-muted-foreground">{result.analysisType}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Processing Time</p>
                      <p className="text-sm text-muted-foreground">{result.processingTimeMs}ms</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Tokens Used</p>
                      <p className="text-sm text-muted-foreground">{result.tokensUsed.toLocaleString()}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Cost</p>
                      <p className="text-sm text-muted-foreground">${result.costUsd.toFixed(4)}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Generated At</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(result.generatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}