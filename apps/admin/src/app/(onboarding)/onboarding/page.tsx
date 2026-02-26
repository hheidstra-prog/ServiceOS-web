import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // If onboarding already completed, redirect to dashboard
  const organization = user.memberships[0]?.organization;
  if (organization?.onboardingCompletedAt) {
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
