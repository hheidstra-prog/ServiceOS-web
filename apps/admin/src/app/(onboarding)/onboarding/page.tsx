import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentOrganization } from "@/lib/auth";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Check active org first (respects active_org cookie from invite flow)
  const activeOrg = await getCurrentOrganization();
  if (activeOrg?.onboardingCompletedAt) {
    redirect("/dashboard");
  }

  // Also check if any membership has completed onboarding (invited users)
  const completedOrg = user.memberships.find(
    (m) => m.organization.onboardingCompletedAt
  );
  if (completedOrg) {
    redirect("/dashboard");
  }

  // Get user's name for the form
  const userName = user.firstName
    ? `${user.firstName}'s Business`
    : undefined;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Welcome to Servible</h1>
        <p className="mt-2 text-muted-foreground">
          Let&apos;s set up your business in a few simple steps
        </p>
      </div>

      <OnboardingForm
        initialName={userName}
        initialEmail={user.email}
      />
    </div>
  );
}
