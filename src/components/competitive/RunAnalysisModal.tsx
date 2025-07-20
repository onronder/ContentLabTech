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

interface RunAnalysisModalProps {
  onAnalysisStarted: () => void;
  teamId: string;
  projectId: string;
}

interface AnalysisFormData {
  analysis_type: string;
  competitor_id: string;
  keywords: string;
  competitorUrls: string;
  includeContentGaps: boolean;
  includeTechnicalSeo: boolean;
  analysisDepth: string;
}

export function RunAnalysisModal({
  onAnalysisStarted,
  teamId,
  projectId,
}: RunAnalysisModalProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AnalysisFormData>();

  const onSubmit = async (data: AnalysisFormData) => {
    console.log("🔍 [RUN_ANALYSIS] Form submission started with:", data);
    console.log("🔍 [RUN_ANALYSIS] TeamId:", teamId, "ProjectId:", projectId);

    setIsSubmitting(true);
    try {
      const payload = {
        project_id: projectId,
        teamId: teamId,
        analysis_type: data.analysis_type,
        competitor_id: data.competitor_id || null,
        keywords: data.keywords
          .split(",")
          .map(k => k.trim())
          .filter(k => k),
        competitorUrls: data.competitorUrls
          .split(",")
          .map(url => url.trim())
          .filter(url => url),
        includeContentGaps: data.includeContentGaps,
        includeTechnicalSeo: data.includeTechnicalSeo,
        analysisDepth: data.analysisDepth,
      };

      console.log("🔍 [RUN_ANALYSIS] Request payload:", payload);

      const response = await fetch("/api/competitive/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      console.log(
        "🔍 [RUN_ANALYSIS] Response status:",
        response.status,
        response.statusText
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ [RUN_ANALYSIS] API error:", errorData);
        throw new Error(`Failed to start analysis: ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ [RUN_ANALYSIS] Analysis started successfully:", result);

      reset();
      setOpen(false);
      onAnalysisStarted();
    } catch (error) {
      console.error("❌ [RUN_ANALYSIS] Error starting analysis:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="info" className="shadow-lg">
          Run Analysis
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gradient-card border-info/20 border-2 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="bg-gradient-info mb-2 bg-clip-text text-xl font-bold text-transparent">
            Run Competitive Analysis
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-6">
          <div>
            <select
              {...register("analysis_type", {
                required: "Analysis type is required",
              })}
              className="border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
            >
              <option value="">Select Analysis Type</option>
              <option value="keyword_analysis">Keyword Analysis</option>
              <option value="content_gap_analysis">Content Gap Analysis</option>
              <option value="technical_seo_audit">Technical SEO Audit</option>
              <option value="backlink_analysis">Backlink Analysis</option>
              <option value="competitor_comparison">
                Competitor Comparison
              </option>
            </select>
            {errors.analysis_type && (
              <p className="mt-1 text-sm text-red-500">
                {errors.analysis_type.message}
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
              placeholder="Target Keywords (comma-separated)"
              {...register("keywords")}
            />
          </div>

          <div>
            <Input
              placeholder="Competitor URLs (comma-separated)"
              {...register("competitorUrls")}
            />
          </div>

          <div>
            <select
              {...register("analysisDepth", {
                required: "Analysis depth is required",
              })}
              className="border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
            >
              <option value="">Select Analysis Depth</option>
              <option value="quick">Quick Scan</option>
              <option value="standard">Standard Analysis</option>
              <option value="comprehensive">Comprehensive Analysis</option>
            </select>
            {errors.analysisDepth && (
              <p className="mt-1 text-sm text-red-500">
                {errors.analysisDepth.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                {...register("includeContentGaps")}
                className="border-input rounded"
              />
              <span className="text-sm">Include Content Gap Analysis</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                {...register("includeTechnicalSeo")}
                className="border-input rounded"
              />
              <span className="text-sm">Include Technical SEO Audit</span>
            </label>
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
              variant="info"
              className="px-6 py-2"
            >
              {isSubmitting ? "Starting..." : "Start Analysis"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
