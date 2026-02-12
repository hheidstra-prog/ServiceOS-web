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
import { createProject, updateProject, getClientsForSelect } from "./actions";
import { ProjectStatus } from "@serviceos/database";

interface Client {
  id: string;
  name: string;
  companyName: string | null;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  startDate: Date | null;
  endDate: Date | null;
  budget: number | null;
  currency: string;
  client: {
    id: string;
    name: string;
    companyName: string | null;
  };
}

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProject: Project | null;
  preselectedClientId?: string;
}

const statusOptions: { value: ProjectStatus; label: string }[] = [
  { value: "NOT_STARTED", label: "Not Started" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function ProjectDialog({
  open,
  onOpenChange,
  editingProject,
  preselectedClientId,
}: ProjectDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);

  // Form state
  const [clientId, setClientId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("NOT_STARTED");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");

  // Load clients
  useEffect(() => {
    if (open) {
      getClientsForSelect().then(setClients);
    }
  }, [open]);

  // Populate form when editing
  useEffect(() => {
    if (editingProject) {
      setClientId(editingProject.client.id);
      setName(editingProject.name);
      setDescription(editingProject.description || "");
      setStatus(editingProject.status);
      setStartDate(
        editingProject.startDate
          ? new Date(editingProject.startDate).toISOString().split("T")[0]
          : ""
      );
      setEndDate(
        editingProject.endDate
          ? new Date(editingProject.endDate).toISOString().split("T")[0]
          : ""
      );
      setBudget(editingProject.budget?.toString() || "");
    } else {
      resetForm();
      if (preselectedClientId) {
        setClientId(preselectedClientId);
      }
    }
  }, [editingProject, open, preselectedClientId]);

  const resetForm = () => {
    setClientId("");
    setName("");
    setDescription("");
    setStatus("NOT_STARTED");
    setStartDate("");
    setEndDate("");
    setBudget("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    if (!editingProject && !clientId) {
      toast.error("Please select a client");
      return;
    }

    setIsLoading(true);

    try {
      if (editingProject) {
        await updateProject(editingProject.id, {
          name,
          description: description || undefined,
          status,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          budget: budget ? parseFloat(budget) : undefined,
        });
        toast.success("Project updated");
      } else {
        await createProject({
          clientId,
          name,
          description: description || undefined,
          status,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          budget: budget ? parseFloat(budget) : undefined,
        });
        toast.success("Project created");
      }
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Failed to save project");
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingProject ? "Edit Project" : "New Project"}</DialogTitle>
          <DialogDescription>
            {editingProject
              ? "Update the project details."
              : "Create a new project for a client."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client (only for new projects) */}
          {!editingProject && (
            <div className="space-y-2">
              <Label>Client *</Label>
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
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Website Redesign"
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
              placeholder="Brief description of the project..."
            />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget">Budget</Label>
            <Input
              id="budget"
              type="number"
              step="0.01"
              min="0"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : editingProject ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
