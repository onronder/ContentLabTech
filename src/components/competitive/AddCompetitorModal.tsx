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
import { AlertCircle, CheckCircle, Sparkles } from "lucide-react";

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
        if (value.length > 500) {
          newErrors.description =
            "Description must be less than 500 characters";
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

    // Mark all fields as touched
    setTouched({
      name: true,
      domain: true,
      website_url: true,
      industry: true,
      description: true,
    });

    // Validate all fields
    const isNameValid = validateField("name", name);
    const isDomainValid = validateField("domain", domain);
    const isUrlValid = validateField("website_url", websiteUrl);
    const isIndustryValid = validateField("industry", industry);
    const isDescriptionValid = validateField("description", description);

    if (
      isNameValid &&
      isDomainValid &&
      isUrlValid &&
      isIndustryValid &&
      isDescriptionValid
    ) {
      setIsSubmitting(true);
      try {
        const response = await fetch("/api/competitive/competitors", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            domain,
            website_url: websiteUrl,
            industry,
            description,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to add competitor");
        }

        // Reset form
        setName("");
        setDomain("");
        setWebsiteUrl("");
        setIndustry("");
        setDescription("");
        setErrors({});
        setTouched({});
        setOpen(false);
        onCompetitorAdded();
      } catch (error) {
        console.error("Error adding competitor:", error);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Focus on first error field
      const firstErrorField = document.querySelector(".field-error");
      if (firstErrorField instanceof HTMLElement) {
        firstErrorField.focus();
      }
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
                  {description.length > 0 && (
                    <span
                      className={description.length > 500 ? "text-red-500" : ""}
                    >
                      {" "}
                      ({description.length}/500)
                    </span>
                  )}
                </span>
              </label>
              <Input
                id="description"
                type="text"
                placeholder="Brief description of the competitor, their main products, market position, etc."
                className={`field-input ${
                  errors.description
                    ? "field-error"
                    : touched.description && !errors.description && description
                      ? "field-success"
                      : ""
                }`}
                value={description}
                onChange={e => {
                  setDescription(e.target.value);
                  validateField("description", e.target.value);
                }}
                onBlur={() => {
                  setTouched({ ...touched, description: true });
                }}
              />
              {errors.description && (
                <div className="error-message">
                  <AlertCircle size={16} />
                  {errors.description}
                </div>
              )}
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
              disabled={isSubmitting || Object.keys(errors).length > 0}
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
