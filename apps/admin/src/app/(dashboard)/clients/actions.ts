"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuthWithOrg, getCurrentUser } from "@/lib/auth";
import { ClientStatus, EventType, ProjectStatus, Prisma } from "@serviceos/database";

// ===========================================
// CLIENT ACTIONS
// ===========================================

interface CreateClientData {
  name: string;
  email?: string;
  phone?: string;
  companyName?: string;
  registrationNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  vatNumber?: string;
  status?: ClientStatus;
}

export async function createClient(data: CreateClientData) {
  const { organization } = await requireAuthWithOrg();

  const client = await db.client.create({
    data: {
      organizationId: organization.id,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      companyName: data.companyName || null,
      registrationNumber: data.registrationNumber || null,
      addressLine1: data.addressLine1 || null,
      addressLine2: data.addressLine2 || null,
      city: data.city || null,
      postalCode: data.postalCode || null,
      country: data.country || null,
      vatNumber: data.vatNumber || null,
      status: data.status || "LEAD",
    },
  });

  revalidatePath("/clients");
  return client;
}

export async function updateClient(id: string, data: Partial<CreateClientData>) {
  const { organization } = await requireAuthWithOrg();

  const existing = await db.client.findFirst({
    where: { id, organizationId: organization.id },
  });

  if (!existing) {
    throw new Error("Client not found");
  }

  const client = await db.client.update({
    where: { id },
    data: {
      name: data.name ?? existing.name,
      email: data.email !== undefined ? data.email || null : existing.email,
      phone: data.phone !== undefined ? data.phone || null : existing.phone,
      companyName: data.companyName !== undefined ? data.companyName || null : existing.companyName,
      registrationNumber: data.registrationNumber !== undefined ? data.registrationNumber || null : existing.registrationNumber,
      addressLine1: data.addressLine1 !== undefined ? data.addressLine1 || null : existing.addressLine1,
      addressLine2: data.addressLine2 !== undefined ? data.addressLine2 || null : existing.addressLine2,
      city: data.city !== undefined ? data.city || null : existing.city,
      postalCode: data.postalCode !== undefined ? data.postalCode || null : existing.postalCode,
      country: data.country !== undefined ? data.country || null : existing.country,
      vatNumber: data.vatNumber !== undefined ? data.vatNumber || null : existing.vatNumber,
      status: data.status ?? existing.status,
    },
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  return client;
}

export async function deleteClient(id: string) {
  const { organization } = await requireAuthWithOrg();

  const existing = await db.client.findFirst({
    where: { id, organizationId: organization.id },
  });

  if (!existing) {
    throw new Error("Client not found");
  }

  await db.client.delete({ where: { id } });
  revalidatePath("/clients");
}

export async function archiveClient(id: string) {
  const { organization } = await requireAuthWithOrg();

  const existing = await db.client.findFirst({
    where: { id, organizationId: organization.id },
  });

  if (!existing) {
    throw new Error("Client not found");
  }

  await db.client.update({
    where: { id },
    data: {
      archivedAt: new Date(),
      status: "ARCHIVED",
    },
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
}

export async function unarchiveClient(id: string) {
  const { organization } = await requireAuthWithOrg();

  const existing = await db.client.findFirst({
    where: { id, organizationId: organization.id },
  });

  if (!existing) {
    throw new Error("Client not found");
  }

  await db.client.update({
    where: { id },
    data: {
      archivedAt: null,
      status: "ACTIVE",
    },
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
}

export async function getClients(includeArchived = false) {
  const { organization } = await requireAuthWithOrg();

  return db.client.findMany({
    where: {
      organizationId: organization.id,
      ...(includeArchived ? {} : { archivedAt: null }),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getClient(id: string) {
  const { organization } = await requireAuthWithOrg();

  return db.client.findFirst({
    where: {
      id,
      organizationId: organization.id,
    },
    include: {
      contacts: {
        orderBy: { isPrimary: "desc" },
      },
      notes: {
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        include: { createdBy: true },
      },
      projects: {
        orderBy: { createdAt: "desc" },
      },
      events: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { createdBy: true, project: true },
      },
      files: {
        orderBy: { createdAt: "desc" },
        include: { uploadedBy: true },
      },
      bookings: {
        orderBy: { startsAt: "desc" },
        take: 10,
      },
      quotes: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      invoices: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      contracts: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
}

// ===========================================
// CONTACT ACTIONS
// ===========================================

interface CreateContactData {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: string;
  isPrimary?: boolean;
}

export async function createContact(clientId: string, data: CreateContactData) {
  const { organization } = await requireAuthWithOrg();

  // Verify client belongs to org
  const client = await db.client.findFirst({
    where: { id: clientId, organizationId: organization.id },
  });

  if (!client) {
    throw new Error("Client not found");
  }

  // If this is primary, unset other primary contacts
  if (data.isPrimary) {
    await db.contact.updateMany({
      where: { clientId },
      data: { isPrimary: false },
    });
  }

  const contact = await db.contact.create({
    data: {
      clientId,
      firstName: data.firstName,
      lastName: data.lastName || null,
      email: data.email || null,
      phone: data.phone || null,
      role: data.role || null,
      isPrimary: data.isPrimary || false,
    },
  });

  revalidatePath(`/clients/${clientId}`);
  return contact;
}

export async function updateContact(id: string, clientId: string, data: Partial<CreateContactData>) {
  const { organization } = await requireAuthWithOrg();

  const client = await db.client.findFirst({
    where: { id: clientId, organizationId: organization.id },
  });

  if (!client) {
    throw new Error("Client not found");
  }

  if (data.isPrimary) {
    await db.contact.updateMany({
      where: { clientId, id: { not: id } },
      data: { isPrimary: false },
    });
  }

  const contact = await db.contact.update({
    where: { id },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      role: data.role,
      isPrimary: data.isPrimary,
    },
  });

  revalidatePath(`/clients/${clientId}`);
  return contact;
}

export async function deleteContact(id: string, clientId: string) {
  const { organization } = await requireAuthWithOrg();

  const client = await db.client.findFirst({
    where: { id: clientId, organizationId: organization.id },
  });

  if (!client) {
    throw new Error("Client not found");
  }

  await db.contact.delete({ where: { id } });
  revalidatePath(`/clients/${clientId}`);
}

// ===========================================
// NOTE ACTIONS
// ===========================================

export async function createNote(clientId: string, content: string, isPinned = false) {
  const { organization } = await requireAuthWithOrg();
  const user = await getCurrentUser();

  const client = await db.client.findFirst({
    where: { id: clientId, organizationId: organization.id },
  });

  if (!client) {
    throw new Error("Client not found");
  }

  const note = await db.note.create({
    data: {
      clientId,
      content,
      isPinned,
      createdById: user?.id,
    },
  });

  revalidatePath(`/clients/${clientId}`);
  return note;
}

export async function updateNote(id: string, clientId: string, data: { content?: string; isPinned?: boolean }) {
  const { organization } = await requireAuthWithOrg();

  const client = await db.client.findFirst({
    where: { id: clientId, organizationId: organization.id },
  });

  if (!client) {
    throw new Error("Client not found");
  }

  const note = await db.note.update({
    where: { id },
    data: {
      content: data.content,
      isPinned: data.isPinned,
    },
  });

  revalidatePath(`/clients/${clientId}`);
  return note;
}

export async function deleteNote(id: string, clientId: string) {
  const { organization } = await requireAuthWithOrg();

  const client = await db.client.findFirst({
    where: { id: clientId, organizationId: organization.id },
  });

  if (!client) {
    throw new Error("Client not found");
  }

  await db.note.delete({ where: { id } });
  revalidatePath(`/clients/${clientId}`);
}

// ===========================================
// PROJECT ACTIONS
// ===========================================

interface CreateProjectData {
  name: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  currency?: string;
}

export async function createProject(clientId: string, data: CreateProjectData) {
  const { organization } = await requireAuthWithOrg();

  const client = await db.client.findFirst({
    where: { id: clientId, organizationId: organization.id },
  });

  if (!client) {
    throw new Error("Client not found");
  }

  const project = await db.project.create({
    data: {
      organizationId: organization.id,
      clientId,
      name: data.name,
      description: data.description || null,
      status: data.status || "NOT_STARTED",
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      budget: data.budget || null,
      currency: data.currency || organization.defaultCurrency,
    },
  });

  revalidatePath(`/clients/${clientId}`);
  return project;
}

export async function updateProject(id: string, clientId: string, data: Partial<CreateProjectData>) {
  const { organization } = await requireAuthWithOrg();

  const client = await db.client.findFirst({
    where: { id: clientId, organizationId: organization.id },
  });

  if (!client) {
    throw new Error("Client not found");
  }

  const project = await db.project.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      status: data.status,
      startDate: data.startDate,
      endDate: data.endDate,
      budget: data.budget,
      currency: data.currency,
    },
  });

  revalidatePath(`/clients/${clientId}`);
  return project;
}

export async function deleteProject(id: string, clientId: string) {
  const { organization } = await requireAuthWithOrg();

  const client = await db.client.findFirst({
    where: { id: clientId, organizationId: organization.id },
  });

  if (!client) {
    throw new Error("Client not found");
  }

  await db.project.delete({ where: { id } });
  revalidatePath(`/clients/${clientId}`);
}

// ===========================================
// EVENT ACTIONS
// ===========================================

interface CreateEventData {
  type: EventType;
  title: string;
  description?: string;
  scheduledAt?: Date;
  completedAt?: Date;
  projectId?: string;
  metadata?: Record<string, unknown>;
}

export async function createEvent(clientId: string, data: CreateEventData) {
  const { organization } = await requireAuthWithOrg();
  const user = await getCurrentUser();

  const client = await db.client.findFirst({
    where: { id: clientId, organizationId: organization.id },
  });

  if (!client) {
    throw new Error("Client not found");
  }

  const event = await db.event.create({
    data: {
      clientId,
      type: data.type,
      title: data.title,
      description: data.description || null,
      scheduledAt: data.scheduledAt || null,
      completedAt: data.completedAt || null,
      projectId: data.projectId || null,
      metadata: (data.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      createdById: user?.id,
    },
  });

  revalidatePath(`/clients/${clientId}`);
  return event;
}

export async function updateEvent(id: string, clientId: string, data: Partial<CreateEventData>) {
  const { organization } = await requireAuthWithOrg();

  const client = await db.client.findFirst({
    where: { id: clientId, organizationId: organization.id },
  });

  if (!client) {
    throw new Error("Client not found");
  }

  const event = await db.event.update({
    where: { id },
    data: {
      type: data.type,
      title: data.title,
      description: data.description,
      scheduledAt: data.scheduledAt,
      completedAt: data.completedAt,
      projectId: data.projectId,
      metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : undefined,
    },
  });

  revalidatePath(`/clients/${clientId}`);
  return event;
}

export async function deleteEvent(id: string, clientId: string) {
  const { organization } = await requireAuthWithOrg();

  const client = await db.client.findFirst({
    where: { id: clientId, organizationId: organization.id },
  });

  if (!client) {
    throw new Error("Client not found");
  }

  await db.event.delete({ where: { id } });
  revalidatePath(`/clients/${clientId}`);
}
