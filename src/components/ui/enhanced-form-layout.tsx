/**
 * Enhanced Form Layout System
 * Production-grade form layouts with adaptive grids and smart field organization
 */

"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Info,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  HelpCircle,
  Zap,
  Star,
} from "lucide-react";

interface FormLayoutContextType {
  layout: "single" | "two-column" | "three-column" | "auto";
  spacing: "compact" | "comfortable" | "relaxed";
  showValidation: boolean;
  showOptionalBadges: boolean;
}

interface FormSectionProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
  required?: boolean;
  badge?: React.ReactNode;
}

interface FormRowProps {
  children: React.ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | "auto";
  align?: "start" | "center" | "end" | "stretch";
  spacing?: "compact" | "comfortable" | "relaxed";
}

interface FormFieldProps {
  children: React.ReactNode;
  label?: string;
  description?: string;
  error?: string | string[];
  warning?: string;
  success?: string;
  required?: boolean;
  optional?: boolean;
  className?: string;
  fieldClassName?: string;
  labelClassName?: string;
  span?: 1 | 2 | 3 | "full";
  helpText?: string;
  tooltip?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  showCharacterCount?: boolean;
  maxLength?: number;
  currentLength?: number;
  id?: string;
}

interface FormGroupProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  layout?: "vertical" | "horizontal" | "inline";
  spacing?: "tight" | "normal" | "loose";
}

interface FieldValidationProps {
  error?: string | string[];
  warning?: string;
  success?: string;
  id?: string;
  className?: string;
}

interface FieldHelpProps {
  text?: string;
  tooltip?: string;
  id?: string;
  className?: string;
}

interface CharacterCountProps {
  current: number;
  max: number;
  className?: string;
}

interface ConditionalFieldProps {
  children: React.ReactNode;
  show: boolean;
  animate?: boolean;
  className?: string;
}

interface SmartFieldGroupProps {
  children: React.ReactNode;
  title?: string;
  adaptive?: boolean;
  breakpoints?: {
    sm?: number;
    md?: number;
    lg?: number;
  };
  className?: string;
}

const FormLayoutContext = createContext<FormLayoutContextType>({
  layout: "single",
  spacing: "comfortable",
  showValidation: true,
  showOptionalBadges: true,
});

/**
 * Form Layout Provider
 */
export const FormLayoutProvider: React.FC<{
  children: React.ReactNode;
  layout?: FormLayoutContextType["layout"];
  spacing?: FormLayoutContextType["spacing"];
  showValidation?: boolean;
  showOptionalBadges?: boolean;
}> = ({
  children,
  layout = "single",
  spacing = "comfortable",
  showValidation = true,
  showOptionalBadges = true,
}) => {
  return (
    <FormLayoutContext.Provider
      value={{
        layout,
        spacing,
        showValidation,
        showOptionalBadges,
      }}
    >
      {children}
    </FormLayoutContext.Provider>
  );
};

export const useFormLayout = () => useContext(FormLayoutContext);

/**
 * Form Section Component
 */
export const FormSection: React.FC<FormSectionProps> = ({
  children,
  title,
  description,
  icon,
  collapsible = false,
  defaultCollapsed = false,
  className,
  required = false,
  badge,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <div className={cn("space-y-4", className)}>
      {(title || description) && (
        <div
          className={cn(
            "border-border/50 border-b pb-3",
            collapsible && "cursor-pointer select-none"
          )}
          onClick={collapsible ? () => setIsCollapsed(!isCollapsed) : undefined}
          role={collapsible ? "button" : undefined}
          aria-expanded={collapsible ? !isCollapsed : undefined}
          tabIndex={collapsible ? 0 : undefined}
          onKeyDown={
            collapsible
              ? e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setIsCollapsed(!isCollapsed);
                  }
                }
              : undefined
          }
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {icon && (
                <div className="bg-primary/10 text-primary flex-shrink-0 rounded-lg p-2">
                  {icon}
                </div>
              )}
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-foreground text-lg font-semibold">
                    {title}
                    {required && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </h3>
                  {badge}
                </div>
                {description && (
                  <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                    {description}
                  </p>
                )}
              </div>
            </div>

            {collapsible && (
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <div
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    isCollapsed && "rotate-180"
                  )}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6,9 12,15 18,9" />
                  </svg>
                </div>
              </Button>
            )}
          </div>
        </div>
      )}

      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          collapsible && isCollapsed && "hidden"
        )}
      >
        {children}
      </div>
    </div>
  );
};

/**
 * Form Row Component
 */
export const FormRow: React.FC<FormRowProps> = ({
  children,
  className,
  columns = "auto",
  align = "stretch",
  spacing = "comfortable",
}) => {
  const spacingClasses = {
    compact: "gap-3",
    comfortable: "gap-4",
    relaxed: "gap-6",
  };

  const alignClasses = {
    start: "items-start",
    center: "items-center",
    end: "items-end",
    stretch: "items-stretch",
  };

  const getGridCols = () => {
    if (columns === "auto") return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
    return `grid-cols-${columns}`;
  };

  return (
    <div
      className={cn(
        "grid w-full",
        getGridCols(),
        spacingClasses[spacing],
        alignClasses[align],
        className
      )}
    >
      {children}
    </div>
  );
};

/**
 * Form Field Component
 */
export const FormField: React.FC<FormFieldProps> = ({
  children,
  label,
  description,
  error,
  warning,
  success,
  required = false,
  optional = false,
  className,
  fieldClassName,
  labelClassName,
  span = 1,
  helpText,
  tooltip,
  badge,
  icon,
  actions,
  showCharacterCount = false,
  maxLength,
  currentLength = 0,
  id,
}) => {
  const { showValidation, showOptionalBadges } = useFormLayout();
  const [showPassword, setShowPassword] = useState(false);

  const hasError =
    error && (Array.isArray(error) ? error.length > 0 : error.length > 0);
  const hasWarning = warning && warning.length > 0;
  const hasSuccess = success && success.length > 0;

  const spanClasses = {
    1: "col-span-1",
    2: "col-span-2",
    3: "col-span-3",
    full: "col-span-full",
  };

  return (
    <div className={cn("space-y-2", spanClasses[span], className)}>
      {/* Field Label */}
      {label && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {icon && (
              <div className="text-muted-foreground flex-shrink-0">{icon}</div>
            )}
            <Label
              className={cn(
                "text-sm font-medium",
                hasError && "text-destructive",
                hasSuccess && "text-green-600",
                labelClassName
              )}
              htmlFor={id}
            >
              {label}
              {required && (
                <span className="text-destructive ml-1" aria-label="required">
                  *
                </span>
              )}
            </Label>

            {showOptionalBadges && optional && (
              <Badge variant="secondary" className="text-xs">
                Optional
              </Badge>
            )}

            {badge}

            {tooltip && (
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground transition-colors"
                title={tooltip}
                aria-label="More information"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            )}
          </div>

          {actions && (
            <div className="flex items-center space-x-2 text-sm">{actions}</div>
          )}
        </div>
      )}

      {/* Field Description */}
      {description && (
        <p className="text-muted-foreground text-sm leading-relaxed">
          {description}
        </p>
      )}

      {/* Field Input */}
      <div className={cn("relative", fieldClassName)}>
        {children}

        {/* Character Count */}
        {showCharacterCount && maxLength && (
          <div className="text-muted-foreground absolute right-3 bottom-2 text-xs">
            <CharacterCount current={currentLength} max={maxLength} />
          </div>
        )}
      </div>

      {/* Field Validation & Help */}
      <div className="space-y-1">
        {showValidation && (
          <FieldValidation
            {...(error !== undefined && { error })}
            {...(warning !== undefined && { warning })}
            {...(success !== undefined && { success })}
            {...(id && { id: `${id}-validation` })}
          />
        )}

        {helpText && (
          <FieldHelp
            text={helpText}
            {...(tooltip && { tooltip })}
            {...(id && { id: `${id}-help` })}
          />
        )}
      </div>
    </div>
  );
};

/**
 * Form Group Component
 */
export const FormGroup: React.FC<FormGroupProps> = ({
  children,
  title,
  description,
  className,
  layout = "vertical",
  spacing = "normal",
}) => {
  const layoutClasses = {
    vertical: "flex-col space-y-4",
    horizontal: "flex-row space-x-4",
    inline: "flex-row flex-wrap gap-4",
  };

  const spacingClasses = {
    tight: "space-y-2",
    normal: "space-y-4",
    loose: "space-y-6",
  };

  return (
    <div className={cn("space-y-3", className)}>
      {(title || description) && (
        <div>
          {title && (
            <h4 className="text-foreground text-base font-medium">{title}</h4>
          )}
          {description && (
            <p className="text-muted-foreground mt-1 text-sm">{description}</p>
          )}
        </div>
      )}

      <div
        className={cn(
          "flex",
          layoutClasses[layout],
          layout === "vertical" && spacingClasses[spacing]
        )}
      >
        {children}
      </div>
    </div>
  );
};

/**
 * Field Validation Component
 */
export const FieldValidation: React.FC<
  FieldValidationProps & { id?: string }
> = ({ error, warning, success, className, id }) => {
  const errors = Array.isArray(error) ? error : error ? [error] : [];

  return (
    <div
      className={cn("space-y-1", className)}
      id={id}
      role="alert"
      aria-live="polite"
    >
      {errors.map((err, index) => (
        <div
          key={index}
          className="text-destructive flex items-start space-x-2 text-sm"
        >
          <AlertCircle
            className="mt-0.5 h-4 w-4 flex-shrink-0"
            aria-hidden="true"
          />
          <span>{err}</span>
        </div>
      ))}

      {warning && (
        <div className="flex items-start space-x-2 text-sm text-amber-600">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>{warning}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start space-x-2 text-sm text-green-600">
          <CheckCircle
            className="mt-0.5 h-4 w-4 flex-shrink-0"
            aria-hidden="true"
          />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
};

/**
 * Field Help Component
 */
export const FieldHelp: React.FC<FieldHelpProps & { id?: string }> = ({
  text,
  tooltip,
  className,
  id,
}) => {
  if (!text) return null;

  return (
    <div
      className={cn(
        "text-muted-foreground flex items-start space-x-2 text-sm",
        className
      )}
      id={id}
    >
      <Info className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span className="leading-relaxed">{text}</span>
      {tooltip && (
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground transition-colors"
          title={tooltip}
          aria-label="Additional help"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

/**
 * Character Count Component
 */
export const CharacterCount: React.FC<CharacterCountProps> = ({
  current,
  max,
  className,
}) => {
  const percentage = (current / max) * 100;
  const isNearLimit = percentage > 80;
  const isOverLimit = current > max;

  return (
    <span
      className={cn(
        "tabular-nums transition-colors",
        isOverLimit && "text-destructive",
        isNearLimit && !isOverLimit && "text-amber-600",
        !isNearLimit && "text-muted-foreground",
        className
      )}
    >
      {current}/{max}
    </span>
  );
};

/**
 * Conditional Field Component
 */
export const ConditionalField: React.FC<ConditionalFieldProps> = ({
  children,
  show,
  animate = true,
  className,
}) => {
  const [shouldRender, setShouldRender] = useState(show);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
    } else if (animate) {
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    } else {
      setShouldRender(false);
    }
    // No cleanup needed for non-animated paths
    return undefined;
  }, [show, animate]);

  if (!shouldRender) return null;

  return (
    <div
      className={cn(
        "transition-all duration-300 ease-in-out",
        animate && !show && "translate-y-[-10px] scale-95 opacity-0",
        animate && show && "translate-y-0 scale-100 opacity-100",
        !animate && !show && "hidden",
        className
      )}
    >
      {children}
    </div>
  );
};

/**
 * Smart Field Group with Adaptive Layout
 */
export const SmartFieldGroup: React.FC<SmartFieldGroupProps> = ({
  children,
  title,
  adaptive = true,
  breakpoints = { sm: 1, md: 2, lg: 3 },
  className,
}) => {
  const [columns, setColumns] = useState(1);

  useEffect(() => {
    if (!adaptive) return;

    const updateColumns = () => {
      const width = window.innerWidth;
      if (width >= 1024) setColumns(breakpoints.lg || 3);
      else if (width >= 768) setColumns(breakpoints.md || 2);
      else setColumns(breakpoints.sm || 1);
    };

    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, [adaptive, breakpoints]);

  return (
    <div className={cn("space-y-4", className)}>
      {title && (
        <h4 className="text-foreground flex items-center space-x-2 text-base font-medium">
          <span>{title}</span>
          {adaptive && (
            <Badge variant="outline" className="text-xs">
              <Zap className="mr-1 h-3 w-3" />
              Adaptive
            </Badge>
          )}
        </h4>
      )}

      <div
        className={cn(
          "grid gap-4",
          `grid-cols-1 md:grid-cols-${Math.min(columns, 3)}`
        )}
      >
        {children}
      </div>
    </div>
  );
};

/**
 * Priority Field Component
 */
export const PriorityField: React.FC<
  FormFieldProps & { priority?: "high" | "medium" | "low" }
> = ({ priority = "medium", className, ...props }) => {
  const priorityStyles = {
    high: "ring-2 ring-red-200 bg-red-50/50",
    medium: "ring-1 ring-amber-200 bg-amber-50/50",
    low: "ring-1 ring-blue-200 bg-blue-50/50",
  };

  const priorityIcons = {
    high: <Star className="h-4 w-4 text-red-500" />,
    medium: <AlertCircle className="h-4 w-4 text-amber-500" />,
    low: <Info className="h-4 w-4 text-blue-500" />,
  };

  return (
    <FormField
      {...props}
      className={cn(
        "rounded-lg border p-4 transition-all duration-200",
        priorityStyles[priority],
        className
      )}
      icon={priorityIcons[priority]}
    />
  );
};
