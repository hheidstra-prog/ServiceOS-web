"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUserAndOrg } from "@/lib/auth";
import { ProjectStatus, TaskPriority } from "@serviceos/database";

// Get all projects for the organization
export async function getProjects(filters?: {
  status?: ProjectStatus;
  clientId?: string;
}) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return [];

  const where: Record<string, unknown> = {
    organizationId: organization.id,
  };

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.clientId) {
    where.clientId = filters.clientId;
  }

  return db.project.findMany({
    where,
    include: {
      client: {
        select: {
          id: true,
          name: true,
          companyName: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });
}

// Get a single project with full details
export async function getProject(id: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return null;

  return db.project.findFirst({
    where: {
      id,
      organizationId: organization.id,
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          companyName: true,
          email: true,
          phone: true,
        },
      },
      tasks: {
        orderBy: [{ completed: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      },
      _count: {
        select: {
          timeEntries: true,
          tasks: true,
        },
      },
    },
  });
}

// Get project stats
export async function getProjectStats(id: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return null;

  const project = await db.project.findFirst({
    where: { id, organizationId: organization.id },
    select: { budgetHours: true, budget: true },
  });

  if (!project) return null;

  const [timeStats, taskStats] = await Promise.all([
    db.timeEntry.aggregate({
      where: { projectId: id },
      _sum: { duration: true },
    }),
    db.projectTask.groupBy({
      by: ["completed"],
      where: { projectId: id },
      _count: true,
    }),
  ]);

  const totalMinutes = timeStats._sum.duration || 0;
  const totalHours = totalMinutes / 60;

  const completedTasks = taskStats.find((t) => t.completed)?._count || 0;
  const pendingTasks = taskStats.find((t) => !t.completed)?._count || 0;
  const totalTasks = completedTasks + pendingTasks;

  return {
    totalHours,
    budgetHours: project.budgetHours,
    hoursUsedPercent: project.budgetHours ? (totalHours / project.budgetHours) * 100 : null,
    budget: project.budget ? Number(project.budget) : null,
    completedTasks,
    pendingTasks,
    totalTasks,
    taskCompletionPercent: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
  };
}

// Create a new project
export async function createProject(data: {
  clientId: string;
  name: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  budgetHours?: number;
  hourlyRate?: number;
}) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  const project = await db.project.create({
    data: {
      organizationId: organization.id,
      clientId: data.clientId,
      name: data.name,
      description: data.description,
      status: data.status || "NOT_STARTED",
      startDate: data.startDate,
      endDate: data.endDate,
      budget: data.budget,
      budgetHours: data.budgetHours,
      hourlyRate: data.hourlyRate,
      currency: organization.defaultCurrency,
    },
  });

  revalidatePath("/projects");
  revalidatePath(`/clients/${data.clientId}`);
  return project;
}

// Update a project
export async function updateProject(
  id: string,
  data: {
    name?: string;
    description?: string;
    status?: ProjectStatus;
    startDate?: Date;
    endDate?: Date;
    budget?: number;
    budgetHours?: number;
    hourlyRate?: number;
  }
) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  const project = await db.project.update({
    where: { id, organizationId: organization.id },
    data: {
      name: data.name,
      description: data.description,
      status: data.status,
      startDate: data.startDate,
      endDate: data.endDate,
      budget: data.budget,
      budgetHours: data.budgetHours,
      hourlyRate: data.hourlyRate,
    },
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  revalidatePath(`/clients/${project.clientId}`);
  return project;
}

// Delete a project
export async function deleteProject(id: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  const project = await db.project.delete({
    where: { id, organizationId: organization.id },
  });

  revalidatePath("/projects");
  revalidatePath(`/clients/${project.clientId}`);
}

// Get clients for dropdown
export async function getClientsForSelect() {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return [];

  return db.client.findMany({
    where: {
      organizationId: organization.id,
      archivedAt: null,
    },
    select: {
      id: true,
      name: true,
      companyName: true,
    },
    orderBy: { name: "asc" },
  });
}

// ===========================================
// TASKS
// ===========================================

// Get tasks for a project
export async function getProjectTasks(projectId: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return [];

  // Verify project belongs to organization
  const project = await db.project.findFirst({
    where: { id: projectId, organizationId: organization.id },
  });
  if (!project) return [];

  return db.projectTask.findMany({
    where: { projectId },
    orderBy: [{ completed: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

// Create a task
export async function createTask(data: {
  projectId: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: Date;
}) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  // Verify project belongs to organization
  const project = await db.project.findFirst({
    where: { id: data.projectId, organizationId: organization.id },
  });
  if (!project) throw new Error("Project not found");

  // Get max sort order
  const lastTask = await db.projectTask.findFirst({
    where: { projectId: data.projectId },
    orderBy: { sortOrder: "desc" },
  });
  const sortOrder = (lastTask?.sortOrder ?? -1) + 1;

  const task = await db.projectTask.create({
    data: {
      projectId: data.projectId,
      title: data.title,
      description: data.description,
      priority: data.priority || "MEDIUM",
      dueDate: data.dueDate,
      sortOrder,
    },
  });

  revalidatePath(`/projects/${data.projectId}`);
  return task;
}

// Update a task
export async function updateTask(
  id: string,
  data: {
    title?: string;
    description?: string;
    completed?: boolean;
    priority?: TaskPriority;
    dueDate?: Date | null;
  }
) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  // Get task and verify project belongs to org
  const task = await db.projectTask.findUnique({
    where: { id },
    include: { project: { select: { organizationId: true } } },
  });
  if (!task || task.project.organizationId !== organization.id) {
    throw new Error("Task not found");
  }

  const updatedTask = await db.projectTask.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description,
      completed: data.completed,
      completedAt: data.completed === true ? new Date() : data.completed === false ? null : undefined,
      priority: data.priority,
      dueDate: data.dueDate,
    },
  });

  revalidatePath(`/projects/${task.projectId}`);
  return updatedTask;
}

// Toggle task completion
export async function toggleTask(id: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  // Get task and verify project belongs to org
  const task = await db.projectTask.findUnique({
    where: { id },
    include: { project: { select: { organizationId: true, id: true } } },
  });
  if (!task || task.project.organizationId !== organization.id) {
    throw new Error("Task not found");
  }

  const updatedTask = await db.projectTask.update({
    where: { id },
    data: {
      completed: !task.completed,
      completedAt: !task.completed ? new Date() : null,
    },
  });

  revalidatePath(`/projects/${task.project.id}`);
  return updatedTask;
}

// Delete a task
export async function deleteTask(id: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  // Get task and verify project belongs to org
  const task = await db.projectTask.findUnique({
    where: { id },
    include: { project: { select: { organizationId: true, id: true } } },
  });
  if (!task || task.project.organizationId !== organization.id) {
    throw new Error("Task not found");
  }

  await db.projectTask.delete({ where: { id } });

  revalidatePath(`/projects/${task.project.id}`);
}

// Reorder tasks
export async function reorderTasks(projectId: string, taskIds: string[]) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  // Verify project belongs to organization
  const project = await db.project.findFirst({
    where: { id: projectId, organizationId: organization.id },
  });
  if (!project) throw new Error("Project not found");

  // Update sort order for each task
  await Promise.all(
    taskIds.map((taskId, index) =>
      db.projectTask.update({
        where: { id: taskId },
        data: { sortOrder: index },
      })
    )
  );

  revalidatePath(`/projects/${projectId}`);
}

// Get project time entries
export async function getProjectTimeEntries(projectId: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return [];

  // Verify project belongs to organization
  const project = await db.project.findFirst({
    where: { id: projectId, organizationId: organization.id },
  });
  if (!project) return [];

  return db.timeEntry.findMany({
    where: { projectId },
    orderBy: { date: "desc" },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          companyName: true,
        },
      },
    },
  });
}

// ===========================================
// FILES
// ===========================================

// Get project files
export async function getProjectFiles(projectId: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) return [];

  // Verify project belongs to organization
  const project = await db.project.findFirst({
    where: { id: projectId, organizationId: organization.id },
  });
  if (!project) return [];

  return db.file.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: {
      uploadedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });
}

// Delete a file
export async function deleteFile(fileId: string) {
  const { organization } = await getCurrentUserAndOrg();
  if (!organization) throw new Error("Not authorized");

  // Get file and verify ownership
  const file = await db.file.findFirst({
    where: { id: fileId },
    include: {
      project: {
        select: { organizationId: true, id: true },
      },
    },
  });

  if (!file || file.project?.organizationId !== organization.id) {
    throw new Error("File not found");
  }

  // Delete from Vercel Blob
  try {
    const { del } = await import("@vercel/blob");
    await del(file.url);
  } catch (e) {
    console.warn("Blob deletion failed:", e);
  }

  // Delete from database
  await db.file.delete({ where: { id: fileId } });

  revalidatePath(`/projects/${file.project?.id}`);
}
