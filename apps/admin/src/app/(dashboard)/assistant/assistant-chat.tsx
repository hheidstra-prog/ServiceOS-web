"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  chatAssistant,
  type AssistantChatResult,
  type ClientResult,
  type InvoiceResult,
  type ProjectResult,
  type BookingResult,
  type QuoteResult,
  type BusinessSummaryResult,
  type DraftEmailResult,
} from "./assistant-chat-actions";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  actionsTaken?: string[];
  // Structured results attached to message
  clientResults?: ClientResult[];
  invoiceResults?: InvoiceResult[];
  projectResults?: ProjectResult[];
  bookingResults?: BookingResult[];
  quoteResults?: QuoteResult[];
  businessSummary?: BusinessSummaryResult;
  draftEmail?: DraftEmailResult;
}

export interface AssistantResultPayload {
  clientResults?: ClientResult[];
  invoiceResults?: InvoiceResult[];
  projectResults?: ProjectResult[];
  bookingResults?: BookingResult[];
  quoteResults?: QuoteResult[];
  businessSummary?: BusinessSummaryResult;
  draftEmail?: DraftEmailResult;
}

interface AssistantChatProps {
  externalMessage?: string | null;
  onExternalMessageConsumed?: () => void;
  onResults?: (results: AssistantResultPayload) => void;
  initialResults?: AssistantResultPayload;
  locale?: string;
}

const seedMessages: Record<string, string> = {
  nl: "Hallo! Ik ben je bedrijfsassistent. Vraag me alles over je klanten, facturen, projecten, boekingen of offertes.",
  en: "Hello! I'm your business assistant. Ask me anything about your clients, invoices, projects, bookings, or quotes.",
  de: "Hallo! Ich bin Ihr Geschäftsassistent. Fragen Sie mich alles über Ihre Kunden, Rechnungen, Projekte, Buchungen oder Angebote.",
  fr: "Bonjour ! Je suis votre assistant professionnel. Posez-moi des questions sur vos clients, factures, projets, rendez-vous ou devis.",
};

const STORAGE_KEY = "assistant-chat-messages";

function loadMessages(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMessages(msgs: ChatMessage[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
  } catch {
    // storage full or unavailable
  }
}

function getResultCount(msg: ChatMessage): number {
  let count = 0;
  if (msg.clientResults) count += msg.clientResults.length;
  if (msg.invoiceResults) count += msg.invoiceResults.length;
  if (msg.projectResults) count += msg.projectResults.length;
  if (msg.bookingResults) count += msg.bookingResults.length;
  if (msg.quoteResults) count += msg.quoteResults.length;
  if (msg.businessSummary) count += 1;
  if (msg.draftEmail) count += 1;
  return count;
}

function extractResultPayload(msg: ChatMessage): AssistantResultPayload {
  return {
    clientResults: msg.clientResults,
    invoiceResults: msg.invoiceResults,
    projectResults: msg.projectResults,
    bookingResults: msg.bookingResults,
    quoteResults: msg.quoteResults,
    businessSummary: msg.businessSummary,
    draftEmail: msg.draftEmail,
  };
}

export function AssistantChat({
  externalMessage,
  onExternalMessageConsumed,
  onResults,
  initialResults,
  locale = "en",
}: AssistantChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const hasRestoredRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Persist messages to sessionStorage
  useEffect(() => {
    if (!hasRestoredRef.current) return;
    saveMessages(messages);
  }, [messages]);

  // On mount, restore from sessionStorage or inject synthetic seed message
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;
    const restored = loadMessages();
    if (restored.length > 0) {
      setMessages(restored);
      // Replay the last result set to parent
      if (onResults) {
        for (let i = restored.length - 1; i >= 0; i--) {
          if (getResultCount(restored[i]) > 0) {
            onResults(extractResultPayload(restored[i]));
            break;
          }
        }
      }
    } else {
      // Inject synthetic seed message with initial results
      const seedText = seedMessages[locale] || seedMessages.en;
      const synthetic: ChatMessage = {
        id: "msg-seed",
        role: "assistant",
        content: seedText,
        timestamp: Date.now(),
        ...initialResults,
      };
      setMessages([synthetic]);
      if (onResults && initialResults) {
        onResults(initialResults);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 150) + "px";
    }
  }, [input]);

  // Bridge external messages (chip clicks) into the chat
  useEffect(() => {
    if (externalMessage) {
      handleSend(externalMessage);
      onExternalMessageConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalMessage]);

  const handleSend = async (text?: string) => {
    const message = text || input.trim();
    if (!message || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: message,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const conversationHistory = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const result: AssistantChatResult =
        await chatAssistant(conversationHistory);

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: "assistant",
        content: result.content,
        timestamp: Date.now(),
        actionsTaken: result.actionsTaken,
        clientResults: result.clientResults,
        invoiceResults: result.invoiceResults,
        projectResults: result.projectResults,
        bookingResults: result.bookingResults,
        quoteResults: result.quoteResults,
        businessSummary: result.businessSummary,
        draftEmail: result.draftEmail,
      };

      setMessages([...updatedMessages, assistantMessage]);

      // Emit results to parent for the right panel
      if (onResults) {
        onResults({
          clientResults: result.clientResults,
          invoiceResults: result.invoiceResults,
          projectResults: result.projectResults,
          bookingResults: result.bookingResults,
          quoteResults: result.quoteResults,
          businessSummary: result.businessSummary,
          draftEmail: result.draftEmail,
        });
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to get AI response"
      );
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {messages.length === 0 && !isLoading ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              Ask me anything about your business.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-2 ${
                  message.role === "user" ? "flex-row-reverse" : ""
                }`}
              >
                {message.role === "assistant" && (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500">
                    <Sparkles className="h-3 w-3 text-white" />
                  </div>
                )}

                <div className="flex max-w-[85%] flex-col gap-1">
                  <div
                    className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      message.role === "user"
                        ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                        : "bg-zinc-100 text-zinc-950 dark:bg-zinc-800 dark:text-white"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>

                  {/* Actions taken badge */}
                  {message.actionsTaken && message.actionsTaken.length > 0 && (
                    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                      <Sparkles className="h-2.5 w-2.5" />
                      {message.actionsTaken.length} action
                      {message.actionsTaken.length > 1 ? "s" : ""} taken
                    </span>
                  )}

                  {/* Result count hint */}
                  {onResults && getResultCount(message) > 0 && (
                    <span className="text-[10px] text-violet-500">
                      {getResultCount(message)} result
                      {getResultCount(message) > 1 ? "s" : ""} shown &rarr;
                    </span>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" />
                  <span className="text-xs text-zinc-500">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="border-t border-zinc-200 px-3 pb-3 pt-3 dark:border-zinc-800">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your business..."
              disabled={isLoading}
              className="min-h-[36px] max-h-[150px] flex-1 resize-none border-0 bg-transparent p-1.5 text-sm focus-visible:ring-0"
              rows={1}
            />
            <Button
              size="icon-sm"
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
