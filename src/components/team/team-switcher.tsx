"use client";

/**
 * TeamSwitcher Component
 * Dropdown to switch between user's teams
 */

import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";

import { useAuth, type TeamWithUserRole } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface TeamSwitcherProps {
  onCreateTeam?: () => void;
  className?: string;
}

export const TeamSwitcher = ({
  onCreateTeam,
  className,
}: TeamSwitcherProps) => {
  const { teams, currentTeam, currentTeamRole, switchTeam, teamsLoading } =
    useAuth();
  const [open, setOpen] = useState(false);

  const handleTeamSelect = async (teamId: string) => {
    if (teamId === currentTeam?.id) {
      setOpen(false);
      return;
    }

    const success = await switchTeam(teamId);
    if (success) {
      setOpen(false);
    }
  };

  const getTeamInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
        return "default";
      case "admin":
        return "secondary";
      case "member":
        return "outline";
      case "viewer":
        return "outline";
      default:
        return "outline";
    }
  };

  if (teamsLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="h-8 w-8 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
      </div>
    );
  }

  if (!teams.length) {
    return (
      <Button variant="outline" onClick={onCreateTeam} className={className}>
        <Plus className="mr-2 h-4 w-4" />
        Create Team
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select team"
          className={`w-full justify-between ${className}`}
        >
          <div className="flex items-center space-x-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">
                {currentTeam ? getTeamInitials(currentTeam.name) : "T"}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">
              {currentTeam?.name || "Select team"}
            </span>
            {currentTeamRole && (
              <Badge
                variant={getRoleBadgeVariant(currentTeamRole)}
                className="text-xs"
              >
                {currentTeamRole}
              </Badge>
            )}
          </div>
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Search teams..." />
          <CommandList>
            <CommandEmpty>No teams found.</CommandEmpty>

            <CommandGroup heading="Your Teams">
              {teams.map((team: TeamWithUserRole) => (
                <CommandItem
                  key={team.id}
                  onSelect={() => handleTeamSelect(team.id)}
                  className="flex items-center space-x-2"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {getTeamInitials(team.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="truncate font-medium">{team.name}</span>
                      <Badge
                        variant={getRoleBadgeVariant(team.userRole)}
                        className="text-xs"
                      >
                        {team.userRole}
                      </Badge>
                    </div>
                    {team.description && (
                      <p className="text-muted-foreground truncate text-xs">
                        {team.description}
                      </p>
                    )}
                  </div>

                  <Check
                    className={`ml-auto h-4 w-4 ${
                      currentTeam?.id === team.id ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </CommandItem>
              ))}
            </CommandGroup>

            {onCreateTeam && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={onCreateTeam}
                    className="flex items-center space-x-2"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded border border-dashed">
                      <Plus className="h-4 w-4" />
                    </div>
                    <span>Create Team</span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
