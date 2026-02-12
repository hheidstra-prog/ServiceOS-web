"use client"

import * as React from "react"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex items-center gap-1 border-b border-zinc-950/10 dark:border-white/10",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        // Base styles
        "relative inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium cursor-pointer",
        "whitespace-nowrap transition-all duration-150 outline-none",
        // Default state
        "text-zinc-500 dark:text-zinc-400",
        // Hover state
        "hover:text-zinc-700 dark:hover:text-zinc-200",
        // Active state - text and underline
        "data-[state=active]:text-zinc-950 data-[state=active]:font-semibold dark:data-[state=active]:text-white",
        // Active underline indicator
        "after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:rounded-full",
        "after:bg-transparent data-[state=active]:after:bg-zinc-950 dark:data-[state=active]:after:bg-white",
        // Focus state
        "focus-visible:ring-2 focus-visible:ring-zinc-950/20 focus-visible:ring-offset-2 dark:focus-visible:ring-white/20",
        // Disabled state
        "disabled:pointer-events-none disabled:opacity-50",
        // Icon sizing
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
