import * as React from "react";

import { cn } from "@/lib/utils";

// Development debugging helper
const isDevelopment = process.env.NODE_ENV === "development";

function Input({
  className,
  type,
  disabled,
  ...props
}: React.ComponentProps<"input">) {
  // Enhanced debugging for input interaction issues
  const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    if (isDevelopment && disabled) {
      console.log("[Input Debug] Click on disabled input prevented");
    }
    props.onClick?.(e);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (isDevelopment) {
      console.log("[Input Debug] Input focused", { id: props.id, disabled });
    }
    props.onFocus?.(e);
  };

  return (
    <input
      type={type}
      data-slot="input"
      disabled={disabled}
      className={cn(
        // Base styles with production design system
        "input-field file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
        "border-input flex h-10 w-full min-w-0 rounded-lg border bg-white px-4 py-2 text-sm",
        "shadow-xs transition-all duration-200 outline-none",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        // Enhanced focus styles
        "focus-visible:border-primary-500 focus-visible:shadow-primary focus-visible:ring-primary-100 focus-visible:ring-4",
        "focus:border-primary-500 focus:shadow-primary focus:ring-primary-100 focus:ring-4",
        // Hover styles
        "hover:border-primary-300 hover:bg-neutral-50",
        // Invalid styles with design system colors
        "aria-invalid:border-error-500 aria-invalid:ring-error-100 aria-invalid:ring-4",
        "invalid:border-error-500 invalid:ring-error-100 invalid:ring-4",
        // Enhanced disabled styles with better specificity
        disabled && "pointer-events-none cursor-not-allowed opacity-50",
        // Ensure proper layering
        "relative z-auto",
        className
      )}
      style={{
        // Enhanced pointer events handling
        pointerEvents: disabled ? "none" : "auto",
        // Ensure proper positioning context
        position: "relative",
        // Force proper z-index for layering
        zIndex: "auto",
        ...props.style,
      }}
      onClick={handleClick}
      onFocus={handleFocus}
      {...props}
    />
  );
}

export { Input };
