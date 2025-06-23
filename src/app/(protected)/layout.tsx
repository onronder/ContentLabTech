/**
 * Protected Layout
 * Forces dynamic rendering for all protected pages that require authentication
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  return <>{children}</>;
}
