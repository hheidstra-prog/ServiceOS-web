import { requireAuthWithOrg } from "@/lib/auth";
import { getAssistantCounts } from "./assistant-chat-actions";
import { AssistantManager } from "./assistant-manager";

export default async function AssistantPage() {
  const { organization } = await requireAuthWithOrg();
  const counts = await getAssistantCounts();

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
          Assistant
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Your AI-powered business assistant.
        </p>
      </div>
      <AssistantManager
        locale={organization.locale || "en"}
        clientCount={counts.clientCount}
        activeProjectCount={counts.activeProjectCount}
        unpaidInvoiceCount={counts.unpaidInvoiceCount}
        todayBookingCount={counts.todayBookingCount}
      />
    </div>
  );
}
