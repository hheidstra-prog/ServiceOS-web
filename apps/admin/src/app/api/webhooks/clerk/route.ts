import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("Missing CLERK_WEBHOOK_SECRET environment variable");
  }

  // Get headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  // Get body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Verify webhook
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return new Response("Webhook verification failed", { status: 400 });
  }

  // Handle events
  const eventType = evt.type;

  if (eventType === "user.created") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    const primaryEmail = email_addresses.find((e) => e.id === evt.data.primary_email_address_id);
    const email = primaryEmail?.email_address ?? email_addresses[0]?.email_address;

    if (!email) {
      return new Response("No email found", { status: 400 });
    }

    // Create user and their default organization in a transaction
    await db.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          clerkUserId: id,
          email: email,
          firstName: first_name ?? null,
          lastName: last_name ?? null,
          imageUrl: image_url ?? null,
        },
      });

      // Create default organization for the user
      const orgSlug = generateSlug(email);
      const organization = await tx.organization.create({
        data: {
          clerkOrgId: `personal_${id}`, // Personal org, not a Clerk org
          name: first_name ? `${first_name}'s Business` : "My Business",
          slug: orgSlug,
          email: email,
        },
      });

      // Add user as owner of the organization
      await tx.organizationMember.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: "OWNER",
        },
      });
    });

    return new Response("User created", { status: 200 });
  }

  if (eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    const primaryEmail = email_addresses.find((e) => e.id === evt.data.primary_email_address_id);
    const email = primaryEmail?.email_address ?? email_addresses[0]?.email_address;

    await db.user.update({
      where: { clerkUserId: id },
      data: {
        email: email,
        firstName: first_name ?? null,
        lastName: last_name ?? null,
        imageUrl: image_url ?? null,
      },
    });

    return new Response("User updated", { status: 200 });
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data;

    if (id) {
      // User deletion will cascade to memberships
      // Organizations owned solely by this user should be handled separately
      await db.user.delete({
        where: { clerkUserId: id },
      });
    }

    return new Response("User deleted", { status: 200 });
  }

  return new Response("Webhook received", { status: 200 });
}

function generateSlug(email: string): string {
  // Generate a slug from email, e.g., "john@example.com" -> "john-example"
  const base = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-");
  const random = Math.random().toString(36).substring(2, 8);
  return `${base}-${random}`;
}
