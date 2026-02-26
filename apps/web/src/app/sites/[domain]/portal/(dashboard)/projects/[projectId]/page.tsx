import { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@servible/database";
import {
  ArrowLeft,
  Clock,
  AlertCircle,
  CheckCircle,
  Calendar,
  FileText,
  Download,
} from "lucide-react";
import { format } from "date-fns";

interface ProjectDetailPageProps {
  params: Promise<{ domain: string; projectId: string }>;
}

async function getProject(
  domain: string,
  projectId: string,
  token: string | undefined
) {
  if (!token) return null;

  const site = await db.site.findFirst({
    where: {
      OR: [{ subdomain: domain }, { customDomain: domain }],
      status: "PUBLISHED",
      portalEnabled: true,
    },
    select: { organizationId: true },
  });

  if (!site) return null;

  const session = await db.portalSession.findFirst({
    where: {
      token,
      expiresAt: { gt: new Date() },
      client: { organizationId: site.organizationId },
    },
    select: { clientId: true },
  });

  if (!session) return null;

  const project = await db.project.findFirst({
    where: {
      id: projectId,
      clientId: session.clientId,
      portalVisible: true,
    },
    include: {
      tasks: {
        orderBy: [{ status: "asc" }, { sortOrder: "asc" }],
      },
      files: {
        orderBy: { createdAt: "desc" },
        include: {
          uploadedBy: {
            select: { firstName: true, lastName: true },
          },
        },
      },
    },
  });

  return project;
}

export async function generateMetadata({
  params,
}: ProjectDetailPageProps): Promise<Metadata> {
  const { domain, projectId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("portal_token")?.value;

  const project = await getProject(domain, projectId, token);

  if (!project) {
    return { title: "Project Not Found" };
  }

  return { title: project.name };
}

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { domain, projectId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("portal_token")?.value;

  const project = await getProject(domain, projectId, token);

  if (!project) {
    notFound();
  }

  const statusConfig: Record<
    string,
    { icon: React.ReactNode; label: string; color: string }
  > = {
    NOT_STARTED: {
      icon: <Clock className="h-4 w-4" />,
      label: "Not Started",
      color: "bg-zinc-100 text-zinc-700",
    },
    IN_PROGRESS: {
      icon: <AlertCircle className="h-4 w-4" />,
      label: "In Progress",
      color: "bg-blue-100 text-blue-700",
    },
    ON_HOLD: {
      icon: <AlertCircle className="h-4 w-4" />,
      label: "On Hold",
      color: "bg-amber-100 text-amber-700",
    },
    COMPLETED: {
      icon: <CheckCircle className="h-4 w-4" />,
      label: "Completed",
      color: "bg-green-100 text-green-700",
    },
    CANCELLED: {
      icon: <AlertCircle className="h-4 w-4" />,
      label: "Cancelled",
      color: "bg-red-100 text-red-700",
    },
  };

  const status = statusConfig[project.status];
  const completedTasks = project.tasks.filter((t) => t.status === "DONE").length;
  const totalTasks = project.tasks.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const priorityColors: Record<string, string> = {
    LOW: "text-zinc-500",
    MEDIUM: "text-blue-600",
    HIGH: "text-amber-600",
    URGENT: "text-red-600",
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/portal/projects"
        className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to projects
      </Link>

      {/* Header */}
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-zinc-200">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">{project.name}</h1>
            {project.description && (
              <p className="mt-2 text-zinc-600">{project.description}</p>
            )}
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${status.color}`}
          >
            {status.icon}
            {status.label}
          </span>
        </div>

        {/* Dates & Budget */}
        <div className="mt-6 flex flex-wrap gap-6 text-sm">
          {project.startDate && (
            <div className="flex items-center gap-2 text-zinc-600">
              <Calendar className="h-4 w-4" />
              Started: {format(new Date(project.startDate), "MMM d, yyyy")}
            </div>
          )}
          {project.endDate && (
            <div className="flex items-center gap-2 text-zinc-600">
              <Calendar className="h-4 w-4" />
              Due: {format(new Date(project.endDate), "MMM d, yyyy")}
            </div>
          )}
          {project.budget && (
            <div className="flex items-center gap-2 text-zinc-600">
              Budget: {project.currency} {Number(project.budget).toFixed(2)}
            </div>
          )}
        </div>

        {/* Progress */}
        {totalTasks > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-zinc-900">Progress</span>
              <span className="text-zinc-600">
                {completedTasks} of {totalTasks} tasks ({Math.round(progress)}%)
              </span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tasks */}
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
          <div className="border-b border-zinc-200 px-6 py-4">
            <h2 className="font-semibold text-zinc-900">Tasks</h2>
          </div>
          <div className="divide-y divide-zinc-100">
            {project.tasks.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-zinc-500">
                No tasks yet
              </p>
            ) : (
              project.tasks.map((task) => {
                const isDone = task.status === "DONE";
                const isInProgress = task.status === "IN_PROGRESS";
                const taskStatusLabel = isDone ? "Done" : isInProgress ? "In Progress" : "To Do";
                const taskStatusColor = isDone
                  ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                  : isInProgress
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                  : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400";

                return (
                  <div
                    key={task.id}
                    className={`flex items-start gap-3 px-6 py-4 ${isDone ? "opacity-60" : ""}`}
                  >
                    <div
                      className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full ${
                        isDone
                          ? "bg-green-100 text-green-600"
                          : isInProgress
                          ? "bg-blue-100 text-blue-600"
                          : "bg-zinc-100 text-zinc-400"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle className="h-3.5 w-3.5" />
                      ) : (
                        <Clock className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p
                        className={`font-medium ${
                          isDone ? "text-zinc-500 line-through" : "text-zinc-900 dark:text-zinc-100"
                        }`}
                      >
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                          {task.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-3 text-xs">
                        <span className={`rounded-full px-2 py-0.5 font-medium ${taskStatusColor}`}>
                          {taskStatusLabel}
                        </span>
                        <span className={priorityColors[task.priority]}>
                          {task.priority.toLowerCase()} priority
                        </span>
                        {task.dueDate && (
                          <span className="text-zinc-500 dark:text-zinc-400">
                            Due {format(new Date(task.dueDate), "MMM d")}
                          </span>
                        )}
                        {task.estimatedHours && (
                          <span className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                            <Clock className="h-3 w-3" />
                            {Number(task.estimatedHours)}h est.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Files */}
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
          <div className="border-b border-zinc-200 px-6 py-4">
            <h2 className="font-semibold text-zinc-900">Files</h2>
          </div>
          <div className="divide-y divide-zinc-100">
            {project.files.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-zinc-500">
                No files yet
              </p>
            ) : (
              project.files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 px-6 py-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100">
                    <FileText className="h-5 w-5 text-zinc-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-zinc-900">
                      {file.name}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {formatFileSize(file.size)} •{" "}
                      {format(new Date(file.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600"
                  >
                    <Download className="h-5 w-5" />
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
