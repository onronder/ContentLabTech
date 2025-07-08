/**
 * Enhanced Dialog Component
 * Production-grade modal system with adaptive layouts and micro-interactions
 */

"use client";

import React, { useState, useEffect, useRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { X, ChevronLeft, ChevronRight, Minimize2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EnhancedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'auto';
  position?: 'center' | 'top' | 'bottom';
  closable?: boolean;
  resizable?: boolean;
  draggable?: boolean;
  className?: string;
  overlayClassName?: string;
  animation?: 'scale' | 'slide' | 'fade' | 'bounce';
  preventClose?: boolean;
  onClose?: () => void;
}

interface EnhancedDialogContentProps {
  children: React.ReactNode;
  className?: string;
  size?: EnhancedDialogProps['size'];
  position?: EnhancedDialogProps['position'];
  animation?: EnhancedDialogProps['animation'];
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
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

interface EnhancedDialogFooterProps {
  children: React.ReactNode;
  className?: string;
  layout?: 'space-between' | 'end' | 'center' | 'start';
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
  sm: "max-w-md",
  md: "max-w-lg", 
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-[95vw] max-h-[95vh]",
  auto: "max-w-fit"
};

const positionClasses = {
  center: "items-center justify-center",
  top: "items-start justify-center pt-[10vh]",
  bottom: "items-end justify-center pb-[10vh]"
};

const animationClasses = {
  scale: "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
  slide: "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom-[48%] data-[state=open]:slide-in-from-bottom-[48%]",
  fade: "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
  bounce: "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=open]:duration-300"
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
>(({ className, blur = true, opacity = 0.8, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 transition-all duration-300",
      blur && "backdrop-blur-sm",
      className
    )}
    style={{ backgroundColor: `rgba(0, 0, 0, ${opacity})` }}
    {...props}
  />
));
EnhancedDialogOverlay.displayName = "EnhancedDialogOverlay";

/**
 * Enhanced Dialog Content
 */
export const EnhancedDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & EnhancedDialogContentProps
>(({ 
  className, 
  children, 
  size = 'md',
  position = 'center',
  animation = 'scale',
  resizable = false,
  draggable = false,
  ...props 
}, ref) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 'auto', height: 'auto' });
  const contentRef = useRef<HTMLDivElement>(null);

  const handleResize = (direction: string, delta: { width: number; height: number }) => {
    if (!resizable) return;
    
    setDimensions(prev => ({
      width: typeof prev.width === 'number' ? (prev.width + delta.width).toString() : delta.width.toString(),
      height: typeof prev.height === 'number' ? (prev.height + delta.height).toString() : delta.height.toString()
    }));
  };

  return (
    <DialogPrimitive.Portal>
      <EnhancedDialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed z-50 grid w-full gap-0 border bg-background shadow-2xl duration-300",
          "rounded-xl border-border/50",
          sizeClasses[size],
          !isMaximized && positionClasses[position],
          animationClasses[animation],
          isMaximized && "!max-w-[95vw] !max-h-[95vh] !w-[95vw] !h-[95vh]",
          resizable && "resize-both overflow-auto min-w-[300px] min-h-[200px]",
          className
        )}
        style={resizable ? dimensions : undefined}
        {...props}
      >
        <div 
          ref={contentRef}
          className={cn(
            "flex flex-col max-h-[inherit]",
            draggable && "cursor-move"
          )}
        >
          {children}
        </div>
        
        {/* Resize handles */}
        {resizable && !isMaximized && (
          <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-50 hover:opacity-100 transition-opacity">
            <div className="absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2 border-muted-foreground/50" />
          </div>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});
EnhancedDialogContent.displayName = "EnhancedDialogContent";

/**
 * Enhanced Dialog Header
 */
export const EnhancedDialogHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & EnhancedDialogHeaderProps
>(({ 
  className, 
  children, 
  closable = true, 
  onClose,
  resizable = false,
  draggable = false,
  showControls = false,
  ...props 
}, ref) => {
  const [isMaximized, setIsMaximized] = useState(false);

  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col space-y-1.5 border-b border-border/50 bg-muted/30",
        "px-6 py-4 relative",
        draggable && "cursor-move",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          {children}
        </div>
        
        {(showControls || closable) && (
          <div className="flex items-center space-x-1 ml-4">
            {showControls && resizable && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-muted"
                onClick={() => setIsMaximized(!isMaximized)}
                aria-label={isMaximized ? "Restore window" : "Maximize window"}
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
                  className="h-8 w-8 p-0 hover:bg-muted"
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
});
EnhancedDialogHeader.displayName = "EnhancedDialogHeader";

/**
 * Enhanced Dialog Title
 */
export const EnhancedDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title> & EnhancedDialogTitleProps
>(({ className, children, icon, badge, subtitle, ...props }, ref) => (
  <div className="space-y-1">
    <DialogPrimitive.Title
      ref={ref}
      className={cn(
        "flex items-center space-x-3 text-lg font-semibold leading-none tracking-tight",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="flex-shrink-0">
          {icon}
        </div>
      )}
      <span className="truncate">{children}</span>
      {badge && (
        <div className="flex-shrink-0 ml-auto">
          {badge}
        </div>
      )}
    </DialogPrimitive.Title>
    {subtitle && (
      <p className="text-sm text-muted-foreground leading-relaxed">
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
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description> & EnhancedDialogDescriptionProps
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground leading-relaxed", className)}
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
>(({ 
  className, 
  children, 
  scrollable = true, 
  padding = 'md',
  ...props 
}, ref) => {
  const paddingClasses = {
    none: "",
    sm: "p-4",
    md: "p-6", 
    lg: "p-8"
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
});
EnhancedDialogBody.displayName = "EnhancedDialogBody";

/**
 * Enhanced Dialog Footer
 */
export const EnhancedDialogFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & EnhancedDialogFooterProps
>(({ 
  className, 
  children, 
  layout = 'end',
  sticky = false,
  ...props 
}, ref) => {
  const layoutClasses = {
    'space-between': 'justify-between',
    'end': 'justify-end',
    'center': 'justify-center',
    'start': 'justify-start'
  };

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center border-t border-border/50 bg-muted/30",
        "px-6 py-4 space-x-3",
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
  className
}) => {
  return (
    <div className={cn("w-full", className)}>
      {/* Progress Bar */}
      <div className="relative mb-6">
        <div className="absolute top-4 left-0 w-full h-0.5 bg-muted">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out"
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
                  "relative flex flex-col items-center group transition-all duration-200",
                  !isDisabled && "cursor-pointer hover:scale-110",
                  isDisabled && "cursor-not-allowed opacity-50"
                )}
                aria-label={`Step ${index + 1}: ${step.title}${isActive ? ' (current)' : ''}${isCompleted ? ' (completed)' : ''}${isDisabled ? ' (disabled)' : ''}`}
                aria-current={isActive ? 'step' : undefined}
              >
                {/* Step Circle */}
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200",
                  "relative z-10 bg-background",
                  isActive && "border-primary bg-primary text-primary-foreground scale-110",
                  isCompleted && !isActive && "border-green-500 bg-green-500 text-white",
                  !isActive && !isCompleted && "border-muted-foreground/30",
                  !isDisabled && "group-hover:border-primary/50"
                )}>
                  {step.icon ? (
                    <div className="w-4 h-4">
                      {step.icon}
                    </div>
                  ) : (
                    <span className="text-xs font-medium">
                      {index + 1}
                    </span>
                  )}
                </div>
                
                {/* Step Label */}
                {showLabels && (
                  <div className="mt-2 text-center max-w-20">
                    <div className={cn(
                      "text-xs font-medium transition-colors duration-200",
                      isActive && "text-primary",
                      isCompleted && !isActive && "text-green-600",
                      !isActive && !isCompleted && "text-muted-foreground"
                    )}>
                      {step.title}
                    </div>
                    {step.description && (
                      <div className="text-xs text-muted-foreground mt-1 leading-tight">
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
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </Button>
        
        <span className="text-sm text-muted-foreground">
          Step {currentStep + 1} of {totalSteps}
        </span>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onStepChange(Math.min(totalSteps - 1, currentStep + 1))}
          disabled={currentStep === totalSteps - 1}
          className="flex items-center space-x-2"
          aria-label="Next step"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
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
  EnhancedDialogOverlay as DialogOverlay
};