'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Plus,
  User,
  Calendar,
  Flag,
  FileText,
  MessageSquare,
  ArrowRight
} from 'lucide-react';

interface WorkflowTask {
  id: string;
  taskType: string;
  title: string;
  description: string;
  assigneeId?: string;
  reviewerId?: string;
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'implemented';
  priority: number;
  dueDate?: string;
  completedAt?: string;
  approvedAt?: string;
  rejectionReason?: string;
  data: any;
  createdBy: string;
  createdAt: string;
  assignee?: {
    id: string;
    email: string;
    fullName: string;
  };
  reviewer?: {
    id: string;
    email: string;
    fullName: string;
  };
  creator?: {
    id: string;
    email: string;
    fullName: string;
  };
}

interface WorkflowManagerProps {
  projectId: string;
}

export function WorkflowManager({ projectId }: WorkflowManagerProps) {
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<WorkflowTask | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_review' | 'approved' | 'rejected'>('all');

  // Form state for creating new tasks
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    taskType: 'content_optimization',
    assigneeId: '',
    reviewerId: '',
    priority: 5,
    dueDate: '',
  });

  useEffect(() => {
    loadTasks();
  }, [projectId, filter]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        projectId,
        ...(filter !== 'all' && { status: filter }),
      });

      const response = await fetch(`/api/workflow/tasks?${params}`);
      if (!response.ok) throw new Error('Failed to load tasks');

      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const createTask = async () => {
    try {
      const response = await fetch('/api/workflow/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          ...newTask,
          dueDate: newTask.dueDate || undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to create task');

      await loadTasks();
      setShowCreateDialog(false);
      setNewTask({
        title: '',
        description: '',
        taskType: 'content_optimization',
        assigneeId: '',
        reviewerId: '',
        priority: 5,
        dueDate: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    }
  };

  const updateTaskStatus = async (taskId: string, status: WorkflowTask['status'], rejectionReason?: string) => {
    try {
      const response = await fetch(`/api/workflow/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          rejectionReason,
        }),
      });

      if (!response.ok) throw new Error('Failed to update task');

      await loadTasks();
      setSelectedTask(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  };

  const getStatusIcon = (status: WorkflowTask['status']) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'in_review': return <AlertCircle className="h-4 w-4 text-blue-600" />;
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'implemented': return <CheckCircle className="h-4 w-4 text-green-800" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: WorkflowTask['status']) => {
    switch (status) {
      case 'pending': return 'default';
      case 'in_review': return 'secondary';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'implemented': return 'default';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'destructive';
    if (priority >= 6) return 'default';
    return 'secondary';
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 8) return 'High';
    if (priority >= 6) return 'Medium';
    return 'Low';
  };

  const filteredTasks = tasks.filter(task => 
    filter === 'all' || task.status === filter
  );

  const taskCounts = {
    all: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    in_review: tasks.filter(t => t.status === 'in_review').length,
    approved: tasks.filter(t => t.status === 'approved').length,
    rejected: tasks.filter(t => t.status === 'rejected').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Workflow Management</h2>
          <p className="text-muted-foreground">
            Manage project tasks and approval workflows
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Create a new workflow task for the project team
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Task title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Task description"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taskType">Type</Label>
                  <Select value={newTask.taskType} onValueChange={(value) => setNewTask({ ...newTask, taskType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="content_optimization">Content Optimization</SelectItem>
                      <SelectItem value="seo_analysis">SEO Analysis</SelectItem>
                      <SelectItem value="competitive_research">Competitive Research</SelectItem>
                      <SelectItem value="keyword_research">Keyword Research</SelectItem>
                      <SelectItem value="content_creation">Content Creation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={newTask.priority.toString()} onValueChange={(value) => setNewTask({ ...newTask, priority: parseInt(value) })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">Low (3)</SelectItem>
                      <SelectItem value="5">Medium (5)</SelectItem>
                      <SelectItem value="7">High (7)</SelectItem>
                      <SelectItem value="9">Critical (9)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date (Optional)</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={createTask} disabled={!newTask.title || !newTask.description}>
                Create Task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Tabs value={filter} onValueChange={(value) => setFilter(value as any)}>
        <TabsList>
          <TabsTrigger value="all">All ({taskCounts.all})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({taskCounts.pending})</TabsTrigger>
          <TabsTrigger value="in_review">In Review ({taskCounts.in_review})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({taskCounts.approved})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({taskCounts.rejected})</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="space-y-4">
          {loading ? (
            <div className="text-center py-8">Loading tasks...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">{error}</div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tasks found for the selected filter
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTasks.map((task) => (
                <Card key={task.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setSelectedTask(task)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{task.title}</h3>
                          <Badge variant={getStatusColor(task.status)} size="sm">
                            {getStatusIcon(task.status)}
                            <span className="ml-1">{task.status.replace('_', ' ')}</span>
                          </Badge>
                          <Badge variant={getPriorityColor(task.priority)} size="sm">
                            <Flag className="h-3 w-3 mr-1" />
                            {getPriorityLabel(task.priority)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {task.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {task.taskType.replace('_', ' ')}
                          </span>
                          {task.assignee && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {task.assignee.fullName || task.assignee.email}
                            </span>
                          )}
                          {task.dueDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(task.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Task Detail Dialog */}
      {selectedTask && (
        <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getStatusIcon(selectedTask.status)}
                {selectedTask.title}
              </DialogTitle>
              <DialogDescription>
                {selectedTask.taskType.replace('_', ' ')} • Created {new Date(selectedTask.createdAt).toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-96">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Status</h4>
                    <Badge variant={getStatusColor(selectedTask.status)}>
                      {getStatusIcon(selectedTask.status)}
                      <span className="ml-1">{selectedTask.status.replace('_', ' ')}</span>
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Priority</h4>
                    <Badge variant={getPriorityColor(selectedTask.priority)}>
                      <Flag className="h-3 w-3 mr-1" />
                      {getPriorityLabel(selectedTask.priority)}
                    </Badge>
                  </div>
                </div>

                {selectedTask.assignee && (
                  <div>
                    <h4 className="font-medium mb-2">Assignee</h4>
                    <p className="text-sm">{selectedTask.assignee.fullName || selectedTask.assignee.email}</p>
                  </div>
                )}

                {selectedTask.reviewer && (
                  <div>
                    <h4 className="font-medium mb-2">Reviewer</h4>
                    <p className="text-sm">{selectedTask.reviewer.fullName || selectedTask.reviewer.email}</p>
                  </div>
                )}

                {selectedTask.rejectionReason && (
                  <div>
                    <h4 className="font-medium mb-2 text-red-600">Rejection Reason</h4>
                    <p className="text-sm text-red-600">{selectedTask.rejectionReason}</p>
                  </div>
                )}

                {selectedTask.dueDate && (
                  <div>
                    <h4 className="font-medium mb-2">Due Date</h4>
                    <p className="text-sm">{new Date(selectedTask.dueDate).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
            <DialogFooter className="gap-2">
              {selectedTask.status === 'pending' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => updateTaskStatus(selectedTask.id, 'in_review')}
                  >
                    Start Review
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const reason = prompt('Rejection reason:');
                      if (reason) updateTaskStatus(selectedTask.id, 'rejected', reason);
                    }}
                  >
                    Reject
                  </Button>
                </>
              )}
              {selectedTask.status === 'in_review' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const reason = prompt('Rejection reason:');
                      if (reason) updateTaskStatus(selectedTask.id, 'rejected', reason);
                    }}
                  >
                    Reject
                  </Button>
                  <Button
                    onClick={() => updateTaskStatus(selectedTask.id, 'approved')}
                  >
                    Approve
                  </Button>
                </>
              )}
              {selectedTask.status === 'approved' && (
                <Button
                  onClick={() => updateTaskStatus(selectedTask.id, 'implemented')}
                >
                  Mark as Implemented
                </Button>
              )}
              <Button variant="outline" onClick={() => setSelectedTask(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}