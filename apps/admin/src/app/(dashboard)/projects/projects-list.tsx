"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  FolderKanban,
  Trash2,
  Calendar,
  Building,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { ProjectStatus } from "@servible/database";
import { deleteProject } from "./actions";
import { ProjectDialog } from "./project-dialog";

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

interface ProjectsListProps {
  projects: Project[];
}

const statusConfig: Record<ProjectStatus, { label: string; className: string; borderColor: string }> = {
  NOT_STARTED: {
    label: "Not Started",
    className: "bg-zinc-500/10 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400",
    borderColor: "",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "bg-sky-500/10 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",
    borderColor: "border-l-sky-500 dark:border-l-sky-400",
  },
  ON_HOLD: {
    label: "On Hold",
    className: "bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    borderColor: "border-l-amber-500 dark:border-l-amber-400",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    borderColor: "border-l-emerald-500 dark:border-l-emerald-400",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-rose-500/10 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
    borderColor: "border-l-rose-500 dark:border-l-rose-400",
  },
};

function formatDate(date: Date | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(amount: number | null, currency: string) {
  if (amount === null) return "—";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency,
  }).format(amount);
}

export function ProjectsList({ projects }: ProjectsListProps) {
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "ALL">("ALL");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredProjects = projects.filter((project) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      project.name.toLowerCase().includes(searchLower) ||
      project.description?.toLowerCase().includes(searchLower) ||
      project.client.name.toLowerCase().includes(searchLower) ||
      project.client.companyName?.toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter === "ALL" || project.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Count by status
  const statusCounts = projects.reduce(
    (acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    },
    {} as Record<ProjectStatus, number>
  );

  const handleAdd = () => {
    setIsDialogOpen(true);
  };

  const handleDelete = async (project: Project) => {
    const ok = await confirm({
      title: "Delete project",
      description: "Are you sure you want to delete this project? This action cannot be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteProject(project.id);
      toast.success("Project deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete project");
    }
  };

  return (
    <>{ConfirmDialog}
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
            Projects
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage client projects and assignments.
          </p>
        </div>
        <Button onClick={handleAdd} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          New project
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Total</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-white">
              {projects.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">In Progress</p>
            <p className="mt-1 text-2xl font-semibold text-sky-600 dark:text-sky-400">
              {statusCounts.IN_PROGRESS || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">On Hold</p>
            <p className="mt-1 text-2xl font-semibold text-amber-600 dark:text-amber-400">
              {statusCounts.ON_HOLD || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Completed</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
              {statusCounts.COMPLETED || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full rounded-md border border-zinc-950/10 bg-white pl-8 pr-3 text-sm text-zinc-950 placeholder:text-zinc-400 transition-colors focus:border-zinc-950/20 focus:bg-sky-50/50 focus:outline-none focus:ring-0 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-white/20 dark:focus:bg-sky-950/20"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {(["ALL", "NOT_STARTED", "IN_PROGRESS", "ON_HOLD", "COMPLETED"] as const).map(
            (status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  statusFilter === status
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                {status === "ALL" ? "All" : statusConfig[status].label}
              </button>
            )
          )}
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-zinc-100 p-2.5 dark:bg-zinc-800">
              <FolderKanban className="h-5 w-5 text-zinc-400" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-zinc-950 dark:text-white">
              {projects.length === 0 ? "No projects yet" : "No projects found"}
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {projects.length === 0
                ? "Create your first project to get started."
                : "Try adjusting your search or filters."}
            </p>
            {projects.length === 0 && (
              <Button onClick={handleAdd} size="sm" className="mt-4">
                <Plus className="mr-1.5 h-4 w-4" />
                New project
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            const config = statusConfig[project.status];
            return (
              <Link key={project.id} href={`/projects/${project.id}`} className="block h-full">
              <Card className={`h-full border-l-4 ${config.borderColor} transition-all hover:border-violet-300 hover:shadow-sm dark:hover:border-violet-500/40`}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-zinc-950 dark:text-white truncate">
                        {project.name}
                      </h3>
                      <p className="mt-0.5 flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
                        <Building className="h-3 w-3" />
                        {project.client.companyName || project.client.name}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={(e) => {
                        e.preventDefault();
                        handleDelete(project);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {project.description && (
                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${config.className}`}>
                      {config.label}
                    </span>
                    {(project.startDate || project.endDate) && (
                      <span className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                        <Calendar className="h-3 w-3" />
                        {formatDate(project.startDate)} - {formatDate(project.endDate)}
                      </span>
                    )}
                  </div>

                  {project.budget && (
                    <p className="mt-2 text-sm font-medium text-zinc-950 dark:text-white">
                      Budget: {formatCurrency(project.budget, project.currency)}
                    </p>
                  )}
                </CardContent>
              </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Project Dialog */}
      <ProjectDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
    </>
  );
}
