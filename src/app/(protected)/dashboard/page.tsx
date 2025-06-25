"use client";

/**
 * Premium Dashboard Page
 * Executive-grade dashboard with sophisticated analytics and insights
 */

import { AppLayout } from "@/components/layout";
import { PremiumDashboard } from "@/components/dashboard/premium-dashboard";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <AppLayout>
      <PremiumDashboard />
    </AppLayout>
  );
}
