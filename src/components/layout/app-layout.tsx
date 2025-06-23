"use client";

/**
 * AppLayout Component
 * Main layout wrapper for authenticated pages
 */

import { ReactNode } from "react";

import { ProtectedRoute } from "@/components/auth";
import { Navbar } from "./navbar";

interface AppLayoutProps {
  children: ReactNode;
  requireAuth?: boolean;
}

export const AppLayout = ({ children, requireAuth = true }: AppLayoutProps) => {
  const content = (
    <div className="bg-background min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );

  if (requireAuth) {
    return <ProtectedRoute>{content}</ProtectedRoute>;
  }

  return content;
};
