import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUser,
  createClient,
  validateProjectAccess,
  createErrorResponse,
} from "@/lib/auth/session";

interface AttachmentFile {
  name: string;
  url: string;
  type: string;
  size?: number;
}

interface CollaborationRequest {
  action:
    | "get_sessions"
    | "create_session"
    | "join_session"
    | "leave_session"
    | "add_comment"
    | "update_session"
    | "get_activities"
    | "resolve_comment";
  sessionId?: string;
  projectId: string;
  params?: {
    sessionName?: string;
    description?: string;
    participants?: string[];
    analysisId?: string;
    scheduledStartTime?: string;
    scheduledEndTime?: string;
    commentText?: string;
    commentType?:
      | "general"
      | "suggestion"
      | "question"
      | "approval"
      | "concern"
      | "insight";
    parentCommentId?: string;
    mentionedUsers?: string[];
    attachments?: AttachmentFile[];
    commentId?: string;
    status?: "active" | "completed" | "cancelled" | "archived";
  };
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return createErrorResponse("Authentication required", 401);
    }

    // Parse request body
    const body: CollaborationRequest = await request.json();
    const { action, sessionId, projectId, params = {} } = body;

    if (!projectId || !action) {
      return createErrorResponse("Project ID and action are required", 400);
    }

    // Validate project access
    const hasAccess = await validateProjectAccess(projectId, "viewer");
    if (!hasAccess) {
      return createErrorResponse("Insufficient permissions", 403);
    }

    const supabase = await createClient();

    let result;

    switch (action) {
      case "get_sessions": {
        // Get collaborative sessions for the project
        const { data: sessions, error: sessionsError } = await supabase
          .from("collaborative_sessions")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false });

        if (sessionsError) {
          console.error("Error fetching sessions:", sessionsError);
          return createErrorResponse("Failed to fetch sessions", 500);
        }

        // Parse participants JSON and get user details
        const enhancedSessions = await Promise.all(
          (sessions || []).map(async session => {
            let participants: string[] = [];
            try {
              participants = Array.isArray(session.participants)
                ? session.participants
                : JSON.parse(session.participants || "[]");
            } catch (error) {
              console.error("Error parsing participants:", error);
            }

            // Get participant details from profiles table instead of auth.users
            const { data: participantUsers } = await supabase
              .from("profiles")
              .select("id, email, display_name")
              .in("id", participants);

            return {
              ...session,
              participants,
              participantUsers: participantUsers || [],
              participantCount: participants.length,
            };
          })
        );

        result = enhancedSessions;
        break;
      }

      case "create_session": {
        if (!params.sessionName) {
          return createErrorResponse("Session name is required", 400);
        }

        // Validate participants are team members
        const participants = params.participants || [user.id];
        if (!participants.includes(user.id)) {
          participants.push(user.id);
        }

        // Call the collaborative workspace Edge Function
        const { data: sessionData, error: sessionError } =
          await supabase.functions.invoke("collaborative-workspace", {
            body: {
              action: "create_session",
              projectId,
              params: {
                sessionName: params.sessionName,
                description: params.description,
                participants,
                analysisId: params.analysisId,
                scheduledStartTime: params.scheduledStartTime,
                scheduledEndTime: params.scheduledEndTime,
              },
            },
          });

        if (sessionError) {
          console.error("Error creating session:", sessionError);
          return createErrorResponse(
            "Failed to create collaborative session",
            500
          );
        }

        // Log session creation
        await supabase.from("user_events").insert({
          user_id: user.id,
          event_type: "collaboration_session_created",
          event_data: {
            project_id: projectId,
            session_id: sessionData?.result?.id,
            session_name: params.sessionName,
            participant_count: participants.length,
          },
        });

        result = sessionData?.result;
        break;
      }

      case "join_session": {
        if (!sessionId) {
          return createErrorResponse("Session ID is required", 400);
        }

        // Call the Edge Function to join session
        const { data: joinData, error: joinError } =
          await supabase.functions.invoke("collaborative-workspace", {
            body: {
              action: "join_session",
              sessionId,
              projectId,
            },
          });

        if (joinError) {
          console.error("Error joining session:", joinError);
          return createErrorResponse("Failed to join session", 500);
        }

        result = joinData?.result;
        break;
      }

      case "leave_session": {
        if (!sessionId) {
          return createErrorResponse("Session ID is required", 400);
        }

        // Call the Edge Function to leave session
        const { error: leaveError } = await supabase.functions.invoke(
          "collaborative-workspace",
          {
            body: {
              action: "leave_session",
              sessionId,
              projectId,
            },
          }
        );

        if (leaveError) {
          console.error("Error leaving session:", leaveError);
          return createErrorResponse("Failed to leave session", 500);
        }

        result = { success: true };
        break;
      }

      case "add_comment": {
        if (!sessionId || !params.commentText) {
          return createErrorResponse(
            "Session ID and comment text are required",
            400
          );
        }

        // Call the Edge Function to add comment
        const { data: commentData, error: commentError } =
          await supabase.functions.invoke("collaborative-workspace", {
            body: {
              action: "add_comment",
              sessionId,
              projectId,
              params: {
                commentText: params.commentText,
                commentType: params.commentType || "general",
                parentCommentId: params.parentCommentId,
                mentionedUsers: params.mentionedUsers || [],
                attachments: params.attachments || [],
              },
            },
          });

        if (commentError) {
          console.error("Error adding comment:", commentError);
          return createErrorResponse("Failed to add comment", 500);
        }

        result = commentData?.result;
        break;
      }

      case "resolve_comment": {
        if (!params.commentId) {
          return createErrorResponse("Comment ID is required", 400);
        }

        // Call the Edge Function to resolve comment
        const { data: resolveData, error: resolveError } =
          await supabase.functions.invoke("collaborative-workspace", {
            body: {
              action: "resolve_comment",
              sessionId,
              projectId,
              params: {
                commentId: params.commentId,
              },
            },
          });

        if (resolveError) {
          console.error("Error resolving comment:", resolveError);
          return createErrorResponse("Failed to resolve comment", 500);
        }

        result = resolveData?.result;
        break;
      }

      case "update_session": {
        if (!sessionId) {
          return createErrorResponse("Session ID is required", 400);
        }

        // Validate user can update session (creator or moderator)
        const { data: session } = await supabase
          .from("collaborative_sessions")
          .select("created_by, moderator_id")
          .eq("id", sessionId)
          .single();

        if (
          !session ||
          (session.created_by !== user.id && session.moderator_id !== user.id)
        ) {
          return createErrorResponse(
            "Insufficient permissions to update session",
            403
          );
        }

        // Update session
        const updateData: Record<string, string> = {
          updated_at: new Date().toISOString(),
        };

        if (params.description !== undefined)
          updateData["description"] = params.description;
        if (params.status) updateData["status"] = params.status;
        if (params.scheduledEndTime)
          updateData["scheduled_end_time"] = params.scheduledEndTime;

        const { data: updatedSession, error: updateError } = await supabase
          .from("collaborative_sessions")
          .update(updateData)
          .eq("id", sessionId)
          .select("*")
          .single();

        if (updateError) {
          console.error("Error updating session:", updateError);
          return createErrorResponse("Failed to update session", 500);
        }

        result = updatedSession;
        break;
      }

      case "get_activities": {
        if (!sessionId) {
          return createErrorResponse("Session ID is required", 400);
        }

        // Call the Edge Function to get activities and comments
        const { data: activitiesData, error: activitiesError } =
          await supabase.functions.invoke("collaborative-workspace", {
            body: {
              action: "get_activities",
              sessionId,
              projectId,
            },
          });

        if (activitiesError) {
          console.error("Error fetching activities:", activitiesError);
          return createErrorResponse("Failed to fetch session activities", 500);
        }

        result = activitiesData?.result || { activities: [], comments: [] };
        break;
      }

      default:
        return createErrorResponse("Invalid action specified", 400);
    }

    return NextResponse.json({
      success: true,
      action,
      sessionId,
      projectId,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("API error:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return createErrorResponse("Authentication required", 401);
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const sessionId = searchParams.get("sessionId");
    const status = searchParams.get("status"); // 'active', 'completed', etc.
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    if (!projectId) {
      return createErrorResponse("Project ID is required", 400);
    }

    // Validate project access
    const hasAccess = await validateProjectAccess(projectId, "viewer");
    if (!hasAccess) {
      return createErrorResponse("Insufficient permissions", 403);
    }

    const supabase = await createClient();

    if (sessionId) {
      // Get specific session details
      const { data: session, error: sessionError } = await supabase
        .from("collaborative_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("project_id", projectId)
        .single();

      if (sessionError || !session) {
        return createErrorResponse("Session not found", 404);
      }

      // Get session comments and activities
      const [
        { data: comments, error: commentsError },
        { data: activities, error: activitiesError },
      ] = await Promise.all([
        supabase
          .from("session_comments")
          .select("*")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true }),

        supabase
          .from("session_activities")
          .select("*")
          .eq("session_id", sessionId)
          .order("timestamp", { ascending: false })
          .limit(50),
      ]);

      if (commentsError || activitiesError) {
        console.error(
          "Error fetching session data:",
          commentsError || activitiesError
        );
        return createErrorResponse("Failed to fetch session details", 500);
      }

      // Parse participants
      let participants: string[] = [];
      try {
        participants = Array.isArray(session.participants)
          ? session.participants
          : JSON.parse(session.participants || "[]");
      } catch (error) {
        console.error("Error parsing participants:", error);
      }

      // Get participant details from profiles table
      const { data: participantUsers } = await supabase
        .from("profiles")
        .select("id, email, display_name")
        .in("id", participants);

      return NextResponse.json({
        session: {
          ...session,
          participants,
          participantUsers: participantUsers || [],
        },
        comments: comments || [],
        activities: activities || [],
        stats: {
          commentCount: comments?.length || 0,
          participantCount: participants.length,
          lastActivity:
            (activities && activities[0] && activities[0].timestamp) ||
            session.updated_at,
        },
      });
    } else {
      // Get sessions list
      let query = supabase
        .from("collaborative_sessions")
        .select(
          `
          id,
          session_name,
          description,
          status,
          participants,
          created_at,
          updated_at,
          created_by,
          moderator_id,
          analysis_id,
          scheduled_start_time,
          scheduled_end_time,
          actual_start_time,
          actual_end_time
        `
        )
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq("status", status);
      }

      const { data: sessions, error: sessionsError } = await query;

      if (sessionsError) {
        console.error("Error fetching sessions:", sessionsError);
        return createErrorResponse("Failed to fetch sessions", 500);
      }

      // Enhance sessions with participant count and recent activity
      const enhancedSessions = await Promise.all(
        (sessions || []).map(async session => {
          let participants: string[] = [];
          try {
            participants = Array.isArray(session.participants)
              ? session.participants
              : JSON.parse(session.participants || "[]");
          } catch (error) {
            console.error("Error parsing participants:", error);
          }

          // Get recent comments count
          const { count: commentCount } = await supabase
            .from("session_comments")
            .select("*", { count: "exact", head: true })
            .eq("session_id", session.id);

          return {
            ...session,
            participantCount: participants.length,
            commentCount: commentCount || 0,
            isParticipant: participants.includes(user.id),
          };
        })
      );

      // Get summary statistics
      const { data: allSessions } = await supabase
        .from("collaborative_sessions")
        .select("status, created_at")
        .eq("project_id", projectId);

      const stats = {
        total: allSessions?.length || 0,
        active: allSessions?.filter(s => s.status === "active")?.length || 0,
        completed:
          allSessions?.filter(s => s.status === "completed")?.length || 0,
        thisWeek:
          allSessions?.filter(
            s =>
              new Date(s.created_at) >
              new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          )?.length || 0,
      };

      return NextResponse.json({
        sessions: enhancedSessions,
        stats,
        filters: {
          status,
          limit,
        },
        projectId,
      });
    }
  } catch (error) {
    console.error("API error:", error);
    return createErrorResponse("Internal server error", 500);
  }
}
