"use client";

import Link from "next/link";
import { CheckCircle, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = "invalid" | "expired" | "already_used";

interface InviteAcceptClientProps {
  status: Status;
  organizationName?: string;
}

const STATUS_CONFIG = {
  invalid: {
    icon: XCircle,
    iconColor: "text-red-500",
    title: "Invalid Invitation",
    description: "This invitation link is invalid or has been removed.",
  },
  expired: {
    icon: Clock,
    iconColor: "text-amber-500",
    title: "Invitation Expired",
    description:
      "This invitation has expired. Please ask the team admin to send a new one.",
  },
  already_used: {
    icon: CheckCircle,
    iconColor: "text-emerald-500",
    title: "Already Accepted",
    description: "This invitation has already been accepted.",
  },
};

export function InviteAcceptClient({
  status,
  organizationName,
}: InviteAcceptClientProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-4 w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <Icon className={`mx-auto h-12 w-12 ${config.iconColor}`} />
        <h1 className="mt-4 text-xl font-semibold text-zinc-950 dark:text-white">
          {config.title}
        </h1>
        {organizationName && (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {organizationName}
          </p>
        )}
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          {config.description}
        </p>
        <div className="mt-6">
          <Link href="/dashboard">
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
