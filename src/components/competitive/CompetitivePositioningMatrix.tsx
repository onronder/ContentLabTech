/**
 * Competitive Positioning Matrix
 * D3.js-powered interactive positioning matrix for competitive analysis
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Target } from "lucide-react";
import type { CompetitiveAnalysisResult } from "@/lib/competitive/types";

interface CompetitivePositioningMatrixProps {
  analysisResults: CompetitiveAnalysisResult[];
  className?: string;
}

interface CompetitorPosition {
  id: string;
  name: string;
  domain: string;
  xValue: number; // Market Share/Reach
  yValue: number; // Competitive Strength
  size: number; // Overall Performance Score
  category: "leader" | "challenger" | "follower" | "niche";
  color: string;
  data: CompetitiveAnalysisResult;
}

interface QuadrantInfo {
  name: string;
  description: string;
  color: string;
  bgColor: string;
}

const QUADRANTS: Record<string, QuadrantInfo> = {
  leaders: {
    name: "Leaders",
    description: "High market share, high competitive strength",
    color: "#059669",
    bgColor: "rgba(5, 150, 105, 0.1)",
  },
  challengers: {
    name: "Challengers", 
    description: "High competitive strength, developing market share",
    color: "#3B82F6",
    bgColor: "rgba(59, 130, 246, 0.1)",
  },
  followers: {
    name: "Followers",
    description: "Established market presence, moderate strength",
    color: "#F59E0B",
    bgColor: "rgba(245, 158, 11, 0.1)",
  },
  niche: {
    name: "Niche Players",
    description: "Specialized focus, emerging market position",
    color: "#8B5CF6",
    bgColor: "rgba(139, 92, 246, 0.1)",
  },
};

const METRICS = [
  { value: "market-share", label: "Market Share vs Competitive Strength" },
  { value: "content-seo", label: "Content Quality vs SEO Performance" },
  { value: "performance-reach", label: "Performance vs Reach" },
];

export const CompetitivePositioningMatrix: React.FC<
  CompetitivePositioningMatrixProps
> = ({ analysisResults, className }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [selectedMetric, setSelectedMetric] = useState("market-share");
  const [, setHoveredCompetitor] = useState<string | null>(null);

  // Transform analysis results into positioning data
  const competitorPositions = useMemo((): CompetitorPosition[] => {
    return analysisResults
      .filter(result => result.status === "completed")
      .map((result, index) => {
        let xValue: number, yValue: number, size: number;

        // Calculate values based on selected metric
        switch (selectedMetric) {
          case "content-seo":
            xValue = result.data.contentAnalysis?.contentQuality?.userScore || 0;
            yValue = result.data.seoAnalysis?.overallComparison?.userScore || 0;
            size = result.confidence?.overall || 50;
            break;
          case "performance-reach":
            xValue = 100 - (result.data.performanceAnalysis?.speedComparison?.loadTime?.user || 50);
            yValue = result.data.seoAnalysis?.overallComparison?.visibilityMetrics?.organicTraffic?.user || 0;
            size = result.confidence?.overall || 50;
            break;
          default: // market-share
            xValue = Math.random() * 80 + 10; // Mock market share data
            yValue = result.confidence?.overall || 50;
            size = (result.data.contentAnalysis?.contentQuality?.userScore || 0) +
                   (result.data.seoAnalysis?.overallComparison?.userScore || 0);
        }

        // Determine category based on position
        let category: CompetitorPosition["category"];
        if (xValue >= 60 && yValue >= 60) category = "leader";
        else if (xValue < 60 && yValue >= 60) category = "challenger"; 
        else if (xValue >= 60 && yValue < 60) category = "follower";
        else category = "niche";

        return {
          id: result.id,
          name: `Competitor ${index + 1}`,
          domain: result.competitorId || "unknown.com",
          xValue,
          yValue,
          size: Math.max((size || 50) / 2, 10), // Scale size appropriately
          category,
          color: QUADRANTS[
            category === "leader" ? "leaders" : 
            category === "challenger" ? "challengers" :
            category === "follower" ? "followers" : "niche"
          ]?.color || "#6B7280",
          data: result,
        };
      });
  }, [analysisResults, selectedMetric]);

  // D3.js rendering
  useEffect(() => {
    if (!svgRef.current || competitorPositions.length === 0) return;

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

    const sizeScale = d3.scaleLinear()
      .domain(d3.extent(competitorPositions, d => d.size) as [number, number] || [8, 20])
      .range([8, 20]);

    // Create main group
    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Draw quadrant backgrounds
    const quadrantData = [
      { x: 0, y: 0, width: width/2, height: height/2, quadrant: "niche" },
      { x: width/2, y: 0, width: width/2, height: height/2, quadrant: "followers" },
      { x: 0, y: height/2, width: width/2, height: height/2, quadrant: "challengers" },
      { x: width/2, y: height/2, width: width/2, height: height/2, quadrant: "leaders" },
    ];

    g.selectAll(".quadrant")
      .data(quadrantData)
      .enter()
      .append("rect")
      .attr("class", "quadrant")
      .attr("x", d => d.x)
      .attr("y", d => d.y)
      .attr("width", d => d.width)
      .attr("height", d => d.height)
      .attr("fill", d => QUADRANTS[d.quadrant]?.bgColor || "rgba(107, 114, 128, 0.1)")
      .attr("stroke", "#e5e7eb")
      .attr("stroke-width", 1);

    // Add quadrant labels
    const quadrantLabels = [
      { x: width/4, y: height/4, text: "Niche Players", quadrant: "niche" },
      { x: 3*width/4, y: height/4, text: "Followers", quadrant: "followers" },
      { x: width/4, y: 3*height/4, text: "Challengers", quadrant: "challengers" },
      { x: 3*width/4, y: 3*height/4, text: "Leaders", quadrant: "leaders" },
    ];

    g.selectAll(".quadrant-label")
      .data(quadrantLabels)
      .enter()
      .append("text")
      .attr("class", "quadrant-label")
      .attr("x", d => d.x)
      .attr("y", d => d.y - 10)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("font-weight", "600")
      .attr("fill", d => QUADRANTS[d.quadrant]?.color || "#6B7280")
      .text(d => d.text);

    // Add grid lines
    const xTicks = xScale.ticks(5);
    const yTicks = yScale.ticks(5);

    g.selectAll(".grid-line-vertical")
      .data(xTicks)
      .enter()
      .append("line")
      .attr("class", "grid-line-vertical")
      .attr("x1", d => xScale(d))
      .attr("x2", d => xScale(d))
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "#f3f4f6")
      .attr("stroke-width", 1);

    g.selectAll(".grid-line-horizontal")
      .data(yTicks)
      .enter()
      .append("line")
      .attr("class", "grid-line-horizontal")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", d => yScale(d))
      .attr("y2", d => yScale(d))
      .attr("stroke", "#f3f4f6")
      .attr("stroke-width", 1);

    // Add center lines
    g.append("line")
      .attr("x1", width/2)
      .attr("x2", width/2)
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "#9ca3af")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5");

    g.append("line")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", height/2)
      .attr("y2", height/2)
      .attr("stroke", "#9ca3af")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5");

    // Add competitor circles
    const circles = g.selectAll(".competitor")
      .data(competitorPositions)
      .enter()
      .append("circle")
      .attr("class", "competitor")
      .attr("cx", d => xScale(d.xValue))
      .attr("cy", d => yScale(d.yValue))
      .attr("r", d => sizeScale(d.size))
      .attr("fill", d => d.color)
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2)
      .attr("opacity", 0.8)
      .style("cursor", "pointer");

    // Add competitor labels
    g.selectAll(".competitor-label")
      .data(competitorPositions)
      .enter()
      .append("text")
      .attr("class", "competitor-label")
      .attr("x", d => xScale(d.xValue))
      .attr("y", d => yScale(d.yValue) - sizeScale(d.size) - 5)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("font-weight", "500")
      .attr("fill", "#374151")
      .text(d => d.name);

    // Add axes
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
    const currentMetric = METRICS.find(m => m.value === selectedMetric);
    const [xLabel, yLabel] = currentMetric?.label.split(" vs ") || ["X Axis", "Y Axis"];

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
        setHoveredCompetitor(d.id);
        
        tooltip
          .style("opacity", 1)
          .style("left", (d3.pointer(_event, document.body)[0] + 10) + "px")
          .style("top", (d3.pointer(_event, document.body)[1] - 10) + "px")
          .html(`
            <div class="font-semibold">${d.name}</div>
            <div class="text-sm text-gray-600">${d.domain}</div>
            <div class="text-sm mt-1">
              <div>${xLabel}: ${d.xValue.toFixed(1)}%</div>
              <div>${yLabel}: ${d.yValue.toFixed(1)}%</div>
              <div>Overall Score: ${d.size.toFixed(1)}</div>
            </div>
            <div class="text-xs mt-1">
              <span class="inline-block px-2 py-1 rounded text-white" style="background-color: ${d.color}">
                ${d.category.charAt(0).toUpperCase() + d.category.slice(1)}
              </span>
            </div>
          `);

        d3.select(this)
          .transition()
          .duration(200)
          .attr("opacity", 1)
          .attr("stroke-width", 3);
      })
      .on("mouseout", function(_event, _d) {
        setHoveredCompetitor(null);
        
        tooltip.style("opacity", 0);

        d3.select(this)
          .transition()
          .duration(200)
          .attr("opacity", 0.8)
          .attr("stroke-width", 2);
      });

  }, [competitorPositions, selectedMetric]);

  // Calculate quadrant statistics
  const quadrantStats = useMemo(() => {
    const stats = Object.keys(QUADRANTS).reduce((acc, key) => {
      acc[key] = competitorPositions.filter(c => 
        (key === "leaders" && c.category === "leader") ||
        (key === "challengers" && c.category === "challenger") ||
        (key === "followers" && c.category === "follower") ||
        (key === "niche" && c.category === "niche")
      ).length;
      return acc;
    }, {} as Record<string, number>);
    return stats;
  }, [competitorPositions]);

  if (analysisResults.length === 0) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="py-8">
            <div className="text-muted-foreground text-center">
              No competitive analysis data available for positioning matrix.
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
                <Target className="h-5 w-5 text-blue-600" />
                Competitive Positioning Matrix
              </CardTitle>
              <CardDescription>
                Strategic competitive positioning analysis with D3.js visualization
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METRICS.map(metric => (
                    <SelectItem key={metric.value} value={metric.value}>
                      {metric.label}
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

      {/* Quadrant Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(QUADRANTS).map(([key, quadrant]) => (
          <Card key={key}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div 
                    className="h-3 w-3 rounded-full mb-2"
                    style={{ backgroundColor: quadrant.color }}
                  />
                  <p className="font-semibold text-sm">{quadrant.name}</p>
                  <p className="text-xs text-muted-foreground">{quadrant.description}</p>
                </div>
                <div className="text-2xl font-bold" style={{ color: quadrant.color }}>
                  {quadrantStats[key] || 0}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Matrix Legend</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-600" />
              <span>Circle size represents overall performance score</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-gray-400" />
              <span>Position determined by selected metrics</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-8 bg-gray-200 rounded" />
              <span>Hover over competitors for detailed information</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};