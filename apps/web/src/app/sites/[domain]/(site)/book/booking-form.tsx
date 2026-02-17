"use client";

import { useState } from "react";
import { Clock, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { getAvailableSlots, createPublicBooking } from "@/lib/actions/booking";

interface BookingType {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number | null;
  currency: string;
  color: string | null;
  requiresConfirmation: boolean;
}

interface BookingFormProps {
  organizationId: string;
  bookingTypes: BookingType[];
  availableDays: number[]; // day-of-week numbers (0=Sun)
  locale?: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

type Step = "type" | "date" | "time" | "details" | "confirmed";

const translations: Record<string, Record<string, string>> = {
  nl: {
    stepService: "Dienst",
    stepDate: "Datum",
    stepTime: "Tijd",
    stepDetails: "Gegevens",
    selectService: "Kies een dienst",
    selectDate: "Kies een datum",
    selectTime: "Kies een tijd",
    yourDetails: "Uw gegevens",
    noSlots: "Geen beschikbare tijden voor deze datum.",
    chooseAnother: "Kies een andere datum",
    name: "Naam",
    email: "E-mail",
    phone: "Telefoon",
    notes: "Opmerkingen",
    notesPlaceholder: "Beschrijf kort wat u wilt bespreken",
    namePlaceholder: "Uw volledige naam",
    phonePlaceholder: "Uw telefoonnummer",
    confirmBooking: "Afspraak bevestigen",
    booking: "Bezig met boeken...",
    back: "Terug",
    confirmedTitle: "Afspraak bevestigd!",
    receivedTitle: "Afspraak ontvangen!",
    confirmedText: "Uw afspraak is bevestigd.",
    receivedText: "Uw aanvraag is ontvangen en wacht op bevestiging.",
    service: "Dienst",
    date: "Datum",
    time: "Tijd",
    duration: "Duur",
    price: "Prijs",
    confirmationEmail: "Een bevestiging wordt gestuurd naar",
    backToSite: "Terug naar site",
    mon: "Ma", tue: "Di", wed: "Wo", thu: "Do", fri: "Vr", sat: "Za", sun: "Zo",
  },
  en: {
    stepService: "Service",
    stepDate: "Date",
    stepTime: "Time",
    stepDetails: "Details",
    selectService: "Select a service",
    selectDate: "Select a date",
    selectTime: "Select a time",
    yourDetails: "Your details",
    noSlots: "No available time slots for this date.",
    chooseAnother: "Choose another date",
    name: "Name",
    email: "Email",
    phone: "Phone",
    notes: "Notes",
    notesPlaceholder: "Briefly describe what you'd like to discuss",
    namePlaceholder: "Your full name",
    phonePlaceholder: "Your phone number",
    confirmBooking: "Confirm Booking",
    booking: "Booking...",
    back: "Back",
    confirmedTitle: "Booking Confirmed!",
    receivedTitle: "Booking Received!",
    confirmedText: "Your appointment has been confirmed.",
    receivedText: "Your booking request has been received and is pending confirmation.",
    service: "Service",
    date: "Date",
    time: "Time",
    duration: "Duration",
    price: "Price",
    confirmationEmail: "A confirmation will be sent to",
    backToSite: "Back to site",
    mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
  },
  de: {
    stepService: "Service",
    stepDate: "Datum",
    stepTime: "Uhrzeit",
    stepDetails: "Details",
    selectService: "Service auswählen",
    selectDate: "Datum auswählen",
    selectTime: "Uhrzeit auswählen",
    yourDetails: "Ihre Angaben",
    noSlots: "Keine verfügbaren Zeitfenster für dieses Datum.",
    chooseAnother: "Anderes Datum wählen",
    name: "Name",
    email: "E-Mail",
    phone: "Telefon",
    notes: "Anmerkungen",
    notesPlaceholder: "Beschreiben Sie kurz, was Sie besprechen möchten",
    namePlaceholder: "Ihr vollständiger Name",
    phonePlaceholder: "Ihre Telefonnummer",
    confirmBooking: "Termin bestätigen",
    booking: "Wird gebucht...",
    back: "Zurück",
    confirmedTitle: "Termin bestätigt!",
    receivedTitle: "Termin eingegangen!",
    confirmedText: "Ihr Termin wurde bestätigt.",
    receivedText: "Ihre Buchungsanfrage wurde empfangen und wartet auf Bestätigung.",
    service: "Service",
    date: "Datum",
    time: "Uhrzeit",
    duration: "Dauer",
    price: "Preis",
    confirmationEmail: "Eine Bestätigung wird gesendet an",
    backToSite: "Zurück zur Seite",
    mon: "Mo", tue: "Di", wed: "Mi", thu: "Do", fri: "Fr", sat: "Sa", sun: "So",
  },
  fr: {
    stepService: "Service",
    stepDate: "Date",
    stepTime: "Heure",
    stepDetails: "Coordonnées",
    selectService: "Choisir un service",
    selectDate: "Choisir une date",
    selectTime: "Choisir une heure",
    yourDetails: "Vos coordonnées",
    noSlots: "Aucun créneau disponible pour cette date.",
    chooseAnother: "Choisir une autre date",
    name: "Nom",
    email: "E-mail",
    phone: "Téléphone",
    notes: "Remarques",
    notesPlaceholder: "Décrivez brièvement ce dont vous souhaitez discuter",
    namePlaceholder: "Votre nom complet",
    phonePlaceholder: "Votre numéro de téléphone",
    confirmBooking: "Confirmer le rendez-vous",
    booking: "Réservation en cours...",
    back: "Retour",
    confirmedTitle: "Rendez-vous confirmé !",
    receivedTitle: "Rendez-vous reçu !",
    confirmedText: "Votre rendez-vous a été confirmé.",
    receivedText: "Votre demande a été reçue et est en attente de confirmation.",
    service: "Service",
    date: "Date",
    time: "Heure",
    duration: "Durée",
    price: "Prix",
    confirmationEmail: "Une confirmation sera envoyée à",
    backToSite: "Retour au site",
    mon: "Lun", tue: "Mar", wed: "Mer", thu: "Jeu", fri: "Ven", sat: "Sam", sun: "Dim",
  },
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h} hour${h > 1 ? "s" : ""}`;
}

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(price);
}

function formatDate(date: Date, locale: string): string {
  const loc = locale === "nl" ? "nl-NL" : locale === "de" ? "de-DE" : locale === "fr" ? "fr-FR" : "en";
  return date.toLocaleDateString(loc, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Generate calendar days for a month
function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Mon start

  const days: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }
  return days;
}

const btnBase =
  "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-4 py-3 text-left transition-all hover:border-[var(--color-primary-500)] hover:shadow-sm";
const btnSelected =
  "rounded-xl border-2 border-[var(--color-primary-500)] bg-[var(--color-primary-500)]/5 px-4 py-3 text-left shadow-sm";
const inputClass =
  "block w-full rounded-xl border border-[var(--color-input-border)] bg-[var(--color-surface-alt)] px-4 py-3 text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-muted)] focus:border-[var(--color-primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/25 transition-colors";

export function BookingForm({ organizationId, bookingTypes, availableDays, locale = "en" }: BookingFormProps) {
  const i = translations[locale] || translations.en;
  const [step, setStep] = useState<Step>("type");
  const [selectedType, setSelectedType] = useState<BookingType | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [hp, setHp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<string>("");

  // Skip type selection if only one type
  const handleTypeSelect = (type: BookingType) => {
    setSelectedType(type);
    setStep("date");
  };

  const handleDateSelect = async (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
    setLoadingSlots(true);

    const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
    const result = await getAvailableSlots(organizationId, selectedType!.id, dateStr);
    setSlots(result);
    setLoadingSlots(false);
    setStep("time");
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep("details");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const dateStr = `${selectedDate!.getFullYear()}-${(selectedDate!.getMonth() + 1).toString().padStart(2, "0")}-${selectedDate!.getDate().toString().padStart(2, "0")}`;

    const result = await createPublicBooking({
      organizationId,
      bookingTypeId: selectedType!.id,
      date: dateStr,
      time: selectedTime!,
      name,
      email,
      phone: phone || undefined,
      notes: notes || undefined,
      _hp: hp || undefined,
    });

    if (result.success) {
      setBookingStatus(result.status);
      setStep("confirmed");
    } else {
      setError(result.error);
    }
    setIsSubmitting(false);
  };

  const goBack = () => {
    if (step === "date") setStep("type");
    else if (step === "time") setStep("date");
    else if (step === "details") setStep("time");
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const calDays = getCalendarDays(calMonth.year, calMonth.month);

  const isDayAvailable = (day: Date | null) => {
    if (!day) return false;
    if (day < today) return false;
    return availableDays.includes(day.getDay());
  };

  const prevMonth = () => {
    setCalMonth((prev) => {
      const d = new Date(prev.year, prev.month - 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const nextMonth = () => {
    setCalMonth((prev) => {
      const d = new Date(prev.year, prev.month + 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const canGoPrev = calMonth.year > today.getFullYear() || calMonth.month > today.getMonth();

  // Step indicators
  const steps: { key: Step; label: string }[] = [
    { key: "type", label: i.stepService },
    { key: "date", label: i.stepDate },
    { key: "time", label: i.stepTime },
    { key: "details", label: i.stepDetails },
  ];

  const stepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div>
      {/* Progress bar */}
      {step !== "confirmed" && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    i <= stepIndex
                      ? "text-white"
                      : "border border-[var(--color-border)] text-[var(--color-on-surface-muted)]"
                  }`}
                  style={i <= stepIndex ? { background: "var(--color-primary-500)" } : undefined}
                >
                  {i + 1}
                </div>
                <span
                  className={`text-sm font-medium hidden sm:inline ${
                    i <= stepIndex
                      ? "text-[var(--color-on-surface)]"
                      : "text-[var(--color-on-surface-muted)]"
                  }`}
                >
                  {s.label}
                </span>
                {i < steps.length - 1 && (
                  <div
                    className={`mx-2 h-px flex-1 min-w-[24px] ${
                      i < stepIndex ? "bg-[var(--color-primary-500)]" : "bg-[var(--color-border)]"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Back button */}
      {step !== "type" && step !== "confirmed" && (
        <button
          onClick={goBack}
          className="mb-4 flex items-center gap-1 text-sm font-medium text-[var(--color-on-surface-secondary)] hover:text-[var(--color-on-surface)] transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          {i.back}
        </button>
      )}

      {/* Step 1: Select booking type */}
      {step === "type" && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-[var(--color-on-surface)]">
            {i.selectService}
          </h2>
          {bookingTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => handleTypeSelect(type)}
              className={`${btnBase} w-full`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[var(--color-on-surface)]">{type.name}</p>
                  {type.description && (
                    <p className="mt-1 text-sm text-[var(--color-on-surface-secondary)]">
                      {type.description}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-sm text-[var(--color-on-surface-muted)]">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDuration(type.durationMinutes)}
                    </span>
                    {type.price != null && type.price > 0 && (
                      <span className="font-medium text-[var(--color-on-surface)]">
                        {formatPrice(type.price, type.currency)}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-[var(--color-on-surface-muted)]" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Step 2: Select date */}
      {step === "date" && (
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-on-surface)] mb-4">
            {i.selectDate}
          </h2>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4">
            {/* Calendar header */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={prevMonth}
                disabled={!canGoPrev}
                className="rounded-lg p-1.5 hover:bg-[var(--color-surface)] disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-[var(--color-on-surface)]" />
              </button>
              <h3 className="text-sm font-semibold text-[var(--color-on-surface)]">
                {new Date(calMonth.year, calMonth.month).toLocaleDateString(
                  locale === "nl" ? "nl-NL" : locale === "de" ? "de-DE" : locale === "fr" ? "fr-FR" : "en",
                  { month: "long", year: "numeric" }
                )}
              </h3>
              <button
                onClick={nextMonth}
                className="rounded-lg p-1.5 hover:bg-[var(--color-surface)] transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-[var(--color-on-surface)]" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {[i.mon, i.tue, i.wed, i.thu, i.fri, i.sat, i.sun].map((d) => (
                <div
                  key={d}
                  className="py-1 text-center text-xs font-medium text-[var(--color-on-surface-muted)]"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calDays.map((day, i) => {
                if (!day) {
                  return <div key={`empty-${i}`} />;
                }
                const available = isDayAvailable(day);
                const isSelected =
                  selectedDate?.getDate() === day.getDate() &&
                  selectedDate?.getMonth() === day.getMonth() &&
                  selectedDate?.getFullYear() === day.getFullYear();
                const isNow =
                  day.getDate() === today.getDate() &&
                  day.getMonth() === today.getMonth() &&
                  day.getFullYear() === today.getFullYear();

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => available && handleDateSelect(day)}
                    disabled={!available}
                    className={`aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                      isSelected
                        ? "text-white"
                        : available
                          ? "text-[var(--color-on-surface)] hover:bg-[var(--color-primary-500)]/10"
                          : "text-[var(--color-on-surface-muted)] opacity-40 cursor-default"
                    } ${isNow && !isSelected ? "ring-1 ring-[var(--color-primary-500)]" : ""}`}
                    style={
                      isSelected ? { background: "var(--color-primary-500)" } : undefined
                    }
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Select time */}
      {step === "time" && (
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-on-surface)] mb-1">
            {i.selectTime}
          </h2>
          <p className="text-sm text-[var(--color-on-surface-secondary)] mb-4">
            {selectedDate && formatDate(selectedDate, locale)}
          </p>

          {loadingSlots ? (
            <div className="flex items-center justify-center py-12">
              <div
                className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
                style={{ borderColor: "var(--color-primary-500)", borderTopColor: "transparent" }}
              />
            </div>
          ) : slots.filter((s) => s.available).length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[var(--color-on-surface-secondary)]">
                {i.noSlots}
              </p>
              <button
                onClick={() => setStep("date")}
                className="mt-3 text-sm font-medium hover:underline"
                style={{ color: "var(--color-primary-500)" }}
              >
                {i.chooseAnother}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {slots
                .filter((s) => s.available)
                .map((slot) => (
                  <button
                    key={slot.time}
                    onClick={() => handleTimeSelect(slot.time)}
                    className={`${
                      selectedTime === slot.time ? btnSelected : btnBase
                    } text-center !px-3 !py-2.5`}
                  >
                    <span className="text-sm font-semibold text-[var(--color-on-surface)]">
                      {slot.time}
                    </span>
                  </button>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Step 4: Enter details */}
      {step === "details" && (
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-on-surface)] mb-1">
            {i.yourDetails}
          </h2>
          <p className="text-sm text-[var(--color-on-surface-secondary)] mb-6">
            {selectedType?.name} — {selectedDate && formatDate(selectedDate, locale)}, {selectedTime}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Honeypot */}
            <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
              <input
                type="text"
                name="company_url"
                tabIndex={-1}
                autoComplete="new-password"
                value={hp}
                onChange={(e) => setHp(e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-1.5">
                  {i.name} *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={i.namePlaceholder}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-1.5">
                  {i.email} *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-1.5">
                {i.phone} *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={i.phonePlaceholder}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-1.5">
                {i.notes} *
              </label>
              <textarea
                required
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={i.notesPlaceholder}
                className={inputClass}
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl px-6 py-3 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: "var(--color-primary-500)" }}
            >
              {isSubmitting ? i.booking : i.confirmBooking}
            </button>
          </form>
        </div>
      )}

      {/* Step 5: Confirmation */}
      {step === "confirmed" && (
        <div className="text-center py-8">
          <div
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: "var(--color-primary-500)" }}
          >
            <CheckCircle2 className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--color-on-surface)]">
            {bookingStatus === "CONFIRMED" ? i.confirmedTitle : i.receivedTitle}
          </h2>
          <p className="mt-3 text-[var(--color-on-surface-secondary)]">
            {bookingStatus === "CONFIRMED"
              ? i.confirmedText
              : i.receivedText}
          </p>

          <div className="mt-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-6 text-left">
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-[var(--color-on-surface-muted)]">{i.service}</dt>
                <dd className="text-sm font-medium text-[var(--color-on-surface)]">
                  {selectedType?.name}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-[var(--color-on-surface-muted)]">{i.date}</dt>
                <dd className="text-sm font-medium text-[var(--color-on-surface)]">
                  {selectedDate && formatDate(selectedDate, locale)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-[var(--color-on-surface-muted)]">{i.time}</dt>
                <dd className="text-sm font-medium text-[var(--color-on-surface)]">
                  {selectedTime}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-[var(--color-on-surface-muted)]">{i.duration}</dt>
                <dd className="text-sm font-medium text-[var(--color-on-surface)]">
                  {selectedType && formatDuration(selectedType.durationMinutes)}
                </dd>
              </div>
              {selectedType?.price != null && selectedType.price > 0 && (
                <div className="flex justify-between">
                  <dt className="text-sm text-[var(--color-on-surface-muted)]">{i.price}</dt>
                  <dd className="text-sm font-medium text-[var(--color-on-surface)]">
                    {formatPrice(selectedType.price, selectedType.currency)}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <p className="mt-6 text-sm text-[var(--color-on-surface-muted)]">
            {i.confirmationEmail} <strong>{email}</strong>
          </p>

          <button
            onClick={() => window.history.back()}
            className="mt-6 inline-block rounded-xl border border-[var(--color-border)] px-6 py-2.5 text-sm font-medium text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-alt)]"
          >
            {i.backToSite}
          </button>
        </div>
      )}
    </div>
  );
}
