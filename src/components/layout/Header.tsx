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
        "sticky top-0 z-30 border-b border-gray-200/50 bg-white/95 px-4 py-3 backdrop-blur-sm",
        "transition-all duration-300 ease-out"
      )}
    >
      <div className="flex items-center justify-between">
        {/* Left side - Mobile menu button */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-gray-100 md:hidden"
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
            <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
          </div>
        </div>

        {/* Center - Search */}
        <div className="mx-4 max-w-lg flex-1">
          <div className="relative">
            <Search
              className={cn(
                "absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform transition-colors duration-200",
                searchFocused ? "text-blue-500" : "text-gray-400"
              )}
            />
            <Input
              placeholder="Search projects, content, keywords..."
              className={cn(
                "cursor-pointer border-gray-200 bg-gray-50/50 pl-10 transition-all duration-200",
                "focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100",
                "placeholder:text-gray-500"
              )}
              onFocus={() => {
                setSearchFocused(true);
                setCommandPaletteOpen(true);
              }}
              onBlur={() => setSearchFocused(false)}
              onClick={() => setCommandPaletteOpen(true)}
              readOnly
            />
            <div className="absolute top-1/2 right-3 -translate-y-1/2 transform">
              <kbd className="hidden items-center rounded border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-xs text-gray-500 transition-colors hover:bg-gray-100 sm:inline-flex">
                <Command className="mr-1 h-3 w-3" />K
              </kbd>
            </div>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-2">
          {/* Quick Action Button */}
          <Button
            variant="outline"
            size="sm"
            className="hidden items-center space-x-2 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 sm:flex"
          >
            <Plus className="h-4 w-4" />
            <span>New</span>
          </Button>

          {/* Help Button */}
          <Button variant="ghost" size="sm" className="hover:bg-gray-100">
            <HelpCircle className="h-5 w-5 text-gray-500" />
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="sm"
            className="relative hover:bg-gray-100"
          >
            <Bell className="h-5 w-5 text-gray-500" />
            {/* Notification badge */}
            <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500">
              <span className="text-[10px] font-medium text-white">3</span>
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
};
