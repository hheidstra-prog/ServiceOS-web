"use server";

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const MAX_TEXT_LENGTH = 100_000; // ~100K chars for Claude context

export interface FileAnalysisResult {
  description: string;
  suggestedTags: string[];
  classification: Record<string, unknown>;
}

/**
 * Determines if a file type supports content extraction.
 */
function isDocumentScannable(mimeType: string | null, fileName: string): boolean {
  if (!mimeType) return false;
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return (
    mimeType === "application/pdf" ||
    ext === "pdf" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword" ||
    ext === "docx" ||
    ext === "doc" ||
    mimeType === "text/plain" ||
    ext === "txt" ||
    mimeType === "text/csv" ||
    ext === "csv" ||
    mimeType === "text/markdown" ||
    ext === "md"
  );
}

export async function analyzeFile({
  url,
  mimeType,
  fileName,
  scanContent = false,
}: {
  url: string;
  mimeType: string | null;
  fileName: string;
  scanContent?: boolean;
}): Promise<FileAnalysisResult> {
  const isImage = mimeType?.startsWith("image/");

  if (isImage) {
    return analyzeImage(url, fileName);
  }

  // If scanContent is enabled and the file type supports it, extract + summarize
  if (scanContent && isDocumentScannable(mimeType, fileName)) {
    return analyzeDocument(url, mimeType, fileName);
  }

  return analyzeByMetadata(mimeType, fileName);
}

async function analyzeImage(
  url: string,
  fileName: string
): Promise<FileAnalysisResult> {
  try {
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "url", url },
            },
            {
              type: "text",
              text: `Analyze this image (filename: "${fileName}"). Respond with JSON only:
{
  "description": "2-3 sentence description of what the image shows",
  "suggestedTags": ["tag1", "tag2", ...],
  "classification": {
    "type": "photo|logo|screenshot|illustration|icon|chart|other",
    "hasText": true/false,
    "dominantColors": ["color1", "color2"]
  }
}`,
            },
          ],
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error("Image analysis failed:", error);
  }

  return {
    description: `Image file: ${fileName}`,
    suggestedTags: [],
    classification: { type: "other" },
  };
}

/**
 * Extract text from a document and send to Claude for summarization.
 */
async function analyzeDocument(
  url: string,
  mimeType: string | null,
  fileName: string
): Promise<FileAnalysisResult> {
  try {
    const text = await extractDocumentText(url, mimeType, fileName);

    if (!text || text.trim().length < 20) {
      // Too little text to analyze meaningfully
      return analyzeByMetadata(mimeType, fileName);
    }

    const truncated = text.slice(0, MAX_TEXT_LENGTH);

    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: `Summarize this document (filename: "${fileName}"). Respond with JSON only:
{
  "description": "3-5 sentence summary of the document's content and purpose",
  "suggestedTags": ["tag1", "tag2", ...],
  "classification": {
    "type": "contract|invoice|proposal|report|article|manual|spreadsheet|letter|resume|other",
    "topics": ["topic1", "topic2"],
    "language": "en|nl|de|..."
  }
}

Document content:
---
${truncated}
---`,
        },
      ],
    });

    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error("Document analysis failed:", error);
  }

  // Fall back to metadata-only analysis
  return analyzeByMetadata(mimeType, fileName);
}

/**
 * Download a file and extract its text content.
 */
async function extractDocumentText(
  url: string,
  mimeType: string | null,
  fileName: string
): Promise<string> {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download file: ${response.status}`);

  // Plain text / CSV / Markdown — read directly
  if (
    mimeType === "text/plain" ||
    mimeType === "text/csv" ||
    mimeType === "text/markdown" ||
    ["txt", "csv", "md"].includes(ext)
  ) {
    return await response.text();
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  // PDF
  if (mimeType === "application/pdf" || ext === "pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    await parser.destroy();
    return result.text;
  }

  // DOCX
  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  return "";
}

function analyzeByMetadata(
  mimeType: string | null,
  fileName: string
): FileAnalysisResult {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const tags: string[] = [];
  let type = "file";

  if (mimeType?.includes("pdf") || ext === "pdf") {
    type = "document";
    tags.push("pdf", "document");
  } else if (
    mimeType?.includes("spreadsheet") ||
    ["xlsx", "xls", "csv"].includes(ext)
  ) {
    type = "spreadsheet";
    tags.push("spreadsheet", "data");
  } else if (
    mimeType?.includes("presentation") ||
    ["pptx", "ppt"].includes(ext)
  ) {
    type = "presentation";
    tags.push("presentation", "slides");
  } else if (
    mimeType?.includes("word") ||
    mimeType?.includes("document") ||
    ["docx", "doc"].includes(ext)
  ) {
    type = "document";
    tags.push("document", "text");
  } else if (mimeType?.startsWith("video/")) {
    type = "video";
    tags.push("video");
  } else if (mimeType?.startsWith("audio/")) {
    type = "audio";
    tags.push("audio");
  }

  // Infer from filename patterns
  const lowerName = fileName.toLowerCase();
  if (lowerName.includes("contract")) tags.push("contract");
  if (lowerName.includes("invoice")) tags.push("invoice");
  if (lowerName.includes("proposal")) tags.push("proposal");
  if (lowerName.includes("logo")) tags.push("logo", "brand");
  if (lowerName.includes("report")) tags.push("report");

  return {
    description: `${type.charAt(0).toUpperCase() + type.slice(1)}: ${fileName}`,
    suggestedTags: [...new Set(tags)],
    classification: { type },
  };
}
