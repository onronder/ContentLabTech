/**
 * Individual Workflow Task API
 * Provides CRUD operations for individual workflow tasks
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

// GET /api/workflow/tasks/[taskId] - Get individual task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;

  console.log("📋 Individual Workflow Task GET request received");

  // Get user from auth header
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Authorization header required" },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  try {
    // Mock task lookup - in production this would query the database
    const mockTask: WorkflowTask = {
      id: taskId,
      title: "Content Strategy Review",
      description: "Review and update content strategy for Q1",
      status: "in_progress",
      priority: "high",
      assignee: user.id,
      dueDate: "2024-03-15T00:00:00Z",
      createdAt: "2024-02-01T10:00:00Z",
      updatedAt: "2024-02-15T14:30:00Z",
      teamId: "default-team",
    };

    return NextResponse.json({
      success: true,
      task: mockTask,
    });
  } catch (error) {
    console.error("❌ Error fetching workflow task:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch workflow task",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT /api/workflow/tasks/[taskId] - Update individual task
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;

  console.log("📋 Individual Workflow Task PUT request received");

  // Get user from auth header
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Authorization header required" },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, description, status, priority, assignee, dueDate } = body;

    // Mock task update - in production this would update the database
    const updatedTask: WorkflowTask = {
      id: taskId,
      title: title || "Updated Task",
      description: description || "",
      status: status || "pending",
      priority: priority || "medium",
      assignee,
      dueDate,
      createdAt: "2024-02-01T10:00:00Z",
      updatedAt: new Date().toISOString(),
      teamId: "default-team",
    };

    return NextResponse.json({
      success: true,
      task: updatedTask,
      message: "Task updated successfully",
    });
  } catch (error) {
    console.error("❌ Error updating workflow task:", error);
    return NextResponse.json(
      {
        error: "Failed to update workflow task",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/workflow/tasks/[taskId] - Delete individual task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;

  console.log("📋 Individual Workflow Task DELETE request received");

  // Get user from auth header
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Authorization header required" },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  try {
    // Mock task deletion - in production this would delete from database
    return NextResponse.json({
      success: true,
      message: `Task ${taskId} deleted successfully`,
    });
  } catch (error) {
    console.error("❌ Error deleting workflow task:", error);
    return NextResponse.json(
      {
        error: "Failed to delete workflow task",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
