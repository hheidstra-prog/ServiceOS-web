import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getClient } from "../actions";
import { ClientStatus } from "@serviceos/database";
import { ClientActions } from "./client-actions";
import { OverviewTab } from "./tabs/overview-tab";
import { DetailsTab } from "./tabs/details-tab";
import { ContactsTab } from "./tabs/contacts-tab";
import { ProjectsTab } from "./tabs/projects-tab";
import { NotesTab } from "./tabs/notes-tab";
import { ActivityTab } from "./tabs/activity-tab";
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
      total: quote.total ? Number(quote.total) : null,
    })),
    invoices: client.invoices.map((invoice) => ({
      ...invoice,
      total: invoice.total ? Number(invoice.total) : null,
      paidAmount: invoice.paidAmount ? Number(invoice.paidAmount) : null,
    })),
  };
}

const statusColors: Record<ClientStatus, string> = {
  LEAD: "bg-gray-100 text-gray-800",
  QUOTE_SENT: "bg-blue-100 text-blue-800",
  QUOTE_ACCEPTED: "bg-green-100 text-green-800",
  CONTRACT_SENT: "bg-yellow-100 text-yellow-800",
  CONTRACT_SIGNED: "bg-green-100 text-green-800",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-purple-100 text-purple-800",
  INVOICED: "bg-orange-100 text-orange-800",
  PAID: "bg-green-100 text-green-800",
  ARCHIVED: "bg-gray-100 text-gray-500",
};

const statusLabels: Record<ClientStatus, string> = {
  LEAD: "Lead",
  QUOTE_SENT: "Quote Sent",
  QUOTE_ACCEPTED: "Quote Accepted",
  CONTRACT_SENT: "Contract Sent",
  CONTRACT_SIGNED: "Contract Signed",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  INVOICED: "Invoiced",
  PAID: "Paid",
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/clients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{client.name}</h1>
            <Badge variant="secondary" className={statusColors[client.status]}>
              {statusLabels[client.status]}
            </Badge>
          </div>
          {client.companyName && (
            <p className="text-muted-foreground">{client.companyName}</p>
          )}
        </div>
        <ClientActions client={{ id: client.id }} />
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
