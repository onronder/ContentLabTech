"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  MessageSquare,
  Send,
  Reply,
  Check,
  AlertCircle,
  Lightbulb,
  HelpCircle,
  ThumbsUp,
  Plus,
  Share,
  Download,
  FileText,
  Activity,
  Zap,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CollaborativeWorkspaceProps {
  projectId: string;
  sessionId?: string;
  analysisId?: string;
}

interface TeamMember {
  id: string;
  email: string;
  fullName: string;
  avatar?: string;
  role: string;
  isOnline: boolean;
  lastActive: string;
}

interface CollaborativeSession {
  id: string;
  sessionName: string;
  description?: string;
  participants: string[];
  status: "active" | "completed" | "cancelled" | "archived";
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
  commentType:
    | "general"
    | "suggestion"
    | "question"
    | "approval"
    | "concern"
    | "insight";
  parentCommentId?: string;
  mentionedUsers: string[];
  attachments: Array<{ name: string; url: string; type: string }>;
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  user?: TeamMember;
  replies?: SessionComment[];
}

interface SessionActivity {
  id: string;
  sessionId: string;
  userId: string;
  activityType: string;
  activityData: Record<string, unknown>;
  timestamp: string;
  user?: TeamMember;
}

const COMMENT_TYPES = [
  {
    value: "general",
    label: "General",
    icon: MessageSquare,
    color: "text-gray-600",
  },
  {
    value: "suggestion",
    label: "Suggestion",
    icon: Lightbulb,
    color: "text-yellow-600",
  },
  {
    value: "question",
    label: "Question",
    icon: HelpCircle,
    color: "text-blue-600",
  },
  {
    value: "approval",
    label: "Approval",
    icon: ThumbsUp,
    color: "text-green-600",
  },
  {
    value: "concern",
    label: "Concern",
    icon: AlertCircle,
    color: "text-red-600",
  },
  { value: "insight", label: "Insight", icon: Zap, color: "text-purple-600" },
];

export function CollaborativeWorkspace({
  projectId,
  sessionId,
  analysisId,
}: CollaborativeWorkspaceProps) {
  const [session, setSession] = useState<CollaborativeSession | null>(null);
  const [comments, setComments] = useState<SessionComment[]>([]);
  const [activities, setActivities] = useState<SessionActivity[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [, setCurrentUser] = useState<TeamMember | null>(null);
  const [newComment, setNewComment] = useState("");
  const [newCommentType, setNewCommentType] =
    useState<SessionComment["commentType"]>("general");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [, setError] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [newSessionData, setNewSessionData] = useState({
    sessionName: "",
    description: "",
    participants: [] as string[],
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadTeamMembers();
    if (sessionId) {
      loadSession();
      loadComments();
      loadActivities();
      // Set up real-time updates
      const interval = setInterval(() => {
        loadComments();
        loadActivities();
      }, 3000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [comments]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadTeamMembers = async () => {
    try {
      const response = await fetch(`/api/team/members?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.members || []);
        setCurrentUser(data.currentUser);
      }
    } catch (error) {
      console.error("Failed to load team members:", error);
    }
  };

  const loadSession = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch("/api/collaboration/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get_sessions",
          projectId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const sessions = data.result || [];
        const currentSession = sessions.find(
          (s: CollaborativeSession) => s.id === sessionId
        );
        setSession(currentSession);
      }
    } catch (error) {
      console.error("Failed to load session:", error);
    }
  };

  const loadComments = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch("/api/collaboration/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get_activities",
          sessionId,
          projectId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setComments(data.result.comments || []);
      }
    } catch (error) {
      console.error("Failed to load comments:", error);
    }
  };

  const loadActivities = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch("/api/collaboration/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get_activities",
          sessionId,
          projectId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setActivities(data.result.activities || []);
      }
    } catch (error) {
      console.error("Failed to load activities:", error);
    }
  };

  const createSession = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/collaboration/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_session",
          projectId,
          params: {
            ...newSessionData,
            analysisId,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSession(data.result);
        setIsCreatingSession(false);
        setNewSessionData({
          sessionName: "",
          description: "",
          participants: [],
        });
      } else {
        throw new Error("Failed to create session");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !sessionId) return;

    setIsLoading(true);

    try {
      const response = await fetch("/api/collaboration/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_comment",
          sessionId,
          projectId,
          params: {
            commentText: newComment,
            commentType: newCommentType,
            parentCommentId: replyingTo,
          },
        }),
      });

      if (response.ok) {
        setNewComment("");
        setReplyingTo(null);
        setNewCommentType("general");
        loadComments();
      }
    } catch (error) {
      console.error("Failed to add comment:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resolveComment = async (commentId: string) => {
    try {
      const response = await fetch("/api/collaboration/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resolve_comment",
          sessionId,
          projectId,
          params: { commentId },
        }),
      });

      if (response.ok) {
        loadComments();
      }
    } catch (error) {
      console.error("Failed to resolve comment:", error);
    }
  };

  const getCommentTypeIcon = (type: string) => {
    const commentType = COMMENT_TYPES.find(t => t.value === type);
    const Icon = commentType?.icon || MessageSquare;
    return (
      <Icon className={`h-4 w-4 ${commentType?.color || "text-gray-600"}`} />
    );
  };

  const getCommentTypeLabel = (type: string) => {
    return COMMENT_TYPES.find(t => t.value === type)?.label || "Comment";
  };

  const renderComment = (comment: SessionComment, isReply = false) => {
    const user = teamMembers.find(m => m.id === comment.userId);

    return (
      <div
        key={comment.id}
        className={`${isReply ? "ml-8 border-l-2 border-gray-100 pl-4" : ""}`}
      >
        <div className="flex gap-3 rounded-lg p-4 transition-colors hover:bg-gray-50">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback>
              {user?.fullName?.charAt(0) || user?.email?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-sm font-medium">
                {user?.fullName || user?.email || "Unknown User"}
              </span>
              <Badge variant="outline" className="text-xs">
                {getCommentTypeIcon(comment.commentType)}
                <span className="ml-1">
                  {getCommentTypeLabel(comment.commentType)}
                </span>
              </Badge>
              <span className="text-muted-foreground text-xs">
                {formatDistanceToNow(new Date(comment.createdAt), {
                  addSuffix: true,
                })}
              </span>
              {comment.isResolved && (
                <Badge variant="default" className="text-xs">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Resolved
                </Badge>
              )}
            </div>

            <div className="mb-2 text-sm text-gray-800">
              {comment.commentText}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setReplyingTo(comment.id);
                  commentInputRef.current?.focus();
                }}
              >
                <Reply className="mr-1 h-3 w-3" />
                Reply
              </Button>

              {!comment.isResolved &&
                (comment.commentType === "question" ||
                  comment.commentType === "concern") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => resolveComment(comment.id)}
                  >
                    <Check className="mr-1 h-3 w-3" />
                    Resolve
                  </Button>
                )}
            </div>
          </div>
        </div>

        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2">
            {comment.replies.map(reply => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  const renderActivity = (activity: SessionActivity) => {
    const user = teamMembers.find(m => m.id === activity.userId);

    return (
      <div
        key={activity.id}
        className="text-muted-foreground flex gap-3 p-2 text-sm"
      >
        <Activity className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <div>
          <span className="font-medium">
            {user?.fullName || user?.email || "Someone"}
          </span>
          <span className="ml-1">
            {getActivityDescription(
              activity.activityType,
              activity.activityData
            )}
          </span>
          <span className="ml-2 text-xs">
            {formatDistanceToNow(new Date(activity.timestamp), {
              addSuffix: true,
            })}
          </span>
        </div>
      </div>
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getActivityDescription = (type: string, _activityData?: unknown) => {
    switch (type) {
      case "session_created":
        return "created the session";
      case "user_joined":
        return "joined the session";
      case "user_left":
        return "left the session";
      case "comment_added":
        return "added a comment";
      case "comment_resolved":
        return "resolved a comment";
      default:
        return type.replace("_", " ");
    }
  };

  if (!sessionId && !isCreatingSession) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Users className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
          <h3 className="mb-2 text-lg font-medium">No Active Session</h3>
          <p className="text-muted-foreground mb-4">
            Start a collaborative session to work with your team
          </p>
          <Button onClick={() => setIsCreatingSession(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Start Collaboration
          </Button>
        </div>
      </div>
    );
  }

  if (isCreatingSession) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Start Collaborative Session</CardTitle>
          <CardDescription>
            Create a new session to collaborate with your team on content
            analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Session Name</label>
            <Input
              value={newSessionData.sessionName}
              onChange={e =>
                setNewSessionData(prev => ({
                  ...prev,
                  sessionName: e.target.value,
                }))
              }
              placeholder="Enter session name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Description (Optional)
            </label>
            <Textarea
              value={newSessionData.description}
              onChange={e =>
                setNewSessionData(prev => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Describe what you'll be working on"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Invite Team Members</label>
            <div className="grid gap-2">
              {teamMembers.map(member => (
                <div key={member.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`member-${member.id}`}
                    checked={newSessionData.participants.includes(member.id)}
                    onChange={e => {
                      if (e.target.checked) {
                        setNewSessionData(prev => ({
                          ...prev,
                          participants: [...prev.participants, member.id],
                        }));
                      } else {
                        setNewSessionData(prev => ({
                          ...prev,
                          participants: prev.participants.filter(
                            id => id !== member.id
                          ),
                        }));
                      }
                    }}
                  />
                  <label
                    htmlFor={`member-${member.id}`}
                    className="flex cursor-pointer items-center gap-2"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback className="text-xs">
                        {member.fullName?.charAt(0) || member.email?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {member.fullName || member.email}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {member.role}
                    </Badge>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={createSession}
              disabled={isLoading || !newSessionData.sessionName}
            >
              {isLoading ? "Creating..." : "Start Session"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsCreatingSession(false)}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Session Header */}
      {session && (
        <div className="border-b bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{session.sessionName}</h2>
              {session.description && (
                <p className="text-muted-foreground text-sm">
                  {session.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {session.participants.slice(0, 5).map(participantId => {
                  const member = teamMembers.find(m => m.id === participantId);
                  return (
                    <Avatar
                      key={participantId}
                      className="h-8 w-8 border-2 border-white"
                    >
                      <AvatarImage src={member?.avatar} />
                      <AvatarFallback className="text-xs">
                        {member?.fullName?.charAt(0) ||
                          member?.email?.charAt(0) ||
                          "?"}
                      </AvatarFallback>
                    </Avatar>
                  );
                })}
                {session.participants.length > 5 && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-200">
                    <span className="text-xs text-gray-600">
                      +{session.participants.length - 5}
                    </span>
                  </div>
                )}
              </div>

              <Badge
                variant={session.status === "active" ? "default" : "secondary"}
              >
                {session.status}
              </Badge>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1">
        {/* Main Chat Area */}
        <div className="flex flex-1 flex-col">
          <Tabs defaultValue="discussion" className="flex flex-1 flex-col">
            <TabsList className="w-full justify-start rounded-none border-b">
              <TabsTrigger value="discussion">Discussion</TabsTrigger>
              <TabsTrigger value="activity">Activity Feed</TabsTrigger>
            </TabsList>

            <TabsContent value="discussion" className="flex flex-1 flex-col">
              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-2">
                  {comments.map(comment => renderComment(comment))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="border-t bg-white p-4">
                {replyingTo && (
                  <div className="mb-2 rounded bg-blue-50 p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Replying to comment</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setReplyingTo(null)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Select
                    value={newCommentType}
                    onValueChange={value =>
                      setNewCommentType(value as SessionComment["commentType"])
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMENT_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className={`h-4 w-4 ${type.color}`} />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex flex-1 gap-2">
                    <Textarea
                      ref={commentInputRef}
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      placeholder="Type your message..."
                      className="min-h-[40px] resize-none"
                      onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          addComment();
                        }
                      }}
                    />
                    <Button
                      onClick={addComment}
                      disabled={!newComment.trim() || isLoading}
                      className="self-end"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="flex-1">
              <ScrollArea className="h-full p-4">
                <div className="space-y-2">
                  {activities.map(renderActivity)}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="w-80 border-l bg-gray-50 p-4">
          <div className="space-y-6">
            {/* Session Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Session Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge
                    variant={
                      session?.status === "active" ? "default" : "secondary"
                    }
                  >
                    {session?.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Participants:</span>
                  <span>{session?.participants.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Comments:</span>
                  <span>{comments.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span>
                    {session &&
                      formatDistanceToNow(new Date(session.createdAt), {
                        addSuffix: true,
                      })}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  <Share className="mr-2 h-4 w-4" />
                  Share Session
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export Discussion
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Summary
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
