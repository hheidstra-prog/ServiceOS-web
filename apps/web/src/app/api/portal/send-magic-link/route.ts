import { NextRequest, NextResponse } from "next/server";
import { db } from "@serviceos/database";
import { randomBytes } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { email, organizationId } = await request.json();

    if (!email || !organizationId) {
      return NextResponse.json(
        { error: "Email and organization ID are required" },
        { status: 400 }
      );
    }

    // Find the client
    const client = await db.client.findFirst({
      where: {
        email: email.toLowerCase(),
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
      // Build the magic link URL
      const domain = site.customDomain || `${site.subdomain}.serviceos.app`;
      const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
      const magicLink = `${protocol}://${domain}/portal/login?token=${token}`;

      // TODO: Send email with magic link
      // For now, log it in development
      if (process.env.NODE_ENV === "development") {
        console.log("=== Magic Link ===");
        console.log(`Email: ${client.email}`);
        console.log(`Link: ${magicLink}`);
        console.log("==================");
      }

      // In production, you would send an email here
      // await sendEmail({
      //   to: client.email,
      //   subject: `Sign in to ${client.organization.name}`,
      //   html: `Click here to sign in: ${magicLink}`,
      // });
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
