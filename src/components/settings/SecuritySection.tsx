"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  Key,
  Monitor,
  History,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Trash2,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Session {
  id: string;
  device_info: any;
  ip_address: string;
  user_agent: string;
  last_activity: string;
  created_at: string;
}

interface LoginHistory {
  id: string;
  login_type: string;
  success: boolean;
  ip_address: string;
  user_agent: string;
  created_at: string;
  error_message?: string;
}

export const SecuritySection: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Password change form
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/user/sessions");

      if (!response.ok) {
        throw new Error("Failed to load security data");
      }

      const data = await response.json();
      setSessions(data.data.activeSessions || []);
      setLoginHistory(data.data.loginHistory || []);
    } catch (err) {
      console.error("Failed to load security data:", err);
      setError("Failed to load security information");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All password fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long");
      return;
    }

    try {
      setChangingPassword(true);
      setError(null);

      const response = await fetch("/api/user/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to change password");
      }

      setSuccess("Password changed successfully");
      setShowPasswordDialog(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to change password:", err);
      setError(
        err instanceof Error ? err.message : "Failed to change password"
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/user/sessions/${sessionId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to revoke session");
      }

      setSessions(sessions.filter(session => session.id !== sessionId));
      setSuccess("Session revoked successfully");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to revoke session:", err);
      setError("Failed to revoke session");
    }
  };

  const handleRevokeAllSessions = async () => {
    try {
      const response = await fetch("/api/user/sessions", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to revoke sessions");
      }

      setSessions([]);
      setSuccess("All other sessions revoked successfully");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to revoke sessions:", err);
      setError("Failed to revoke sessions");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getDeviceInfo = (userAgent: string) => {
    if (userAgent.includes("Mobile")) return "Mobile Device";
    if (userAgent.includes("iPad")) return "iPad";
    if (userAgent.includes("iPhone")) return "iPhone";
    if (userAgent.includes("Android")) return "Android Device";
    if (userAgent.includes("Windows")) return "Windows PC";
    if (userAgent.includes("Macintosh")) return "Mac";
    if (userAgent.includes("Linux")) return "Linux PC";
    return "Unknown Device";
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading security data...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Password Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Key className="h-5 w-5 text-blue-600" />
            <span>Password & Authentication</span>
          </CardTitle>
          <CardDescription>
            Manage your password and authentication settings
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Dialog
            open={showPasswordDialog}
            onOpenChange={setShowPasswordDialog}
          >
            <DialogTrigger asChild>
              <Button variant="outline">
                <Key className="mr-2 h-4 w-4" />
                Change Password
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Change Password</DialogTitle>
                <DialogDescription>
                  Enter your current password and choose a new secure password
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    Must be at least 8 characters long
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowPasswordDialog(false)}
                    disabled={changingPassword}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleChangePassword}
                    disabled={changingPassword}
                  >
                    {changingPassword ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Changing...
                      </>
                    ) : (
                      "Change Password"
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Monitor className="h-5 w-5 text-blue-600" />
            <span>Active Sessions</span>
          </CardTitle>
          <CardDescription>
            Manage your active login sessions across different devices
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {sessions.length === 0 ? (
            <p className="py-4 text-center text-gray-500">
              No active sessions found
            </p>
          ) : (
            <>
              <div className="space-y-3">
                {sessions.map(session => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Monitor className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">
                          {getDeviceInfo(session.user_agent)}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-gray-600">
                        <p>IP: {session.ip_address}</p>
                        <p>Last active: {formatDate(session.last_activity)}</p>
                        <p>Started: {formatDate(session.created_at)}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevokeSession(session.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>

              {sessions.length > 1 && (
                <div className="border-t pt-4">
                  <Button
                    variant="destructive"
                    onClick={handleRevokeAllSessions}
                  >
                    Revoke All Other Sessions
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Login History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <History className="h-5 w-5 text-blue-600" />
            <span>Login History</span>
          </CardTitle>
          <CardDescription>
            Recent login attempts and security events
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loginHistory.length === 0 ? (
            <p className="py-4 text-center text-gray-500">
              No login history available
            </p>
          ) : (
            <div className="space-y-3">
              {loginHistory.map(entry => (
                <div
                  key={entry.id}
                  className="flex items-center space-x-3 rounded-lg border p-3"
                >
                  {entry.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}

                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium capitalize">
                        {entry.login_type.replace("_", " ")}
                      </span>
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          entry.success
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {entry.success ? "Success" : "Failed"}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      <p>IP: {entry.ip_address}</p>
                      <p>Device: {getDeviceInfo(entry.user_agent)}</p>
                      <p>Time: {formatDate(entry.created_at)}</p>
                      {entry.error_message && (
                        <p className="text-red-600">
                          Error: {entry.error_message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error/Success Messages */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700">{success}</span>
          </div>
        </div>
      )}
    </div>
  );
};
