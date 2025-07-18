"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AddCompetitorModalProps {
  onCompetitorAdded: () => void;
  teamId: string;
}

interface CompetitorFormData {
  name: string;
  domain: string;
  website_url: string;
  industry: string;
  description: string;
}

export function AddCompetitorModal({
  onCompetitorAdded,
  teamId,
}: AddCompetitorModalProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CompetitorFormData>();

  const onSubmit = async (data: CompetitorFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/competitive/competitors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          domain: data.domain,
          website_url: data.website_url,
          industry: data.industry,
          description: data.description,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add competitor");
      }

      reset();
      setOpen(false);
      onCompetitorAdded();
    } catch (error) {
      console.error("Error adding competitor:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          Add Competitor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Competitor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Input
              placeholder="Competitor Name"
              {...register("name", { required: "Name is required" })}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Input
              placeholder="Domain (e.g., example.com)"
              {...register("domain", { required: "Domain is required" })}
            />
            {errors.domain && (
              <p className="mt-1 text-sm text-red-500">
                {errors.domain.message}
              </p>
            )}
          </div>

          <div>
            <Input
              placeholder="Website URL"
              type="url"
              {...register("website_url", {
                required: "Website URL is required",
              })}
            />
            {errors.website_url && (
              <p className="mt-1 text-sm text-red-500">
                {errors.website_url.message}
              </p>
            )}
          </div>

          <div>
            <Input
              placeholder="Industry"
              {...register("industry", { required: "Industry is required" })}
            />
            {errors.industry && (
              <p className="mt-1 text-sm text-red-500">
                {errors.industry.message}
              </p>
            )}
          </div>

          <div>
            <Input placeholder="Description" {...register("description")} />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Competitor"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
