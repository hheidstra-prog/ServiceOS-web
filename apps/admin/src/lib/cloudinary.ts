import { v2 as cloudinary } from "cloudinary";
import { MediaType } from "@serviceos/database";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadResult {
  publicId: string;
  secureUrl: string;
  width?: number;
  height?: number;
  bytes: number;
  format: string;
  resourceType: string;
}

export async function uploadToCloudinary(
  buffer: Buffer,
  options: {
    folder?: string;
    resourceType?: "image" | "video" | "raw" | "auto";
    publicId?: string;
    transformation?: Record<string, unknown>;
  } = {}
): Promise<CloudinaryUploadResult> {
  const { folder, resourceType = "auto", publicId, transformation } = options;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        public_id: publicId,
        ...(transformation ? { transformation } : {}),
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        if (!result) {
          reject(new Error("No result from Cloudinary"));
          return;
        }
        resolve({
          publicId: result.public_id,
          secureUrl: result.secure_url,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
          format: result.format,
          resourceType: result.resource_type,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

export async function deleteFromCloudinary(
  publicId: string,
  resourceType: "image" | "video" | "raw" = "image"
): Promise<void> {
  await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
  });
}

export function getOptimizedUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string | number;
    format?: string;
  } = {}
): string {
  const { width, height, crop = "fill", quality = "auto", format = "auto" } = options;

  const transformations: Record<string, unknown>[] = [
    { quality, fetch_format: format },
  ];

  if (width || height) {
    transformations.unshift({ width, height, crop });
  }

  return cloudinary.url(publicId, {
    secure: true,
    transformation: transformations,
  });
}

export function getMediaType(mimeType: string | null): MediaType {
  if (!mimeType) return MediaType.OTHER;

  if (mimeType.startsWith("image/")) return MediaType.IMAGE;
  if (mimeType.startsWith("video/")) return MediaType.VIDEO;
  if (mimeType.startsWith("audio/")) return MediaType.AUDIO;
  if (
    mimeType.startsWith("application/pdf") ||
    mimeType.startsWith("application/msword") ||
    mimeType.startsWith("application/vnd.openxmlformats") ||
    mimeType.startsWith("text/")
  ) {
    return MediaType.DOCUMENT;
  }
  return MediaType.OTHER;
}

export function getCloudinaryResourceType(
  mimeType: string | null
): "image" | "video" | "raw" {
  if (!mimeType) return "raw";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "raw";
}

export { cloudinary };
