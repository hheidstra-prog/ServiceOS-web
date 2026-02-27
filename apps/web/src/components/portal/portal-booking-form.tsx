"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { getAvailableSlots, createPortalBooking } from "@/lib/actions/booking";

interface PortalBookingFormProps {
  organizationId: string;
  clientId: string;
  durations: number[];
  buffer: number;
  requiresConfirmation: boolean;
  availableDays: number[];
  locale?: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

type Step = "date" | "time" | "notes" | "confirmed";

const translations: Record<string, Record<string, string>> = {
  nl: {
    stepDate: "Datum",
    stepTime: "Tijd",
    stepNotes: "Notities",
    selectDate: "Kies een datum",
    selectTime: "Kies een tijd",
    addNotes: "Opmerkingen toevoegen",
    notesPlaceholder: "Beschrijf kort wat u wilt bespreken (optioneel)",
    noSlots: "Geen beschikbare tijden voor deze datum.",
    chooseAnother: "Kies een andere datum",
    confirmBooking: "Afspraak bevestigen",
    booking: "Bezig met boeken...",
    back: "Terug",
    confirmedTitle: "Afspraak bevestigd!",
    receivedTitle: "Afspraak ontvangen!",
    confirmedText: "Uw afspraak is bevestigd.",
    receivedText: "Uw aanvraag is ontvangen en wacht op bevestiging.",
    date: "Datum",
    time: "Tijd",
    duration: "Duur",
    backToBookings: "Terug naar afspraken",
    mon: "Ma", tue: "Di", wed: "Wo", thu: "Do", fri: "Vr", sat: "Za", sun: "Zo",
  },
  en: {
    stepDate: "Date",
    stepTime: "Time",
    stepNotes: "Notes",
    selectDate: "Select a date",
    selectTime: "Select a time",
    addNotes: "Add notes",
    notesPlaceholder: "Briefly describe what you'd like to discuss (optional)",
    noSlots: "No available time slots for this date.",
    chooseAnother: "Choose another date",
    confirmBooking: "Confirm Booking",
    booking: "Booking...",
    back: "Back",
    confirmedTitle: "Booking Confirmed!",
    receivedTitle: "Booking Received!",
    confirmedText: "Your appointment has been confirmed.",
    receivedText: "Your booking request has been received and is pending confirmation.",
    date: "Date",
    time: "Time",
    duration: "Duration",
    backToBookings: "Back to bookings",
    mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
  },
  de: {
    stepDate: "Datum",
    stepTime: "Uhrzeit",
    stepNotes: "Notizen",
    selectDate: "Datum auswählen",
    selectTime: "Uhrzeit auswählen",
    addNotes: "Notizen hinzufügen",
    notesPlaceholder: "Beschreiben Sie kurz, was Sie besprechen möchten (optional)",
    noSlots: "Keine verfügbaren Zeitfenster für dieses Datum.",
    chooseAnother: "Anderes Datum wählen",
    confirmBooking: "Termin bestätigen",
    booking: "Wird gebucht...",
    back: "Zurück",
    confirmedTitle: "Termin bestätigt!",
    receivedTitle: "Termin eingegangen!",
    confirmedText: "Ihr Termin wurde bestätigt.",
    receivedText: "Ihre Buchungsanfrage wurde empfangen und wartet auf Bestätigung.",
    date: "Datum",
    time: "Uhrzeit",
    duration: "Dauer",
    backToBookings: "Zurück zu Terminen",
    mon: "Mo", tue: "Di", wed: "Mi", thu: "Do", fri: "Fr", sat: "Sa", sun: "So",
  },
  fr: {
    stepDate: "Date",
    stepTime: "Heure",
    stepNotes: "Notes",
    selectDate: "Choisir une date",
    selectTime: "Choisir une heure",
    addNotes: "Ajouter des notes",
    notesPlaceholder: "Décrivez brièvement ce dont vous souhaitez discuter (optionnel)",
    noSlots: "Aucun créneau disponible pour cette date.",
    chooseAnother: "Choisir une autre date",
    confirmBooking: "Confirmer le rendez-vous",
    booking: "Réservation en cours...",
    back: "Retour",
    confirmedTitle: "Rendez-vous confirmé !",
    receivedTitle: "Rendez-vous reçu !",
    confirmedText: "Votre rendez-vous a été confirmé.",
    receivedText: "Votre demande a été reçue et est en attente de confirmation.",
    date: "Date",
    time: "Heure",
    duration: "Durée",
    backToBookings: "Retour aux rendez-vous",
    mon: "Lun", tue: "Mar", wed: "Mer", thu: "Jeu", fri: "Ven", sat: "Sam", sun: "Dim",
  },
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h} hour${h > 1 ? "s" : ""}`;
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

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

  const days: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }
  return days;
}

export function PortalBookingForm({
  organizationId,
  clientId,
  durations,
  buffer,
  requiresConfirmation,
  availableDays,
  locale = "en",
}: PortalBookingFormProps) {
  const t = translations[locale] || translations.en;
  const [step, setStep] = useState<Step>("date");
  const [selectedDuration, setSelectedDuration] = useState<number>(durations[0]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<string>("");

  const handleDurationChange = (dur: number) => {
    setSelectedDuration(dur);
    if (selectedDate) {
      setSelectedTime(null);
      fetchSlots(selectedDate, dur);
    }
  };

  const fetchSlots = async (date: Date, duration: number) => {
    setLoadingSlots(true);
    const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
    const result = await getAvailableSlots(organizationId, duration, buffer, dateStr);
    setSlots(result);
    setLoadingSlots(false);
  };

  const handleDateSelect = async (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
    await fetchSlots(date, selectedDuration);
    setStep("time");
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep("notes");
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    const dateStr = `${selectedDate!.getFullYear()}-${(selectedDate!.getMonth() + 1).toString().padStart(2, "0")}-${selectedDate!.getDate().toString().padStart(2, "0")}`;

    const result = await createPortalBooking({
      organizationId,
      clientId,
      durationMinutes: selectedDuration,
      date: dateStr,
      time: selectedTime!,
      notes: notes || undefined,
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
    if (step === "time") setStep("date");
    else if (step === "notes") setStep("time");
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

  const steps: { key: Step; label: string }[] = [
    { key: "date", label: t.stepDate },
    { key: "time", label: t.stepTime },
    { key: "notes", label: t.stepNotes },
  ];

  const stepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div>
      {/* Progress bar */}
      {step !== "confirmed" && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {steps.map((s, idx) => (
              <div key={s.key} className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    idx <= stepIndex
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "border border-zinc-300 text-zinc-400 dark:border-zinc-700 dark:text-zinc-500"
                  }`}
                >
                  {idx + 1}
                </div>
                <span
                  className={`text-sm font-medium hidden sm:inline ${
                    idx <= stepIndex
                      ? "text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-400 dark:text-zinc-500"
                  }`}
                >
                  {s.label}
                </span>
                {idx < steps.length - 1 && (
                  <div
                    className={`mx-2 h-px flex-1 min-w-[24px] ${
                      idx < stepIndex ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-200 dark:bg-zinc-800"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Back button */}
      {step !== "date" && step !== "confirmed" && (
        <button
          onClick={goBack}
          className="mb-4 flex items-center gap-1 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          {t.back}
        </button>
      )}

      {/* Step 1: Duration + Date */}
      {step === "date" && (
        <div>
          {/* Duration toggle */}
          {durations.length > 1 && (
            <div className="mb-6">
              <div className="flex items-center justify-center gap-2">
                {durations.map((dur) => (
                  <button
                    key={dur}
                    onClick={() => handleDurationChange(dur)}
                    className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                      selectedDuration === dur
                        ? "bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900"
                        : "border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
                    }`}
                  >
                    {formatDuration(dur)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            {t.selectDate}
          </h2>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            {/* Calendar header */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={prevMonth}
                disabled={!canGoPrev}
                className="rounded-lg p-1.5 hover:bg-zinc-100 disabled:opacity-30 transition-colors dark:hover:bg-zinc-800"
              >
                <ChevronLeft className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
              </button>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {new Date(calMonth.year, calMonth.month).toLocaleDateString(
                  locale === "nl" ? "nl-NL" : locale === "de" ? "de-DE" : locale === "fr" ? "fr-FR" : "en",
                  { month: "long", year: "numeric" }
                )}
              </h3>
              <button
                onClick={nextMonth}
                className="rounded-lg p-1.5 hover:bg-zinc-100 transition-colors dark:hover:bg-zinc-800"
              >
                <ChevronRight className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {[t.mon, t.tue, t.wed, t.thu, t.fri, t.sat, t.sun].map((d) => (
                <div
                  key={d}
                  className="py-1 text-center text-xs font-medium text-zinc-500 dark:text-zinc-400"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calDays.map((day, idx) => {
                if (!day) {
                  return <div key={`empty-${idx}`} />;
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
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : available
                          ? "text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
                          : "text-zinc-400 opacity-40 cursor-default dark:text-zinc-600"
                    } ${isNow && !isSelected ? "ring-1 ring-zinc-900 dark:ring-zinc-100" : ""}`}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Select time */}
      {step === "time" && (
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            {t.selectTime}
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            {selectedDate && formatDate(selectedDate, locale)} — {formatDuration(selectedDuration)}
          </p>

          {loadingSlots ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent dark:border-zinc-100 dark:border-t-transparent" />
            </div>
          ) : slots.filter((s) => s.available).length === 0 ? (
            <div className="text-center py-12">
              <p className="text-zinc-600 dark:text-zinc-400">
                {t.noSlots}
              </p>
              <button
                onClick={() => setStep("date")}
                className="mt-3 text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100"
              >
                {t.chooseAnother}
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
                    className={`rounded-xl border px-3 py-2.5 text-center text-sm font-semibold transition-all ${
                      selectedTime === slot.time
                        ? "border-2 border-zinc-900 bg-zinc-900/5 text-zinc-900 dark:border-zinc-100 dark:bg-zinc-100/5 dark:text-zinc-100"
                        : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600"
                    }`}
                  >
                    {slot.time}
                  </button>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Notes */}
      {step === "notes" && (
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            {t.addNotes}
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
            {selectedDate && formatDate(selectedDate, locale)}, {selectedTime} — {formatDuration(selectedDuration)}
          </p>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={t.notesPlaceholder}
            className="block w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
          />

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 rounded-xl bg-zinc-900 px-6 py-3 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:opacity-90"
            >
              {isSubmitting ? t.booking : t.confirmBooking}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Confirmation */}
      {step === "confirmed" && (
        <div className="text-center py-8">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {bookingStatus === "CONFIRMED" ? t.confirmedTitle : t.receivedTitle}
          </h2>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400">
            {bookingStatus === "CONFIRMED"
              ? t.confirmedText
              : t.receivedText}
          </p>

          <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 text-left dark:border-zinc-800 dark:bg-zinc-900">
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-zinc-500 dark:text-zinc-400">{t.date}</dt>
                <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {selectedDate && formatDate(selectedDate, locale)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-zinc-500 dark:text-zinc-400">{t.time}</dt>
                <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {selectedTime}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-zinc-500 dark:text-zinc-400">{t.duration}</dt>
                <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {formatDuration(selectedDuration)}
                </dd>
              </div>
            </dl>
          </div>

          <a
            href="/portal/bookings"
            className="mt-6 inline-block rounded-xl border border-zinc-200 px-6 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            {t.backToBookings}
          </a>
        </div>
      )}
    </div>
  );
}
