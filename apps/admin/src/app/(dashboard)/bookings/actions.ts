"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUserAndOrg } from "@/lib/auth";
import { BookingStatus, LocationType } from "@serviceos/database";

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
      bookingType: true,
    },
  });
}

// Create a new booking
export async function createBooking(data: {
  clientId?: string;
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
  });

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
  });

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
  return bookingType;
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
  return bookingType;
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
