"use server";

import { revalidatePath } from "next/cache";
import { db, MediaType, Prisma } from "@serviceos/database";
import { requireAuthWithOrg } from "@/lib/auth";
import { deleteFromCloudinary, getCloudinaryResourceType } from "@/lib/cloudinary";
import { del } from "@vercel/blob";
import Anthropic from "@anthropic-ai/sdk";

const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "need", "must",
  "of", "in", "to", "for", "with", "on", "at", "from", "by", "about",
  "as", "into", "through", "during", "before", "after", "between",
  "and", "but", "or", "nor", "not", "so", "yet", "both", "either",
  "that", "this", "these", "those", "it", "its",
  "i", "me", "my", "we", "our", "you", "your", "he", "she", "they", "them",
  "what", "which", "who", "whom", "how", "where", "when", "why",
  "all", "each", "every", "any", "some", "no", "just", "only", "very",
  "find", "show", "get", "give", "image", "images", "file", "files",
  "photo", "photos", "picture", "pictures", "document", "documents",
]);

export async function getFiles(filters?: {
  search?: string;
  mediaType?: MediaType;
  folder?: string;
  tags?: string[];
  clientId?: string;
  projectId?: string;
  page?: number;
  limit?: number;
}) {
  const { organization } = await requireAuthWithOrg();
  const page = filters?.page || 1;
  const limit = filters?.limit || 50;

  const where: Prisma.FileWhereInput = {
    organizationId: organization.id,
  };

  // searchWords is used later for fallback OR query
  let searchWords: string[] = [];

  if (filters?.search) {
    searchWords = filters.search.trim().split(/\s+/)
      .filter(Boolean)
      .filter((w) => !STOP_WORDS.has(w.toLowerCase()));

    if (searchWords.length > 0) {
      // Every meaningful word must match at least one field
      where.AND = searchWords.map((word) => ({
        OR: [
          { name: { contains: word, mode: "insensitive" as const } },
          { fileName: { contains: word, mode: "insensitive" as const } },
          { aiDescription: { contains: word, mode: "insensitive" as const } },
          { tags: { has: word.toLowerCase() } },
        ],
      }));
    }
  }

  if (filters?.mediaType) {
    where.mediaType = filters.mediaType;
  }

  if (filters?.folder) {
    where.folder = filters.folder;
  }

  if (filters?.tags && filters.tags.length > 0) {
    where.tags = { hasSome: filters.tags };
  }

  if (filters?.clientId) {
    where.clientId = filters.clientId;
  }

  if (filters?.projectId) {
    where.projectId = filters.projectId;
  }

  let [files, total] = await Promise.all([
    db.file.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    db.file.count({ where }),
  ]);

  // Fallback: if strict AND returned nothing, try OR (any word matches)
  if (total === 0 && searchWords.length > 1) {
    const orWhere: Prisma.FileWhereInput = { ...where };
    delete orWhere.AND;
    orWhere.OR = searchWords.flatMap((word) => [
      { name: { contains: word, mode: "insensitive" as const }, organizationId: organization.id },
      { aiDescription: { contains: word, mode: "insensitive" as const }, organizationId: organization.id },
      { tags: { has: word.toLowerCase() }, organizationId: organization.id },
    ]);

    [files, total] = await Promise.all([
      db.file.findMany({
        where: orWhere,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          client: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
          uploadedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      db.file.count({ where: orWhere }),
    ]);
  }

  return {
    files,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getFile(fileId: string) {
  const { organization } = await requireAuthWithOrg();

  return db.file.findFirst({
    where: {
      id: fileId,
      organizationId: organization.id,
    },
    include: {
      client: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      uploadedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}

export async function deleteFile(fileId: string) {
  const { organization } = await requireAuthWithOrg();

  const file = await db.file.findFirst({
    where: { id: fileId, organizationId: organization.id },
  });

  if (!file) throw new Error("File not found");

  // Delete from storage
  if (file.storageProvider === "CLOUDINARY" && file.cloudinaryPublicId) {
    try {
      const resourceType = getCloudinaryResourceType(file.mimeType);
      await deleteFromCloudinary(file.cloudinaryPublicId, resourceType);
    } catch (e) {
      console.warn("Cloudinary deletion failed:", e);
    }
  } else if (file.storageProvider === "VERCEL_BLOB") {
    try {
      await del(file.url);
    } catch (e) {
      console.warn("Blob deletion failed:", e);
    }
  }

  await db.file.delete({ where: { id: fileId } });

  revalidatePath("/files");
}

export async function updateFile(
  fileId: string,
  data: {
    name?: string;
    tags?: string[];
    folder?: string;
    clientId?: string | null;
    projectId?: string | null;
  }
) {
  const { organization } = await requireAuthWithOrg();

  const file = await db.file.update({
    where: {
      id: fileId,
      organizationId: organization.id,
    },
    data: {
      name: data.name,
      tags: data.tags,
      folder: data.folder,
      clientId: data.clientId,
      projectId: data.projectId,
    },
  });

  revalidatePath("/files");
  return file;
}

export async function getFolders() {
  const { organization } = await requireAuthWithOrg();

  const files = await db.file.findMany({
    where: {
      organizationId: organization.id,
      folder: { not: null },
    },
    select: { folder: true },
    distinct: ["folder"],
  });

  return files.map((f) => f.folder).filter(Boolean) as string[];
}

export async function getAllTags() {
  const { organization } = await requireAuthWithOrg();

  const files = await db.file.findMany({
    where: {
      organizationId: organization.id,
      tags: { isEmpty: false },
    },
    select: { tags: true },
  });

  const tagSet = new Set<string>();
  files.forEach((f) => f.tags.forEach((t) => tagSet.add(t)));
  return Array.from(tagSet).sort();
}

/**
 * Returns IDs of files currently being analyzed by AI.
 * Used for client-side polling to know when to refresh.
 */
export async function getAnalyzingFileIds(): Promise<string[]> {
  const { organization } = await requireAuthWithOrg();

  const files = await db.file.findMany({
    where: {
      organizationId: organization.id,
      aiStatus: "ANALYZING",
    },
    select: { id: true },
  });

  return files.map((f) => f.id);
}

/**
 * AI-powered semantic search. Uses Claude to split the query into required
 * concepts (must ALL match) and synonym expansions (broaden each concept).
 * e.g. "older man holding tablet" →
 *   required groups: [["older","elderly","senior"], ["man","male","gentleman"], ["holding","using","carrying"], ["tablet","device","ipad"]]
 *   → AND across groups (each group is OR)
 */
export async function smartSearch(query: string, limit = 40) {
  const { organization } = await requireAuthWithOrg();

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `You are a search query expander for a file/image library. File descriptions are written by AI and use formal, descriptive language.

Given the user's search query, identify the core concepts and expand each with synonyms. Return a JSON array of arrays — each inner array is one concept with its synonyms.

Rules:
- Each concept group = one core idea from the query + 2-4 synonyms an AI description might use
- ALL concept groups must match (AND logic) — this ensures precise results
- Skip filler words (a, an, the, of, image, photo, picture, file, find, show)
- Include variations: "holding" → ["holding", "using", "carrying", "gripping"]
- Include formal AI-description language: "older" → ["older", "elderly", "senior", "mature", "middle-aged"]

Example: "older man holding a tablet"
→ [["older","elderly","senior","mature","middle-aged"],["man","male","gentleman","businessman"],["holding","using","carrying","gripping"],["tablet","device","ipad"]]

Query: "${query}"

Respond with ONLY the JSON array of arrays, nothing else.`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "[]";
  let conceptGroups: string[][];
  try {
    conceptGroups = JSON.parse(text);
    if (!Array.isArray(conceptGroups) || !Array.isArray(conceptGroups[0])) {
      throw new Error("Invalid format");
    }
  } catch {
    // Fallback: each word is its own group
    conceptGroups = query.trim().split(/\s+/)
      .filter(Boolean)
      .filter((w) => !STOP_WORDS.has(w.toLowerCase()))
      .map((w) => [w]);
  }

  if (conceptGroups.length === 0) return { files: [], total: 0, keywords: [] };

  const allKeywords = conceptGroups.flat();

  // AND across concept groups, OR within each group
  const where: Prisma.FileWhereInput = {
    organizationId: organization.id,
    AND: conceptGroups.map((synonyms) => ({
      OR: synonyms.flatMap((word) => [
        { name: { contains: word, mode: "insensitive" as const } },
        { aiDescription: { contains: word, mode: "insensitive" as const } },
        { tags: { has: word.toLowerCase() } },
      ]),
    })),
  };

  let [files, total] = await Promise.all([
    db.file.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    db.file.count({ where }),
  ]);

  // Fallback: if strict AND returned nothing, drop one group at a time
  if (total === 0 && conceptGroups.length > 2) {
    // Try without last group (least important concept)
    const relaxedWhere: Prisma.FileWhereInput = {
      organizationId: organization.id,
      AND: conceptGroups.slice(0, -1).map((synonyms) => ({
        OR: synonyms.flatMap((word) => [
          { name: { contains: word, mode: "insensitive" as const } },
          { aiDescription: { contains: word, mode: "insensitive" as const } },
          { tags: { has: word.toLowerCase() } },
        ]),
      })),
    };

    [files, total] = await Promise.all([
      db.file.findMany({
        where: relaxedWhere,
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
          client: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
          uploadedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      db.file.count({ where: relaxedWhere }),
    ]);
  }

  return { files, total, keywords: allKeywords };
}

export async function getFileCount(): Promise<number> {
  const { organization } = await requireAuthWithOrg();
  return db.file.count({
    where: { organizationId: organization.id },
  });
}
