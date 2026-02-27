import { notFound } from "next/navigation";
import { db } from "@servible/database";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { isPreviewMode } from "@/lib/preview";
import { getPublicBookingConfig, getAvailableDays } from "@/lib/actions/booking";
import { BookingForm } from "./booking-form";

export const dynamic = "force-dynamic";

const t: Record<string, Record<string, string>> = {
  nl: {
    subtitle: "Kies een moment dat u het beste uitkomt.",
    notAvailableTitle: "Reserveren niet beschikbaar",
    notAvailableText: "Online reserveren is momenteel niet beschikbaar. Neem direct contact met ons op.",
    metaTitle: "Afspraak maken",
  },
  en: {
    subtitle: "Pick a time that works for you.",
    notAvailableTitle: "Booking not available",
    notAvailableText: "Online booking is not currently available. Please contact us directly.",
    metaTitle: "Book an Appointment",
  },
  de: {
    subtitle: "Wählen Sie einen passenden Zeitpunkt.",
    notAvailableTitle: "Buchung nicht verfügbar",
    notAvailableText: "Online-Buchung ist derzeit nicht verfügbar. Bitte kontaktieren Sie uns direkt.",
    metaTitle: "Termin buchen",
  },
  fr: {
    subtitle: "Choisissez un créneau qui vous convient.",
    notAvailableTitle: "Réservation indisponible",
    notAvailableText: "La réservation en ligne n'est pas disponible actuellement. Veuillez nous contacter directement.",
    metaTitle: "Prendre rendez-vous",
  },
};

interface BookPageProps {
  params: Promise<{ domain: string }>;
}

async function getSiteForBooking(domain: string) {
  const preview = await isPreviewMode(domain);

  const site = await db.site.findFirst({
    where: {
      OR: [{ subdomain: domain }, { customDomain: domain }],
      ...(preview ? {} : { status: "PUBLISHED" }),
      bookingEnabled: true,
    },
    select: {
      id: true,
      name: true,
      organizationId: true,
      organization: {
        select: { name: true, locale: true },
      },
    },
  });

  return site;
}

export async function generateMetadata({ params }: BookPageProps) {
  const { domain } = await params;
  const site = await getSiteForBooking(domain);

  if (!site) return { title: "Booking Not Available" };

  const locale = site.organization.locale || "en";
  const i = t[locale] || t.en;

  return {
    title: i.metaTitle,
    description: `${i.metaTitle} — ${site.organization.name}`,
  };
}

export default async function BookPage({ params }: BookPageProps) {
  const { domain } = await params;
  const site = await getSiteForBooking(domain);

  if (!site) {
    notFound();
  }

  const [config, availableDays] = await Promise.all([
    getPublicBookingConfig(site.organizationId),
    getAvailableDays(site.organizationId),
  ]);

  const locale = site.organization.locale || "en";
  const i = t[locale] || t.en;

  if (!config || availableDays.length === 0) {
    return (
      <>
        <SiteHeader />
        <main className="min-h-screen flex items-center justify-center bg-surface">
          <div className="text-center px-4">
            <h1 className="text-2xl font-bold text-on-surface">
              {i.notAvailableTitle}
            </h1>
            <p className="mt-2 text-on-surface-secondary">
              {i.notAvailableText}
            </p>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-surface">
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-2xl px-4 sm:px-6">
            <div className="text-center mb-10">
              <h1 className="text-3xl font-bold tracking-tight text-on-surface sm:text-4xl">
                {config.title}
              </h1>
              <p className="mt-3 text-lg text-on-surface-secondary">
                {i.subtitle}
              </p>
            </div>
            <BookingForm
              organizationId={site.organizationId}
              durations={config.durations}
              buffer={config.buffer}
              requiresConfirmation={config.requiresConfirmation}
              availableDays={availableDays}
              locale={locale}
            />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
