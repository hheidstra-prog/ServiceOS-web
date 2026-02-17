export interface TocEntry {
  id: string;
  text: string;
  level: number;
}

interface TextNode {
  type: "text";
  text: string;
}

interface HeadingNode {
  type: "heading";
  attrs: { level: number };
  content?: TextNode[];
}

interface DocNode {
  type: "doc";
  content: Array<{ type: string; attrs?: { level: number }; content?: TextNode[] }>;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function getPlainText(content?: TextNode[]): string {
  if (!content) return "";
  return content.map((node) => node.text).join("");
}

export function extractHeadings(content: Record<string, unknown>): TocEntry[] {
  const doc = content as unknown as DocNode;
  if (!doc?.content || !Array.isArray(doc.content)) return [];

  return doc.content
    .filter((node): node is HeadingNode => node.type === "heading" && (node.attrs?.level ?? 99) <= 3)
    .map((node) => {
      const text = getPlainText(node.content);
      return { id: slugify(text), text, level: node.attrs.level };
    });
}
