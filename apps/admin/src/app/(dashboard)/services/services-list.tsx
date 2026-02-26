"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  MoreHorizontal,
  Package,
  Pencil,
  Copy,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PricingType, TaxType } from "@servible/database";
import { deleteService, duplicateService, updateService } from "./actions";
import { ServiceDialog } from "./service-dialog";

interface Service {
  id: string;
  name: string;
  description: string | null;
  pricingType: PricingType;
  price: number;
  currency: string;
  unit: string | null;
  taxType: TaxType;
  isActive: boolean;
  _count: {
    quoteItems: number;
    invoiceItems: number;
  };
}

interface ServicesListProps {
  services: Service[];
}

const pricingTypeLabels: Record<PricingType, string> = {
  FIXED: "Fixed Price",
  HOURLY: "Hourly",
  DAILY: "Daily",
  MONTHLY: "Monthly",
  CUSTOM: "Custom",
};

const pricingTypeUnits: Record<PricingType, string> = {
  FIXED: "",
  HOURLY: "/hour",
  DAILY: "/day",
  MONTHLY: "/month",
  CUSTOM: "",
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency,
  }).format(amount);
}

export function ServicesList({ services }: ServicesListProps) {
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const filteredServices = services.filter((service) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      service.name.toLowerCase().includes(searchLower) ||
      service.description?.toLowerCase().includes(searchLower);

    const matchesActive = showInactive || service.isActive;

    return matchesSearch && matchesActive;
  });

  const activeServices = services.filter((s) => s.isActive);
  const inactiveServices = services.filter((s) => !s.isActive);

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingService(null);
    setIsDialogOpen(true);
  };

  const handleDuplicate = async (id: string) => {
    try {
      await duplicateService(id);
      toast.success("Service duplicated");
      router.refresh();
    } catch {
      toast.error("Failed to duplicate service");
    }
  };

  const handleToggleActive = async (service: Service) => {
    try {
      await updateService(service.id, { isActive: !service.isActive });
      toast.success(service.isActive ? "Service deactivated" : "Service activated");
      router.refresh();
    } catch {
      toast.error("Failed to update service");
    }
  };

  const handleDelete = async (service: Service) => {
    const hasUsage = service._count.quoteItems > 0 || service._count.invoiceItems > 0;

    const ok = await confirm({
      title: hasUsage ? "Deactivate service" : "Delete service",
      description: hasUsage
        ? "This service is used in quotes/invoices and will be deactivated instead of deleted. Continue?"
        : "Are you sure you want to delete this service? This action cannot be undone.",
      confirmLabel: hasUsage ? "Deactivate" : "Delete",
      destructive: true,
    });
    if (!ok) return;

    try {
      await deleteService(service.id);
      toast.success(hasUsage ? "Service deactivated" : "Service deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete service");
    }
  };

  return (
    <>{ConfirmDialog}
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
            Services
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage your service catalog for quotes and invoices.
          </p>
        </div>
        <Button onClick={handleAdd} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          New service
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Total Services</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-white">
              {services.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Active</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
              {activeServices.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Inactive</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-500 dark:text-zinc-400">
              {inactiveServices.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            placeholder="Search services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full rounded-md border border-zinc-950/10 bg-white pl-8 pr-3 text-sm text-zinc-950 placeholder:text-zinc-400 transition-colors focus:border-zinc-950/20 focus:bg-sky-50/50 focus:outline-none focus:ring-0 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-white/20 dark:focus:bg-sky-950/20"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-zinc-300 dark:border-zinc-600"
          />
          Show inactive services
        </label>
      </div>

      {/* Services List */}
      {filteredServices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-zinc-100 p-2.5 dark:bg-zinc-800">
              <Package className="h-5 w-5 text-zinc-400" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-zinc-950 dark:text-white">
              {services.length === 0 ? "No services yet" : "No services found"}
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {services.length === 0
                ? "Create your first service to use in quotes and invoices."
                : "Try adjusting your search or filters."}
            </p>
            {services.length === 0 && (
              <Button onClick={handleAdd} size="sm" className="mt-4">
                <Plus className="mr-1.5 h-4 w-4" />
                New service
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-950/10 bg-white dark:border-white/10 dark:bg-zinc-900">
          <table className="min-w-full divide-y divide-zinc-950/10 dark:divide-white/10">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="py-2.5 pl-4 pr-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 sm:pl-5"
                >
                  Service
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 md:table-cell"
                >
                  Type
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
                >
                  Price
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-2.5 text-center text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 lg:table-cell"
                >
                  Usage
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-center text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
                >
                  Status
                </th>
                <th scope="col" className="relative py-2.5 pl-3 pr-4 sm:pr-5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-950/10 dark:divide-white/10">
              {filteredServices.map((service) => (
                <tr
                  key={service.id}
                  className={`transition-colors hover:bg-zinc-950/[0.025] dark:hover:bg-white/[0.025] ${
                    !service.isActive ? "opacity-60" : ""
                  }`}
                >
                  <td className="py-3 pl-4 pr-3 sm:pl-5">
                    <button
                      onClick={() => handleEdit(service)}
                      className="text-left group"
                    >
                      <div className="text-sm font-medium text-zinc-950 group-hover:text-zinc-600 dark:text-white dark:group-hover:text-zinc-300">
                        {service.name}
                      </div>
                      {service.description && (
                        <div className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400 truncate max-w-[300px]">
                          {service.description}
                        </div>
                      )}
                    </button>
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-3 text-sm text-zinc-500 dark:text-zinc-400 md:table-cell">
                    {pricingTypeLabels[service.pricingType]}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    <span className="text-sm font-medium text-zinc-950 dark:text-white">
                      {formatCurrency(service.price, service.currency)}
                    </span>
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                      {service.unit
                        ? `/${service.unit}`
                        : pricingTypeUnits[service.pricingType]}
                    </span>
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-3 text-center text-sm text-zinc-500 dark:text-zinc-400 lg:table-cell">
                    {service._count.quoteItems + service._count.invoiceItems > 0 ? (
                      <span>
                        {service._count.quoteItems} quotes, {service._count.invoiceItems} invoices
                      </span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-center">
                    <span
                      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${
                        service.isActive
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "bg-zinc-500/10 text-zinc-500 dark:text-zinc-500"
                      }`}
                    >
                      {service.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap py-3 pl-3 pr-4 text-right sm:pr-5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-xs">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(service)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(service.id)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleActive(service)}>
                          {service.isActive ? (
                            <>
                              <ToggleLeft className="mr-2 h-4 w-4" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <ToggleRight className="mr-2 h-4 w-4" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(service)}
                          variant="destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Service Dialog */}
      <ServiceDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingService={editingService}
      />
    </div>
    </>
  );
}
