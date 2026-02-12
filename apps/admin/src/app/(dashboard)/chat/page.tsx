import { getConversations, getConversation, getSuggestedPrompts } from "./actions";
import { ChatSidebar } from "./chat-sidebar";
import { ChatInterface } from "./chat-interface";

interface ChatPageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const params = await searchParams;
  const conversationId = params.id || null;

  const [conversations, suggestedPrompts] = await Promise.all([
    getConversations(),
    getSuggestedPrompts(),
  ]);

  // Get active conversation if selected
  const activeConversation = conversationId
    ? await getConversation(conversationId)
    : null;

  const messages = activeConversation?.messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt,
  })) || [];

  return (
    <div className="flex h-[calc(100vh-3.5rem)] -m-4 sm:-m-6">
      {/* Sidebar */}
      <div className="hidden w-64 shrink-0 md:block">
        <ChatSidebar
          conversations={conversations}
          activeConversationId={conversationId}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 bg-white dark:bg-zinc-950">
        <ChatInterface
          conversationId={conversationId}
          initialMessages={messages}
          suggestedPrompts={suggestedPrompts}
        />
      </div>
    </div>
  );
}
