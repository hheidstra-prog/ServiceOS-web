import { NextResponse } from "next/server";

export async function GET() {
  // AI credits balance - stub for now
  return NextResponse.json({
    credits: 1000,
    used: 0,
    limit: 1000,
  });
}
