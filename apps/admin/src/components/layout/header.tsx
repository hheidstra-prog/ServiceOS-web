"use client";

import { useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { Menu, Moon, Sun, Search } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import { NotificationBell } from "./notification-bell";

interface HeaderProps {
  organizationName?: string;
}

export function Header({ organizationName }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="relative sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-zinc-950/5 bg-white px-4 dark:border-white/5 dark:bg-zinc-950 lg:px-6">
      {/* Subtle gradient border - dark mode only */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent hidden dark:block" />
      {/* Mobile menu */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="lg:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 border-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Search (placeholder for now) */}
      <div className="hidden flex-1 md:flex">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            placeholder="Search..."
            className="h-8 w-full rounded-md border border-zinc-950/10 bg-white pl-8 pr-3 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950/20 focus:outline-none focus:ring-0 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-white/20"
          />
        </div>
      </div>

      {/* Mobile: show org name */}
      <div className="flex-1 md:hidden">
        {organizationName && (
          <span className="truncate text-sm font-medium text-zinc-950 dark:text-white">
            {organizationName}
          </span>
        )}
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Notifications */}
        <NotificationBell />

        {/* User menu */}
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: "h-7 w-7",
            },
          }}
        />
      </div>
    </header>
  );
}
