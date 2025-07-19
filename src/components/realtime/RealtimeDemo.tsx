/**
 * Real-Time Features Demo Component
 * Demonstrates WebSocket, SSE, and Polling fallback mechanisms
 */

"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Send,
  Trash2,
  Play,
  Settings,
  MessageSquare,
  Activity,
  Bell,
  BarChart3,
} from "lucide-react";
import { useRealtimeConnection } from "@/hooks/useRealtimeConnection";
import { RealtimeStatus } from "./RealtimeStatus";
import { useAuth } from "@/lib/auth/context";

interface RealtimeDemoProps {
  teamId: string;
  projectId?: string;
}

const EVENT_TYPES = [
  { value: "competitive-update", label: "Competitive Update", icon: BarChart3 },
  { value: "competitor-alert", label: "Competitor Alert", icon: Bell },
  { value: "analysis-complete", label: "Analysis Complete", icon: Activity },
  {
    value: "system-notification",
    label: "System Notification",
    icon: MessageSquare,
  },
  {
    value: "user-notification",
    label: "User Notification",
    icon: MessageSquare,
  },
];

export function RealtimeDemo({ teamId, projectId }: RealtimeDemoProps) {
  const { user } = useAuth();
  const [eventType, setEventType] = useState("competitive-update");
  const [eventMessage, setEventMessage] = useState("");
  const [eventData, setEventData] = useState("{}");
  const [isSending, setIsSending] = useState(false);

  const {
    connectionState,
    events,
    lastEvent,
    connect,
    disconnect,
    sendEvent,
    clearEvents,
  } = useRealtimeConnection({
    teamId,
    projectId,
    userId: user?.id,
  });

  const handleSendEvent = async () => {
    if (!eventType || !eventMessage) return;

    setIsSending(true);
    try {
      let parsedData = {};
      try {
        parsedData = JSON.parse(eventData || "{}");
      } catch (error) {
        console.warn("Invalid JSON data, using empty object");
      }

      const success = await sendEvent(eventType, {
        message: eventMessage,
        ...parsedData,
        demo: true,
        timestamp: new Date().toISOString(),
      });

      if (success) {
        setEventMessage("");
        setEventData("{}");
      }
    } catch (error) {
      console.error("Failed to send event:", error);
    } finally {
      setIsSending(false);
    }
  };

  const sendTestEvent = async (type: string) => {
    const testEvents = {
      "competitive-update": {
        message: "Competitor ranking changed",
        competitorName: "Example Competitor",
        oldRanking: 5,
        newRanking: 3,
        keyword: "content marketing",
      },
      "competitor-alert": {
        message: "New competitor detected",
        competitorName: "New Competitor Corp",
        domain: "newcompetitor.com",
        alertType: "new_competitor",
      },
      "analysis-complete": {
        message: "SEO analysis completed",
        analysisType: "competitive_seo",
        score: 85,
        improvements: ["Meta descriptions", "Internal linking"],
      },
      "system-notification": {
        message: "System maintenance scheduled",
        scheduledTime: "2024-01-15T02:00:00Z",
        estimatedDuration: "30 minutes",
      },
      "user-notification": {
        message: "Welcome to the real-time demo!",
        actionRequired: false,
      },
    };

    await sendEvent(type, testEvents[type as keyof typeof testEvents] || {});
  };

  const formatEventTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getEventIcon = (type: string) => {
    const eventType = EVENT_TYPES.find(e => e.value === type);
    if (eventType) {
      const Icon = eventType.icon;
      return <Icon className="h-4 w-4" />;
    }
    return <MessageSquare className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <RealtimeStatus
        connectionState={connectionState}
        onReconnect={connect}
        eventCount={events.length}
      />

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Real-Time Test Controls</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Controls */}
          <div className="flex space-x-2">
            <Button
              onClick={connect}
              disabled={connectionState.connected || connectionState.connecting}
              variant="outline"
              size="sm"
            >
              <Play className="mr-1 h-4 w-4" />
              Connect
            </Button>
            <Button
              onClick={disconnect}
              disabled={!connectionState.connected}
              variant="outline"
              size="sm"
            >
              Disconnect
            </Button>
            <Button onClick={clearEvents} variant="outline" size="sm">
              <Trash2 className="mr-1 h-4 w-4" />
              Clear Events
            </Button>
          </div>

          {/* Quick Test Events */}
          <div>
            <Label className="text-sm font-medium">Quick Test Events</Label>
            <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
              {EVENT_TYPES.map(type => (
                <Button
                  key={type.value}
                  onClick={() => sendTestEvent(type.value)}
                  disabled={!connectionState.connected}
                  variant="outline"
                  size="sm"
                  className="justify-start"
                >
                  <type.icon className="mr-1 h-3 w-3" />
                  {type.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Event Form */}
          <div className="space-y-3 border-t pt-4">
            <Label className="text-sm font-medium">Send Custom Event</Label>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label htmlFor="eventType" className="text-xs">
                  Event Type
                </Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center space-x-2">
                          <type.icon className="h-3 w-3" />
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="eventMessage" className="text-xs">
                  Message
                </Label>
                <Input
                  id="eventMessage"
                  value={eventMessage}
                  onChange={e => setEventMessage(e.target.value)}
                  placeholder="Enter event message..."
                  className="text-sm"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="eventData" className="text-xs">
                Custom Data (JSON)
              </Label>
              <Textarea
                id="eventData"
                value={eventData}
                onChange={e => setEventData(e.target.value)}
                placeholder='{"key": "value"}'
                className="font-mono text-xs"
                rows={3}
              />
            </div>

            <Button
              onClick={handleSendEvent}
              disabled={
                !connectionState.connected ||
                !eventType ||
                !eventMessage ||
                isSending
              }
              className="w-full"
            >
              <Send className="mr-2 h-4 w-4" />
              {isSending ? "Sending..." : "Send Event"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Event Stream */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Live Event Stream</span>
              <Badge variant="secondary">{events.length} events</Badge>
            </div>
            {lastEvent && (
              <Badge variant="outline" className="text-xs">
                Last: {formatEventTime(lastEvent.timestamp)}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {events.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center">
                <Activity className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>No events received yet</p>
                <p className="text-xs">
                  Send a test event to see real-time updates
                </p>
              </div>
            ) : (
              events
                .slice()
                .reverse()
                .map(event => (
                  <div
                    key={event.id}
                    className="bg-muted/50 flex items-start space-x-3 rounded-lg border p-3"
                  >
                    <div className="mt-0.5">{getEventIcon(event.type)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {event.type}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          {formatEventTime(event.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm font-medium">
                        {event.data?.message || "Event received"}
                      </p>
                      {Object.keys(event.data || {}).length > 1 && (
                        <details className="mt-2">
                          <summary className="text-muted-foreground cursor-pointer text-xs">
                            View data
                          </summary>
                          <pre className="bg-background mt-1 overflow-x-auto rounded border p-2 text-xs">
                            {JSON.stringify(event.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
