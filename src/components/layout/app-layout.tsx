"use client";

/**
 * AppLayout Component
 * Professional layout wrapper for authenticated pages - COMPLETELY REPLACED
 */

import { ReactNode } from "react";

import { ProtectedRoute } from "@/components/auth";
import { MainLayout } from "./MainLayout";

interface AppLayoutProps {
  children: ReactNode;
  requireAuth?: boolean;
}

export const AppLayout = ({ children, requireAuth = true }: AppLayoutProps) => {
  const content = <MainLayout>{children}</MainLayout>;

  if (requireAuth) {
    return <ProtectedRoute>{content}</ProtectedRoute>;
  }

  return content;
};
