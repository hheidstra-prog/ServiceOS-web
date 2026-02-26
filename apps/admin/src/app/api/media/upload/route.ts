"use server";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserAndOrg } from "@/lib/auth";
import {
  uploadToCloudinary,
  getMediaType,
  getCloudinaryResourceType,
} from "@/lib/cloudinary";
import { analyzeFile } from "@/lib/ai-file-analyzer";
import type { Prisma } from "@servible/database";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  try {
    const { user, organization } = await getCurrentUserAndOrg();
    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folder = formData.get("folder") as string | null;
    const clientId = formData.get("clientId") as string | null;
    const projectId = formData.get("projectId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 50MB limit" },
        { status: 400 }
      );
    }

    // Build Cloudinary folder path
    const cloudinaryFolder = [
      "servible",
      organization.id,
      "media",
      folder,
    ]
      .filter(Boolean)
      .join("/");

    const buffer = Buffer.from(await file.arrayBuffer());
    const resourceType = getCloudinaryResourceType(file.type);
    const mediaType = getMediaType(file.type);

    const result = await uploadToCloudinary(buffer, {
      folder: cloudinaryFolder,
      resourceType,
    });

    const fileRecord = await db.file.create({
      data: {
        organizationId: organization.id,
        clientId: clientId || undefined,
        projectId: projectId || undefined,
        uploadedById: user.id,
        name: file.name,
        fileName: file.name,
        url: result.secureUrl,
        mimeType: file.type || null,
        size: result.bytes,
        cloudinaryPublicId: result.publicId,
        cloudinaryUrl: result.secureUrl,
        storageProvider: "CLOUDINARY",
        mediaType,
        folder: folder || undefined,
        aiStatus: "ANALYZING",
      },
    });

    // Fire AI analysis asynchronously (non-blocking)
    analyzeFile({
      url: result.secureUrl,
      mimeType: file.type || null,
      fileName: file.name,
      scanContent: true,
    })
      .then(async (analysis) => {
        await db.file.update({
          where: { id: fileRecord.id },
          data: {
            aiDescription: analysis.description,
            tags: analysis.suggestedTags,
            aiClassification: analysis.classification as unknown as Prisma.InputJsonValue,
            aiStatus: "COMPLETE",
          },
        });
      })
      .catch(async (err) => {
        console.warn("AI file analysis failed:", err);
        await db.file.update({
          where: { id: fileRecord.id },
          data: { aiStatus: "FAILED" },
        }).catch(() => {});
      });

    return NextResponse.json({
      success: true,
      file: {
        id: fileRecord.id,
        name: fileRecord.name,
        url: fileRecord.url,
        mimeType: fileRecord.mimeType,
        size: fileRecord.size,
        cloudinaryPublicId: fileRecord.cloudinaryPublicId,
        cloudinaryUrl: fileRecord.cloudinaryUrl,
        mediaType: fileRecord.mediaType,
        aiStatus: fileRecord.aiStatus,
      },
    });
  } catch (error) {
    console.error("Media upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
