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
    <div className="flex min-h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <div data-tour="sidebar">
        <Sidebar />
      </div>

      {/* Continuous vertical separator line */}
      <div
        className={cn(
          "fixed top-0 bottom-0 z-30 hidden w-px bg-gray-200 transition-all duration-300 ease-out md:block",
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

        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Breadcrumb */}
            <div className="mb-6">
              <Breadcrumb />
            </div>

            {/* Page Content with animation */}
            <div key={pathname} className="animate-fade-in">
              {children}
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
