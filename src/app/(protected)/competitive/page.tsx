"use client";

import React, { Suspense } from "react";
import { CompetitiveDashboard } from "@/components/competitive/CompetitiveDashboard";
import { RealtimeDemo } from "@/components/competitive/RealtimeDemo";
import { useAuth } from "@/lib/auth/context";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded bg-gray-200" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded bg-gray-200" />
    </div>
  );
}

export default function CompetitivePage() {
  const { user, currentTeam } = useAuth();

  if (!user || !currentTeam) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  // Use the current team's ID as the project ID for now
  const projectId = currentTeam.id;

  if (!projectId) {
    return (
      <div className="p-8 text-center">
        <h2 className="mb-4 text-xl font-semibold">No Project Found</h2>
        <p className="mb-4 text-gray-600">
          You need to create a project to use competitive intelligence features.
        </p>
        <button className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Create Project
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <Suspense fallback={<DashboardSkeleton />}>
        <CompetitiveDashboard projectId={projectId} />
      </Suspense>
    </div>
  );
}
