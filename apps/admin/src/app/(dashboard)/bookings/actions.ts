"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUserAndOrg } from "@/lib/auth";
import { BookingStatus, LocationType } from "@servible/database";
import { sendBookingConfirmation, sendBookingCancellation } from "@/lib/email";

function getLocaleTag(locale: string) {
  const map: Record<string, string> = { nl: "nl-NL", de: "de-DE", fr: "fr-FR", en: "en-US" };
  return map[locale] || "en-US";
}

function formatBookingDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(getLocaleTag(locale), {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatBookingTime(date: Date) {
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

// Get all bookings for the organization
export async function getBookings(filters?: {
  startDate?: Date;
  endDate?: Date;
  status?: BookingStatus;
}) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return [];

  const where: Record<string, unknown> = {
    organizationId: organization.id,
  };

  if (filters?.startDate || filters?.endDate) {
    where.startsAt = {};
    if (filters.startDate) {
      (where.startsAt as Record<string, Date>).gte = filters.startDate;
    }
    if (filters.endDate) {
      (where.startsAt as Record<string, Date>).lte = filters.endDate;
    }
  }

  if (filters?.status) {
    where.status = filters.status;
  }

  return db.booking.findMany({
    where,
    include: {
      client: {
        select: {
          id: true,
          name: true,
          companyName: true,
          email: true,
          phone: true,
        },
      },
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      bookingType: {
        select: {
          id: true,
          name: true,
          durationMinutes: true,
          color: true,
        },
      },
    },
    orderBy: { startsAt: "asc" },
  });
}

// Get upcoming bookings (next 7 days)
export async function getUpcomingBookings() {
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return getBookings({
    startDate: now,
    endDate: weekFromNow,
  });
}

// Get a single booking with all details
export async function getBooking(id: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return null;

  return db.booking.findFirst({
    where: {
      id,
      organizationId: organization.id,
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          companyName: true,
          email: true,
          phone: true,
          addressLine1: true,
          city: true,
        },
      },
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      bookingType: true,
    },
  });
}

// Create a new booking
export async function createBooking(data: {
  clientId?: string;
  contactId?: string;
  bookingTypeId?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  startsAt: Date;
  endsAt: Date;
  locationType?: LocationType;
  location?: string;
  notes?: string;
  internalNotes?: string;
  status?: BookingStatus;
  portalVisible?: boolean;
}) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  // Get booking type name for the event title
  let bookingTypeName = "Appointment";
  if (data.bookingTypeId) {
    const bt = await db.bookingType.findUnique({
      where: { id: data.bookingTypeId },
      select: { name: true },
    });
    if (bt) bookingTypeName = bt.name;
  }

  const booking = await db.booking.create({
    data: {
      organizationId: organization.id,
      clientId: data.clientId,
      contactId: data.contactId,
      bookingTypeId: data.bookingTypeId,
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      guestPhone: data.guestPhone,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      locationType: data.locationType || "ONLINE",
      location: data.location,
      notes: data.notes,
      internalNotes: data.internalNotes,
      status: data.status || "CONFIRMED",
      portalVisible: data.portalVisible ?? false,
      timezone: organization.timezone,
    },
  });

  // Create activity event on the client timeline
  if (data.clientId) {
    await db.event.create({
      data: {
        clientId: data.clientId,
        type: "APPOINTMENT",
        title: `Booking: ${bookingTypeName}`,
        description: data.notes || null,
        scheduledAt: data.startsAt,
        metadata: {
          source: "admin_booking",
          bookingId: booking.id,
          bookingType: bookingTypeName,
        },
      },
    });
  }

  // Send booking confirmation email (async, non-blocking)
  const recipientEmail = data.guestEmail || (data.clientId ? (await db.client.findUnique({ where: { id: data.clientId }, select: { email: true } }))?.email : null);
  const recipientName = data.guestName || (data.clientId ? (await db.client.findUnique({ where: { id: data.clientId }, select: { name: true } }))?.name : null);

  if (recipientEmail && recipientName) {
    const locale = organization.locale || "en";
    const durationMinutes = Math.round((data.endsAt.getTime() - data.startsAt.getTime()) / 60000);

    sendBookingConfirmation({
      to: recipientEmail,
      guestName: recipientName,
      organizationName: organization.name,
      dateFormatted: formatBookingDate(data.startsAt, locale),
      time: formatBookingTime(data.startsAt),
      durationMinutes,
      status: (data.status || "CONFIRMED") as "CONFIRMED" | "PENDING",
      locale,
    }).catch((err) => console.error("Failed to send booking confirmation email:", err));
  }

  revalidatePath("/bookings");
  return booking;
}

// Update a booking
export async function updateBooking(
  id: string,
  data: {
    startsAt?: Date;
    endsAt?: Date;
    locationType?: LocationType;
    location?: string;
    notes?: string;
    internalNotes?: string;
    status?: BookingStatus;
    clientId?: string | null;
    contactId?: string | null;
    bookingTypeId?: string | null;
  }
) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  const booking = await db.booking.update({
    where: { id, organizationId: organization.id },
    data: {
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      locationType: data.locationType,
      location: data.location,
      notes: data.notes,
      internalNotes: data.internalNotes,
      status: data.status,
      ...(data.clientId !== undefined && { clientId: data.clientId }),
      ...(data.contactId !== undefined && { contactId: data.contactId }),
      ...(data.bookingTypeId !== undefined && { bookingTypeId: data.bookingTypeId }),
    },
  });

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${id}`);
  return booking;
}

// Cancel a booking
export async function cancelBooking(id: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  const booking = await db.booking.update({
    where: { id, organizationId: organization.id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
    },
    include: {
      client: { select: { name: true, email: true } },
    },
  });

  // Send cancellation email (async, non-blocking)
  const email = booking.guestEmail || booking.client?.email;
  const name = booking.guestName || booking.client?.name;

  if (email && name) {
    const locale = organization.locale || "en";

    sendBookingCancellation({
      to: email,
      guestName: name,
      organizationName: organization.name,
      dateFormatted: formatBookingDate(booking.startsAt, locale),
      time: formatBookingTime(booking.startsAt),
      locale,
    }).catch((err) => console.error("Failed to send booking cancellation email:", err));
  }

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${id}`);
  return booking;
}

// Confirm a booking
export async function confirmBooking(id: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  const booking = await db.booking.update({
    where: { id, organizationId: organization.id },
    data: {
      status: "CONFIRMED",
    },
    include: {
      client: { select: { name: true, email: true } },
    },
  });

  // Send confirmation email (async, non-blocking)
  const email = booking.guestEmail || booking.client?.email;
  const name = booking.guestName || booking.client?.name;

  if (email && name) {
    const locale = organization.locale || "en";
    const durationMinutes = Math.round((booking.endsAt.getTime() - booking.startsAt.getTime()) / 60000);

    sendBookingConfirmation({
      to: email,
      guestName: name,
      organizationName: organization.name,
      dateFormatted: formatBookingDate(booking.startsAt, locale),
      time: formatBookingTime(booking.startsAt),
      durationMinutes,
      status: "CONFIRMED",
      locale,
    }).catch((err) => console.error("Failed to send booking confirmation email:", err));
  }

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${id}`);
  return booking;
}

// Mark booking as completed
export async function completeBooking(id: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  const booking = await db.booking.update({
    where: { id, organizationId: organization.id },
    data: {
      status: "COMPLETED",
    },
  });

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${id}`);
  return booking;
}

// Mark booking as no-show
export async function markNoShow(id: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  const booking = await db.booking.update({
    where: { id, organizationId: organization.id },
    data: {
      status: "NO_SHOW",
    },
  });

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${id}`);
  return booking;
}

// Delete a booking
export async function deleteBooking(id: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  await db.booking.delete({
    where: { id, organizationId: organization.id },
  });

  revalidatePath("/bookings");
}

// =====================
// BOOKING TYPES
// =====================

// Get all booking types
export async function getBookingTypes() {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return [];

  return db.bookingType.findMany({
    where: { organizationId: organization.id },
    orderBy: { name: "asc" },
  });
}

// Get active booking types for select
export async function getBookingTypesForSelect() {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return [];

  return db.bookingType.findMany({
    where: {
      organizationId: organization.id,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      durationMinutes: true,
      color: true,
    },
    orderBy: { name: "asc" },
  });
}

// Create a booking type
export async function createBookingType(data: {
  name: string;
  description?: string;
  durationMinutes: number;
  price?: number;
  color?: string;
  requiresConfirmation?: boolean;
  isPublic?: boolean;
  bufferBefore?: number;
  bufferAfter?: number;
}) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  const bookingType = await db.bookingType.create({
    data: {
      organizationId: organization.id,
      name: data.name,
      description: data.description,
      durationMinutes: data.durationMinutes,
      price: data.price,
      currency: organization.defaultCurrency,
      color: data.color,
      requiresConfirmation: data.requiresConfirmation ?? false,
      isPublic: data.isPublic ?? false,
      bufferBefore: data.bufferBefore ?? 0,
      bufferAfter: data.bufferAfter ?? 0,
    },
  });

  revalidatePath("/bookings");
  return { id: bookingType.id };
}

// Update a booking type
export async function updateBookingType(
  id: string,
  data: {
    name?: string;
    description?: string;
    durationMinutes?: number;
    price?: number;
    color?: string;
    isActive?: boolean;
    isPublic?: boolean;
    requiresConfirmation?: boolean;
    bufferBefore?: number;
    bufferAfter?: number;
  }
) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  const bookingType = await db.bookingType.update({
    where: { id, organizationId: organization.id },
    data,
  });

  revalidatePath("/bookings");
  return { id: bookingType.id };
}

// Delete a booking type
export async function deleteBookingType(id: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  await db.bookingType.delete({
    where: { id, organizationId: organization.id },
  });

  revalidatePath("/bookings");
}

// =====================
// AVAILABILITY
// =====================

// Get availability rules for the organization
export async function getAvailability() {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return [];

  return db.availability.findMany({
    where: { organizationId: organization.id },
    orderBy: { dayOfWeek: "asc" },
  });
}

// Set availability rules (replace all existing)
export async function setAvailability(
  rules: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isActive: boolean;
  }>
) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  // Delete existing rules and create new ones in a transaction
  await db.$transaction([
    db.availability.deleteMany({
      where: { organizationId: organization.id },
    }),
    ...rules.map((rule) =>
      db.availability.create({
        data: {
          organizationId: organization.id,
          dayOfWeek: rule.dayOfWeek,
          startTime: rule.startTime,
          endTime: rule.endTime,
          isActive: rule.isActive,
        },
      })
    ),
  ]);

  revalidatePath("/bookings");
}

// Get contacts for a specific client
export async function getContactsForClient(clientId: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return [];

  return db.contact.findMany({
    where: {
      clientId,
      client: { organizationId: organization.id },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      isPrimary: true,
    },
    orderBy: [{ isPrimary: "desc" }, { firstName: "asc" }],
  });
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
      email: true,
    },
    orderBy: { name: "asc" },
  });
}

// =====================
// BOOKING SETTINGS
// =====================

export async function getBookingSettings() {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return null;

  const org = await db.organization.findUnique({
    where: { id: organization.id },
    select: {
      publicBookingTitle: true,
      publicBookingDurations: true,
      publicBookingBuffer: true,
      publicBookingConfirm: true,
      portalBookingDurations: true,
      portalBookingBuffer: true,
      portalBookingConfirm: true,
    },
  });

  if (!org) return null;

  return {
    publicBookingTitle: org.publicBookingTitle || "Intro Call",
    publicBookingDurations: (org.publicBookingDurations as number[]) || [15, 30],
    publicBookingBuffer: org.publicBookingBuffer,
    publicBookingConfirm: org.publicBookingConfirm,
    portalBookingDurations: (org.portalBookingDurations as number[]) || [30, 60],
    portalBookingBuffer: org.portalBookingBuffer,
    portalBookingConfirm: org.portalBookingConfirm,
  };
}

export async function updateBookingSettings(data: {
  publicBookingTitle?: string;
  publicBookingDurations?: number[];
  publicBookingBuffer?: number;
  publicBookingConfirm?: boolean;
  portalBookingDurations?: number[];
  portalBookingBuffer?: number;
  portalBookingConfirm?: boolean;
}) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  await db.organization.update({
    where: { id: organization.id },
    data,
  });

  revalidatePath("/bookings");
}

// Toggle portal visibility
export async function toggleBookingPortalVisibility(id: string, portalVisible: boolean) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  await db.booking.update({
    where: { id, organizationId: organization.id },
    data: { portalVisible },
  });

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${id}`);
}
