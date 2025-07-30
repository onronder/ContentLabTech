/**
 * Professional Main Layout Component
 * Complete layout replacement with modern design
 */

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUIState } from "@/hooks/state/useUIState";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Breadcrumb } from "./Breadcrumb";
import {
  CommandPalette,
  useCommandPalette,
} from "@/components/common/CommandPalette";
import { ContextualActions } from "@/components/common/ContextualActions";

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const { sidebarExpanded } = useUIState();
  const pathname = usePathname();
  const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen } =
    useCommandPalette();

  return (
    <div className="bg-gradient-neutral flex min-h-screen overflow-hidden">
      {/* Sidebar */}
      <div data-tour="sidebar" className="z-fixed">
        <Sidebar />
      </div>

      {/* Elegant vertical separator with gradient */}
      <div
        className={cn(
          "z-sticky fixed top-0 bottom-0 hidden w-px transition-all duration-300 ease-out md:block",
          "bg-gradient-to-b from-transparent via-neutral-200 to-transparent",
          sidebarExpanded ? "left-64" : "left-16"
        )}
      />

      {/* Main Content Area */}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col transition-all duration-300 ease-out",
          "md:ml-64"
        )}
      >
        <Header />

        <main className="scrollbar-thin flex-1 overflow-y-auto">
          <div className="main-content">
            {/* Breadcrumb */}
            <div className="mb-8">
              <Breadcrumb />
            </div>

            {/* Page Content with enhanced animation */}
            <div key={pathname} className="animate-fade-in">
              <div className="space-y-8">{children}</div>
            </div>
          </div>
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />

      {/* Contextual Quick Actions */}
      <ContextualActions />
    </div>
  );
};
