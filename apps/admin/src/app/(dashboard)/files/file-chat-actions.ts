"use server";

import Anthropic from "@anthropic-ai/sdk";
import { db, MediaType, Prisma } from "@serviceos/database";
import { requireAuthWithOrg } from "@/lib/auth";
import { analyzeFile } from "@/lib/ai-file-analyzer";

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
  aiDescription: string | null;
}

export interface FileChatResult {
  content: string;
  actionsTaken?: string[];
  fileResults?: FileResultItem[];
}

const FILE_TOOLS: Anthropic.Tool[] = [
  {
    name: "search_files",
    description:
      "Search files by query text (matches name, description, tags). Optionally filter by media type.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search text to match against file names, descriptions, and tags",
        },
        mediaType: {
          type: "string",
          enum: ["IMAGE", "DOCUMENT", "VIDEO", "AUDIO", "OTHER"],
          description: "Optional media type filter",
        },
      },
      required: ["query"],
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
];

interface ToolResult {
  text: string;
  fileResults?: FileResultItem[];
}

async function executeFileTool(
  toolName: string,
  input: Record<string, unknown>,
  organizationId: string
): Promise<ToolResult> {
  switch (toolName) {
    case "search_files": {
      const query = input.query as string;
      const mediaType = input.mediaType as MediaType | undefined;

      const where: Prisma.FileWhereInput = {
        organizationId,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { fileName: { contains: query, mode: "insensitive" } },
          { aiDescription: { contains: query, mode: "insensitive" } },
          { tags: { hasSome: [query.toLowerCase()] } },
        ],
      };

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

  const systemPrompt = `You are an AI Archive Assistant helping manage a file library. The library currently has ${fileCount} files.

You can search, tag, organize, and analyze files using the available tools. Be concise and helpful.

When you use tools:
- After searching, summarize results clearly
- After tagging/moving files, confirm what was done
- When asked to find files, use search_files
- When asked about a file's content, use describe_file
- For bulk operations, use bulk_tag

Always respond conversationally and confirm actions taken.`;

  const apiMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const actionsTaken: string[] = [];
  let collectedFileResults: FileResultItem[] = [];
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
  };
}
