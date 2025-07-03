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
        // Base styles with enhanced Opera compatibility
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium md:text-sm",
        // Focus styles with enhanced fallbacks
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "focus:border-ring focus:ring-ring/50 focus:ring-[3px]", // Fallback for Opera
        // Invalid styles
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
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
