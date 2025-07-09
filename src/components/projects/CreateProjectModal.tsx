/**
 * Create Project Modal Component
 * Advanced project creation form with comprehensive options
 */

"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  EnhancedDialog,
  EnhancedDialogContent,
  EnhancedDialogDescription,
  EnhancedDialogHeader,
  EnhancedDialogTitle,
} from "@/components/ui/enhanced-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth/context";
import {
  authenticatedFetch,
  AuthenticationError,
  CSRFError,
} from "@/lib/auth/authenticated-fetch";
import { supabase } from "@/lib/supabase/client";
import { useAdvancedFormValidation } from "@/hooks/use-advanced-form-validation";
import { useLoadingStateManager } from "@/hooks/use-loading-state-manager";
import { useFormErrorHandler } from "@/hooks/use-form-error-handler";
import {
  Globe,
  Target,
  Users,
  Plus,
  X,
  Sparkles,
  Zap,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  description?: string;
  website_url?: string;
  target_keywords?: string[];
  target_audience?: string;
  content_goals?: string[];
  competitors?: string[];
  status: string;
  settings?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string;
  team: {
    id: string;
    name: string;
    description: string;
    owner_id: string;
  };
  stats: {
    contentCount: number;
    competitorCount: number;
    lastActivity: string;
  };
}

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onProjectCreated: (project: Project) => void;
}

export const CreateProjectModal = ({
  open,
  onClose,
  onProjectCreated,
}: CreateProjectModalProps) => {
  const { currentTeam, session } = useAuth();
  const [currentTab, setCurrentTab] = useState("basic");

  // Advanced form validation configuration
  const formValidation = useAdvancedFormValidation(
    {
      fields: {
        name: [
          { type: "required", message: "Project name is required" },
          {
            type: "min",
            value: 2,
            message: "Project name must be at least 2 characters",
          },
          {
            type: "max",
            value: 100,
            message: "Project name must be less than 100 characters",
          },
        ],
        description: [
          {
            type: "max",
            value: 500,
            message: "Description must be less than 500 characters",
          },
        ],
        website_url: [{ type: "url", message: "Please enter a valid URL" }],
        target_audience: [
          {
            type: "max",
            value: 200,
            message: "Target audience must be less than 200 characters",
          },
        ],
      },
      validationTiming: "hybrid",
      debounceMs: 300,
    },
    {
      name: "",
      description: "",
      website_url: "",
      target_audience: "",
    }
  );

  // Loading state management with steps
  const loadingManager = useLoadingStateManager({
    steps: [
      { id: "validation", label: "Validating form data", weight: 1 },
      { id: "creation", label: "Creating project", weight: 3 },
      { id: "finalization", label: "Finalizing setup", weight: 1 },
    ],
    timeoutMs: 30000,
    onStepComplete: step => console.log("✅ Completed:", step.label),
    onStepFailed: (step, error) =>
      console.error("❌ Failed:", step.label, error),
    onComplete: duration =>
      console.log("🎉 Project created in", duration, "ms"),
  });

  // Error handling
  const errorHandler = useFormErrorHandler({
    enableRecovery: true,
    maxRetries: 2,
    autoHideDelay: 8000,
    onRetry: async error => {
      console.log("🔄 Retrying after error:", error.category.userMessage.title);
    },
  });

  // Dynamic arrays state
  const [targetKeywords, setTargetKeywords] = useState<string[]>([]);
  const [contentGoals, setContentGoals] = useState<string[]>([]);
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [goalInput, setGoalInput] = useState("");
  const [competitorInput, setCompetitorInput] = useState("");

  const resetForm = () => {
    formValidation.setFormData({
      name: "",
      description: "",
      website_url: "",
      target_audience: "",
    });
    formValidation.resetValidation();
    setTargetKeywords([]);
    setContentGoals([]);
    setCompetitors([]);
    setKeywordInput("");
    setGoalInput("");
    setCompetitorInput("");
    errorHandler.clearAllErrors();
    loadingManager.stopLoading();
    setCurrentTab("basic");
  };

  const handleClose = () => {
    if (!loadingManager.isAnyLoading) {
      resetForm();
      onClose();
    }
  };

  const addKeyword = () => {
    const keyword = keywordInput.trim();
    if (keyword && !targetKeywords.includes(keyword)) {
      setTargetKeywords(prev => [...prev, keyword]);
      setKeywordInput("");
    }
  };

  const removeKeyword = (keyword: string) => {
    setTargetKeywords(prev => prev.filter(k => k !== keyword));
  };

  const addGoal = () => {
    const goal = goalInput.trim();
    if (goal && !contentGoals.includes(goal)) {
      setContentGoals(prev => [...prev, goal]);
      setGoalInput("");
    }
  };

  const removeGoal = (goal: string) => {
    setContentGoals(prev => prev.filter(g => g !== goal));
  };

  const addCompetitor = () => {
    const competitor = competitorInput.trim();
    if (competitor && !competitors.includes(competitor)) {
      // Add https:// if no protocol specified
      const formattedCompetitor = competitor.startsWith("http")
        ? competitor
        : `https://${competitor}`;
      setCompetitors(prev => [...prev, formattedCompetitor]);
      setCompetitorInput("");
    }
  };

  const removeCompetitor = (competitor: string) => {
    setCompetitors(prev => prev.filter(c => c !== competitor));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTeam?.id) return;

    // Start loading with step progression
    loadingManager.startLoading("submitting");
    errorHandler.clearAllErrors();

    try {
      // Step 1: Validation
      loadingManager.updateStep("validation", "active");
      const isFormValid = await formValidation.validateForm();

      if (!isFormValid) {
        loadingManager.failCurrentStep(new Error("Form validation failed"));
        return;
      }

      loadingManager.completeCurrentStep();

      // Step 2: Project Creation
      loadingManager.updateStep("creation", "active");

      const payload = {
        teamId: currentTeam.id,
        name: formValidation.formData.name,
        description: formValidation.formData.description || undefined,
        website_url: formValidation.formData.website_url || undefined,
        target_keywords: targetKeywords,
        target_audience: formValidation.formData.target_audience || undefined,
        content_goals: contentGoals,
        competitors: competitors,
        settings: {},
      };

      // Use production-grade authenticated fetch
      const authContext = {
        session,
        refreshSession: async () => {
          const {
            data: { session: newSession },
          } = await supabase.auth.getSession();
          if (newSession) {
            console.log("🔄 Session refreshed for project creation");
          }
        },
      };

      const response = await authenticatedFetch(
        "/api/projects",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        authContext
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create project");
      }

      loadingManager.completeCurrentStep();

      // Step 3: Finalization
      loadingManager.updateStep("finalization", "active");

      const result = await response.json();

      loadingManager.completeCurrentStep();

      // Success handling
      onProjectCreated(result.project);
      resetForm();
    } catch (err) {
      console.error("Error creating project:", err);

      // Use enhanced error handling
      if (err instanceof AuthenticationError) {
        errorHandler.handleTypedError(err);
      } else if (err instanceof CSRFError) {
        errorHandler.handleTypedError(err);
      } else {
        errorHandler.addError(err, undefined, {
          operation: "project_creation",
          teamId: currentTeam?.id,
        });
      }

      // Fail current step if loading
      if (loadingManager.isAnyLoading) {
        loadingManager.failCurrentStep(err);
      }
    }
  };

  // Form validity based on validation state
  const isFormValid =
    formValidation.isValid &&
    formValidation.formData.name.trim().length > 0 &&
    !loadingManager.isAnyLoading;

  return (
    <EnhancedDialog open={open} onOpenChange={handleClose}>
      <EnhancedDialogContent
        size="lg"
        className="max-h-[90vh] overflow-hidden"
        data-content=""
      >
        <EnhancedDialogHeader>
          <EnhancedDialogTitle className="flex items-center space-x-2">
            <div className="rounded-lg bg-blue-50 p-2">
              <Plus className="h-5 w-5 text-blue-600" />
            </div>
            <span>Create New Project</span>
          </EnhancedDialogTitle>
          <EnhancedDialogDescription>
            Set up a new content project with comprehensive analysis and
            tracking
          </EnhancedDialogDescription>
        </EnhancedDialogHeader>

        <div className="flex max-h-[inherit] flex-col">
          <form
            onSubmit={handleSubmit}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <Tabs value={currentTab} onValueChange={setCurrentTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger
                  value="basic"
                  className="flex items-center space-x-2"
                >
                  <Globe className="h-4 w-4" />
                  <span>Basic Info</span>
                </TabsTrigger>
                <TabsTrigger
                  value="seo"
                  className="flex items-center space-x-2"
                >
                  <Target className="h-4 w-4" />
                  <span>SEO & Keywords</span>
                </TabsTrigger>
                <TabsTrigger
                  value="competitive"
                  className="flex items-center space-x-2"
                >
                  <Users className="h-4 w-4" />
                  <span>Competitors</span>
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto p-6" data-modal-body="">
                <TabsContent value="basic" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="required">
                      Project Name
                    </Label>
                    <Input
                      id="name"
                      value={formValidation.formData.name}
                      onChange={e =>
                        formValidation.updateField("name", e.target.value)
                      }
                      onBlur={() => formValidation.handleFieldBlur("name")}
                      placeholder="Enter project name..."
                      required
                      className={
                        formValidation.shouldShowFieldErrors("name")
                          ? "border-red-500"
                          : ""
                      }
                    />
                    {formValidation.shouldShowFieldErrors("name") && (
                      <p className="text-sm text-red-600">
                        {formValidation.getFieldStatus("name").errors[0]}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formValidation.formData.description}
                      onChange={e =>
                        formValidation.updateField(
                          "description",
                          e.target.value
                        )
                      }
                      onBlur={() =>
                        formValidation.handleFieldBlur("description")
                      }
                      placeholder="Describe your project goals and objectives..."
                      rows={3}
                      className={
                        formValidation.shouldShowFieldErrors("description")
                          ? "border-red-500"
                          : ""
                      }
                    />
                    {formValidation.shouldShowFieldErrors("description") && (
                      <p className="text-sm text-red-600">
                        {formValidation.getFieldStatus("description").errors[0]}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website_url">Website URL</Label>
                    <Input
                      id="website_url"
                      type="url"
                      value={formValidation.formData.website_url}
                      onChange={e =>
                        formValidation.updateField(
                          "website_url",
                          e.target.value
                        )
                      }
                      onBlur={() =>
                        formValidation.handleFieldBlur("website_url")
                      }
                      placeholder="https://example.com"
                      className={
                        formValidation.shouldShowFieldErrors("website_url")
                          ? "border-red-500"
                          : ""
                      }
                    />
                    {formValidation.shouldShowFieldErrors("website_url") && (
                      <p className="text-sm text-red-600">
                        {formValidation.getFieldStatus("website_url").errors[0]}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="target_audience">Target Audience</Label>
                    <Input
                      id="target_audience"
                      value={formValidation.formData.target_audience}
                      onChange={e =>
                        formValidation.updateField(
                          "target_audience",
                          e.target.value
                        )
                      }
                      onBlur={() =>
                        formValidation.handleFieldBlur("target_audience")
                      }
                      placeholder="Small business owners, marketing professionals..."
                      className={
                        formValidation.shouldShowFieldErrors("target_audience")
                          ? "border-red-500"
                          : ""
                      }
                    />
                    {formValidation.shouldShowFieldErrors(
                      "target_audience"
                    ) && (
                      <p className="text-sm text-red-600">
                        {
                          formValidation.getFieldStatus("target_audience")
                            .errors[0]
                        }
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="seo" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label>Target Keywords</Label>
                    <div className="flex space-x-2">
                      <Input
                        value={keywordInput}
                        onChange={e => setKeywordInput(e.target.value)}
                        placeholder="Add a keyword..."
                        onKeyPress={e =>
                          e.key === "Enter" &&
                          (e.preventDefault(), addKeyword())
                        }
                      />
                      <Button
                        type="button"
                        onClick={addKeyword}
                        variant="outline"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {targetKeywords.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {targetKeywords.map(keyword => (
                          <Badge
                            key={keyword}
                            variant="secondary"
                            className="flex items-center space-x-1"
                          >
                            <span>{keyword}</span>
                            <button
                              type="button"
                              onClick={() => removeKeyword(keyword)}
                              className="ml-1 hover:text-red-500"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Content Goals</Label>
                    <div className="flex space-x-2">
                      <Input
                        value={goalInput}
                        onChange={e => setGoalInput(e.target.value)}
                        placeholder="Add a content goal..."
                        onKeyPress={e =>
                          e.key === "Enter" && (e.preventDefault(), addGoal())
                        }
                      />
                      <Button type="button" onClick={addGoal} variant="outline">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {contentGoals.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {contentGoals.map(goal => (
                          <Badge
                            key={goal}
                            variant="outline"
                            className="flex items-center space-x-1"
                          >
                            <span>{goal}</span>
                            <button
                              type="button"
                              onClick={() => removeGoal(goal)}
                              className="ml-1 hover:text-red-500"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg bg-blue-50 p-4">
                    <div className="flex items-start space-x-3">
                      <Sparkles className="mt-0.5 h-5 w-5 text-blue-600" />
                      <div>
                        <h4 className="font-medium text-blue-900">
                          AI Analysis
                        </h4>
                        <p className="text-sm text-blue-700">
                          Adding keywords and goals enables advanced AI-powered
                          content analysis and optimization recommendations.
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="competitive" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label>Competitor Websites</Label>
                    <div className="flex space-x-2">
                      <Input
                        value={competitorInput}
                        onChange={e => setCompetitorInput(e.target.value)}
                        placeholder="competitor.com"
                        onKeyPress={e =>
                          e.key === "Enter" &&
                          (e.preventDefault(), addCompetitor())
                        }
                      />
                      <Button
                        type="button"
                        onClick={addCompetitor}
                        variant="outline"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {competitors.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {competitors.map(competitor => (
                          <div
                            key={competitor}
                            className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                          >
                            <div className="flex items-center space-x-3">
                              <Globe className="h-4 w-4 text-gray-400" />
                              <span className="text-sm font-medium">
                                {competitor}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeCompetitor(competitor)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg bg-green-50 p-4">
                    <div className="flex items-start space-x-3">
                      <Target className="mt-0.5 h-5 w-5 text-green-600" />
                      <div>
                        <h4 className="font-medium text-green-900">
                          Competitive Intelligence
                        </h4>
                        <p className="text-sm text-green-700">
                          Adding competitors enables SERP analysis, content gap
                          identification, and competitive benchmarking.
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            {/* Footer with Error Display and Actions */}
            <div className="bg-background space-y-4 border-t p-6">
              {/* Global Error Display */}
              {errorHandler.hasErrors && (
                <div className="space-y-3">
                  {errorHandler.getGlobalErrors().map(error => (
                    <div
                      key={error.id}
                      className="rounded-lg border border-red-200 bg-red-50 p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <span className="text-lg">
                            {error.category.userMessage.icon}
                          </span>
                          <div>
                            <h4 className="font-medium text-red-900">
                              {error.category.userMessage.title}
                            </h4>
                            <p className="text-sm text-red-700">
                              {error.category.userMessage.message}
                            </p>
                            {error.category.userMessage.action && (
                              <p className="mt-1 text-sm text-red-600">
                                {error.category.userMessage.action}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {error.category.retryStrategy.canRetry && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => errorHandler.retryError(error.id)}
                              disabled={errorHandler.isRecovering}
                            >
                              Retry
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => errorHandler.dismissError(error.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Loading Progress Display */}
              {loadingManager.isAnyLoading && (
                <div className="rounded-lg bg-blue-50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Zap className="h-4 w-4 animate-spin text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">
                        {loadingManager.currentStepLabel}
                      </span>
                    </div>
                    <span className="text-sm text-blue-600">
                      {loadingManager.completionPercentage}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-blue-200">
                    <div
                      className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${loadingManager.progress}%` }}
                    />
                  </div>
                  {loadingManager.formattedTimeRemaining && (
                    <p className="mt-1 text-xs text-blue-600">
                      Estimated time remaining:{" "}
                      {loadingManager.formattedTimeRemaining}
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  {isFormValid && !loadingManager.isAnyLoading && (
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Ready to create</span>
                    </div>
                  )}

                  {formValidation.isValidating && (
                    <div className="flex items-center space-x-2">
                      <Zap className="h-4 w-4 animate-spin text-blue-500" />
                      <span>Validating...</span>
                    </div>
                  )}

                  {formValidation.validationProgress.total > 0 && (
                    <span className="text-xs text-gray-400">
                      Validated: {formValidation.validationProgress.valid}/
                      {formValidation.validationProgress.total}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={loadingManager.isAnyLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      !isFormValid ||
                      loadingManager.isAnyLoading ||
                      formValidation.isValidating
                    }
                  >
                    {loadingManager.isSubmitting ? (
                      <>
                        <Zap className="mr-2 h-4 w-4 animate-spin" />
                        {loadingManager.currentStepLabel || "Creating..."}
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Project
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </EnhancedDialogContent>
    </EnhancedDialog>
  );
};
