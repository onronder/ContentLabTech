"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppLayout } from "@/components/layout";

interface DebugData {
  debug: {
    userId: string;
    userEmail: string;
    totalTeams: number;
    totalTeamMembers: number;
    userTeamsCount: number;
    userMembershipsCount: number;
  };
  data: {
    allTeams: unknown[];
    allTeamMembers: unknown[];
    userTeams: unknown[];
    userMemberships: unknown[];
  };
  errors: {
    teamsError: string | null;
    teamMembersError: string | null;
    userTeamsError: string | null;
    membershipError: string | null;
  };
}

export default function DebugTeamsPage() {
  const [debugData, setDebugData] = useState<DebugData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [fixResult, setFixResult] = useState<unknown>(null);

  const renderResult = (result: unknown): string => {
    return JSON.stringify(result, null, 2);
  };

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/debug-team-membership");
      const data = await response.json();
      setDebugData(data);
    } catch (error) {
      console.error("Failed to run diagnostics:", error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultTeam = async () => {
    setFixing(true);
    try {
      const response = await fetch("/api/debug-team-membership", {
        method: "POST",
      });
      const data = await response.json();
      setFixResult(data);
      // Refresh diagnostics after fix
      await runDiagnostics();
    } catch (error) {
      console.error("Failed to create default team:", error);
      setFixResult({ error: "Failed to create default team" });
    } finally {
      setFixing(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Team Membership Debug Tool</h1>
          <p className="text-gray-600">
            Investigate and resolve team assignment issues
          </p>
        </div>

        <div className="flex space-x-4">
          <Button onClick={runDiagnostics} disabled={loading}>
            {loading ? "Running..." : "Run Diagnostics"}
          </Button>
          <Button
            onClick={createDefaultTeam}
            disabled={fixing}
            variant="secondary"
          >
            {fixing ? "Creating..." : "Create Default Team"}
          </Button>
        </div>

        {debugData && (
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold">Debug Results</h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">User Info:</h3>
                <div className="space-y-1 text-sm">
                  <p>User ID: {debugData.debug.userId}</p>
                  <p>Email: {debugData.debug.userEmail}</p>
                  <p>Total Teams in System: {debugData.debug.totalTeams}</p>
                  <p>
                    Total Team Members in System:{" "}
                    {debugData.debug.totalTeamMembers}
                  </p>
                  <p className="font-semibold text-red-600">
                    User&apos;s Teams: {debugData.debug.userTeamsCount}
                  </p>
                  <p className="font-semibold text-red-600">
                    User&apos;s Memberships:{" "}
                    {debugData.debug.userMembershipsCount}
                  </p>
                </div>
              </div>

              {Object.values(debugData.errors).some(error => error) && (
                <div>
                  <h3 className="font-semibold text-red-600">Errors:</h3>
                  <pre className="rounded bg-red-50 p-2 text-sm">
                    {JSON.stringify(debugData.errors, null, 2)}
                  </pre>
                </div>
              )}

              <div>
                <h3 className="font-semibold">All Teams in System:</h3>
                <pre className="max-h-40 overflow-auto rounded bg-gray-50 p-2 text-sm">
                  {JSON.stringify(debugData.data.allTeams, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold">All Team Members in System:</h3>
                <pre className="max-h-40 overflow-auto rounded bg-gray-50 p-2 text-sm">
                  {JSON.stringify(debugData.data.allTeamMembers, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold">User&apos;s Teams:</h3>
                <pre className="max-h-40 overflow-auto rounded bg-gray-50 p-2 text-sm">
                  {JSON.stringify(debugData.data.userTeams, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold">User&apos;s Memberships:</h3>
                <pre className="max-h-40 overflow-auto rounded bg-gray-50 p-2 text-sm">
                  {JSON.stringify(debugData.data.userMemberships, null, 2)}
                </pre>
              </div>
            </div>
          </Card>
        )}

        {fixResult ? (
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold">Fix Result</h2>
            <pre className="rounded bg-gray-50 p-2 text-sm">
              {renderResult(fixResult)}
            </pre>
          </Card>
        ) : null}
      </div>
    </AppLayout>
  );
}
