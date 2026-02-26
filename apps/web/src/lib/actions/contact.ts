"use server";

import { db } from "@servible/database";

interface ContactFormData {
  organizationId: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  website?: string;
  subject?: string;
  message: string;
  _hp?: string; // honeypot field — should always be empty
}

export async function submitContactForm(data: ContactFormData): Promise<{ success: true } | { success: false; error: string }> {
  const { organizationId, name, email, phone, company, website, subject, message } = data;

  // Honeypot: if filled, silently accept to not tip off bots
  if (data._hp) {
    return { success: true };
  }

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return { success: false, error: "Name, email and message are required." };
  }

  const normalizedEmail = email.trim().toLowerCase();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  try {
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
          companyName: company?.trim() || null,
          status: "LEAD",
        },
      });
    }

    // Parse first/last name
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

    // Create contact + event + notification in parallel
    await Promise.all([
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
      db.event.create({
        data: {
          clientId: client.id,
          type: "OTHER",
          title: subject?.trim() || "Contact form submission",
          description: message.trim(),
          metadata: {
            source: "contact_form",
            ...(phone?.trim() && { phone: phone.trim() }),
            ...(company?.trim() && { company: company.trim() }),
            ...(website?.trim() && { website: website.trim() }),
            ...(subject?.trim() && { subject: subject.trim() }),
          },
        },
      }),
      db.notification.create({
        data: {
          organizationId,
          type: "contact_form",
          title: `New contact: ${name.trim()}`,
          message: message.trim().slice(0, 200),
          entityType: "client",
          entityId: client.id,
        },
      }),
    ]);

    return { success: true };
  } catch (e) {
    console.error("Contact form submission failed:", e);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
