/**
 * Market Opportunity Heat Map
 * D3.js-powered heat map visualization for market opportunity analysis
 */

"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, Brain, Activity } from "lucide-react";
import type { CompetitiveAnalysisResult } from "@/lib/competitive/types";

interface MarketOpportunityHeatMapProps {
  analysisResults: CompetitiveAnalysisResult[];
  className?: string;
}

interface OpportunityCell {
  id: string;
  x: number;
  y: number;
  value: number;
  opportunity: MarketOpportunity;
  color: string;
  intensity: number;
}

interface MarketOpportunity {
  id: string;
  title: string;
  category: OpportunityCategory;
  impact: number; // 0-100
  effort: number; // 0-100
  priority: "critical" | "high" | "medium" | "low";
  timeframe: string;
  description: string;
  competitorGap: number;
  marketSize: number;
  accessibility: number;
}

type OpportunityCategory = 
  | "content-gaps"
  | "keyword-opportunities" 
  | "technical-seo"
  | "performance"
  | "market-positioning"
  | "audience-expansion";

const CATEGORY_CONFIG = {
  "content-gaps": {
    name: "Content Gaps",
    color: "#3B82F6",
    icon: "📝",
  },
  "keyword-opportunities": {
    name: "Keyword Opportunities", 
    color: "#10B981",
    icon: "🔍",
  },
  "technical-seo": {
    name: "Technical SEO",
    color: "#F59E0B",
    icon: "⚙️",
  },
  "performance": {
    name: "Performance",
    color: "#EF4444",
    icon: "⚡",
  },
  "market-positioning": {
    name: "Market Positioning",
    color: "#8B5CF6",
    icon: "🎯",
  },
  "audience-expansion": {
    name: "Audience Expansion",
    color: "#06B6D4",
    icon: "👥",
  },
};

const ANALYSIS_MODES = [
  { value: "impact-effort", label: "Impact vs Effort Analysis" },
  { value: "priority-timeline", label: "Priority vs Timeline" },
  { value: "size-accessibility", label: "Market Size vs Accessibility" },
];

export const MarketOpportunityHeatMap: React.FC<
  MarketOpportunityHeatMapProps
> = ({ analysisResults, className }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [analysisMode, setAnalysisMode] = useState("impact-effort");
  const [selectedCategory, setSelectedCategory] = useState<OpportunityCategory | "all">("all");

  // Extract and transform opportunity data from analysis results
  const opportunities = useMemo((): MarketOpportunity[] => {
    const extractedOpportunities: MarketOpportunity[] = [];

    analysisResults
      .filter(result => result.status === "completed")
      .forEach((result, resultIndex) => {
        // Content gaps opportunities
        const contentGaps = result.data.contentAnalysis?.topicAnalysis?.topicGaps || [];
        contentGaps.slice(0, 3).forEach((gap, index) => {
          extractedOpportunities.push({
            id: `content-${resultIndex}-${index}`,
            title: `Content Gap: ${gap.topic.name}`,
            category: "content-gaps",
            impact: gap.opportunityScore,
            effort: 100 - gap.difficulty,
            priority: gap.opportunityScore > 80 ? "critical" : gap.opportunityScore > 60 ? "high" : "medium",
            timeframe: gap.opportunityScore > 70 ? "1-2 months" : "2-4 months",
            description: gap.recommendation,
            competitorGap: gap.topic.competitiveDensity,
            marketSize: gap.searchVolume / 1000,
            accessibility: gap.strategicRelevance,
          });
        });

        // Keyword opportunities
        const keywordGaps = result.data.seoAnalysis?.keywordAnalysis?.keywordGaps || [];
        keywordGaps.slice(0, 3).forEach((gap, index) => {
          extractedOpportunities.push({
            id: `keyword-${resultIndex}-${index}`,
            title: `Keyword: ${gap.keyword}`,
            category: "keyword-opportunities",
            impact: gap.opportunityScore,
            effort: 100 - gap.difficulty,
            priority: gap.priority === "high" ? "high" : gap.priority === "medium" ? "medium" : "low",
            timeframe: gap.difficulty < 50 ? "2-4 weeks" : "1-3 months",
            description: `Target keyword with ${gap.searchVolume} monthly searches`,
            competitorGap: gap.competitorRanking,
            marketSize: gap.searchVolume / 100,
            accessibility: gap.opportunityScore,
          });
        });

        // Performance opportunities
        const perfOpportunities = result.data.performanceAnalysis?.performanceOpportunities || [];
        perfOpportunities.slice(0, 2).forEach((opp, index) => {
          extractedOpportunities.push({
            id: `performance-${resultIndex}-${index}`,
            title: `Performance: ${opp.metric}`,
            category: "performance",
            impact: opp.improvementPotential,
            effort: opp.implementation.difficulty === "low" ? 80 : opp.implementation.difficulty === "medium" ? 50 : 20,
            priority: opp.improvementPotential > 70 ? "high" : "medium",
            timeframe: opp.implementation.effort,
            description: `Improve ${opp.metric} performance`,
            competitorGap: Math.abs(opp.currentValue - opp.competitorValue),
            marketSize: opp.implementation.expectedImpact,
            accessibility: opp.implementation.difficulty === "low" ? 90 : 60,
          });
        });

        // Add some market positioning opportunities based on analysis
        if (result.confidence?.overall && result.confidence.overall < 80) {
          extractedOpportunities.push({
            id: `positioning-${resultIndex}`,
            title: "Strengthen Market Position",
            category: "market-positioning",
            impact: 85,
            effort: 60,
            priority: "high",
            timeframe: "3-6 months",
            description: "Improve overall competitive positioning",
            competitorGap: 100 - result.confidence.overall,
            marketSize: 75,
            accessibility: 70,
          });
        }
      });

    return extractedOpportunities;
  }, [analysisResults]);

  // Filter opportunities by selected category
  const filteredOpportunities = useMemo(() => {
    if (selectedCategory === "all") return opportunities;
    return opportunities.filter(opp => opp.category === selectedCategory);
  }, [opportunities, selectedCategory]);

  // Create heat map cells based on analysis mode
  const heatMapCells = useMemo((): OpportunityCell[] => {
    const cells: OpportunityCell[] = [];

    filteredOpportunities.forEach((opportunity, _index) => {
      let x: number, y: number;

      switch (analysisMode) {
        case "priority-timeline":
          x = opportunity.timeframe.includes("weeks") ? 20 : 
              opportunity.timeframe.includes("1-2 months") ? 40 :
              opportunity.timeframe.includes("2-4 months") ? 60 : 80;
          y = opportunity.priority === "critical" ? 90 :
              opportunity.priority === "high" ? 70 :
              opportunity.priority === "medium" ? 50 : 30;
          break;
        case "size-accessibility":
          x = opportunity.accessibility;
          y = opportunity.marketSize;
          break;
        default: // impact-effort
          x = opportunity.effort;
          y = opportunity.impact;
      }

      // Add some jitter to prevent overlapping
      const jitterX = (Math.random() - 0.5) * 8;
      const jitterY = (Math.random() - 0.5) * 8;

      cells.push({
        id: opportunity.id,
        x: Math.max(5, Math.min(95, x + jitterX)),
        y: Math.max(5, Math.min(95, y + jitterY)),
        value: opportunity.impact,
        opportunity,
        color: CATEGORY_CONFIG[opportunity.category].color,
        intensity: opportunity.impact / 100,
      });
    });

    return cells;
  }, [filteredOpportunities, analysisMode]);

  // D3.js heat map rendering
  useEffect(() => {
    if (!svgRef.current || heatMapCells.length === 0) return;

    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);
    
    // Clear previous content
    svg.selectAll("*").remove();

    // Dimensions and margins
    const margin = { top: 40, right: 80, bottom: 60, left: 80 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Scales
    const xScale = d3.scaleLinear()
      .domain([0, 100])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([0, 100])
      .range([height, 0]);

    const radiusScale = d3.scaleLinear()
      .domain([0, 100])
      .range([6, 16]);

    // Create main group
    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create gradient definitions for heat map effect
    const defs = svg.append("defs");
    
    Object.entries(CATEGORY_CONFIG).forEach(([category, config]) => {
      const gradient = defs.append("radialGradient")
        .attr("id", `gradient-${category}`)
        .attr("cx", "50%")
        .attr("cy", "50%")
        .attr("r", "50%");

      gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", config.color)
        .attr("stop-opacity", 0.8);

      gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", config.color)
        .attr("stop-opacity", 0.3);
    });

    // Add background grid
    const gridLines = g.append("g").attr("class", "grid");
    
    const xTicks = [25, 50, 75];
    const yTicks = [25, 50, 75];

    gridLines.selectAll(".grid-line-vertical")
      .data(xTicks)
      .enter()
      .append("line")
      .attr("class", "grid-line-vertical")
      .attr("x1", d => xScale(d))
      .attr("x2", d => xScale(d))
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "#f3f4f6")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "2,2");

    gridLines.selectAll(".grid-line-horizontal")
      .data(yTicks)
      .enter()
      .append("line")
      .attr("class", "grid-line-horizontal")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", d => yScale(d))
      .attr("y2", d => yScale(d))
      .attr("stroke", "#f3f4f6")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "2,2");

    // Add quadrant backgrounds
    const quadrants = [
      { x: 0, y: height/2, width: width/2, height: height/2, label: "Low Effort\nLow Impact", color: "#fef2f2" },
      { x: width/2, y: height/2, width: width/2, height: height/2, label: "High Effort\nLow Impact", color: "#fff7ed" },
      { x: 0, y: 0, width: width/2, height: height/2, label: "Low Effort\nHigh Impact", color: "#f0fdf4" },
      { x: width/2, y: 0, width: width/2, height: height/2, label: "High Effort\nHigh Impact", color: "#fefce8" },
    ];

    if (analysisMode === "impact-effort") {
      g.selectAll(".quadrant-bg")
        .data(quadrants)
        .enter()
        .append("rect")
        .attr("class", "quadrant-bg")
        .attr("x", d => d.x)
        .attr("y", d => d.y)
        .attr("width", d => d.width)
        .attr("height", d => d.height)
        .attr("fill", d => d.color)
        .attr("opacity", 0.3);

      g.selectAll(".quadrant-label")
        .data(quadrants)
        .enter()
        .append("text")
        .attr("class", "quadrant-label")
        .attr("x", d => d.x + d.width/2)
        .attr("y", d => d.y + d.height/2)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("font-weight", "500")
        .attr("fill", "#6b7280")
        .attr("opacity", 0.7)
        .selectAll("tspan")
        .data(d => d.label.split("\n"))
        .enter()
        .append("tspan")
        .attr("x", function() {
          const parent = d3.select(this.parentNode as SVGTextElement);
          return parent.attr("x");
        })
        .attr("dy", (d, i) => i === 0 ? 0 : "1.2em")
        .text(d => d);
    }

    // Add heat map circles
    const circles = g.selectAll(".opportunity-cell")
      .data(heatMapCells)
      .enter()
      .append("circle")
      .attr("class", "opportunity-cell")
      .attr("cx", d => xScale(d.x))
      .attr("cy", d => yScale(d.y))
      .attr("r", d => radiusScale(d.value))
      .attr("fill", d => `url(#gradient-${d.opportunity.category})`)
      .attr("stroke", d => d.color)
      .attr("stroke-width", 2)
      .attr("opacity", 0.8)
      .style("cursor", "pointer");

    // Add axes
    const currentMode = ANALYSIS_MODES.find(m => m.value === analysisMode);
    const [xLabel, yLabel] = currentMode?.label.split(" vs ") || ["X Axis", "Y Axis"];

    const xAxis = d3.axisBottom(xScale).ticks(5);
    const yAxis = d3.axisLeft(yScale).ticks(5);

    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis);

    g.append("g")
      .attr("class", "y-axis")
      .call(yAxis);

    // Add axis labels
    g.append("text")
      .attr("class", "x-axis-label")
      .attr("x", width / 2)
      .attr("y", height + 45)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("font-weight", "500")
      .attr("fill", "#6b7280")
      .text(xLabel || "X Axis");

    g.append("text")
      .attr("class", "y-axis-label")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -50)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("font-weight", "500")
      .attr("fill", "#6b7280")
      .text(yLabel || "Y Axis");

    // Tooltip interactions
    circles
      .on("mouseover", function(_event, d) {
        tooltip
          .style("opacity", 1)
          .style("left", (d3.pointer(_event, document.body)[0] + 10) + "px")
          .style("top", (d3.pointer(_event, document.body)[1] - 10) + "px")
          .html(`
            <div class="font-semibold">${d.opportunity.title}</div>
            <div class="text-sm text-gray-600 mb-2">${CATEGORY_CONFIG[d.opportunity.category].icon} ${CATEGORY_CONFIG[d.opportunity.category].name}</div>
            <div class="text-sm space-y-1">
              <div><strong>Impact:</strong> ${d.opportunity.impact}%</div>
              <div><strong>Effort:</strong> ${d.opportunity.effort}%</div>
              <div><strong>Priority:</strong> ${d.opportunity.priority}</div>
              <div><strong>Timeline:</strong> ${d.opportunity.timeframe}</div>
            </div>
            <div class="text-xs mt-2 text-gray-500">
              ${d.opportunity.description}
            </div>
          `);

        d3.select(this)
          .transition()
          .duration(200)
          .attr("opacity", 1)
          .attr("stroke-width", 3);
      })
      .on("mouseout", function(_event, _d) {
        tooltip.style("opacity", 0);

        d3.select(this)
          .transition()
          .duration(200)
          .attr("opacity", 0.8)
          .attr("stroke-width", 2);
      });

  }, [heatMapCells, analysisMode]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const highImpact = filteredOpportunities.filter(o => o.impact >= 70).length;
    const lowEffort = filteredOpportunities.filter(o => o.effort >= 70).length;
    const quickWins = filteredOpportunities.filter(o => o.impact >= 70 && o.effort >= 70).length;
    const avgImpact = filteredOpportunities.reduce((sum, o) => sum + o.impact, 0) / filteredOpportunities.length || 0;

    return { highImpact, lowEffort, quickWins, avgImpact };
  }, [filteredOpportunities]);

  if (opportunities.length === 0) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="py-8">
            <div className="text-muted-foreground text-center">
              No market opportunities identified from current analysis data.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className || ""}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Market Opportunity Heat Map
              </CardTitle>
              <CardDescription>
                Strategic opportunity analysis with D3.js heat map visualization
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as OpportunityCategory | "all")}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.icon} {config.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={analysisMode} onValueChange={setAnalysisMode}>
                <SelectTrigger className="w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANALYSIS_MODES.map(mode => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <svg
              ref={svgRef}
              width="600"
              height="400"
              className="border rounded-lg bg-white"
            />
            <div
              ref={tooltipRef}
              className="absolute pointer-events-none bg-white border rounded-lg shadow-lg p-3 text-sm opacity-0 transition-opacity z-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">High Impact</p>
                <p className="text-2xl font-bold text-green-600">{summaryStats.highImpact}</p>
              </div>
              <Activity className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Low Effort</p>
                <p className="text-2xl font-bold text-blue-600">{summaryStats.lowEffort}</p>
              </div>
              <Brain className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Quick Wins</p>
                <p className="text-2xl font-bold text-purple-600">{summaryStats.quickWins}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Impact</p>
                <p className="text-2xl font-bold text-orange-600">{Math.round(summaryStats.avgImpact)}%</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                <span className="text-orange-600 font-bold text-sm">%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Opportunity Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <div key={key} className="flex items-center gap-2">
                <div 
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: config.color }}
                />
                <span className="text-sm">
                  {config.icon} {config.name}
                </span>
                <Badge variant="outline" className="ml-auto">
                  {opportunities.filter(o => o.category === key).length}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};