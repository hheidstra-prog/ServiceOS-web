"use server";

import { db } from "@servible/database";
import { sendBookingConfirmation } from "@/lib/email";

// ─── Types ───

interface PublicBookingConfig {
  organizationName: string;
  title: string;
  durations: number[];
  buffer: number;
  requiresConfirmation: boolean;
}

interface PortalBookingConfig {
  durations: number[];
  buffer: number;
  requiresConfirmation: boolean;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface PublicBookingData {
  organizationId: string;
  durationMinutes: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  _hp?: string; // honeypot
}

interface PortalBookingData {
  organizationId: string;
  clientId: string;
  durationMinutes: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  notes?: string;
}

// ─── Get Public Booking Config ───

export async function getPublicBookingConfig(organizationId: string): Promise<PublicBookingConfig | null> {
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: {
      name: true,
      publicBookingTitle: true,
      publicBookingDurations: true,
      publicBookingBuffer: true,
      publicBookingConfirm: true,
    },
  });

  if (!organization) return null;

  const durations = (organization.publicBookingDurations as number[]) || [15, 30];

  return {
    organizationName: organization.name,
    title: organization.publicBookingTitle || "Intro Call",
    durations,
    buffer: organization.publicBookingBuffer,
    requiresConfirmation: organization.publicBookingConfirm,
  };
}

// ─── Get Portal Booking Config ───

export async function getPortalBookingConfig(organizationId: string): Promise<PortalBookingConfig | null> {
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: {
      portalBookingDurations: true,
      portalBookingBuffer: true,
      portalBookingConfirm: true,
    },
  });

  if (!organization) return null;

  const durations = (organization.portalBookingDurations as number[]) || [30, 60];

  return {
    durations,
    buffer: organization.portalBookingBuffer,
    requiresConfirmation: organization.portalBookingConfirm,
  };
}

// ─── Get Available Slots ───

export async function getAvailableSlots(
  organizationId: string,
  durationMinutes: number,
  bufferMinutes: number,
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

  // 2. Get existing bookings for that date (PENDING + CONFIRMED)
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

  // 3. Generate time slots
  const [startHour, startMin] = availability.startTime.split(":").map(Number);
  const [endHour, endMin] = availability.endTime.split(":").map(Number);

  const availStart = startHour * 60 + startMin;
  const availEnd = endHour * 60 + endMin;

  const slots: TimeSlot[] = [];

  for (let time = availStart; time + durationMinutes <= availEnd; time += 30) {
    const slotStartMinutes = time;
    const slotEndMinutes = time + durationMinutes;

    const timeStr = `${Math.floor(time / 60).toString().padStart(2, "0")}:${(time % 60).toString().padStart(2, "0")}`;

    // Check overlap with existing bookings (including buffer)
    const slotStartWithBuffer = slotStartMinutes - bufferMinutes;
    const slotEndWithBuffer = slotEndMinutes + bufferMinutes;

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

export async function createPublicBooking(
  data: PublicBookingData
): Promise<{ success: true; bookingId: string; status: string } | { success: false; error: string }> {
  const { organizationId, durationMinutes, date, time, name, email, phone, notes } = data;

  // Honeypot check
  if (data._hp) {
    return { success: true, bookingId: "", status: "CONFIRMED" };
  }

  // Validate required fields
  if (!name?.trim() || !email?.trim() || !date || !time || !durationMinutes) {
    return { success: false, error: "Please fill in all required fields." };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  try {
    // Get org config for buffer/confirmation
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: {
        name: true,
        locale: true,
        publicBookingTitle: true,
        publicBookingBuffer: true,
        publicBookingConfirm: true,
      },
    });

    if (!org) {
      return { success: false, error: "Organization not found." };
    }

    // Verify slot is still available
    const slots = await getAvailableSlots(organizationId, durationMinutes, org.publicBookingBuffer, date);
    const selectedSlot = slots.find((s) => s.time === time);
    if (!selectedSlot?.available) {
      return { success: false, error: "This time slot is no longer available. Please choose another." };
    }

    // Calculate start/end times
    const [hour, minute] = time.split(":").map(Number);
    const startsAt = new Date(date + "T00:00:00");
    startsAt.setHours(hour, minute, 0, 0);

    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

    const status = org.publicBookingConfirm ? "PENDING" : "CONFIRMED";
    const title = org.publicBookingTitle || "Intro Call";

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
          message: `${title} (${durationMinutes} min) — ${date} at ${time}`,
          entityType: "booking",
          entityId: booking.id,
        },
      }),
      db.event.create({
        data: {
          clientId: client.id,
          type: "APPOINTMENT",
          title: `Booking: ${title}`,
          description: notes?.trim() || null,
          scheduledAt: startsAt,
          metadata: {
            source: "public_booking",
            bookingId: booking.id,
            durationMinutes,
            phone: phone?.trim() || undefined,
          },
        },
      }),
    ]);

    // Send confirmation email (async, non-blocking)
    const locale = org.locale || "en";
    const dateFormatted = new Intl.DateTimeFormat(
      locale === "nl" ? "nl-NL" : locale === "de" ? "de-DE" : locale === "fr" ? "fr-FR" : "en-US",
      { year: "numeric", month: "long", day: "numeric" }
    ).format(startsAt);

    sendBookingConfirmation({
      to: normalizedEmail,
      guestName: name.trim(),
      organizationName: org.name,
      dateFormatted,
      time,
      durationMinutes,
      status: status as "CONFIRMED" | "PENDING",
      locale,
    }).catch((err) => console.error("Failed to send booking confirmation email:", err));

    return { success: true, bookingId: booking.id, status };
  } catch (e) {
    console.error("Public booking creation failed:", e);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

// ─── Create Portal Booking (authenticated client) ───

export async function createPortalBooking(
  data: PortalBookingData
): Promise<{ success: true; bookingId: string; status: string } | { success: false; error: string }> {
  const { organizationId, clientId, durationMinutes, date, time, notes } = data;

  if (!date || !time || !durationMinutes || !clientId) {
    return { success: false, error: "Missing required fields." };
  }

  try {
    // Get org config for buffer/confirmation
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: {
        name: true,
        locale: true,
        portalBookingBuffer: true,
        portalBookingConfirm: true,
      },
    });

    if (!org) {
      return { success: false, error: "Organization not found." };
    }

    // Verify slot is still available
    const slots = await getAvailableSlots(organizationId, durationMinutes, org.portalBookingBuffer, date);
    const selectedSlot = slots.find((s) => s.time === time);
    if (!selectedSlot?.available) {
      return { success: false, error: "This time slot is no longer available. Please choose another." };
    }

    // Calculate start/end times
    const [hour, minute] = time.split(":").map(Number);
    const startsAt = new Date(date + "T00:00:00");
    startsAt.setHours(hour, minute, 0, 0);

    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

    const status = org.portalBookingConfirm ? "PENDING" : "CONFIRMED";

    // Get client info for notification
    const client = await db.client.findUnique({
      where: { id: clientId },
      select: { name: true, email: true },
    });

    if (!client) {
      return { success: false, error: "Client not found." };
    }

    // Try to resolve contact from portal session for better email targeting
    const portalContact = await db.portalSession.findFirst({
      where: {
        clientId,
        expiresAt: { gt: new Date() },
      },
      select: {
        contactId: true,
        contact: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    const contact = portalContact?.contact;
    const contactName = contact
      ? [contact.firstName, contact.lastName].filter(Boolean).join(" ")
      : null;

    // Use contact info when available, fall back to client
    const bookingName = contactName || client.name;
    const bookingEmail = contact?.email || client.email || "";

    // Create booking
    const booking = await db.booking.create({
      data: {
        organizationId,
        clientId,
        contactId: portalContact?.contactId || null,
        guestName: bookingName,
        guestEmail: bookingEmail,
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
          title: `New booking: ${bookingName} (via portal)`,
          message: `Meeting (${durationMinutes} min) — ${date} at ${time}`,
          entityType: "booking",
          entityId: booking.id,
        },
      }),
      db.event.create({
        data: {
          clientId,
          type: "APPOINTMENT",
          title: `Booking: Meeting (${durationMinutes} min)`,
          description: notes?.trim() || null,
          scheduledAt: startsAt,
          metadata: {
            source: "portal_booking",
            bookingId: booking.id,
            durationMinutes,
          },
        },
      }),
    ]);

    // Send confirmation email (async, non-blocking)
    // Prefer contact email/name from portal session, fall back to client
    const recipientEmail = contact?.email || client.email;
    const recipientName = contact
      ? [contact.firstName, contact.lastName].filter(Boolean).join(" ")
      : client.name;

    if (recipientEmail) {
      const locale = org.locale || "en";
      const dateFormatted = new Intl.DateTimeFormat(
        locale === "nl" ? "nl-NL" : locale === "de" ? "de-DE" : locale === "fr" ? "fr-FR" : "en-US",
        { year: "numeric", month: "long", day: "numeric" }
      ).format(startsAt);

      sendBookingConfirmation({
        to: recipientEmail,
        guestName: recipientName,
        organizationName: org.name,
        dateFormatted,
        time,
        durationMinutes,
        status: status as "CONFIRMED" | "PENDING",
        locale,
      }).catch((err) => console.error("Failed to send portal booking confirmation email:", err));
    } else {
      console.warn(`Portal booking: no recipient email, skipping confirmation`);
    }

    return { success: true, bookingId: booking.id, status };
  } catch (e) {
    console.error("Portal booking creation failed:", e);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
