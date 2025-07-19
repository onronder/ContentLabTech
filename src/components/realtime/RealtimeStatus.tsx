/**
 * Real-Time Connection Status Component
 * Shows current connection status and allows manual reconnection
 */

"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Wifi,
  WifiOff,
  Loader2,
  RefreshCw,
  Radio,
  Clock,
  Zap,
} from "lucide-react";

interface ConnectionState {
  connected: boolean;
  connecting: boolean;
  connectionType: "websocket" | "sse" | "polling" | "none";
  error: string | null;
  lastEventId?: string;
  lastEventTimestamp?: number;
}

interface RealtimeStatusProps {
  connectionState: ConnectionState;
  onReconnect: () => void;
  eventCount?: number;
  className?: string;
  compact?: boolean;
}

export function RealtimeStatus({
  connectionState,
  onReconnect,
  eventCount = 0,
  className = "",
  compact = false,
}: RealtimeStatusProps) {
  const { connected, connecting, connectionType, error, lastEventTimestamp } =
    connectionState;

  const getStatusIcon = () => {
    if (connecting) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }

    if (connected) {
      switch (connectionType) {
        case "websocket":
          return <Zap className="h-4 w-4 text-green-500" />;
        case "sse":
          return <Radio className="h-4 w-4 text-blue-500" />;
        case "polling":
          return <Clock className="h-4 w-4 text-yellow-500" />;
        default:
          return <Wifi className="h-4 w-4 text-green-500" />;
      }
    }

    return <WifiOff className="h-4 w-4 text-red-500" />;
  };

  const getStatusText = () => {
    if (connecting) return "Connecting...";
    if (connected) {
      switch (connectionType) {
        case "websocket":
          return "WebSocket Connected";
        case "sse":
          return "Server-Sent Events";
        case "polling":
          return "Polling Fallback";
        default:
          return "Connected";
      }
    }
    return error || "Disconnected";
  };

  const getStatusColor = () => {
    if (connecting) return "secondary";
    if (connected) {
      switch (connectionType) {
        case "websocket":
          return "default";
        case "sse":
          return "secondary";
        case "polling":
          return "outline";
        default:
          return "default";
      }
    }
    return "destructive";
  };

  const formatLastEvent = () => {
    if (!lastEventTimestamp) return "No events";
    const now = Date.now();
    const diff = now - lastEventTimestamp;

    if (diff < 60000) {
      return `${Math.floor(diff / 1000)}s ago`;
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}m ago`;
    } else {
      return `${Math.floor(diff / 3600000)}h ago`;
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {getStatusIcon()}
        <Badge variant={getStatusColor() as any} className="text-xs">
          {connectionType.toUpperCase()}
        </Badge>
        {!connected && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onReconnect}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center space-x-2 text-sm font-medium">
          {getStatusIcon()}
          <span>Real-Time Connection</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant={getStatusColor() as any}>{getStatusText()}</Badge>
          {!connected && (
            <Button
              size="sm"
              variant="outline"
              onClick={onReconnect}
              disabled={connecting}
              className="h-7"
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Retry
            </Button>
          )}
        </div>

        <div className="text-muted-foreground space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Events received:</span>
            <span className="font-medium">{eventCount}</span>
          </div>
          <div className="flex justify-between">
            <span>Last event:</span>
            <span className="font-medium">{formatLastEvent()}</span>
          </div>
          {connectionType === "polling" && (
            <div className="flex justify-between">
              <span>Mode:</span>
              <span className="font-medium text-yellow-600">Fallback</span>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded border bg-red-50 p-2 text-xs text-red-600">
            {error}
          </div>
        )}

        <div className="text-muted-foreground text-xs">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Zap className="h-3 w-3 text-green-500" />
              <span>WebSocket</span>
            </div>
            <div className="flex items-center space-x-1">
              <Radio className="h-3 w-3 text-blue-500" />
              <span>SSE</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3 text-yellow-500" />
              <span>Polling</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
