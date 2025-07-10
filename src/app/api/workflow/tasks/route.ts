/**
 * Workflow Tasks API
 * Provides workflow task management endpoints
 */

import { NextRequest } from "next/server";
import { withSimpleAuth, SimpleUser } from "@/lib/auth/simple-api-auth";

// Mock workflow tasks data structure
interface WorkflowTask {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "blocked";
  priority: "low" | "medium" | "high";
  assignee?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  teamId: string;
}

// GET /api/workflow/tasks - Get workflow tasks
export const GET = withSimpleAuth(
  async (request: NextRequest, user: SimpleUser) => {
    console.log("📋 Workflow Tasks GET request received");

    const url = new URL(request.url);
    const teamId = url.searchParams.get("teamId");
    const status = url.searchParams.get("status");
    const priority = url.searchParams.get("priority");
    const assignee = url.searchParams.get("assignee");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    try {
      // Mock data for now - in production this would query the database
      const mockTasks: WorkflowTask[] = [
        {
          id: "task-1",
          title: "Content Strategy Review",
          description: "Review and update content strategy for Q1",
          status: "in_progress",
          priority: "high",
          assignee: user.id,
          dueDate: "2024-03-15T00:00:00Z",
          createdAt: "2024-02-01T10:00:00Z",
          updatedAt: "2024-02-15T14:30:00Z",
          teamId: teamId || "default-team",
        },
        {
          id: "task-2",
          title: "SEO Audit",
          description: "Perform comprehensive SEO audit",
          status: "pending",
          priority: "medium",
          dueDate: "2024-03-20T00:00:00Z",
          createdAt: "2024-02-10T09:00:00Z",
          updatedAt: "2024-02-10T09:00:00Z",
          teamId: teamId || "default-team",
        },
        {
          id: "task-3",
          title: "Competitor Analysis",
          description: "Analyze top 5 competitors",
          status: "completed",
          priority: "medium",
          assignee: user.id,
          dueDate: "2024-02-28T00:00:00Z",
          createdAt: "2024-02-01T11:00:00Z",
          updatedAt: "2024-02-25T16:00:00Z",
          teamId: teamId || "default-team",
        },
      ];

      // Apply filters
      let filteredTasks = mockTasks;

      if (teamId) {
        filteredTasks = filteredTasks.filter(task => task.teamId === teamId);
      }

      if (status) {
        filteredTasks = filteredTasks.filter(task => task.status === status);
      }

      if (priority) {
        filteredTasks = filteredTasks.filter(
          task => task.priority === priority
        );
      }

      if (assignee) {
        filteredTasks = filteredTasks.filter(
          task => task.assignee === assignee
        );
      }

      // Apply pagination
      const paginatedTasks = filteredTasks.slice(offset, offset + limit);

      const response = {
        success: true,
        tasks: paginatedTasks,
        pagination: {
          total: filteredTasks.length,
          limit,
          offset,
          hasMore: offset + limit < filteredTasks.length,
        },
        filters: {
          teamId,
          status,
          priority,
          assignee,
        },
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("❌ Error fetching workflow tasks:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch workflow tasks",
          message: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }
);

// POST /api/workflow/tasks - Create new workflow task
export const POST = withSimpleAuth(
  async (request: NextRequest, user: SimpleUser) => {
    console.log("📋 Workflow Tasks POST request received");

    try {
      const body = await request.json();
      const { title, description, priority, assignee, dueDate, teamId } = body;

      // Validate required fields
      if (!title || !teamId) {
        return new Response(
          JSON.stringify({
            error: "Missing required fields",
            message: "Title and teamId are required",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Create new task
      const newTask: WorkflowTask = {
        id: `task-${Date.now()}`,
        title,
        description: description || "",
        status: "pending",
        priority: priority || "medium",
        assignee,
        dueDate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        teamId,
      };

      const response = {
        success: true,
        task: newTask,
        message: "Task created successfully",
      };

      return new Response(JSON.stringify(response), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("❌ Error creating workflow task:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to create workflow task",
          message: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }
);
