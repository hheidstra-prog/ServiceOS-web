import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@servible/database";
import { getPortalBookingConfig, getAvailableDays } from "@/lib/actions/booking";
import { PortalBookingForm } from "@/components/portal/portal-booking-form";

interface NewBookingPageProps {
  params: Promise<{ domain: string }>;
}

async function getSessionData(domain: string, token: string | undefined) {
  if (!token) return null;

  const site = await db.site.findFirst({
    where: {
      OR: [{ subdomain: domain }, { customDomain: domain }],
      status: "PUBLISHED",
      portalEnabled: true,
    },
    select: {
      organizationId: true,
      organization: {
        select: { locale: true },
      },
    },
  });

  if (!site) return null;

  const session = await db.portalSession.findFirst({
    where: {
      token,
      expiresAt: { gt: new Date() },
      client: { organizationId: site.organizationId },
    },
    select: { clientId: true },
  });

  if (!session) return null;

  return {
    organizationId: site.organizationId,
    clientId: session.clientId,
    locale: site.organization.locale || "en",
  };
}

export const metadata: Metadata = {
  title: "Book Appointment",
};

export default async function NewBookingPage({ params }: NewBookingPageProps) {
  const { domain } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("portal_token")?.value;

  const sessionData = await getSessionData(domain, token);

  if (!sessionData) {
    redirect("/portal/login");
  }

  const [config, availDays] = await Promise.all([
    getPortalBookingConfig(sessionData.organizationId),
    getAvailableDays(sessionData.organizationId),
  ]);

  if (!config || config.bookingTypes.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Book Appointment</h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            No booking types are currently available.
          </p>
        </div>
        <div className="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Please contact us to schedule an appointment.
          </p>
          <a
            href="/portal/bookings"
            className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Back to bookings
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Book Appointment</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Select a service and choose your preferred date and time.
        </p>
      </div>

      <div className="mx-auto max-w-xl">
        <PortalBookingForm
          organizationId={sessionData.organizationId}
          clientId={sessionData.clientId}
          bookingTypes={config.bookingTypes}
          availableDays={availDays}
          locale={sessionData.locale}
        />
      </div>
    </div>
  );
}
