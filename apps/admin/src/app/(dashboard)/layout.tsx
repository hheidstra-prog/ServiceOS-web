import { redirect } from "next/navigation";
import { getCurrentUserAndOrg } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { TimerBar } from "@/components/layout/timer-bar";
import { getRunningTimer } from "./time/actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, organization } = await getCurrentUserAndOrg();

  if (!user) {
    redirect("/sign-in");
  }

  // If user has no organization or hasn't completed onboarding, redirect
  if (!organization || !organization.onboardingCompletedAt) {
    redirect("/onboarding");
  }

  const runningTimer = await getRunningTimer();

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-zinc-950">
      {/* Sidebar - hidden on mobile */}
      <aside className="hidden w-64 flex-shrink-0 lg:block">
        <Sidebar />
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header organizationName={organization.name} />
        {runningTimer && <TimerBar timer={runningTimer} />}
        <main className="flex-1 overflow-auto bg-white p-4 dark:bg-zinc-950 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
