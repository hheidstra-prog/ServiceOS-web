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

  // If user has no organization, redirect to onboarding
  if (!organization) {
    redirect("/onboarding");
  }

  // If active org hasn't completed onboarding, check if another org has
  // (e.g. invited user whose personal org isn't set up yet)
  if (!organization.onboardingCompletedAt) {
    const completedMembership = user.memberships.find(
      (m) => m.organization.onboardingCompletedAt
    );
    if (completedMembership) {
      // Redirect through complete route to set cookie to the right org
      redirect(
        `/invite/accept/complete?org=${completedMembership.organizationId}`
      );
    }
    redirect("/onboarding");
  }

  const runningTimer = await getRunningTimer();

  return (
    <div className="flex h-dvh overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar - hidden on mobile */}
      <aside className="hidden w-64 flex-shrink-0 lg:block">
        <Sidebar
          userFirstName={user.firstName}
          userLastName={user.lastName}
          userEmail={user.email}
          userImageUrl={user.imageUrl}
        />
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          organizationName={organization.name}
          userFirstName={user.firstName}
          userLastName={user.lastName}
          userEmail={user.email}
          userImageUrl={user.imageUrl}
        />
        {runningTimer && <TimerBar timer={runningTimer} />}
        <main className="flex-1 overflow-auto bg-zinc-50 p-4 dark:bg-zinc-950 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
