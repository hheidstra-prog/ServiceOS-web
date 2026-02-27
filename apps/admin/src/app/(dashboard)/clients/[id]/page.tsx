import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getClient } from "../actions";
import { ClientStatus } from "@servible/database";
import { ClientActions } from "./client-actions";
import { OverviewTab } from "./tabs/overview-tab";
import { DetailsTab } from "./tabs/details-tab";
import { ContactsTab } from "./tabs/contacts-tab";
import { ProjectsTab } from "./tabs/projects-tab";
import { NotesTab } from "./tabs/notes-tab";
import { ActivityTab } from "./tabs/activity-tab";
import { BookingsTab } from "./tabs/bookings-tab";
import { QuotesTab } from "./tabs/quotes-tab";
import { InvoicesTab } from "./tabs/invoices-tab";

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

// Serialize Decimal and other non-plain objects for client components
function serializeClient(client: NonNullable<Awaited<ReturnType<typeof getClient>>>) {
  return {
    ...client,
    projects: client.projects.map((project) => ({
      ...project,
      budget: project.budget ? Number(project.budget) : null,
    })),
    quotes: client.quotes.map((quote) => ({
      ...quote,
      subtotal: Number(quote.subtotal),
      taxAmount: Number(quote.taxAmount),
      total: Number(quote.total),
    })),
    invoices: client.invoices.map((invoice) => ({
      ...invoice,
      subtotal: Number(invoice.subtotal),
      taxAmount: Number(invoice.taxAmount),
      total: Number(invoice.total),
      paidAmount: Number(invoice.paidAmount),
    })),
  };
}

const statusColors: Record<ClientStatus, string> = {
  LEAD: "bg-sky-100 text-sky-800",
  PROSPECT: "bg-violet-100 text-violet-800",
  CLIENT: "bg-emerald-100 text-emerald-800",
  ARCHIVED: "bg-zinc-100 text-zinc-500",
};

const statusLabels: Record<ClientStatus, string> = {
  LEAD: "Lead",
  PROSPECT: "Prospect",
  CLIENT: "Client",
  ARCHIVED: "Archived",
};

export default async function ClientDetailPage({ params, searchParams }: ClientDetailPageProps) {
  const { id } = await params;
  const { tab } = await searchParams;
  const rawClient = await getClient(id);

  if (!rawClient) {
    notFound();
  }

  // Serialize Decimal values for client components
  const client = serializeClient(rawClient);
  const defaultTab = tab || "overview";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/clients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 sm:gap-3">
            <h1 className="truncate text-xl font-bold sm:text-2xl">{client.name}</h1>
            <Badge variant="secondary" className={statusColors[client.status]}>
              {statusLabels[client.status]}
            </Badge>
          </div>
          {client.companyName && (
            <p className="text-muted-foreground">{client.companyName}</p>
          )}
        </div>
        <ClientActions client={{ id: client.id, status: client.status }} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="contacts">
            Contacts ({client.contacts.length})
          </TabsTrigger>
          <TabsTrigger value="projects">
            Projects ({client.projects.length})
          </TabsTrigger>
          <TabsTrigger value="bookings">
            Bookings ({client.bookings.length})
          </TabsTrigger>
          <TabsTrigger value="notes">
            Notes ({client.notes.length})
          </TabsTrigger>
          <TabsTrigger value="quotes">
            Quotes ({client.quotes.length})
          </TabsTrigger>
          <TabsTrigger value="invoices">
            Invoices ({client.invoices.length})
          </TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab client={client} />
        </TabsContent>

        <TabsContent value="details">
          <DetailsTab client={client} />
        </TabsContent>

        <TabsContent value="contacts">
          <ContactsTab client={client} />
        </TabsContent>

        <TabsContent value="projects">
          <ProjectsTab client={client} />
        </TabsContent>

        <TabsContent value="bookings">
          <BookingsTab client={client} />
        </TabsContent>

        <TabsContent value="notes">
          <NotesTab client={client} />
        </TabsContent>

        <TabsContent value="quotes">
          <QuotesTab client={client} />
        </TabsContent>

        <TabsContent value="invoices">
          <InvoicesTab client={client} />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityTab client={client} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
