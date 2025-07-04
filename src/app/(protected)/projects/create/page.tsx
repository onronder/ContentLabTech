"use client";

/**
 * Project Creation Page
 * Full-page project creation form with role-based setup
 */

import { AppLayout } from "@/components/layout";
import { CreateProjectForm } from "@/components/projects/CreateProjectForm";

export const dynamic = "force-dynamic";

export default function CreateProjectPage() {
  return (
    <AppLayout>
      <CreateProjectForm />
    </AppLayout>
  );
}
