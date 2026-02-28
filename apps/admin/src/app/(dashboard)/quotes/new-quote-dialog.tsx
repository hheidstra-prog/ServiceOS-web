"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronsUpDown } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createQuote, getClientsForSelect, getContactsForClient } from "./actions";

interface Client {
  id: string;
  name: string;
  companyName: string | null;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  isPrimary: boolean;
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
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactId, setContactId] = useState("");

  useEffect(() => {
    if (open) {
      getClientsForSelect().then(setClients);
      if (preselectedClientId) {
        setClientId(preselectedClientId);
      }
    }
  }, [open, preselectedClientId]);

  // Fetch contacts when client changes
  useEffect(() => {
    if (clientId) {
      getContactsForClient(clientId).then((c) => {
        setContacts(c);
        const primary = c.find((ct) => ct.isPrimary);
        setContactId(primary?.id || "");
      });
    } else {
      setContacts([]);
      setContactId("");
    }
  }, [clientId]);

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
      contactId: contactId || undefined,
      title: formData.get("title") as string || undefined,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Quote</DialogTitle>
          <DialogDescription>
            Select a client and optionally set a title. You can add details and line items on the next page.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Client *</Label>
            {preselectedClientId ? (
              <Input
                value={clients.find((c) => c.id === clientId)?.companyName || clients.find((c) => c.id === clientId)?.name || ""}
                disabled
              />
            ) : (
              <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                    <span className="truncate">
                      {clientId
                        ? clients.find((c) => c.id === clientId)?.companyName || clients.find((c) => c.id === clientId)?.name || "Select a client"
                        : "Select a client"}
                    </span>
                    <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search clients..." />
                    <CommandList>
                      <CommandEmpty>No client found.</CommandEmpty>
                      <CommandGroup>
                        {clients.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={client.companyName || client.name}
                            onSelect={() => {
                              setClientId(client.id);
                              setClientPopoverOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", clientId === client.id ? "opacity-100" : "opacity-0")} />
                            {client.companyName || client.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {contacts.length > 0 && (
            <div className="space-y-2">
              <Label>Contact Person</Label>
              <Select value={contactId} onValueChange={setContactId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a contact" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.firstName} {contact.lastName}
                      {contact.email ? ` (${contact.email})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g., Website Development Project"
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
