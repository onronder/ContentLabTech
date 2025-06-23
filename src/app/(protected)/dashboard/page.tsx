"use client";

/**
 * Dashboard Page
 * Main dashboard for authenticated users
 */

import { AppLayout } from "@/components/layout";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to ContentLab Nexus. Monitor your content performance and
            manage your projects.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Quick Stats Cards */}
          <div className="bg-card text-card-foreground rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Total Projects
                </p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
                <span className="text-primary text-sm">📁</span>
              </div>
            </div>
          </div>

          <div className="bg-card text-card-foreground rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Content Items
                </p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
                <span className="text-primary text-sm">📝</span>
              </div>
            </div>
          </div>

          <div className="bg-card text-card-foreground rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Team Members
                </p>
                <p className="text-2xl font-bold">1</p>
              </div>
              <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
                <span className="text-primary text-sm">👥</span>
              </div>
            </div>
          </div>
        </div>

        {/* Welcome Section */}
        <div className="bg-card text-card-foreground rounded-lg border p-8">
          <div className="space-y-4 text-center">
            <h2 className="text-2xl font-bold">Welcome to ContentLab Nexus</h2>
            <p className="text-muted-foreground mx-auto max-w-2xl">
              Get started by creating your first project or inviting team
              members to collaborate. Our platform helps you analyze content
              performance, track competitors, and optimize your content
              strategy.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 transition-colors">
                Create First Project
              </button>
              <button className="border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md border px-4 py-2 transition-colors">
                Invite Team Members
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
