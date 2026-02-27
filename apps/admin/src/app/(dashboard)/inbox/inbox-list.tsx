"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Inbox, CheckCheck, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { markAsRead, markAllAsRead } from "./actions";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}

interface InboxListProps {
  notifications: Notification[];
}

const typeConfig: Record<string, { icon: typeof UserPlus; label: string }> = {
  contact_form: { icon: UserPlus, label: "Contact" },
  new_booking: { icon: Calendar, label: "Booking" },
};

function getEntityHref(entityType: string | null, entityId: string | null): string | null {
  if (!entityType || !entityId) return null;
  switch (entityType) {
    case "client":
      return `/clients/${entityId}`;
    case "invoice":
      return `/invoices/${entityId}`;
    case "booking":
      return `/bookings/${entityId}`;
    default:
      return null;
  }
}

export function InboxList({ notifications }: InboxListProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [isPending, startTransition] = useTransition();

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const filtered = filter === "unread" ? notifications.filter((n) => !n.isRead) : notifications;

  const handleClick = (notification: Notification) => {
    if (!notification.isRead) {
      startTransition(async () => {
        await markAsRead(notification.id);
      });
    }
    const href = getEntityHref(notification.entityType, notification.entityId);
    if (href) {
      router.push(href);
    }
  };

  const handleMarkAllAsRead = () => {
    startTransition(async () => {
      await markAllAsRead();
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl dark:text-white">
            Inbox
          </h1>
          {unreadCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            <CheckCheck className="mr-1.5 h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
            filter === "all"
              ? "bg-zinc-950/5 text-zinc-950 dark:bg-white/10 dark:text-white"
              : "text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
            filter === "unread"
              ? "bg-zinc-950/5 text-zinc-950 dark:bg-white/10 dark:text-white"
              : "text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
          }`}
        >
          Unread{unreadCount > 0 && ` (${unreadCount})`}
        </button>
      </div>

      {/* Notification list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-950/10 bg-white p-6 sm:p-10 text-center dark:border-white/10 dark:bg-zinc-900">
          <div className="rounded-full bg-zinc-100 p-2.5 dark:bg-zinc-800">
            <Inbox className="h-5 w-5 text-zinc-400" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-zinc-950 dark:text-white">
            {filter === "unread" ? "No unread notifications" : "No notifications yet"}
          </h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {filter === "unread"
              ? "You're all caught up."
              : "Notifications will appear here when things happen."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-950/10 bg-white dark:border-white/10 dark:bg-zinc-900">
          <div className="divide-y divide-zinc-950/10 dark:divide-white/10">
            {filtered.map((notification) => {
              const config = typeConfig[notification.type] || { icon: Inbox, label: notification.type };
              const Icon = config.icon;
              const href = getEntityHref(notification.entityType, notification.entityId);

              return (
                <button
                  key={notification.id}
                  onClick={() => handleClick(notification)}
                  className={`flex w-full items-start gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3 text-left transition-colors hover:bg-zinc-950/[0.025] dark:hover:bg-white/[0.025] ${
                    !notification.isRead ? "bg-sky-500/[0.03] dark:bg-sky-500/[0.05]" : ""
                  } ${href ? "cursor-pointer" : "cursor-default"}`}
                >
                  {/* Icon */}
                  <div className={`mt-0.5 flex-shrink-0 rounded-full p-1.5 ${
                    !notification.isRead
                      ? "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                      : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${
                        !notification.isRead
                          ? "font-semibold text-zinc-950 dark:text-white"
                          : "font-medium text-zinc-700 dark:text-zinc-300"
                      }`}>
                        {notification.title}
                      </p>
                      <span className="flex-shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    {notification.message && (
                      <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
                        {notification.message}
                      </p>
                    )}
                  </div>

                  {/* Unread dot */}
                  {!notification.isRead && (
                    <div className="mt-2 flex-shrink-0">
                      <div className="h-2 w-2 rounded-full bg-sky-500" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
