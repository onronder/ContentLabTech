"use client";

/**
 * AccountSettings Component
 * Account management and security settings
 */

import { useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

import { useUserProfile } from "@/hooks/auth/use-user-profile";
import { useSupabaseAuth } from "@/hooks/auth/use-supabase-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const AccountSettings = () => {
  const { deleteAccount, loading } = useUserProfile();
  const { resetPassword, user } = useSupabaseAuth();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handlePasswordReset = async () => {
    if (!user?.email) return;

    setIsResettingPassword(true);
    setMessage(null);

    const { error } = await resetPassword(user.email);

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({
        type: "success",
        text: "Password reset link sent to your email",
      });
    }

    setIsResettingPassword(false);
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setMessage(null);

    const { success, error } = await deleteAccount();

    if (error) {
      setMessage({ type: "error", text: error });
    } else if (success) {
      // User will be signed out automatically
      setMessage({
        type: "success",
        text: "Account deletion initiated",
      });
    }

    setIsDeleting(false);
    setDeleteDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Password Management */}
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            Manage your account password and security
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium">Password</h4>
                <p className="text-muted-foreground text-sm">
                  Last changed: Not available
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handlePasswordReset}
                disabled={isResettingPassword}
              >
                {isResettingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </div>

            {message && (
              <Alert
                variant={message.type === "error" ? "destructive" : "default"}
              >
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>
            View your account details and creation date
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <h4 className="text-sm font-medium">Email Address</h4>
                <p className="text-muted-foreground text-sm">{user?.email}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium">Account Created</h4>
                <p className="text-muted-foreground text-sm">
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString()
                    : "Unknown"}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium">Email Verified</h4>
                <p className="text-muted-foreground text-sm">
                  {user?.email_confirmed_at ? "Yes" : "No"}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium">Account ID</h4>
                <p className="text-muted-foreground font-mono text-sm">
                  {user?.id?.slice(0, 8)}...
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions that will permanently affect your account
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> Account deletion is permanent and
                cannot be undone. All your data, projects, and team associations
                will be permanently removed.
              </AlertDescription>
            </Alert>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" disabled={loading}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Account
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Account</DialogTitle>
                  <DialogDescription>
                    Are you absolutely sure you want to delete your account?
                    This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      This will permanently delete:
                      <ul className="mt-2 list-inside list-disc space-y-1">
                        <li>Your user profile and all personal data</li>
                        <li>All projects and content you&apos;ve created</li>
                        <li>Your team memberships and collaborations</li>
                        <li>All analytics and performance data</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDeleteDialogOpen(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Delete Account"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
