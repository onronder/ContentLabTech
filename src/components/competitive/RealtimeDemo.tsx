/**
 * Competitive Real-Time Demo Component
 * Demonstrates real-time competitive intelligence features
 */

"use client";

import React from "react";
import { RealtimeDemo as BaseRealtimeDemo } from "@/components/realtime/RealtimeDemo";
import { useAuth } from "@/lib/auth/context";

interface CompetitiveRealtimeDemoProps {
  projectId?: string;
}

export function RealtimeDemo({ projectId }: CompetitiveRealtimeDemoProps) {
  const { currentTeam } = useAuth();

  if (!currentTeam) {
    return null;
  }

  return <BaseRealtimeDemo teamId={currentTeam.id} projectId={projectId} />;
}
