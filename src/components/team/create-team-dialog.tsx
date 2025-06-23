"use client";

/**
 * CreateTeamDialog Component
 * Modal dialog for creating new teams
 */

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { useTeamManagement } from "@/hooks/auth/use-team-management";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const CreateTeamDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: CreateTeamDialogProps) => {
  const { createTeam, loading } = useTeamManagement();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Team name is required");
      return;
    }

    if (formData.name.length < 2) {
      setError("Team name must be at least 2 characters long");
      return;
    }

    if (formData.name.length > 50) {
      setError("Team name must be less than 50 characters");
      return;
    }

    const trimmedDescription = formData.description.trim();
    const { team, error: createError } = await createTeam({
      name: formData.name.trim(),
      ...(trimmedDescription && { description: trimmedDescription }),
    });

    if (createError) {
      setError(createError);
    } else if (team) {
      // Reset form
      setFormData({ name: "", description: "" });
      onOpenChange(false);
      onSuccess?.();
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({ name: "", description: "" });
      setError(null);
      onOpenChange(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Team</DialogTitle>
          <DialogDescription>
            Create a new team to collaborate with others on content marketing
            projects.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Team Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => handleInputChange("name", e.target.value)}
                placeholder="Enter team name"
                disabled={loading}
                maxLength={50}
                required
              />
              <p className="text-muted-foreground text-xs">
                {formData.name.length}/50 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e => handleInputChange("description", e.target.value)}
                placeholder="Brief description of your team (optional)"
                disabled={loading}
                maxLength={200}
                rows={3}
              />
              <p className="text-muted-foreground text-xs">
                {formData.description.length}/200 characters
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.name.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Team"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
