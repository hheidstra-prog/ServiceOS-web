import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  // Base styles
  "relative w-full rounded-lg border p-4 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:size-4 [&>svg+div]:translate-y-[-3px] [&:has(svg)]:pl-11",
  {
    variants: {
      variant: {
        default:
          "border-zinc-950/10 bg-white text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white [&>svg]:text-zinc-950 dark:[&>svg]:text-white",
        destructive:
          "border-rose-500/20 bg-rose-50 text-rose-900 dark:border-rose-500/30 dark:bg-rose-950/50 dark:text-rose-100 [&>svg]:text-rose-600 dark:[&>svg]:text-rose-400",
        warning:
          "border-amber-500/20 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/50 dark:text-amber-100 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400",
        success:
          "border-emerald-500/20 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/50 dark:text-emerald-100 [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400",
        info:
          "border-sky-500/20 bg-sky-50 text-sky-900 dark:border-sky-500/30 dark:bg-sky-950/50 dark:text-sky-100 [&>svg]:text-sky-600 dark:[&>svg]:text-sky-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"h5">) {
  return (
    <h5
      data-slot="alert-title"
      className={cn("mb-1 font-medium leading-none tracking-tight", className)}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-sm [&_p]:leading-relaxed", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, alertVariants }
