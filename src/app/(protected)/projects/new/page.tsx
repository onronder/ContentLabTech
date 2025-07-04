"use client";

/**
 * Project New Page (Redirect)
 * Redirects to the main project creation page
 */

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

export default function NewProjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Preserve any query parameters when redirecting
    const params = searchParams.toString();
    const redirectUrl = params
      ? `/projects/create?${params}`
      : "/projects/create";
    router.replace(redirectUrl);
  }, [router, searchParams]);

  // Show loading state while redirecting
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <p className="text-gray-600">Redirecting to project creation...</p>
      </div>
    </div>
  );
}
