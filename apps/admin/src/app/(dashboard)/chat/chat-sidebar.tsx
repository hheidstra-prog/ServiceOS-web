"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, MessageSquare, MoreHorizontal, Trash2, Archive } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { createConversation, deleteConversation, archiveConversation } from "./actions";

interface Conversation {
  id: string;
  title: string | null;
  updatedAt: Date;
  messages: {
    content: string;
    role: string;
  }[];
}

interface ChatSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
}

export function ChatSidebar({ conversations, activeConversationId }: ChatSidebarProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleNewChat = async () => {
    setIsCreating(true);
    try {
      const conversation = await createConversation();
      router.push(`/chat?id=${conversation.id}`);
    } catch {
      toast.error("Failed to create conversation");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this conversation?")) return;
    try {
      await deleteConversation(id);
      if (activeConversationId === id) {
        router.push("/chat");
      }
      toast.success("Conversation deleted");
    } catch {
      toast.error("Failed to delete conversation");
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await archiveConversation(id);
      if (activeConversationId === id) {
        router.push("/chat");
      }
      toast.success("Conversation archived");
    } catch {
      toast.error("Failed to archive conversation");
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const d = new Date(date);
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return d.toLocaleDateString("en-US", { weekday: "long" });
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Group conversations by date
  const groupedConversations = conversations.reduce(
    (groups, conv) => {
      const dateKey = formatDate(conv.updatedAt);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(conv);
      return groups;
    },
    {} as Record<string, Conversation[]>
  );

  return (
    <div className="flex h-full flex-col border-r border-zinc-950/10 bg-zinc-50 dark:border-white/10 dark:bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-950/10 p-3 dark:border-white/10">
        <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Conversations</h2>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleNewChat}
          disabled={isCreating}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare className="mb-2 h-8 w-8 text-zinc-400" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No conversations yet</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={handleNewChat}
              disabled={isCreating}
            >
              Start a new chat
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedConversations).map(([date, convs]) => (
              <div key={date}>
                <p className="mb-1 px-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {date}
                </p>
                <div className="space-y-0.5">
                  {convs.map((conv) => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      isActive={conv.id === activeConversationId}
                      onDelete={() => handleDelete(conv.id)}
                      onArchive={() => handleArchive(conv.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationItem({
  conversation,
  isActive,
  onDelete,
  onArchive,
}: {
  conversation: Conversation;
  isActive: boolean;
  onDelete: () => void;
  onArchive: () => void;
}) {
  const router = useRouter();
  const lastMessage = conversation.messages[0];
  const preview = lastMessage?.content.slice(0, 50) + (lastMessage?.content.length > 50 ? "..." : "");

  return (
    <div
      className={cn(
        "group relative flex cursor-pointer items-start gap-2 rounded-lg p-2 transition-colors",
        isActive
          ? "bg-zinc-200 dark:bg-zinc-800"
          : "hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
      )}
      onClick={() => router.push(`/chat?id=${conversation.id}`)}
    >
      <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-950 dark:text-white">
          {conversation.title || "New conversation"}
        </p>
        {preview && (
          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{preview}</p>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            className="shrink-0 opacity-0 group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive(); }}>
            <Archive className="mr-2 h-4 w-4" />
            Archive
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            variant="destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
