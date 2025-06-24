/**
 * Account Deletion API Route
 * Handles complete user account deletion with data cleanup
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/server";
import { auditLogger } from "@/lib/supabase/server";

export async function DELETE(request: NextRequest) {
  try {
    // Verify user authentication
    const supabase = createServerClient(
      process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
      process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() {
            // No-op for server-side
          },
          remove() {
            // No-op for server-side
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized - invalid session" },
        { status: 401 }
      );
    }

    const userId = user.id;
    const userEmail = user.email;

    // Validate request body for additional security
    const body = await request.json();
    if (body.confirmEmail !== userEmail) {
      return NextResponse.json(
        { error: "Email confirmation mismatch" },
        { status: 400 }
      );
    }

    // Begin transaction-like cleanup process
    const errors: string[] = [];

    try {
      // 1. Delete user's team memberships
      const { error: teamMembersError } = await supabaseAdmin
        .from("team_members")
        .delete()
        .eq("user_id", userId);

      if (teamMembersError) {
        errors.push(`Team membership cleanup: ${teamMembersError.message}`);
      }

      // 2. Handle teams owned by the user
      const { data: ownedTeams, error: ownedTeamsError } = await supabaseAdmin
        .from("teams")
        .select("id, name")
        .eq("owner_id", userId);

      if (ownedTeamsError) {
        errors.push(`Owned teams query: ${ownedTeamsError.message}`);
      } else if (ownedTeams && ownedTeams.length > 0) {
        // Transfer ownership or delete teams based on team size
        for (const team of ownedTeams) {
          // Check if team has other members
          const { data: otherMembers, error: membersError } =
            await supabaseAdmin
              .from("team_members")
              .select("user_id")
              .eq("team_id", team.id)
              .neq("user_id", userId)
              .eq("role", "admin");

          if (membersError) {
            errors.push(
              `Team members query for ${team.name}: ${membersError.message}`
            );
            continue;
          }

          if (otherMembers && otherMembers.length > 0) {
            // Transfer ownership to first admin
            const firstAdmin = otherMembers[0];
            if (firstAdmin) {
              const newOwnerId = firstAdmin.user_id;
              const { error: transferError } = await supabaseAdmin
                .from("teams")
                .update({ owner_id: newOwnerId })
                .eq("id", team.id);

              if (transferError) {
                errors.push(
                  `Ownership transfer for ${team.name}: ${transferError.message}`
                );
              }
            }
          } else {
            // Delete team if no other admins
            const { error: deleteTeamError } = await supabaseAdmin
              .from("teams")
              .delete()
              .eq("id", team.id);

            if (deleteTeamError) {
              errors.push(
                `Team deletion for ${team.name}: ${deleteTeamError.message}`
              );
            }
          }
        }
      }

      // 3. Delete user's content and projects (if any such tables exist)
      // Note: Add more cleanup based on your actual database schema
      const tablesToCleanup = [
        "user_projects",
        "user_content",
        "user_analytics",
        "user_settings",
        "user_notifications",
        "user_sessions",
        "user_audit_logs",
      ];

      for (const table of tablesToCleanup) {
        try {
          const { error: cleanupError } = await supabaseAdmin
            .from(table)
            .delete()
            .eq("user_id", userId);

          // Ignore errors for tables that might not exist
          if (
            cleanupError &&
            !cleanupError.message.includes("does not exist")
          ) {
            errors.push(`${table} cleanup: ${cleanupError.message}`);
          }
        } catch {
          // Table might not exist, continue
          continue;
        }
      }

      // 4. Delete user's storage files
      try {
        // Delete user's avatar
        const { error: avatarDeleteError } = await supabaseAdmin.storage
          .from("avatars")
          .remove([
            `${userId}/avatar.jpg`,
            `${userId}/avatar.png`,
            `${userId}/avatar.webp`,
          ]);

        // Ignore if files don't exist
        if (
          avatarDeleteError &&
          !avatarDeleteError.message.includes("not found")
        ) {
          errors.push(`Avatar deletion: ${avatarDeleteError.message}`);
        }

        // Delete user's folder entirely
        const { data: userFiles, error: listError } =
          await supabaseAdmin.storage.from("avatars").list(userId);

        if (!listError && userFiles && userFiles.length > 0) {
          const filePaths = userFiles.map(file => `${userId}/${file.name}`);
          const { error: bulkDeleteError } = await supabaseAdmin.storage
            .from("avatars")
            .remove(filePaths);

          if (bulkDeleteError) {
            errors.push(`User files deletion: ${bulkDeleteError.message}`);
          }
        }
      } catch (storageError) {
        errors.push(`Storage cleanup error: ${storageError}`);
      }

      // 5. Log the deletion attempt
      await auditLogger.log("account_deletion_attempt", {
        user_id: userId,
        user_email: userEmail,
        cleanup_errors: errors,
        timestamp: new Date().toISOString(),
        ip_address: request.headers.get("x-forwarded-for") || "unknown",
      });

      // 6. Finally, delete the user from auth.users
      const { error: userDeleteError } =
        await supabaseAdmin.auth.admin.deleteUser(userId);

      if (userDeleteError) {
        errors.push(`User deletion: ${userDeleteError.message}`);

        // Log the failure
        await auditLogger.log("account_deletion_failed", {
          user_id: userId,
          user_email: userEmail,
          error: userDeleteError.message,
          cleanup_errors: errors,
          timestamp: new Date().toISOString(),
        });

        return NextResponse.json(
          {
            error: "Failed to delete user account",
            details: errors,
          },
          { status: 500 }
        );
      }

      // Success - log the successful deletion
      await auditLogger.log("account_deletion_completed", {
        user_id: userId,
        user_email: userEmail,
        cleanup_warnings: errors.length > 0 ? errors : undefined,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: "Account successfully deleted",
        warnings: errors.length > 0 ? errors : undefined,
      });
    } catch (cleanupError) {
      // Log the failure
      await auditLogger.log("account_deletion_error", {
        user_id: userId,
        user_email: userEmail,
        error:
          cleanupError instanceof Error
            ? cleanupError.message
            : "Unknown error",
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          error: "Account deletion failed during cleanup",
          details:
            cleanupError instanceof Error
              ? cleanupError.message
              : "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Account deletion API error:", error);

    return NextResponse.json(
      {
        error: "Internal server error during account deletion",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Only allow DELETE method
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function POST() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
