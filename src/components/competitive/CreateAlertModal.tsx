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

interface CreateAlertModalProps {
  onAlertCreated: () => void;
  teamId: string;
}

interface AlertFormData {
  alert_type: string;
  competitor_id: string;
  threshold: number;
  frequency: string;
  keywords: string;
}

export function CreateAlertModal({
  onAlertCreated,
  teamId,
}: CreateAlertModalProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AlertFormData>();

  const onSubmit = async (data: AlertFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/competitive/alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          alert_type: data.alert_type,
          competitor_id: data.competitor_id || null,
          threshold: data.threshold,
          frequency: data.frequency,
          keywords: data.keywords
            .split(",")
            .map(k => k.trim())
            .filter(k => k),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create alert");
      }

      reset();
      setOpen(false);
      onAlertCreated();
    } catch (error) {
      console.error("Error creating alert:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">Create Alert</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Alert</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <select
              {...register("alert_type", {
                required: "Alert type is required",
              })}
              className="border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
            >
              <option value="">Select Alert Type</option>
              <option value="ranking_change">Ranking Change</option>
              <option value="new_content">New Content</option>
              <option value="traffic_spike">Traffic Spike</option>
              <option value="keyword_movement">Keyword Movement</option>
            </select>
            {errors.alert_type && (
              <p className="mt-1 text-sm text-red-500">
                {errors.alert_type.message}
              </p>
            )}
          </div>

          <div>
            <Input
              placeholder="Competitor ID (optional)"
              {...register("competitor_id")}
            />
          </div>

          <div>
            <Input
              placeholder="Threshold (%)"
              type="number"
              min="0"
              max="100"
              {...register("threshold", {
                required: "Threshold is required",
                min: { value: 0, message: "Threshold must be at least 0" },
                max: { value: 100, message: "Threshold cannot exceed 100" },
              })}
            />
            {errors.threshold && (
              <p className="mt-1 text-sm text-red-500">
                {errors.threshold.message}
              </p>
            )}
          </div>

          <div>
            <select
              {...register("frequency", { required: "Frequency is required" })}
              className="border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
            >
              <option value="">Select Frequency</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            {errors.frequency && (
              <p className="mt-1 text-sm text-red-500">
                {errors.frequency.message}
              </p>
            )}
          </div>

          <div>
            <Input
              placeholder="Keywords (comma-separated)"
              {...register("keywords")}
            />
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
              {isSubmitting ? "Creating..." : "Create Alert"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
