"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { recordPayment } from "./actions";

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: {
    id: string;
    number: string;
    total: number;
    paidAmount: number;
    currency: string;
  };
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency,
  }).format(amount);
}

export function RecordPaymentDialog({ open, onOpenChange, invoice }: RecordPaymentDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const remaining = invoice.total - invoice.paidAmount;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get("amount") as string);
    const paidAt = formData.get("paidAt")
      ? new Date(formData.get("paidAt") as string)
      : undefined;

    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      setIsLoading(false);
      return;
    }

    try {
      await recordPayment(invoice.id, { amount, paidAt });
      toast.success("Payment recorded");
      onOpenChange(false);
    } catch {
      toast.error("Failed to record payment");
    } finally {
      setIsLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a payment for invoice {invoice.number}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Invoice Summary */}
          <div className="rounded-md border border-zinc-950/10 bg-zinc-50 p-3 dark:border-white/10 dark:bg-zinc-800/50">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Total</span>
                <span className="text-zinc-950 dark:text-white">
                  {formatCurrency(invoice.total, invoice.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">Already paid</span>
                <span className="text-zinc-950 dark:text-white">
                  {formatCurrency(invoice.paidAmount, invoice.currency)}
                </span>
              </div>
              <div className="flex justify-between border-t border-zinc-950/10 pt-1 dark:border-white/10">
                <span className="font-medium text-zinc-950 dark:text-white">Remaining</span>
                <span className="font-medium text-zinc-950 dark:text-white">
                  {formatCurrency(remaining, invoice.currency)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Payment Amount *</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={remaining.toFixed(2)}
              required
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Click to pay full remaining amount, or enter a partial payment.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paidAt">Payment Date</Label>
            <Input
              id="paidAt"
              name="paidAt"
              type="date"
              defaultValue={todayStr}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
