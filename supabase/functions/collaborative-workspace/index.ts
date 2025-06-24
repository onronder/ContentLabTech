/**
 * Collaborative Workspace Edge Function
 * Real-time team collaboration for content analysis and strategy
 */

import {
  handleCors,
  createResponse,
  createErrorResponse,
} from "../_shared/cors.ts";
import { getAuthUser, requireAuth } from "../_shared/auth.ts";
import {
  createDatabaseClient,
  getUserTeamAccess,
} from "../_shared/database.ts";

interface CollaborativeWorkspaceRequest {
  action: 'create_session' | 'join_session' | 'leave_session' | 'add_comment' | 
          'update_session' | 'get_sessions' | 'get_activities' | 'resolve_comment';
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
    commentType?: 'general' | 'suggestion' | 'question' | 'approval' | 'concern' | 'insight';
    parentCommentId?: string;
    mentionedUsers?: string[];
    attachments?: any[];
    commentId?: string;
  };
}

interface CollaborativeSession {
  id: string;
  analysisId?: string;
  projectId: string;
  sessionName: string;
  description?: string;
  participants: string[];
  sessionConfig: any;
  status: 'active' | 'completed' | 'cancelled' | 'archived';
  createdBy: string;
  moderatorId?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  createdAt: string;
  updatedAt: string;
}

interface SessionComment {
  id: string;
  sessionId: string;
  userId: string;
  commentText: string;
  commentType: string;
  parentCommentId?: string;
  mentionedUsers: string[];
  attachments: any[];
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email: string;
    fullName?: string;
  };
  replies?: SessionComment[];
}

interface SessionActivity {
  id: string;
  sessionId: string;
  userId: string;
  activityType: string;
  activityData: any;
  timestamp: string;
  user?: {
    id: string;
    email: string;
    fullName?: string;
  };
}

/**
 * Create a new collaborative session
 */
async function createCollaborativeSession(
  supabase: any,
  projectId: string,
  userId: string,
  params: any
): Promise<CollaborativeSession> {
  try {
    const sessionData = {
      project_id: projectId,
      session_name: params.sessionName,
      description: params.description,
      participants: JSON.stringify(params.participants || [userId]),
      session_config: JSON.stringify({}),
      status: 'active',
      created_by: userId,
      moderator_id: userId,
      analysis_id: params.analysisId,
      scheduled_start_time: params.scheduledStartTime,
      scheduled_end_time: params.scheduledEndTime,
    };

    const { data: session, error } = await supabase
      .from('collaborative_sessions')
      .insert(sessionData)
      .select('*')
      .single();

    if (error) {
      console.error('Error creating session:', error);
      throw new Error('Failed to create collaborative session');
    }

    // Log session creation activity
    await logSessionActivity(supabase, session.id, userId, 'session_created', {
      sessionName: params.sessionName,
      participantCount: params.participants?.length || 1,
    });

    // Send notifications to participants
    await notifyParticipants(supabase, session.id, params.participants || [], 'session_created', {
      sessionName: params.sessionName,
      createdBy: userId,
    });

    return formatSession(session);
  } catch (error) {
    console.error('Error in createCollaborativeSession:', error);
    throw error;
  }
}

/**
 * Join an existing collaborative session
 */
async function joinCollaborativeSession(
  supabase: any,
  sessionId: string,
  userId: string
): Promise<CollaborativeSession> {
  try {
    // Get current session
    const { data: session, error: sessionError } = await supabase
      .from('collaborative_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      throw new Error('Session not found');
    }

    // Parse participants
    let participants: string[] = [];
    try {
      participants = JSON.parse(session.participants || '[]');
    } catch {
      participants = [];
    }

    // Add user if not already a participant
    if (!participants.includes(userId)) {
      participants.push(userId);

      const { error: updateError } = await supabase
        .from('collaborative_sessions')
        .update({
          participants: JSON.stringify(participants),
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (updateError) {
        throw new Error('Failed to join session');
      }
    }

    // Log join activity
    await logSessionActivity(supabase, sessionId, userId, 'user_joined', {});

    // Get updated session
    const { data: updatedSession } = await supabase
      .from('collaborative_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    return formatSession(updatedSession);
  } catch (error) {
    console.error('Error in joinCollaborativeSession:', error);
    throw error;
  }
}

/**
 * Leave a collaborative session
 */
async function leaveCollaborativeSession(
  supabase: any,
  sessionId: string,
  userId: string
): Promise<void> {
  try {
    // Get current session
    const { data: session } = await supabase
      .from('collaborative_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (!session) {
      throw new Error('Session not found');
    }

    // Parse participants
    let participants: string[] = [];
    try {
      participants = JSON.parse(session.participants || '[]');
    } catch {
      participants = [];
    }

    // Remove user from participants
    participants = participants.filter(id => id !== userId);

    // Update session
    const { error } = await supabase
      .from('collaborative_sessions')
      .update({
        participants: JSON.stringify(participants),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) {
      throw new Error('Failed to leave session');
    }

    // Log leave activity
    await logSessionActivity(supabase, sessionId, userId, 'user_left', {});
  } catch (error) {
    console.error('Error in leaveCollaborativeSession:', error);
    throw error;
  }
}

/**
 * Add a comment to a collaborative session
 */
async function addSessionComment(
  supabase: any,
  sessionId: string,
  userId: string,
  params: any
): Promise<SessionComment> {
  try {
    const commentData = {
      session_id: sessionId,
      user_id: userId,
      comment_text: params.commentText,
      comment_type: params.commentType || 'general',
      parent_comment_id: params.parentCommentId,
      mentioned_users: JSON.stringify(params.mentionedUsers || []),
      attachments: JSON.stringify(params.attachments || []),
    };

    const { data: comment, error } = await supabase
      .from('session_comments')
      .insert(commentData)
      .select(`
        *,
        user:auth.users!user_id (
          id,
          email,
          raw_user_meta_data
        )
      `)
      .single();

    if (error) {
      console.error('Error adding comment:', error);
      throw new Error('Failed to add comment');
    }

    // Log comment activity
    await logSessionActivity(supabase, sessionId, userId, 'comment_added', {
      commentType: params.commentType,
      hasAttachments: (params.attachments || []).length > 0,
      mentionCount: (params.mentionedUsers || []).length,
    });

    // Notify mentioned users
    if (params.mentionedUsers && params.mentionedUsers.length > 0) {
      await notifyParticipants(supabase, sessionId, params.mentionedUsers, 'user_mentioned', {
        commentText: params.commentText,
        mentionedBy: userId,
      });
    }

    return formatComment(comment);
  } catch (error) {
    console.error('Error in addSessionComment:', error);
    throw error;
  }
}

/**
 * Resolve a comment
 */
async function resolveComment(
  supabase: any,
  commentId: string,
  userId: string
): Promise<SessionComment> {
  try {
    const { data: comment, error } = await supabase
      .from('session_comments')
      .update({
        is_resolved: true,
        resolved_by: userId,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .select(`
        *,
        user:auth.users!user_id (
          id,
          email,
          raw_user_meta_data
        )
      `)
      .single();

    if (error) {
      throw new Error('Failed to resolve comment');
    }

    // Log resolution activity
    await logSessionActivity(supabase, comment.session_id, userId, 'comment_resolved', {
      commentId: commentId,
    });

    return formatComment(comment);
  } catch (error) {
    console.error('Error in resolveComment:', error);
    throw error;
  }
}

/**
 * Get collaborative sessions for a project
 */
async function getProjectSessions(
  supabase: any,
  projectId: string,
  userId: string
): Promise<CollaborativeSession[]> {
  try {
    const { data: sessions, error } = await supabase
      .from('collaborative_sessions')
      .select('*')
      .eq('project_id', projectId)
      .or(`created_by.eq.${userId},participants.cs.["${userId}"]`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting sessions:', error);
      return [];
    }

    return (sessions || []).map(formatSession);
  } catch (error) {
    console.error('Error in getProjectSessions:', error);
    return [];
  }
}

/**
 * Get session comments with replies
 */
async function getSessionComments(
  supabase: any,
  sessionId: string
): Promise<SessionComment[]> {
  try {
    const { data: comments, error } = await supabase
      .from('session_comments')
      .select(`
        *,
        user:auth.users!user_id (
          id,
          email,
          raw_user_meta_data
        )
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error getting comments:', error);
      return [];
    }

    // Organize comments into threads
    const formattedComments = (comments || []).map(formatComment);
    const threaded = organizeCommentsIntoThreads(formattedComments);

    return threaded;
  } catch (error) {
    console.error('Error in getSessionComments:', error);
    return [];
  }
}

/**
 * Get session activities
 */
async function getSessionActivities(
  supabase: any,
  sessionId: string,
  limit: number = 50
): Promise<SessionActivity[]> {
  try {
    const { data: activities, error } = await supabase
      .from('session_activities')
      .select(`
        *,
        user:auth.users!user_id (
          id,
          email,
          raw_user_meta_data
        )
      `)
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting activities:', error);
      return [];
    }

    return (activities || []).map(formatActivity);
  } catch (error) {
    console.error('Error in getSessionActivities:', error);
    return [];
  }
}

/**
 * Log session activity
 */
async function logSessionActivity(
  supabase: any,
  sessionId: string,
  userId: string,
  activityType: string,
  activityData: any
): Promise<void> {
  try {
    await supabase
      .from('session_activities')
      .insert({
        session_id: sessionId,
        user_id: userId,
        activity_type: activityType,
        activity_data: JSON.stringify(activityData),
      });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

/**
 * Notify participants
 */
async function notifyParticipants(
  supabase: any,
  sessionId: string,
  participantIds: string[],
  notificationType: string,
  data: any
): Promise<void> {
  try {
    // This would integrate with your notification system
    console.log(`Notifying ${participantIds.length} participants about ${notificationType}`);
    
    // Log notification activity
    await logSessionActivity(supabase, sessionId, 'system', 'notification_sent', {
      type: notificationType,
      recipientCount: participantIds.length,
      data,
    });
  } catch (error) {
    console.error('Error sending notifications:', error);
  }
}

/**
 * Format session data
 */
function formatSession(session: any): CollaborativeSession {
  let participants: string[] = [];
  try {
    participants = JSON.parse(session.participants || '[]');
  } catch {
    participants = [];
  }

  let sessionConfig: any = {};
  try {
    sessionConfig = JSON.parse(session.session_config || '{}');
  } catch {
    sessionConfig = {};
  }

  return {
    id: session.id,
    analysisId: session.analysis_id,
    projectId: session.project_id,
    sessionName: session.session_name,
    description: session.description,
    participants,
    sessionConfig,
    status: session.status,
    createdBy: session.created_by,
    moderatorId: session.moderator_id,
    scheduledStartTime: session.scheduled_start_time,
    scheduledEndTime: session.scheduled_end_time,
    actualStartTime: session.actual_start_time,
    actualEndTime: session.actual_end_time,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
  };
}

/**
 * Format comment data
 */
function formatComment(comment: any): SessionComment {
  let mentionedUsers: string[] = [];
  try {
    mentionedUsers = JSON.parse(comment.mentioned_users || '[]');
  } catch {
    mentionedUsers = [];
  }

  let attachments: any[] = [];
  try {
    attachments = JSON.parse(comment.attachments || '[]');
  } catch {
    attachments = [];
  }

  return {
    id: comment.id,
    sessionId: comment.session_id,
    userId: comment.user_id,
    commentText: comment.comment_text,
    commentType: comment.comment_type,
    parentCommentId: comment.parent_comment_id,
    mentionedUsers,
    attachments,
    isResolved: comment.is_resolved,
    resolvedBy: comment.resolved_by,
    resolvedAt: comment.resolved_at,
    createdAt: comment.created_at,
    updatedAt: comment.updated_at,
    user: comment.user ? {
      id: comment.user.id,
      email: comment.user.email,
      fullName: comment.user.raw_user_meta_data?.full_name,
    } : undefined,
  };
}

/**
 * Format activity data
 */
function formatActivity(activity: any): SessionActivity {
  let activityData: any = {};
  try {
    activityData = JSON.parse(activity.activity_data || '{}');
  } catch {
    activityData = {};
  }

  return {
    id: activity.id,
    sessionId: activity.session_id,
    userId: activity.user_id,
    activityType: activity.activity_type,
    activityData,
    timestamp: activity.timestamp,
    user: activity.user ? {
      id: activity.user.id,
      email: activity.user.email,
      fullName: activity.user.raw_user_meta_data?.full_name,
    } : undefined,
  };
}

/**
 * Organize comments into threaded structure
 */
function organizeCommentsIntoThreads(comments: SessionComment[]): SessionComment[] {
  const commentMap = new Map<string, SessionComment>();
  const rootComments: SessionComment[] = [];

  // First pass: create map of all comments
  comments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });

  // Second pass: organize into threads
  comments.forEach(comment => {
    const formattedComment = commentMap.get(comment.id)!;
    
    if (comment.parentCommentId) {
      const parent = commentMap.get(comment.parentCommentId);
      if (parent) {
        parent.replies!.push(formattedComment);
      }
    } else {
      rootComments.push(formattedComment);
    }
  });

  return rootComments;
}

Deno.serve(async req => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Authenticate user
    const user = await getAuthUser(req);
    const authError = requireAuth(user);
    if (authError) return authError;

    // Parse request
    const body: CollaborativeWorkspaceRequest = await req.json();
    const { action, sessionId, projectId, params = {} } = body;

    if (!projectId) {
      return createErrorResponse('Project ID is required');
    }

    // Get database client
    const supabase = createDatabaseClient();

    // Check user access to project
    const { data: project } = await supabase
      .from('projects')
      .select('team_id')
      .eq('id', projectId)
      .single();

    if (!project) {
      return createErrorResponse('Project not found', 404);
    }

    const hasAccess = await getUserTeamAccess(
      supabase,
      user!.id,
      project.team_id
    );
    if (!hasAccess) {
      return createErrorResponse('Insufficient permissions', 403);
    }

    let result;

    switch (action) {
      case 'create_session': {
        if (!params.sessionName) {
          return createErrorResponse('Session name is required');
        }

        result = await createCollaborativeSession(
          supabase,
          projectId,
          user!.id,
          params
        );
        break;
      }

      case 'join_session': {
        if (!sessionId) {
          return createErrorResponse('Session ID is required');
        }

        result = await joinCollaborativeSession(
          supabase,
          sessionId,
          user!.id
        );
        break;
      }

      case 'leave_session': {
        if (!sessionId) {
          return createErrorResponse('Session ID is required');
        }

        await leaveCollaborativeSession(
          supabase,
          sessionId,
          user!.id
        );
        result = { success: true };
        break;
      }

      case 'add_comment': {
        if (!sessionId || !params.commentText) {
          return createErrorResponse('Session ID and comment text are required');
        }

        result = await addSessionComment(
          supabase,
          sessionId,
          user!.id,
          params
        );
        break;
      }

      case 'resolve_comment': {
        if (!params.commentId) {
          return createErrorResponse('Comment ID is required');
        }

        result = await resolveComment(
          supabase,
          params.commentId,
          user!.id
        );
        break;
      }

      case 'get_sessions': {
        result = await getProjectSessions(
          supabase,
          projectId,
          user!.id
        );
        break;
      }

      case 'get_activities': {
        if (!sessionId) {
          return createErrorResponse('Session ID is required');
        }

        const activities = await getSessionActivities(supabase, sessionId);
        const comments = await getSessionComments(supabase, sessionId);

        result = {
          activities,
          comments,
        };
        break;
      }

      default:
        return createErrorResponse('Invalid action specified');
    }

    return createResponse({
      action,
      sessionId,
      projectId,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Collaborative workspace error:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
});