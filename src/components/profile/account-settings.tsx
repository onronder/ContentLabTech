"use client";

/**
 * AccountSettings Component
 * Account management and security settings
 */

import { useState } from "react";
import { AlertTriangle, Loader2, Trash2, Mail } from "lucide-react";

import { useUserProfile } from "@/hooks/auth/use-user-profile";
import { useSupabaseAuth } from "@/hooks/auth/use-supabase-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [confirmEmail, setConfirmEmail] = useState("");
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "warning";
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

  const handleEmailConfirmation = () => {
    if (confirmEmail === user?.email) {
      setEmailConfirmed(true);
      setMessage(null);
    } else {
      setMessage({
        type: "error",
        text: "Email confirmation doesn't match your account email",
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (!emailConfirmed || confirmEmail !== user?.email) {
      setMessage({
        type: "error",
        text: "Please confirm your email address first",
      });
      return;
    }

    setIsDeleting(true);
    setMessage(null);

    const { success, error, warnings } = await deleteAccount(confirmEmail);

    if (error) {
      setMessage({ type: "error", text: error });
    } else if (success) {
      // Show warnings if any
      if (warnings && warnings.length > 0) {
        setMessage({
          type: "warning",
          text: `Account deleted with some warnings: ${warnings.join(", ")}`,
        });
      } else {
        setMessage({
          type: "success",
          text: "Account successfully deleted. You will be signed out automatically.",
        });
      }

      // Close dialog after a delay to show the message
      setTimeout(() => {
        setDeleteDialogOpen(false);
        // User will be signed out automatically by the server
        window.location.href = "/";
      }, 3000);
    }

    setIsDeleting(false);
  };

  const resetDeleteDialog = () => {
    setConfirmEmail("");
    setEmailConfirmed(false);
    setMessage(null);
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

            <Dialog
              open={deleteDialogOpen}
              onOpenChange={open => {
                setDeleteDialogOpen(open);
                if (!open) resetDeleteDialog();
              }}
            >
              <DialogTrigger asChild>
                <Button variant="destructive" disabled={loading}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Account
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Delete Account</DialogTitle>
                  <DialogDescription>
                    This action will permanently delete your account and cannot
                    be undone.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      This will permanently delete:
                      <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                        <li>Your user profile and all personal data</li>
                        <li>All projects and content you&apos;ve created</li>
                        <li>
                          Your team memberships (ownership will be transferred)
                        </li>
                        <li>All analytics and performance data</li>
                        <li>Uploaded files and avatars</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  {!emailConfirmed ? (
                    <div className="space-y-3">
                      <div>
                        <Label
                          htmlFor="confirmEmail"
                          className="text-sm font-medium"
                        >
                          To confirm, type your email address:
                        </Label>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {user?.email}
                        </p>
                      </div>
                      <div className="relative">
                        <Mail className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                        <Input
                          id="confirmEmail"
                          type="email"
                          value={confirmEmail}
                          onChange={e => setConfirmEmail(e.target.value)}
                          placeholder="Enter your email address"
                          className="pl-10"
                          disabled={isDeleting}
                        />
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleEmailConfirmation}
                        disabled={!confirmEmail || isDeleting}
                        className="w-full"
                      >
                        Confirm Email
                      </Button>
                    </div>
                  ) : (
                    <Alert>
                      <AlertDescription className="text-green-600">
                        ✓ Email confirmed. You can now proceed with account
                        deletion.
                      </AlertDescription>
                    </Alert>
                  )}

                  {message && (
                    <Alert
                      variant={
                        message.type === "error"
                          ? "destructive"
                          : message.type === "warning"
                            ? "default"
                            : "default"
                      }
                    >
                      <AlertDescription>{message.text}</AlertDescription>
                    </Alert>
                  )}
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
                    disabled={!emailConfirmed || isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting Account...
                      </>
                    ) : (
                      "Delete Account Forever"
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
