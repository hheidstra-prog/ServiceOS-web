"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import { createBookingType, updateBookingType, deleteBookingType } from "./actions";

interface BookingType {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number | null;
  currency: string;
  color: string | null;
  isActive: boolean;
  requiresConfirmation: boolean;
  bufferBefore: number;
  bufferAfter: number;
}

interface BookingTypesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingTypes: BookingType[];
}

const colorOptions = [
  { value: "#3b82f6", label: "Blue" },
  { value: "#10b981", label: "Green" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#ef4444", label: "Red" },
  { value: "#8b5cf6", label: "Purple" },
  { value: "#ec4899", label: "Pink" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#6b7280", label: "Gray" },
];

export function BookingTypesDialog({ open, onOpenChange, bookingTypes }: BookingTypesDialogProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editingType, setEditingType] = useState<BookingType | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [price, setPrice] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);
  const [bufferBefore, setBufferBefore] = useState("0");
  const [bufferAfter, setBufferAfter] = useState("0");
  const [isActive, setIsActive] = useState(true);

  const resetForm = () => {
    setName("");
    setDescription("");
    setDurationMinutes("60");
    setPrice("");
    setColor("#3b82f6");
    setRequiresConfirmation(false);
    setBufferBefore("0");
    setBufferAfter("0");
    setIsActive(true);
    setEditingType(null);
    setIsEditing(false);
  };

  const handleEdit = (type: BookingType) => {
    setEditingType(type);
    setName(type.name);
    setDescription(type.description || "");
    setDurationMinutes(type.durationMinutes.toString());
    setPrice(type.price?.toString() || "");
    setColor(type.color || "#3b82f6");
    setRequiresConfirmation(type.requiresConfirmation);
    setBufferBefore(type.bufferBefore.toString());
    setBufferAfter(type.bufferAfter.toString());
    setIsActive(type.isActive);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this booking type?")) return;
    try {
      await deleteBookingType(id);
      toast.success("Booking type deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete booking type");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    setIsLoading(true);

    try {
      if (editingType) {
        await updateBookingType(editingType.id, {
          name,
          description: description || undefined,
          durationMinutes: parseInt(durationMinutes),
          price: price ? parseFloat(price) : undefined,
          color,
          requiresConfirmation,
          bufferBefore: parseInt(bufferBefore),
          bufferAfter: parseInt(bufferAfter),
          isActive,
        });
        toast.success("Booking type updated");
      } else {
        await createBookingType({
          name,
          description: description || undefined,
          durationMinutes: parseInt(durationMinutes),
          price: price ? parseFloat(price) : undefined,
          color,
          requiresConfirmation,
          bufferBefore: parseInt(bufferBefore),
          bufferAfter: parseInt(bufferAfter),
        });
        toast.success("Booking type created");
      }
      resetForm();
      router.refresh();
    } catch {
      toast.error("Failed to save booking type");
    } finally {
      setIsLoading(false);
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Booking Types</DialogTitle>
          <DialogDescription>
            Manage the types of bookings clients can schedule.
          </DialogDescription>
        </DialogHeader>

        {!isEditing ? (
          <>
            {/* List of booking types */}
            <div className="max-h-[400px] overflow-y-auto">
              {bookingTypes.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    No booking types yet. Create one to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {bookingTypes.map((type) => (
                    <div
                      key={type.id}
                      className="flex items-center justify-between rounded-lg border border-zinc-950/10 p-3 dark:border-white/10"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: type.color || "#6b7280" }}
                        />
                        <div>
                          <p className="font-medium text-zinc-950 dark:text-white">
                            {type.name}
                            {!type.isActive && (
                              <span className="ml-2 text-xs text-zinc-500">(Inactive)</span>
                            )}
                          </p>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            {type.durationMinutes} min
                            {type.price ? ` · €${type.price}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon-xs" onClick={() => handleEdit(type)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleDelete(type.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={() => setIsEditing(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add Type
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Consultation"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Select value={durationMinutes} onValueChange={setDurationMinutes}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="180">3 hours</SelectItem>
                    <SelectItem value="240">4 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Brief description of this booking type..."
              />
            </div>

            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price">Price (optional)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Select value={color} onValueChange={setColor}>
                  <SelectTrigger>
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        {colorOptions.find((c) => c.value === color)?.label || "Custom"}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-4 w-4 rounded-full"
                            style={{ backgroundColor: option.value }}
                          />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bufferBefore">Buffer Before (min)</Label>
                <Input
                  id="bufferBefore"
                  type="number"
                  min="0"
                  value={bufferBefore}
                  onChange={(e) => setBufferBefore(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bufferAfter">Buffer After (min)</Label>
                <Input
                  id="bufferAfter"
                  type="number"
                  min="0"
                  value={bufferAfter}
                  onChange={(e) => setBufferAfter(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="requiresConfirmation">Requires Confirmation</Label>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    New bookings will be pending until confirmed
                  </p>
                </div>
                <Switch
                  id="requiresConfirmation"
                  checked={requiresConfirmation}
                  onCheckedChange={setRequiresConfirmation}
                />
              </div>
              {editingType && (
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="isActive">Active</Label>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Inactive types cannot be selected for new bookings
                    </p>
                  </div>
                  <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : editingType ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
