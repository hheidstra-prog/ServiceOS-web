"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  FolderKanban,
  FolderOpen,
  Clock,
  Receipt,
  Settings,
  Briefcase,
  HelpCircle,
  ChevronsUpDown,
  Globe,
  Newspaper,
  Inbox,
  Sparkles,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Inbox", href: "/inbox", icon: Inbox },
  { name: "Assistant", href: "/assistant", icon: Sparkles },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Bookings", href: "/bookings", icon: Calendar },
  { name: "Time", href: "/time", icon: Clock },
  { name: "Quotes", href: "/quotes", icon: FileText },
  { name: "Invoices", href: "/invoices", icon: Receipt },
  { name: "Services", href: "/services", icon: Briefcase },
  { name: "Sites", href: "/sites", icon: Globe },
  { name: "Blog", href: "/blog", icon: Newspaper },
  { name: "Files", href: "/files", icon: FolderOpen },
];

const bottomNavigation = [
  { name: "Support", href: "/support", icon: HelpCircle },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  const handleClick = () => {
    onNavigate?.();
  };

  const NavItem = ({ item }: { item: (typeof navigation)[0] }) => {
    const isActive =
      pathname === item.href || pathname.startsWith(`${item.href}/`);

    return (
      <Link
        href={item.href}
        onClick={handleClick}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-zinc-950/5 text-zinc-950 dark:bg-white/5 dark:text-white"
            : "text-zinc-500 hover:bg-zinc-950/5 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
        )}
      >
        {/* Active indicator - left border */}
        {isActive && (
          <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-zinc-950 dark:bg-white" />
        )}
        <item.icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
        <span>{item.name}</span>
      </Link>
    );
  };

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col border-r border-zinc-950/5 bg-zinc-50 dark:border-white/5 dark:bg-zinc-950",
        className
      )}
    >
      {/* Logo / Brand */}
      <div className="flex h-14 items-center justify-between border-b border-zinc-950/5 px-3 dark:border-white/5">
        <div className="flex items-center gap-2">
          <img src="/logo-dark.png" alt="Servible" className="h-6 dark:hidden" />
          <img src="/logo-white.png" alt="Servible" className="h-6 hidden dark:block" />
        </div>
        <button className="rounded p-0.5 text-zinc-400 hover:bg-zinc-950/5 hover:text-zinc-600 dark:hover:bg-white/5 dark:hover:text-zinc-300">
          <ChevronsUpDown className="h-4 w-4" />
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {navigation.map((item) => (
          <NavItem key={item.name} item={item} />
        ))}
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-zinc-950/5 px-2 py-2 dark:border-white/5">
        {bottomNavigation.map((item) => (
          <NavItem key={item.name} item={item} />
        ))}
      </div>

      {/* User Profile */}
      <div className="border-t border-zinc-950/5 p-2 dark:border-white/5">
        <button className="flex w-full items-center gap-2 rounded-lg p-1.5 text-left hover:bg-zinc-950/5 dark:hover:bg-white/5">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-pink-500" />
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-zinc-950 dark:text-white">
              User
            </p>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              user@example.com
            </p>
          </div>
          <ChevronsUpDown className="h-4 w-4 text-zinc-400" />
        </button>
      </div>
    </div>
  );
}
