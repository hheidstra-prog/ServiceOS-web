"use client";

import Image from "next/image";
import { slugify } from "./blog-utils";

interface TextNode {
  type: "text";
  text: string;
  marks?: Array<{
    type: "bold" | "italic" | "underline" | "strike" | "code" | "link";
    attrs?: { href?: string; target?: string };
  }>;
}

interface ParagraphNode {
  type: "paragraph";
  content?: TextNode[];
}

interface HeadingNode {
  type: "heading";
  attrs: { level: 1 | 2 | 3 | 4 | 5 | 6 };
  content?: TextNode[];
}

interface BulletListNode {
  type: "bulletList";
  content: ListItemNode[];
}

interface OrderedListNode {
  type: "orderedList";
  content: ListItemNode[];
}

interface ListItemNode {
  type: "listItem";
  content: ParagraphNode[];
}

interface BlockquoteNode {
  type: "blockquote";
  content: ParagraphNode[];
}

interface CodeBlockNode {
  type: "codeBlock";
  attrs?: { language?: string };
  content?: TextNode[];
}

interface ImageNode {
  type: "image";
  attrs: {
    src: string;
    alt?: string;
    title?: string;
  };
}

interface HorizontalRuleNode {
  type: "horizontalRule";
}

type ContentNode =
  | ParagraphNode
  | HeadingNode
  | BulletListNode
  | OrderedListNode
  | BlockquoteNode
  | CodeBlockNode
  | ImageNode
  | HorizontalRuleNode;

interface BlogContentData {
  type: "doc";
  content: ContentNode[];
}

interface BlogContentProps {
  content: Record<string, unknown>;
}

function renderTextNode(node: TextNode, index: number): React.ReactNode {
  let element: React.ReactNode = node.text;

  if (node.marks) {
    for (const mark of node.marks) {
      switch (mark.type) {
        case "bold":
          element = <strong key={`bold-${index}`} className="text-on-surface font-semibold">{element}</strong>;
          break;
        case "italic":
          element = <em key={`italic-${index}`}>{element}</em>;
          break;
        case "underline":
          element = <u key={`underline-${index}`}>{element}</u>;
          break;
        case "strike":
          element = <s key={`strike-${index}`}>{element}</s>;
          break;
        case "code":
          element = (
            <code
              key={`code-${index}`}
              className="rounded bg-surface-alt px-1.5 py-0.5 text-sm font-mono"
            >
              {element}
            </code>
          );
          break;
        case "link":
          element = (
            <a
              key={`link-${index}`}
              href={mark.attrs?.href}
              target={mark.attrs?.target || "_blank"}
              rel="noopener noreferrer"
              className="text-[color:var(--color-link)] underline hover:text-[color:var(--color-link-hover)]"
            >
              {element}
            </a>
          );
          break;
      }
    }
  }

  return element;
}

function renderTextContent(content?: TextNode[]): React.ReactNode {
  if (!content) return null;
  return content.map((node, index) => renderTextNode(node, index));
}

function getPlainText(content?: TextNode[]): string {
  if (!content) return "";
  return content.map((node) => node.text).join("");
}

function renderNode(node: ContentNode, index: number): React.ReactNode {
  switch (node.type) {
    case "paragraph":
      return (
        <p key={index} className="mb-4 leading-relaxed text-on-surface-secondary">
          {renderTextContent(node.content)}
        </p>
      );

    case "heading": {
      const headingClasses: Record<number, string> = {
        1: "text-3xl font-bold mt-8 mb-4 text-on-surface",
        2: "text-2xl font-bold mt-8 mb-4 text-on-surface",
        3: "text-xl font-semibold mt-6 mb-3 text-on-surface",
        4: "text-lg font-semibold mt-4 mb-2 text-on-surface",
        5: "text-base font-semibold mt-4 mb-2 text-on-surface",
        6: "text-sm font-semibold mt-4 mb-2 text-on-surface",
      };
      const className = headingClasses[node.attrs.level];
      const content = renderTextContent(node.content);
      const id = slugify(getPlainText(node.content));
      switch (node.attrs.level) {
        case 1:
          return <h1 key={index} id={id} className={className}>{content}</h1>;
        case 2:
          return <h2 key={index} id={id} className={className}>{content}</h2>;
        case 3:
          return <h3 key={index} id={id} className={className}>{content}</h3>;
        case 4:
          return <h4 key={index} id={id} className={className}>{content}</h4>;
        case 5:
          return <h5 key={index} id={id} className={className}>{content}</h5>;
        case 6:
          return <h6 key={index} id={id} className={className}>{content}</h6>;
      }
    }

    case "bulletList":
      return (
        <ul key={index} className="mb-4 ml-6 list-disc space-y-2 text-on-surface-secondary">
          {node.content.map((item, itemIndex) => (
            <li key={itemIndex}>
              {item.content.map((p, pIndex) => renderTextContent(p.content))}
            </li>
          ))}
        </ul>
      );

    case "orderedList":
      return (
        <ol key={index} className="mb-4 ml-6 list-decimal space-y-2 text-on-surface-secondary">
          {node.content.map((item, itemIndex) => (
            <li key={itemIndex}>
              {item.content.map((p, pIndex) => renderTextContent(p.content))}
            </li>
          ))}
        </ol>
      );

    case "blockquote":
      return (
        <blockquote
          key={index}
          className="mb-4 border-l-4 border-border pl-4 italic text-on-surface-secondary"
        >
          {node.content.map((p, pIndex) => (
            <p key={pIndex}>{renderTextContent(p.content)}</p>
          ))}
        </blockquote>
      );

    case "codeBlock":
      return (
        <pre
          key={index}
          className="mb-4 overflow-x-auto rounded-lg bg-zinc-900 p-4 text-sm"
        >
          <code className="text-zinc-100">
            {node.content?.map((t) => t.text).join("")}
          </code>
        </pre>
      );

    case "image":
      return (
        <figure key={index} className="my-8">
          <div className="relative aspect-video overflow-hidden rounded-lg">
            <Image
              src={node.attrs.src}
              alt={node.attrs.alt || ""}
              fill
              className="object-cover"
            />
          </div>
          {node.attrs.title && (
            <figcaption className="mt-2 text-center text-sm text-on-surface-muted">
              {node.attrs.title}
            </figcaption>
          )}
        </figure>
      );

    case "horizontalRule":
      return <hr key={index} className="my-8 border-border" />;

    default:
      return null;
  }
}

export function BlogContent({ content }: BlogContentProps) {
  const doc = content as unknown as BlogContentData;

  if (!doc?.content || !Array.isArray(doc.content)) {
    // Fallback: if content is a simple HTML string stored in a property
    if (typeof (content as { html?: string }).html === "string") {
      return (
        <div
          className="prose prose-zinc max-w-none"
          dangerouslySetInnerHTML={{ __html: (content as { html: string }).html }}
        />
      );
    }
    return null;
  }

  return (
    <div className="prose prose-zinc max-w-none">
      {doc.content.map((node, index) => renderNode(node, index))}
    </div>
  );
}
