"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUserAndOrg } from "@/lib/auth";
import { chat, getOrganizationContext, type Message as AIMessage } from "@/lib/ai";

// Get all conversations for the current user
export async function getConversations() {
  const { user, organization } = await getCurrentUserAndOrg();
  if (!user || !organization) return [];

  return db.conversation.findMany({
    where: {
      organizationId: organization.id,
      userId: user.id,
      isArchived: false,
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      updatedAt: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          content: true,
          role: true,
        },
      },
    },
  });
}

// Get a single conversation with messages
export async function getConversation(id: string) {
  const { user, organization } = await getCurrentUserAndOrg();
  if (!user || !organization) return null;

  return db.conversation.findFirst({
    where: {
      id,
      organizationId: organization.id,
      userId: user.id,
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          content: true,
          metadata: true,
          createdAt: true,
        },
      },
    },
  });
}

// Create a new conversation
export async function createConversation(title?: string) {
  const { user, organization } = await getCurrentUserAndOrg();
  if (!user || !organization) throw new Error("Not authorized");

  const conversation = await db.conversation.create({
    data: {
      organizationId: organization.id,
      userId: user.id,
      title: title || null,
    },
  });

  revalidatePath("/chat");
  return conversation;
}

// Update conversation title
export async function updateConversationTitle(id: string, title: string) {
  const { user, organization } = await getCurrentUserAndOrg();
  if (!user || !organization) throw new Error("Not authorized");

  await db.conversation.update({
    where: {
      id,
      organizationId: organization.id,
      userId: user.id,
    },
    data: { title },
  });

  revalidatePath("/chat");
}

// Archive a conversation
export async function archiveConversation(id: string) {
  const { user, organization } = await getCurrentUserAndOrg();
  if (!user || !organization) throw new Error("Not authorized");

  await db.conversation.update({
    where: {
      id,
      organizationId: organization.id,
      userId: user.id,
    },
    data: { isArchived: true },
  });

  revalidatePath("/chat");
}

// Delete a conversation
export async function deleteConversation(id: string) {
  const { user, organization } = await getCurrentUserAndOrg();
  if (!user || !organization) throw new Error("Not authorized");

  await db.conversation.delete({
    where: {
      id,
      organizationId: organization.id,
      userId: user.id,
    },
  });

  revalidatePath("/chat");
}

// Add a message to a conversation
export async function addMessage(
  conversationId: string,
  content: string,
  role: "USER" | "ASSISTANT" | "SYSTEM",
  metadata?: object
) {
  const { user, organization } = await getCurrentUserAndOrg();
  if (!user || !organization) throw new Error("Not authorized");

  // Verify conversation belongs to user
  const conversation = await db.conversation.findFirst({
    where: {
      id: conversationId,
      organizationId: organization.id,
      userId: user.id,
    },
  });

  if (!conversation) throw new Error("Conversation not found");

  const message = await db.message.create({
    data: {
      conversationId,
      userId: role === "USER" ? user.id : null,
      role,
      content,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
    },
  });

  // Update conversation timestamp
  await db.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  // Auto-generate title from first user message if not set
  if (!conversation.title && role === "USER") {
    const title = content.slice(0, 50) + (content.length > 50 ? "..." : "");
    await db.conversation.update({
      where: { id: conversationId },
      data: { title },
    });
  }

  revalidatePath("/chat");
  return message;
}

// Send a message and get AI response
export async function sendMessage(conversationId: string, content: string) {
  const { user, organization } = await getCurrentUserAndOrg();
  if (!user || !organization) throw new Error("Not authorized");

  // Add user message
  await addMessage(conversationId, content, "USER");

  // Get organization context for AI
  const orgContext = await getOrganizationContext(organization.id);

  // Get conversation history for context
  const conversation = await db.conversation.findFirst({
    where: { id: conversationId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 20, // Last 20 messages for context
      },
    },
  });

  if (!conversation) throw new Error("Conversation not found");

  // Build messages array for AI
  const aiMessages: AIMessage[] = conversation.messages.map((m) => ({
    role: m.role === "USER" ? "user" : "assistant",
    content: m.content,
  }));

  // Add the current message if not already included
  if (aiMessages.length === 0 || aiMessages[aiMessages.length - 1].content !== content) {
    aiMessages.push({ role: "user", content });
  }

  try {
    // Call AI API
    const response = await chat(aiMessages, {
      organizationContext: orgContext || undefined,
    });

    // Add AI response
    await addMessage(conversationId, response.content, "ASSISTANT", {
      usage: response.usage,
    });
  } catch (error) {
    console.error("AI chat error:", error);

    // Fallback response if AI fails
    const fallbackResponse = generateFallbackResponse(content, orgContext?.name || "your business");
    await addMessage(conversationId, fallbackResponse, "ASSISTANT", {
      fallback: true,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  revalidatePath("/chat");
  return { success: true };
}

// Fallback response if AI API is unavailable
function generateFallbackResponse(userMessage: string, businessName: string): string {
  return `I apologize, but I'm having trouble connecting to my AI service right now.

In the meantime, here are some quick links that might help:
• **Clients** - Manage your client list at /clients
• **Invoices** - Create and track invoices at /invoices
• **Quotes** - Send proposals at /quotes
• **Bookings** - Manage appointments at /bookings
• **Time** - Track your hours at /time

Please try again in a moment, or navigate directly to the section you need help with.`;
}

// Get suggested prompts based on business data
export async function getSuggestedPrompts() {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return [];

  const [clientCount, pendingQuotes, unpaidInvoices, todayBookings] = await Promise.all([
    db.client.count({
      where: { organizationId: organization.id, archivedAt: null },
    }),
    db.quote.count({
      where: { organizationId: organization.id, status: { in: ["DRAFT", "SENT"] } },
    }),
    db.invoice.count({
      where: { organizationId: organization.id, status: { in: ["SENT", "OVERDUE"] } },
    }),
    db.booking.count({
      where: {
        organizationId: organization.id,
        status: { in: ["PENDING", "CONFIRMED"] },
        startsAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
    }),
  ]);

  const prompts = [];

  if (clientCount === 0) {
    prompts.push("Create a new client named John Smith from Acme Corp");
  } else {
    prompts.push("Show me my clients");
  }

  if (todayBookings > 0) {
    prompts.push("What's on my schedule today?");
  } else {
    prompts.push("Log 2 hours of development work");
  }

  if (unpaidInvoices > 0) {
    prompts.push("Show me unpaid invoices");
  } else if (pendingQuotes > 0) {
    prompts.push(`Check my ${pendingQuotes} pending quote${pendingQuotes > 1 ? "s" : ""}`);
  }

  // Always include an action-oriented prompt
  prompts.push("Give me a business summary");

  return prompts.slice(0, 4);
}
