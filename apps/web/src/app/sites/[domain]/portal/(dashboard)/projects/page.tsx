import { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { db } from "@serviceos/database";
import { FolderKanban, Clock, AlertCircle, CheckCircle, ArrowRight } from "lucide-react";

interface ProjectsPageProps {
  params: Promise<{ domain: string }>;
}

async function getProjects(domain: string, token: string | undefined) {
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

  const projects = await db.project.findMany({
    where: { clientId: session.clientId },
    orderBy: { updatedAt: "desc" },
    include: {
      tasks: {
        select: {
          id: true,
          completed: true,
        },
      },
      _count: {
        select: {
          files: true,
        },
      },
    },
  });

  return projects;
}

export const metadata: Metadata = {
  title: "Projects",
};

export default async function ProjectsPage({ params }: ProjectsPageProps) {
  const { domain } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("portal_token")?.value;

  const projects = await getProjects(domain, token);

  if (!projects) {
    return null;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Projects</h1>
        <p className="mt-1 text-zinc-600">
          View and track the progress of your projects.
        </p>
      </div>

      {/* Projects List */}
      {projects.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-zinc-200">
          <FolderKanban className="mx-auto h-12 w-12 text-zinc-300" />
          <h3 className="mt-4 font-semibold text-zinc-900">No projects yet</h3>
          <p className="mt-2 text-sm text-zinc-600">
            Projects will appear here once they&apos;re created.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => {
            const status = statusConfig[project.status];
            const completedTasks = project.tasks.filter((t) => t.completed).length;
            const totalTasks = project.tasks.length;
            const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

            return (
              <Link
                key={project.id}
                href={`/portal/projects/${project.id}`}
                className="group rounded-xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-zinc-900 group-hover:text-zinc-600">
                        {project.name}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}
                      >
                        {status.icon}
                        {status.label}
                      </span>
                    </div>
                    {project.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-zinc-600">
                        {project.description}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="h-5 w-5 text-zinc-400 transition-transform group-hover:translate-x-1" />
                </div>

                {/* Progress Bar */}
                {totalTasks > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-600">
                        {completedTasks} of {totalTasks} tasks completed
                      </span>
                      <span className="font-medium text-zinc-900">
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-green-500 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Meta */}
                <div className="mt-4 flex items-center gap-4 text-sm text-zinc-500">
                  {project._count.files > 0 && (
                    <span>{project._count.files} files</span>
                  )}
                  {project.startDate && (
                    <span>
                      Started {new Date(project.startDate).toLocaleDateString()}
                    </span>
                  )}
                  {project.endDate && (
                    <span>
                      Due {new Date(project.endDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
