/**
 * Virtualized Competitor List
 * High-performance list for large competitive intelligence datasets
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VirtualScroll } from "@/components/ui/virtual-scroll";
import {
  Search,
  Filter,
  Globe,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
} from "lucide-react";

interface CompetitorData {
  id: string;
  name: string;
  domain: string;
  category: "direct" | "indirect" | "emerging" | "aspirational";
  priority: "critical" | "high" | "medium" | "low";
  status: "active" | "inactive" | "monitoring" | "archived";
  metrics: {
    trafficEstimate: number;
    rankingKeywords: number;
    averagePosition: number;
    visibilityScore: number;
    threatLevel: "critical" | "high" | "medium" | "low";
    lastAnalyzed: Date;
    changeIndicator: "up" | "down" | "stable";
    changeValue: number;
  };
  alerts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

interface VirtualizedCompetitorListProps {
  competitors: CompetitorData[];
  onCompetitorSelect?: (competitor: CompetitorData) => void;
  onCompetitorAction?: (competitor: CompetitorData, action: string) => void;
  className?: string;
  containerHeight?: number;
}

const ITEM_HEIGHT = 120; // Height of each competitor item in pixels

const CATEGORY_COLORS = {
  direct: "bg-red-100 text-red-800",
  indirect: "bg-yellow-100 text-yellow-800",
  emerging: "bg-blue-100 text-blue-800",
  aspirational: "bg-purple-100 text-purple-800",
};

const PRIORITY_COLORS = {
  critical: "destructive",
  high: "destructive",
  medium: "default",
  low: "secondary",
} as const;

const THREAT_COLORS = {
  critical: "text-red-600",
  high: "text-orange-600",
  medium: "text-yellow-600",
  low: "text-green-600",
};

export const VirtualizedCompetitorList: React.FC<
  VirtualizedCompetitorListProps
> = ({
  competitors,
  onCompetitorSelect,
  onCompetitorAction,
  className,
  containerHeight = 600,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Filter and sort competitors
  const filteredAndSortedCompetitors = useMemo(() => {
    const filtered = competitors.filter(competitor => {
      const matchesSearch =
        competitor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        competitor.domain.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        categoryFilter === "all" || competitor.category === categoryFilter;
      const matchesPriority =
        priorityFilter === "all" || competitor.priority === priorityFilter;

      return matchesSearch && matchesCategory && matchesPriority;
    });

    // Sort competitors
    filtered.sort((a, b) => {
      let aValue: string | number, bValue: string | number;

      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "domain":
          aValue = a.domain.toLowerCase();
          bValue = b.domain.toLowerCase();
          break;
        case "traffic":
          aValue = a.metrics.trafficEstimate;
          bValue = b.metrics.trafficEstimate;
          break;
        case "keywords":
          aValue = a.metrics.rankingKeywords;
          bValue = b.metrics.rankingKeywords;
          break;
        case "position":
          aValue = a.metrics.averagePosition;
          bValue = b.metrics.averagePosition;
          break;
        case "visibility":
          aValue = a.metrics.visibilityScore;
          bValue = b.metrics.visibilityScore;
          break;
        case "threat":
          const threatOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          aValue = threatOrder[a.metrics.threatLevel];
          bValue = threatOrder[b.metrics.threatLevel];
          break;
        case "lastAnalyzed":
          aValue = a.metrics.lastAnalyzed.getTime();
          bValue = b.metrics.lastAnalyzed.getTime();
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [
    competitors,
    searchTerm,
    categoryFilter,
    priorityFilter,
    sortBy,
    sortDirection,
  ]);

  // Get change indicator icon
  const getChangeIcon = (indicator: string, _value: number) => {
    if (indicator === "up")
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (indicator === "down")
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "inactive":
        return <Minus className="h-4 w-4 text-gray-400" />;
      case "monitoring":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "archived":
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  // Calculate total alerts for a competitor
  const getTotalAlerts = (alerts: CompetitorData["alerts"]) => {
    return alerts.critical + alerts.high + alerts.medium + alerts.low;
  };

  // Handle sort change
  const _handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDirection("asc");
    }
  };

  // Render individual competitor item
  const renderCompetitorItem = useCallback(
    (competitor: CompetitorData, _index: number) => {
      const totalAlerts = getTotalAlerts(competitor.alerts);

      return (
        <div
          className="mx-2 mb-2 cursor-pointer rounded-lg border bg-white p-4 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
          onClick={() => onCompetitorSelect?.(competitor)}
        >
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-gray-500" />
              <div>
                <h3 className="font-semibold text-gray-900">
                  {competitor.name}
                </h3>
                <p className="text-sm text-gray-500">{competitor.domain}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(competitor.status)}
              <Badge className={CATEGORY_COLORS[competitor.category]}>
                {competitor.category}
              </Badge>
              <Badge variant={PRIORITY_COLORS[competitor.priority]}>
                {competitor.priority}
              </Badge>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="mb-3 grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-xs text-gray-500">Traffic</p>
              <p className="text-sm font-semibold">
                {competitor.metrics.trafficEstimate.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Keywords</p>
              <p className="text-sm font-semibold">
                {competitor.metrics.rankingKeywords.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Avg Position</p>
              <p className="text-sm font-semibold">
                {competitor.metrics.averagePosition.toFixed(1)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Visibility</p>
              <p className="text-sm font-semibold">
                {competitor.metrics.visibilityScore}%
              </p>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Threat Level */}
              <div className="flex items-center gap-1">
                <AlertTriangle
                  className={`h-4 w-4 ${THREAT_COLORS[competitor.metrics.threatLevel]}`}
                />
                <span
                  className={`text-sm font-medium ${THREAT_COLORS[competitor.metrics.threatLevel]}`}
                >
                  {competitor.metrics.threatLevel}
                </span>
              </div>

              {/* Change Indicator */}
              <div className="flex items-center gap-1">
                {getChangeIcon(
                  competitor.metrics.changeIndicator,
                  competitor.metrics.changeValue
                )}
                <span className="text-sm text-gray-600">
                  {Math.abs(competitor.metrics.changeValue)}%
                </span>
              </div>

              {/* Total Alerts */}
              {totalAlerts > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-600">Alerts:</span>
                  <Badge variant="outline" className="text-xs">
                    {totalAlerts}
                  </Badge>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={e => {
                  e.stopPropagation();
                  onCompetitorAction?.(competitor, "analyze");
                }}
              >
                <BarChart3 className="mr-1 h-3 w-3" />
                Analyze
              </Button>
              <span className="text-xs text-gray-500">
                {competitor.metrics.lastAnalyzed.toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      );
    },
    [onCompetitorSelect, onCompetitorAction]
  );

  return (
    <div className={`space-y-4 ${className || ""}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-600" />
            Competitor Intelligence ({
              filteredAndSortedCompetitors.length
            } of {competitors.length})
          </CardTitle>
          <CardDescription>
            High-performance virtualized view of competitive intelligence data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters and Search */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="min-w-64 flex-1">
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                <Input
                  placeholder="Search competitors..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="direct">Direct</SelectItem>
                <SelectItem value="indirect">Indirect</SelectItem>
                <SelectItem value="emerging">Emerging</SelectItem>
                <SelectItem value="aspirational">Aspirational</SelectItem>
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort By */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="domain">Domain</SelectItem>
                <SelectItem value="traffic">Traffic</SelectItem>
                <SelectItem value="keywords">Keywords</SelectItem>
                <SelectItem value="position">Position</SelectItem>
                <SelectItem value="visibility">Visibility</SelectItem>
                <SelectItem value="threat">Threat Level</SelectItem>
                <SelectItem value="lastAnalyzed">Last Analyzed</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Direction */}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setSortDirection(prev => (prev === "asc" ? "desc" : "asc"))
              }
            >
              {sortDirection === "asc" ? "↑" : "↓"}
            </Button>
          </div>

          {/* Virtual Scrolled List */}
          {filteredAndSortedCompetitors.length > 0 ? (
            <VirtualScroll
              items={filteredAndSortedCompetitors}
              itemHeight={ITEM_HEIGHT}
              containerHeight={containerHeight}
              renderItem={renderCompetitorItem}
              getItemKey={competitor => competitor.id}
              className="rounded-lg border bg-gray-50"
            />
          ) : (
            <div className="py-12 text-center text-gray-500">
              <Globe className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p className="text-lg font-medium">No competitors found</p>
              <p className="text-sm">
                Try adjusting your filters or search terms
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Total Showing
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {filteredAndSortedCompetitors.length}
                </p>
              </div>
              <Filter className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  High Priority
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {
                    filteredAndSortedCompetitors.filter(
                      c => c.priority === "critical" || c.priority === "high"
                    ).length
                  }
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Active
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {
                    filteredAndSortedCompetitors.filter(
                      c => c.status === "active"
                    ).length
                  }
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Avg Visibility
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {filteredAndSortedCompetitors.length > 0
                    ? Math.round(
                        filteredAndSortedCompetitors.reduce(
                          (sum, c) => sum + c.metrics.visibilityScore,
                          0
                        ) / filteredAndSortedCompetitors.length
                      )
                    : 0}
                  %
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
