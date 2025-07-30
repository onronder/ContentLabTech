/**
 * Professional Sidebar Component
 * Modern glass morphism design with enhanced navigation
 */

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useUIState } from "@/hooks/state/useUIState";
import { Logo } from "@/components/common/Logo";
import { EnhancedNavItems } from "./sidebar/EnhancedNavItems";
import { UserControls } from "./sidebar/UserControls";

export const Sidebar = () => {
  const { sidebarExpanded, mobileMenuOpen, setMobileMenuOpen } = useUIState();

  // Handle mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mobileMenuOpen, setMobileMenuOpen]);

  // Mobile overlay
  if (
    typeof window !== "undefined" &&
    window.innerWidth < 768 &&
    mobileMenuOpen
  ) {
    return (
      <>
        {/* Mobile backdrop */}
        <div
          className="z-modal-backdrop fixed inset-0 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />

        {/* Mobile sidebar */}
        <aside
          className={cn(
            "z-modal fixed top-0 left-0 h-full w-64 md:hidden",
            "bg-gradient-primary-soft border-primary-200 border-r",
            "glass-dark shadow-2xl backdrop-blur-md",
            "transform transition-transform duration-300 ease-out",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <SidebarContent />
        </aside>
      </>
    );
  }

  // Desktop sidebar
  return (
    <aside
      className={cn(
        "z-fixed fixed top-0 left-0 hidden h-full md:block",
        "bg-gradient-primary-soft border-primary-200 border-r",
        "glass shadow-lg backdrop-blur-md",
        "transition-all duration-300 ease-out",
        sidebarExpanded ? "w-64" : "w-16"
      )}
    >
      <SidebarContent />
    </aside>
  );
};

const SidebarContent = () => {
  return (
    <div className="flex h-full flex-col">
      {/* Logo Section */}
      <div className="border-primary-200/50 from-primary-100/30 border-b bg-gradient-to-r to-transparent backdrop-blur-sm">
        <Logo />
      </div>

      {/* Navigation Items */}
      <div className="scrollbar-thin flex-1 overflow-y-auto py-6">
        <EnhancedNavItems />
      </div>

      {/* User Controls */}
      <div className="border-primary-200/50 from-primary-100/30 border-t bg-gradient-to-r to-transparent backdrop-blur-sm">
        <UserControls />
      </div>
    </div>
  );
};
