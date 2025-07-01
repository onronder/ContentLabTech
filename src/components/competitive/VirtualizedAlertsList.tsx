/**
 * Virtualized Alerts List
 * High-performance list for large competitive intelligence alert datasets
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
  AlertTriangle,
  Bell,
  Clock,
  CheckCircle,
  X,
  Eye,
  Filter,
  TrendingUp,
  Zap,
  Shield,
  Globe,
} from "lucide-react";

interface AlertData {
  id: string;
  title: string;
  description: string;
  type: "ranking_change" | "content_published" | "backlink_gained" | "strategy_shift" | "performance_change" | "market_movement" | "threat_detected" | "opportunity_identified";
  severity: "critical" | "high" | "medium" | "low" | "info";
  status: "new" | "acknowledged" | "in_progress" | "resolved" | "dismissed";
  timestamp: Date;
  competitor: {
    id: string;
    name: string;
    domain: string;
  };
  metadata: {
    source: string;
    confidence: number;
    impact: number;
    urgency: number;
    tags: string[];
  };
  actionRequired: boolean;
  isRead: boolean;
}

interface VirtualizedAlertsListProps {
  alerts: AlertData[];
  onAlertSelect?: (alert: AlertData) => void;
  onAlertAction?: (alert: AlertData, action: string) => void;
  onBulkAction?: (alertIds: string[], action: string) => void;
  className?: string;
  containerHeight?: number;
}

const ITEM_HEIGHT = 140; // Height of each alert item in pixels

const SEVERITY_COLORS = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-blue-100 text-blue-800 border-blue-200",
  info: "bg-gray-100 text-gray-800 border-gray-200",
};

const ALERT_TYPE_ICONS = {
  ranking_change: TrendingUp,
  content_published: Bell,
  backlink_gained: Globe,
  strategy_shift: Zap,
  performance_change: TrendingUp,
  market_movement: Globe,
  threat_detected: Shield,
  opportunity_identified: Eye,
};

const STATUS_COLORS = {
  new: "bg-blue-100 text-blue-800",
  acknowledged: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-purple-100 text-purple-800",
  resolved: "bg-green-100 text-green-800",
  dismissed: "bg-gray-100 text-gray-800",
};

export const VirtualizedAlertsList: React.FC<VirtualizedAlertsListProps> = ({
  alerts,
  onAlertSelect,
  onAlertAction,
  onBulkAction,
  className,
  containerHeight = 600,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("timestamp");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  // Filter and sort alerts
  const filteredAndSortedAlerts = useMemo(() => {
    let filtered = alerts.filter(alert => {
      const matchesSearch = alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           alert.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           alert.competitor.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSeverity = severityFilter === "all" || alert.severity === severityFilter;
      const matchesType = typeFilter === "all" || alert.type === typeFilter;
      const matchesStatus = statusFilter === "all" || alert.status === statusFilter;
      const matchesReadStatus = !showUnreadOnly || !alert.isRead;
      
      return matchesSearch && matchesSeverity && matchesType && matchesStatus && matchesReadStatus;
    });

    // Sort alerts
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "title":
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case "severity":
          const severityOrder = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
          aValue = severityOrder[a.severity];
          bValue = severityOrder[b.severity];
          break;
        case "timestamp":
          aValue = a.timestamp.getTime();
          bValue = b.timestamp.getTime();
          break;
        case "competitor":
          aValue = a.competitor.name.toLowerCase();
          bValue = b.competitor.name.toLowerCase();
          break;
        case "confidence":
          aValue = a.metadata.confidence;
          bValue = b.metadata.confidence;
          break;
        case "impact":
          aValue = a.metadata.impact;
          bValue = b.metadata.impact;
          break;
        default:
          aValue = a.timestamp.getTime();
          bValue = b.timestamp.getTime();
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [alerts, searchTerm, severityFilter, typeFilter, statusFilter, sortBy, sortDirection, showUnreadOnly]);

  // Handle alert selection
  const handleAlertSelect = useCallback((alertId: string, selected: boolean) => {
    setSelectedAlerts(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(alertId);
      } else {
        newSet.delete(alertId);
      }
      return newSet;
    });
  }, []);

  // Handle select all
  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedAlerts(new Set(filteredAndSortedAlerts.map(alert => alert.id)));
    } else {
      setSelectedAlerts(new Set());
    }
  }, [filteredAndSortedAlerts]);

  // Get relative time string
  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Render individual alert item
  const renderAlertItem = useCallback((alert: AlertData, index: number) => {
    const TypeIcon = ALERT_TYPE_ICONS[alert.type] || Bell;
    const isSelected = selectedAlerts.has(alert.id);
    
    return (
      <div 
        className={`mx-2 mb-2 rounded-lg border bg-white p-4 shadow-sm transition-all hover:shadow-md ${
          isSelected ? "border-blue-300 bg-blue-50" : "hover:border-blue-200"
        } ${!alert.isRead ? "border-l-4 border-l-blue-500" : ""}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => handleAlertSelect(alert.id, e.target.checked)}
              className="mt-1"
            />
            <TypeIcon className="h-5 w-5 text-gray-500 mt-0.5" />
            <div className="flex-1">
              <h3 
                className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
                onClick={() => onAlertSelect?.(alert)}
              >
                {alert.title}
              </h3>
              <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!alert.isRead && (
              <div className="h-2 w-2 rounded-full bg-blue-500" />
            )}
            <Badge className={SEVERITY_COLORS[alert.severity]}>
              {alert.severity}
            </Badge>
            <Badge className={STATUS_COLORS[alert.status]}>
              {alert.status}
            </Badge>
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
          <div>
            <span className="text-gray-500">Competitor:</span>
            <span className="ml-2 font-medium">{alert.competitor.name}</span>
          </div>
          <div>
            <span className="text-gray-500">Source:</span>
            <span className="ml-2">{alert.metadata.source}</span>
          </div>
          <div>
            <span className="text-gray-500">Confidence:</span>
            <span className="ml-2">{alert.metadata.confidence}%</span>
          </div>
          <div>
            <span className="text-gray-500">Impact:</span>
            <span className="ml-2">{alert.metadata.impact}%</span>
          </div>
        </div>

        {/* Tags */}
        {alert.metadata.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {alert.metadata.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {alert.metadata.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{alert.metadata.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {getRelativeTime(alert.timestamp)}
            </div>
            {alert.actionRequired && (
              <Badge variant="destructive" className="text-xs">
                Action Required
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onAlertAction?.(alert, alert.isRead ? "mark_unread" : "mark_read");
              }}
            >
              {alert.isRead ? "Mark Unread" : "Mark Read"}
            </Button>
            
            {alert.status === "new" && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onAlertAction?.(alert, "acknowledge");
                }}
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Acknowledge
              </Button>
            )}
            
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onAlertAction?.(alert, "dismiss");
              }}
            >
              <X className="h-3 w-3 mr-1" />
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    );
  }, [selectedAlerts, onAlertSelect, onAlertAction, handleAlertSelect]);

  return (
    <div className={`space-y-4 ${className || ""}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-red-600" />
                Competitive Alerts ({filteredAndSortedAlerts.length} of {alerts.length})
              </CardTitle>
              <CardDescription>
                High-performance virtualized view of competitive intelligence alerts
              </CardDescription>
            </div>
            
            {/* Bulk Actions */}
            {selectedAlerts.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {selectedAlerts.size} selected
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onBulkAction?.(Array.from(selectedAlerts), "mark_read");
                    setSelectedAlerts(new Set());
                  }}
                >
                  Mark Read
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onBulkAction?.(Array.from(selectedAlerts), "dismiss");
                    setSelectedAlerts(new Set());
                  }}
                >
                  Dismiss
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters and Search */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search alerts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Severity Filter */}
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="ranking_change">Ranking Change</SelectItem>
                <SelectItem value="content_published">Content Published</SelectItem>
                <SelectItem value="backlink_gained">Backlink Gained</SelectItem>
                <SelectItem value="strategy_shift">Strategy Shift</SelectItem>
                <SelectItem value="performance_change">Performance Change</SelectItem>
                <SelectItem value="market_movement">Market Movement</SelectItem>
                <SelectItem value="threat_detected">Threat Detected</SelectItem>
                <SelectItem value="opportunity_identified">Opportunity</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort By */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="timestamp">Date</SelectItem>
                <SelectItem value="severity">Severity</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="competitor">Competitor</SelectItem>
                <SelectItem value="confidence">Confidence</SelectItem>
                <SelectItem value="impact">Impact</SelectItem>
              </SelectContent>
            </Select>

            {/* Options */}
            <Button
              variant={showUnreadOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            >
              Unread Only
            </Button>
          </div>

          {/* Select All */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedAlerts.size === filteredAndSortedAlerts.length && filteredAndSortedAlerts.length > 0}
              onChange={(e) => handleSelectAll(e.target.checked)}
            />
            <span className="text-sm text-gray-600">Select all visible alerts</span>
          </div>

          {/* Virtual Scrolled List */}
          {filteredAndSortedAlerts.length > 0 ? (
            <VirtualScroll
              items={filteredAndSortedAlerts}
              itemHeight={ITEM_HEIGHT}
              containerHeight={containerHeight}
              renderItem={renderAlertItem}
              getItemKey={(alert) => alert.id}
              className="border rounded-lg bg-gray-50"
            />
          ) : (
            <div className="py-12 text-center text-gray-500">
              <Bell className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p className="text-lg font-medium">No alerts found</p>
              <p className="text-sm">Try adjusting your filters or search terms</p>
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
                <p className="text-sm font-medium text-muted-foreground">Critical Alerts</p>
                <p className="text-2xl font-bold text-red-600">
                  {filteredAndSortedAlerts.filter(a => a.severity === "critical").length}
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
                <p className="text-sm font-medium text-muted-foreground">Unread</p>
                <p className="text-2xl font-bold text-blue-600">
                  {filteredAndSortedAlerts.filter(a => !a.isRead).length}
                </p>
              </div>
              <Bell className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Action Required</p>
                <p className="text-2xl font-bold text-orange-600">
                  {filteredAndSortedAlerts.filter(a => a.actionRequired).length}
                </p>
              </div>
              <Zap className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Confidence</p>
                <p className="text-2xl font-bold text-purple-600">
                  {filteredAndSortedAlerts.length > 0 
                    ? Math.round(filteredAndSortedAlerts.reduce((sum, a) => sum + a.metadata.confidence, 0) / filteredAndSortedAlerts.length)
                    : 0}%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};