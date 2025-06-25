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
      <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="animate-fade-in-up">{children}</div>
      </main>
    </div>
  );

  if (requireAuth) {
    return <ProtectedRoute>{content}</ProtectedRoute>;
  }

  return content;
};
