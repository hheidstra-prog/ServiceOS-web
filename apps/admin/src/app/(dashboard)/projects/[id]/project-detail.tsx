"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  CheckSquare,
  Trash2,
  Plus,
  X,
  AlertCircle,
  FileIcon,
  Upload,
  Download,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  File as FileDefault,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { deleteProject, updateProject, createTask, updateTaskStatus, updateTask, deleteTask, deleteFile, toggleProjectPortalVisibility } from "../actions";
import { TaskStatus } from "@servible/database";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate: string | null;
  estimatedHours: number | null;
  sortOrder: number;
  assignedTo: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface TimeEntry {
  id: string;
  description: string | null;
  date: string;
  duration: number;
  billable: boolean;
  billed: boolean;
  hourlyRate: number | null;
  client: {
    id: string;
    name: string;
    companyName: string | null;
  } | null;
}

interface ProjectFile {
  id: string;
  name: string;
  fileName: string;
  url: string;
  mimeType: string | null;
  size: number | null;
  createdAt: string;
  uploadedBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: "NOT_STARTED" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
  startDate: Date | null;
  endDate: Date | null;
  budget: number | null;
  budgetHours: number | null;
  hourlyRate: number | null;
  currency: string;
  portalVisible: boolean;
  client: {
    id: string;
    name: string;
    companyName: string | null;
    email: string | null;
    phone: string | null;
  };
  tasks: Task[];
  _count: {
    timeEntries: number;
    tasks: number;
  };
}

interface ProjectStats {
  totalHours: number;
  budgetHours: number | null;
  hoursUsedPercent: number | null;
  budget: number | null;
  completedTasks: number;
  pendingTasks: number;
  totalTasks: number;
  taskCompletionPercent: number;
}

interface ProjectDetailProps {
  project: Project;
  stats: ProjectStats | null;
  timeEntries: TimeEntry[];
  files: ProjectFile[];
}

const STATUS_CONFIG = {
  NOT_STARTED: { label: "Not Started", color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
  IN_PROGRESS: { label: "In Progress", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400" },
  ON_HOLD: { label: "On Hold", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  COMPLETED: { label: "Completed", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

const PRIORITY_CONFIG = {
  LOW: { label: "Low", color: "text-zinc-500" },
  MEDIUM: { label: "Medium", color: "text-sky-600" },
  HIGH: { label: "High", color: "text-amber-600" },
  URGENT: { label: "Urgent", color: "text-red-600" },
};

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

export function ProjectDetail({ project, stats, timeEntries, files }: ProjectDetailProps) {
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Delete project",
      description: "Are you sure you want to delete this project? This will also delete all tasks.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;

    setIsDeleting(true);
    try {
      await deleteProject(project.id);
      toast.success("Project deleted");
      router.push("/projects");
    } catch {
      toast.error("Failed to delete project");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusChange = async (status: Project["status"]) => {
    try {
      await updateProject(project.id, { status });
      toast.success("Status updated");
      router.refresh();
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <>{ConfirmDialog}
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href="/projects">
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
                {project.name}
              </h1>
              <Badge className={STATUS_CONFIG[project.status].color}>
                {STATUS_CONFIG[project.status].label}
              </Badge>
            </div>
            <Link
              href={`/clients/${project.client.id}`}
              className="mt-1 flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
            >
              <Building2 className="h-3 w-3" />
              {project.client.companyName || project.client.name}
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={project.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NOT_STARTED">Not Started</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="ON_HOLD">On Hold</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon-sm"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Time Tracked</p>
                <Clock className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              </div>
              <p className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-white">
                {stats.totalHours.toFixed(1)}h
              </p>
              {stats.budgetHours && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
                    <span>Budget: {stats.budgetHours}h</span>
                    <span>{Math.round(stats.hoursUsedPercent || 0)}%</span>
                  </div>
                  <Progress
                    value={Math.min(stats.hoursUsedPercent || 0, 100)}
                    className="mt-1 h-1.5"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Tasks</p>
                <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-white">
                {stats.completedTasks}/{stats.totalTasks}
              </p>
              {stats.totalTasks > 0 && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
                    <span>{stats.pendingTasks} remaining</span>
                    <span>{Math.round(stats.taskCompletionPercent)}%</span>
                  </div>
                  <Progress value={stats.taskCompletionPercent} className="mt-1 h-1.5" />
                </div>
              )}
            </CardContent>
          </Card>

          {stats.budget && (
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Budget</p>
                <p className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-white">
                  €{stats.budget.toLocaleString("nl-NL")}
                </p>
              </CardContent>
            </Card>
          )}

          {project.endDate && (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Deadline</p>
                  <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-white">
                  {new Date(project.endDate).toLocaleDateString("nl-NL", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Tasks
            {stats && stats.pendingTasks > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {stats.pendingTasks}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="time" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Time
            {project._count.timeEntries > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {project._count.timeEntries}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-2">
            <FileIcon className="h-4 w-4" />
            Files
            {files.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {files.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab project={project} />
        </TabsContent>

        <TabsContent value="tasks">
          <TasksTab projectId={project.id} tasks={project.tasks} />
        </TabsContent>

        <TabsContent value="time">
          <TimeTab projectId={project.id} timeEntries={timeEntries} />
        </TabsContent>

        <TabsContent value="files">
          <FilesTab projectId={project.id} files={files} />
        </TabsContent>
      </Tabs>
    </div>
    </>
  );
}

function TasksTab({ projectId, tasks }: { projectId: string; tasks: Task[] }) {
  const router = useRouter();
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    setIsAdding(true);
    try {
      await createTask({ projectId, title: newTaskTitle.trim() });
      setNewTaskTitle("");
      toast.success("Task added");
      router.refresh();
    } catch {
      toast.error("Failed to add task");
    } finally {
      setIsAdding(false);
    }
  };

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    try {
      await updateTaskStatus(taskId, status);
      router.refresh();
    } catch {
      toast.error("Failed to update task");
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      toast.success("Task deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete task");
    }
  };

  const handleUpdateTask = async (taskId: string, data: Record<string, unknown>) => {
    try {
      await updateTask(taskId, data);
      router.refresh();
    } catch {
      toast.error("Failed to update task");
    }
  };

  const todoTasks = tasks.filter((t) => t.status === "TODO");
  const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS");
  const doneTasks = tasks.filter((t) => t.status === "DONE");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tasks</CardTitle>
        <CardDescription>Manage project tasks and track progress.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Task */}
        <div className="flex gap-2">
          <Input
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
            placeholder="Add a new task..."
            disabled={isAdding}
          />
          <Button onClick={handleAddTask} disabled={isAdding || !newTaskTitle.trim()}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add
          </Button>
        </div>

        {/* To Do */}
        {todoTasks.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              To Do ({todoTasks.length})
            </p>
            {todoTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onStatusChange={(status) => handleStatusChange(task.id, status)}
                onUpdate={(data) => handleUpdateTask(task.id, data)}
                onDelete={() => handleDelete(task.id)}
              />
            ))}
          </div>
        )}

        {/* In Progress */}
        {inProgressTasks.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-sky-600 dark:text-sky-400">
              In Progress ({inProgressTasks.length})
            </p>
            {inProgressTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onStatusChange={(status) => handleStatusChange(task.id, status)}
                onUpdate={(data) => handleUpdateTask(task.id, data)}
                onDelete={() => handleDelete(task.id)}
              />
            ))}
          </div>
        )}

        {/* Done */}
        {doneTasks.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              Done ({doneTasks.length})
            </p>
            {doneTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onStatusChange={(status) => handleStatusChange(task.id, status)}
                onUpdate={(data) => handleUpdateTask(task.id, data)}
                onDelete={() => handleDelete(task.id)}
              />
            ))}
          </div>
        )}

        {tasks.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No tasks yet. Add your first task above.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

const TASK_STATUS_CONFIG = {
  TODO: { label: "To Do", className: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400", border: "border-zinc-200 dark:border-zinc-800" },
  IN_PROGRESS: { label: "In Progress", className: "bg-sky-500/10 text-sky-700 dark:text-sky-400", border: "border-sky-200 dark:border-sky-800" },
  DONE: { label: "Done", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800" },
};

function TaskItem({
  task,
  onStatusChange,
  onUpdate,
  onDelete,
}: {
  task: Task;
  onStatusChange: (status: TaskStatus) => void;
  onUpdate: (data: Record<string, unknown>) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const isOverdue = task.dueDate && task.status !== "DONE" && new Date(task.dueDate) < new Date();
  const isDone = task.status === "DONE";
  const statusConfig = TASK_STATUS_CONFIG[task.status];

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onUpdate({
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || undefined,
      priority: formData.get("priority") as string,
      dueDate: formData.get("dueDate") ? new Date(formData.get("dueDate") as string) : null,
      estimatedHours: formData.get("estimatedHours") ? Number(formData.get("estimatedHours")) : null,
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <form onSubmit={handleSave} className="rounded-lg border border-zinc-950/10 bg-white p-3 dark:border-white/10 dark:bg-zinc-950">
        <div className="space-y-3">
          <Input name="title" defaultValue={task.title} required placeholder="Task title" />
          <textarea
            name="description"
            rows={2}
            defaultValue={task.description || ""}
            placeholder="Description (optional)"
            className="flex w-full rounded-md border border-zinc-950/10 bg-white px-3 py-2 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950/20 focus:outline-none focus:ring-0 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-white/20"
          />
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-zinc-500 dark:text-zinc-400">Priority</label>
              <Select name="priority" defaultValue={task.priority}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 dark:text-zinc-400">Due date</label>
              <Input
                name="dueDate"
                type="date"
                className="h-8 text-xs"
                defaultValue={task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : ""}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 dark:text-zinc-400">Est. hours</label>
              <Input
                name="estimatedHours"
                type="number"
                step="0.5"
                className="h-8 text-xs"
                defaultValue={task.estimatedHours ?? ""}
                placeholder="0"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save
            </Button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 ${isDone ? "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900" : "border-zinc-950/10 bg-white dark:border-white/10 dark:bg-zinc-950"}`}>
      <Select value={task.status} onValueChange={(v) => onStatusChange(v as TaskStatus)}>
        <SelectTrigger className={`h-6 w-[110px] shrink-0 border-0 px-1.5 text-xs font-medium ${statusConfig.className}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="TODO">To Do</SelectItem>
          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
          <SelectItem value="DONE">Done</SelectItem>
        </SelectContent>
      </Select>
      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setIsEditing(true)}>
        <p className={`font-medium ${isDone ? "text-zinc-500 line-through dark:text-zinc-400" : "text-zinc-950 dark:text-white"}`}>
          {task.title}
        </p>
        {task.description && (
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-1">{task.description}</p>
        )}
        <div className="mt-1 flex items-center gap-2 text-xs">
          {task.priority !== "MEDIUM" && (
            <span className={PRIORITY_CONFIG[task.priority].color}>
              {PRIORITY_CONFIG[task.priority].label}
            </span>
          )}
          {task.dueDate && (
            <span className={isOverdue ? "text-red-600" : "text-zinc-500 dark:text-zinc-400"}>
              {isOverdue && <AlertCircle className="mr-0.5 inline h-3 w-3" />}
              Due {new Date(task.dueDate).toLocaleDateString("nl-NL")}
            </span>
          )}
          {task.estimatedHours && (
            <span className="flex items-center gap-0.5 text-zinc-500 dark:text-zinc-400">
              <Clock className="h-3 w-3" />
              {Number(task.estimatedHours)}h
            </span>
          )}
        </div>
      </div>
      <Button variant="ghost" size="icon-xs" onClick={onDelete}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

function TimeTab({ projectId, timeEntries }: { projectId: string; timeEntries: TimeEntry[] }) {
  const totalMinutes = timeEntries.reduce((sum, e) => sum + e.duration, 0);
  const billableMinutes = timeEntries.filter((e) => e.billable).reduce((sum, e) => sum + e.duration, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Time Entries</CardTitle>
            <CardDescription>
              {formatDuration(totalMinutes)} total · {formatDuration(billableMinutes)} billable
            </CardDescription>
          </div>
          <Link href={`/time?projectId=${projectId}`}>
            <Button variant="outline" size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Log Time
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {timeEntries.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No time entries yet.
          </p>
        ) : (
          <div className="space-y-2">
            {timeEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-lg border border-zinc-950/10 p-3 dark:border-white/10"
              >
                <div>
                  <p className="font-medium text-zinc-950 dark:text-white">
                    {new Date(entry.date).toLocaleDateString("nl-NL", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                  {entry.description && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {entry.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {entry.billable && (
                    <Badge variant="secondary" className="text-xs">
                      {entry.billed ? "Billed" : "Billable"}
                    </Badge>
                  )}
                  <span className="font-medium text-zinc-950 dark:text-white">
                    {formatDuration(entry.duration)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OverviewTab({ project }: { project: Project }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);

    const formData = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
      startDate: formData.get("startDate") ? new Date(formData.get("startDate") as string) : undefined,
      endDate: formData.get("endDate") ? new Date(formData.get("endDate") as string) : undefined,
      budget: formData.get("budget") ? Number(formData.get("budget")) : undefined,
      budgetHours: formData.get("budgetHours") ? Number(formData.get("budgetHours")) : undefined,
      hourlyRate: formData.get("hourlyRate") ? Number(formData.get("hourlyRate")) : undefined,
    };

    try {
      await updateProject(project.id, data);
      toast.success("Project updated");
      router.refresh();
    } catch {
      toast.error("Failed to update project");
    } finally {
      setIsSaving(false);
    }
  };

  const formatDateForInput = (date: Date | null) => {
    if (!date) return "";
    return new Date(date).toISOString().split("T")[0];
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="portalVisible">Client Portal</Label>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Show this project on the client portal
                </p>
              </div>
              <Switch
                id="portalVisible"
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

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>Project name, description, and dates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input id="name" name="name" defaultValue={project.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={project.description || ""}
                className="flex w-full rounded-md border border-zinc-950/10 bg-white px-3 py-2 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950/20 focus:outline-none focus:ring-0 dark:border-white/10 dark:bg-zinc-950 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-white/20"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  defaultValue={formatDateForInput(project.startDate)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  defaultValue={formatDateForInput(project.endDate)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Budget & Rates</CardTitle>
            <CardDescription>Financial details and time budgets</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="budget">Budget ({project.currency})</Label>
              <Input
                id="budget"
                name="budget"
                type="number"
                step="0.01"
                defaultValue={project.budget ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budgetHours">Budget Hours</Label>
              <Input
                id="budgetHours"
                name="budgetHours"
                type="number"
                step="0.5"
                defaultValue={project.budgetHours ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hourlyRate">Hourly Rate ({project.currency})</Label>
              <Input
                id="hourlyRate"
                name="hourlyRate"
                type="number"
                step="0.01"
                defaultValue={project.hourlyRate ?? ""}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Client</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={`/clients/${project.client.id}`}
              className="flex items-start gap-3 rounded-lg border border-zinc-950/10 p-4 transition-colors hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-zinc-800/50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                <Building2 className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
              </div>
              <div>
                <p className="font-medium text-zinc-950 dark:text-white">
                  {project.client.companyName || project.client.name}
                </p>
                {project.client.companyName && (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {project.client.name}
                  </p>
                )}
                {project.client.email && (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {project.client.email}
                  </p>
                )}
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

function FilesTab({ projectId, files }: { projectId: string; files: ProjectFile[] }) {
  const router = useRouter();
  const { confirm, ConfirmDialog: FilesConfirmDialog } = useConfirm();
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("projectId", projectId);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Upload failed");
        }
      }
      toast.success(`${fileList.length} file(s) uploaded`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (fileId: string, fileName: string) => {
    const ok = await confirm({
      title: "Delete file",
      description: `Are you sure you want to delete "${fileName}"?`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;

    try {
      await deleteFile(fileId);
      toast.success("File deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete file");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  return (
    <>{FilesConfirmDialog}
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Files</CardTitle>
            <CardDescription>
              Upload and manage project files.
            </CardDescription>
          </div>
          <label>
            <Button variant="outline" size="sm" disabled={isUploading} asChild>
              <span className="cursor-pointer">
                {isUploading ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-1.5 h-4 w-4" />
                )}
                Upload
              </span>
            </Button>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
              disabled={isUploading}
            />
          </label>
        </div>
      </CardHeader>
      <CardContent>
        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`mb-4 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            isDragging
              ? "border-sky-500 bg-sky-50 dark:bg-sky-950/20"
              : "border-zinc-200 dark:border-zinc-800"
          }`}
        >
          <Upload className="mx-auto h-8 w-8 text-zinc-400" />
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Drag and drop files here, or click Upload
          </p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            Max file size: 4.5MB per file
          </p>
        </div>

        {/* File list */}
        {files.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No files uploaded yet.
          </p>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <FileItem
                key={file.id}
                file={file}
                onDelete={() => handleDelete(file.id, file.name)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
    </>
  );
}

function FileItem({ file, onDelete }: { file: ProjectFile; onDelete: () => void }) {
  const Icon = getFileIcon(file.mimeType);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-950/10 p-3 dark:border-white/10">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
        <Icon className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-zinc-950 dark:text-white">
          {file.name}
        </p>
        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span>{formatFileSize(file.size)}</span>
          <span>·</span>
          <span>
            {new Date(file.createdAt).toLocaleDateString("nl-NL", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
          {file.uploadedBy && (
            <>
              <span>·</span>
              <span>
                {file.uploadedBy.firstName} {file.uploadedBy.lastName}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <a href={file.url} target="_blank" rel="noopener noreferrer" download={file.fileName}>
          <Button variant="ghost" size="icon-xs">
            <Download className="h-4 w-4" />
          </Button>
        </a>
        <Button variant="ghost" size="icon-xs" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return FileDefault;

  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.startsWith("video/")) return FileVideo;
  if (mimeType.startsWith("audio/")) return FileAudio;
  if (mimeType === "application/pdf") return FileText;
  if (
    mimeType.includes("zip") ||
    mimeType.includes("rar") ||
    mimeType.includes("tar") ||
    mimeType.includes("gzip")
  ) {
    return FileArchive;
  }
  if (
    mimeType.includes("document") ||
    mimeType.includes("text") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("presentation")
  ) {
    return FileText;
  }

  return FileDefault;
}

function formatFileSize(bytes: number | null) {
  if (bytes === null) return "Unknown size";

  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
