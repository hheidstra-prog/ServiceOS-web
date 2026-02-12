import { notFound } from "next/navigation";
import { getProject, getProjectStats, getProjectTimeEntries, getProjectFiles } from "../actions";
import { ProjectDetail } from "./project-detail";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;

  const [project, stats, timeEntries, files] = await Promise.all([
    getProject(id),
    getProjectStats(id),
    getProjectTimeEntries(id),
    getProjectFiles(id),
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
      ...task,
      dueDate: task.dueDate?.toISOString() || null,
      completedAt: task.completedAt?.toISOString() || null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    })),
  };

  const serializedTimeEntries = timeEntries.map((entry) => ({
    ...entry,
    hourlyRate: entry.hourlyRate ? Number(entry.hourlyRate) : null,
    date: entry.date.toISOString(),
    startTime: entry.startTime?.toISOString() || null,
    endTime: entry.endTime?.toISOString() || null,
  }));

  const serializedFiles = files.map((file) => ({
    ...file,
    createdAt: file.createdAt.toISOString(),
  }));

  return (
    <ProjectDetail
      project={serializedProject}
      stats={stats}
      timeEntries={serializedTimeEntries}
      files={serializedFiles}
    />
  );
}
