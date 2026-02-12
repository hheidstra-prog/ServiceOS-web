"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  FileText,
  Check,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createInvoiceFromTimeEntries } from "../actions";

interface TimeEntry {
  id: string;
  description: string | null;
  date: string;
  duration: number;
  hourlyRate: number | null;
  client: {
    id: string;
    name: string;
    companyName: string | null;
  } | null;
  project: {
    id: string;
    name: string;
  } | null;
}

interface ClientSummary {
  client: {
    id: string;
    name: string;
    companyName: string | null;
  } | undefined;
  totalMinutes: number;
  entryCount: number;
  totalHours: number;
}

interface Client {
  id: string;
  name: string;
  companyName: string | null;
}

interface TimeToInvoiceProps {
  summary: ClientSummary[];
  entries: TimeEntry[];
  clients: Client[];
  selectedClientId: string | null;
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

export function TimeToInvoice({
  summary,
  entries,
  clients,
  selectedClientId,
}: TimeToInvoiceProps) {
  const router = useRouter();
  const [step, setStep] = useState<"client" | "entries" | "options">(
    selectedClientId ? "entries" : "client"
  );
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(
    new Set(entries.map((e) => e.id))
  );
  const [groupBy, setGroupBy] = useState<"none" | "project" | "date">("project");
  const [hourlyRate, setHourlyRate] = useState(
    entries[0]?.hourlyRate?.toString() || "75"
  );
  const [notes, setNotes] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const selectedEntriesArray = entries.filter((e) => selectedEntries.has(e.id));
  const totalMinutes = selectedEntriesArray.reduce((sum, e) => sum + e.duration, 0);
  const totalHours = totalMinutes / 60;
  const estimatedTotal = totalHours * (parseFloat(hourlyRate) || 0);

  const handleSelectClient = (clientId: string) => {
    router.push(`/time/invoice?clientId=${clientId}`);
  };

  const handleToggleEntry = (id: string) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedEntries(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedEntries(new Set(entries.map((e) => e.id)));
  };

  const handleSelectNone = () => {
    setSelectedEntries(new Set());
  };

  const handleCreateInvoice = async () => {
    if (!selectedClientId || selectedEntries.size === 0) return;

    setIsCreating(true);
    try {
      const invoice = await createInvoiceFromTimeEntries({
        clientId: selectedClientId,
        timeEntryIds: Array.from(selectedEntries),
        groupBy,
        hourlyRate: parseFloat(hourlyRate) || undefined,
        notes: notes || undefined,
      });

      toast.success("Invoice created successfully");
      router.push(`/invoices/${invoice.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create invoice");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/time">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
            Create Invoice from Time
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Select time entries to convert into an invoice.
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        <StepIndicator
          number={1}
          label="Client"
          active={step === "client"}
          completed={step !== "client"}
        />
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
        <StepIndicator
          number={2}
          label="Entries"
          active={step === "entries"}
          completed={step === "options"}
        />
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
        <StepIndicator
          number={3}
          label="Options"
          active={step === "options"}
          completed={false}
        />
      </div>

      {/* Step: Select Client */}
      {step === "client" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Client</CardTitle>
              <CardDescription>
                Choose a client to create an invoice for their unbilled time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {summary.length === 0 ? (
                <p className="py-4 text-center text-sm text-zinc-500">
                  No unbilled time entries found.
                </p>
              ) : (
                <div className="space-y-2">
                  {summary.map((s) => (
                    <button
                      key={s.client?.id}
                      onClick={() => handleSelectClient(s.client!.id)}
                      className="flex w-full items-center justify-between rounded-lg border border-zinc-950/10 p-4 text-left transition-colors hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-zinc-800/50"
                    >
                      <div>
                        <p className="font-medium text-zinc-950 dark:text-white">
                          {s.client?.companyName || s.client?.name}
                        </p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {s.entryCount} entr{s.entryCount === 1 ? "y" : "ies"} · {s.totalHours}h unbilled
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-zinc-400" />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step: Select Entries */}
      {step === "entries" && selectedClientId && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Select Time Entries</CardTitle>
                  <CardDescription>
                    {selectedClient?.companyName || selectedClient?.name} ·{" "}
                    {selectedEntries.size} of {entries.length} selected
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                    Select All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleSelectNone}>
                    Select None
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {entries.length === 0 ? (
                <p className="py-4 text-center text-sm text-zinc-500">
                  No unbilled time entries for this client.
                </p>
              ) : (
                <div className="space-y-2">
                  {entries.map((entry) => (
                    <label
                      key={entry.id}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-950/10 p-3 transition-colors hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-zinc-800/50"
                    >
                      <Checkbox
                        checked={selectedEntries.has(entry.id)}
                        onCheckedChange={() => handleToggleEntry(entry.id)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-zinc-950 dark:text-white">
                            {new Date(entry.date).toLocaleDateString("nl-NL", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            })}
                          </p>
                          {entry.project && (
                            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                              {entry.project.name}
                            </span>
                          )}
                        </div>
                        {entry.description && (
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            {entry.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
                        <Clock className="h-3 w-3" />
                        {formatDuration(entry.duration)}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          {selectedEntries.size > 0 && (
            <Card className="border-sky-200 bg-sky-50 dark:border-sky-900/50 dark:bg-sky-950/20">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Selected</p>
                    <p className="text-lg font-semibold text-zinc-950 dark:text-white">
                      {selectedEntries.size} entries · {Math.round(totalHours * 100) / 100}h
                    </p>
                  </div>
                  <Button onClick={() => setStep("options")}>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            variant="ghost"
            onClick={() => {
              router.push("/time/invoice");
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Client Selection
          </Button>
        </div>
      )}

      {/* Step: Options */}
      {step === "options" && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Invoice Options</CardTitle>
                <CardDescription>Configure how the invoice should be generated.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="groupBy">Group Line Items By</Label>
                  <Select value={groupBy} onValueChange={(v) => setGroupBy(v as typeof groupBy)}>
                    <SelectTrigger id="groupBy">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="project">Project</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="none">No Grouping (One line per entry)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {groupBy === "project" && "Time entries will be grouped by project into single line items."}
                    {groupBy === "date" && "Time entries will be grouped by date into single line items."}
                    {groupBy === "none" && "Each time entry will become a separate line item."}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hourlyRate">Hourly Rate (€)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Invoice Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Any additional notes for the invoice..."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
                <CardDescription>Review before creating the invoice.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400">Client</span>
                    <span className="font-medium text-zinc-950 dark:text-white">
                      {selectedClient?.companyName || selectedClient?.name}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400">Time Entries</span>
                    <span className="font-medium text-zinc-950 dark:text-white">
                      {selectedEntries.size}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400">Total Hours</span>
                    <span className="font-medium text-zinc-950 dark:text-white">
                      {Math.round(totalHours * 100) / 100}h
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400">Hourly Rate</span>
                    <span className="font-medium text-zinc-950 dark:text-white">
                      €{parseFloat(hourlyRate) || 0}
                    </span>
                  </div>
                </div>

                <div className="border-t border-zinc-200 pt-4 dark:border-zinc-700">
                  <div className="flex justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">Estimated Subtotal</span>
                    <span className="text-lg font-semibold text-zinc-950 dark:text-white">
                      €{estimatedTotal.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                    Tax will be calculated based on your default rate.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep("entries")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Entries
            </Button>
            <Button onClick={handleCreateInvoice} disabled={isCreating}>
              {isCreating ? (
                "Creating..."
              ) : (
                <>
                  <Receipt className="mr-2 h-4 w-4" />
                  Create Invoice
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepIndicator({
  number,
  label,
  active,
  completed,
}: {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
          completed
            ? "bg-emerald-500 text-white"
            : active
              ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
              : "bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
        }`}
      >
        {completed ? <Check className="h-4 w-4" /> : number}
      </div>
      <span
        className={`text-sm ${
          active || completed
            ? "font-medium text-zinc-950 dark:text-white"
            : "text-zinc-500 dark:text-zinc-400"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
