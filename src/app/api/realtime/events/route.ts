/**
 * Server-Sent Events (SSE) API Route for Real-Time Updates
 * Vercel-compatible alternative to WebSocket connections
 */

import { NextRequest } from "next/server";
import {
  withApiAuth,
  validateTeamAccess,
  type AuthContext,
} from "@/lib/auth/withApiAuth-definitive";

// Keep connections alive for streaming
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RealTimeEvent {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  userId?: string;
  teamId?: string;
  projectId?: string;
}

// In-memory storage for events (in production, use Redis or a database)
const eventStore = new Map<string, RealTimeEvent[]>();
const MAX_EVENTS_PER_TEAM = 100;

export const GET = withApiAuth(
  async (request: NextRequest, { user, supabase }: AuthContext) => {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    const projectId = searchParams.get("projectId");
    const lastEventId = searchParams.get("lastEventId");

    if (!teamId) {
      return new Response("Team ID is required", { status: 400 });
    }

    // Validate team access
    const teamAccess = await validateTeamAccess(
      supabase,
      user.id,
      teamId,
      "member"
    );

    if (!teamAccess.hasAccess) {
      return new Response("Access denied", { status: 403 });
    }

    console.log("🔄 SSE Connection established", {
      userId: user.id,
      teamId,
      projectId,
      lastEventId,
    });

    // Create SSE response
    const encoder = new TextEncoder();
    let isConnectionClosed = false;

    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection event
        const connectionEvent = {
          id: `conn-${Date.now()}`,
          type: "connection",
          data: {
            message: "SSE connection established",
            userId: user.id,
            teamId,
            projectId,
          },
          timestamp: Date.now(),
        };

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(connectionEvent)}\n\n`)
        );

        // Send any pending events
        const teamEvents = eventStore.get(teamId) || [];
        const lastEventIndex = lastEventId
          ? teamEvents.findIndex(e => e.id === lastEventId)
          : -1;

        const eventsToSend = teamEvents.slice(lastEventIndex + 1);

        eventsToSend.forEach(event => {
          if (!isConnectionClosed) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
            );
          }
        });

        // Set up periodic heartbeat to keep connection alive
        const heartbeatInterval = setInterval(() => {
          if (isConnectionClosed) {
            clearInterval(heartbeatInterval);
            return;
          }

          try {
            const heartbeat = {
              id: `heartbeat-${Date.now()}`,
              type: "heartbeat",
              data: { timestamp: Date.now() },
              timestamp: Date.now(),
            };

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(heartbeat)}\n\n`)
            );
          } catch (error) {
            console.log("SSE heartbeat failed, closing connection");
            isConnectionClosed = true;
            clearInterval(heartbeatInterval);
            try {
              controller.close();
            } catch (closeError) {
              // Connection already closed
            }
          }
        }, 30000); // 30 seconds

        // Clean up on connection close
        request.signal.addEventListener("abort", () => {
          console.log("🔌 SSE Connection closed", { userId: user.id, teamId });
          isConnectionClosed = true;
          clearInterval(heartbeatInterval);
          try {
            controller.close();
          } catch (error) {
            // Connection already closed
          }
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
      },
    });
  }
);

export const POST = withApiAuth(
  async (request: NextRequest, { user, supabase }: AuthContext) => {
    try {
      const body = await request.json();
      const { teamId, projectId, type, data } = body;

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
      const event: RealTimeEvent = {
        id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
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

      console.log("📡 Real-time event broadcast", {
        eventId: event.id,
        type: event.type,
        teamId,
        projectId,
        userId: user.id,
      });

      return new Response(
        JSON.stringify({
          success: true,
          eventId: event.id,
          message: "Event broadcast successfully",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Failed to broadcast event:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to broadcast event",
          code: "BROADCAST_ERROR",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
);
