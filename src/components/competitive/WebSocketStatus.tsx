"use client";

import React from "react";
import { useCompetitiveWebSocket } from "@/hooks/useCompetitiveWebSocket";

interface WebSocketStatusProps {
  projectId: string;
  className?: string;
}

export function WebSocketStatus({
  projectId,
  className = "",
}: WebSocketStatusProps) {
  const { connectionState, reconnect, latestUpdate } =
    useCompetitiveWebSocket(projectId);

  const getStatusColor = () => {
    switch (connectionState.connectionState) {
      case "connected":
        return "bg-green-500";
      case "connecting":
        return "bg-yellow-500";
      case "error":
      case "failed":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = () => {
    switch (connectionState.connectionState) {
      case "connected":
        return "Connected";
      case "connecting":
        return "Connecting...";
      case "error":
        return "Connection Error";
      case "failed":
        return "Connection Failed";
      default:
        return "Disconnected";
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`h-2 w-2 rounded-full ${getStatusColor()}`} />
      <span className="text-sm text-gray-600">{getStatusText()}</span>

      {connectionState.connectionState === "connected" && latestUpdate && (
        <span className="text-xs text-gray-400">
          Last update: {new Date(latestUpdate.timestamp).toLocaleTimeString()}
        </span>
      )}

      {(connectionState.connectionState === "error" ||
        connectionState.connectionState === "failed") && (
        <button
          onClick={reconnect}
          className="text-xs text-blue-600 underline hover:text-blue-800"
        >
          Retry
        </button>
      )}

      {connectionState.reconnectAttempts > 0 && (
        <span className="text-xs text-gray-400">
          (Attempts: {connectionState.reconnectAttempts})
        </span>
      )}
    </div>
  );
}
