import { redirect } from "next/navigation";
import { getUnbilledTimeEntries, getUnbilledSummaryByClient, getClientsForSelect } from "../actions";
import { TimeToInvoice } from "./time-to-invoice";

interface TimeInvoicePageProps {
  searchParams: Promise<{ clientId?: string }>;
}

export default async function TimeInvoicePage({ searchParams }: TimeInvoicePageProps) {
  const params = await searchParams;
  const clientId = params.clientId;

  const [summary, clients] = await Promise.all([
    getUnbilledSummaryByClient(),
    getClientsForSelect(),
  ]);

  // If a client is selected, get their unbilled entries
  const entries = clientId
    ? await getUnbilledTimeEntries({ clientId })
    : [];

  // Serialize for client component (explicit fields to avoid Decimal leak)
  const serializedEntries = entries.map((entry) => ({
    id: entry.id,
    description: entry.description,
    date: entry.date.toISOString(),
    duration: entry.duration,
    hourlyRate: entry.hourlyRate ? Number(entry.hourlyRate) : null,
    client: entry.client,
    project: entry.project,
  }));

  const serializedSummary = summary.map((s) => ({
    client: s.client,
    totalMinutes: s.totalMinutes,
    entryCount: s.entryCount,
    totalHours: Math.round((s.totalMinutes / 60) * 100) / 100,
  }));

  if (summary.length === 0 && !clientId) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-950 dark:text-white">
            No Unbilled Time
          </h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            All billable time entries have been invoiced.
          </p>
          <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">
            Log some time first, then come back here to create invoices.
          </p>
        </div>
      </div>
    );
  }

  return (
    <TimeToInvoice
      summary={serializedSummary}
      entries={serializedEntries}
      clients={clients}
      selectedClientId={clientId || null}
    />
  );
}
