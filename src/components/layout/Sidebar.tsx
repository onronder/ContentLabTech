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
          className="bg-opacity-50 fixed inset-0 z-40 bg-black md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />

        {/* Mobile sidebar */}
        <aside
          className={cn(
            "fixed top-0 left-0 z-50 h-full w-64 border-r border-gray-200 bg-white shadow-xl",
            "transform transition-transform duration-300 ease-in-out md:hidden",
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
        "fixed top-0 left-0 z-40 hidden h-full md:block",
        "bg-gradient-to-b from-white via-blue-50/20 to-white",
        "border-r border-blue-100/50 shadow-lg shadow-blue-100/50",
        "backdrop-blur-sm transition-all duration-300 ease-out",
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
      <div className="border-b border-blue-100/50 bg-gradient-to-r from-blue-50/30 to-transparent">
        <Logo />
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto py-4">
        <EnhancedNavItems />
      </div>

      {/* User Controls */}
      <div className="border-t border-blue-100/50 bg-gradient-to-r from-blue-50/30 to-transparent">
        <UserControls />
      </div>
    </div>
  );
};
