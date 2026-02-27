"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  Users,
  Receipt,
  Calendar,
  TrendingUp,
  RotateCcw,
} from "lucide-react";
import { AssistantChat, type AssistantResultPayload } from "./assistant-chat";
import { ResultsPanel } from "./result-cards";
import { getRecentActivity } from "./assistant-chat-actions";

interface AssistantManagerProps {
  locale: string;
  clientCount: number;
  activeProjectCount: number;
  unpaidInvoiceCount: number;
  todayBookingCount: number;
}

const quickActions = [
  { label: "Show my clients", icon: Users },
  { label: "Unpaid invoices", icon: Receipt },
  { label: "Today's schedule", icon: Calendar },
  { label: "Business overview", icon: TrendingUp },
];

export function AssistantManager({
  locale,
  clientCount,
  activeProjectCount,
  unpaidInvoiceCount,
  todayBookingCount,
}: AssistantManagerProps) {
  const [externalMessage, setExternalMessage] = useState<string | null>(null);
  const [chatKey, setChatKey] = useState(0);
  const [currentResults, setCurrentResults] =
    useState<AssistantResultPayload | null>(null);
  const [initialResults, setInitialResults] =
    useState<AssistantResultPayload | undefined>(undefined);

  // Load recent activity on mount for instant display
  useEffect(() => {
    getRecentActivity()
      .then((activity) => {
        const hasData =
          activity.bookings.length > 0 ||
          activity.invoices.length > 0 ||
          activity.projects.length > 0;
        if (hasData) {
          const payload: AssistantResultPayload = {
            bookingResults:
              activity.bookings.length > 0 ? activity.bookings : undefined,
            invoiceResults:
              activity.invoices.length > 0 ? activity.invoices : undefined,
            projectResults:
              activity.projects.length > 0 ? activity.projects : undefined,
          };
          setInitialResults(payload);
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleResults = (results: AssistantResultPayload) => {
    setCurrentResults(results);
  };

  const handleClearChat = () => {
    setChatKey((k) => k + 1);
    setCurrentResults(null);
    setExternalMessage(null);
    try {
      sessionStorage.removeItem("assistant-chat-messages");
    } catch {
      // ignore
    }
  };

  const hasResults =
    currentResults &&
    ((currentResults.clientResults && currentResults.clientResults.length > 0) ||
      (currentResults.invoiceResults &&
        currentResults.invoiceResults.length > 0) ||
      (currentResults.projectResults &&
        currentResults.projectResults.length > 0) ||
      (currentResults.bookingResults &&
        currentResults.bookingResults.length > 0) ||
      (currentResults.quoteResults &&
        currentResults.quoteResults.length > 0) ||
      currentResults.businessSummary ||
      currentResults.draftEmail);

  return (
    <div className="relative flex w-full min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:flex-row">
      {/* Left panel: Chat */}
      <div className="flex w-full min-h-0 shrink-0 flex-col rounded-lg border border-zinc-200 bg-white lg:w-[380px] dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-2 border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
          <Sparkles className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-medium text-zinc-950 dark:text-white">
            Assistant
          </span>
          <button
            onClick={handleClearChat}
            title="New conversation"
            className="ml-auto rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
        <AssistantChat
          key={chatKey}
          externalMessage={externalMessage}
          onExternalMessageConsumed={() => setExternalMessage(null)}
          onResults={handleResults}
          initialResults={initialResults}
          locale={locale}
        />
      </div>

      {/* Right panel: Results */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        {hasResults ? (
          <div className="flex-1 overflow-y-auto px-4 pb-4 pt-5">
            <ResultsPanel
              clientResults={currentResults?.clientResults}
              invoiceResults={currentResults?.invoiceResults}
              projectResults={currentResults?.projectResults}
              bookingResults={currentResults?.bookingResults}
              quoteResults={currentResults?.quoteResults}
              businessSummary={currentResults?.businessSummary}
              draftEmail={currentResults?.draftEmail}
            />
          </div>
        ) : (
          /* Landing state */
          <div className="flex flex-1 items-center justify-center p-4 sm:p-8">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-zinc-950 dark:text-white">
                Business Assistant
              </h3>
              <p className="mt-1 max-w-sm text-sm text-zinc-500">
                {clientCount} client{clientCount !== 1 ? "s" : ""} &middot;{" "}
                {activeProjectCount} active project
                {activeProjectCount !== 1 ? "s" : ""} &middot;{" "}
                {unpaidInvoiceCount} unpaid invoice
                {unpaidInvoiceCount !== 1 ? "s" : ""}
                {todayBookingCount > 0 && (
                  <>
                    {" "}
                    &middot; {todayBookingCount} booking
                    {todayBookingCount !== 1 ? "s" : ""} today
                  </>
                )}
              </p>

              {/* Quick-action chips */}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                {quickActions.map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    onClick={() => setExternalMessage(label)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-violet-700 dark:hover:bg-violet-950 dark:hover:text-violet-300"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
