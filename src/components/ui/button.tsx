import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-primary text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200",
        destructive:
          "bg-gradient-error text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200",
        outline:
          "border-2 border-primary/20 bg-white/80 backdrop-blur-sm shadow-sm hover:bg-primary/5 hover:border-primary/40 hover:shadow-md transition-all duration-200",
        secondary:
          "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200",
        ghost:
          "hover:bg-primary/10 hover:text-primary transition-all duration-200",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80",
        success:
          "bg-gradient-success text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200",
        warning:
          "bg-gradient-warning text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200",
        info: "bg-gradient-info text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
