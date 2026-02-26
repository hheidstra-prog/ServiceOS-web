"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Globe } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { useConfirm } from "@/components/ui/confirm-dialog";
import { createProject, updateProject, deleteProject } from "../../actions";
import { toggleProjectPortalVisibility } from "@/app/(dashboard)/projects/actions";
import { ProjectStatus } from "@servible/database";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  startDate: Date | null;
  endDate: Date | null;
  budget: number | null;
  currency: string;
  portalVisible: boolean;
}

interface ProjectsTabProps {
  client: {
    id: string;
    projects: Project[];
  };
}

const statusOptions: { value: ProjectStatus; label: string; badgeColor: string; borderColor: string }[] = [
  { value: "NOT_STARTED", label: "Not Started", badgeColor: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300", borderColor: "" },
  { value: "IN_PROGRESS", label: "In Progress", badgeColor: "bg-sky-500/10 text-sky-700 dark:text-sky-400", borderColor: "border-sky-300 dark:border-sky-500/50" },
  { value: "ON_HOLD", label: "On Hold", badgeColor: "bg-amber-500/10 text-amber-700 dark:text-amber-400", borderColor: "border-amber-300 dark:border-amber-500/50" },
  { value: "COMPLETED", label: "Completed", badgeColor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", borderColor: "border-emerald-300 dark:border-emerald-500/50" },
  { value: "CANCELLED", label: "Cancelled", badgeColor: "bg-rose-500/10 text-rose-700 dark:text-rose-400", borderColor: "border-rose-300 dark:border-rose-500/50" },
];

export function ProjectsTab({ client }: ProjectsTabProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  const handleAdd = () => {
    setEditingProject(null);
    setIsFormOpen(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setIsFormOpen(true);
  };

  const handleDelete = async (projectId: string) => {
    const ok = await confirm({
      title: "Delete project",
      description: "Are you sure you want to delete this project? This action cannot be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteProject(projectId, client.id);
      toast.success("Project deleted");
    } catch (error) {
      toast.error("Failed to delete project");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string || undefined,
      status: formData.get("status") as ProjectStatus,
      startDate: formData.get("startDate") ? new Date(formData.get("startDate") as string) : undefined,
      endDate: formData.get("endDate") ? new Date(formData.get("endDate") as string) : undefined,
      budget: formData.get("budget") ? parseFloat(formData.get("budget") as string) : undefined,
    };

    try {
      if (editingProject) {
        await updateProject(editingProject.id, client.id, data);
        toast.success("Project updated");
      } else {
        await createProject(client.id, data);
        toast.success("Project created");
      }
      setIsFormOpen(false);
    } catch (error) {
      toast.error("Failed to save project");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusOption = (status: ProjectStatus) => {
    return statusOptions.find((s) => s.value === status);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString();
  };

  return (
    <>
    {ConfirmDialog}
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Projects</h3>
          <p className="text-sm text-muted-foreground">
            Track work and projects for this client
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Project
        </Button>
      </div>

      {client.projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-muted-foreground">No projects yet.</p>
            <Button onClick={handleAdd} variant="outline" className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Create First Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {client.projects.map((project) => {
            const statusOption = getStatusOption(project.status);
            return (
            <Card key={project.id} className={statusOption?.borderColor}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base truncate">{project.name}</CardTitle>
                    <Badge className={`mt-1 ${statusOption?.badgeColor}`}>
                      {statusOption?.label}
                    </Badge>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(project)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(project.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-zinc-500 dark:text-zinc-400">
                  {formatDate(project.startDate)} - {formatDate(project.endDate)}
                </p>
                {project.description && (
                  <p className="text-zinc-600 dark:text-zinc-300 line-clamp-2">{project.description}</p>
                )}
                {project.budget && (
                  <p className="font-medium">
                    {project.currency} {project.budget.toLocaleString()}
                  </p>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-950/5 dark:border-white/5">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <Globe className="h-3 w-3" />
                    Client portal
                  </div>
                  <Switch
                    checked={project.portalVisible}
                    onCheckedChange={async (checked) => {
                      try {
                        await toggleProjectPortalVisibility(project.id, checked);
                        toast.success(checked ? "Visible on portal" : "Hidden from portal");
                      } catch {
                        toast.error("Failed to update visibility");
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      {/* Project Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProject ? "Edit Project" : "Add Project"}
            </DialogTitle>
            <DialogDescription>
              {editingProject
                ? "Update project details"
                : "Create a new project for this client"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={editingProject?.name || ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={editingProject?.description || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                name="status"
                defaultValue={editingProject?.status || "NOT_STARTED"}
              >
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
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  defaultValue={
                    editingProject?.startDate
                      ? new Date(editingProject.startDate).toISOString().split("T")[0]
                      : ""
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  defaultValue={
                    editingProject?.endDate
                      ? new Date(editingProject.endDate).toISOString().split("T")[0]
                      : ""
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget">Budget</Label>
              <Input
                id="budget"
                name="budget"
                type="number"
                step="0.01"
                defaultValue={editingProject?.budget ?? ""}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : editingProject ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
