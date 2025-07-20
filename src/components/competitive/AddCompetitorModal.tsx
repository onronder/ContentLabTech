"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  onSuccess?: (competitor: unknown) => void;
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

// Accessibility helper functions
const announceToScreenReader = (message: string) => {
  const announcement = document.createElement("div");
  announcement.setAttribute("aria-live", "polite");
  announcement.className = "sr-only";
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    if (document.body.contains(announcement)) {
      document.body.removeChild(announcement);
    }
  }, 1000);
};

const announceSubmissionStatus = (message: string) => {
  const announcement = document.createElement("div");
  announcement.setAttribute("aria-live", "assertive");
  announcement.setAttribute("aria-atomic", "true");
  announcement.className = "sr-only";
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    if (document.body.contains(announcement)) {
      document.body.removeChild(announcement);
    }
  }, 1000);
};

export function AddCompetitorModal({
  onCompetitorAdded,
  teamId,
  onSuccess,
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

  // Mobile-specific helper functions
  const handleMobileFocus = useCallback((fieldName: string) => {
    if (window.innerWidth <= 768) {
      // Scroll field into view on mobile
      setTimeout(() => {
        const field = document.getElementById(`competitor-${fieldName}`);
        if (field) {
          field.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });
        }
      }, 300); // Wait for virtual keyboard
    }
  }, []);

  // Touch-friendly validation feedback
  const showMobileValidationFeedback = useCallback(
    (fieldName: string, isValid: boolean) => {
      if (window.innerWidth <= 768) {
        // Provide haptic feedback on mobile devices
        if ("vibrate" in navigator) {
          if (isValid) {
            navigator.vibrate(50); // Short vibration for success
          } else {
            navigator.vibrate([100, 50, 100]); // Pattern for error
          }
        }
      }
    },
    []
  );

  // Accessibility helper functions
  // getFieldStateClass removed - unused function

  const getFieldValue = (fieldName: keyof ValidationErrors): string => {
    switch (fieldName) {
      case "name":
        return name;
      case "domain":
        return domain;
      case "website_url":
        return websiteUrl;
      case "industry":
        return industry;
      case "description":
        return description;
      default:
        return "";
    }
  };

  const handleFieldBlur = (fieldName: keyof ValidationErrors) => {
    setTouched({ ...touched, [fieldName]: true });

    const value = getFieldValue(fieldName);
    const isValid = validateField(fieldName, value);

    // Announce validation result to screen readers
    if (!isValid && errors[fieldName]) {
      announceToScreenReader(
        `${fieldName} field has an error: ${errors[fieldName]}`
      );
    } else if (isValid && value.trim()) {
      announceToScreenReader(`${fieldName} field is valid`);
    }

    // Provide mobile feedback
    showMobileValidationFeedback(fieldName, isValid);
  };

  // Keyboard navigation
  const handleTabNavigation = useCallback((e: KeyboardEvent) => {
    const focusableElements = document.querySelectorAll(
      'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[
      focusableElements.length - 1
    ] as HTMLElement;

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }, []);

  // Mobile-specific enhancements
  useEffect(() => {
    if (!open) return;

    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    if (isMobile) {
      // Prevent body scroll when modal is open
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalWidth = document.body.style.width;

      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";

      // Handle virtual keyboard
      const handleResize = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty("--vh", `${vh}px`);
      };

      window.addEventListener("resize", handleResize);
      handleResize();

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.width = originalWidth;
        window.removeEventListener("resize", handleResize);
      };
    }

    // Return cleanup function for non-mobile or undefined
    return undefined;
  }, [open]);

  // Focus management and keyboard navigation
  useEffect(() => {
    if (!open) return;

    // Focus first input when modal opens
    const firstInput = document.getElementById("competitor-name");
    if (firstInput) {
      setTimeout(() => {
        firstInput.focus();
        announceToScreenReader(
          "Add competitor form opened. Fill in the required fields to add a new competitor."
        );
      }, 100);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }

      if (e.key === "Tab") {
        handleTabNavigation(e);
      }

      // Submit with Ctrl+Enter
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const form = document.querySelector(
          'form[role="form"]'
        ) as HTMLFormElement;
        if (form) {
          const submitEvent = new Event("submit", {
            bubbles: true,
            cancelable: true,
          });
          form.dispatchEvent(submitEvent);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleTabNavigation]);

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
        if (!value || !value.trim()) {
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

    // eslint-disable-next-line no-console
    console.log("🔍 [FORM] Submit attempt started");

    // Clear previous errors
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

    // Validate all fields before submission
    const validationErrors: ValidationErrors = {};

    if (!name.trim()) {
      validationErrors.name = "Company name is required";
    }

    if (!domain.trim()) {
      validationErrors.domain = "Domain is required";
    }

    if (!websiteUrl.trim()) {
      validationErrors.website_url = "Website URL is required";
    }

    if (!industry || !industry.trim()) {
      validationErrors.industry = "Industry selection is required";
    }

    if (Object.keys(validationErrors).length > 0) {
      // eslint-disable-next-line no-console
      console.log("❌ [FORM] Validation failed:", {
        validationErrors,
        formState: {
          name: name.trim(),
          domain: domain.trim(),
          websiteUrl: websiteUrl.trim(),
          industry: industry.trim(),
          industryEmpty: !industry || !industry.trim(),
        },
      });
      setErrors(validationErrors);

      // Focus first error field and announce errors
      const firstErrorField = Object.keys(validationErrors)[0];
      const errorElement = document.getElementById(
        `competitor-${firstErrorField}`
      );
      errorElement?.focus();

      const errorCount = Object.keys(validationErrors).length;
      announceSubmissionStatus(
        `Form has ${errorCount} error${errorCount === 1 ? "" : "s"}. Please correct the errors and try again.`
      );
      return;
    }

    // Additional validation using existing validateField
    const validations = [
      validateField("name", name),
      validateField("domain", domain),
      validateField("website_url", websiteUrl),
      validateField("industry", industry),
      validateField("description", description),
    ];

    const isFormValid = validations.every(Boolean);

    if (!isFormValid) {
      // eslint-disable-next-line no-console
      console.log("❌ [FORM] Secondary validation failed:", errors);
      return;
    }

    // eslint-disable-next-line no-console
    console.log("🔍 [FORM] Validation passed, submitting data:", {
      name: name.trim(),
      domain: domain.trim(),
      website_url: websiteUrl.trim(),
      industry: industry,
      industryIsEmpty: !industry,
      industryLength: industry?.length || 0,
      description: description ? `${description.substring(0, 30)}...` : "Empty",
    });

    setIsSubmitting(true);

    try {
      const formData = {
        name: name.trim(),
        domain: domain.trim(),
        website_url: websiteUrl.trim(),
        industry: industry,
        description: description.trim() || null,
        teamId: teamId,
      };

      // eslint-disable-next-line no-console
      console.log("🔍 [FORM] Final form data prepared:", {
        ...formData,
        industryCheck: {
          value: industry,
          isEmpty: !industry,
          length: industry?.length || 0,
          type: typeof industry,
        },
      });

      // Submit to API
      const response = await fetch("/api/competitive/competitors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Important for cookie-based auth
        body: JSON.stringify(formData),
      });

      // eslint-disable-next-line no-console
      console.log("🔍 [FORM] API response status:", response.status);

      const result = await response.json();
      // eslint-disable-next-line no-console
      console.log("🔍 [FORM] API response data:", result);

      if (!response.ok) {
        // Handle specific error codes
        if (result.code === "NO_SESSION") {
          setSubmitError("Please log in again to continue");
          announceSubmissionStatus(
            "Authentication required - please refresh the page"
          );
        } else if (result.code === "NO_TEAM") {
          setSubmitError("No active team membership found");
          announceSubmissionStatus(
            "Team access required - please contact your administrator"
          );
        } else if (result.code === "TABLE_MISSING") {
          setSubmitError("Database setup required");
          announceSubmissionStatus(
            "System setup in progress - please try again in a moment"
          );
        } else if (
          result.code === "CREATE_COMPETITOR_ERROR" &&
          result.details?.includes("duplicate key")
        ) {
          setSubmitError("This competitor domain already exists in your team");
          announceSubmissionStatus(
            "Competitor with this domain already exists"
          );
        } else {
          setSubmitError(result.error || "Failed to add competitor");
          announceSubmissionStatus(result.error || "Something went wrong");
        }

        console.error("❌ [FORM] API error:", result);
        return;
      }

      // Success handling
      // eslint-disable-next-line no-console
      console.log("✅ [FORM] Competitor added successfully:", result.data);

      setSubmitSuccess(true);
      announceSubmissionStatus(
        `Success! ${name.trim()} has been added to your competitive intelligence dashboard.`
      );

      // Call success callback
      onCompetitorAdded();

      // Refresh the competitors list
      if (onSuccess) {
        onSuccess(result.data);
      }

      // Reset form
      setName("");
      setDomain("");
      setWebsiteUrl("");
      setIndustry("");
      setDescription("");
      setErrors({});
      setTouched({});
      setAutoCompletedFields({});

      // Auto-close modal after success
      setTimeout(() => {
        setOpen(false);
      }, 2000);
    } catch (error) {
      console.error("❌ [FORM] Unexpected error:", error);
      setSubmitError("Network error - please check your connection");
      announceSubmissionStatus("Network error - please try again");
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
        // Only reset form when dialog is explicitly closed, not during validation
        if (!newOpen && !isSubmitting) {
          setOpen(newOpen);
          resetForm();
        } else if (newOpen) {
          setOpen(newOpen);
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
          <DialogTitle
            id="competitor-form-title"
            className="bg-gradient-primary mb-2 bg-clip-text text-xl font-bold text-transparent"
          >
            Add New Competitor
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Add a new competitor to your competitive intelligence database.
            Required fields are marked with an asterisk.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="mt-4 space-y-6"
          role="form"
          aria-labelledby="competitor-form-title"
        >
          {/* Error display at top of form */}
          {submitError && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3">
              <div className="flex items-center">
                <AlertCircle className="mr-2 h-4 w-4 text-red-500" />
                <p className="text-sm text-red-700">{submitError}</p>
              </div>
            </div>
          )}

          <fieldset
            className="form-container"
            aria-label="Competitor Information"
          >
            <div className="form-field">
              <label htmlFor="competitor-name" className="field-label required">
                Company Name *
                <span id="competitor-name-hint" className="field-hint">
                  The official name of the competitor
                </span>
              </label>
              <Input
                id="competitor-name"
                type="text"
                inputMode="text"
                autoComplete="organization"
                autoCapitalize="words"
                autoCorrect="off"
                spellCheck="true"
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
                onBlur={() => handleFieldBlur("name")}
                onFocus={() => handleMobileFocus("name")}
                aria-required="true"
                aria-invalid={errors.name ? "true" : "false"}
                aria-describedby={`${errors.name ? "competitor-name-error" : ""} ${touched.name && !errors.name && name.trim() ? "competitor-name-success" : ""} competitor-name-hint`.trim()}
              />
              {errors.name && touched.name && (
                <div
                  id="competitor-name-error"
                  className="error-message"
                  role="alert"
                  aria-live="polite"
                >
                  <AlertCircle size={16} aria-hidden="true" />
                  {errors.name}
                </div>
              )}
              {touched.name && !errors.name && name.trim() && (
                <div
                  id="competitor-name-success"
                  className="success-message"
                  role="status"
                  aria-live="polite"
                >
                  <CheckCircle size={16} aria-hidden="true" />
                  Looks good!
                </div>
              )}
            </div>

            <div className="form-field">
              <label
                htmlFor="competitor-domain"
                className="field-label required"
              >
                Domain *
                <span id="competitor-domain-hint" className="field-hint">
                  Domain without http:// or www
                </span>
              </label>
              <Input
                id="competitor-domain"
                type="text"
                inputMode="url"
                autoComplete="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
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
                onBlur={() => handleFieldBlur("domain")}
                onFocus={() => handleMobileFocus("domain")}
                aria-required="true"
                aria-invalid={errors.domain ? "true" : "false"}
                aria-describedby={`${errors.domain ? "competitor-domain-error" : ""} ${touched.domain && !errors.domain && domain.trim() ? "competitor-domain-success" : ""} ${autoCompletedFields.domain ? "competitor-domain-auto" : ""} competitor-domain-hint`.trim()}
              />
              {errors.domain && touched.domain && (
                <div
                  id="competitor-domain-error"
                  className="error-message"
                  role="alert"
                  aria-live="polite"
                >
                  <AlertCircle size={16} aria-hidden="true" />
                  {errors.domain}
                </div>
              )}
              {autoCompletedFields.domain && (
                <div
                  id="competitor-domain-auto"
                  className="auto-completion-hint"
                  role="status"
                  aria-live="polite"
                >
                  <Sparkles size={12} aria-hidden="true" />
                  Auto-extracted from website URL
                </div>
              )}
              {touched.domain &&
                !errors.domain &&
                domain.trim() &&
                !autoCompletedFields.domain && (
                  <div
                    id="competitor-domain-success"
                    className="success-message"
                    role="status"
                    aria-live="polite"
                  >
                    <CheckCircle size={16} aria-hidden="true" />
                    Looks good!
                  </div>
                )}
            </div>

            <div className="form-field">
              <label
                htmlFor="competitor-website-url"
                className="field-label required"
              >
                Website URL *
                <span id="competitor-website-hint" className="field-hint">
                  Full website URL including https://
                </span>
              </label>
              <Input
                id="competitor-website-url"
                type="url"
                inputMode="url"
                autoComplete="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
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
                onFocus={() => handleMobileFocus("website-url")}
                aria-required="true"
                aria-invalid={errors.website_url ? "true" : "false"}
                aria-describedby={`${errors.website_url ? "competitor-website-error" : ""} ${touched.website_url && !errors.website_url && websiteUrl.trim() ? "competitor-website-success" : ""} ${autoCompletedFields.website_url ? "competitor-website-auto" : ""} competitor-website-hint`.trim()}
              />
              {errors.website_url && touched.website_url && (
                <div
                  id="competitor-website-error"
                  className="error-message"
                  role="alert"
                  aria-live="polite"
                >
                  <AlertCircle size={16} aria-hidden="true" />
                  {errors.website_url}
                </div>
              )}
              {autoCompletedFields.website_url && (
                <div
                  id="competitor-website-auto"
                  className="auto-completion-hint"
                  role="status"
                  aria-live="polite"
                >
                  <Sparkles size={12} aria-hidden="true" />
                  Auto-suggested from domain
                </div>
              )}
              {touched.website_url &&
                !errors.website_url &&
                websiteUrl.trim() &&
                !autoCompletedFields.website_url && (
                  <div
                    id="competitor-website-success"
                    className="success-message"
                    role="status"
                    aria-live="polite"
                  >
                    <CheckCircle size={16} aria-hidden="true" />
                    Looks good!
                  </div>
                )}
            </div>

            <div className="form-field">
              <label
                htmlFor="competitor-industry"
                className="field-label required"
              >
                Industry *
                <span id="competitor-industry-hint" className="field-hint">
                  Select the competitor&apos;s primary industry
                </span>
              </label>
              <select
                id="competitor-industry"
                autoComplete="organization-title"
                className={`field-input field-select ${
                  errors.industry
                    ? "field-error"
                    : touched.industry && !errors.industry && industry
                      ? "field-success"
                      : ""
                }`}
                value={industry}
                onChange={e => {
                  const value = e.target.value;
                  // eslint-disable-next-line no-console
                  console.log("🔍 [FORM] Industry onChange:", {
                    value,
                    previousValue: industry,
                    touched: touched.industry,
                  });

                  setIndustry(value);

                  // Always validate on change to provide immediate feedback
                  if (value || touched.industry) {
                    validateField("industry", value);
                  }
                }}
                onBlur={() => handleFieldBlur("industry")}
                onFocus={() => handleMobileFocus("industry")}
                aria-required="true"
                aria-invalid={errors.industry ? "true" : "false"}
                aria-describedby={`${errors.industry ? "competitor-industry-error" : ""} ${touched.industry && !errors.industry && industry ? "competitor-industry-success" : ""} competitor-industry-hint`.trim()}
              >
                <option value="">Select industry</option>
                {INDUSTRY_OPTIONS.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.industry && touched.industry && (
                <div
                  id="competitor-industry-error"
                  className="error-message"
                  role="alert"
                  aria-live="polite"
                >
                  <AlertCircle size={16} aria-hidden="true" />
                  {errors.industry}
                </div>
              )}
              {touched.industry && !errors.industry && industry && (
                <div
                  id="competitor-industry-success"
                  className="success-message"
                  role="status"
                  aria-live="polite"
                >
                  <CheckCircle size={16} aria-hidden="true" />
                  Looks good!
                </div>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="competitor-description" className="field-label">
                Description
                <span id="competitor-description-hint" className="field-hint">
                  Additional context about this competitor (optional)
                </span>
              </label>
              <textarea
                id="competitor-description"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="sentences"
                autoCorrect="on"
                spellCheck="true"
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
                onBlur={() => handleFieldBlur("description")}
                onFocus={() => handleMobileFocus("description")}
                rows={4}
                maxLength={MAX_DESCRIPTION_LENGTH + 50}
                aria-required="false"
                aria-invalid={errors.description ? "true" : "false"}
                aria-describedby={`${errors.description ? "competitor-description-error" : ""} competitor-description-hint competitor-description-counter`.trim()}
              />

              <div className="field-footer">
                <div
                  id="competitor-description-counter"
                  className="character-counter"
                  aria-live="polite"
                >
                  <span
                    className={`character-count ${
                      description.length > MAX_DESCRIPTION_LENGTH
                        ? "over-limit"
                        : description.length > MAX_DESCRIPTION_LENGTH * 0.8
                          ? "near-limit"
                          : ""
                    }`}
                    aria-label={`Character count: ${description.length} of ${MAX_DESCRIPTION_LENGTH} characters used`}
                  >
                    {description.length}/{MAX_DESCRIPTION_LENGTH}
                  </span>
                  {description.length > MAX_DESCRIPTION_LENGTH && (
                    <span className="over-limit-text" role="alert">
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
                <div
                  id="competitor-description-error"
                  className="error-message"
                  role="alert"
                  aria-live="polite"
                >
                  <AlertCircle size={16} aria-hidden="true" />
                  {errors.description}
                </div>
              )}
            </div>
          </fieldset>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-secondary"
              disabled={isSubmitting}
              aria-label="Cancel adding competitor and close dialog"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || Object.keys(errors).length > 0}
              className={`flex items-center justify-center rounded-md px-4 py-2 font-medium ${
                isSubmitting || Object.keys(errors).length > 0
                  ? "cursor-not-allowed bg-gray-300 text-gray-500"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              } `}
              aria-label={
                isSubmitting
                  ? "Adding competitor, please wait"
                  : "Add competitor to database"
              }
              aria-describedby={
                isSubmitting ? "submit-loading-status" : undefined
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span id="submit-loading-status">Adding Competitor...</span>
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Competitor
                </>
              )}
            </button>
          </div>

          {submitSuccess && (
            <div
              className="submission-feedback success"
              role="status"
              aria-live="polite"
            >
              <div className="feedback-content">
                <CheckCircle size={20} aria-hidden="true" />
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
