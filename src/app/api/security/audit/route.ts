/**
 * Security Audit API
 * Provides security monitoring and audit data for administrators
 * RESTRICTED: Admin access only
 */

import { NextRequest } from "next/server";
import {
  withApiAuth,
  createSuccessResponse,
  getSecurityAuditEvents,
  type AuthContext,
} from "@/lib/auth/withApiAuth-definitive";
import { validateQueryParams, securitySchemas } from "@/lib/security/validation";
import { z } from "zod";

// Query parameter schema
const auditQuerySchema = z.object({
  limit: securitySchemas.number.optional().default(50),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  eventType: z.string().max(100).optional(),
  startDate: securitySchemas.dateString.optional(),
  endDate: securitySchemas.dateString.optional(),
});

export const GET = withApiAuth(
  async (request: NextRequest, context: AuthContext) => {
    try {
      // Validate query parameters
      const { searchParams } = new URL(request.url);
      const queryValidation = validateQueryParams(searchParams, auditQuerySchema);
      
      if (!queryValidation.success) {
        return new Response(
          JSON.stringify({
            error: "Invalid query parameters",
            details: queryValidation.details,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const { limit, severity, eventType, startDate, endDate } = queryValidation.data;

      // Check if user has admin access to security data
      const { data: userProfile, error: profileError } = await context.supabase
        .from("team_members")
        .select("role")
        .eq("user_id", context.user.id)
        .in("role", ["owner", "admin"])
        .limit(1);

      if (profileError || !userProfile || userProfile.length === 0) {
        return new Response(
          JSON.stringify({
            error: "Insufficient permissions to access security audit data",
            code: "INSUFFICIENT_PERMISSIONS",
          }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }

      // Get security audit events from the authentication wrapper
      const auditEvents = getSecurityAuditEvents(limit);

      // Filter events based on query parameters
      let filteredEvents = auditEvents;

      if (severity) {
        filteredEvents = filteredEvents.filter(event => 
          event.details?.severity === severity
        );
      }

      if (eventType) {
        filteredEvents = filteredEvents.filter(event => 
          event.event.toLowerCase().includes(eventType.toLowerCase())
        );
      }

      if (startDate) {
        const start = new Date(startDate);
        filteredEvents = filteredEvents.filter(event => 
          new Date(event.timestamp) >= start
        );
      }

      if (endDate) {
        const end = new Date(endDate);
        filteredEvents = filteredEvents.filter(event => 
          new Date(event.timestamp) <= end
        );
      }

      // Get database audit events as well
      const { data: dbAuditEvents, error: dbError } = await context.supabase
        .from("security_audit_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(limit);

      if (dbError) {
        console.error("Error fetching database audit logs:", dbError);
      }

      // Combine and format events
      const combinedEvents = [
        ...filteredEvents.map(event => ({
          id: `mem_${event.timestamp}_${event.requestId}`,
          timestamp: event.timestamp,
          event_type: event.event,
          user_id: event.userId,
          ip_address: event.clientIp,
          user_agent: event.userAgent,
          endpoint: event.endpoint,
          details: event.details,
          source: "memory",
        })),
        ...(dbAuditEvents || []).map((event: any) => ({
          ...event,
          source: "database",
        })),
      ]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);

      // Generate security statistics
      const stats = {
        totalEvents: combinedEvents.length,
        severityBreakdown: {
          critical: combinedEvents.filter(e => e.details?.severity === "critical").length,
          high: combinedEvents.filter(e => e.details?.severity === "high").length,
          medium: combinedEvents.filter(e => e.details?.severity === "medium").length,
          low: combinedEvents.filter(e => e.details?.severity === "low").length,
        },
        topEvents: getTopEventTypes(combinedEvents),
        timeRange: {
          start: combinedEvents.length > 0 ? combinedEvents[combinedEvents.length - 1].timestamp : null,
          end: combinedEvents.length > 0 ? combinedEvents[0].timestamp : null,
        },
      };

      return createSuccessResponse({
        events: combinedEvents,
        statistics: stats,
        filters: {
          limit,
          severity,
          eventType,
          startDate,
          endDate,
        },
      });

    } catch (error) {
      console.error("Security audit API error:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to retrieve security audit data",
          code: "AUDIT_ERROR",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
  {
    requiredRole: "admin",
    validateInput: true,
  }
);

/**
 * Get top event types for statistics
 */
function getTopEventTypes(events: any[]): Array<{ type: string; count: number }> {
  const eventCounts = events.reduce((acc, event) => {
    const type = event.event_type || "unknown";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(eventCounts)
    .map(([type, count]) => ({ type, count: count as number }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

// Security monitoring endpoint
export const POST = withApiAuth(
  async (request: NextRequest, context: AuthContext) => {
    try {
      // Only allow manual security event logging by admins
      const { data: userProfile, error: profileError } = await context.supabase
        .from("team_members")
        .select("role")
        .eq("user_id", context.user.id)
        .in("role", ["owner", "admin"])
        .limit(1);

      if (profileError || !userProfile || userProfile.length === 0) {
        return new Response(
          JSON.stringify({
            error: "Insufficient permissions to log security events",
            code: "INSUFFICIENT_PERMISSIONS",
          }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }

      const body = await request.json();
      const eventSchema = z.object({
        eventType: z.string().min(1).max(100),
        severity: z.enum(["low", "medium", "high", "critical"]),
        details: z.record(z.any()).optional(),
        endpoint: z.string().max(255).optional(),
      });

      const validation = eventSchema.safeParse(body);
      if (!validation.success) {
        return new Response(
          JSON.stringify({
            error: "Invalid event data",
            details: validation.error.format(),
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const { eventType, severity, details, endpoint } = validation.data;

      // Log to database
      const { data: logEntry, error: logError } = await context.supabase
        .from("security_audit_logs")
        .insert({
          event_type: eventType,
          user_id: context.user.id,
          ip_address: context.clientIp,
          user_agent: context.userAgent,
          endpoint: endpoint || request.url,
          request_id: context.requestId,
          details: details || {},
          severity,
        })
        .select()
        .single();

      if (logError) {
        console.error("Failed to log security event:", logError);
        return new Response(
          JSON.stringify({
            error: "Failed to log security event",
            code: "LOG_ERROR",
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      return createSuccessResponse({
        message: "Security event logged successfully",
        eventId: logEntry.id,
        timestamp: logEntry.timestamp,
      });

    } catch (error) {
      console.error("Security event logging error:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to log security event",
          code: "LOG_ERROR",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
  {
    requiredRole: "admin",
    validateInput: true,
  }
);