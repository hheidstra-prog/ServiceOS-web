import { db } from "@/lib/db";
import { Tool } from "@anthropic-ai/sdk/resources/messages";

// ===========================================
// TOOL DEFINITIONS
// ===========================================

export const AI_TOOLS: Tool[] = [
  // CLIENT TOOLS
  {
    name: "create_client",
    description: "Create a new client in the system. Use this when the user wants to add a new client or customer.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "The contact person's full name",
        },
        companyName: {
          type: "string",
          description: "The company/business name (optional for individuals)",
        },
        email: {
          type: "string",
          description: "Email address",
        },
        phone: {
          type: "string",
          description: "Phone number",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "search_clients",
    description: "Search for clients by name or company name. Use this to find existing clients.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query (name or company name)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "list_clients",
    description: "List all clients or get a summary. Use when user asks about their clients.",
    input_schema: {
      type: "object" as const,
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of clients to return (default 10)",
        },
      },
      required: [],
    },
  },

  // PROJECT TOOLS
  {
    name: "create_project",
    description: "Create a new project for a client. Use when user wants to start a new project.",
    input_schema: {
      type: "object" as const,
      properties: {
        clientId: {
          type: "string",
          description: "The client ID to create the project for",
        },
        clientName: {
          type: "string",
          description: "If clientId is not known, provide the client name to search for",
        },
        name: {
          type: "string",
          description: "Project name",
        },
        description: {
          type: "string",
          description: "Project description",
        },
        budgetHours: {
          type: "number",
          description: "Estimated hours for the project",
        },
        budget: {
          type: "number",
          description: "Budget amount in euros",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "list_projects",
    description: "List projects, optionally filtered by status. Use when user asks about their projects.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["NOT_STARTED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"],
          description: "Filter by project status",
        },
        limit: {
          type: "number",
          description: "Maximum number of projects to return",
        },
      },
      required: [],
    },
  },

  // TIME TRACKING TOOLS
  {
    name: "log_time",
    description: "Log time for work done. Use when user wants to track time spent on work.",
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
          description: "Number of hours (can be decimal, e.g., 1.5)",
        },
        minutes: {
          type: "number",
          description: "Number of minutes (alternative to hours)",
        },
        date: {
          type: "string",
          description: "Date of work (YYYY-MM-DD format, defaults to today)",
        },
        billable: {
          type: "boolean",
          description: "Whether the time is billable (default true)",
        },
      },
      required: ["description"],
    },
  },
  {
    name: "get_time_summary",
    description: "Get a summary of time tracked. Use when user asks about their time or hours.",
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

  // INVOICE TOOLS
  {
    name: "create_invoice",
    description: "Create a new invoice for a client. Use when user wants to bill a client.",
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
  {
    name: "list_invoices",
    description: "List invoices, optionally filtered by status. Use when user asks about invoices.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["DRAFT", "SENT", "PAID", "OVERDUE"],
          description: "Filter by invoice status",
        },
        limit: {
          type: "number",
          description: "Maximum number of invoices to return",
        },
      },
      required: [],
    },
  },
  {
    name: "get_unpaid_invoices",
    description: "Get all unpaid or overdue invoices. Use when user asks about outstanding payments.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },

  // QUOTE TOOLS
  {
    name: "create_quote",
    description: "Create a new quote/proposal for a client. Use when user wants to send a proposal.",
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

  // BOOKING TOOLS
  {
    name: "list_bookings",
    description: "List upcoming bookings/appointments. Use when user asks about their schedule.",
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

  // DASHBOARD/SUMMARY TOOLS
  {
    name: "get_business_summary",
    description: "Get a summary of the business status. Use when user asks for an overview or dashboard info.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

// ===========================================
// TOOL EXECUTION
// ===========================================

export async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  organizationId: string
): Promise<{ success: boolean; result: string; data?: unknown }> {
  try {
    switch (toolName) {
      case "create_client":
        return await createClient(input, organizationId);
      case "search_clients":
        return await searchClients(input, organizationId);
      case "list_clients":
        return await listClients(input, organizationId);
      case "create_project":
        return await createProject(input, organizationId);
      case "list_projects":
        return await listProjects(input, organizationId);
      case "log_time":
        return await logTime(input, organizationId);
      case "get_time_summary":
        return await getTimeSummary(input, organizationId);
      case "create_invoice":
        return await createInvoice(input, organizationId);
      case "list_invoices":
        return await listInvoices(input, organizationId);
      case "get_unpaid_invoices":
        return await getUnpaidInvoices(organizationId);
      case "create_quote":
        return await createQuote(input, organizationId);
      case "list_bookings":
        return await listBookings(input, organizationId);
      case "get_business_summary":
        return await getBusinessSummary(organizationId);
      default:
        return { success: false, result: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    console.error(`Tool execution error (${toolName}):`, error);
    return {
      success: false,
      result: `Error executing ${toolName}: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// ===========================================
// TOOL IMPLEMENTATIONS
// ===========================================

async function createClient(
  input: Record<string, unknown>,
  organizationId: string
) {
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

  return {
    success: true,
    result: `Created client "${client.companyName || client.name}" with ID ${client.id}`,
    data: { clientId: client.id, name: client.companyName || client.name },
  };
}

async function searchClients(
  input: Record<string, unknown>,
  organizationId: string
) {
  const query = (input.query as string).toLowerCase();

  const clients = await db.client.findMany({
    where: {
      organizationId,
      archivedAt: null,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { companyName: { contains: query, mode: "insensitive" } },
      ],
    },
    take: 5,
    select: { id: true, name: true, companyName: true, email: true },
  });

  if (clients.length === 0) {
    return { success: true, result: `No clients found matching "${query}"` };
  }

  const clientList = clients
    .map((c) => `- ${c.companyName || c.name}${c.email ? ` (${c.email})` : ""}`)
    .join("\n");

  return {
    success: true,
    result: `Found ${clients.length} client(s):\n${clientList}`,
    data: clients,
  };
}

async function listClients(
  input: Record<string, unknown>,
  organizationId: string
) {
  const limit = (input.limit as number) || 10;

  const clients = await db.client.findMany({
    where: { organizationId, archivedAt: null },
    take: limit,
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, companyName: true, status: true },
  });

  const total = await db.client.count({
    where: { organizationId, archivedAt: null },
  });

  if (clients.length === 0) {
    return { success: true, result: "No clients found. Would you like to create one?" };
  }

  const clientList = clients
    .map((c) => `- ${c.companyName || c.name} (${c.status.toLowerCase()})`)
    .join("\n");

  return {
    success: true,
    result: `You have ${total} client(s). Here are the most recent:\n${clientList}`,
    data: clients,
  };
}

async function createProject(
  input: Record<string, unknown>,
  organizationId: string
) {
  let clientId = input.clientId as string | undefined;

  // If no clientId, try to find by name
  if (!clientId && input.clientName) {
    const client = await db.client.findFirst({
      where: {
        organizationId,
        archivedAt: null,
        OR: [
          { name: { contains: input.clientName as string, mode: "insensitive" } },
          { companyName: { contains: input.clientName as string, mode: "insensitive" } },
        ],
      },
    });

    if (!client) {
      return {
        success: false,
        result: `Could not find a client matching "${input.clientName}". Please create the client first or provide the exact name.`,
      };
    }
    clientId = client.id;
  }

  if (!clientId) {
    return {
      success: false,
      result: "Please specify which client this project is for.",
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
    include: { client: { select: { name: true, companyName: true } } },
  });

  return {
    success: true,
    result: `Created project "${project.name}" for ${project.client.companyName || project.client.name}`,
    data: { projectId: project.id, name: project.name },
  };
}

async function listProjects(
  input: Record<string, unknown>,
  organizationId: string
) {
  const limit = (input.limit as number) || 10;
  const status = input.status as string | undefined;

  const where: Record<string, unknown> = { organizationId };
  if (status) {
    where.status = status;
  }

  const projects = await db.project.findMany({
    where,
    take: limit,
    orderBy: { updatedAt: "desc" },
    include: { client: { select: { name: true, companyName: true } } },
  });

  if (projects.length === 0) {
    return { success: true, result: "No projects found." };
  }

  const projectList = projects
    .map(
      (p) =>
        `- ${p.name} (${p.client.companyName || p.client.name}) - ${p.status.toLowerCase().replace("_", " ")}`
    )
    .join("\n");

  return {
    success: true,
    result: `Found ${projects.length} project(s):\n${projectList}`,
    data: projects,
  };
}

async function logTime(
  input: Record<string, unknown>,
  organizationId: string
) {
  let clientId: string | undefined;
  let projectId: string | undefined;

  // Find client if specified
  if (input.clientName) {
    const client = await db.client.findFirst({
      where: {
        organizationId,
        archivedAt: null,
        OR: [
          { name: { contains: input.clientName as string, mode: "insensitive" } },
          { companyName: { contains: input.clientName as string, mode: "insensitive" } },
        ],
      },
    });
    if (client) clientId = client.id;
  }

  // Find project if specified
  if (input.projectName) {
    const project = await db.project.findFirst({
      where: {
        organizationId,
        name: { contains: input.projectName as string, mode: "insensitive" },
      },
    });
    if (project) {
      projectId = project.id;
      clientId = project.clientId;
    }
  }

  // Calculate duration in minutes
  let duration = 0;
  if (input.hours) {
    duration = Math.round((input.hours as number) * 60);
  } else if (input.minutes) {
    duration = input.minutes as number;
  } else {
    return { success: false, result: "Please specify the duration (hours or minutes)." };
  }

  // Parse date
  let date = new Date();
  if (input.date) {
    date = new Date(input.date as string);
  }
  date.setHours(0, 0, 0, 0);

  const timeEntry = await db.timeEntry.create({
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
    include: {
      client: { select: { name: true, companyName: true } },
      project: { select: { name: true } },
    },
  });

  const hours = Math.floor(duration / 60);
  const mins = duration % 60;
  const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  let result = `Logged ${durationStr} for "${timeEntry.description}"`;
  if (timeEntry.project) result += ` on project "${timeEntry.project.name}"`;
  if (timeEntry.client) result += ` for ${timeEntry.client.companyName || timeEntry.client.name}`;

  return { success: true, result, data: { timeEntryId: timeEntry.id } };
}

async function getTimeSummary(
  input: Record<string, unknown>,
  organizationId: string
) {
  const period = (input.period as string) || "this_week";

  const now = new Date();
  let startDate: Date;
  let endDate = new Date();

  switch (period) {
    case "today":
      startDate = new Date(now.setHours(0, 0, 0, 0));
      break;
    case "this_week":
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startDate = new Date(now);
      startDate.setDate(now.getDate() + diff);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "this_month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "last_month":
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    default:
      startDate = new Date(now.setHours(0, 0, 0, 0));
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
          { name: { contains: input.clientName as string, mode: "insensitive" } },
          { companyName: { contains: input.clientName as string, mode: "insensitive" } },
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
  const totalHours = (totalMinutes / 60).toFixed(1);
  const billableHours = (billableMinutes / 60).toFixed(1);

  return {
    success: true,
    result: `Time tracked (${period.replace("_", " ")}): ${totalHours}h total, ${billableHours}h billable (${entries._count} entries)`,
  };
}

async function createInvoice(
  input: Record<string, unknown>,
  organizationId: string
) {
  // Find client
  const client = await db.client.findFirst({
    where: {
      organizationId,
      archivedAt: null,
      OR: [
        { name: { contains: input.clientName as string, mode: "insensitive" } },
        { companyName: { contains: input.clientName as string, mode: "insensitive" } },
      ],
    },
  });

  if (!client) {
    return {
      success: false,
      result: `Could not find a client matching "${input.clientName}".`,
    };
  }

  // Generate invoice number
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

  // Get organization for defaults
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { defaultTaxRate: true, defaultPaymentTermDays: true, defaultCurrency: true },
  });

  const taxRate = Number(org?.defaultTaxRate || 21);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (org?.defaultPaymentTermDays || 30));

  // Create invoice
  const items = (input.items as Array<{ description: string; quantity: number; unitPrice: number }>) || [];

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

  return {
    success: true,
    result: `Created invoice ${invoice.number} for ${client.companyName || client.name}${total > 0 ? ` (€${total.toFixed(2)})` : ""}. The invoice is saved as a draft.`,
    data: { invoiceId: invoice.id, number: invoice.number },
  };
}

async function listInvoices(
  input: Record<string, unknown>,
  organizationId: string
) {
  const limit = (input.limit as number) || 10;
  const status = input.status as string | undefined;

  const where: Record<string, unknown> = { organizationId };
  if (status) where.status = status;

  const invoices = await db.invoice.findMany({
    where,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { client: { select: { name: true, companyName: true } } },
  });

  if (invoices.length === 0) {
    return { success: true, result: "No invoices found." };
  }

  const invoiceList = invoices
    .map(
      (inv) =>
        `- ${inv.number}: ${inv.client.companyName || inv.client.name} - €${Number(inv.total).toFixed(2)} (${inv.status.toLowerCase()})`
    )
    .join("\n");

  return {
    success: true,
    result: `Found ${invoices.length} invoice(s):\n${invoiceList}`,
  };
}

async function getUnpaidInvoices(organizationId: string) {
  const invoices = await db.invoice.findMany({
    where: {
      organizationId,
      status: { in: ["SENT", "OVERDUE", "PARTIALLY_PAID"] },
    },
    orderBy: { dueDate: "asc" },
    include: { client: { select: { name: true, companyName: true } } },
  });

  if (invoices.length === 0) {
    return { success: true, result: "No unpaid invoices. All caught up! 🎉" };
  }

  const total = invoices.reduce((sum, inv) => sum + Number(inv.total) - Number(inv.paidAmount), 0);

  const invoiceList = invoices
    .map((inv) => {
      const outstanding = Number(inv.total) - Number(inv.paidAmount);
      const isOverdue = inv.status === "OVERDUE";
      return `- ${inv.number}: ${inv.client.companyName || inv.client.name} - €${outstanding.toFixed(2)}${isOverdue ? " (OVERDUE)" : ""}`;
    })
    .join("\n");

  return {
    success: true,
    result: `${invoices.length} unpaid invoice(s) totaling €${total.toFixed(2)}:\n${invoiceList}`,
  };
}

async function createQuote(
  input: Record<string, unknown>,
  organizationId: string
) {
  // Find client
  const client = await db.client.findFirst({
    where: {
      organizationId,
      archivedAt: null,
      OR: [
        { name: { contains: input.clientName as string, mode: "insensitive" } },
        { companyName: { contains: input.clientName as string, mode: "insensitive" } },
      ],
    },
  });

  if (!client) {
    return {
      success: false,
      result: `Could not find a client matching "${input.clientName}".`,
    };
  }

  // Generate quote number
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

  // Get organization for defaults
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { defaultTaxRate: true, defaultCurrency: true },
  });

  const taxRate = Number(org?.defaultTaxRate || 21);

  // Create quote
  const items = (input.items as Array<{ description: string; quantity: number; unitPrice: number }>) || [];

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

  return {
    success: true,
    result: `Created quote ${quote.number} for ${client.companyName || client.name}${total > 0 ? ` (€${total.toFixed(2)})` : ""}. The quote is saved as a draft.`,
    data: { quoteId: quote.id, number: quote.number },
  };
}

async function listBookings(
  input: Record<string, unknown>,
  organizationId: string
) {
  const period = (input.period as string) || "this_week";

  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  switch (period) {
    case "today":
      startDate = new Date(now.setHours(0, 0, 0, 0));
      endDate = new Date(now.setHours(23, 59, 59, 999));
      break;
    case "tomorrow":
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() + 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
      break;
    case "next_week":
      const nextMonday = new Date(now);
      const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
      nextMonday.setDate(now.getDate() + daysUntilMonday);
      nextMonday.setHours(0, 0, 0, 0);
      startDate = nextMonday;
      endDate = new Date(nextMonday);
      endDate.setDate(endDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;
    default: // this_week
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startDate = new Date(now);
      startDate.setDate(now.getDate() + diff);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
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

  if (bookings.length === 0) {
    return { success: true, result: `No bookings scheduled for ${period.replace("_", " ")}.` };
  }

  const bookingList = bookings
    .map((b) => {
      const date = new Date(b.startsAt).toLocaleDateString("nl-NL", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
      const time = new Date(b.startsAt).toLocaleTimeString("nl-NL", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `- ${date} ${time}: ${b.bookingType?.name || "Booking"} with ${b.client?.companyName || b.client?.name || b.guestName || "Guest"}`;
    })
    .join("\n");

  return {
    success: true,
    result: `${bookings.length} booking(s) for ${period.replace("_", " ")}:\n${bookingList}`,
  };
}

async function getBusinessSummary(organizationId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

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
      where: { organizationId, status: { in: ["NOT_STARTED", "IN_PROGRESS"] } },
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
      where: { organizationId, status: "PAID", paidAt: { gte: startOfMonth } },
      _sum: { total: true },
    }),
    db.booking.count({
      where: {
        organizationId,
        status: { in: ["PENDING", "CONFIRMED"] },
        startsAt: {
          gte: new Date(now.setHours(0, 0, 0, 0)),
          lt: new Date(now.setHours(23, 59, 59, 999)),
        },
      },
    }),
  ]);

  const unpaidTotal = Number(unpaidInvoices._sum.total || 0);
  const revenueTotal = Number(monthRevenue._sum.total || 0);

  const summary = [
    `📊 **Business Summary**`,
    ``,
    `**Clients:** ${clientCount}`,
    `**Active Projects:** ${activeProjects}`,
    `**Pending Quotes:** ${pendingQuotes}`,
    `**Unpaid Invoices:** ${unpaidInvoices._count} (€${unpaidTotal.toFixed(2)})`,
    `**Revenue This Month:** €${revenueTotal.toFixed(2)}`,
    `**Bookings Today:** ${todayBookings}`,
  ].join("\n");

  return { success: true, result: summary };
}
