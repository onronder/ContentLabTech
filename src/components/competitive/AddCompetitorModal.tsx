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
  teamId: _teamId,
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
        <Button variant="default" className="shadow-lg">
          Add Competitor
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gradient-card border-primary/20 border-2 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="bg-gradient-primary mb-2 bg-clip-text text-xl font-bold text-transparent">
            Add New Competitor
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-6">
          <div className="form-container">
            <div className="form-field">
              <label htmlFor="company-name" className="field-label required">
                Company Name *
                <span className="field-hint">
                  The official name of the competitor
                </span>
              </label>
              <Input
                id="company-name"
                type="text"
                placeholder="e.g., Apple Inc."
                className="field-input"
                {...register("name", { required: "Company name is required" })}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="domain" className="field-label required">
                Domain *
                <span className="field-hint">
                  Domain without http:// or www
                </span>
              </label>
              <Input
                id="domain"
                type="text"
                placeholder="e.g., apple.com"
                className="field-input"
                {...register("domain", { required: "Domain is required" })}
              />
              {errors.domain && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.domain.message}
                </p>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="website-url" className="field-label required">
                Website URL *
                <span className="field-hint">
                  Full website URL including https://
                </span>
              </label>
              <Input
                id="website-url"
                type="url"
                placeholder="e.g., https://apple.com"
                className="field-input"
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

            <div className="form-field">
              <label htmlFor="industry" className="field-label required">
                Industry *
                <span className="field-hint">
                  Select the competitor&apos;s primary industry
                </span>
              </label>
              <Input
                id="industry"
                type="text"
                placeholder="e.g., Technology"
                className="field-input"
                {...register("industry", { required: "Industry is required" })}
              />
              {errors.industry && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.industry.message}
                </p>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="description" className="field-label">
                Description
                <span className="field-hint">
                  Additional context about this competitor (optional)
                </span>
              </label>
              <Input
                id="description"
                type="text"
                placeholder="Brief description of the competitor, their main products, market position, etc."
                className="field-input"
                {...register("description")}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3 border-t border-gray-100 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
              className="px-6 py-2"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              variant="success"
              className="px-6 py-2"
            >
              {isSubmitting ? "Adding..." : "Add Competitor"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
