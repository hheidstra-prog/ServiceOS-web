import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const orgId = request.nextUrl.searchParams.get("org");

  if (orgId) {
    const cookieStore = await cookies();
    cookieStore.set("active_org", orgId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: "lax",
    });
  }

  redirect("/dashboard");
}
