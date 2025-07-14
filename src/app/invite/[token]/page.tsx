"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Clock, Users } from "lucide-react";
import Link from "next/link";

interface InvitationDetails {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  team: {
    id: string;
    name: string;
    description?: string;
  };
  inviter: {
    email: string;
    name: string;
  };
}

interface AcceptanceResult {
  success: boolean;
  team_id?: string;
  role?: string;
  message?: string;
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const { user, signIn } = useSupabaseAuth();
  const token = params.token as string;

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<AcceptanceResult | null>(null);

  // Load invitation details
  useEffect(() => {
    const loadInvitation = async () => {
      if (!token) return;

      try {
        const response = await fetch(`/api/invitations/accept?token=${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to load invitation");
          return;
        }

        setInvitation(data.data);
      } catch (err) {
        setError("Failed to load invitation details");
        console.error("Error loading invitation:", err);
      } finally {
        setLoading(false);
      }
    };

    loadInvitation();
  }, [token]);

  const handleAcceptInvitation = async () => {
    if (!user) {
      // Redirect to sign in
      signIn();
      return;
    }

    if (!invitation) return;

    setAccepting(true);
    setError(null);

    try {
      const response = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to accept invitation");
        return;
      }

      setSuccess(data.data);

      // Redirect to team page after 2 seconds
      setTimeout(() => {
        router.push(`/teams/${data.data.team_id}`);
      }, 2000);
    } catch (err) {
      setError("Failed to accept invitation");
      console.error("Error accepting invitation:", err);
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading invitation...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <CardTitle className="text-red-700">Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard">
              <Button className="w-full">Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
            <CardTitle className="text-green-700">
              Invitation Accepted!
            </CardTitle>
            <CardDescription>
              Welcome to {invitation?.team.name}! You&apos;ve been added as a{" "}
              {success.role}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-center text-sm text-gray-600">
              Redirecting you to the team page...
            </p>
            <Link href={`/teams/${success.team_id}`}>
              <Button className="w-full">Go to Team</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) return null;

  const roleColors = {
    owner: "bg-purple-100 text-purple-800",
    admin: "bg-blue-100 text-blue-800",
    member: "bg-green-100 text-green-800",
    viewer: "bg-gray-100 text-gray-800",
  };

  const expiresAt = new Date(invitation.expires_at);
  const isExpiringSoon = expiresAt.getTime() - Date.now() < 24 * 60 * 60 * 1000; // 24 hours

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-blue-600" />
          <CardTitle>You&apos;re Invited!</CardTitle>
          <CardDescription>
            Join {invitation.team.name} on ContentLab Nexus
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Team Information */}
          <div className="rounded-lg bg-gray-50 p-4">
            <h3 className="mb-2 font-semibold text-gray-900">
              {invitation.team.name}
            </h3>
            {invitation.team.description && (
              <p className="mb-3 text-sm text-gray-600">
                {invitation.team.description}
              </p>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Your role:</span>
              <Badge
                className={
                  roleColors[invitation.role as keyof typeof roleColors]
                }
              >
                {invitation.role.charAt(0).toUpperCase() +
                  invitation.role.slice(1)}
              </Badge>
            </div>
          </div>

          {/* Inviter Information */}
          <div className="border-l-4 border-blue-500 pl-4">
            <p className="text-sm text-gray-600">
              <strong>{invitation.inviter.name}</strong> (
              {invitation.inviter.email}) has invited you to join their team.
            </p>
          </div>

          {/* Expiration Warning */}
          <div
            className={`flex items-center gap-2 rounded-lg p-3 ${
              isExpiringSoon
                ? "bg-yellow-50 text-yellow-800"
                : "bg-blue-50 text-blue-800"
            }`}
          >
            <Clock className="h-4 w-4" />
            <span className="text-sm">
              Expires on{" "}
              {expiresAt.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Authentication Required */}
          {!user && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="mb-2 text-sm text-blue-700">
                You need to sign in to accept this invitation.
              </p>
              <p className="text-xs text-blue-600">
                Make sure to use the email address:{" "}
                <strong>{invitation.email}</strong>
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleAcceptInvitation}
              disabled={accepting}
              className="w-full"
              size="lg"
            >
              {accepting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {user ? "Accepting..." : "Signing In..."}
                </>
              ) : user ? (
                "Accept Invitation"
              ) : (
                "Sign In to Accept"
              )}
            </Button>

            <Link href="/dashboard">
              <Button variant="outline" className="w-full">
                Maybe Later
              </Button>
            </Link>
          </div>

          {/* Help Text */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Don&apos;t want to join? You can safely ignore this invitation.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
