"use server";

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/auth";
import {
  searchFreepikImages,
  downloadAndStoreFreepikImage,
} from "@/lib/freepik";

export async function GET(request: NextRequest) {
  try {
    const { user, organization } = await getCurrentUserAndOrg();
    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const orientation = searchParams.get("orientation") as
      | "landscape"
      | "portrait"
      | "square"
      | null;
    const license = searchParams.get("license") as
      | "freemium"
      | "premium"
      | null;

    if (!query) {
      return NextResponse.json(
        { error: "Search query required" },
        { status: 400 }
      );
    }

    const result = await searchFreepikImages({
      query,
      page,
      filters: {
        orientation: orientation || undefined,
        license: license || undefined,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Freepik search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, organization } = await getCurrentUserAndOrg();
    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const resourceId = body.resourceId;
    const title = body.title as string | undefined;

    if (!resourceId) {
      return NextResponse.json(
        { error: "Resource ID required" },
        { status: 400 }
      );
    }

    const file = await downloadAndStoreFreepikImage(
      resourceId,
      organization.id,
      title
    );

    return NextResponse.json({ success: true, file });
  } catch (error) {
    console.error("Freepik download error:", error);
    return NextResponse.json(
      { error: "Download failed" },
      { status: 500 }
    );
  }
}
