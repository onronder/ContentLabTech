/**
 * Auth Layout
 * Forces dynamic rendering for all authentication pages
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return <>{children}</>;
}
