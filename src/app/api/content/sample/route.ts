/**
 * Sample Content API Endpoint
 * Creates sample content data for testing and demonstration
 */

import { NextRequest } from "next/server";
import {
  withApiAuth,
  createSuccessResponse,
  type AuthContext,
} from "@/lib/auth/withApiAuth-definitive";

export const POST = withApiAuth(
  async (request: NextRequest, context: AuthContext) => {
    try {
      console.log("🚀 Sample Content API - Creating sample content");
      console.log("👤 Authenticated user:", {
        id: context.user.id,
        email: context.user.email,
      });

      // Call the database function to create sample content
      const { data, error } = await context.supabase.rpc(
        "create_sample_content"
      );

      if (error) {
        console.error("❌ Sample Content API: Database function failed", {
          error: error.message,
          code: error.code,
        });
        return new Response(
          JSON.stringify({
            error: "Failed to create sample content",
            code: "DATABASE_ERROR",
            details: error.message,
            status: 500,
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      // Check if the function returned an error
      if (data && !data.success) {
        console.log("⚠️ Sample Content API: Function returned error", data);
        return new Response(
          JSON.stringify({
            error: data.error || "Failed to create sample content",
            code: "FUNCTION_ERROR",
            status: 400,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      console.log(
        "✅ Sample Content API: Sample content created successfully",
        {
          contentCount: data?.content_count || 0,
          projectId: data?.project_id,
          userId: context.user.id,
        }
      );

      return createSuccessResponse(
        {
          message: data?.message || "Sample content created successfully",
          contentCount: data?.content_count || 0,
          projectId: data?.project_id,
        },
        201
      );
    } catch (error) {
      console.error("❌ Sample Content API: Unexpected error", {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        userId: context.user.id,
      });

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          code: "INTERNAL_ERROR",
          status: 500,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
);

export const DELETE = withApiAuth(
  async (request: NextRequest, context: AuthContext) => {
    try {
      console.log("🚀 Sample Content API - Deleting sample content");
      console.log("👤 Authenticated user:", {
        id: context.user.id,
        email: context.user.email,
      });

      // Call the database function to reset sample content
      const { data, error } = await context.supabase.rpc(
        "reset_sample_content"
      );

      if (error) {
        console.error("❌ Sample Content API: Database function failed", {
          error: error.message,
          code: error.code,
        });
        return new Response(
          JSON.stringify({
            error: "Failed to delete sample content",
            code: "DATABASE_ERROR",
            details: error.message,
            status: 500,
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      // Check if the function returned an error
      if (data && !data.success) {
        console.log("⚠️ Sample Content API: Function returned error", data);
        return new Response(
          JSON.stringify({
            error: data.error || "Failed to delete sample content",
            code: "FUNCTION_ERROR",
            status: 400,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      console.log(
        "✅ Sample Content API: Sample content deleted successfully",
        {
          deletedCount: data?.deleted_count || 0,
          userId: context.user.id,
        }
      );

      return createSuccessResponse({
        message: data?.message || "Sample content deleted successfully",
        deletedCount: data?.deleted_count || 0,
      });
    } catch (error) {
      console.error("❌ Sample Content API: Unexpected error", {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        userId: context.user.id,
      });

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          code: "INTERNAL_ERROR",
          status: 500,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
);
