"use client";

/**
 * Adaptive Dashboard Page
 * Role-based adaptive dashboard with intelligent interface switching
 */

import { AppLayout } from "@/components/layout";
import { AdaptiveDashboard } from "@/components/dashboard/AdaptiveDashboard";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <AppLayout>
      <AdaptiveDashboard />
    </AppLayout>
  );
}
