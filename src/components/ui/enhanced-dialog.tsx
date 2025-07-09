/**
 * Enhanced Dialog Component
 * Production-grade modal system with adaptive layouts and micro-interactions
 */

"use client";

import React, { useState, useEffect, useRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface EnhancedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full" | "auto";
  position?: "center" | "top" | "bottom";
  closable?: boolean;
  resizable?: boolean;
  draggable?: boolean;
  className?: string;
  overlayClassName?: string;
  animation?: "scale" | "slide" | "fade" | "bounce";
  preventClose?: boolean;
  onClose?: () => void;
}

interface EnhancedDialogContentProps {
  children: React.ReactNode;
  className?: string;
  size?: EnhancedDialogProps["size"];
  position?: EnhancedDialogProps["position"];
  animation?: EnhancedDialogProps["animation"];
  resizable?: boolean;
  draggable?: boolean;
}

interface EnhancedDialogHeaderProps {
  children: React.ReactNode;
  className?: string;
  closable?: boolean;
  onClose?: () => void;
  resizable?: boolean;
  draggable?: boolean;
  showControls?: boolean;
}

interface EnhancedDialogTitleProps {
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  subtitle?: string;
}

interface EnhancedDialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

interface EnhancedDialogBodyProps {
  children: React.ReactNode;
  className?: string;
  scrollable?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

interface EnhancedDialogFooterProps {
  children: React.ReactNode;
  className?: string;
  layout?: "space-between" | "end" | "center" | "start";
  sticky?: boolean;
}

interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  onStepChange: (step: number) => void;
  steps: Array<{
    id: string;
    title: string;
    description?: string;
    icon?: React.ReactNode;
    completed?: boolean;
    disabled?: boolean;
  }>;
  showLabels?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "w-full sm:max-w-md max-w-none",
  md: "w-full sm:max-w-lg max-w-none",
  lg: "w-full sm:max-w-2xl max-w-none",
  xl: "w-full sm:max-w-4xl max-w-none",
  full: "w-full max-w-[95vw] h-full max-h-[95vh]",
  auto: "w-full sm:w-fit sm:max-w-fit max-w-none",
};

const positionClasses = {
  center: "items-center justify-center",
  top: "items-start justify-center pt-[10vh]",
  bottom: "items-end justify-center pb-[10vh]",
};

const animationClasses = {
  scale:
    "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
  slide:
    "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom-[48%] data-[state=open]:slide-in-from-bottom-[48%]",
  fade: "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
  bounce:
    "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=open]:duration-300",
};

/**
 * Enhanced Dialog Root Component
 */
export const EnhancedDialog: React.FC<EnhancedDialogProps> = ({
  open,
  onOpenChange,
  children,
  preventClose = false,
  onClose,
  ...props
}) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.classList.add("modal-open");
      // Store original overflow
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      return () => {
        document.body.classList.remove("modal-open");
        document.body.style.overflow = originalOverflow;
      };
    }
    return undefined;
  }, [open]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && preventClose) {
      return;
    }

    if (!newOpen && onClose) {
      onClose();
    }

    onOpenChange(newOpen);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      {children}
    </DialogPrimitive.Root>
  );
};

/**
 * Enhanced Dialog Trigger
 */
export const EnhancedDialogTrigger = DialogPrimitive.Trigger;

/**
 * Enhanced Dialog Overlay
 */
export const EnhancedDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> & {
    blur?: boolean;
    opacity?: number;
  }
>(({ className, blur = true, opacity = 0.8, children, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-[100] bg-black/80 transition-all duration-300",
      "flex items-center justify-center",
      "p-0 sm:p-4", // Padding only on larger screens
      blur && "backdrop-blur-sm",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      "enhanced-dialog-overlay",
      className
    )}
    style={{ backgroundColor: `rgba(0, 0, 0, ${opacity})` }}
    data-overlay=""
    {...props}
  >
    {children}
  </DialogPrimitive.Overlay>
));
EnhancedDialogOverlay.displayName = "EnhancedDialogOverlay";

/**
 * Enhanced Dialog Content
 */
export const EnhancedDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> &
    EnhancedDialogContentProps
>(
  (
    {
      className,
      children,
      size = "md",
      position = "center",
      animation = "scale",
      resizable = false,
      draggable = false,
      ...props
    },
    ref
  ) => {
    const [isMaximized, setIsMaximized] = useState(false);
    const [dimensions, setDimensions] = useState({
      width: "auto",
      height: "auto",
    });
    const contentRef = useRef<HTMLDivElement>(null);

    // Focus management for accessibility
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && contentRef.current) {
          e.preventDefault();
          // Let Radix handle the escape key
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Auto-focus first interactive element when modal opens
    useEffect(() => {
      if (contentRef.current) {
        const firstFocusable = contentRef.current.querySelector<HTMLElement>(
          'button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
        );
        if (firstFocusable) {
          // Small delay to ensure modal is fully rendered
          setTimeout(() => {
            firstFocusable.focus();
          }, 100);
        }
      }
    }, []);

    const handleResize = (
      direction: string,
      delta: { width: number; height: number }
    ) => {
      if (!resizable) return;

      setDimensions(prev => ({
        width:
          typeof prev.width === "number"
            ? (prev.width + delta.width).toString()
            : delta.width.toString(),
        height:
          typeof prev.height === "number"
            ? (prev.height + delta.height).toString()
            : delta.height.toString(),
      }));
    };

    return (
      <DialogPrimitive.Portal>
        <EnhancedDialogOverlay>
          <DialogPrimitive.Content
            ref={ref}
            className={cn(
              "bg-background relative z-[110] grid w-full gap-0 border shadow-2xl duration-300",
              "border-border/50 mx-auto my-auto rounded-xl",
              "max-h-[90vh] overflow-hidden",
              // Responsive sizing
              "max-h-[100vh] rounded-b-none sm:max-h-[90vh] sm:rounded-xl",
              "m-0 sm:m-4",
              "enhanced-dialog-content",
              sizeClasses[size],
              animationClasses[animation],
              isMaximized && "!h-[95vh] !max-h-[95vh] !w-[95vw] !max-w-[95vw]",
              resizable &&
                "resize-both min-h-[200px] min-w-[300px] overflow-auto",
              className
            )}
            style={resizable ? dimensions : undefined}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            data-content=""
            {...props}
          >
            <div
              ref={contentRef}
              className={cn(
                "flex max-h-[inherit] flex-col",
                draggable && "cursor-move"
              )}
            >
              {children}
            </div>

            {/* Resize handles */}
            {resizable && !isMaximized && (
              <div className="absolute right-0 bottom-0 h-4 w-4 cursor-se-resize opacity-50 transition-opacity hover:opacity-100">
                <div className="border-muted-foreground/50 absolute right-1 bottom-1 h-2 w-2 border-r-2 border-b-2" />
              </div>
            )}
          </DialogPrimitive.Content>
        </EnhancedDialogOverlay>
      </DialogPrimitive.Portal>
    );
  }
);
EnhancedDialogContent.displayName = "EnhancedDialogContent";

/**
 * Enhanced Dialog Header
 */
export const EnhancedDialogHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & EnhancedDialogHeaderProps
>(
  (
    {
      className,
      children,
      closable = true,
      onClose,
      resizable = false,
      draggable = false,
      showControls = false,
      ...props
    },
    ref
  ) => {
    const [isMaximized, setIsMaximized] = useState(false);

    return (
      <div
        ref={ref}
        className={cn(
          "border-border/50 bg-muted/30 flex flex-col space-y-1.5 border-b",
          "relative px-6 py-4",
          draggable && "cursor-move",
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">{children}</div>

          {(showControls || closable) && (
            <div className="ml-4 flex items-center space-x-1">
              {showControls && resizable && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="hover:bg-muted h-8 w-8 p-0"
                  onClick={() => setIsMaximized(!isMaximized)}
                  aria-label={
                    isMaximized ? "Restore window" : "Maximize window"
                  }
                >
                  {isMaximized ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
              )}

              {closable && (
                <DialogPrimitive.Close asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hover:bg-muted h-8 w-8 p-0"
                    onClick={onClose}
                    aria-label="Close dialog"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </Button>
                </DialogPrimitive.Close>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);
EnhancedDialogHeader.displayName = "EnhancedDialogHeader";

/**
 * Enhanced Dialog Title
 */
export const EnhancedDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title> &
    EnhancedDialogTitleProps
>(({ className, children, icon, badge, subtitle, ...props }, ref) => (
  <div className="space-y-1">
    <DialogPrimitive.Title
      ref={ref}
      className={cn(
        "flex items-center space-x-3 text-lg leading-none font-semibold tracking-tight",
        className
      )}
      {...props}
    >
      {icon && <div className="flex-shrink-0">{icon}</div>}
      <span className="truncate">{children}</span>
      {badge && <div className="ml-auto flex-shrink-0">{badge}</div>}
    </DialogPrimitive.Title>
    {subtitle && (
      <p className="text-muted-foreground text-sm leading-relaxed">
        {subtitle}
      </p>
    )}
  </div>
));
EnhancedDialogTitle.displayName = "EnhancedDialogTitle";

/**
 * Enhanced Dialog Description
 */
export const EnhancedDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description> &
    EnhancedDialogDescriptionProps
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-muted-foreground text-sm leading-relaxed", className)}
    {...props}
  >
    {children}
  </DialogPrimitive.Description>
));
EnhancedDialogDescription.displayName = "EnhancedDialogDescription";

/**
 * Enhanced Dialog Body
 */
export const EnhancedDialogBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & EnhancedDialogBodyProps
>(
  (
    { className, children, scrollable = true, padding = "md", ...props },
    ref
  ) => {
    const paddingClasses = {
      none: "",
      sm: "p-4",
      md: "p-6",
      lg: "p-8",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "flex-1",
          scrollable && "overflow-y-auto",
          paddingClasses[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
EnhancedDialogBody.displayName = "EnhancedDialogBody";

/**
 * Enhanced Dialog Footer
 */
export const EnhancedDialogFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & EnhancedDialogFooterProps
>(({ className, children, layout = "end", sticky = false, ...props }, ref) => {
  const layoutClasses = {
    "space-between": "justify-between",
    end: "justify-end",
    center: "justify-center",
    start: "justify-start",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "border-border/50 bg-muted/30 flex items-center border-t",
        "space-x-3 px-6 py-4",
        layoutClasses[layout],
        sticky && "sticky bottom-0",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
EnhancedDialogFooter.displayName = "EnhancedDialogFooter";

/**
 * Step Navigation Component
 */
export const StepNavigation: React.FC<StepNavigationProps> = ({
  currentStep,
  totalSteps,
  onStepChange,
  steps,
  showLabels = true,
  className,
}) => {
  return (
    <div className={cn("w-full", className)}>
      {/* Progress Bar */}
      <div className="relative mb-6">
        <div className="bg-muted absolute top-4 left-0 h-0.5 w-full">
          <div
            className="bg-primary h-full transition-all duration-500 ease-out"
            style={{ width: `${(currentStep / (totalSteps - 1)) * 100}%` }}
          />
        </div>

        {/* Step Indicators */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = step.completed || index < currentStep;
            const isDisabled = step.disabled;

            return (
              <button
                key={step.id}
                onClick={() => !isDisabled && onStepChange(index)}
                disabled={isDisabled}
                className={cn(
                  "group relative flex flex-col items-center transition-all duration-200",
                  !isDisabled && "cursor-pointer hover:scale-110",
                  isDisabled && "cursor-not-allowed opacity-50"
                )}
                aria-label={`Step ${index + 1}: ${step.title}${isActive ? " (current)" : ""}${isCompleted ? " (completed)" : ""}${isDisabled ? " (disabled)" : ""}`}
                aria-current={isActive ? "step" : undefined}
              >
                {/* Step Circle */}
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-200",
                    "bg-background relative z-10",
                    isActive &&
                      "border-primary bg-primary text-primary-foreground scale-110",
                    isCompleted &&
                      !isActive &&
                      "border-green-500 bg-green-500 text-white",
                    !isActive && !isCompleted && "border-muted-foreground/30",
                    !isDisabled && "group-hover:border-primary/50"
                  )}
                >
                  {step.icon ? (
                    <div className="h-4 w-4">{step.icon}</div>
                  ) : (
                    <span className="text-xs font-medium">{index + 1}</span>
                  )}
                </div>

                {/* Step Label */}
                {showLabels && (
                  <div className="mt-2 max-w-20 text-center">
                    <div
                      className={cn(
                        "text-xs font-medium transition-colors duration-200",
                        isActive && "text-primary",
                        isCompleted && !isActive && "text-green-600",
                        !isActive && !isCompleted && "text-muted-foreground"
                      )}
                    >
                      {step.title}
                    </div>
                    {step.description && (
                      <div className="text-muted-foreground mt-1 text-xs leading-tight">
                        {step.description}
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onStepChange(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="flex items-center space-x-2"
          aria-label="Previous step"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </Button>

        <span className="text-muted-foreground text-sm">
          Step {currentStep + 1} of {totalSteps}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onStepChange(Math.min(totalSteps - 1, currentStep + 1))
          }
          disabled={currentStep === totalSteps - 1}
          className="flex items-center space-x-2"
          aria-label="Next step"
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// Export all components for easy access
export {
  EnhancedDialog as Dialog,
  EnhancedDialogTrigger as DialogTrigger,
  EnhancedDialogContent as DialogContent,
  EnhancedDialogHeader as DialogHeader,
  EnhancedDialogTitle as DialogTitle,
  EnhancedDialogDescription as DialogDescription,
  EnhancedDialogBody as DialogBody,
  EnhancedDialogFooter as DialogFooter,
  EnhancedDialogOverlay as DialogOverlay,
};
