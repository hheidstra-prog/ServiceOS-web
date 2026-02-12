import { NextResponse } from "next/server";

export async function PATCH() {
  // Composio integration status - stub for now
  return NextResponse.json({
    connected: false,
    status: "disconnected",
  });
}

export async function GET() {
  return NextResponse.json({
    connected: false,
    status: "disconnected",
  });
}
