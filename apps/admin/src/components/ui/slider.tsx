"use client"

import * as React from "react"
import { Slider as SliderPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const _values = value ?? defaultValue ?? [min]

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none",
        "data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(
          "relative h-1.5 w-full grow overflow-hidden rounded-full",
          "bg-zinc-100 dark:bg-zinc-800"
        )}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="absolute h-full bg-zinc-900 dark:bg-white"
        />
      </SliderPrimitive.Track>
      {_values.map((_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className={cn(
            "block size-4 rounded-full cursor-pointer",
            "border border-zinc-950/10 bg-white shadow-sm",
            "dark:border-white/10 dark:bg-zinc-900",
            // Focus state
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20 dark:focus-visible:ring-white/20",
            // Hover state
            "hover:border-zinc-950/20 dark:hover:border-white/20",
            // Transition
            "transition-colors"
          )}
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
