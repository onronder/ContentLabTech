/**
 * Polling API Route for Real-Time Updates
 * Fallback mechanism for when SSE is not supported
 */

import { NextRequest } from "next/server";
import {
  withApiAuth,
  createSuccessResponse,
  validateTeamAccess,
  type AuthContext,
} from "@/lib/auth/withApiAuth-definitive";

interface PollingEvent {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  userId?: string;
  teamId?: string;
  projectId?: string;
}

// In-memory storage for events (in production, use Redis or a database)
const eventStore = new Map<string, PollingEvent[]>();
const MAX_EVENTS_PER_TEAM = 100;
const MAX_POLLING_EVENTS = 50;

export const GET = withApiAuth(
  async (request: NextRequest, { user, supabase }: AuthContext) => {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    const projectId = searchParams.get("projectId");
    const since = searchParams.get("since");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!teamId) {
      return new Response(
        JSON.stringify({
          error: "Team ID is required",
          code: "INVALID_REQUEST",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate team access
    const teamAccess = await validateTeamAccess(
      supabase,
      user.id,
      teamId,
      "member"
    );

    if (!teamAccess.hasAccess) {
      return new Response(
        JSON.stringify({
          error: "Access denied",
          code: "TEAM_ACCESS_DENIED",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get events for the team
    const teamEvents = eventStore.get(teamId) || [];
    const sinceTimestamp = since ? parseInt(since) : 0;

    // Filter events based on timestamp and project
    const filteredEvents = teamEvents.filter(event => {
      const isAfterSince = event.timestamp > sinceTimestamp;
      const isProjectMatch = !projectId || event.projectId === projectId;
      return isAfterSince && isProjectMatch;
    });

    // Limit the number of events returned
    const limitedEvents = filteredEvents
      .slice(-Math.min(limit, MAX_POLLING_EVENTS))
      .sort((a, b) => a.timestamp - b.timestamp);

    console.log("📊 Polling request", {
      userId: user.id,
      teamId,
      projectId,
      since: sinceTimestamp,
      eventsFound: limitedEvents.length,
      totalEvents: teamEvents.length,
    });

    return createSuccessResponse({
      events: limitedEvents,
      count: limitedEvents.length,
      timestamp: Date.now(),
      hasMore: filteredEvents.length > limitedEvents.length,
      nextSince:
        limitedEvents.length > 0
          ? (limitedEvents[limitedEvents.length - 1]?.timestamp?.toString() ??
            since)
          : since,
    });
  }
);

export const POST = withApiAuth(
  async (request: NextRequest, { user, supabase }: AuthContext) => {
    try {
      const body = await request.json();
      const { teamId, projectId, type, data, priority = "normal" } = body;

      if (!teamId || !type) {
        return new Response(
          JSON.stringify({
            error: "Team ID and event type are required",
            code: "INVALID_REQUEST",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Validate team access
      const teamAccess = await validateTeamAccess(
        supabase,
        user.id,
        teamId,
        "member"
      );

      if (!teamAccess.hasAccess) {
        return new Response(
          JSON.stringify({
            error: "Access denied",
            code: "TEAM_ACCESS_DENIED",
          }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }

      // Create new event
      const event: PollingEvent = {
        id: `poll-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        data: {
          ...data,
          priority,
          source: "polling",
        },
        timestamp: Date.now(),
        userId: user.id,
        teamId,
        projectId,
      };

      // Store event
      const teamEvents = eventStore.get(teamId) || [];
      teamEvents.push(event);

      // Keep only the latest events to prevent memory leaks
      if (teamEvents.length > MAX_EVENTS_PER_TEAM) {
        teamEvents.splice(0, teamEvents.length - MAX_EVENTS_PER_TEAM);
      }

      eventStore.set(teamId, teamEvents);

      console.log("📡 Polling event created", {
        eventId: event.id,
        type: event.type,
        teamId,
        projectId,
        userId: user.id,
        priority,
      });

      return createSuccessResponse(
        {
          eventId: event.id,
          message: "Event created successfully",
          timestamp: event.timestamp,
        },
        201
      );
    } catch (error) {
      console.error("Failed to create polling event:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to create event",
          code: "CREATE_EVENT_ERROR",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
);
