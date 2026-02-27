import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@servible/database";
import { getAvailableDays } from "@/lib/actions/booking";
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
        select: {
          locale: true,
          portalBookingDurations: true,
          portalBookingBuffer: true,
          portalBookingConfirm: true,
        },
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

  const durations = (site.organization.portalBookingDurations as number[]) || [30, 60];

  return {
    organizationId: site.organizationId,
    clientId: session.clientId,
    locale: site.organization.locale || "en",
    durations,
    buffer: site.organization.portalBookingBuffer,
    requiresConfirmation: site.organization.portalBookingConfirm,
  };
}

export const metadata: Metadata = {
  title: "Book Appointment",
};

const t: Record<string, Record<string, string>> = {
  nl: {
    title: "Afspraak inplannen",
    subtitle: "Kies een moment dat u het beste uitkomt.",
    notAvailableTitle: "Geen beschikbaarheid",
    notAvailableText: "Neem contact met ons op om een afspraak te maken.",
    backToBookings: "Terug naar afspraken",
  },
  en: {
    title: "Book Appointment",
    subtitle: "Pick a time that works for you.",
    notAvailableTitle: "No availability",
    notAvailableText: "Please contact us to schedule an appointment.",
    backToBookings: "Back to bookings",
  },
  de: {
    title: "Termin buchen",
    subtitle: "Wählen Sie einen passenden Zeitpunkt.",
    notAvailableTitle: "Keine Verfügbarkeit",
    notAvailableText: "Bitte kontaktieren Sie uns, um einen Termin zu vereinbaren.",
    backToBookings: "Zurück zu Terminen",
  },
  fr: {
    title: "Prendre rendez-vous",
    subtitle: "Choisissez un créneau qui vous convient.",
    notAvailableTitle: "Pas de disponibilité",
    notAvailableText: "Veuillez nous contacter pour planifier un rendez-vous.",
    backToBookings: "Retour aux rendez-vous",
  },
};

export default async function NewBookingPage({ params }: NewBookingPageProps) {
  const { domain } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("portal_token")?.value;

  const sessionData = await getSessionData(domain, token);

  if (!sessionData) {
    redirect("/portal/login");
  }

  const availDays = await getAvailableDays(sessionData.organizationId);
  const locale = sessionData.locale;
  const i = t[locale] || t.en;

  if (availDays.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{i.title}</h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            {i.notAvailableText}
          </p>
        </div>
        <div className="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {i.notAvailableTitle}
          </p>
          <a
            href="/portal/bookings"
            className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {i.backToBookings}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{i.title}</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          {i.subtitle}
        </p>
      </div>

      <div className="mx-auto max-w-xl">
        <PortalBookingForm
          organizationId={sessionData.organizationId}
          clientId={sessionData.clientId}
          durations={sessionData.durations}
          buffer={sessionData.buffer}
          requiresConfirmation={sessionData.requiresConfirmation}
          availableDays={availDays}
          locale={locale}
        />
      </div>
    </div>
  );
}
