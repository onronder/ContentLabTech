import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base styles with Opera compatibility fixes
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium md:text-sm",
        // Focus styles with Opera fallbacks
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "focus:border-ring focus:ring-ring/50 focus:ring-[3px]", // Fallback for Opera
        // Invalid styles
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        // Disabled styles - separate to avoid Opera pointer-events issues
        "disabled:cursor-not-allowed disabled:opacity-50",
        // Custom Opera fixes
        "[&:disabled]:pointer-events-none", // More specific disabled pointer events
        className
      )}
      style={{
        // Force clickable area for Opera
        pointerEvents: props.disabled ? "none" : "auto",
        zIndex: 1,
        position: "relative",
      }}
      {...props}
    />
  );
}

export { Input };
