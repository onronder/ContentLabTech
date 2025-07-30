import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "badge inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-all duration-200 overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "badge-primary bg-primary-100 text-primary-800 border-primary-200 [a&]:hover:bg-primary-200 [a&]:hover:border-primary-300",
        secondary:
          "badge-secondary bg-secondary-100 text-secondary-800 border-secondary-200 [a&]:hover:bg-secondary-200 [a&]:hover:border-secondary-300",
        destructive:
          "badge-error bg-error-100 text-error-800 border-error-200 [a&]:hover:bg-error-200 [a&]:hover:border-error-300",
        success:
          "badge-success bg-success-100 text-success-800 border-success-200 [a&]:hover:bg-success-200 [a&]:hover:border-success-300",
        warning:
          "badge-warning bg-warning-100 text-warning-800 border-warning-200 [a&]:hover:bg-warning-200 [a&]:hover:border-warning-300",
        info: "bg-info-100 text-info-800 border-info-200 [a&]:hover:bg-info-200 [a&]:hover:border-info-300",
        outline:
          "text-foreground border-neutral-300 bg-white [a&]:hover:bg-neutral-50 [a&]:hover:border-neutral-400",
        ghost:
          "border-transparent bg-neutral-100 text-neutral-700 [a&]:hover:bg-neutral-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
