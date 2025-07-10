/**
 * Team Context Debug Component
 * Shows real-time team context state for debugging
 */

"use client";

import React from "react";
import { useAuth } from "@/lib/auth/context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const TeamContextDebug = () => {
  const {
    user,
    currentTeam,
    teams,
    teamsLoading,
    currentTeamRole,
    loading,
    session,
  } = useAuth();

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔍 Team Context Debug
          <Badge variant={currentTeam ? "default" : "destructive"}>
            {currentTeam ? "Team Active" : "No Team"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Auth Status */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700">
            Authentication
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              Loading:{" "}
              <Badge variant={loading ? "secondary" : "outline"}>
                {loading.toString()}
              </Badge>
            </div>
            <div>
              Session:{" "}
              <Badge variant={session ? "default" : "destructive"}>
                {session ? "Active" : "None"}
              </Badge>
            </div>
            <div>
              User ID:{" "}
              <code className="rounded bg-gray-100 px-1 text-xs">
                {user?.id || "null"}
              </code>
            </div>
            <div>
              Email:{" "}
              <code className="rounded bg-gray-100 px-1 text-xs">
                {user?.email || "null"}
              </code>
            </div>
          </div>
        </div>

        {/* Teams Status */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700">Teams</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              Loading:{" "}
              <Badge variant={teamsLoading ? "secondary" : "outline"}>
                {teamsLoading.toString()}
              </Badge>
            </div>
            <div>
              Count: <Badge variant="outline">{teams?.length || 0}</Badge>
            </div>
          </div>
        </div>

        {/* Current Team */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700">Current Team</h4>
          {currentTeam ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  ID:{" "}
                  <code className="rounded bg-gray-100 px-1 text-xs">
                    {currentTeam.id}
                  </code>
                </div>
                <div>
                  Role: <Badge variant="secondary">{currentTeamRole}</Badge>
                </div>
              </div>
              <div>
                Name: <strong>{currentTeam.name}</strong>
              </div>
              <div>
                Description: {currentTeam.description || "No description"}
              </div>
            </div>
          ) : (
            <Badge variant="destructive">No current team selected</Badge>
          )}
        </div>

        {/* Available Teams */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700">
            Available Teams
          </h4>
          {teams && teams.length > 0 ? (
            <div className="space-y-2">
              {teams.map(team => (
                <div
                  key={team.id}
                  className={`rounded border p-2 text-sm ${
                    team.id === currentTeam?.id
                      ? "border-blue-200 bg-blue-50"
                      : "bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <strong>{team.name}</strong>
                    <Badge variant="outline">{team.userRole}</Badge>
                  </div>
                  <div className="text-xs text-gray-600">ID: {team.id}</div>
                </div>
              ))}
            </div>
          ) : (
            <Badge variant="outline">No teams available</Badge>
          )}
        </div>

        {/* Raw Debug Data */}
        <details className="text-xs">
          <summary className="cursor-pointer font-semibold">
            Raw Debug Data
          </summary>
          <pre className="mt-2 overflow-auto rounded bg-gray-100 p-2 text-xs">
            {JSON.stringify(
              {
                user: user ? { id: user.id, email: user.email } : null,
                currentTeam: currentTeam
                  ? { id: currentTeam.id, name: currentTeam.name }
                  : null,
                teams:
                  teams?.map(t => ({
                    id: t.id,
                    name: t.name,
                    role: t.userRole,
                  })) || [],
                loading,
                teamsLoading,
                currentTeamRole,
                hasSession: !!session,
              },
              null,
              2
            )}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
};
