"use client"

import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-zinc-950 group-[.toaster]:border-zinc-950/10 group-[.toaster]:shadow-lg dark:group-[.toaster]:bg-zinc-900 dark:group-[.toaster]:text-white dark:group-[.toaster]:border-white/10",
          description:
            "group-[.toast]:text-zinc-500 dark:group-[.toast]:text-zinc-400",
          actionButton:
            "group-[.toast]:bg-zinc-900 group-[.toast]:text-white dark:group-[.toast]:bg-white dark:group-[.toast]:text-zinc-900",
          cancelButton:
            "group-[.toast]:bg-zinc-100 group-[.toast]:text-zinc-600 dark:group-[.toast]:bg-zinc-800 dark:group-[.toast]:text-zinc-300",
          error:
            "group-[.toaster]:bg-rose-50 group-[.toaster]:text-rose-900 group-[.toaster]:border-rose-500/20 dark:group-[.toaster]:bg-rose-950/50 dark:group-[.toaster]:text-rose-100 dark:group-[.toaster]:border-rose-500/30",
          success:
            "group-[.toaster]:bg-emerald-50 group-[.toaster]:text-emerald-900 group-[.toaster]:border-emerald-500/20 dark:group-[.toaster]:bg-emerald-950/50 dark:group-[.toaster]:text-emerald-100 dark:group-[.toaster]:border-emerald-500/30",
          warning:
            "group-[.toaster]:bg-amber-50 group-[.toaster]:text-amber-900 group-[.toaster]:border-amber-500/20 dark:group-[.toaster]:bg-amber-950/50 dark:group-[.toaster]:text-amber-100 dark:group-[.toaster]:border-amber-500/30",
          info:
            "group-[.toaster]:bg-sky-50 group-[.toaster]:text-sky-900 group-[.toaster]:border-sky-500/20 dark:group-[.toaster]:bg-sky-950/50 dark:group-[.toaster]:text-sky-100 dark:group-[.toaster]:border-sky-500/30",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
