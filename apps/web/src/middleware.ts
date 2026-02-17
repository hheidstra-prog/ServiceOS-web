import { NextRequest, NextResponse } from "next/server";

// Domains that should not be treated as tenant subdomains
const RESERVED_SUBDOMAINS = ["www", "app", "admin", "api"];

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const url = request.nextUrl.clone();

  // ─── Preview mode: set cookie and redirect to clean URL ───
  const previewToken = url.searchParams.get("preview");
  if (previewToken) {
    url.searchParams.delete("preview");
    const response = NextResponse.redirect(url);
    response.cookies.set("__serviceos_preview", previewToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });
    return response;
  }

  // Get the subdomain
  // In production: acme.serviceos.app -> acme
  // In development: acme.localhost:3001 -> acme
  const parts = hostname.split(".");
  let subdomain: string | null = null;

  if (hostname.includes("localhost")) {
    // Development: acme.localhost:3001
    subdomain = parts.length > 1 ? parts[0] : null;
  } else if (hostname.includes("serviceos.app")) {
    // Production: acme.serviceos.app
    subdomain = parts.length > 2 ? parts[0] : null;
  } else {
    // Custom domain: check if it's mapped to a site
    // Will be handled by the route itself
    subdomain = null;
  }

  // Skip reserved subdomains
  if (subdomain && RESERVED_SUBDOMAINS.includes(subdomain)) {
    subdomain = null;
  }

  // If we have a subdomain, rewrite to the [domain] route
  if (subdomain) {
    url.pathname = `/sites/${subdomain}${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  // For custom domains, also rewrite (will look up domain in DB)
  if (!hostname.includes("localhost") && !hostname.includes("serviceos.app")) {
    url.pathname = `/_domains/${hostname}${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  // Match all paths except static files and api routes
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
