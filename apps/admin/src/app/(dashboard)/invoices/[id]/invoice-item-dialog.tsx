"use client";

import { useState, useEffect } from "react";
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
import { addInvoiceItem, updateInvoiceItem, getServicesForSelect } from "../actions";
import { PricingType } from "@serviceos/database";

interface Service {
  id: string;
  name: string;
  price: { toNumber(): number } | number;
  pricingType: PricingType;
  unit: string | null;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  service: { id: string; name: string } | null;
}

interface InvoiceItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  currency: string;
  editingItem: InvoiceItem | null;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency,
  }).format(amount);
}

export function InvoiceItemDialog({
  open,
  onOpenChange,
  invoiceId,
  currency,
  editingItem,
}: InvoiceItemDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");

  // Form state
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [taxRate, setTaxRate] = useState("21");

  // Load services
  useEffect(() => {
    if (open) {
      getServicesForSelect().then((data) => {
        setServices(data as Service[]);
      });
    }
  }, [open]);

  // Populate form when editing
  useEffect(() => {
    if (editingItem) {
      setDescription(editingItem.description);
      setQuantity(editingItem.quantity.toString());
      setUnitPrice(editingItem.unitPrice.toString());
      setTaxRate(editingItem.taxRate.toString());
      setSelectedServiceId(editingItem.service?.id || "");
    } else {
      // Reset form
      setDescription("");
      setQuantity("1");
      setUnitPrice("");
      setTaxRate("21");
      setSelectedServiceId("");
    }
  }, [editingItem, open]);

  // When service is selected, populate fields
  const handleServiceSelect = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    if (serviceId && serviceId !== "custom") {
      const service = services.find((s) => s.id === serviceId);
      if (service) {
        setDescription(service.name);
        const price = typeof service.price === 'number' ? service.price : service.price.toNumber();
        setUnitPrice(price.toString());
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }

    const qty = parseFloat(quantity);
    const price = parseFloat(unitPrice);
    const tax = parseFloat(taxRate);

    if (isNaN(qty) || qty <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }

    if (isNaN(price) || price < 0) {
      toast.error("Price must be 0 or greater");
      return;
    }

    setIsLoading(true);

    try {
      if (editingItem) {
        await updateInvoiceItem(editingItem.id, invoiceId, {
          description,
          quantity: qty,
          unitPrice: price,
          taxRate: tax,
        });
        toast.success("Item updated");
      } else {
        await addInvoiceItem(invoiceId, {
          description,
          quantity: qty,
          unitPrice: price,
          taxRate: tax,
          serviceId: selectedServiceId && selectedServiceId !== "custom" ? selectedServiceId : undefined,
        });
        toast.success("Item added");
      }
      onOpenChange(false);
    } catch {
      toast.error("Failed to save item");
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate preview
  const qty = parseFloat(quantity) || 0;
  const price = parseFloat(unitPrice) || 0;
  const tax = parseFloat(taxRate) || 0;
  const subtotal = qty * price;
  const taxAmount = subtotal * (tax / 100);
  const total = subtotal + taxAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingItem ? "Edit Item" : "Add Item"}</DialogTitle>
          <DialogDescription>
            {editingItem ? "Update the line item details." : "Add a new line item to this invoice."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Service Selection */}
          {!editingItem && services.length > 0 && (
            <div className="space-y-2">
              <Label>From Service (optional)</Label>
              <Select value={selectedServiceId} onValueChange={handleServiceSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a service or enter custom" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom item</SelectItem>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Describe the service or product..."
              required
            />
          </div>

          {/* Quantity & Price */}
          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                min="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitPrice">Unit Price *</Label>
              <Input
                id="unitPrice"
                type="number"
                step="0.01"
                min="0"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Tax Rate */}
          <div className="space-y-2">
            <Label htmlFor="taxRate">Tax Rate (%)</Label>
            <Select value={taxRate} onValueChange={setTaxRate}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="21">21% (Standard)</SelectItem>
                <SelectItem value="9">9% (Reduced)</SelectItem>
                <SelectItem value="0">0% (Zero/Exempt)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          {(qty > 0 && price >= 0) && (
            <div className="rounded-md border border-zinc-950/10 bg-zinc-50 p-3 dark:border-white/10 dark:bg-zinc-800/50">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Subtotal</span>
                  <span className="text-zinc-950 dark:text-white">
                    {formatCurrency(subtotal, currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Tax ({tax}%)</span>
                  <span className="text-zinc-950 dark:text-white">
                    {formatCurrency(taxAmount, currency)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-zinc-950/10 pt-1 dark:border-white/10">
                  <span className="font-medium text-zinc-950 dark:text-white">Total</span>
                  <span className="font-medium text-zinc-950 dark:text-white">
                    {formatCurrency(total, currency)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : editingItem ? "Update" : "Add Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
