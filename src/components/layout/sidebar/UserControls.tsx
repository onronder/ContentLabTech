/**
 * User Controls Component
 * Professional user profile and controls for sidebar
 */

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUIState } from "@/hooks/state/useUIState";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Settings,
  HelpCircle,
} from "lucide-react";

export const UserControls = () => {
  const { sidebarExpanded, toggleSidebar } = useUIState();
  const router = useRouter();

  // Mock user data - replace with actual user context
  const user = {
    name: "John Doe",
    email: "john@example.com",
    avatar: null,
    initials: "JD",
  };

  const handleSignOut = () => {
    // Handle sign out logic
    router.push("/auth/signin");
  };

  return (
    <div className="space-y-3 p-3">
      {/* User Profile */}
      {sidebarExpanded && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-blue-100 text-sm font-medium text-blue-600">
                {user.initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">
                {user.name}
              </p>
              <p className="truncate text-xs text-gray-500">{user.email}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-3 flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-gray-200"
              onClick={() => router.push("/profile")}
            >
              <User className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-gray-200"
              onClick={() => router.push("/settings")}
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-gray-200"
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-7 w-7 p-0 hover:bg-red-100 hover:text-red-600"
              onClick={handleSignOut}
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Sidebar Toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleSidebar}
        className={cn(
          "w-full justify-center transition-all duration-200 hover:bg-gray-100",
          sidebarExpanded ? "justify-between" : "justify-center"
        )}
      >
        {sidebarExpanded && (
          <span className="text-xs font-medium text-gray-600">Collapse</span>
        )}
        {sidebarExpanded ? (
          <ChevronLeft className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
      </Button>
    </div>
  );
};
