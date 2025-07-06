"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppLayout } from "@/components/layout";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users,
  Activity,
} from "lucide-react";

interface Analysis {
  totalUsers: number;
  totalTeams: number;
  totalTeamMembers: number;
  usersWithoutTeams: number;
  teamsWithMissingOwners: number;
  usersWithoutTeamsList: Array<{
    id: string;
    email: string;
    created_at: string;
  }>;
  teamsWithMissingOwnersList: Array<{
    id: string;
    name: string;
    owner_id: string;
    created_at: string;
  }>;
}

interface FixResult {
  success: boolean;
  message: string;
  details?: unknown;
}

interface FixSummary {
  totalFixes: number;
  successful: number;
  failed: number;
  usersFixed: number;
  teamsFixed: number;
}

export default function FixTeamsPage() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [fixResults, setFixResults] = useState<{
    summary: FixSummary;
    fixes: FixResult[];
  } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [fixing, setFixing] = useState(false);

  const renderDetails = (details: unknown): string => {
    if (typeof details === "string") return details;
    return JSON.stringify(details, null, 2);
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const response = await fetch("/api/fix-team-assignments");
      const data = await response.json();

      if (response.ok) {
        setAnalysis(data.analysis);
      } else {
        console.error("Analysis failed:", data);
        alert(`Analysis failed: ${data.error}`);
      }
    } catch (error) {
      console.error("Failed to run analysis:", error);
      alert("Failed to run analysis");
    } finally {
      setAnalyzing(false);
    }
  };

  const runFix = async () => {
    setFixing(true);
    try {
      const response = await fetch("/api/fix-team-assignments", {
        method: "POST",
      });
      const data = await response.json();

      if (response.ok) {
        setFixResults(data);
        // Refresh analysis after fix
        await runAnalysis();
      } else {
        console.error("Fix failed:", data);
        alert(`Fix failed: ${data.error}`);
      }
    } catch (error) {
      console.error("Failed to run fix:", error);
      alert("Failed to run fix");
    } finally {
      setFixing(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Team Assignment Fix Tool</h1>
          <p className="text-gray-600">
            Diagnose and resolve &ldquo;No Team Selected&rdquo; issues
          </p>
        </div>

        <div className="flex space-x-4">
          <Button onClick={runAnalysis} disabled={analyzing}>
            {analyzing ? "Analyzing..." : "Run Analysis"}
          </Button>
          {analysis && (
            <Button
              onClick={runFix}
              disabled={fixing}
              variant={
                analysis.usersWithoutTeams > 0 ||
                analysis.teamsWithMissingOwners > 0
                  ? "default"
                  : "secondary"
              }
            >
              {fixing ? "Fixing..." : "Fix Issues"}
            </Button>
          )}
        </div>

        {analysis && (
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold">Analysis Results</h2>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg bg-blue-50 p-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-blue-900">
                    Total Users
                  </span>
                </div>
                <p className="text-2xl font-bold text-blue-900">
                  {analysis.totalUsers}
                </p>
              </div>

              <div className="rounded-lg bg-green-50 p-4">
                <div className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-900">
                    Total Teams
                  </span>
                </div>
                <p className="text-2xl font-bold text-green-900">
                  {analysis.totalTeams}
                </p>
              </div>

              <div className="rounded-lg bg-purple-50 p-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  <span className="font-semibold text-purple-900">
                    Team Members
                  </span>
                </div>
                <p className="text-2xl font-bold text-purple-900">
                  {analysis.totalTeamMembers}
                </p>
              </div>
            </div>

            {/* Issues Found */}
            <div className="space-y-4">
              {analysis.usersWithoutTeams > 0 && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                  <div className="mb-2 flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    <span className="font-semibold text-orange-900">
                      Users Without Teams: {analysis.usersWithoutTeams}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {analysis.usersWithoutTeamsList.map(user => (
                      <div key={user.id} className="text-sm text-orange-800">
                        {user.email} (ID: {user.id})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.teamsWithMissingOwners > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="mb-2 flex items-center space-x-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="font-semibold text-red-900">
                      Teams Missing Owner Memberships:{" "}
                      {analysis.teamsWithMissingOwners}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {analysis.teamsWithMissingOwnersList.map(team => (
                      <div key={team.id} className="text-sm text-red-800">
                        {team.name} (Owner ID: {team.owner_id})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.usersWithoutTeams === 0 &&
                analysis.teamsWithMissingOwners === 0 && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-green-900">
                        No Issues Found - All users have proper team
                        assignments!
                      </span>
                    </div>
                  </div>
                )}
            </div>
          </Card>
        )}

        {fixResults && (
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold">Fix Results</h2>

            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {fixResults.summary.totalFixes}
                </div>
                <div className="text-sm text-gray-600">Total Fixes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {fixResults.summary.successful}
                </div>
                <div className="text-sm text-gray-600">Successful</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {fixResults.summary.failed}
                </div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {fixResults.summary.usersFixed}
                </div>
                <div className="text-sm text-gray-600">Users Fixed</div>
              </div>
            </div>

            <div className="space-y-2">
              {fixResults.fixes.map((fix, index) => (
                <div
                  key={index}
                  className={`rounded-lg border p-3 ${
                    fix.success
                      ? "border-green-200 bg-green-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {fix.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span
                      className={`text-sm ${fix.success ? "text-green-800" : "text-red-800"}`}
                    >
                      {fix.message}
                    </span>
                  </div>
                  {fix.details ? (
                    <pre className="mt-2 overflow-auto rounded bg-gray-100 p-2 text-xs">
                      {renderDetails(fix.details)}
                    </pre>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
