"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getUnreadCount } from "@/app/(dashboard)/inbox/actions";

export function NotificationBell() {
  const [count, setCount] = useState(0);
  const pathname = usePathname();

  const refresh = useCallback(() => {
    getUnreadCount().then(setCount).catch(() => {});
  }, []);

  // Refresh on mount, on route change, and every 30s
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [pathname, refresh]);

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      asChild
      className="relative text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
    >
      <Link href="/inbox">
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
        <span className="sr-only">Notifications</span>
      </Link>
    </Button>
  );
}
