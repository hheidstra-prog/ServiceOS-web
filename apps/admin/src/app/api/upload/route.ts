"use server";

import { put, del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserAndOrg } from "@/lib/auth";
import { getMediaType } from "@/lib/cloudinary";

export async function POST(request: NextRequest) {
  try {
    const { user, organization } = await getCurrentUserAndOrg();
    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const projectId = formData.get("projectId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: "Project ID required" }, { status: 400 });
    }

    // Verify project belongs to organization
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        organizationId: organization.id,
      },
      select: { id: true, clientId: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Upload to Vercel Blob (in Servible subfolder for shared blob)
    const blob = await put(`Servible/${organization.id}/${projectId}/${file.name}`, file, {
      access: "public",
      addRandomSuffix: true, // Prevents overwriting
    });

    // Save file record to database
    const fileRecord = await db.file.create({
      data: {
        organizationId: organization.id,
        clientId: project.clientId,
        projectId,
        uploadedById: user.id,
        name: file.name,
        fileName: file.name,
        url: blob.url,
        mimeType: file.type || null,
        size: file.size,
        storageProvider: "VERCEL_BLOB",
        mediaType: getMediaType(file.type || null),
      },
    });

    return NextResponse.json({
      success: true,
      file: {
        id: fileRecord.id,
        name: fileRecord.name,
        url: fileRecord.url,
        mimeType: fileRecord.mimeType,
        size: fileRecord.size,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, organization } = await getCurrentUserAndOrg();
    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json({ error: "File ID required" }, { status: 400 });
    }

    // Get file and verify ownership through organization
    const file = await db.file.findFirst({
      where: {
        id: fileId,
        organizationId: organization.id,
      },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Delete from Vercel Blob
    try {
      await del(file.url);
    } catch (e) {
      // Continue even if blob deletion fails (file might not exist)
      console.warn("Blob deletion failed:", e);
    }

    // Delete from database
    await db.file.delete({
      where: { id: fileId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Delete failed" },
      { status: 500 }
    );
  }
}
