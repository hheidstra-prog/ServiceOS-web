"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUserAndOrg } from "@/lib/auth";
import { taxRateFromType } from "@/lib/tax-utils";
import type { TaxType } from "@servible/database";

// Get time entries with filters
export async function getTimeEntries(filters?: {
  startDate?: Date;
  endDate?: Date;
  clientId?: string;
  projectId?: string;
  billable?: boolean;
  billed?: boolean;
}) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return [];

  const where: Record<string, unknown> = {
    organizationId: organization.id,
  };

  if (filters?.startDate || filters?.endDate) {
    where.date = {};
    if (filters.startDate) {
      (where.date as Record<string, Date>).gte = filters.startDate;
    }
    if (filters.endDate) {
      (where.date as Record<string, Date>).lte = filters.endDate;
    }
  }

  if (filters?.clientId) {
    where.clientId = filters.clientId;
  }

  if (filters?.projectId) {
    where.projectId = filters.projectId;
  }

  if (filters?.billable !== undefined) {
    where.billable = filters.billable;
  }

  if (filters?.billed !== undefined) {
    where.billed = filters.billed;
  }

  return db.timeEntry.findMany({
    where,
    include: {
      client: {
        select: {
          id: true,
          name: true,
          companyName: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      service: {
        select: {
          id: true,
          name: true,
        },
      },
      task: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: [{ date: "desc" }, { startTime: "desc" }],
  });
}

// Get time entries for a specific week
export async function getWeekTimeEntries(weekStart: Date) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return getTimeEntries({
    startDate: weekStart,
    endDate: weekEnd,
  });
}

// Create a new time entry
export async function createTimeEntry(data: {
  clientId?: string;
  projectId?: string;
  serviceId?: string;
  taskId?: string;
  description?: string;
  date: Date;
  startTime?: Date;
  endTime?: Date;
  duration: number; // in minutes
  billable?: boolean;
  hourlyRate?: number;
}) {
  const { user, organization } = await getCurrentUserAndOrg();
  if (!user || !organization) throw new Error("Not authorized");

  // Auto-derive hourly rate from service if not explicitly set
  let hourlyRate = data.hourlyRate;
  if (hourlyRate === undefined && data.serviceId) {
    const service = await db.service.findUnique({
      where: { id: data.serviceId },
      select: { pricingType: true, price: true },
    });
    if (service?.pricingType === "HOURLY") {
      hourlyRate = Number(service.price);
    }
  }

  const timeEntry = await db.timeEntry.create({
    data: {
      organizationId: organization.id,
      userId: user.id,
      clientId: data.clientId,
      projectId: data.projectId,
      serviceId: data.serviceId,
      taskId: data.taskId,
      description: data.description,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      duration: data.duration,
      billable: data.billable ?? true,
      hourlyRate,
      currency: organization.defaultCurrency,
    },
  });

  revalidatePath("/time");
  if (data.projectId) revalidatePath(`/projects/${data.projectId}`);
  return { id: timeEntry.id };
}

// Update a time entry
export async function updateTimeEntry(
  id: string,
  data: {
    clientId?: string;
    projectId?: string;
    serviceId?: string;
    taskId?: string;
    description?: string;
    date?: Date;
    startTime?: Date;
    endTime?: Date;
    duration?: number;
    billable?: boolean;
    hourlyRate?: number;
  }
) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  // Auto-derive hourly rate from service if not explicitly set
  let hourlyRate = data.hourlyRate;
  if (hourlyRate === undefined && data.serviceId) {
    const service = await db.service.findUnique({
      where: { id: data.serviceId },
      select: { pricingType: true, price: true },
    });
    if (service?.pricingType === "HOURLY") {
      hourlyRate = Number(service.price);
    }
  }

  const timeEntry = await db.timeEntry.update({
    where: { id, organizationId: organization.id },
    data: {
      clientId: data.clientId,
      projectId: data.projectId,
      serviceId: data.serviceId,
      taskId: data.taskId,
      description: data.description,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      duration: data.duration,
      billable: data.billable,
      hourlyRate,
    },
  });

  revalidatePath("/time");
  if (data.projectId) revalidatePath(`/projects/${data.projectId}`);
  return { id: timeEntry.id };
}

// Delete a time entry
export async function deleteTimeEntry(id: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  await db.timeEntry.delete({
    where: { id, organizationId: organization.id },
  });

  revalidatePath("/time");
}

// Get summary stats for time entries
export async function getTimeStats(filters?: {
  startDate?: Date;
  endDate?: Date;
  clientId?: string;
  projectId?: string;
}) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return null;

  const where: Record<string, unknown> = {
    organizationId: organization.id,
  };

  if (filters?.startDate || filters?.endDate) {
    where.date = {};
    if (filters.startDate) {
      (where.date as Record<string, Date>).gte = filters.startDate;
    }
    if (filters.endDate) {
      (where.date as Record<string, Date>).lte = filters.endDate;
    }
  }

  if (filters?.clientId) {
    where.clientId = filters.clientId;
  }

  if (filters?.projectId) {
    where.projectId = filters.projectId;
  }

  const entries = await db.timeEntry.findMany({
    where,
    select: {
      duration: true,
      billable: true,
      billed: true,
      hourlyRate: true,
    },
  });

  const totalMinutes = entries.reduce((sum, e) => sum + e.duration, 0);
  const billableMinutes = entries
    .filter((e) => e.billable)
    .reduce((sum, e) => sum + e.duration, 0);
  const billedMinutes = entries
    .filter((e) => e.billed)
    .reduce((sum, e) => sum + e.duration, 0);

  return {
    totalHours: totalMinutes / 60,
    billableHours: billableMinutes / 60,
    billedHours: billedMinutes / 60,
    unbilledHours: (billableMinutes - billedMinutes) / 60,
  };
}

// Get clients for dropdown
export async function getClientsForSelect() {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return [];

  return db.client.findMany({
    where: {
      organizationId: organization.id,
      archivedAt: null,
    },
    select: {
      id: true,
      name: true,
      companyName: true,
    },
    orderBy: { name: "asc" },
  });
}

// Get projects for dropdown (optionally filtered by client)
export async function getProjectsForSelect(clientId?: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return [];

  const where: Record<string, unknown> = {
    organizationId: organization.id,
    status: { not: "CANCELLED" },
  };

  if (clientId) {
    where.clientId = clientId;
  }

  return db.project.findMany({
    where,
    select: {
      id: true,
      name: true,
      client: {
        select: {
          id: true,
          name: true,
          companyName: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

// Get services for dropdown
export async function getServicesForSelect() {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return [];

  const services = await db.service.findMany({
    where: {
      organizationId: organization.id,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      pricingType: true,
      price: true,
      unit: true,
      currency: true,
    },
    orderBy: { name: "asc" },
  });

  return services.map((s) => ({
    ...s,
    price: Number(s.price),
  }));
}

// Get tasks for dropdown (non-DONE tasks for a project)
export async function getTasksForSelect(projectId: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return [];

  // Verify project belongs to org
  const project = await db.project.findFirst({
    where: { id: projectId, organizationId: organization.id },
  });
  if (!project) return [];

  return db.projectTask.findMany({
    where: {
      projectId,
      status: { not: "DONE" },
    },
    select: {
      id: true,
      title: true,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

// ===========================================
// TIMER
// ===========================================

// Start a timer
export async function startTimer(data: {
  projectId?: string;
  taskId?: string;
  serviceId?: string;
  billable?: boolean;
  note?: string;
}) {
  const { user } = await getCurrentUserAndOrg();
  if (!user) throw new Error("Not authorized");

  // Check if timer is already running
  const currentUser = await db.user.findUnique({
    where: { id: user.id },
    select: { timerStartedAt: true },
  });
  if (currentUser?.timerStartedAt) {
    throw new Error("Timer is already running. Stop it first.");
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      timerStartedAt: new Date(),
      timerProjectId: data.projectId || null,
      timerTaskId: data.taskId || null,
      timerServiceId: data.serviceId || null,
      timerBillable: data.billable ?? true,
      timerNote: data.note || null,
    },
  });

  revalidatePath("/");
  return { success: true };
}

// Stop a timer and create time entry
export async function stopTimer(data?: { note?: string }) {
  const { user, organization } = await getCurrentUserAndOrg();
  if (!user || !organization) throw new Error("Not authorized");

  const result = await db.$transaction(async (tx) => {
    const currentUser = await tx.user.findUnique({
      where: { id: user.id },
      select: {
        timerStartedAt: true,
        timerProjectId: true,
        timerTaskId: true,
        timerServiceId: true,
        timerBillable: true,
        timerNote: true,
        timerProject: {
          select: { clientId: true },
        },
        timerService: {
          select: { pricingType: true, price: true },
        },
      },
    });

    if (!currentUser?.timerStartedAt) {
      throw new Error("No timer running");
    }

    const startedAt = currentUser.timerStartedAt;
    const now = new Date();
    const durationMs = now.getTime() - startedAt.getTime();
    const durationMinutes = Math.max(1, Math.round(durationMs / 60000));

    // Derive hourly rate from service
    let hourlyRate: number | undefined;
    if (currentUser.timerService?.pricingType === "HOURLY") {
      hourlyRate = Number(currentUser.timerService.price);
    }

    const note = data?.note ?? currentUser.timerNote;

    // Create time entry
    const timeEntry = await tx.timeEntry.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        clientId: currentUser.timerProject?.clientId || null,
        projectId: currentUser.timerProjectId,
        serviceId: currentUser.timerServiceId,
        taskId: currentUser.timerTaskId,
        description: note || null,
        date: startedAt,
        startTime: startedAt,
        endTime: now,
        duration: durationMinutes,
        billable: currentUser.timerBillable ?? true,
        hourlyRate,
        currency: organization.defaultCurrency,
      },
    });

    // Clear timer fields
    await tx.user.update({
      where: { id: user.id },
      data: {
        timerStartedAt: null,
        timerProjectId: null,
        timerTaskId: null,
        timerServiceId: null,
        timerBillable: null,
        timerNote: null,
      },
    });

    return timeEntry;
  });

  revalidatePath("/");
  revalidatePath("/time");
  if (result.projectId) revalidatePath(`/projects/${result.projectId}`);
  return { success: true };
}

// Discard a timer without saving
export async function discardTimer() {
  const { user } = await getCurrentUserAndOrg();
  if (!user) throw new Error("Not authorized");

  await db.user.update({
    where: { id: user.id },
    data: {
      timerStartedAt: null,
      timerProjectId: null,
      timerTaskId: null,
      timerServiceId: null,
      timerBillable: null,
      timerNote: null,
    },
  });

  revalidatePath("/");
  return { success: true };
}

// Get the running timer state
export async function getRunningTimer() {
  const { user } = await getCurrentUserAndOrg();
  if (!user) return null;

  const currentUser = await db.user.findUnique({
    where: { id: user.id },
    select: {
      timerStartedAt: true,
      timerProjectId: true,
      timerTaskId: true,
      timerServiceId: true,
      timerBillable: true,
      timerNote: true,
      timerProject: {
        select: { id: true, name: true },
      },
      timerTask: {
        select: { id: true, title: true },
      },
      timerService: {
        select: { id: true, name: true },
      },
    },
  });

  if (!currentUser?.timerStartedAt) return null;

  return {
    startedAt: currentUser.timerStartedAt,
    projectId: currentUser.timerProjectId,
    taskId: currentUser.timerTaskId,
    serviceId: currentUser.timerServiceId,
    billable: currentUser.timerBillable,
    note: currentUser.timerNote,
    project: currentUser.timerProject,
    task: currentUser.timerTask,
    service: currentUser.timerService,
  };
}

// ===========================================
// TIME TO INVOICE
// ===========================================

// Get unbilled time entries grouped by client
export async function getUnbilledTimeEntries(filters?: {
  clientId?: string;
  projectId?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return [];

  const where: Record<string, unknown> = {
    organizationId: organization.id,
    billable: true,
    billed: false,
  };

  if (filters?.clientId) {
    where.clientId = filters.clientId;
  }

  if (filters?.projectId) {
    where.projectId = filters.projectId;
  }

  if (filters?.startDate || filters?.endDate) {
    where.date = {};
    if (filters.startDate) {
      (where.date as Record<string, Date>).gte = filters.startDate;
    }
    if (filters.endDate) {
      (where.date as Record<string, Date>).lte = filters.endDate;
    }
  }

  return db.timeEntry.findMany({
    where,
    include: {
      client: {
        select: {
          id: true,
          name: true,
          companyName: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [{ clientId: "asc" }, { date: "asc" }],
  });
}

// Get unbilled summary by client
export async function getUnbilledSummaryByClient() {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return [];

  const entries = await db.timeEntry.groupBy({
    by: ["clientId"],
    where: {
      organizationId: organization.id,
      billable: true,
      billed: false,
      clientId: { not: null },
    },
    _sum: {
      duration: true,
    },
    _count: {
      id: true,
    },
  });

  // Get client details
  const clientIds = entries.map((e) => e.clientId).filter(Boolean) as string[];
  const clients = await db.client.findMany({
    where: { id: { in: clientIds } },
    select: {
      id: true,
      name: true,
      companyName: true,
    },
  });

  const clientMap = new Map(clients.map((c) => [c.id, c]));

  return entries
    .filter((e) => e.clientId)
    .map((e) => ({
      client: clientMap.get(e.clientId!),
      totalMinutes: e._sum.duration || 0,
      entryCount: e._count.id,
    }))
    .filter((e) => e.client);
}

// Create invoice from time entries
export async function createInvoiceFromTimeEntries(data: {
  clientId: string;
  timeEntryIds: string[];
  groupBy: "none" | "project" | "date";
  hourlyRate?: number;
  notes?: string;
}) {
  const { user, organization } = await getCurrentUserAndOrg();
  if (!user || !organization) throw new Error("Not authorized");

  if (data.timeEntryIds.length === 0) {
    throw new Error("No time entries selected");
  }

  // Fetch selected time entries
  const timeEntries = await db.timeEntry.findMany({
    where: {
      id: { in: data.timeEntryIds },
      organizationId: organization.id,
      clientId: data.clientId,
      billable: true,
      billed: false,
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      service: {
        select: {
          id: true,
          taxType: true,
        },
      },
    },
    orderBy: { date: "asc" },
  });

  if (timeEntries.length === 0) {
    throw new Error("No valid time entries found");
  }

  // Determine hourly rate
  const hourlyRate = data.hourlyRate || Number(timeEntries[0].hourlyRate) || 75;

  // Generate invoice number
  const year = new Date().getFullYear();
  const lastInvoice = await db.invoice.findFirst({
    where: {
      organizationId: organization.id,
      number: { startsWith: `INV-${year}-` },
    },
    orderBy: { number: "desc" },
  });

  let nextNum = 1;
  if (lastInvoice) {
    const parts = lastInvoice.number.split("-");
    nextNum = parseInt(parts[2], 10) + 1;
  }
  const invoiceNumber = `INV-${year}-${nextNum.toString().padStart(4, "0")}`;

  // Group time entries based on groupBy option
  type GroupedEntry = {
    description: string;
    hours: number;
    taxType: TaxType;
    entries: typeof timeEntries;
  };

  // Determine the dominant taxType for a set of entries
  function dominantTaxType(entries: typeof timeEntries): TaxType {
    const first = entries.find((e) => e.service?.taxType);
    return first?.service?.taxType ?? "STANDARD";
  }

  let groupedEntries: GroupedEntry[] = [];

  if (data.groupBy === "project") {
    const byProject = new Map<string, typeof timeEntries>();
    for (const entry of timeEntries) {
      const key = entry.project?.id || "no-project";
      if (!byProject.has(key)) {
        byProject.set(key, []);
      }
      byProject.get(key)!.push(entry);
    }

    groupedEntries = Array.from(byProject.entries()).map(([key, entries]) => {
      const projectName = entries[0].project?.name || "General";
      const totalMinutes = entries.reduce((sum, e) => sum + e.duration, 0);
      const descriptions = entries
        .filter((e) => e.description)
        .map((e) => e.description)
        .filter((d, i, arr) => arr.indexOf(d) === i);

      return {
        description: `${projectName}${descriptions.length > 0 ? ": " + descriptions.slice(0, 3).join(", ") : ""}${descriptions.length > 3 ? "..." : ""}`,
        hours: totalMinutes / 60,
        taxType: dominantTaxType(entries),
        entries,
      };
    });
  } else if (data.groupBy === "date") {
    const byDate = new Map<string, typeof timeEntries>();
    for (const entry of timeEntries) {
      const key = new Date(entry.date).toISOString().split("T")[0];
      if (!byDate.has(key)) {
        byDate.set(key, []);
      }
      byDate.get(key)!.push(entry);
    }

    groupedEntries = Array.from(byDate.entries()).map(([dateKey, entries]) => {
      const totalMinutes = entries.reduce((sum, e) => sum + e.duration, 0);
      const descriptions = entries
        .filter((e) => e.description)
        .map((e) => e.description)
        .filter((d, i, arr) => arr.indexOf(d) === i);

      const dateStr = new Date(dateKey).toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      return {
        description: `Work on ${dateStr}${descriptions.length > 0 ? ": " + descriptions.slice(0, 2).join(", ") : ""}${descriptions.length > 2 ? "..." : ""}`,
        hours: totalMinutes / 60,
        taxType: dominantTaxType(entries),
        entries,
      };
    });
  } else {
    // No grouping - one line per entry
    groupedEntries = timeEntries.map((entry) => ({
      description: entry.description || `Work on ${new Date(entry.date).toLocaleDateString("nl-NL")}`,
      hours: entry.duration / 60,
      taxType: (entry.service?.taxType ?? "STANDARD") as TaxType,
      entries: [entry],
    }));
  }

  // Calculate totals
  let invoiceSubtotal = 0;
  let invoiceTaxAmount = 0;
  let invoiceTotal = 0;

  const invoiceItems = groupedEntries.map((group, index) => {
    const itemTaxType = group.taxType;
    const itemTaxRate = taxRateFromType(itemTaxType);
    const subtotal = group.hours * hourlyRate;
    const itemTaxAmount = subtotal * (itemTaxRate / 100);
    const total = subtotal + itemTaxAmount;

    invoiceSubtotal += subtotal;
    invoiceTaxAmount += itemTaxAmount;
    invoiceTotal += total;

    return {
      description: group.description,
      quantity: Math.round(group.hours * 100) / 100,
      unitPrice: hourlyRate,
      taxType: itemTaxType,
      taxRate: itemTaxRate,
      subtotal,
      taxAmount: itemTaxAmount,
      total,
      sortOrder: index,
    };
  });

  // Create invoice with items in a transaction
  const dueDate = new Date(
    Date.now() + organization.defaultPaymentTermDays * 24 * 60 * 60 * 1000
  );

  const invoice = await db.$transaction(async (tx) => {
    // Create invoice
    const newInvoice = await tx.invoice.create({
      data: {
        organizationId: organization.id,
        clientId: data.clientId,
        createdById: user.id,
        number: invoiceNumber,
        notes: data.notes,
        paymentTerms: `Net ${organization.defaultPaymentTermDays} days`,
        dueDate,
        status: "DRAFT",
        subtotal: invoiceSubtotal,
        taxAmount: invoiceTaxAmount,
        total: invoiceTotal,
        paidAmount: 0,
        currency: organization.defaultCurrency,
        items: {
          create: invoiceItems,
        },
      },
    });

    // Mark time entries as billed
    await tx.timeEntry.updateMany({
      where: {
        id: { in: data.timeEntryIds },
        organizationId: organization.id,
      },
      data: {
        billed: true,
        invoiceItemId: newInvoice.id, // Link to invoice for reference
      },
    });

    return newInvoice;
  });

  revalidatePath("/time");
  revalidatePath("/invoices");
  return { id: invoice.id };
}
