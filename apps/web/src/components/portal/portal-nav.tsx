"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Files,
  Calendar,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

interface PortalNavProps {
  siteName: string;
  siteLogo: string | null;
  clientName: string;
}

const navItems = [
  { href: "/portal", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/portal/projects", label: "Projects", icon: FolderKanban },
  { href: "/portal/invoices", label: "Invoices", icon: FileText },
  { href: "/portal/files", label: "Files", icon: Files },
  { href: "/portal/bookings", label: "Bookings", icon: Calendar },
];

export function PortalNav({ siteName, siteLogo, clientName }: PortalNavProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    // Clear the cookie by making a logout request
    await fetch("/api/portal/logout", { method: "POST" });
    window.location.href = "/portal/login";
  };

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/portal" className="flex items-center gap-3">
            {siteLogo ? (
              <img src={siteLogo} alt={siteName} className="h-8 w-auto" />
            ) : (
              <span className="text-lg font-bold text-zinc-900">{siteName}</span>
            )}
            <span className="hidden text-sm text-zinc-500 sm:inline">
              Client Portal
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-zinc-100 text-zinc-900"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User Menu (Desktop) */}
          <div className="hidden items-center gap-4 md:flex">
            <span className="text-sm text-zinc-600">{clientName}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-50 md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="border-t border-zinc-200 py-4 md:hidden">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-zinc-100 text-zinc-900"
                        : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
              <div className="my-2 border-t border-zinc-200" />
              <div className="px-3 py-2 text-sm text-zinc-600">{clientName}</div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              >
                <LogOut className="h-5 w-5" />
                Sign out
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
