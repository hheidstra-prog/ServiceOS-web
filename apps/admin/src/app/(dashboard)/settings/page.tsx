import { redirect } from "next/navigation";
import { getOrganizationSettings, getBusinessProfile } from "./actions";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const settings = await getOrganizationSettings();

  if (!settings) {
    redirect("/sign-in");
  }

  const businessProfile = await getBusinessProfile();

  // Serialize Decimal for client component
  const serializedSettings = {
    ...settings,
    defaultTaxRate: Number(settings.defaultTaxRate),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
          Settings
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Manage your business details and preferences.
        </p>
      </div>

      <SettingsForm settings={serializedSettings} businessProfile={businessProfile} />
    </div>
  );
}
