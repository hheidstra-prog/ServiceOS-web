"use server";

import Anthropic from "@anthropic-ai/sdk";
import { db, MediaType, Prisma } from "@serviceos/database";
import { requireAuthWithOrg } from "@/lib/auth";
import { analyzeFile } from "@/lib/ai-file-analyzer";
import {
  searchFreepikImages,
  downloadAndStoreFreepikImage,
  type FreepikImage,
} from "@/lib/freepik";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface FileResultItem {
  id: string;
  name: string;
  url: string;
  cloudinaryUrl: string | null;
  mimeType: string | null;
  tags: string[];
  folder: string | null;
  aiDescription: string | null;
}

export interface StockImageResult {
  id: number;
  title: string;
  url: string;
  thumbnail: { url: string };
  author: { name: string };
  isPremium: boolean;
}

export interface FolderResultItem {
  name: string;
  fileCount: number;
}

export interface FileChatResult {
  content: string;
  actionsTaken?: string[];
  fileResults?: FileResultItem[];
  stockResults?: StockImageResult[];
  folderResults?: FolderResultItem[];
  stockSearchOffer?: { query: string };
}

const FILE_TOOLS: Anthropic.Tool[] = [
  {
    name: "search_files",
    description:
      "Search files by query text (matches name, description, tags). Optionally filter by media type or folder. To list all files in a folder, provide only the folder parameter.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search text to match against file names, descriptions, and tags. Optional when folder is provided.",
        },
        mediaType: {
          type: "string",
          enum: ["IMAGE", "DOCUMENT", "VIDEO", "AUDIO", "OTHER"],
          description: "Optional media type filter",
        },
        folder: {
          type: "string",
          description: "Optional folder name to filter by. Use this to list files in a specific folder.",
        },
      },
      required: [],
    },
  },
  {
    name: "tag_file",
    description: "Add or replace tags on a single file by ID.",
    input_schema: {
      type: "object" as const,
      properties: {
        fileId: { type: "string", description: "The file ID" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags to set on the file",
        },
        mode: {
          type: "string",
          enum: ["add", "replace"],
          description: "Whether to add to existing tags or replace them",
        },
      },
      required: ["fileId", "tags"],
    },
  },
  {
    name: "move_file",
    description: "Move a file to a folder.",
    input_schema: {
      type: "object" as const,
      properties: {
        fileId: { type: "string", description: "The file ID" },
        folder: { type: "string", description: "Target folder name" },
      },
      required: ["fileId", "folder"],
    },
  },
  {
    name: "describe_file",
    description:
      "Analyze a file using AI vision (for images) or metadata analysis. Updates the file's AI description.",
    input_schema: {
      type: "object" as const,
      properties: {
        fileId: { type: "string", description: "The file ID to analyze" },
      },
      required: ["fileId"],
    },
  },
  {
    name: "list_folders",
    description: "List all folders in the archive.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "bulk_tag",
    description:
      "Tag multiple files matching a search query with the given tags.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query to match files" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags to add to all matched files",
        },
      },
      required: ["query", "tags"],
    },
  },
  {
    name: "offer_stock_search",
    description:
      "Offer the user a stock image search. Use this when search_files returned no or poor results. Does NOT search — signals the UI to show a stock search button. Never call search_stock_images directly unless the user explicitly triggered it.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description:
            "Suggested stock search query based on the user's request",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "search_stock_images",
    description:
      "Search Freepik stock images. Only call when user explicitly triggered stock search (e.g. 'search stock for X' or clicked the stock search button).",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query for stock images",
        },
        license: {
          type: "string",
          enum: ["freemium", "premium"],
          description:
            "Optional license filter. 'freemium' for free assets only, 'premium' for premium only. Omit to include both.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "import_stock_image",
    description:
      "Import a stock image into the user's archive by its Freepik resource ID.",
    input_schema: {
      type: "object" as const,
      properties: {
        resourceId: {
          type: "number",
          description: "The Freepik resource ID to import",
        },
      },
      required: ["resourceId"],
    },
  },
];

interface ToolResult {
  text: string;
  fileResults?: FileResultItem[];
  stockResults?: StockImageResult[];
  folderResults?: FolderResultItem[];
  stockSearchOffer?: { query: string };
}

async function executeFileTool(
  toolName: string,
  input: Record<string, unknown>,
  organizationId: string
): Promise<ToolResult> {
  switch (toolName) {
    case "search_files": {
      const query = input.query as string | undefined;
      const mediaType = input.mediaType as MediaType | undefined;
      const folder = input.folder as string | undefined;

      const where: Prisma.FileWhereInput = {
        organizationId,
      };

      if (query) {
        where.OR = [
          { name: { contains: query, mode: "insensitive" } },
          { fileName: { contains: query, mode: "insensitive" } },
          { aiDescription: { contains: query, mode: "insensitive" } },
          { tags: { hasSome: [query.toLowerCase()] } },
        ];
      }

      if (folder) where.folder = { equals: folder, mode: "insensitive" };
      if (mediaType) where.mediaType = mediaType;

      const files = await db.file.findMany({
        where,
        take: 20,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          mimeType: true,
          mediaType: true,
          tags: true,
          folder: true,
          aiDescription: true,
          url: true,
          cloudinaryUrl: true,
          size: true,
        },
      });

      const fileResults: FileResultItem[] = files.map((f) => ({
        id: f.id,
        name: f.name,
        url: f.url,
        cloudinaryUrl: f.cloudinaryUrl,
        mimeType: f.mimeType,
        tags: f.tags,
        folder: f.folder,
        aiDescription: f.aiDescription,
      }));

      return {
        text: JSON.stringify({
          count: files.length,
          files: files.map((f) => ({
            id: f.id,
            name: f.name,
            type: f.mediaType,
            tags: f.tags,
            folder: f.folder,
            description: f.aiDescription,
          })),
        }),
        fileResults,
      };
    }

    case "tag_file": {
      const fileId = input.fileId as string;
      const tags = input.tags as string[];
      const mode = (input.mode as string) || "add";

      const file = await db.file.findFirst({
        where: { id: fileId, organizationId },
      });

      if (!file) return { text: JSON.stringify({ error: "File not found" }) };

      const newTags =
        mode === "replace"
          ? tags
          : [...new Set([...file.tags, ...tags])];

      await db.file.update({
        where: { id: fileId },
        data: { tags: newTags },
      });

      return {
        text: JSON.stringify({
          success: true,
          fileName: file.name,
          tags: newTags,
        }),
      };
    }

    case "move_file": {
      const fileId = input.fileId as string;
      const folder = input.folder as string;

      const file = await db.file.findFirst({
        where: { id: fileId, organizationId },
      });

      if (!file) return { text: JSON.stringify({ error: "File not found" }) };

      await db.file.update({
        where: { id: fileId },
        data: { folder },
      });

      return {
        text: JSON.stringify({
          success: true,
          fileName: file.name,
          folder,
        }),
      };
    }

    case "describe_file": {
      const fileId = input.fileId as string;

      const file = await db.file.findFirst({
        where: { id: fileId, organizationId },
      });

      if (!file) return { text: JSON.stringify({ error: "File not found" }) };

      const analysis = await analyzeFile({
        url: file.cloudinaryUrl || file.url,
        mimeType: file.mimeType,
        fileName: file.fileName,
      });

      await db.file.update({
        where: { id: fileId },
        data: {
          aiDescription: analysis.description,
          tags: [...new Set([...file.tags, ...analysis.suggestedTags])],
          aiClassification: analysis.classification as unknown as import("@prisma/client").Prisma.InputJsonValue,
        },
      });

      return {
        text: JSON.stringify({
          success: true,
          fileName: file.name,
          description: analysis.description,
          suggestedTags: analysis.suggestedTags,
        }),
      };
    }

    case "list_folders": {
      const folderGroups = await db.file.groupBy({
        by: ["folder"],
        where: {
          organizationId,
          folder: { not: null },
        },
        _count: { id: true },
      });

      const folderResults: FolderResultItem[] = folderGroups
        .filter((g) => g.folder !== null)
        .map((g) => ({
          name: g.folder as string,
          fileCount: g._count.id,
        }));

      return {
        text: JSON.stringify({
          count: folderResults.length,
          folders: folderResults.map((f) => ({
            name: f.name,
            fileCount: f.fileCount,
          })),
        }),
        folderResults,
      };
    }

    case "bulk_tag": {
      const query = input.query as string;
      const tags = input.tags as string[];

      const files = await db.file.findMany({
        where: {
          organizationId,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { fileName: { contains: query, mode: "insensitive" } },
            { aiDescription: { contains: query, mode: "insensitive" } },
            { tags: { hasSome: [query.toLowerCase()] } },
          ],
        },
        select: { id: true, name: true, tags: true },
      });

      let updated = 0;
      for (const file of files) {
        const newTags = [...new Set([...file.tags, ...tags])];
        await db.file.update({
          where: { id: file.id },
          data: { tags: newTags },
        });
        updated++;
      }

      return {
        text: JSON.stringify({
          success: true,
          matchedFiles: files.length,
          updatedFiles: updated,
          tags,
        }),
      };
    }

    case "offer_stock_search": {
      const query = input.query as string;
      return {
        text: JSON.stringify({
          offered: true,
          message: "Stock search offered. Wait for user response.",
        }),
        stockSearchOffer: { query },
      };
    }

    case "search_stock_images": {
      const query = input.query as string;
      const license = input.license as "freemium" | "premium" | undefined;

      const result = await searchFreepikImages({
        query,
        limit: 12,
        filters: license ? { license } : undefined,
      });

      const stockResults: StockImageResult[] = result.images.map(
        (img: FreepikImage) => ({
          id: img.id,
          title: img.title,
          url: img.url,
          thumbnail: { url: img.thumbnail.url },
          author: { name: img.author.name },
          isPremium: img.licenses.some((l) => l.type === "premium"),
        })
      );

      return {
        text: JSON.stringify({
          count: stockResults.length,
          images: stockResults.map((img) => ({
            id: img.id,
            title: img.title,
            author: img.author.name,
          })),
        }),
        stockResults,
      };
    }

    case "import_stock_image": {
      const resourceId = input.resourceId as number;

      const file = await downloadAndStoreFreepikImage(
        resourceId,
        organizationId
      );

      const fileResult: FileResultItem = {
        id: file.id,
        name: file.name,
        url: file.url,
        cloudinaryUrl: file.url,
        mimeType: file.mimeType,
        tags: ["stock", "freepik"],
        folder: null,
        aiDescription: null,
      };

      return {
        text: JSON.stringify({
          success: true,
          fileName: file.name,
          fileId: file.id,
        }),
        fileResults: [fileResult],
      };
    }

    default:
      return { text: JSON.stringify({ error: `Unknown tool: ${toolName}` }) };
  }
}

export async function chatFileAssistant(
  messages: ChatMessage[]
): Promise<FileChatResult> {
  const { organization } = await requireAuthWithOrg();

  // Get file count for context
  const fileCount = await db.file.count({
    where: { organizationId: organization.id },
  });

  const systemPrompt = `You are an AI Archive Assistant helping manage a file library with ${fileCount} files.

RULES — follow strictly:
1. ARCHIVE FIRST — always call search_files before anything else when the user asks for an image or file.
2. NEVER auto-search stock — if search_files returns no or poor results, call offer_stock_search to let the user decide. Do NOT call search_stock_images on your own.
3. EXPLICIT stock requests — if the user says "search stock for X" or "search free stock for X", call search_stock_images directly with license: "freemium". If they say "search free and premium stock for X", call search_stock_images without a license filter.
4. LICENSE DEFAULTS — "free" → license: "freemium". "free and premium" or no qualifier → omit license filter.
5. CONCISE RESPONSES — the UI renders cards for file/stock results. Do NOT list IDs, URLs, or thumbnails. Reply in 1-2 sentences max.
6. CONFIRM ACTIONS — briefly confirm tag/move/describe/import actions (e.g. "Tagged 3 files with 'landscape'.").
7. AUTO-TAG ON UPLOAD — when a user uploads a file, analyze it with describe_file and confirm the auto-generated tags.

Tools: search_files, offer_stock_search, search_stock_images, import_stock_image, tag_file, move_file, list_folders, describe_file, bulk_tag.`;

  const apiMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const actionsTaken: string[] = [];
  let collectedFileResults: FileResultItem[] = [];
  let collectedStockResults: StockImageResult[] = [];
  let collectedFolderResults: FolderResultItem[] = [];
  let collectedStockSearchOffer: { query: string } | undefined;
  let iterations = 0;
  const maxIterations = 5;

  let response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    tools: FILE_TOOLS,
    messages: apiMessages,
  });

  while (response.stop_reason === "tool_use" && iterations < maxIterations) {
    iterations++;

    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ContentBlock & { type: "tool_use" } =>
        b.type === "tool_use"
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of toolUseBlocks) {
      const result = await executeFileTool(
        block.name,
        block.input as Record<string, unknown>,
        organization.id
      );
      actionsTaken.push(`${block.name}: ${result.text}`);
      if (result.fileResults) {
        collectedFileResults = result.fileResults;
      }
      if (result.stockResults) {
        collectedStockResults = result.stockResults;
      }
      if (result.folderResults) {
        collectedFolderResults = result.folderResults;
      }
      if (result.stockSearchOffer) {
        collectedStockSearchOffer = result.stockSearchOffer;
      }
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: result.text,
      });
    }

    response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      tools: FILE_TOOLS,
      messages: [
        ...apiMessages,
        { role: "assistant", content: response.content },
        { role: "user", content: toolResults },
      ],
    });
  }

  const textContent = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  return {
    content: textContent,
    actionsTaken: actionsTaken.length > 0 ? actionsTaken : undefined,
    fileResults: collectedFileResults.length > 0 ? collectedFileResults : undefined,
    stockResults: collectedStockResults.length > 0 ? collectedStockResults : undefined,
    folderResults: collectedFolderResults.length > 0 ? collectedFolderResults : undefined,
    stockSearchOffer: collectedStockSearchOffer,
  };
}
