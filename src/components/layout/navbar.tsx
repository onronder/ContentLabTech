"use client";

/**
 * Navbar Component
 * Main navigation bar with authentication and team management
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  Settings,
  LogOut,
  User,
  Menu,
  X,
} from "lucide-react";

import { useSupabaseAuth } from "@/hooks/auth/use-supabase-auth";
import { useAuth } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TeamSwitcher, CreateTeamDialog } from "@/components/team";

export const Navbar = () => {
  const { user, signOut } = useSupabaseAuth();
  const { currentTeam, currentTeamRole } = useAuth();
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);

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
      <nav className="bg-background/95 supports-[backdrop-filter]:bg-background/60 border-b backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            {/* Logo and Team Switcher */}
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="flex items-center space-x-2">
                <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-lg">
                  <span className="text-primary-foreground text-sm font-bold">
                    CN
                  </span>
                </div>
                <span className="hidden text-lg font-semibold sm:block">
                  ContentLab Nexus
                </span>
              </Link>

              <div className="hidden md:block">
                <TeamSwitcher
                  onCreateTeam={() => setCreateTeamOpen(true)}
                  className="w-64"
                />
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden items-center space-x-4 md:flex">
              <nav className="flex space-x-8">
                <Link
                  href="/dashboard"
                  className="text-foreground/60 hover:text-foreground px-3 py-2 text-sm font-medium transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/projects"
                  className="text-foreground/60 hover:text-foreground px-3 py-2 text-sm font-medium transition-colors"
                >
                  Projects
                </Link>
                <Link
                  href="/content"
                  className="text-foreground/60 hover:text-foreground px-3 py-2 text-sm font-medium transition-colors"
                >
                  Content
                </Link>
                <Link
                  href="/analytics"
                  className="text-foreground/60 hover:text-foreground px-3 py-2 text-sm font-medium transition-colors"
                >
                  Analytics
                </Link>
              </nav>

              {/* Notifications */}
              <Button variant="ghost" size="sm">
                <Bell className="h-5 w-5" />
              </Button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center space-x-2"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-sm">
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
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">
                        {getUserDisplayName()}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

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

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="space-y-1 border-t px-2 pt-2 pb-3 sm:px-3">
              {/* Team Switcher for Mobile */}
              <div className="px-3 py-2">
                <TeamSwitcher
                  onCreateTeam={() => {
                    setCreateTeamOpen(true);
                    setMobileMenuOpen(false);
                  }}
                />
              </div>

              {/* Navigation Links */}
              <Link
                href="/dashboard"
                className="text-foreground/60 hover:text-foreground block px-3 py-2 text-base font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href="/projects"
                className="text-foreground/60 hover:text-foreground block px-3 py-2 text-base font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Projects
              </Link>
              <Link
                href="/content"
                className="text-foreground/60 hover:text-foreground block px-3 py-2 text-base font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Content
              </Link>
              <Link
                href="/analytics"
                className="text-foreground/60 hover:text-foreground block px-3 py-2 text-base font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Analytics
              </Link>

              <div className="mt-4 border-t pt-4">
                <div className="flex items-center px-3 py-2">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{getUserInitials()}</AvatarFallback>
                  </Avatar>
                  <div className="ml-3">
                    <p className="text-base font-medium">
                      {getUserDisplayName()}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {user?.email}
                    </p>
                  </div>
                </div>

                <Link
                  href="/profile"
                  className="text-foreground/60 hover:text-foreground block px-3 py-2 text-base font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Profile
                </Link>
                <Link
                  href="/settings"
                  className="text-foreground/60 hover:text-foreground block px-3 py-2 text-base font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Settings
                </Link>
                <button
                  onClick={() => {
                    handleSignOut();
                    setMobileMenuOpen(false);
                  }}
                  className="text-foreground/60 hover:text-foreground block w-full px-3 py-2 text-left text-base font-medium"
                >
                  Sign Out
                </button>
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
