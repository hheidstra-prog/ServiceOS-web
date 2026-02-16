"use client";

import { useState, useCallback } from "react";
import {
  EditorRoot,
  EditorContent,
  EditorCommand,
  EditorCommandItem,
  EditorCommandList,
  EditorBubble,
  useEditor,
  StarterKit,
  TiptapImage,
  TiptapLink,
  type JSONContent,
  type EditorInstance,
} from "novel";
import Placeholder from "@tiptap/extension-placeholder";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
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
  Undo2,
  Redo2,
  Link,
  ExternalLink,
  Unlink,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TiptapRange = { from: number; to: number };

export interface EditorSelection {
  from: number;
  to: number;
  text: string;
  empty: boolean;
  contextBefore: string;
  contextAfter: string;
}

interface NovelEditorProps {
  initialContent?: JSONContent;
  onChange?: (content: JSONContent) => void;
  onEditorReady?: (editor: EditorInstance) => void;
  onSelectionChange?: (selection: EditorSelection) => void;
  className?: string;
}

const SelectionHighlight = Extension.create({
  name: "selectionHighlight",
  addProseMirrorPlugins() {
    const pluginKey = new PluginKey("selectionHighlight");
    return [
      new Plugin({
        key: pluginKey,
        state: {
          init() {
            return { blurred: false, from: 0, to: 0 };
          },
          apply(tr, prev) {
            const meta = tr.getMeta(pluginKey);
            if (meta) return meta;
            return prev;
          },
        },
        props: {
          decorations(state) {
            const pluginState = pluginKey.getState(state);
            if (pluginState?.blurred && pluginState.from !== pluginState.to) {
              return DecorationSet.create(state.doc, [
                Decoration.inline(pluginState.from, pluginState.to, {
                  style: "background-color: Highlight; color: HighlightText;",
                }),
              ]);
            }
            return DecorationSet.empty;
          },
          handleDOMEvents: {
            blur(view) {
              const { from, to } = view.state.selection;
              if (from !== to) {
                const tr = view.state.tr.setMeta(pluginKey, {
                  blurred: true,
                  from,
                  to,
                });
                view.dispatch(tr);
              }
              return false;
            },
            focus(view) {
              const pluginState = pluginKey.getState(view.state);
              if (pluginState?.blurred) {
                const tr = view.state.tr.setMeta(pluginKey, {
                  blurred: false,
                  from: 0,
                  to: 0,
                });
                view.dispatch(tr);
              }
              return false;
            },
          },
        },
      }),
    ];
  },
});

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
  SelectionHighlight,
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


function EditorToolbar({ editor }: { editor: EditorInstance | null }) {
  if (!editor) return null;

  const btn = (active: boolean) =>
    cn(
      "rounded p-1.5 transition-colors",
      active
        ? "bg-zinc-200 text-zinc-950 dark:bg-zinc-700 dark:text-white"
        : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
    );

  return (
    <div className="sticky top-0 z-10 flex items-center gap-0.5 border-b border-zinc-200 bg-white px-2 py-1 dark:border-zinc-800 dark:bg-zinc-950 rounded-t-lg">
      {/* Undo / Redo */}
      <button
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        className={cn(
          "rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white",
          "disabled:opacity-30 disabled:pointer-events-none"
        )}
      >
        <Undo2 className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        className={cn(
          "rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white",
          "disabled:opacity-30 disabled:pointer-events-none"
        )}
      >
        <Redo2 className="h-3.5 w-3.5" />
      </button>

      <div className="mx-1 h-4 w-px bg-zinc-200 dark:bg-zinc-700" />

      {/* Block type */}
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={btn(editor.isActive("heading", { level: 1 }))}
      >
        <Heading1 className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={btn(editor.isActive("heading", { level: 2 }))}
      >
        <Heading2 className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={btn(editor.isActive("heading", { level: 3 }))}
      >
        <Heading3 className="h-3.5 w-3.5" />
      </button>

      <div className="mx-1 h-4 w-px bg-zinc-200 dark:bg-zinc-700" />

      {/* Lists & quote */}
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={btn(editor.isActive("bulletList"))}
      >
        <List className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={btn(editor.isActive("orderedList"))}
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={btn(editor.isActive("blockquote"))}
      >
        <Quote className="h-3.5 w-3.5" />
      </button>

      <div className="mx-1 h-4 w-px bg-zinc-200 dark:bg-zinc-700" />

      {/* Inline formatting */}
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={btn(editor.isActive("bold"))}
      >
        <Bold className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={btn(editor.isActive("italic"))}
      >
        <Italic className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={btn(editor.isActive("strike"))}
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={btn(editor.isActive("code"))}
      >
        <Code className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function LinkBubbleContent() {
  const { editor } = useEditor();
  const [editing, setEditing] = useState(false);
  const [href, setHref] = useState("");
  const [openInNewTab, setOpenInNewTab] = useState(true);

  if (!editor) return null;

  const attrs = editor.getAttributes("link");

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <Link className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" />
        <a
          href={attrs.href}
          target="_blank"
          rel="noopener noreferrer"
          className="max-w-[280px] truncate text-sm text-blue-600 underline dark:text-blue-400"
        >
          {attrs.href}
        </a>
        <div className="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-700" />
        <button
          onClick={() => {
            setHref(attrs.href || "");
            setOpenInNewTab(attrs.target === "_blank");
            setEditing(true);
          }}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
          title="Edit link"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().unsetLink().run()}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950 dark:hover:text-red-400"
          title="Remove link"
        >
          <Unlink className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const saveLink = () => {
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href, target: openInNewTab ? "_blank" : "" })
      .run();
    setEditing(false);
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <input
          type="url"
          value={href}
          onChange={(e) => setHref(e.target.value)}
          placeholder="https://example.com"
          className="h-9 w-[320px] rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              saveLink();
            }
          }}
          autoFocus
        />
        <button
          onClick={saveLink}
          className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          title="Save"
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          onClick={() => setEditing(false)}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
          title="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
        <input
          type="checkbox"
          checked={openInNewTab}
          onChange={(e) => setOpenInNewTab(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-600"
        />
        <ExternalLink className="h-3.5 w-3.5" />
        Open in new tab
      </label>
    </div>
  );
}

function LinkBubbleMenu() {
  return (
    <EditorBubble
      pluginKey="linkBubbleMenu"
      shouldShow={({ editor }) => editor.isActive("link")}
      tippyOptions={{ placement: "bottom-start" }}
      className="rounded-xl border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
    >
      <LinkBubbleContent />
    </EditorBubble>
  );
}

function ImageBubbleContent() {
  const { editor } = useEditor();
  const [alt, setAlt] = useState("");
  const [title, setTitle] = useState("");
  const [initialized, setInitialized] = useState(false);

  if (!editor) return null;

  // Sync state from editor attributes when image is first selected
  const active = editor.isActive("image");
  if (active && !initialized) {
    const attrs = editor.getAttributes("image");
    setAlt(attrs.alt || "");
    setTitle(attrs.title || "");
    setInitialized(true);
  } else if (!active && initialized) {
    setInitialized(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Alt text</label>
        <input
          type="text"
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          placeholder="Describe the image for accessibility..."
          className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Caption</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Image caption (shown below image)..."
          className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
        />
      </div>
      <button
        onClick={() => {
          editor.chain().focus().updateAttributes("image", { alt, title }).run();
        }}
        className="flex h-9 items-center justify-center gap-1.5 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
      >
        <Check className="h-4 w-4" />
        Save
      </button>
    </div>
  );
}

function ImageBubbleMenu() {
  return (
    <EditorBubble
      pluginKey="imageBubbleMenu"
      shouldShow={({ editor }) => editor.isActive("image")}
      tippyOptions={{ placement: "bottom" }}
      className="w-[340px] rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
    >
      <ImageBubbleContent />
    </EditorBubble>
  );
}

export function NovelEditor({
  initialContent,
  onChange,
  onEditorReady,
  onSelectionChange,
  className,
}: NovelEditorProps) {
  const [openSlashCommand, setOpenSlashCommand] = useState(false);
  const [editorInstance, setEditorInstance] = useState<EditorInstance | null>(null);
  // Counter to force re-renders when cursor/selection changes
  const [, setToolbarTick] = useState(0);

  const handleUpdate = useCallback(
    ({ editor }: { editor: EditorInstance }) => {
      const json = editor.getJSON();
      onChange?.(json);
      setToolbarTick((t) => t + 1);
    },
    [onChange]
  );

  return (
    <EditorRoot>
      <EditorToolbar editor={editorInstance} />
      <EditorContent
        className={cn(
          "relative min-h-[400px] w-full rounded-b-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950",
          "[&_.tiptap]:p-8",
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
          setEditorInstance(editor);
          onEditorReady?.(editor);
          editor.on("selectionUpdate", () => {
            setToolbarTick((t) => t + 1);
            const { from, to } = editor.state.selection;
            const text = editor.state.doc.textBetween(from, to, " ");
            const docSize = editor.state.doc.content.size;
            const contextBefore = editor.state.doc.textBetween(Math.max(0, from - 120), from, " ");
            const contextAfter = editor.state.doc.textBetween(to, Math.min(docSize, to + 120), " ");
            onSelectionChange?.({ from, to, text, empty: from === to, contextBefore, contextAfter });
          });
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

        {/* Bubble Menus */}
        <LinkBubbleMenu />
        <ImageBubbleMenu />
      </EditorContent>
    </EditorRoot>
  );
}
