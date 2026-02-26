import { getWeekTimeEntries, getTimeStats, getClientsForSelect, getProjectsForSelect, getServicesForSelect } from "./actions";
import { TimeTracker } from "./time-tracker";

export default async function TimePage() {
  // Get current week's start (Monday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Monday start
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);

  const [entries, stats, clients, projects, services] = await Promise.all([
    getWeekTimeEntries(weekStart),
    getTimeStats({
      startDate: weekStart,
      endDate: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000),
    }),
    getClientsForSelect(),
    getProjectsForSelect(),
    getServicesForSelect(),
  ]);

  // Serialize for client components
  const serializedEntries = entries.map((entry) => ({
    ...entry,
    hourlyRate: entry.hourlyRate ? Number(entry.hourlyRate) : null,
  }));

  const serializedProjects = projects.map((project) => ({
    ...project,
  }));

  const serializedServices = services.map((s) => ({
    ...s,
    price: Number(s.price),
  }));

  return (
    <TimeTracker
      initialEntries={serializedEntries}
      initialStats={stats}
      clients={clients}
      projects={serializedProjects}
      services={serializedServices}
      weekStart={weekStart}
    />
  );
}
