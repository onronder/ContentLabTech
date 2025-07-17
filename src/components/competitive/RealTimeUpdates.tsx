"use client";

import React, { useState } from "react";
import { useCompetitiveWebSocket } from "@/hooks/useCompetitiveWebSocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RealTimeUpdatesProps {
  projectId: string;
}

export function RealTimeUpdates({ projectId }: RealTimeUpdatesProps) {
  const {
    updates,
    latestUpdate,
    clearUpdates,
    getUpdatesByType,
    hasRecentAlerts,
    hasRecentUpdates,
  } = useCompetitiveWebSocket(projectId);

  const [showAll, setShowAll] = useState(false);
  const [filterType, setFilterType] = useState<
    "all" | "alert" | "analysis" | "metrics"
  >("all");

  const filteredUpdates =
    filterType === "all" ? updates : getUpdatesByType(filterType);

  const displayedUpdates = showAll
    ? filteredUpdates
    : filteredUpdates.slice(0, 5);

  const formatUpdateMessage = (update: any) => {
    switch (update.type) {
      case "alert":
        return `🚨 ${update.data.message || "New competitive alert"}`;
      case "analysis":
        return `📊 Analysis complete: ${update.data.analysisType || "Unknown"}`;
      case "metrics":
        return `📈 Metrics updated for ${update.data.competitorName || "competitor"}`;
      default:
        return `📢 ${update.data.message || "Competitive update"}`;
    }
  };

  const getUpdateIcon = (type: string) => {
    switch (type) {
      case "alert":
        return "🚨";
      case "analysis":
        return "📊";
      case "metrics":
        return "📈";
      default:
        return "📢";
    }
  };

  if (!hasRecentUpdates) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Real-time Updates</span>
            <div className="h-2 w-2 rounded-full bg-gray-400" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-gray-500">
            No recent updates. Real-time monitoring is active.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Real-time Updates</span>
          <div className="flex items-center space-x-2">
            {hasRecentAlerts && (
              <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            )}
            <button
              onClick={clearUpdates}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Filter buttons */}
          <div className="mb-4 flex space-x-2">
            {["all", "alert", "analysis", "metrics"].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type as any)}
                className={`rounded-full px-3 py-1 text-xs capitalize ${
                  filterType === type
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {type}
                {type !== "all" && (
                  <span className="ml-1">
                    ({getUpdatesByType(type as any).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Latest update highlight */}
          {latestUpdate && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">
                    {getUpdateIcon(latestUpdate.type)}
                  </span>
                  <span className="text-sm font-medium text-blue-800">
                    Latest: {formatUpdateMessage(latestUpdate)}
                  </span>
                </div>
                <span className="text-xs text-blue-600">
                  {new Date(latestUpdate.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          )}

          {/* Updates list */}
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {displayedUpdates.map((update, index) => (
              <div
                key={`${update.timestamp}-${index}`}
                className="flex items-center justify-between rounded-lg bg-gray-50 p-2"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{getUpdateIcon(update.type)}</span>
                  <span className="text-sm text-gray-700">
                    {formatUpdateMessage(update)}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(update.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>

          {/* Show more/less button */}
          {filteredUpdates.length > 5 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showAll
                  ? "Show less"
                  : `Show all ${filteredUpdates.length} updates`}
              </button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
