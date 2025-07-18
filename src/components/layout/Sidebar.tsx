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
            "border-primary/20 from-primary-50/80 to-secondary-50/30 fixed top-0 left-0 z-50 h-full w-64 border-r bg-gradient-to-b via-white shadow-xl",
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
        "from-primary-50/80 to-secondary-50/30 bg-gradient-to-b via-white",
        "border-primary/20 shadow-primary/10 border-r shadow-lg",
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
      <div className="border-primary/20 from-primary-100/50 border-b bg-gradient-to-r to-transparent">
        <Logo />
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto py-4">
        <EnhancedNavItems />
      </div>

      {/* User Controls */}
      <div className="border-primary/20 from-primary-100/50 border-t bg-gradient-to-r to-transparent">
        <UserControls />
      </div>
    </div>
  );
};
