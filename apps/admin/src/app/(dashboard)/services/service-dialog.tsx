"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { createService, updateService } from "./actions";
import { PricingType } from "@serviceos/database";

interface Service {
  id: string;
  name: string;
  description: string | null;
  pricingType: PricingType;
  price: number;
  currency: string;
  unit: string | null;
  taxRate: number | null;
  taxExempt: boolean;
  isActive: boolean;
}

interface ServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingService: Service | null;
}

const pricingTypeOptions: { value: PricingType; label: string; description: string }[] = [
  { value: "FIXED", label: "Fixed Price", description: "One-time fixed amount" },
  { value: "HOURLY", label: "Hourly", description: "Charged per hour" },
  { value: "DAILY", label: "Daily", description: "Charged per day" },
  { value: "MONTHLY", label: "Monthly", description: "Recurring monthly fee" },
  { value: "CUSTOM", label: "Custom", description: "Variable pricing" },
];

export function ServiceDialog({ open, onOpenChange, editingService }: ServiceDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pricingType, setPricingType] = useState<PricingType>("FIXED");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [taxExempt, setTaxExempt] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Populate form when editing
  useEffect(() => {
    if (editingService) {
      setName(editingService.name);
      setDescription(editingService.description || "");
      setPricingType(editingService.pricingType);
      setPrice(editingService.price.toString());
      setUnit(editingService.unit || "");
      setTaxRate(editingService.taxRate?.toString() || "");
      setTaxExempt(editingService.taxExempt);
      setIsActive(editingService.isActive);
    } else {
      resetForm();
    }
  }, [editingService, open]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setPricingType("FIXED");
    setPrice("");
    setUnit("");
    setTaxRate("");
    setTaxExempt(false);
    setIsActive(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Please enter a valid price");
      return;
    }

    setIsLoading(true);

    try {
      if (editingService) {
        await updateService(editingService.id, {
          name,
          description: description || undefined,
          pricingType,
          price: priceNum,
          unit: unit || undefined,
          taxRate: taxRate ? parseFloat(taxRate) : undefined,
          taxExempt,
          isActive,
        });
        toast.success("Service updated");
      } else {
        await createService({
          name,
          description: description || undefined,
          pricingType,
          price: priceNum,
          unit: unit || undefined,
          taxRate: taxRate ? parseFloat(taxRate) : undefined,
          taxExempt,
        });
        toast.success("Service created");
      }
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Failed to save service");
    } finally {
      setIsLoading(false);
    }
  };

  // Suggest unit based on pricing type
  const suggestedUnit = () => {
    switch (pricingType) {
      case "HOURLY":
        return "hour";
      case "DAILY":
        return "day";
      case "MONTHLY":
        return "month";
      default:
        return "";
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetForm();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingService ? "Edit Service" : "New Service"}</DialogTitle>
          <DialogDescription>
            {editingService
              ? "Update the service details."
              : "Create a new service for your catalog."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Website Development"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Brief description of this service..."
            />
          </div>

          <div className="space-y-2">
            <Label>Pricing Type</Label>
            <Select value={pricingType} onValueChange={(v) => setPricingType(v as PricingType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pricingTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <span className="font-medium">{option.label}</span>
                      <span className="ml-2 text-zinc-500">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder={suggestedUnit() || "e.g., hour, session"}
              />
              {suggestedUnit() && !unit && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Suggested: {suggestedUnit()}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-zinc-950/10 p-4 dark:border-white/10">
            <h4 className="text-sm font-medium text-zinc-950 dark:text-white">Tax Settings</h4>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="taxExempt">Tax Exempt</Label>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  This service is exempt from VAT
                </p>
              </div>
              <Switch id="taxExempt" checked={taxExempt} onCheckedChange={setTaxExempt} />
            </div>

            {!taxExempt && (
              <div className="space-y-2">
                <Label htmlFor="taxRate">Custom Tax Rate (%)</Label>
                <Select value={taxRate} onValueChange={setTaxRate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Use default rate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Use default rate</SelectItem>
                    <SelectItem value="21">21% (Standard)</SelectItem>
                    <SelectItem value="9">9% (Reduced)</SelectItem>
                    <SelectItem value="0">0% (Zero)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {editingService && (
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="isActive">Active</Label>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Inactive services won't appear in dropdowns
                </p>
              </div>
              <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : editingService ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
