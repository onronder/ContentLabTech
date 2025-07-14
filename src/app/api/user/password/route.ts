import { NextRequest, NextResponse } from "next/server";
import {
  withApiAuth,
  createSuccessResponse,
  type AuthContext,
} from "@/lib/auth/withApiAuth-definitive";

interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}

// PUT /api/user/password - Change user password
export const PUT = withApiAuth(
  async (request: NextRequest, context: AuthContext) => {
    try {
      const body: PasswordChangeRequest = await request.json();
      const { currentPassword, newPassword } = body;

      // Validate input
      if (!currentPassword || !newPassword) {
        return NextResponse.json(
          {
            error: "Current password and new password are required",
            code: "INVALID_REQUEST",
          },
          { status: 400 }
        );
      }

      // Validate new password strength
      if (newPassword.length < 8) {
        return NextResponse.json(
          {
            error: "New password must be at least 8 characters long",
            code: "WEAK_PASSWORD",
          },
          { status: 400 }
        );
      }

      // Verify current password by attempting to sign in
      const { error: signInError } =
        await context.supabase.auth.signInWithPassword({
          email: context.user.email!,
          password: currentPassword,
        });

      if (signInError) {
        return NextResponse.json(
          {
            error: "Current password is incorrect",
            code: "INVALID_CREDENTIALS",
          },
          { status: 401 }
        );
      }

      // Update password
      const { error: updateError } = await context.supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        console.error("Failed to update password:", updateError);
        return NextResponse.json(
          {
            error: "Failed to update password",
            code: "UPDATE_ERROR",
            details: updateError.message,
          },
          { status: 500 }
        );
      }

      // Record successful password change in login history
      await context.supabase.rpc("record_login_attempt", {
        p_user_id: context.user.id,
        p_login_type: "password_change",
        p_success: true,
      });

      return createSuccessResponse({
        message: "Password updated successfully",
      });
    } catch (error) {
      console.error("Failed to change password:", error);
      return NextResponse.json(
        {
          error: "Internal server error",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  }
);
