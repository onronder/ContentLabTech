/**
 * Threat Assessment Radar Chart
 * D3.js-powered radar chart for competitive threat analysis
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
import { Shield, AlertTriangle, Zap } from "lucide-react";
import type { CompetitiveAnalysisResult } from "@/lib/competitive/types";

interface ThreatAssessmentRadarProps {
  analysisResults: CompetitiveAnalysisResult[];
  alerts: Array<{
    id: string;
    type: string;
    severity: "critical" | "high" | "medium" | "low" | "info";
    title: string;
    description: string;
    timestamp: Date;
  }>;
  className?: string;
}

interface ThreatDimension {
  name: string;
  key: string;
  value: number; // 0-100 scale
  description: string;
  color: string;
  impact: "critical" | "high" | "medium" | "low";
}

interface RadarDataPoint {
  competitor: string;
  competitorId: string;
  dimensions: ThreatDimension[];
  overallThreatLevel: number;
  category: "critical" | "high" | "medium" | "low";
}

const THREAT_DIMENSIONS = [
  {
    name: "Content Competition",
    key: "content",
    description: "Quality and volume of competitor content",
    color: "#3B82F6",
  },
  {
    name: "SEO Dominance", 
    key: "seo",
    description: "Search engine optimization strength",
    color: "#10B981",
  },
  {
    name: "Performance Edge",
    key: "performance", 
    description: "Website performance advantages",
    color: "#F59E0B",
  },
  {
    name: "Market Position",
    key: "market",
    description: "Overall market positioning strength",
    color: "#EF4444",
  },
  {
    name: "Technical Superiority",
    key: "technical",
    description: "Technical implementation advantages",
    color: "#8B5CF6",
  },
  {
    name: "Innovation Rate",
    key: "innovation",
    description: "Speed of feature and content innovation",
    color: "#06B6D4",
  },
];

const VIEW_MODES = [
  { value: "aggregate", label: "Aggregate Threat Level" },
  { value: "individual", label: "Individual Competitors" },
  { value: "top-threats", label: "Top 3 Threats Only" },
];

export const ThreatAssessmentRadar: React.FC<ThreatAssessmentRadarProps> = ({
  analysisResults,
  alerts,
  className,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState("aggregate");
  const [selectedCompetitor, setSelectedCompetitor] = useState<string>("all");

  // Transform analysis results into radar data
  const radarData = useMemo((): RadarDataPoint[] => {
    const dataPoints: RadarDataPoint[] = [];

    analysisResults
      .filter(result => result.status === "completed")
      .forEach((result, index) => {
        const dimensions: ThreatDimension[] = THREAT_DIMENSIONS.map(dim => {
          let value: number;
          let impact: ThreatDimension["impact"];

          switch (dim.key) {
            case "content":
              value = result.data.contentAnalysis?.contentQuality?.competitorScore || 0;
              impact = value > 80 ? "critical" : value > 65 ? "high" : value > 45 ? "medium" : "low";
              break;
            case "seo":
              value = result.data.seoAnalysis?.overallComparison?.competitorScore || 0;
              impact = value > 85 ? "critical" : value > 70 ? "high" : value > 50 ? "medium" : "low";
              break;
            case "performance":
              const perfScore = 100 - (result.data.performanceAnalysis?.speedComparison?.loadTime?.competitor || 50);
              value = Math.max(0, Math.min(100, perfScore));
              impact = value > 80 ? "critical" : value > 65 ? "high" : value > 45 ? "medium" : "low";
              break;
            case "market":
              value = result.confidence?.overall || 0;
              impact = value > 85 ? "critical" : value > 70 ? "high" : value > 50 ? "medium" : "low";
              break;
            case "technical":
              const techScore = result.data.seoAnalysis?.technicalSEO?.siteSpeed?.competitor || 50;
              value = techScore;
              impact = value > 80 ? "critical" : value > 65 ? "high" : value > 45 ? "medium" : "low";
              break;
            case "innovation":
              // Calculate based on content volume and freshness
              const innovationScore = Math.min(100, 
                (result.data.contentAnalysis?.contentVolume?.competitorContentCount || 0) / 10 +
                (result.data.contentAnalysis?.contentVolume?.publishingFrequency?.competitor?.weekly || 0) * 10
              );
              value = innovationScore;
              impact = value > 75 ? "critical" : value > 60 ? "high" : value > 40 ? "medium" : "low";
              break;
            default:
              value = 50;
              impact = "medium";
          }

          return {
            name: dim.name,
            key: dim.key,
            value,
            description: dim.description,
            color: dim.color,
            impact,
          };
        });

        const overallThreatLevel = dimensions.reduce((sum, d) => sum + d.value, 0) / dimensions.length;
        const category: RadarDataPoint["category"] = 
          overallThreatLevel > 80 ? "critical" :
          overallThreatLevel > 65 ? "high" :
          overallThreatLevel > 45 ? "medium" : "low";

        dataPoints.push({
          competitor: `Competitor ${index + 1}`,
          competitorId: result.competitorId,
          dimensions,
          overallThreatLevel,
          category,
        });
      });

    return dataPoints;
  }, [analysisResults]);

  // Create aggregate threat data
  const aggregateData = useMemo((): RadarDataPoint => {
    if (radarData.length === 0) {
      return {
        competitor: "Market Average",
        competitorId: "aggregate",
        dimensions: THREAT_DIMENSIONS.map(dim => ({
          name: dim.name,
          key: dim.key,
          value: 50,
          description: dim.description,
          color: dim.color,
          impact: "medium" as const,
        })),
        overallThreatLevel: 50,
        category: "medium",
      };
    }

    const aggregateDimensions = THREAT_DIMENSIONS.map(dim => {
      const avgValue = radarData.reduce((sum, data) => {
        const dimension = data.dimensions.find(d => d.key === dim.key);
        return sum + (dimension?.value || 0);
      }, 0) / radarData.length;

      const impact: ThreatDimension["impact"] = 
        avgValue > 80 ? "critical" :
        avgValue > 65 ? "high" :
        avgValue > 45 ? "medium" : "low";

      return {
        name: dim.name,
        key: dim.key,
        value: avgValue,
        description: dim.description,
        color: dim.color,
        impact,
      };
    });

    const overallThreatLevel = aggregateDimensions.reduce((sum, d) => sum + d.value, 0) / aggregateDimensions.length;

    return {
      competitor: "Market Aggregate",
      competitorId: "aggregate",
      dimensions: aggregateDimensions,
      overallThreatLevel,
      category: overallThreatLevel > 80 ? "critical" : overallThreatLevel > 65 ? "high" : overallThreatLevel > 45 ? "medium" : "low",
    };
  }, [radarData]);

  // Get filtered data based on view mode
  const displayData = useMemo(() => {
    switch (viewMode) {
      case "individual":
        return selectedCompetitor === "all" ? radarData : radarData.filter(d => d.competitorId === selectedCompetitor);
      case "top-threats":
        return radarData
          .sort((a, b) => b.overallThreatLevel - a.overallThreatLevel)
          .slice(0, 3);
      default: // aggregate
        return [aggregateData];
    }
  }, [viewMode, selectedCompetitor, radarData, aggregateData]);

  // D3.js radar chart rendering
  useEffect(() => {
    if (!svgRef.current || displayData.length === 0) return;

    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);
    
    // Clear previous content
    svg.selectAll("*").remove();

    // Dimensions and setup
    const width = 500;
    const height = 500;
    const margin = 50;
    const radius = Math.min(width, height) / 2 - margin;
    const angleSlice = (Math.PI * 2) / THREAT_DIMENSIONS.length;

    // Create main group centered
    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width/2},${height/2})`);

    // Scales
    const rScale = d3.scaleLinear()
      .domain([0, 100])
      .range([0, radius]);

    // Draw circular grid
    const levels = 5;
    for (let i = 1; i <= levels; i++) {
      const levelRadius = (radius / levels) * i;
      
      g.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", levelRadius)
        .attr("fill", "none")
        .attr("stroke", "#e5e7eb")
        .attr("stroke-width", i === levels ? 2 : 1)
        .attr("opacity", 0.5);

      // Add level labels
      g.append("text")
        .attr("x", 5)
        .attr("y", -levelRadius + 4)
        .attr("font-size", "10px")
        .attr("fill", "#9ca3af")
        .text(`${(100 / levels) * i}%`);
    }

    // Draw axis lines and labels
    THREAT_DIMENSIONS.forEach((dimension, index) => {
      const angle = angleSlice * index - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      // Axis line
      g.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", x)
        .attr("y2", y)
        .attr("stroke", "#d1d5db")
        .attr("stroke-width", 1);

      // Axis label
      const labelRadius = radius + 20;
      const labelX = Math.cos(angle) * labelRadius;
      const labelY = Math.sin(angle) * labelRadius;

      g.append("text")
        .attr("x", labelX)
        .attr("y", labelY)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", "12px")
        .attr("font-weight", "500")
        .attr("fill", dimension.color)
        .text(dimension.name)
        .call(wrap, 80);
    });

    // Draw radar areas for each data point
    displayData.forEach((dataPoint, dataIndex) => {
      // Create path for radar area
      const lineGenerator = d3.lineRadial<ThreatDimension>()
        .angle((d, i) => angleSlice * i)
        .radius(d => rScale(d.value))
        .curve(d3.curveLinearClosed);

      const areaGenerator = d3.areaRadial<ThreatDimension>()
        .angle((d, i) => angleSlice * i)
        .innerRadius(0)
        .outerRadius(d => rScale(d.value))
        .curve(d3.curveLinearClosed);

      // Get color based on threat level
      const threatColor = 
        dataPoint.category === "critical" ? "#dc2626" :
        dataPoint.category === "high" ? "#ea580c" :
        dataPoint.category === "medium" ? "#ca8a04" : "#16a34a";

      // Draw filled area
      g.append("path")
        .datum(dataPoint.dimensions)
        .attr("d", areaGenerator)
        .attr("fill", threatColor)
        .attr("opacity", displayData.length === 1 ? 0.3 : 0.15)
        .attr("stroke", "none");

      // Draw outline
      g.append("path")
        .datum(dataPoint.dimensions)
        .attr("d", lineGenerator)
        .attr("fill", "none")
        .attr("stroke", threatColor)
        .attr("stroke-width", 2)
        .attr("opacity", 0.8);

      // Draw data points
      dataPoint.dimensions.forEach((dimension, index) => {
        const angle = angleSlice * index - Math.PI / 2;
        const x = Math.cos(angle) * rScale(dimension.value);
        const y = Math.sin(angle) * rScale(dimension.value);

        g.append("circle")
          .attr("cx", x)
          .attr("cy", y)
          .attr("r", 4)
          .attr("fill", dimension.color)
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 2)
          .style("cursor", "pointer")
          .on("mouseover", function(_event) {
            tooltip
              .style("opacity", 1)
              .style("left", (d3.pointer(_event, document.body)[0] + 10) + "px")
              .style("top", (d3.pointer(_event, document.body)[1] - 10) + "px")
              .html(`
                <div class="font-semibold">${dataPoint.competitor}</div>
                <div class="text-sm text-gray-600 mb-2">${dimension.name}</div>
                <div class="text-sm space-y-1">
                  <div><strong>Threat Level:</strong> ${dimension.value.toFixed(1)}%</div>
                  <div><strong>Impact:</strong> ${dimension.impact}</div>
                  <div class="text-xs text-gray-500 mt-1">${dimension.description}</div>
                </div>
              `);

            d3.select(this)
              .transition()
              .duration(200)
              .attr("r", 6);
          })
          .on("mouseout", function(_event) {
            tooltip.style("opacity", 0);

            d3.select(this)
              .transition()
              .duration(200)
              .attr("r", 4);
          });
      });

      // Add competitor label
      if (displayData.length > 1) {
        const labelAngle = dataIndex * (Math.PI * 2 / displayData.length);
        const labelRadius = radius + 40;
        const labelX = Math.cos(labelAngle) * labelRadius;
        const labelY = Math.sin(labelAngle) * labelRadius;

        g.append("text")
          .attr("x", labelX)
          .attr("y", labelY)
          .attr("text-anchor", "middle")
          .attr("font-size", "10px")
          .attr("font-weight", "600")
          .attr("fill", threatColor)
          .text(dataPoint.competitor);
      }
    });

    // Text wrapping function
    function wrap(text: d3.Selection<SVGTextElement, unknown, null, undefined>, width: number) {
      text.each(function() {
        const textElement = d3.select(this);
        const words = textElement.text().split(/\s+/).reverse();
        let word;
        let line: string[] = [];
        let lineNumber = 0;
        const lineHeight = 1.1;
        const y = textElement.attr("y");
        const dy = parseFloat(textElement.attr("dy") || "0");
        let tspan = textElement.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");

        while ((word = words.pop())) {
          line.push(word);
          tspan.text(line.join(" "));
          const textLength = tspan.node()?.getComputedTextLength();
          if (textLength && textLength > width) {
            line.pop();
            tspan.text(line.join(" "));
            line = [word];
            tspan = textElement.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
          }
        }
      });
    }

  }, [displayData]);

  // Calculate threat summary statistics
  const threatStats = useMemo(() => {
    const criticalThreats = radarData.filter(d => d.category === "critical").length;
    const highThreats = radarData.filter(d => d.category === "high").length;
    const avgThreatLevel = radarData.reduce((sum, d) => sum + d.overallThreatLevel, 0) / radarData.length || 0;
    const criticalAlerts = alerts.filter(a => a.severity === "critical").length;

    return { criticalThreats, highThreats, avgThreatLevel, criticalAlerts };
  }, [radarData, alerts]);

  if (analysisResults.length === 0) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="py-8">
            <div className="text-muted-foreground text-center">
              No competitive analysis data available for threat assessment.
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
                <Shield className="h-5 w-5 text-red-600" />
                Threat Assessment Radar
              </CardTitle>
              <CardDescription>
                Multi-dimensional competitive threat analysis with D3.js radar visualization
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={viewMode} onValueChange={setViewMode}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VIEW_MODES.map(mode => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {viewMode === "individual" && (
                <Select value={selectedCompetitor} onValueChange={setSelectedCompetitor}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Competitors</SelectItem>
                    {radarData.map(data => (
                      <SelectItem key={data.competitorId} value={data.competitorId}>
                        {data.competitor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <div className="relative">
              <svg ref={svgRef} className="border rounded-lg bg-white" />
              <div
                ref={tooltipRef}
                className="absolute pointer-events-none bg-white border rounded-lg shadow-lg p-3 text-sm opacity-0 transition-opacity z-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Threat Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical Threats</p>
                <p className="text-2xl font-bold text-red-600">{threatStats.criticalThreats}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">High Threats</p>
                <p className="text-2xl font-bold text-orange-600">{threatStats.highThreats}</p>
              </div>
              <Zap className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Threat Level</p>
                <p className="text-2xl font-bold text-yellow-600">{Math.round(threatStats.avgThreatLevel)}%</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                <span className="text-yellow-600 font-bold text-sm">%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Alerts</p>
                <p className="text-2xl font-bold text-purple-600">{threatStats.criticalAlerts}</p>
              </div>
              <Shield className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Threat Dimensions Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Threat Assessment Dimensions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {THREAT_DIMENSIONS.map(dimension => (
              <div key={dimension.key} className="flex items-center gap-3">
                <div 
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: dimension.color }}
                />
                <div className="flex-1">
                  <span className="text-sm font-medium">{dimension.name}</span>
                  <p className="text-xs text-muted-foreground">{dimension.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Threat Level Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Threat Level Classifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="destructive">Critical (80%+)</Badge>
              <span className="text-sm text-muted-foreground">Immediate action required</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-orange-500">High (65-80%)</Badge>
              <span className="text-sm text-muted-foreground">Strategic response needed</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-yellow-500">Medium (45-65%)</Badge>
              <span className="text-sm text-muted-foreground">Monitor closely</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500">Low (&lt;45%)</Badge>
              <span className="text-sm text-muted-foreground">Manageable threat</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};