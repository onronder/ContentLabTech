/**
 * Professional Header Component
 * Clean header with search and user actions
 */

import { useState } from "react";
import { useUIState } from "@/hooks/state/useUIState";
import { useCommandPalette } from "@/components/common/CommandPalette";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Bell, Search, Menu, X, Command, Plus, HelpCircle } from "lucide-react";

export const Header = () => {
  const { mobileMenuOpen, setMobileMenuOpen } = useUIState();
  const { setOpen: setCommandPaletteOpen } = useCommandPalette();
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header
      className={cn(
        "z-sticky border-primary-200/30 sticky top-0 border-b bg-white/95 px-6 py-4 backdrop-blur-md",
        "glass shadow-sm transition-all duration-300 ease-out"
      )}
    >
      <div className="flex items-center justify-between">
        {/* Left side - Mobile menu button */}
        <div className="flex items-center space-x-6">
          <Button
            variant="ghost"
            size="sm"
            className="interactive hover:bg-primary-50 md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>

          {/* Page title or breadcrumb would go here */}
          <div className="hidden sm:block">
            <h1 className="font-display text-primary-900 text-xl font-semibold">
              Dashboard
            </h1>
          </div>
        </div>

        {/* Center - Enhanced Search */}
        <div className="mx-6 max-w-lg flex-1">
          <div className="relative">
            <Search
              className={cn(
                "absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 transform transition-colors duration-200",
                searchFocused ? "text-primary-500" : "text-neutral-400"
              )}
            />
            <Input
              placeholder="Search projects, content, keywords..."
              className={cn(
                "input-field cursor-pointer border-neutral-200 bg-neutral-50/50 pr-16 pl-12",
                "focus:border-primary-300 focus:shadow-primary focus:bg-white",
                "hover:border-primary-200 placeholder:text-neutral-500 hover:bg-white"
              )}
              onFocus={() => {
                setSearchFocused(true);
                setCommandPaletteOpen(true);
              }}
              onBlur={() => setSearchFocused(false)}
              onClick={() => setCommandPaletteOpen(true)}
              readOnly
            />
            <div className="absolute top-1/2 right-4 -translate-y-1/2 transform">
              <kbd className="hidden items-center rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 font-mono text-xs text-neutral-500 transition-colors hover:bg-neutral-100 sm:inline-flex">
                <Command className="mr-1 h-3 w-3" />K
              </kbd>
            </div>
          </div>
        </div>

        {/* Right side - Enhanced Actions */}
        <div className="flex items-center space-x-3">
          {/* Quick Action Button */}
          <Button
            variant="outline"
            size="sm"
            className="btn-primary hidden items-center space-x-2 sm:flex"
          >
            <Plus className="h-4 w-4" />
            <span>New</span>
          </Button>

          {/* Help Button */}
          <Button
            variant="ghost"
            size="sm"
            className="interactive hover:bg-neutral-50"
          >
            <HelpCircle className="h-5 w-5 text-neutral-500" />
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="sm"
            className="interactive relative hover:bg-neutral-50"
          >
            <Bell className="h-5 w-5 text-neutral-500" />
            {/* Enhanced notification badge */}
            <span className="bg-gradient-error shadow-error absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full">
              <span className="text-[10px] font-semibold text-white">3</span>
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
};
