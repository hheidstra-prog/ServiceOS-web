"use server";

import { db } from "@servible/database";

// ─── Types ───

interface BookingTypeInfo {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number | null;
  currency: string;
  color: string | null;
  requiresConfirmation: boolean;
}

interface BookingConfig {
  organizationName: string;
  bookingTypes: BookingTypeInfo[];
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface PublicBookingData {
  organizationId: string;
  bookingTypeId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  _hp?: string; // honeypot
}

// ─── Get Booking Config ───

export async function getBookingConfig(organizationId: string): Promise<BookingConfig | null> {
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { name: true },
  });

  if (!organization) return null;

  const raw = await db.bookingType.findMany({
    where: {
      organizationId,
      isActive: true,
      isPublic: true,
    },
    select: {
      id: true,
      name: true,
      description: true,
      durationMinutes: true,
      price: true,
      currency: true,
      color: true,
      requiresConfirmation: true,
    },
    orderBy: { name: "asc" },
  });

  return {
    organizationName: organization.name,
    bookingTypes: raw.map((t) => ({
      ...t,
      price: t.price ? Number(t.price) : null,
    })),
  };
}

// ─── Get Available Slots ───

export async function getAvailableSlots(
  organizationId: string,
  bookingTypeId: string,
  date: string // YYYY-MM-DD
): Promise<TimeSlot[]> {
  const dateObj = new Date(date + "T00:00:00");
  const dayOfWeek = dateObj.getDay(); // 0=Sunday

  // 1. Get availability rules for this day
  const availability = await db.availability.findFirst({
    where: {
      organizationId,
      dayOfWeek,
      isActive: true,
    },
  });

  if (!availability) return [];

  // 2. Get the booking type for duration/buffer info
  const bookingType = await db.bookingType.findUnique({
    where: { id: bookingTypeId },
    select: {
      durationMinutes: true,
      bufferBefore: true,
      bufferAfter: true,
    },
  });

  if (!bookingType) return [];

  // 3. Get existing bookings for that date (PENDING + CONFIRMED)
  const dayStart = new Date(date + "T00:00:00");
  const dayEnd = new Date(date + "T23:59:59");

  const existingBookings = await db.booking.findMany({
    where: {
      organizationId,
      startsAt: { gte: dayStart, lte: dayEnd },
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    select: {
      startsAt: true,
      endsAt: true,
    },
  });

  // 4. Generate time slots
  const [startHour, startMin] = availability.startTime.split(":").map(Number);
  const [endHour, endMin] = availability.endTime.split(":").map(Number);

  const availStart = startHour * 60 + startMin;
  const availEnd = endHour * 60 + endMin;
  const slotDuration = bookingType.durationMinutes;
  const bufferBefore = bookingType.bufferBefore;
  const bufferAfter = bookingType.bufferAfter;

  const slots: TimeSlot[] = [];

  for (let time = availStart; time + slotDuration <= availEnd; time += 30) {
    const slotStartMinutes = time;
    const slotEndMinutes = time + slotDuration;

    const timeStr = `${Math.floor(time / 60).toString().padStart(2, "0")}:${(time % 60).toString().padStart(2, "0")}`;

    // Check overlap with existing bookings (including buffers)
    const slotStartWithBuffer = slotStartMinutes - bufferBefore;
    const slotEndWithBuffer = slotEndMinutes + bufferAfter;

    const hasConflict = existingBookings.some((booking) => {
      const bookingStart = new Date(booking.startsAt).getHours() * 60 + new Date(booking.startsAt).getMinutes();
      const bookingEnd = new Date(booking.endsAt).getHours() * 60 + new Date(booking.endsAt).getMinutes();

      return slotStartWithBuffer < bookingEnd && slotEndWithBuffer > bookingStart;
    });

    // Don't show slots in the past for today
    const now = new Date();
    const isToday =
      dateObj.getFullYear() === now.getFullYear() &&
      dateObj.getMonth() === now.getMonth() &&
      dateObj.getDate() === now.getDate();

    const isPast = isToday && slotStartMinutes <= now.getHours() * 60 + now.getMinutes();

    slots.push({
      time: timeStr,
      available: !hasConflict && !isPast,
    });
  }

  return slots;
}

// ─── Get Available Days (for a month) ───

export async function getAvailableDays(organizationId: string): Promise<number[]> {
  const availability = await db.availability.findMany({
    where: {
      organizationId,
      isActive: true,
    },
    select: { dayOfWeek: true },
  });

  return availability.map((a) => a.dayOfWeek);
}

// ─── Create Public Booking ───

// ─── Get Portal Booking Config (all active types, not just public) ───

export async function getPortalBookingConfig(organizationId: string): Promise<BookingConfig | null> {
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { name: true },
  });

  if (!organization) return null;

  // Portal clients see non-public types only (paid sessions, reviews, etc.)
  // Public types (free intro calls, lead magnets) are for the /book page
  const raw = await db.bookingType.findMany({
    where: {
      organizationId,
      isActive: true,
      isPublic: false,
    },
    select: {
      id: true,
      name: true,
      description: true,
      durationMinutes: true,
      price: true,
      currency: true,
      color: true,
      requiresConfirmation: true,
    },
    orderBy: { name: "asc" },
  });

  return {
    organizationName: organization.name,
    bookingTypes: raw.map((t) => ({
      ...t,
      price: t.price ? Number(t.price) : null,
    })),
  };
}

// ─── Create Portal Booking (authenticated client) ───

interface PortalBookingData {
  organizationId: string;
  clientId: string;
  bookingTypeId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  notes?: string;
}

export async function createPortalBooking(
  data: PortalBookingData
): Promise<{ success: true; bookingId: string; status: string } | { success: false; error: string }> {
  const { organizationId, clientId, bookingTypeId, date, time, notes } = data;

  if (!date || !time || !bookingTypeId || !clientId) {
    return { success: false, error: "Missing required fields." };
  }

  try {
    // Get booking type
    const bookingType = await db.bookingType.findUnique({
      where: { id: bookingTypeId },
    });

    if (!bookingType || !bookingType.isActive) {
      return { success: false, error: "This booking type is no longer available." };
    }

    // Verify slot is still available
    const slots = await getAvailableSlots(organizationId, bookingTypeId, date);
    const selectedSlot = slots.find((s) => s.time === time);
    if (!selectedSlot?.available) {
      return { success: false, error: "This time slot is no longer available. Please choose another." };
    }

    // Calculate start/end times
    const [hour, minute] = time.split(":").map(Number);
    const startsAt = new Date(date + "T00:00:00");
    startsAt.setHours(hour, minute, 0, 0);

    const endsAt = new Date(startsAt.getTime() + bookingType.durationMinutes * 60 * 1000);

    const status = bookingType.requiresConfirmation ? "PENDING" : "CONFIRMED";

    // Get client info for notification
    const client = await db.client.findUnique({
      where: { id: clientId },
      select: { name: true, email: true },
    });

    if (!client) {
      return { success: false, error: "Client not found." };
    }

    // Create booking
    const booking = await db.booking.create({
      data: {
        organizationId,
        clientId,
        bookingTypeId,
        guestName: client.name,
        guestEmail: client.email || "",
        startsAt,
        endsAt,
        status,
        notes: notes?.trim() || null,
        locationType: "ONLINE",
      },
    });

    // Create notification + activity event
    await Promise.all([
      db.notification.create({
        data: {
          organizationId,
          type: "new_booking",
          title: `New booking: ${client.name} (via portal)`,
          message: `${bookingType.name} — ${date} at ${time}`,
          entityType: "booking",
          entityId: booking.id,
        },
      }),
      db.event.create({
        data: {
          clientId,
          type: "APPOINTMENT",
          title: `Booking: ${bookingType.name}`,
          description: notes?.trim() || null,
          scheduledAt: startsAt,
          metadata: {
            source: "portal_booking",
            bookingId: booking.id,
            bookingType: bookingType.name,
          },
        },
      }),
    ]);

    return { success: true, bookingId: booking.id, status };
  } catch (e) {
    console.error("Portal booking creation failed:", e);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

// ─── Create Public Booking ───

export async function createPublicBooking(
  data: PublicBookingData
): Promise<{ success: true; bookingId: string; status: string } | { success: false; error: string }> {
  const { organizationId, bookingTypeId, date, time, name, email, phone, notes } = data;

  // Honeypot check
  if (data._hp) {
    return { success: true, bookingId: "", status: "CONFIRMED" };
  }

  // Validate required fields
  if (!name?.trim() || !email?.trim() || !date || !time || !bookingTypeId) {
    return { success: false, error: "Please fill in all required fields." };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  try {
    // Get booking type
    const bookingType = await db.bookingType.findUnique({
      where: { id: bookingTypeId },
    });

    if (!bookingType || !bookingType.isActive) {
      return { success: false, error: "This booking type is no longer available." };
    }

    // Verify slot is still available
    const slots = await getAvailableSlots(organizationId, bookingTypeId, date);
    const selectedSlot = slots.find((s) => s.time === time);
    if (!selectedSlot?.available) {
      return { success: false, error: "This time slot is no longer available. Please choose another." };
    }

    // Calculate start/end times
    const [hour, minute] = time.split(":").map(Number);
    const startsAt = new Date(date + "T00:00:00");
    startsAt.setHours(hour, minute, 0, 0);

    const endsAt = new Date(startsAt.getTime() + bookingType.durationMinutes * 60 * 1000);

    const status = bookingType.requiresConfirmation ? "PENDING" : "CONFIRMED";

    // Find or create client
    let client = await db.client.findFirst({
      where: { organizationId, email: normalizedEmail },
    });

    if (!client) {
      client = await db.client.create({
        data: {
          organizationId,
          name: name.trim(),
          email: normalizedEmail,
          phone: phone?.trim() || null,
          status: "LEAD",
        },
      });
    }

    // Parse name
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

    // Create booking, contact, and notification in parallel
    const [booking] = await Promise.all([
      db.booking.create({
        data: {
          organizationId,
          clientId: client.id,
          bookingTypeId,
          guestName: name.trim(),
          guestEmail: normalizedEmail,
          guestPhone: phone?.trim() || null,
          startsAt,
          endsAt,
          status,
          notes: notes?.trim() || null,
          locationType: "ONLINE",
          portalVisible: true,
        },
      }),
      db.contact.create({
        data: {
          clientId: client.id,
          firstName,
          lastName,
          email: normalizedEmail,
          phone: phone?.trim() || null,
          isPrimary: true,
        },
      }),
    ]);

    // Create notification + activity event (after booking so we have the ID)
    await Promise.all([
      db.notification.create({
        data: {
          organizationId,
          type: "new_booking",
          title: `New booking: ${name.trim()}`,
          message: `${bookingType.name} — ${date} at ${time}`,
          entityType: "booking",
          entityId: booking.id,
        },
      }),
      db.event.create({
        data: {
          clientId: client.id,
          type: "APPOINTMENT",
          title: `Booking: ${bookingType.name}`,
          description: notes?.trim() || null,
          scheduledAt: startsAt,
          metadata: {
            source: "public_booking",
            bookingId: booking.id,
            bookingType: bookingType.name,
            phone: phone?.trim() || undefined,
          },
        },
      }),
    ]);

    return { success: true, bookingId: booking.id, status };
  } catch (e) {
    console.error("Public booking creation failed:", e);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
