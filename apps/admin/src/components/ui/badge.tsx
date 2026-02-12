import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // Base styles - matches typography guide: text-xs, font-medium
  "inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900",
        secondary:
          "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
        destructive:
          "bg-rose-500/10 text-rose-700 dark:text-rose-400",
        outline:
          "border border-zinc-950/10 text-zinc-700 dark:border-white/10 dark:text-zinc-300",
        // Status variants with subtle backgrounds
        success:
          "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        warning:
          "bg-amber-500/10 text-amber-700 dark:text-amber-400",
        info:
          "bg-sky-500/10 text-sky-700 dark:text-sky-400",
        accent:
          "bg-violet-500/10 text-violet-700 dark:text-violet-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

// Status badge with dot indicator
interface StatusBadgeProps extends React.ComponentProps<"span"> {
  status: "lead" | "quote_sent" | "quote_accepted" | "contract_sent" | "contract_signed" | "active" | "completed" | "invoiced" | "paid" | "overdue" | "cancelled" | "archived"
}

const statusConfig: Record<StatusBadgeProps["status"], { label: string; colorClass: string }> = {
  lead: { label: "Lead", colorClass: "bg-sky-500/10 text-sky-700 dark:text-sky-400" },
  quote_sent: { label: "Quote Sent", colorClass: "bg-violet-500/10 text-violet-700 dark:text-violet-400" },
  quote_accepted: { label: "Accepted", colorClass: "bg-lime-500/10 text-lime-700 dark:text-lime-400" },
  contract_sent: { label: "Contract Sent", colorClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  contract_signed: { label: "Signed", colorClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  active: { label: "Active", colorClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  completed: { label: "Completed", colorClass: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400" },
  invoiced: { label: "Invoiced", colorClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  paid: { label: "Paid", colorClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  overdue: { label: "Overdue", colorClass: "bg-rose-500/10 text-rose-700 dark:text-rose-400" },
  cancelled: { label: "Cancelled", colorClass: "bg-rose-500/10 text-rose-700 dark:text-rose-400" },
  archived: { label: "Archived", colorClass: "bg-zinc-500/10 text-zinc-500 dark:text-zinc-500" },
}

function StatusBadge({ status, className, children, ...props }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      data-slot="status-badge"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-medium",
        config.colorClass,
        className
      )}
      {...props}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children || config.label}
    </span>
  )
}

export { Badge, badgeVariants, StatusBadge }
