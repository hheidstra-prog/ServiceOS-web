import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // Base styles
        "flex min-h-20 w-full rounded-md border border-zinc-950/10 bg-white px-3 py-2 text-sm text-zinc-950",
        "placeholder:text-zinc-400 transition-all duration-150 outline-none resize-none",
        // Focus state - subtle blue tint background, thin border
        "focus:border-zinc-950/20 focus:bg-sky-50/50 focus:ring-0",
        // Dark mode
        "dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:placeholder:text-zinc-500",
        "dark:focus:border-white/20 dark:focus:bg-sky-950/20",
        // Disabled
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // Invalid state
        "aria-invalid:border-rose-500 aria-invalid:focus:bg-rose-50/50 dark:aria-invalid:focus:bg-rose-950/20",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
