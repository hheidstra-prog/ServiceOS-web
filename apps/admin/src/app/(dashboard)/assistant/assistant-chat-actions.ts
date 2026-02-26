"use server";

import Anthropic from "@anthropic-ai/sdk";
import { db } from "@servible/database";
import { requireAuthWithOrg } from "@/lib/auth";
import { getBusinessContext } from "@/lib/ai";
import { revalidatePath } from "next/cache";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

// ===========================================
// RESULT TYPES
// ===========================================

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClientResult {
  id: string;
  name: string;
  companyName: string | null;
  email: string | null;
  status: string;
  projectCount: number;
  invoiceCount: number;
}

export interface InvoiceResult {
  id: string;
  number: string;
  status: string;
  total: number;
  paidAmount: number;
  currency: string;
  dueDate: string;
  clientName: string;
  clientId: string;
}

export interface ProjectResult {
  id: string;
  name: string;
  status: string;
  clientName: string;
  clientId: string;
  startDate: string | null;
  endDate: string | null;
  taskCount: number;
  completedTaskCount: number;
}

export interface BookingResult {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  clientName: string | null;
  guestName: string | null;
  bookingTypeName: string | null;
}

export interface QuoteResult {
  id: string;
  number: string;
  status: string;
  total: number;
  currency: string;
  validUntil: string | null;
  clientName: string;
  clientId: string;
}

export interface BusinessSummaryResult {
  clientCount: number;
  activeProjectCount: number;
  pendingQuoteCount: number;
  unpaidInvoiceCount: number;
  unpaidInvoiceTotal: number;
  monthRevenue: number;
  todayBookingCount: number;
  currency: string;
}

export interface DraftEmailResult {
  subject?: string;
  body: string;
  recipientName: string;
}

export interface AssistantChatResult {
  content: string;
  actionsTaken?: string[];
  clientResults?: ClientResult[];
  invoiceResults?: InvoiceResult[];
  projectResults?: ProjectResult[];
  bookingResults?: BookingResult[];
  quoteResults?: QuoteResult[];
  businessSummary?: BusinessSummaryResult;
  draftEmail?: DraftEmailResult;
}

// ===========================================
// TOOL DEFINITIONS
// ===========================================

const ASSISTANT_TOOLS: Anthropic.Tool[] = [
  // CLIENT TOOLS
  {
    name: "search_clients",
    description:
      "Search for clients by name, company name, or email. Use this to find existing clients.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query (name, company, or email)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "list_clients",
    description:
      "List clients, optionally filtered by status. Use when user asks about their clients.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["LEAD", "PROSPECT", "CLIENT", "INACTIVE"],
          description: "Filter by client status",
        },
        limit: {
          type: "number",
          description: "Maximum number of clients to return (default 20)",
        },
      },
      required: [],
    },
  },
  {
    name: "create_client",
    description:
      "Create a new client in the system. Use when the user wants to add a new client or customer.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Contact person's full name" },
        companyName: {
          type: "string",
          description: "Company/business name (optional for individuals)",
        },
        email: { type: "string", description: "Email address" },
        phone: { type: "string", description: "Phone number" },
      },
      required: ["name"],
    },
  },

  // INVOICE TOOLS
  {
    name: "list_invoices",
    description:
      "List invoices, optionally filtered by status. Use when user asks about invoices.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["DRAFT", "SENT", "PAID", "OVERDUE", "PARTIALLY_PAID"],
          description: "Filter by invoice status",
        },
        limit: {
          type: "number",
          description: "Maximum number of invoices to return (default 20)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_unpaid_invoices",
    description:
      "Get all unpaid or overdue invoices. Use when user asks about outstanding payments.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "create_invoice",
    description:
      "Create a new invoice for a client. Use when user wants to bill a client.",
    input_schema: {
      type: "object" as const,
      properties: {
        clientName: {
          type: "string",
          description: "Client name to create invoice for",
        },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              quantity: { type: "number" },
              unitPrice: { type: "number" },
            },
          },
          description: "Invoice line items",
        },
        notes: {
          type: "string",
          description: "Notes to include on the invoice",
        },
      },
      required: ["clientName"],
    },
  },

  // PROJECT TOOLS
  {
    name: "list_projects",
    description:
      "List projects, optionally filtered by status. Use when user asks about their projects.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: [
            "NOT_STARTED",
            "IN_PROGRESS",
            "ON_HOLD",
            "COMPLETED",
            "CANCELLED",
          ],
          description: "Filter by project status",
        },
        limit: {
          type: "number",
          description: "Maximum number of projects to return (default 20)",
        },
      },
      required: [],
    },
  },
  {
    name: "create_project",
    description:
      "Create a new project for a client. Use when user wants to start a new project.",
    input_schema: {
      type: "object" as const,
      properties: {
        clientName: {
          type: "string",
          description: "Client name to create project for",
        },
        clientId: { type: "string", description: "Client ID (if known)" },
        name: { type: "string", description: "Project name" },
        description: { type: "string", description: "Project description" },
        budgetHours: {
          type: "number",
          description: "Estimated hours for the project",
        },
        budget: { type: "number", description: "Budget amount" },
      },
      required: ["name"],
    },
  },

  // BOOKING TOOLS
  {
    name: "list_bookings",
    description:
      "List upcoming bookings/appointments. Use when user asks about their schedule.",
    input_schema: {
      type: "object" as const,
      properties: {
        period: {
          type: "string",
          enum: ["today", "tomorrow", "this_week", "next_week"],
          description: "Time period to show",
        },
      },
      required: [],
    },
  },

  // QUOTE TOOLS
  {
    name: "list_quotes",
    description:
      "List quotes, optionally filtered by status. Use when user asks about quotes or proposals.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"],
          description: "Filter by quote status",
        },
        limit: {
          type: "number",
          description: "Maximum number of quotes to return (default 20)",
        },
      },
      required: [],
    },
  },
  {
    name: "create_quote",
    description:
      "Create a new quote/proposal for a client. Use when user wants to send a proposal.",
    input_schema: {
      type: "object" as const,
      properties: {
        clientName: {
          type: "string",
          description: "Client name to create quote for",
        },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              quantity: { type: "number" },
              unitPrice: { type: "number" },
            },
          },
          description: "Quote line items",
        },
        validDays: {
          type: "number",
          description: "Number of days the quote is valid (default 30)",
        },
      },
      required: ["clientName"],
    },
  },

  // BUSINESS SUMMARY
  {
    name: "get_business_summary",
    description:
      "Get a summary of the business status including client count, active projects, unpaid invoices, revenue, and today's bookings.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },

  // TIME TRACKING
  {
    name: "get_time_summary",
    description:
      "Get a summary of time tracked. Use when user asks about their time or hours.",
    input_schema: {
      type: "object" as const,
      properties: {
        period: {
          type: "string",
          enum: ["today", "this_week", "this_month", "last_month"],
          description: "Time period for the summary",
        },
        clientName: {
          type: "string",
          description: "Filter by client name",
        },
      },
      required: [],
    },
  },
  {
    name: "log_time",
    description:
      "Log time for work done. Use when user wants to track time spent.",
    input_schema: {
      type: "object" as const,
      properties: {
        clientName: {
          type: "string",
          description: "Client name to log time for",
        },
        projectName: {
          type: "string",
          description: "Project name to log time for",
        },
        description: {
          type: "string",
          description: "Description of work done",
        },
        hours: {
          type: "number",
          description: "Number of hours (can be decimal)",
        },
        minutes: {
          type: "number",
          description: "Number of minutes (alternative to hours)",
        },
        date: {
          type: "string",
          description: "Date of work (YYYY-MM-DD, defaults to today)",
        },
        billable: {
          type: "boolean",
          description: "Whether the time is billable (default true)",
        },
      },
      required: ["description"],
    },
  },

  // DRAFT EMAIL
  {
    name: "draft_email",
    description:
      "Draft a professional email for a client. Use when user wants to write an email, follow-up, reminder, or any client communication.",
    input_schema: {
      type: "object" as const,
      properties: {
        recipientName: {
          type: "string",
          description: "Name of the email recipient",
        },
        purpose: {
          type: "string",
          description:
            "Purpose of the email (e.g. follow-up, payment reminder, project update, thank you, proposal, introduction)",
        },
        context: {
          type: "string",
          description:
            "Additional context (e.g. invoice number, project name, specific details to include)",
        },
        tone: {
          type: "string",
          enum: ["formal", "professional", "friendly", "casual"],
          description: "Tone of the email (default: professional)",
        },
      },
      required: ["recipientName", "purpose"],
    },
  },
];

// ===========================================
// TOOL EXECUTION
// ===========================================

interface ToolResult {
  text: string;
  clientResults?: ClientResult[];
  invoiceResults?: InvoiceResult[];
  projectResults?: ProjectResult[];
  bookingResults?: BookingResult[];
  quoteResults?: QuoteResult[];
  businessSummary?: BusinessSummaryResult;
  draftEmail?: DraftEmailResult;
}

async function executeAssistantTool(
  toolName: string,
  input: Record<string, unknown>,
  organizationId: string
): Promise<ToolResult> {
  switch (toolName) {
    // ---- CLIENTS ----
    case "search_clients": {
      const query = input.query as string;
      const clients = await db.client.findMany({
        where: {
          organizationId,
          archivedAt: null,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { companyName: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 20,
        orderBy: { updatedAt: "desc" },
        include: {
          _count: { select: { projects: true, invoices: true } },
        },
      });

      const clientResults: ClientResult[] = clients.map((c) => ({
        id: c.id,
        name: c.name,
        companyName: c.companyName,
        email: c.email,
        status: c.status,
        projectCount: c._count.projects,
        invoiceCount: c._count.invoices,
      }));

      return {
        text: JSON.stringify({
          count: clients.length,
          clients: clientResults.map((c) => ({
            id: c.id,
            name: c.companyName || c.name,
            status: c.status,
            email: c.email,
          })),
        }),
        clientResults,
      };
    }

    case "list_clients": {
      const limit = (input.limit as number) || 20;
      const status = input.status as string | undefined;

      const where: Record<string, unknown> = {
        organizationId,
        archivedAt: null,
      };
      if (status) where.status = status;

      const clients = await db.client.findMany({
        where,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          _count: { select: { projects: true, invoices: true } },
        },
      });

      const total = await db.client.count({
        where: { organizationId, archivedAt: null },
      });

      const clientResults: ClientResult[] = clients.map((c) => ({
        id: c.id,
        name: c.name,
        companyName: c.companyName,
        email: c.email,
        status: c.status,
        projectCount: c._count.projects,
        invoiceCount: c._count.invoices,
      }));

      return {
        text: JSON.stringify({
          total,
          showing: clients.length,
          clients: clientResults.map((c) => ({
            id: c.id,
            name: c.companyName || c.name,
            status: c.status,
          })),
        }),
        clientResults,
      };
    }

    case "create_client": {
      const client = await db.client.create({
        data: {
          organizationId,
          name: input.name as string,
          companyName: (input.companyName as string) || null,
          email: (input.email as string) || null,
          phone: (input.phone as string) || null,
          status: "LEAD",
        },
      });

      revalidatePath("/clients");

      const clientResults: ClientResult[] = [
        {
          id: client.id,
          name: client.name,
          companyName: client.companyName,
          email: client.email,
          status: client.status,
          projectCount: 0,
          invoiceCount: 0,
        },
      ];

      return {
        text: JSON.stringify({
          success: true,
          clientId: client.id,
          name: client.companyName || client.name,
        }),
        clientResults,
      };
    }

    // ---- INVOICES ----
    case "list_invoices": {
      const limit = (input.limit as number) || 20;
      const status = input.status as string | undefined;

      const where: Record<string, unknown> = { organizationId };
      if (status) where.status = status;

      const invoices = await db.invoice.findMany({
        where,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { client: { select: { id: true, name: true, companyName: true } } },
      });

      const invoiceResults: InvoiceResult[] = invoices.map((inv) => ({
        id: inv.id,
        number: inv.number,
        status: inv.status,
        total: Number(inv.total),
        paidAmount: Number(inv.paidAmount),
        currency: inv.currency,
        dueDate: inv.dueDate?.toISOString() || "",
        clientName: inv.client.companyName || inv.client.name,
        clientId: inv.client.id,
      }));

      return {
        text: JSON.stringify({
          count: invoices.length,
          invoices: invoiceResults.map((i) => ({
            id: i.id,
            number: i.number,
            status: i.status,
            total: i.total,
            clientName: i.clientName,
          })),
        }),
        invoiceResults,
      };
    }

    case "get_unpaid_invoices": {
      const invoices = await db.invoice.findMany({
        where: {
          organizationId,
          status: { in: ["SENT", "OVERDUE", "PARTIALLY_PAID"] },
        },
        orderBy: { dueDate: "asc" },
        include: { client: { select: { id: true, name: true, companyName: true } } },
      });

      const invoiceResults: InvoiceResult[] = invoices.map((inv) => ({
        id: inv.id,
        number: inv.number,
        status: inv.status,
        total: Number(inv.total),
        paidAmount: Number(inv.paidAmount),
        currency: inv.currency,
        dueDate: inv.dueDate?.toISOString() || "",
        clientName: inv.client.companyName || inv.client.name,
        clientId: inv.client.id,
      }));

      const totalOutstanding = invoiceResults.reduce(
        (sum, inv) => sum + (inv.total - inv.paidAmount),
        0
      );

      return {
        text: JSON.stringify({
          count: invoices.length,
          totalOutstanding,
          invoices: invoiceResults.map((i) => ({
            number: i.number,
            status: i.status,
            outstanding: i.total - i.paidAmount,
            clientName: i.clientName,
          })),
        }),
        invoiceResults,
      };
    }

    case "create_invoice": {
      const client = await db.client.findFirst({
        where: {
          organizationId,
          archivedAt: null,
          OR: [
            {
              name: {
                contains: input.clientName as string,
                mode: "insensitive",
              },
            },
            {
              companyName: {
                contains: input.clientName as string,
                mode: "insensitive",
              },
            },
          ],
        },
      });

      if (!client) {
        return {
          text: JSON.stringify({
            error: `Could not find a client matching "${input.clientName}".`,
          }),
        };
      }

      const year = new Date().getFullYear();
      const lastInvoice = await db.invoice.findFirst({
        where: { organizationId, number: { startsWith: `INV-${year}-` } },
        orderBy: { number: "desc" },
      });
      let nextNum = 1;
      if (lastInvoice) {
        const parts = lastInvoice.number.split("-");
        nextNum = parseInt(parts[2], 10) + 1;
      }
      const invoiceNumber = `INV-${year}-${nextNum.toString().padStart(4, "0")}`;

      const org = await db.organization.findUnique({
        where: { id: organizationId },
        select: {
          defaultTaxRate: true,
          defaultPaymentTermDays: true,
          defaultCurrency: true,
        },
      });

      const taxRate = Number(org?.defaultTaxRate || 21);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (org?.defaultPaymentTermDays || 30));

      const items =
        (input.items as Array<{
          description: string;
          quantity: number;
          unitPrice: number;
        }>) || [];

      let subtotal = 0;
      let taxAmount = 0;
      let total = 0;

      const invoiceItems = items.map((item, index) => {
        const itemSubtotal = item.quantity * item.unitPrice;
        const itemTax = itemSubtotal * (taxRate / 100);
        const itemTotal = itemSubtotal + itemTax;
        subtotal += itemSubtotal;
        taxAmount += itemTax;
        total += itemTotal;
        return {
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate,
          subtotal: itemSubtotal,
          taxAmount: itemTax,
          total: itemTotal,
          sortOrder: index,
        };
      });

      const invoice = await db.invoice.create({
        data: {
          organizationId,
          clientId: client.id,
          number: invoiceNumber,
          notes: (input.notes as string) || null,
          paymentTerms: `Net ${org?.defaultPaymentTermDays || 30} days`,
          dueDate,
          status: "DRAFT",
          subtotal,
          taxAmount,
          total,
          paidAmount: 0,
          currency: org?.defaultCurrency || "EUR",
          items: items.length > 0 ? { create: invoiceItems } : undefined,
        },
      });

      revalidatePath("/invoices");

      const invoiceResults: InvoiceResult[] = [
        {
          id: invoice.id,
          number: invoice.number,
          status: invoice.status,
          total: Number(invoice.total),
          paidAmount: 0,
          currency: invoice.currency,
          dueDate: dueDate.toISOString(),
          clientName: client.companyName || client.name,
          clientId: client.id,
        },
      ];

      return {
        text: JSON.stringify({
          success: true,
          invoiceId: invoice.id,
          number: invoice.number,
          total,
        }),
        invoiceResults,
      };
    }

    // ---- PROJECTS ----
    case "list_projects": {
      const limit = (input.limit as number) || 20;
      const status = input.status as string | undefined;

      const where: Record<string, unknown> = { organizationId };
      if (status) where.status = status;

      const projects = await db.project.findMany({
        where,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          client: { select: { id: true, name: true, companyName: true } },
          _count: { select: { tasks: true } },
          tasks: { select: { status: true } },
        },
      });

      const projectResults: ProjectResult[] = projects.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        clientName: p.client.companyName || p.client.name,
        clientId: p.client.id,
        startDate: p.startDate?.toISOString() || null,
        endDate: p.endDate?.toISOString() || null,
        taskCount: p._count.tasks,
        completedTaskCount: p.tasks.filter((t) => t.status === "DONE").length,
      }));

      return {
        text: JSON.stringify({
          count: projects.length,
          projects: projectResults.map((p) => ({
            id: p.id,
            name: p.name,
            status: p.status,
            clientName: p.clientName,
            tasks: `${p.completedTaskCount}/${p.taskCount}`,
          })),
        }),
        projectResults,
      };
    }

    case "create_project": {
      let clientId = input.clientId as string | undefined;

      if (!clientId && input.clientName) {
        const client = await db.client.findFirst({
          where: {
            organizationId,
            archivedAt: null,
            OR: [
              {
                name: {
                  contains: input.clientName as string,
                  mode: "insensitive",
                },
              },
              {
                companyName: {
                  contains: input.clientName as string,
                  mode: "insensitive",
                },
              },
            ],
          },
        });
        if (!client) {
          return {
            text: JSON.stringify({
              error: `Could not find a client matching "${input.clientName}". Please create the client first.`,
            }),
          };
        }
        clientId = client.id;
      }

      if (!clientId) {
        return {
          text: JSON.stringify({
            error: "Please specify which client this project is for.",
          }),
        };
      }

      const project = await db.project.create({
        data: {
          organizationId,
          clientId,
          name: input.name as string,
          description: (input.description as string) || null,
          budgetHours: (input.budgetHours as number) || null,
          budget: (input.budget as number) || null,
          status: "NOT_STARTED",
          currency: "EUR",
        },
        include: {
          client: { select: { id: true, name: true, companyName: true } },
        },
      });

      revalidatePath("/projects");

      const projectResults: ProjectResult[] = [
        {
          id: project.id,
          name: project.name,
          status: project.status,
          clientName: project.client.companyName || project.client.name,
          clientId: project.client.id,
          startDate: null,
          endDate: null,
          taskCount: 0,
          completedTaskCount: 0,
        },
      ];

      return {
        text: JSON.stringify({
          success: true,
          projectId: project.id,
          name: project.name,
        }),
        projectResults,
      };
    }

    // ---- BOOKINGS ----
    case "list_bookings": {
      const period = (input.period as string) || "this_week";
      const now = new Date();
      let startDate: Date;
      let endDate: Date;

      switch (period) {
        case "today":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            23,
            59,
            59,
            999
          );
          break;
        case "tomorrow": {
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          startDate = new Date(
            tomorrow.getFullYear(),
            tomorrow.getMonth(),
            tomorrow.getDate()
          );
          endDate = new Date(
            tomorrow.getFullYear(),
            tomorrow.getMonth(),
            tomorrow.getDate(),
            23,
            59,
            59,
            999
          );
          break;
        }
        case "next_week": {
          const nextMonday = new Date(now);
          const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
          nextMonday.setDate(now.getDate() + daysUntilMonday);
          startDate = new Date(
            nextMonday.getFullYear(),
            nextMonday.getMonth(),
            nextMonday.getDate()
          );
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 6);
          endDate.setHours(23, 59, 59, 999);
          break;
        }
        default: {
          // this_week
          const dayOfWeek = now.getDay();
          const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
          const monday = new Date(now);
          monday.setDate(now.getDate() + diff);
          startDate = new Date(
            monday.getFullYear(),
            monday.getMonth(),
            monday.getDate()
          );
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 6);
          endDate.setHours(23, 59, 59, 999);
        }
      }

      const bookings = await db.booking.findMany({
        where: {
          organizationId,
          startsAt: { gte: startDate, lte: endDate },
          status: { in: ["PENDING", "CONFIRMED"] },
        },
        orderBy: { startsAt: "asc" },
        include: {
          client: { select: { name: true, companyName: true } },
          bookingType: { select: { name: true } },
        },
      });

      const bookingResults: BookingResult[] = bookings.map((b) => ({
        id: b.id,
        startsAt: b.startsAt.toISOString(),
        endsAt: b.endsAt.toISOString(),
        status: b.status,
        clientName: b.client?.companyName || b.client?.name || null,
        guestName: b.guestName || null,
        bookingTypeName: b.bookingType?.name || null,
      }));

      return {
        text: JSON.stringify({
          period,
          count: bookings.length,
          bookings: bookingResults.map((b) => ({
            id: b.id,
            time: b.startsAt,
            type: b.bookingTypeName,
            with: b.clientName || b.guestName || "Guest",
            status: b.status,
          })),
        }),
        bookingResults,
      };
    }

    // ---- QUOTES ----
    case "list_quotes": {
      const limit = (input.limit as number) || 20;
      const status = input.status as string | undefined;

      const where: Record<string, unknown> = { organizationId };
      if (status) where.status = status;

      const quotes = await db.quote.findMany({
        where,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          client: {
            select: { id: true, name: true, companyName: true },
          },
        },
      });

      const quoteResults: QuoteResult[] = quotes.map((q) => ({
        id: q.id,
        number: q.number,
        status: q.status,
        total: Number(q.total),
        currency: q.currency,
        validUntil: q.validUntil?.toISOString() || null,
        clientName: q.client.companyName || q.client.name,
        clientId: q.client.id,
      }));

      return {
        text: JSON.stringify({
          count: quotes.length,
          quotes: quoteResults.map((q) => ({
            id: q.id,
            number: q.number,
            status: q.status,
            total: q.total,
            clientName: q.clientName,
          })),
        }),
        quoteResults,
      };
    }

    case "create_quote": {
      const client = await db.client.findFirst({
        where: {
          organizationId,
          archivedAt: null,
          OR: [
            {
              name: {
                contains: input.clientName as string,
                mode: "insensitive",
              },
            },
            {
              companyName: {
                contains: input.clientName as string,
                mode: "insensitive",
              },
            },
          ],
        },
      });

      if (!client) {
        return {
          text: JSON.stringify({
            error: `Could not find a client matching "${input.clientName}".`,
          }),
        };
      }

      const year = new Date().getFullYear();
      const lastQuote = await db.quote.findFirst({
        where: { organizationId, number: { startsWith: `QUO-${year}-` } },
        orderBy: { number: "desc" },
      });
      let nextNum = 1;
      if (lastQuote) {
        const parts = lastQuote.number.split("-");
        nextNum = parseInt(parts[2], 10) + 1;
      }
      const quoteNumber = `QUO-${year}-${nextNum.toString().padStart(4, "0")}`;

      const validDays = (input.validDays as number) || 30;
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + validDays);

      const org = await db.organization.findUnique({
        where: { id: organizationId },
        select: { defaultTaxRate: true, defaultCurrency: true },
      });

      const taxRate = Number(org?.defaultTaxRate || 21);
      const items =
        (input.items as Array<{
          description: string;
          quantity: number;
          unitPrice: number;
        }>) || [];

      let subtotal = 0;
      let taxAmount = 0;
      let total = 0;

      const quoteItems = items.map((item, index) => {
        const itemSubtotal = item.quantity * item.unitPrice;
        const itemTax = itemSubtotal * (taxRate / 100);
        const itemTotal = itemSubtotal + itemTax;
        subtotal += itemSubtotal;
        taxAmount += itemTax;
        total += itemTotal;
        return {
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate,
          subtotal: itemSubtotal,
          taxAmount: itemTax,
          total: itemTotal,
          sortOrder: index,
          isOptional: false,
          isSelected: true,
        };
      });

      const quote = await db.quote.create({
        data: {
          organizationId,
          clientId: client.id,
          number: quoteNumber,
          validUntil,
          status: "DRAFT",
          subtotal,
          taxAmount,
          total,
          currency: org?.defaultCurrency || "EUR",
          items: items.length > 0 ? { create: quoteItems } : undefined,
        },
      });

      revalidatePath("/quotes");

      const quoteResults: QuoteResult[] = [
        {
          id: quote.id,
          number: quote.number,
          status: quote.status,
          total: Number(quote.total),
          currency: quote.currency,
          validUntil: validUntil.toISOString(),
          clientName: client.companyName || client.name,
          clientId: client.id,
        },
      ];

      return {
        text: JSON.stringify({
          success: true,
          quoteId: quote.id,
          number: quote.number,
          total,
        }),
        quoteResults,
      };
    }

    // ---- BUSINESS SUMMARY ----
    case "get_business_summary": {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
      const todayEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      );

      const [
        clientCount,
        activeProjects,
        pendingQuotes,
        unpaidInvoices,
        monthRevenue,
        todayBookings,
      ] = await Promise.all([
        db.client.count({ where: { organizationId, archivedAt: null } }),
        db.project.count({
          where: {
            organizationId,
            status: { in: ["NOT_STARTED", "IN_PROGRESS"] },
          },
        }),
        db.quote.count({
          where: { organizationId, status: { in: ["DRAFT", "SENT"] } },
        }),
        db.invoice.aggregate({
          where: { organizationId, status: { in: ["SENT", "OVERDUE"] } },
          _sum: { total: true },
          _count: true,
        }),
        db.invoice.aggregate({
          where: {
            organizationId,
            status: "PAID",
            paidAt: { gte: startOfMonth },
          },
          _sum: { total: true },
        }),
        db.booking.count({
          where: {
            organizationId,
            status: { in: ["PENDING", "CONFIRMED"] },
            startsAt: { gte: todayStart, lt: todayEnd },
          },
        }),
      ]);

      const org = await db.organization.findUnique({
        where: { id: organizationId },
        select: { defaultCurrency: true },
      });

      const summary: BusinessSummaryResult = {
        clientCount,
        activeProjectCount: activeProjects,
        pendingQuoteCount: pendingQuotes,
        unpaidInvoiceCount: unpaidInvoices._count,
        unpaidInvoiceTotal: Number(unpaidInvoices._sum.total || 0),
        monthRevenue: Number(monthRevenue._sum.total || 0),
        todayBookingCount: todayBookings,
        currency: org?.defaultCurrency || "EUR",
      };

      return {
        text: JSON.stringify(summary),
        businessSummary: summary,
      };
    }

    // ---- TIME TRACKING ----
    case "get_time_summary": {
      const period = (input.period as string) || "this_week";
      const now = new Date();
      let startDate: Date;
      let endDate = new Date();

      switch (period) {
        case "today":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          break;
        case "this_week": {
          const dayOfWeek = now.getDay();
          const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
          startDate = new Date(now);
          startDate.setDate(now.getDate() + diff);
          startDate.setHours(0, 0, 0, 0);
          break;
        }
        case "this_month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "last_month":
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0);
          break;
        default:
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
      }

      const where: Record<string, unknown> = {
        organizationId,
        date: { gte: startDate, lte: endDate },
      };

      if (input.clientName) {
        const client = await db.client.findFirst({
          where: {
            organizationId,
            OR: [
              {
                name: {
                  contains: input.clientName as string,
                  mode: "insensitive",
                },
              },
              {
                companyName: {
                  contains: input.clientName as string,
                  mode: "insensitive",
                },
              },
            ],
          },
        });
        if (client) where.clientId = client.id;
      }

      const entries = await db.timeEntry.aggregate({
        where,
        _sum: { duration: true },
        _count: true,
      });

      const billableEntries = await db.timeEntry.aggregate({
        where: { ...where, billable: true },
        _sum: { duration: true },
      });

      const totalMinutes = entries._sum.duration || 0;
      const billableMinutes = billableEntries._sum.duration || 0;

      return {
        text: JSON.stringify({
          period,
          totalHours: (totalMinutes / 60).toFixed(1),
          billableHours: (billableMinutes / 60).toFixed(1),
          entries: entries._count,
        }),
      };
    }

    case "log_time": {
      let clientId: string | undefined;
      let projectId: string | undefined;

      if (input.clientName) {
        const client = await db.client.findFirst({
          where: {
            organizationId,
            archivedAt: null,
            OR: [
              {
                name: {
                  contains: input.clientName as string,
                  mode: "insensitive",
                },
              },
              {
                companyName: {
                  contains: input.clientName as string,
                  mode: "insensitive",
                },
              },
            ],
          },
        });
        if (client) clientId = client.id;
      }

      if (input.projectName) {
        const project = await db.project.findFirst({
          where: {
            organizationId,
            name: {
              contains: input.projectName as string,
              mode: "insensitive",
            },
          },
        });
        if (project) {
          projectId = project.id;
          clientId = project.clientId;
        }
      }

      let duration = 0;
      if (input.hours) {
        duration = Math.round((input.hours as number) * 60);
      } else if (input.minutes) {
        duration = input.minutes as number;
      } else {
        return {
          text: JSON.stringify({
            error: "Please specify the duration (hours or minutes).",
          }),
        };
      }

      let date = new Date();
      if (input.date) {
        date = new Date(input.date as string);
      }
      date.setHours(0, 0, 0, 0);

      await db.timeEntry.create({
        data: {
          organizationId,
          clientId,
          projectId,
          description: input.description as string,
          date,
          duration,
          billable: input.billable !== false,
          currency: "EUR",
        },
      });

      revalidatePath("/time");

      const hours = Math.floor(duration / 60);
      const mins = duration % 60;
      const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

      return {
        text: JSON.stringify({
          success: true,
          duration: durationStr,
          description: input.description,
        }),
      };
    }

    // ---- DRAFT EMAIL ----
    case "draft_email": {
      const recipientName = input.recipientName as string;
      const purpose = input.purpose as string;
      const context = (input.context as string) || "";
      const tone = (input.tone as string) || "professional";

      // Use Claude to generate the email
      const emailResponse = await anthropic.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 1024,
        system: `You are an email writing assistant. Write a ${tone} email. Output ONLY the email body text — no subject line, no greeting label, no sign-off label. Start directly with the greeting (e.g. "Dear..."). Keep it concise and professional.`,
        messages: [
          {
            role: "user",
            content: `Write an email to ${recipientName}.\nPurpose: ${purpose}\n${context ? `Context: ${context}` : ""}\nTone: ${tone}`,
          },
        ],
      });

      const emailBody =
        emailResponse.content
          .filter(
            (b): b is Anthropic.TextBlock => b.type === "text"
          )
          .map((b) => b.text)
          .join("\n") || "";

      // Extract subject from first line if present
      let subject: string | undefined;
      let body = emailBody;
      if (emailBody.startsWith("Subject:")) {
        const lines = emailBody.split("\n");
        subject = lines[0].replace("Subject:", "").trim();
        body = lines.slice(1).join("\n").trim();
      }

      const draftEmail: DraftEmailResult = {
        subject,
        body,
        recipientName,
      };

      return {
        text: JSON.stringify({ success: true, emailDrafted: true }),
        draftEmail,
      };
    }

    default:
      return { text: JSON.stringify({ error: `Unknown tool: ${toolName}` }) };
  }
}

// ===========================================
// MAIN CHAT FUNCTION
// ===========================================

export async function chatAssistant(
  messages: ChatMessage[]
): Promise<AssistantChatResult> {
  const { organization } = await requireAuthWithOrg();

  const businessContext = await getBusinessContext(organization.id);

  const locale = organization.locale || "en";
  const localeInstructions: Record<string, string> = {
    nl: "The user prefers Dutch. Respond in Dutch unless they write in another language.",
    en: "The user prefers English.",
    de: "The user prefers German. Respond in German unless they write in another language.",
    fr: "The user prefers French. Respond in French unless they write in another language.",
  };

  const systemPrompt = `You are a business assistant for ${businessContext?.name || "a service business"} powered by Servible.
${businessContext?.industry ? `Industry: ${businessContext.industry}` : ""}
${businessContext?.description ? `Description: ${businessContext.description}` : ""}
${businessContext?.toneOfVoice ? `Communication tone: ${businessContext.toneOfVoice}` : ""}
${localeInstructions[locale] || localeInstructions.en}

You help manage clients, invoices, projects, quotes, bookings, time tracking, and business communications.

RULES — follow strictly:
1. USE TOOLS — when the user asks about data, use the appropriate tool to fetch real data. Never make up numbers or lists.
2. CONCISE — the UI renders structured cards in a side panel. Don't repeat entity details the user can see in the cards. Reply in 1-2 sentences max.
3. SEARCH FIRST — if you need to reference a specific client, search for them before performing actions.
4. CREATION FEEDBACK — after creating an entity, briefly confirm what was created. The card will appear in the side panel.
5. DRAFT EMAILS — when asked to write emails, use the draft_email tool. The email will appear as a copyable card.
6. CURRENCY — use ${businessContext?.services?.[0]?.price?.split(" ")[0] || "EUR"} as default currency unless specified otherwise.
7. DATE FORMAT — use European format (DD-MM-YYYY).

Tools available: search_clients, list_clients, create_client, list_invoices, get_unpaid_invoices, create_invoice, list_projects, create_project, list_bookings, list_quotes, create_quote, get_business_summary, get_time_summary, log_time, draft_email.`;

  const apiMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const actionsTaken: string[] = [];
  let collectedClientResults: ClientResult[] = [];
  let collectedInvoiceResults: InvoiceResult[] = [];
  let collectedProjectResults: ProjectResult[] = [];
  let collectedBookingResults: BookingResult[] = [];
  let collectedQuoteResults: QuoteResult[] = [];
  let collectedBusinessSummary: BusinessSummaryResult | undefined;
  let collectedDraftEmail: DraftEmailResult | undefined;

  let iterations = 0;
  const maxIterations = 5;

  let response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    tools: ASSISTANT_TOOLS,
    messages: apiMessages,
  });

  while (response.stop_reason === "tool_use" && iterations < maxIterations) {
    iterations++;

    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ContentBlock & { type: "tool_use" } =>
        b.type === "tool_use"
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of toolUseBlocks) {
      const result = await executeAssistantTool(
        block.name,
        block.input as Record<string, unknown>,
        organization.id
      );
      actionsTaken.push(block.name);

      // Collect structured results
      if (result.clientResults) collectedClientResults = result.clientResults;
      if (result.invoiceResults)
        collectedInvoiceResults = result.invoiceResults;
      if (result.projectResults)
        collectedProjectResults = result.projectResults;
      if (result.bookingResults)
        collectedBookingResults = result.bookingResults;
      if (result.quoteResults) collectedQuoteResults = result.quoteResults;
      if (result.businessSummary)
        collectedBusinessSummary = result.businessSummary;
      if (result.draftEmail) collectedDraftEmail = result.draftEmail;

      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: result.text,
      });
    }

    response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      tools: ASSISTANT_TOOLS,
      messages: [
        ...apiMessages,
        { role: "assistant", content: response.content },
        { role: "user", content: toolResults },
      ],
    });
  }

  const textContent = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  return {
    content: textContent,
    actionsTaken: actionsTaken.length > 0 ? actionsTaken : undefined,
    clientResults:
      collectedClientResults.length > 0 ? collectedClientResults : undefined,
    invoiceResults:
      collectedInvoiceResults.length > 0 ? collectedInvoiceResults : undefined,
    projectResults:
      collectedProjectResults.length > 0
        ? collectedProjectResults
        : undefined,
    bookingResults:
      collectedBookingResults.length > 0
        ? collectedBookingResults
        : undefined,
    quoteResults:
      collectedQuoteResults.length > 0 ? collectedQuoteResults : undefined,
    businessSummary: collectedBusinessSummary,
    draftEmail: collectedDraftEmail,
  };
}

// ===========================================
// INITIAL DATA LOAD
// ===========================================

export interface RecentActivity {
  bookings: BookingResult[];
  invoices: InvoiceResult[];
  projects: ProjectResult[];
}

export async function getRecentActivity(): Promise<RecentActivity> {
  const { organization } = await requireAuthWithOrg();
  const orgId = organization.id;

  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [upcomingBookings, unpaidInvoices, activeProjects] = await Promise.all([
    db.booking.findMany({
      where: {
        organizationId: orgId,
        startsAt: { gte: now, lte: weekEnd },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      orderBy: { startsAt: "asc" },
      take: 5,
      include: {
        client: { select: { name: true, companyName: true } },
        bookingType: { select: { name: true } },
      },
    }),
    db.invoice.findMany({
      where: {
        organizationId: orgId,
        status: { in: ["SENT", "OVERDUE", "PARTIALLY_PAID"] },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
      include: {
        client: {
          select: { id: true, name: true, companyName: true },
        },
      },
    }),
    db.project.findMany({
      where: {
        organizationId: orgId,
        status: { in: ["NOT_STARTED", "IN_PROGRESS"] },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: {
        client: { select: { id: true, name: true, companyName: true } },
        _count: { select: { tasks: true } },
        tasks: { select: { status: true } },
      },
    }),
  ]);

  return {
    bookings: upcomingBookings.map((b) => ({
      id: b.id,
      startsAt: b.startsAt.toISOString(),
      endsAt: b.endsAt.toISOString(),
      status: b.status,
      clientName: b.client?.companyName || b.client?.name || null,
      guestName: b.guestName || null,
      bookingTypeName: b.bookingType?.name || null,
    })),
    invoices: unpaidInvoices.map((inv) => ({
      id: inv.id,
      number: inv.number,
      status: inv.status,
      total: Number(inv.total),
      paidAmount: Number(inv.paidAmount),
      currency: inv.currency,
      dueDate: inv.dueDate?.toISOString() || "",
      clientName: inv.client.companyName || inv.client.name,
      clientId: inv.client.id,
    })),
    projects: activeProjects.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      clientName: p.client.companyName || p.client.name,
      clientId: p.client.id,
      startDate: p.startDate?.toISOString() || null,
      endDate: p.endDate?.toISOString() || null,
      taskCount: p._count.tasks,
      completedTaskCount: p.tasks.filter((t) => t.status === "DONE").length,
    })),
  };
}

export async function getAssistantCounts() {
  const { organization } = await requireAuthWithOrg();
  const orgId = organization.id;

  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const todayEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  );

  const [clientCount, activeProjectCount, unpaidInvoiceCount, todayBookingCount] =
    await Promise.all([
      db.client.count({ where: { organizationId: orgId, archivedAt: null } }),
      db.project.count({
        where: {
          organizationId: orgId,
          status: { in: ["NOT_STARTED", "IN_PROGRESS"] },
        },
      }),
      db.invoice.count({
        where: {
          organizationId: orgId,
          status: { in: ["SENT", "OVERDUE", "PARTIALLY_PAID"] },
        },
      }),
      db.booking.count({
        where: {
          organizationId: orgId,
          status: { in: ["PENDING", "CONFIRMED"] },
          startsAt: { gte: todayStart, lt: todayEnd },
        },
      }),
    ]);

  return { clientCount, activeProjectCount, unpaidInvoiceCount, todayBookingCount };
}
