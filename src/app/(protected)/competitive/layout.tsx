"use client";

import { ReactNode } from "react";
import { AppLayout } from "@/components/layout/app-layout";

interface CompetitiveLayoutProps {
  children: ReactNode;
}

export default function CompetitiveLayout({
  children,
}: CompetitiveLayoutProps) {
  return <AppLayout>{children}</AppLayout>;
}
