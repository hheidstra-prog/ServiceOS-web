import { NextResponse } from "next/server";

export async function GET() {
  // Inbox unread count - stub for now
  return NextResponse.json({
    count: 0,
  });
}
