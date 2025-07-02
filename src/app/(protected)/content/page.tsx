/**
 * Content Management Page
 * Main interface for managing content items with AI-powered analysis
 */

import { AppLayout } from "@/components/layout";
import { ContentManager } from "@/components/content/ContentManager";

export default function ContentPage() {
  return (
    <AppLayout>
      <ContentManager />
    </AppLayout>
  );
}