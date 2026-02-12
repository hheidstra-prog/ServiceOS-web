import { getProjects } from "./actions";
import { ProjectsList } from "./projects-list";

export default async function ProjectsPage() {
  const projects = await getProjects();

  // Serialize Decimal values for client components
  const serializedProjects = projects.map((project) => ({
    ...project,
    budget: project.budget ? Number(project.budget) : null,
  }));

  return <ProjectsList projects={serializedProjects} />;
}
