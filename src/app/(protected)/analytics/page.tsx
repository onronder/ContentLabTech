/**
 * Analytics Dashboard Page
 * Comprehensive analytics interface integrating 4-phase AI analysis system
 */

import { AppLayout } from "@/components/layout";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";

export default function AnalyticsPage() {
  return (
    <AppLayout>
      <AnalyticsDashboard />
    </AppLayout>
  );
}