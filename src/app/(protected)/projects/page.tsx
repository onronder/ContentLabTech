"use client";

/**
 * Projects Management Page
 * Comprehensive project management interface with advanced CRUD operations
 */

import { AppLayout } from "@/components/layout";
import { ProjectsManager } from "@/components/projects/ProjectsManager";

export const dynamic = "force-dynamic";

export default function ProjectsPage() {
  return (
    <AppLayout>
      <ProjectsManager />
    </AppLayout>
  );
}