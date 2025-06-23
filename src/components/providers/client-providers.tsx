"use client";

/**
 * Client Providers
 * Wraps the app with client-side providers that need to run in the browser
 */

import { AuthProvider } from "@/lib/auth/context";

interface ClientProvidersProps {
  children: React.ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return <AuthProvider>{children}</AuthProvider>;
}
