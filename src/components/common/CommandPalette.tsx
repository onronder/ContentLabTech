/**
 * Professional Command Palette Component
 * Linear-inspired command-driven interface with keyboard shortcuts
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { cn } from "@/lib/utils";
import {
  FolderOpen,
  BarChart3,
  FileText,
  Target,
  Users,
  Settings,
  Plus,
  Search,
  Lightbulb,
  Zap,
  TrendingUp,
  Calendar,
  Download,
  Upload,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  action: () => void;
  group: string;
  keywords?: string[];
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CommandPalette = ({ open, onOpenChange }: CommandPaletteProps) => {
  const router = useRouter();
  const [search, setSearch] = useState("");

  // Command items with comprehensive actions
  const commands: CommandItem[] = useMemo(
    () => [
      // Navigation Commands
      {
        id: "nav-dashboard",
        label: "Go to Dashboard",
        description: "View overview and insights",
        icon: BarChart3,
        action: () => router.push("/dashboard"),
        group: "Navigation",
        keywords: ["home", "overview", "main"],
      },
      {
        id: "nav-projects",
        label: "Go to Projects",
        description: "Manage your projects",
        icon: FolderOpen,
        action: () => router.push("/projects"),
        group: "Navigation",
        keywords: ["workspace", "folders"],
      },
      {
        id: "nav-content",
        label: "Go to Content",
        description: "Content management",
        icon: FileText,
        action: () => router.push("/content"),
        group: "Navigation",
        keywords: ["articles", "posts", "writing"],
      },
      {
        id: "nav-analytics",
        label: "Go to Analytics",
        description: "Performance metrics and insights",
        icon: TrendingUp,
        action: () => router.push("/analytics"),
        group: "Navigation",
        keywords: ["metrics", "data", "reports"],
      },
      {
        id: "nav-competitive",
        label: "Go to Competitive Analysis",
        description: "Monitor competitors",
        icon: Target,
        action: () => router.push("/competitive"),
        group: "Navigation",
        keywords: ["competitors", "market", "analysis"],
      },
      {
        id: "nav-team",
        label: "Go to Team",
        description: "Team management",
        icon: Users,
        action: () => router.push("/team"),
        group: "Navigation",
        keywords: ["members", "collaboration"],
      },
      {
        id: "nav-settings",
        label: "Go to Settings",
        description: "Account and preferences",
        icon: Settings,
        action: () => router.push("/settings"),
        group: "Navigation",
        keywords: ["preferences", "account", "config"],
      },

      // Quick Actions
      {
        id: "action-new-project",
        label: "Create New Project",
        description: "Start a new content project",
        icon: Plus,
        action: () => router.push("/projects/new"),
        group: "Quick Actions",
        keywords: ["create", "new", "start"],
      },
      {
        id: "action-content-gap",
        label: "Analyze Content Gap",
        description: "Find content opportunities",
        icon: Search,
        action: () => router.push("/content/gap-analysis"),
        group: "Quick Actions",
        keywords: ["opportunity", "gap", "research"],
      },
      {
        id: "action-keyword-research",
        label: "Keyword Research",
        description: "Discover high-value keywords",
        icon: Lightbulb,
        action: () => router.push("/content/keyword-research"),
        group: "Quick Actions",
        keywords: ["keywords", "seo", "research"],
      },
      {
        id: "action-competitor-analysis",
        label: "Run Competitor Analysis",
        description: "Analyze competitor strategies",
        icon: Zap,
        action: () => router.push("/competitive/analyze"),
        group: "Quick Actions",
        keywords: ["competitor", "analysis", "strategy"],
      },

      // Tools & Features
      {
        id: "tool-calendar",
        label: "Content Calendar",
        description: "Plan and schedule content",
        icon: Calendar,
        action: () => router.push("/content/calendar"),
        group: "Tools",
        keywords: ["schedule", "planning", "calendar"],
      },
      {
        id: "tool-export",
        label: "Export Data",
        description: "Download reports and analytics",
        icon: Download,
        action: () => {
          // Export functionality - placeholder
          void 0;
        },
        group: "Tools",
        keywords: ["download", "export", "backup"],
      },
      {
        id: "tool-import",
        label: "Import Data",
        description: "Upload content or data",
        icon: Upload,
        action: () => {
          // Import functionality - placeholder
          void 0;
        },
        group: "Tools",
        keywords: ["upload", "import", "data"],
      },
      {
        id: "tool-refresh",
        label: "Refresh All Data",
        description: "Update all metrics and data",
        icon: RefreshCw,
        action: () => {
          // Refresh functionality
          window.location.reload();
        },
        group: "Tools",
        keywords: ["refresh", "update", "sync"],
      },
    ],
    [router]
  );

  // Filter commands based on search
  const filteredCommands = commands.filter(command => {
    const searchTerms = search.toLowerCase().split(" ");
    return searchTerms.every(
      term =>
        command.label.toLowerCase().includes(term) ||
        command.description?.toLowerCase().includes(term) ||
        command.keywords?.some(keyword => keyword.toLowerCase().includes(term))
    );
  });

  // Group filtered commands
  const groupedCommands = filteredCommands.reduce(
    (groups, command) => {
      if (!groups[command.group]) {
        groups[command.group] = [];
      }
      groups[command.group]?.push(command);
      return groups;
    },
    {} as Record<string, CommandItem[]>
  );

  // Handle command selection
  const handleSelect = useCallback(
    (commandId: string) => {
      const command = commands.find(cmd => cmd.id === commandId);
      if (command) {
        command.action();
        onOpenChange(false);
        setSearch("");
      }
    },
    [commands, onOpenChange]
  );

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
        setSearch("");
      }
    };

    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }

    return undefined;
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="animate-fade-in fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
      {/* Animated background particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="animate-float absolute h-2 w-2 rounded-full bg-blue-400/20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>
      <div className="fixed top-[20%] left-1/2 mx-4 w-full max-w-2xl -translate-x-1/2">
        <Command
          className="glass-card animate-scale-in overflow-hidden rounded-xl border border-gray-200/50 shadow-2xl backdrop-blur-xl"
          shouldFilter={false}
        >
          <div className="flex items-center border-b border-gray-200 px-4">
            <Search className="mr-3 h-5 w-5 text-gray-400" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Type a command or search..."
              className="flex-1 border-none bg-transparent px-0 py-4 text-lg outline-none placeholder:text-gray-400"
            />
            <kbd className="hidden items-center rounded border bg-gray-100 px-2 py-1 font-mono text-xs text-gray-500 sm:inline-flex">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-96 overflow-y-auto p-2">
            {search && filteredCommands.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <Search className="mb-2 h-8 w-8" />
                <p className="text-sm">
                  No commands found for &ldquo;{search}&rdquo;
                </p>
                <p className="mt-1 text-xs">Try a different search term</p>
              </div>
            )}

            {Object.entries(groupedCommands).map(([group, items]) => (
              <Command.Group key={group} heading={group} className="mb-2">
                <div className="px-2 py-1.5 text-xs font-medium tracking-wide text-gray-500 uppercase">
                  {group}
                </div>
                {items.map(command => (
                  <Command.Item
                    key={command.id}
                    value={command.id}
                    onSelect={handleSelect}
                    className={cn(
                      "flex cursor-pointer items-center rounded-lg px-3 py-2.5",
                      "hover-lift transition-all duration-200",
                      "hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50",
                      "hover:text-blue-700 hover:shadow-md",
                      "data-[selected]:bg-gradient-to-r data-[selected]:from-blue-100 data-[selected]:to-purple-100",
                      "data-[selected]:text-blue-700 data-[selected]:shadow-lg",
                      "group relative overflow-hidden"
                    )}
                  >
                    <command.icon className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-blue-600 group-data-[selected]:text-blue-600" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium group-hover:text-blue-700 group-data-[selected]:text-blue-700">
                        {command.label}
                      </div>
                      {command.description && (
                        <div className="mt-0.5 truncate text-xs text-gray-500 group-hover:text-blue-500 group-data-[selected]:text-blue-500">
                          {command.description}
                        </div>
                      )}
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>

          {/* Footer */}
          <div className="border-t border-gray-200 bg-gray-50 px-4 py-2">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-4">
                <span className="flex items-center">
                  <kbd className="rounded border bg-white px-1.5 py-0.5 text-xs">
                    ↑↓
                  </kbd>
                  <span className="ml-1">Navigate</span>
                </span>
                <span className="flex items-center">
                  <kbd className="rounded border bg-white px-1.5 py-0.5 text-xs">
                    ⏎
                  </kbd>
                  <span className="ml-1">Select</span>
                </span>
                <span className="flex items-center">
                  <kbd className="rounded border bg-white px-1.5 py-0.5 text-xs">
                    ESC
                  </kbd>
                  <span className="ml-1">Close</span>
                </span>
              </div>
              <span>{filteredCommands.length} commands</span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
};

// Hook for global command palette
export const useCommandPalette = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { open, setOpen };
};
