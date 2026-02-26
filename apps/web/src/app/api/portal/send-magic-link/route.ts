import { NextRequest, NextResponse } from "next/server";
import { db } from "@servible/database";
import { randomBytes } from "crypto";
import { sendPortalMagicLink } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { email, organizationId } = await request.json();

    if (!email || !organizationId) {
      return NextResponse.json(
        { error: "Email and organization ID are required" },
        { status: 400 }
      );
    }

    // Find the client (case-insensitive email match)
    const client = await db.client.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
        organizationId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        organization: {
          select: {
            name: true,
            email: true,
            locale: true,
          },
        },
      },
    });

    // Always return success to prevent email enumeration
    if (!client) {
      return NextResponse.json({ success: true });
    }

    // Generate a secure token
    const token = randomBytes(32).toString("hex");

    // Create expiration (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Delete any existing sessions for this client
    await db.portalSession.deleteMany({
      where: { clientId: client.id },
    });

    // Create new session
    await db.portalSession.create({
      data: {
        clientId: client.id,
        token,
        expiresAt,
      },
    });

    // Get the site to build the magic link URL
    const site = await db.site.findFirst({
      where: { organizationId },
      select: {
        subdomain: true,
        customDomain: true,
      },
    });

    if (site) {
      // Build the magic link URL — goes to login page which redirects to verify route
      const domain = site.subdomain;
      let magicLink: string;
      if (process.env.NODE_ENV === "production") {
        const host = site.customDomain || `${domain}.servible.app`;
        magicLink = `https://${host}/portal/login?token=${token}`;
      } else {
        magicLink = `http://${domain}.localhost:3002/portal/login?token=${token}`;
      }

      try {
        await sendPortalMagicLink({
          to: client.email!,
          clientName: client.name,
          organizationName: client.organization.name,
          magicLink,
          locale: client.organization.locale,
        });
      } catch (emailError) {
        // Log but don't fail the request — preserves enumeration protection
        // and avoids exposing infrastructure issues to the user
        console.error("Email delivery failed:", emailError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending magic link:", error);
    return NextResponse.json(
      { error: "Failed to send magic link" },
      { status: 500 }
    );
  }
}
