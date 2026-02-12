"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        // Base styles
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full",
        "border border-transparent",
        // Unchecked state
        "bg-zinc-200 dark:bg-zinc-700",
        // Checked state
        "data-[state=checked]:bg-zinc-900 dark:data-[state=checked]:bg-white",
        // Focus state
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20 dark:focus-visible:ring-white/20",
        // Disabled state
        "disabled:cursor-not-allowed disabled:opacity-50",
        // Transition
        "transition-colors",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          // Base styles
          "pointer-events-none block size-4 rounded-full shadow-sm",
          "bg-white dark:bg-zinc-900",
          // Checked state
          "data-[state=checked]:bg-white dark:data-[state=checked]:bg-zinc-900",
          // Position
          "translate-x-0.5 data-[state=checked]:translate-x-[18px]",
          // Ring for depth
          "ring-0",
          // Transition
          "transition-transform"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
