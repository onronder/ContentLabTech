"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  CheckCircle,
  Sparkles,
  Loader2,
  Plus,
  X,
} from "lucide-react";

const MAX_DESCRIPTION_LENGTH = 500;

const INDUSTRY_OPTIONS = [
  "Technology",
  "Healthcare & Life Sciences",
  "Financial Services",
  "Retail & E-commerce",
  "Manufacturing",
  "Education",
  "Media & Entertainment",
  "Real Estate",
  "Consulting & Professional Services",
  "Automotive",
  "Energy & Utilities",
  "Food & Beverage",
  "Travel & Hospitality",
  "Telecommunications",
  "Government & Public Sector",
  "Non-profit",
  "Other",
];

interface AddCompetitorModalProps {
  onCompetitorAdded: () => void;
  teamId: string;
}

interface ValidationErrors {
  name?: string;
  domain?: string;
  website_url?: string;
  industry?: string;
  description?: string;
}

interface TouchedFields {
  name?: boolean;
  domain?: boolean;
  website_url?: boolean;
  industry?: boolean;
  description?: boolean;
}

// Auto-completion helper functions
const isValidDomain = (domain: string): boolean => {
  const domainRegex =
    /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
};

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const formatDomain = (value: string): string => {
  return value
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .toLowerCase()
    .trim();
};

const formatUrl = (value: string): string => {
  if (value && !value.startsWith("http://") && !value.startsWith("https://")) {
    return `https://${value}`;
  }
  return value;
};

const extractDomainFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

export function AddCompetitorModal({
  onCompetitorAdded,
  teamId: _teamId,
}: AddCompetitorModalProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");

  // Validation state
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<TouchedFields>({});

  // Auto-completion state
  const [autoCompletedFields, setAutoCompletedFields] = useState<{
    domain?: boolean;
    website_url?: boolean;
  }>({});

  // Submission state management
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Enhanced description handler
  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    validateField("description", value);
  };

  const validateField = (
    fieldName: keyof ValidationErrors,
    value: string
  ): boolean => {
    const newErrors = { ...errors };

    switch (fieldName) {
      case "name":
        if (!value.trim()) {
          newErrors.name = "Company name is required";
        } else if (value.trim().length < 2) {
          newErrors.name = "Company name must be at least 2 characters";
        } else if (value.trim().length > 100) {
          newErrors.name = "Company name must be less than 100 characters";
        } else {
          delete newErrors.name;
        }
        break;

      case "domain":
        const domainRegex =
          /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
        if (!value.trim()) {
          newErrors.domain = "Domain is required";
        } else if (!domainRegex.test(value.trim())) {
          newErrors.domain = "Please enter a valid domain (e.g., example.com)";
        } else {
          delete newErrors.domain;
        }
        break;

      case "website_url":
        if (!value.trim()) {
          newErrors.website_url = "Website URL is required";
        } else {
          try {
            const url = new URL(value.trim());
            if (!["http:", "https:"].includes(url.protocol)) {
              newErrors.website_url = "URL must start with http:// or https://";
            } else {
              delete newErrors.website_url;
            }
          } catch {
            newErrors.website_url =
              "Please enter a valid URL (e.g., https://example.com)";
          }
        }
        break;

      case "industry":
        if (!value) {
          newErrors.industry = "Please select an industry";
        } else {
          delete newErrors.industry;
        }
        break;

      case "description":
        if (value.length > MAX_DESCRIPTION_LENGTH) {
          newErrors.description = `Description must be less than ${MAX_DESCRIPTION_LENGTH} characters`;
        } else {
          delete newErrors.description;
        }
        break;
    }

    setErrors(newErrors);
    return !newErrors[fieldName];
  };

  // Smart field handlers with auto-completion
  const handleDomainChange = (value: string) => {
    const formattedDomain = formatDomain(value);
    setDomain(formattedDomain);

    if (touched.domain) {
      validateField("domain", formattedDomain);
    }

    // Auto-suggest website URL if domain is valid and URL is empty
    if (isValidDomain(formattedDomain) && !websiteUrl.trim()) {
      const suggestedUrl = `https://${formattedDomain}`;
      setWebsiteUrl(suggestedUrl);
      setAutoCompletedFields({ ...autoCompletedFields, website_url: true });
      if (touched.website_url) {
        validateField("website_url", suggestedUrl);
      }
    }
  };

  const handleWebsiteUrlChange = (value: string) => {
    setWebsiteUrl(value);
    setAutoCompletedFields({ ...autoCompletedFields, website_url: false });

    if (touched.website_url) {
      validateField("website_url", value);
    }

    // Auto-extract domain if URL is valid and domain is empty
    if (isValidUrl(value) && !domain.trim()) {
      const extractedDomain = extractDomainFromUrl(value);
      if (extractedDomain) {
        setDomain(extractedDomain);
        setAutoCompletedFields({ ...autoCompletedFields, domain: true });
        if (touched.domain) {
          validateField("domain", extractedDomain);
        }
      }
    }
  };

  const handleWebsiteUrlBlur = () => {
    if (websiteUrl && !websiteUrl.startsWith("http")) {
      const formattedUrl = formatUrl(websiteUrl);
      setWebsiteUrl(formattedUrl);
      validateField("website_url", formattedUrl);
    }
    setTouched({ ...touched, website_url: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous submission states
    setSubmitError("");
    setSubmitSuccess(false);

    // Mark all fields as touched for validation display
    setTouched({
      name: true,
      domain: true,
      website_url: true,
      industry: true,
      description: true,
    });

    // Validate all fields
    const validations = [
      validateField("name", name),
      validateField("domain", domain),
      validateField("website_url", websiteUrl),
      validateField("industry", industry),
      validateField("description", description),
    ];

    const isFormValid = validations.every(Boolean);

    if (!isFormValid) {
      // Focus on first error field
      setTimeout(() => {
        const firstErrorField = document.querySelector(".field-error");
        if (firstErrorField instanceof HTMLElement) {
          firstErrorField.focus();
          firstErrorField.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }, 100);
      return;
    }

    setIsSubmitting(true);

    try {
      const competitorData = {
        name: name.trim(),
        domain: domain.trim(),
        website_url: websiteUrl.trim(),
        industry: industry,
        description: description.trim() || null,
      };

      const response = await fetch("/api/competitive/competitors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Important for authentication
        body: JSON.stringify(competitorData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            errorData.error ||
            `Server error: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();

      // Success handling
      setSubmitSuccess(true);

      // Call success callback
      onCompetitorAdded();

      // Auto-close modal after success
      setTimeout(() => {
        setOpen(false);
      }, 2000);
    } catch (error) {
      console.error("Error adding competitor:", error);
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Failed to add competitor. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDomain("");
    setWebsiteUrl("");
    setIndustry("");
    setDescription("");
    setErrors({});
    setTouched({});
    setAutoCompletedFields({});
    setSubmitError("");
    setSubmitSuccess(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={newOpen => {
        setOpen(newOpen);
        if (!newOpen) {
          resetForm();
        }
      }}
    >
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
        <form onSubmit={handleSubmit} className="mt-4 space-y-6">
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
                className={`field-input ${
                  errors.name
                    ? "field-error"
                    : touched.name && !errors.name && name.trim()
                      ? "field-success"
                      : ""
                }`}
                value={name}
                onChange={e => {
                  setName(e.target.value);
                  if (touched.name) {
                    validateField("name", e.target.value);
                  }
                }}
                onBlur={() => {
                  setTouched({ ...touched, name: true });
                  validateField("name", name);
                }}
              />
              {errors.name && touched.name && (
                <div className="error-message">
                  <AlertCircle size={16} />
                  {errors.name}
                </div>
              )}
              {touched.name && !errors.name && name.trim() && (
                <div className="success-message">
                  <CheckCircle size={16} />
                  Looks good!
                </div>
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
                className={`field-input ${
                  errors.domain
                    ? "field-error"
                    : touched.domain && !errors.domain && domain.trim()
                      ? "field-success"
                      : ""
                } ${autoCompletedFields.domain ? "auto-completed" : ""}`}
                value={domain}
                onChange={e => handleDomainChange(e.target.value)}
                onBlur={() => {
                  setTouched({ ...touched, domain: true });
                  validateField("domain", domain);
                }}
              />
              {errors.domain && touched.domain && (
                <div className="error-message">
                  <AlertCircle size={16} />
                  {errors.domain}
                </div>
              )}
              {autoCompletedFields.domain && (
                <div className="auto-completion-hint">
                  <Sparkles size={12} />
                  Auto-extracted from website URL
                </div>
              )}
              {touched.domain &&
                !errors.domain &&
                domain.trim() &&
                !autoCompletedFields.domain && (
                  <div className="success-message">
                    <CheckCircle size={16} />
                    Looks good!
                  </div>
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
                className={`field-input ${
                  errors.website_url
                    ? "field-error"
                    : touched.website_url &&
                        !errors.website_url &&
                        websiteUrl.trim()
                      ? "field-success"
                      : ""
                } ${autoCompletedFields.website_url ? "auto-completed" : ""}`}
                value={websiteUrl}
                onChange={e => handleWebsiteUrlChange(e.target.value)}
                onBlur={handleWebsiteUrlBlur}
              />
              {errors.website_url && touched.website_url && (
                <div className="error-message">
                  <AlertCircle size={16} />
                  {errors.website_url}
                </div>
              )}
              {autoCompletedFields.website_url && (
                <div className="auto-completion-hint">
                  <Sparkles size={12} />
                  Auto-suggested from domain
                </div>
              )}
              {touched.website_url &&
                !errors.website_url &&
                websiteUrl.trim() &&
                !autoCompletedFields.website_url && (
                  <div className="success-message">
                    <CheckCircle size={16} />
                    Looks good!
                  </div>
                )}
            </div>

            <div className="form-field">
              <label htmlFor="industry" className="field-label required">
                Industry *
                <span className="field-hint">
                  Select the competitor&apos;s primary industry
                </span>
              </label>
              <select
                id="industry"
                className={`field-input field-select ${
                  errors.industry
                    ? "field-error"
                    : touched.industry && !errors.industry && industry
                      ? "field-success"
                      : ""
                }`}
                value={industry}
                onChange={e => {
                  setIndustry(e.target.value);
                  if (touched.industry) {
                    validateField("industry", e.target.value);
                  }
                }}
                onBlur={() => {
                  setTouched({ ...touched, industry: true });
                  validateField("industry", industry);
                }}
              >
                <option value="">Select industry</option>
                {INDUSTRY_OPTIONS.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.industry && touched.industry && (
                <div className="error-message">
                  <AlertCircle size={16} />
                  {errors.industry}
                </div>
              )}
              {touched.industry && !errors.industry && industry && (
                <div className="success-message">
                  <CheckCircle size={16} />
                  Looks good!
                </div>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="description" className="field-label">
                Description
                <span className="field-hint">
                  Additional context about this competitor (optional)
                </span>
              </label>
              <textarea
                id="description"
                className={`field-input field-textarea ${
                  errors.description
                    ? "field-error"
                    : description.length > 0 && !errors.description
                      ? "field-success"
                      : ""
                }`}
                placeholder="Brief description of the competitor, their main products, market position, competitive advantages, etc."
                value={description}
                onChange={e => handleDescriptionChange(e.target.value)}
                onBlur={() => setTouched({ ...touched, description: true })}
                rows={4}
                maxLength={MAX_DESCRIPTION_LENGTH + 50}
              />

              <div className="field-footer">
                <div className="character-counter">
                  <span
                    className={`character-count ${
                      description.length > MAX_DESCRIPTION_LENGTH
                        ? "over-limit"
                        : description.length > MAX_DESCRIPTION_LENGTH * 0.8
                          ? "near-limit"
                          : ""
                    }`}
                  >
                    {description.length}/{MAX_DESCRIPTION_LENGTH}
                  </span>
                  {description.length > MAX_DESCRIPTION_LENGTH && (
                    <span className="over-limit-text">
                      {description.length - MAX_DESCRIPTION_LENGTH} characters
                      over limit
                    </span>
                  )}
                </div>

                {description.length > 0 &&
                  description.length <= MAX_DESCRIPTION_LENGTH && (
                    <div className="description-quality">
                      {description.length < 50 ? (
                        <span className="quality-hint">
                          Consider adding more detail
                        </span>
                      ) : description.length < 150 ? (
                        <span className="quality-good">Good length</span>
                      ) : (
                        <span className="quality-excellent">
                          Excellent detail
                        </span>
                      )}
                    </div>
                  )}
              </div>

              {errors.description && (
                <div className="error-message">
                  <AlertCircle size={16} />
                  {errors.description}
                </div>
              )}
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className={`btn-primary ${isSubmitting ? "btn-loading" : ""}`}
              disabled={isSubmitting || Object.keys(errors).length > 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Adding Competitor...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Add Competitor
                </>
              )}
            </button>
          </div>

          {/* Submission Feedback */}
          {submitError && (
            <div className="submission-feedback error">
              <div className="feedback-content">
                <AlertCircle size={20} />
                <div>
                  <div className="feedback-title">Failed to Add Competitor</div>
                  <div className="feedback-message">{submitError}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSubmitError("")}
                className="feedback-close"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {submitSuccess && (
            <div className="submission-feedback success">
              <div className="feedback-content">
                <CheckCircle size={20} />
                <div>
                  <div className="feedback-title">
                    Competitor Added Successfully!
                  </div>
                  <div className="feedback-message">
                    {name} has been added to your competitive intelligence
                    dashboard.
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
