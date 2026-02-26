import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@servible/database";

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get("host") || "localhost:3001";
  const protocol = request.headers.get("x-forwarded-proto") || "http";
  return `${protocol}://${host}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const domain = searchParams.get("domain");
  const baseUrl = getBaseUrl(request);

  if (!token || !domain) {
    return NextResponse.redirect(
      new URL("/portal/login?error=invalid_token", baseUrl)
    );
  }

  // Find the site
  const site = await db.site.findFirst({
    where: {
      OR: [{ subdomain: domain }, { customDomain: domain }],
      status: "PUBLISHED",
      portalEnabled: true,
    },
    select: {
      organizationId: true,
    },
  });

  if (!site) {
    return NextResponse.redirect(
      new URL("/portal/login?error=invalid_token", baseUrl)
    );
  }

  // Verify the token
  const session = await db.portalSession.findFirst({
    where: {
      token,
      expiresAt: { gt: new Date() },
      client: {
        organizationId: site.organizationId,
      },
    },
  });

  if (!session) {
    return NextResponse.redirect(
      new URL("/portal/login?error=invalid_token", baseUrl)
    );
  }

  // Set the cookie in a Route Handler (allowed by Next.js)
  const cookieStore = await cookies();
  cookieStore.set("portal_token", session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: session.expiresAt,
    path: "/",
  });

  return NextResponse.redirect(new URL("/portal", baseUrl));
}
