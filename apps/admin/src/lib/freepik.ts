import crypto from "crypto";

const FREEPIK_BASE_URL = "https://api.freepik.com/v1";

function slugify(text: string, maxLength = 60): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, maxLength);
}

function getApiKey(): string {
  const key = process.env.FREEPIK_API_KEY;
  if (!key) throw new Error("FREEPIK_API_KEY environment variable not set");
  return key;
}

function headers(): Record<string, string> {
  return {
    "x-freepik-api-key": getApiKey(),
    Accept: "application/json",
  };
}

export interface FreepikImage {
  id: number;
  title: string;
  url: string;
  thumbnail: { url: string; width?: number; height?: number };
  author: { name: string };
  licenses: Array<{ type: string }>;
  orientation: string;
}

export interface FreepikSearchResult {
  images: FreepikImage[];
  meta: { currentPage: number; lastPage: number; total: number };
}

export async function searchFreepikImages({
  query,
  page = 1,
  limit = 20,
  filters,
}: {
  query: string;
  page?: number;
  limit?: number;
  filters?: {
    orientation?: "landscape" | "portrait" | "square";
    license?: "freemium" | "premium";
  };
}): Promise<FreepikSearchResult> {
  const params = new URLSearchParams({
    term: query,
    page: String(page),
    limit: String(limit),
    "filters[content_type][photo]": "1",
  });

  if (filters?.orientation) {
    params.set("filters[orientation][" + filters.orientation + "]", "1");
  }

  if (filters?.license) {
    params.set("filters[license][" + filters.license + "]", "1");
  }

  const res = await fetch(`${FREEPIK_BASE_URL}/resources?${params}`, {
    headers: headers(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Freepik API error ${res.status}: ${errorText}`);
  }

  const data = await res.json();

  const images: FreepikImage[] = (data.data || []).map(
    (item: Record<string, unknown>) => ({
      id: item.id,
      title: item.title || "",
      url: (item as Record<string, unknown>).url || "",
      thumbnail: {
        url:
          ((item.image as Record<string, unknown>)?.source as Record<string, unknown>)?.url ||
          "",
      },
      author: { name: (item.author as Record<string, unknown>)?.name || "" },
      licenses: Array.isArray(item.licenses)
        ? item.licenses
        : [{ type: "freemium" }],
      orientation: (item as Record<string, unknown>).orientation || "landscape",
    })
  );

  return {
    images,
    meta: {
      currentPage: data.meta?.current_page || page,
      lastPage: data.meta?.last_page || 1,
      total: data.meta?.total || images.length,
    },
  };
}

export async function getFreepikResource(
  resourceId: number
): Promise<Record<string, unknown>> {
  const res = await fetch(`${FREEPIK_BASE_URL}/resources/${resourceId}`, {
    headers: headers(),
  });

  if (!res.ok) {
    throw new Error(`Freepik resource error ${res.status}`);
  }

  return res.json();
}

export async function downloadFreepikImage(
  resourceId: number,
  size: "small" | "medium" | "large" | "original" = "medium"
): Promise<{ filename: string; url: string }> {
  const params = new URLSearchParams({ size });
  const res = await fetch(
    `${FREEPIK_BASE_URL}/resources/${resourceId}/download?${params}`,
    { headers: headers() }
  );

  if (!res.ok) {
    throw new Error(`Freepik download error ${res.status}`);
  }

  const data = await res.json();
  return {
    filename: data.data?.filename || `freepik-${resourceId}.jpg`,
    url: data.data?.url || "",
  };
}

export async function downloadAndStoreFreepikImage(
  resourceId: number,
  organizationId: string,
  title?: string
): Promise<{
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
}> {
  // Dynamic imports to avoid bundling server-only code in client
  const { uploadToCloudinary, getMediaType } = await import("@/lib/cloudinary");
  const { db } = await import("@/lib/db");

  // Download from Freepik
  const downloadData = await downloadFreepikImage(resourceId, "small");

  if (!downloadData.url) {
    throw new Error("No download URL returned from Freepik");
  }

  // Build SEO-friendly filename from title
  const suffix = crypto.randomBytes(2).toString("hex"); // 4-char unique suffix
  const ext = downloadData.filename?.split(".").pop() || "jpg";
  const seoFilename = title
    ? `${slugify(title)}-${suffix}.${ext}`
    : `freepik-${resourceId}-${suffix}.${ext}`;
  const displayName = title || seoFilename;

  // Fetch the actual image
  const imageRes = await fetch(downloadData.url);
  if (!imageRes.ok) {
    throw new Error("Failed to download image from Freepik");
  }

  const arrayBuffer = await imageRes.arrayBuffer();
  let buffer = Buffer.from(arrayBuffer);

  // Compress if over Cloudinary's 10MB upload limit
  const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
  if (buffer.length > MAX_UPLOAD_BYTES) {
    const sharp = (await import("sharp")).default;
    buffer = await sharp(buffer)
      .resize({ width: 2048, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
  }

  // Upload to Cloudinary
  const cloudinaryResult = await uploadToCloudinary(buffer, {
    folder: `servible/${organizationId}/media/stock`,
    resourceType: "image",
  });

  // Create file record
  const mimeType = imageRes.headers.get("content-type") || "image/jpeg";

  const fileRecord = await db.file.create({
    data: {
      organizationId,
      name: displayName,
      fileName: seoFilename,
      url: cloudinaryResult.secureUrl,
      mimeType,
      size: cloudinaryResult.bytes,
      cloudinaryPublicId: cloudinaryResult.publicId,
      cloudinaryUrl: cloudinaryResult.secureUrl,
      storageProvider: "CLOUDINARY",
      mediaType: getMediaType(mimeType),
      folder: "stock",
      tags: ["stock", "freepik"],
    },
  });

  // Fire AI analysis asynchronously (non-blocking)
  import("@/lib/ai-file-analyzer")
    .then(({ analyzeFile }) =>
      analyzeFile({
        url: cloudinaryResult.secureUrl,
        mimeType,
        fileName: seoFilename,
      })
    )
    .then(async (analysis) => {
      await db.file.update({
        where: { id: fileRecord.id },
        data: {
          aiDescription: analysis.description,
          tags: [...new Set(["stock", "freepik", ...analysis.suggestedTags])],
          aiClassification: analysis.classification as unknown as import("@prisma/client").Prisma.InputJsonValue,
        },
      });
    })
    .catch((err) => {
      console.warn("AI analysis failed for Freepik image:", err);
    });

  return {
    id: fileRecord.id,
    name: fileRecord.name,
    url: fileRecord.url,
    mimeType: fileRecord.mimeType || "image/jpeg",
    size: fileRecord.size || 0,
  };
}
