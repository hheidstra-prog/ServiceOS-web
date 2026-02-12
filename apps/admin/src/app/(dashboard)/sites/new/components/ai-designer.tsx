"use client";

import { useReducer, useEffect, useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Palette, RotateCcw } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { BusinessContext } from "@/lib/ai";
import { designerReducer, initialDesignerState, loadFromStorage, clearStorage } from "../moodboard-reducer";
import { sendDesignerMessage, aiCreateSiteFromDesigner } from "../actions";
import { DesignerChat } from "./chat/designer-chat";
import { MoodboardPanel } from "./moodboard/moodboard-panel";

interface AIDesignerProps {
  businessContext: BusinessContext;
}

export function AIDesigner({ businessContext }: AIDesignerProps) {
  const router = useRouter();
  const [state, dispatch] = useReducer(designerReducer, initialDesignerState);
  const hasStarted = useRef(false);

  // Restore from localStorage or send opening message on mount
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    // Try to restore a previous session
    const saved = loadFromStorage();
    if (saved && saved.messages.length > 0) {
      dispatch({ type: "RESTORE_STATE", messages: saved.messages, moodboard: saved.moodboard, logoUrl: saved.logoUrl });
      return;
    }

    const sendOpening = async () => {
      dispatch({ type: "SET_LOADING", value: true });

      try {
        // Send an empty-ish initial message to trigger the designer's opening
        const initialMessage = {
          id: "init-1",
          role: "user" as const,
          content: "Hi, I'd like to design my website.",
          timestamp: new Date(),
        };

        const response = await sendDesignerMessage(
          [initialMessage],
          [],
          null,
          businessContext
        );

        if (response.content) {
          dispatch({ type: "ADD_AI_MESSAGE", content: response.content });
        }

        // Process any initial tool calls (unlikely but possible)
        processToolCalls(response.toolCalls, dispatch);
      } catch (error) {
        console.error("Failed to send opening message:", error);
        // Add a fallback opening message
        dispatch({
          type: "ADD_AI_MESSAGE",
          content:
            businessContext.locale === "nl"
              ? `Welkom! Ik ben je AI-designer en ik ga je helpen de perfecte look voor je website te vinden. Laten we beginnen — hoe zou je willen dat bezoekers zich voelen als ze je site zien?`
              : `Welcome! I'm your AI designer and I'll help you find the perfect look for your website. Let's start — how do you want visitors to feel when they see your site?`,
        });
      } finally {
        dispatch({ type: "SET_LOADING", value: false });
      }
    };

    sendOpening();
  }, [businessContext]);

  // beforeunload warning
  useEffect(() => {
    if (state.messages.length === 0) return;

    const handler = (e: BeforeUnloadEvent) => {
      if (skipBeforeUnload.current) return;
      e.preventDefault();
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [state.messages.length]);

  // Handle site generation
  const handleGenerate = useCallback(async () => {
    if (!state.moodboard.designDirection) {
      toast.error("No design direction set yet");
      return;
    }

    dispatch({ type: "SET_GENERATING", value: true });

    try {
      const { siteId } = await aiCreateSiteFromDesigner(
        state.moodboard.designDirection,
        state.logoUrl
      );
      clearStorage();
      toast.success("Your site has been generated!");
      router.push(`/sites/${siteId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate site"
      );
      dispatch({ type: "SET_GENERATING", value: false });
    }
  }, [state.moodboard.designDirection, router]);

  const [showResetDialog, setShowResetDialog] = useState(false);

  const skipBeforeUnload = useRef(false);

  const handleStartOver = useCallback(() => {
    skipBeforeUnload.current = true;
    clearStorage();
    window.location.reload();
  }, []);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <Link href="/sites">
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-white">
              AI Designer
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Design your site with AI
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {state.messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setShowResetDialog(true)} className="text-zinc-500">
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Start over
            </Button>
          )}

          {/* Mobile moodboard toggle */}
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Palette className="mr-1.5 h-3.5 w-3.5" />
                  Moodboard
                  {state.moodboard.items.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                      {state.moodboard.items.length}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[350px] p-0 sm:w-[400px]">
                <SheetHeader className="sr-only">
                  <SheetTitle>Moodboard</SheetTitle>
                </SheetHeader>
                <MoodboardPanel
                  moodboard={state.moodboard}
                  isGenerating={state.isGenerating}
                  dispatch={dispatch}
                  onGenerate={handleGenerate}
                />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Main content: Chat + Moodboard */}
      <div className="flex min-h-0 flex-1">
        {/* Chat panel */}
        <div className="min-h-0 flex-1">
          <DesignerChat
            state={state}
            dispatch={dispatch}
            businessContext={businessContext}
          />
        </div>

        {/* Moodboard panel (desktop) */}
        <div className="hidden min-h-0 w-[400px] border-l border-zinc-200 lg:block dark:border-zinc-800">
          <MoodboardPanel
            moodboard={state.moodboard}
            isGenerating={state.isGenerating}
            dispatch={dispatch}
            onGenerate={handleGenerate}
          />
        </div>
      </div>

      {/* Start over confirmation */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start over?</DialogTitle>
            <DialogDescription>
              This will clear your current conversation and moodboard. You&apos;ll start a fresh design session.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleStartOver}>
              Start over
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generating overlay */}
      {state.isGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-zinc-950/80">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative">
              <div className="h-16 w-16 animate-spin rounded-full border-4 border-violet-200 border-t-violet-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Generating your site
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Creating pages, content, and applying your design direction...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Process tool calls from the AI response and dispatch moodboard updates.
 */
function processToolCalls(
  toolCalls: Array<{ name: string; input: Record<string, unknown> }>,
  dispatch: React.Dispatch<import("../types").DesignerAction>
) {
  for (const toolCall of toolCalls) {
    const inp = toolCall.input;
    switch (toolCall.name) {
      case "add_color_palette": {
        const rawColors = inp.colors;
        const colors = Array.isArray(rawColors) ? rawColors : typeof rawColors === "string" ? [rawColors] : [];
        dispatch({
          type: "ADD_MOODBOARD_ITEM",
          item: {
            type: "color_palette",
            id: `palette-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            colors: colors as string[],
            name: inp.name as string,
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
            heading: inp.heading as string,
            body: inp.body as string,
            vibe: inp.vibe as string,
          },
        });
        break;
      case "add_style_keyword":
        dispatch({
          type: "ADD_MOODBOARD_ITEM",
          item: {
            type: "style_keyword",
            id: `kw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            keyword: inp.keyword as string,
            category: inp.category as "mood" | "density" | "shape" | "feel",
          },
        });
        break;
      case "add_layout_preference":
        dispatch({
          type: "ADD_MOODBOARD_ITEM",
          item: {
            type: "layout_preference",
            id: `layout-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            key: inp.key as string,
            value: inp.value as string,
          },
        });
        break;
      case "add_design_token":
        dispatch({
          type: "ADD_MOODBOARD_ITEM",
          item: {
            type: "design_token",
            id: `token-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            token: inp.token as string,
            value: inp.value as string,
            description: inp.description as string,
          },
        });
        break;
      case "suggest_reference_site":
        // Handled in designer-chat where references are attached to the message
        break;
      case "set_logo":
        dispatch({
          type: "SET_LOGO_URL",
          url: inp.url as string,
        });
        break;
      case "set_blog_preferences":
        // Captured — will be included in update_design_direction
        break;
      case "update_design_direction":
        dispatch({
          type: "UPDATE_DESIGN_DIRECTION",
          direction: {
            colorMode: inp.colorMode as "light" | "dark",
            primaryColor: inp.primaryColor as string,
            secondaryColor: inp.secondaryColor as string,
            fontHeading: inp.fontHeading as string,
            fontBody: inp.fontBody as string,
            heroStyle: inp.heroStyle as string,
            headerStyle: inp.headerStyle as string,
            footerStyle: inp.footerStyle as string,
            designTokens: (inp.designTokens as Record<string, string>) || {},
            confidence: inp.confidence as number,
            summary: inp.summary as string,
            logoUrl: (inp.logoUrl as string) ?? undefined,
            blogPreferences: (inp.blogPreferences as { topics?: string[]; style?: string }) ?? undefined,
          },
        });
        break;
    }
  }
}
