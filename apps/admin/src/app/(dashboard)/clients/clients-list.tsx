"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientForm } from "./client-form";
import { ClientStatus } from "@servible/database";

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  registrationNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  vatNumber: string | null;
  status: ClientStatus;
  createdAt: Date;
}

interface ClientsListProps {
  clients: Client[];
}

const statusConfig: Record<
  ClientStatus,
  { label: string; className: string }
> = {
  LEAD: {
    label: "Lead",
    className: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
  PROSPECT: {
    label: "Prospect",
    className: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  },
  CLIENT: {
    label: "Client",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  ARCHIVED: {
    label: "Archived",
    className: "bg-zinc-500/10 text-zinc-500 dark:text-zinc-500",
  },
};

// Badge: text-xs (12px), font-medium (500)
function StatusBadge({ status }: { status: ClientStatus }) {
  const config = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

export function ClientsList({ clients }: ClientsListProps) {
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const archivedCount = clients.filter((c) => c.status === "ARCHIVED").length;

  const filteredClients = clients.filter((client) => {
    // Filter by archived status
    if (showArchived) {
      if (client.status !== "ARCHIVED") return false;
    } else {
      if (client.status === "ARCHIVED") return false;
    }
    // Filter by search
    const searchLower = search.toLowerCase();
    return (
      client.name.toLowerCase().includes(searchLower) ||
      client.email?.toLowerCase().includes(searchLower) ||
      client.companyName?.toLowerCase().includes(searchLower)
    );
  });

  const handleAdd = () => {
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {/* Page title: text-2xl, font-bold, tracking-tight */}
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
            Clients
          </h1>
          {/* Secondary text: text-sm, font-normal */}
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage your clients and their information.
          </p>
        </div>
        {/* Button: text-sm, font-medium */}
        <Button onClick={handleAdd} size="sm" className="w-full sm:w-auto">
          <Plus className="mr-1.5 h-4 w-4" />
          Add client
        </Button>
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-4">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full rounded-md border border-zinc-950/10 bg-white pl-8 pr-3 text-sm text-zinc-950 placeholder:text-zinc-400 transition-colors focus:border-zinc-950/20 focus:bg-sky-50/50 focus:outline-none focus:ring-0 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-white/20 dark:focus:bg-sky-950/20"
          />
        </div>
        {archivedCount > 0 && (
          <div className="flex gap-1">
            <button
              onClick={() => setShowArchived(false)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                !showArchived
                  ? "bg-zinc-950/5 text-zinc-950 dark:bg-white/10 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setShowArchived(true)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                showArchived
                  ? "bg-zinc-950/5 text-zinc-950 dark:bg-white/10 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              Archived ({archivedCount})
            </button>
          </div>
        )}
      </div>

      {/* Clients List */}
      {filteredClients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-950/10 bg-white p-10 text-center dark:border-white/10 dark:bg-zinc-900">
          <div className="rounded-full bg-zinc-100 p-2.5 dark:bg-zinc-800">
            <Users className="h-5 w-5 text-zinc-400" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-zinc-950 dark:text-white">
            {clients.length === 0 ? "No clients yet" : "No clients found"}
          </h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {clients.length === 0
              ? "Get started by adding your first client."
              : "Try adjusting your search."}
          </p>
          {clients.length === 0 && (
            <Button onClick={handleAdd} size="sm" className="mt-4">
              <Plus className="mr-1.5 h-4 w-4" />
              Add client
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-950/10 bg-white dark:border-white/10 dark:bg-zinc-900">
          <table className="min-w-full divide-y divide-zinc-950/10 dark:divide-white/10">
            <thead>
              <tr>
                {/* Table header: text-xs, font-medium, uppercase, tracking-wide */}
                <th
                  scope="col"
                  className="py-2.5 pl-4 pr-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 sm:pl-5"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 lg:table-cell"
                >
                  Company
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 md:table-cell"
                >
                  Email
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
                >
                  Status
                </th>
                <th scope="col" className="relative py-2.5 pl-3 pr-4 sm:pr-5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-950/10 dark:divide-white/10">
              {filteredClients.map((client) => (
                <tr
                  key={client.id}
                  className="transition-colors hover:bg-zinc-950/[0.025] dark:hover:bg-white/[0.025]"
                >
                  <td className="whitespace-nowrap py-3 pl-4 pr-3 sm:pl-5">
                    <Link
                      href={`/clients/${client.id}`}
                      className="group block"
                    >
                      {/* Client name in table: text-sm, font-medium */}
                      <div className="text-sm font-medium text-zinc-950 group-hover:text-zinc-600 dark:text-white dark:group-hover:text-zinc-300">
                        {client.name}
                      </div>
                      {/* Secondary text (company under name): text-sm */}
                      <div className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400 lg:hidden">
                        {client.companyName || "—"}
                      </div>
                    </Link>
                  </td>
                  {/* Body text: text-sm, font-normal */}
                  <td className="hidden whitespace-nowrap px-3 py-3 text-sm text-zinc-500 dark:text-zinc-400 lg:table-cell">
                    {client.companyName || "—"}
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-3 text-sm text-zinc-500 dark:text-zinc-400 md:table-cell">
                    {client.email || "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <StatusBadge status={client.status} />
                  </td>
                  <td className="whitespace-nowrap py-3 pl-3 pr-4 sm:pr-5" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Dialog */}
      <ClientForm open={isFormOpen} onOpenChange={setIsFormOpen} />
    </div>
  );
}
