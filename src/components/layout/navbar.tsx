"use client";

/**
 * Navbar Component
 * Main navigation bar with authentication and team management
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  Settings,
  LogOut,
  User,
  Menu,
  X,
  Home,
  FolderOpen,
  FileText,
  BarChart3,
  Sparkles,
  Search,
  Command,
} from "lucide-react";

import { useSupabaseAuth } from "@/hooks/auth/use-supabase-auth";
import { useAuth } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TeamSwitcher, CreateTeamDialog } from "@/components/team";

export const Navbar = () => {
  const { user, signOut } = useSupabaseAuth();
  const { currentTeam, currentTeamRole } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);

  const navigationItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: Home,
      current: pathname === "/dashboard",
    },
    {
      name: "Projects",
      href: "/projects",
      icon: FolderOpen,
      current: pathname.startsWith("/projects"),
    },
    {
      name: "Content",
      href: "/content",
      icon: FileText,
      current: pathname.startsWith("/content"),
    },
    {
      name: "Analytics",
      href: "/analytics",
      icon: BarChart3,
      current: pathname.startsWith("/analytics"),
    },
  ];

  const handleSignOut = async () => {
    await signOut();
    router.push("/auth/signin");
  };

  const getUserInitials = () => {
    if (user?.user_metadata?.["full_name"]) {
      return user.user_metadata["full_name"]
        .split(" ")
        .map((word: string) => word.charAt(0))
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.charAt(0).toUpperCase() || "U";
  };

  const getUserDisplayName = () => {
    return (
      user?.user_metadata?.["full_name"] || user?.email?.split("@")[0] || "User"
    );
  };

  return (
    <>
      <nav className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 border-b backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            {/* Logo and Team Switcher */}
            <div className="flex items-center space-x-6">
              <Link
                href="/dashboard"
                className="group flex items-center space-x-3"
              >
                <div className="bg-gradient-primary flex h-9 w-9 items-center justify-center rounded-xl transition-transform group-hover:scale-105">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div className="hidden sm:block">
                  <span className="text-gradient-primary text-xl font-bold">
                    ContentLab Nexus
                  </span>
                  <p className="text-muted-foreground -mt-1 text-xs">
                    AI-Powered Content Intelligence
                  </p>
                </div>
              </Link>

              <div className="hidden lg:block">
                <TeamSwitcher
                  onCreateTeam={() => setCreateTeamOpen(true)}
                  className="w-64"
                />
              </div>
            </div>

            {/* Center Navigation */}
            <div className="hidden items-center space-x-1 md:flex">
              <nav className="flex space-x-1">
                {navigationItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                        item.current
                          ? "bg-brand-blue-100 dark:bg-brand-blue-900 text-brand-blue-700 dark:text-brand-blue-300"
                          : "text-foreground/60 hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right side actions */}
            <div className="flex items-center space-x-3">
              {/* Search */}
              <div className="hidden md:block">
                <div className="relative">
                  <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
                  <Input
                    placeholder="Search... (⌘K)"
                    className="bg-muted/50 focus:bg-background w-64 border-0 pr-4 pl-10"
                  />
                  <div className="absolute top-1/2 right-3 -translate-y-1/2 transform">
                    <kbd className="bg-muted text-muted-foreground inline-flex items-center rounded border px-1.5 py-0.5 text-xs">
                      <Command className="mr-1 h-3 w-3" />K
                    </kbd>
                  </div>
                </div>
              </div>

              {/* Notifications */}
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                <Badge className="bg-brand-amber absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center p-0 text-xs text-white">
                  3
                </Badge>
              </Button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="hover:bg-muted flex items-center space-x-3 rounded-lg px-3 py-2"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gradient-secondary text-sm text-white">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden text-left lg:block">
                      <p className="text-sm font-medium">
                        {getUserDisplayName()}
                      </p>
                      {currentTeam && currentTeamRole && (
                        <p className="text-muted-foreground text-xs">
                          {currentTeamRole} in {currentTeam.name}
                        </p>
                      )}
                    </div>
                    <ChevronDown className="text-muted-foreground h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-2">
                  <DropdownMenuLabel className="p-3">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-gradient-primary text-white">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <p className="text-sm font-medium">
                          {getUserDisplayName()}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {user?.email}
                        </p>
                        {currentTeam && (
                          <Badge
                            variant="secondary"
                            className="mt-1 w-fit text-xs"
                          >
                            {currentTeamRole}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link
                      href="/profile"
                      className="flex items-center rounded-md p-2"
                    >
                      <User className="mr-3 h-4 w-4" />
                      <span>Profile Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link
                      href="/settings"
                      className="flex items-center rounded-md p-2"
                    >
                      <Settings className="mr-3 h-4 w-4" />
                      <span>App Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-destructive focus:text-destructive cursor-pointer rounded-md p-2"
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile menu button */}
              <div className="flex items-center md:hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Mobile menu */}
        {mobileMenuOpen && (
          <div className="bg-background/95 border-t backdrop-blur md:hidden">
            <div className="space-y-1 px-4 pt-4 pb-6">
              {/* Team Switcher for Mobile */}
              <div className="mb-4">
                <TeamSwitcher
                  onCreateTeam={() => {
                    setCreateTeamOpen(true);
                    setMobileMenuOpen(false);
                  }}
                />
              </div>

              {/* Search for Mobile */}
              <div className="relative mb-4">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
                <Input
                  placeholder="Search..."
                  className="bg-muted/50 border-0 pl-10"
                />
              </div>

              {/* Navigation Links */}
              <div className="space-y-1">
                {navigationItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center space-x-3 rounded-lg px-3 py-3 text-base font-medium transition-colors ${
                        item.current
                          ? "bg-brand-blue-100 dark:bg-brand-blue-900 text-brand-blue-700 dark:text-brand-blue-300"
                          : "text-foreground/60 hover:text-foreground hover:bg-muted"
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>

              {/* User Section */}
              <div className="mt-6 border-t pt-4">
                <div className="mb-3 flex items-center px-3 py-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-gradient-primary text-white">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="ml-3 flex-1">
                    <p className="text-base font-medium">
                      {getUserDisplayName()}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {user?.email}
                    </p>
                    {currentTeam && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {currentTeamRole} in {currentTeam.name}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <Link
                    href="/profile"
                    className="text-foreground/60 hover:text-foreground hover:bg-muted flex items-center space-x-3 rounded-lg px-3 py-2 text-base font-medium transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="h-5 w-5" />
                    <span>Profile Settings</span>
                  </Link>
                  <Link
                    href="/settings"
                    className="text-foreground/60 hover:text-foreground hover:bg-muted flex items-center space-x-3 rounded-lg px-3 py-2 text-base font-medium transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Settings className="h-5 w-5" />
                    <span>App Settings</span>
                  </Link>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setMobileMenuOpen(false);
                    }}
                    className="text-destructive hover:bg-destructive/10 flex w-full items-center space-x-3 rounded-lg px-3 py-2 text-base font-medium transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      <CreateTeamDialog
        open={createTeamOpen}
        onOpenChange={setCreateTeamOpen}
        onSuccess={() => setCreateTeamOpen(false)}
      />
    </>
  );
};
