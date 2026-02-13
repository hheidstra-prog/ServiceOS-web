"use client";

import { useState, useCallback } from "react";
import {
  EditorRoot,
  EditorContent,
  EditorCommand,
  EditorCommandItem,
  EditorCommandList,
  EditorBubble,
  EditorBubbleItem,
  StarterKit,
  TiptapImage,
  TiptapLink,
  type JSONContent,
  type EditorInstance,
} from "novel";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Image as ImageIcon,
  Text,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TiptapRange = { from: number; to: number };

interface NovelEditorProps {
  initialContent?: JSONContent;
  onChange?: (content: JSONContent) => void;
  onEditorReady?: (editor: EditorInstance) => void;
  className?: string;
}

const extensions = [
  StarterKit,
  TiptapImage.configure({
    allowBase64: true,
  }),
  TiptapLink.configure({
    openOnClick: false,
  }),
  Placeholder.configure({
    placeholder: "Type '/' for commands...",
  }),
];

const slashCommandItems = [
  {
    title: "Text",
    description: "Start writing with plain text.",
    icon: <Text className="h-4 w-4" />,
    command: ({ editor, range }: { editor: EditorInstance; range: TiptapRange }) => {
      editor.chain().focus().deleteRange(range).toggleNode("paragraph", "paragraph").run();
    },
  },
  {
    title: "Heading 1",
    description: "Large section heading.",
    icon: <Heading1 className="h-4 w-4" />,
    command: ({ editor, range }: { editor: EditorInstance; range: TiptapRange }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run();
    },
  },
  {
    title: "Heading 2",
    description: "Medium section heading.",
    icon: <Heading2 className="h-4 w-4" />,
    command: ({ editor, range }: { editor: EditorInstance; range: TiptapRange }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run();
    },
  },
  {
    title: "Heading 3",
    description: "Small section heading.",
    icon: <Heading3 className="h-4 w-4" />,
    command: ({ editor, range }: { editor: EditorInstance; range: TiptapRange }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run();
    },
  },
  {
    title: "Bullet List",
    description: "Create a bullet list.",
    icon: <List className="h-4 w-4" />,
    command: ({ editor, range }: { editor: EditorInstance; range: TiptapRange }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Numbered List",
    description: "Create a numbered list.",
    icon: <ListOrdered className="h-4 w-4" />,
    command: ({ editor, range }: { editor: EditorInstance; range: TiptapRange }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: "Quote",
    description: "Add a blockquote.",
    icon: <Quote className="h-4 w-4" />,
    command: ({ editor, range }: { editor: EditorInstance; range: TiptapRange }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: "Divider",
    description: "Add a horizontal divider.",
    icon: <Minus className="h-4 w-4" />,
    command: ({ editor, range }: { editor: EditorInstance; range: TiptapRange }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    title: "Image",
    description: "Upload or embed an image.",
    icon: <ImageIcon className="h-4 w-4" />,
    command: ({ editor, range }: { editor: EditorInstance; range: TiptapRange }) => {
      editor.chain().focus().deleteRange(range).run();
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append("file", file);
        try {
          const res = await fetch("/api/media/upload", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (data.file?.url) {
            editor.chain().focus().setImage({ src: data.file.url }).run();
          }
        } catch {
          console.error("Image upload failed");
        }
      };
      input.click();
    },
  },
];

export function NovelEditor({
  initialContent,
  onChange,
  onEditorReady,
  className,
}: NovelEditorProps) {
  const [openSlashCommand, setOpenSlashCommand] = useState(false);

  const handleUpdate = useCallback(
    ({ editor }: { editor: EditorInstance }) => {
      const json = editor.getJSON();
      onChange?.(json);
    },
    [onChange]
  );

  return (
    <EditorRoot>
      <EditorContent
        className={cn(
          "relative min-h-[400px] w-full rounded-lg border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950",
          "[&_.tiptap]:outline-none [&_.tiptap]:min-h-[300px]",
          "[&_.tiptap_p]:my-2 [&_.tiptap_p]:leading-relaxed",
          "[&_.tiptap_h1]:text-3xl [&_.tiptap_h1]:font-bold [&_.tiptap_h1]:mt-6 [&_.tiptap_h1]:mb-4",
          "[&_.tiptap_h2]:text-2xl [&_.tiptap_h2]:font-bold [&_.tiptap_h2]:mt-5 [&_.tiptap_h2]:mb-3",
          "[&_.tiptap_h3]:text-xl [&_.tiptap_h3]:font-bold [&_.tiptap_h3]:mt-4 [&_.tiptap_h3]:mb-2",
          "[&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-6 [&_.tiptap_ul]:my-2",
          "[&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-6 [&_.tiptap_ol]:my-2",
          "[&_.tiptap_li]:my-1",
          "[&_.tiptap_blockquote]:border-l-4 [&_.tiptap_blockquote]:border-zinc-300 [&_.tiptap_blockquote]:pl-4 [&_.tiptap_blockquote]:my-4 [&_.tiptap_blockquote]:italic [&_.tiptap_blockquote]:text-zinc-600 dark:[&_.tiptap_blockquote]:border-zinc-700 dark:[&_.tiptap_blockquote]:text-zinc-400",
          "[&_.tiptap_img]:rounded-lg [&_.tiptap_img]:max-w-full [&_.tiptap_img]:my-4",
          "[&_.tiptap_hr]:my-6 [&_.tiptap_hr]:border-zinc-200 dark:[&_.tiptap_hr]:border-zinc-800",
          "[&_.tiptap_a]:text-blue-600 [&_.tiptap_a]:underline dark:[&_.tiptap_a]:text-blue-400",
          "[&_.tiptap_code]:bg-zinc-100 [&_.tiptap_code]:px-1.5 [&_.tiptap_code]:py-0.5 [&_.tiptap_code]:rounded [&_.tiptap_code]:text-sm dark:[&_.tiptap_code]:bg-zinc-800",
          "[&_.tiptap_strong]:font-bold",
          "[&_.tiptap_em]:italic",
          "prose prose-zinc max-w-none dark:prose-invert",
          className
        )}
        extensions={extensions}
        initialContent={initialContent || { type: "doc", content: [{ type: "paragraph" }] }}
        onUpdate={handleUpdate}
        onCreate={({ editor }) => {
          onEditorReady?.(editor);
        }}
        editorProps={{
          attributes: {
            class: "tiptap focus:outline-none",
          },
        }}
        immediatelyRender={false}
      >
        {/* Slash Command Menu */}
        <EditorCommand
          className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-md dark:border-zinc-800 dark:bg-zinc-950"
        >
          <EditorCommandList>
            {slashCommandItems.map((item) => (
              <EditorCommandItem
                key={item.title}
                value={item.title}
                onCommand={item.command}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                  {item.icon}
                </div>
                <div>
                  <p className="font-medium text-zinc-950 dark:text-white">
                    {item.title}
                  </p>
                  <p className="text-xs text-zinc-500">{item.description}</p>
                </div>
              </EditorCommandItem>
            ))}
          </EditorCommandList>
        </EditorCommand>

        {/* Bubble Menu (floating toolbar) */}
        <EditorBubble className="flex items-center gap-0.5 rounded-lg border border-zinc-200 bg-white p-1 shadow-md dark:border-zinc-800 dark:bg-zinc-950">
          <EditorBubbleItem
            onSelect={(editor) => editor.chain().focus().toggleBold().run()}
          >
            <button className="rounded p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <Bold className="h-3.5 w-3.5" />
            </button>
          </EditorBubbleItem>
          <EditorBubbleItem
            onSelect={(editor) => editor.chain().focus().toggleItalic().run()}
          >
            <button className="rounded p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <Italic className="h-3.5 w-3.5" />
            </button>
          </EditorBubbleItem>
          <EditorBubbleItem
            onSelect={(editor) => editor.chain().focus().toggleStrike().run()}
          >
            <button className="rounded p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <Strikethrough className="h-3.5 w-3.5" />
            </button>
          </EditorBubbleItem>
          <EditorBubbleItem
            onSelect={(editor) => editor.chain().focus().toggleCode().run()}
          >
            <button className="rounded p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <Code className="h-3.5 w-3.5" />
            </button>
          </EditorBubbleItem>
        </EditorBubble>
      </EditorContent>
    </EditorRoot>
  );
}
