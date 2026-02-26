import { notFound } from "next/navigation";
import { getProject, getProjectStats, getProjectTimeEntries, getProjectFiles } from "../actions";
import { getServicesForSelect } from "../../time/actions";
import { ProjectDetail } from "./project-detail";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;

  const [project, stats, timeEntries, files, services] = await Promise.all([
    getProject(id),
    getProjectStats(id),
    getProjectTimeEntries(id),
    getProjectFiles(id),
    getServicesForSelect(),
  ]);

  if (!project) {
    notFound();
  }

  // Serialize for client components
  const serializedProject = {
    ...project,
    budget: project.budget ? Number(project.budget) : null,
    hourlyRate: project.hourlyRate ? Number(project.hourlyRate) : null,
    tasks: project.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      sortOrder: task.sortOrder,
      dueDate: task.dueDate?.toISOString() || null,
      estimatedHours: task.estimatedHours ? Number(task.estimatedHours) : null,
      loggedMinutes: task.timeEntries.reduce((sum, te) => sum + te.duration, 0),
      assignedTo: task.assignedTo,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    })),
  };

  const serializedTimeEntries = timeEntries.map((entry) => ({
    id: entry.id,
    description: entry.description,
    date: entry.date.toISOString(),
    startTime: entry.startTime?.toISOString() || null,
    endTime: entry.endTime?.toISOString() || null,
    duration: entry.duration,
    billable: entry.billable,
    billed: entry.billed,
    hourlyRate: entry.hourlyRate ? Number(entry.hourlyRate) : null,
    client: entry.client,
    project: entry.project,
    task: entry.task,
    service: entry.service,
  }));

  const serializedFiles = files.map((file) => ({
    ...file,
    createdAt: file.createdAt.toISOString(),
  }));

  const serializedServices = services.map((s) => ({
    ...s,
    price: Number(s.price),
  }));

  return (
    <ProjectDetail
      project={serializedProject}
      stats={stats}
      timeEntries={serializedTimeEntries}
      files={serializedFiles}
      services={serializedServices}
    />
  );
}
