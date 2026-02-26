import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@servible/database";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("portal_token")?.value;

    if (token) {
      // Delete the session from database
      await db.portalSession.deleteMany({
        where: { token },
      });

      // Clear the cookie
      cookieStore.delete("portal_token");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error logging out:", error);
    return NextResponse.json({ success: true });
  }
}
