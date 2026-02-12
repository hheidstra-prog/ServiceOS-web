"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createQuote, getClientsForSelect } from "./actions";

interface Client {
  id: string;
  name: string;
  companyName: string | null;
}

interface NewQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedClientId?: string;
}

export function NewQuoteDialog({ open, onOpenChange, preselectedClientId }: NewQuoteDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState(preselectedClientId || "");

  useEffect(() => {
    if (open) {
      getClientsForSelect().then(setClients);
      if (preselectedClientId) {
        setClientId(preselectedClientId);
      }
    }
  }, [open, preselectedClientId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!clientId) {
      toast.error("Please select a client");
      return;
    }

    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      clientId,
      title: formData.get("title") as string || undefined,
      introduction: formData.get("introduction") as string || undefined,
      validUntil: formData.get("validUntil")
        ? new Date(formData.get("validUntil") as string)
        : undefined,
    };

    try {
      const quote = await createQuote(data);
      toast.success("Quote created");
      onOpenChange(false);
      router.push(`/quotes/${quote.id}`);
    } catch {
      toast.error("Failed to create quote");
    } finally {
      setIsLoading(false);
    }
  };

  // Default valid until: 30 days from now
  const defaultValidUntil = new Date();
  defaultValidUntil.setDate(defaultValidUntil.getDate() + 30);
  const defaultValidUntilStr = defaultValidUntil.toISOString().split("T")[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Quote</DialogTitle>
          <DialogDescription>
            Create a new quote for a client. You can add line items after creating.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clientId">Client *</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.companyName || client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g., Website Development Project"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="introduction">Introduction</Label>
            <Textarea
              id="introduction"
              name="introduction"
              rows={3}
              placeholder="Thank you for considering our services..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="validUntil">Valid Until</Label>
            <Input
              id="validUntil"
              name="validUntil"
              type="date"
              defaultValue={defaultValidUntilStr}
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
              {isLoading ? "Creating..." : "Create Quote"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
