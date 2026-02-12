"use client"

import * as React from "react"
import { CircleIcon } from "lucide-react"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid gap-3", className)}
      {...props}
    />
  )
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        // Base styles
        "peer size-4 shrink-0 rounded-full cursor-pointer",
        "border border-zinc-950/10 bg-white",
        // Dark mode
        "dark:border-white/10 dark:bg-zinc-950",
        // Checked state
        "data-[state=checked]:border-zinc-900 dark:data-[state=checked]:border-white",
        // Focus state
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20 dark:focus-visible:ring-white/20",
        // Invalid state
        "aria-invalid:border-rose-500 aria-invalid:ring-rose-500/20",
        // Disabled state
        "disabled:cursor-not-allowed disabled:opacity-50",
        // Transition
        "transition-colors",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="flex items-center justify-center"
      >
        <CircleIcon className="size-2 fill-zinc-900 text-zinc-900 dark:fill-white dark:text-white" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem }
