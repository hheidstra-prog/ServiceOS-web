"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import type { BusinessContext } from "@/lib/ai";
import type { DesignerState, DesignerAction, MoodboardItem, SiteReference } from "../../types";
import { sendDesignerMessage } from "../../actions";
import { DesignerMessageList } from "./designer-message-list";
import { DesignerInput } from "./designer-input";
import { ImageDropZone } from "./image-drop-zone";

interface DesignerChatProps {
  state: DesignerState;
  dispatch: React.Dispatch<DesignerAction>;
  businessContext: BusinessContext;
}

export function DesignerChat({
  state,
  dispatch,
  businessContext,
}: DesignerChatProps) {
  const [input, setInput] = useState("");
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(async () => {
    const content = input.trim();
    const images = [...attachedImages];

    if (!content && images.length === 0) return;

    // Add user message to UI
    dispatch({ type: "ADD_USER_MESSAGE", content, images });
    setInput("");
    setAttachedImages([]);
    dispatch({ type: "SET_LOADING", value: true });

    try {
      // Build full message list including the new one
      const newMessage = {
        id: `user-${Date.now()}`,
        role: "user" as const,
        content,
        images,
        timestamp: new Date(),
      };
      const allMessages = [...state.messages, newMessage];

      const response = await sendDesignerMessage(
        allMessages,
        state.moodboard.items,
        state.moodboard.designDirection,
        businessContext
      );

      // Process tool calls — update moodboard state
      const references: SiteReference[] = [];
      for (const toolCall of response.toolCalls) {
        const input = toolCall.input;
        switch (toolCall.name) {
          case "add_color_palette": {
            const rawColors = input.colors;
            const colors = Array.isArray(rawColors) ? rawColors : typeof rawColors === "string" ? [rawColors] : [];
            dispatch({
              type: "ADD_MOODBOARD_ITEM",
              item: {
                type: "color_palette",
                id: `palette-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                colors: colors as string[],
                name: input.name as string,
              },
            });
            break;
          }

          case "add_typography":
            dispatch({
              type: "ADD_MOODBOARD_ITEM",
              item: {
                type: "typography",
                id: `typo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                heading: input.heading as string,
                body: input.body as string,
                vibe: input.vibe as string,
              },
            });
            break;

          case "add_style_keyword":
            dispatch({
              type: "ADD_MOODBOARD_ITEM",
              item: {
                type: "style_keyword",
                id: `kw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                keyword: input.keyword as string,
                category: input.category as "mood" | "density" | "shape" | "feel",
              },
            });
            break;

          case "add_layout_preference":
            dispatch({
              type: "ADD_MOODBOARD_ITEM",
              item: {
                type: "layout_preference",
                id: `layout-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                key: input.key as string,
                value: input.value as string,
              },
            });
            break;

          case "add_design_token":
            dispatch({
              type: "ADD_MOODBOARD_ITEM",
              item: {
                type: "design_token",
                id: `token-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                token: input.token as string,
                value: input.value as string,
                description: input.description as string,
              },
            });
            break;

          case "suggest_reference_site":
            references.push({
              url: input.url as string,
              title: input.title as string,
              description: input.description as string,
            });
            break;

          case "set_logo":
            dispatch({
              type: "SET_LOGO_URL",
              url: input.url as string,
            });
            break;

          case "set_blog_preferences":
            // Captured — will be included in update_design_direction
            break;

          case "update_design_direction":
            dispatch({
              type: "UPDATE_DESIGN_DIRECTION",
              direction: {
                colorMode: input.colorMode as "light" | "dark",
                primaryColor: input.primaryColor as string,
                secondaryColor: input.secondaryColor as string,
                fontHeading: input.fontHeading as string,
                fontBody: input.fontBody as string,
                heroStyle: input.heroStyle as string,
                headerStyle: input.headerStyle as string,
                footerStyle: input.footerStyle as string,
                designTokens: (input.designTokens as Record<string, string>) || {},
                confidence: input.confidence as number,
                summary: input.summary as string,
                logoUrl: (input.logoUrl as string) ?? undefined,
                blogPreferences: (input.blogPreferences as { topics?: string[]; style?: string }) ?? undefined,
              },
            });
            break;
        }
      }

      // Add AI response text (or references-only message)
      if (response.content || references.length > 0) {
        dispatch({
          type: "ADD_AI_MESSAGE",
          content: response.content || "",
          references: references.length > 0 ? references : undefined,
        });
      }
    } catch (error) {
      toast.error("Failed to get a response from the designer");
      console.error("Designer error:", error);
    } finally {
      dispatch({ type: "SET_LOADING", value: false });
    }
  }, [input, attachedImages, state.messages, state.moodboard, dispatch, businessContext]);

  const handleUpload = useCallback(
    async (file: File) => {
      dispatch({ type: "SET_UPLOADING", value: true });

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/designer/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Upload failed");
        }

        const { url } = await res.json();
        setAttachedImages((prev) => [...prev, url]);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to upload image"
        );
      } finally {
        dispatch({ type: "SET_UPLOADING", value: false });
      }
    },
    [dispatch]
  );

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleUpload(file);
    }
    // Reset so the same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex h-full flex-col">
      <ImageDropZone isUploading={state.isUploading} onUpload={handleUpload}>
        <DesignerMessageList
          messages={state.messages}
          isLoading={state.isLoading}
        />
      </ImageDropZone>

      <DesignerInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        onAttachImage={handleAttachClick}
        attachedImages={attachedImages}
        onRemoveImage={(url) =>
          setAttachedImages((prev) => prev.filter((u) => u !== url))
        }
        disabled={state.isLoading}
      />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
