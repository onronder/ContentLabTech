/**
 * Team Management Page
 * Team member management with role assignment and collaboration features
 */

import { AppLayout } from "@/components/layout";
import { TeamManager } from "@/components/team/TeamManager";

export default function TeamPage() {
  return (
    <AppLayout>
      <TeamManager />
    </AppLayout>
  );
}