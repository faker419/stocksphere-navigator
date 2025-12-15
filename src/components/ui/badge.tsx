import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground border-border",
        success: "border-transparent bg-emerald-500/20 text-emerald-400",
        warning: "border-transparent bg-amber-500/20 text-amber-400",
        info: "border-transparent bg-blue-500/20 text-blue-400",
        pending: "border-transparent bg-amber-500/20 text-amber-400",
        approved: "border-transparent bg-emerald-500/20 text-emerald-400",
        rejected: "border-transparent bg-red-500/20 text-red-400",
        fulfilled: "border-transparent bg-blue-500/20 text-blue-400",
        cancelled: "border-transparent bg-slate-500/20 text-slate-400",
        low: "border-transparent bg-slate-500/20 text-slate-400",
        medium: "border-transparent bg-blue-500/20 text-blue-400",
        high: "border-transparent bg-amber-500/20 text-amber-400",
        critical: "border-transparent bg-red-500/20 text-red-400",
        operational: "border-transparent bg-emerald-500/20 text-emerald-400",
        maintenance: "border-transparent bg-amber-500/20 text-amber-400",
        out_of_service: "border-transparent bg-red-500/20 text-red-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
