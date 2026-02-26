"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { requireAuthWithOrg, getCurrentUser } from "@/lib/auth";
import { ClientStatus, EventType, ProjectStatus, Prisma } from "@servible/database";
import { sendPortalMagicLink } from "@/lib/email";

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
      status: "CLIENT",
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
        take: 20,
        include: { bookingType: { select: { name: true } } },
      },
      quotes: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      invoices: {
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

// ===========================================
// PORTAL INVITE ACTIONS
// ===========================================

export async function sendPortalInvite(clientId: string, contactId: string) {
  const { organization } = await requireAuthWithOrg();

  const client = await db.client.findFirst({
    where: { id: clientId, organizationId: organization.id },
    select: { id: true, status: true },
  });

  if (!client) {
    throw new Error("Client not found");
  }

  if (client.status !== "CLIENT") {
    throw new Error("Portal invites can only be sent for clients with status CLIENT");
  }

  const contact = await db.contact.findFirst({
    where: { id: contactId, clientId },
    select: { id: true, firstName: true, lastName: true, email: true },
  });

  if (!contact) {
    throw new Error("Contact not found");
  }

  if (!contact.email) {
    throw new Error("Contact does not have an email address");
  }

  // Find a published site with portal enabled
  const site = await db.site.findFirst({
    where: {
      organizationId: organization.id,
      status: "PUBLISHED",
      portalEnabled: true,
    },
    select: {
      subdomain: true,
      customDomain: true,
    },
  });

  if (!site) {
    throw new Error("No published site with portal enabled found");
  }

  // Generate a secure token
  const token = randomBytes(32).toString("hex");

  // Create expiration (24 hours from now)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  // Delete any existing sessions for this contact
  await db.portalSession.deleteMany({
    where: { clientId: client.id, contactId: contact.id },
  });

  // Create new session
  await db.portalSession.create({
    data: {
      clientId: client.id,
      contactId: contact.id,
      token,
      expiresAt,
    },
  });

  // Build the magic link URL
  let magicLink: string;
  if (process.env.NODE_ENV === "production") {
    const domain = site.customDomain || `${site.subdomain}.servible.app`;
    magicLink = `https://${domain}/portal/login?token=${token}`;
  } else {
    magicLink = `http://${site.subdomain}.localhost:3002/portal/login?token=${token}`;
  }

  const contactName = [contact.firstName, contact.lastName].filter(Boolean).join(" ");

  await sendPortalMagicLink({
    to: contact.email,
    clientName: contactName,
    organizationName: organization.name,
    magicLink,
    locale: organization.locale,
  });
}
