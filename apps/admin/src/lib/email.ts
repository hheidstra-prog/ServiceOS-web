import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend() {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      throw new Error(
        "RESEND_API_KEY is not set. Add it to .env.local to enable portal emails."
      );
    }
    _resend = new Resend(key);
  }
  return _resend;
}

interface SendPortalMagicLinkParams {
  to: string;
  clientName: string;
  organizationName: string;
  magicLink: string;
  locale: string;
}

interface SendInvoiceEmailParams {
  to: string;
  clientName: string;
  organizationName: string;
  invoiceNumber: string;
  totalFormatted: string;
  dueDateFormatted: string;
  locale: string;
  pdfBuffer: Buffer;
  pdfFilename: string;
}

interface SendQuoteEmailParams {
  to: string;
  clientName: string;
  organizationName: string;
  quoteNumber: string;
  quoteTitle: string | null;
  totalFormatted: string;
  validUntilFormatted: string | null;
  locale: string;
  pdfBuffer: Buffer;
  pdfFilename: string;
}

interface SendBookingConfirmationParams {
  to: string;
  guestName: string;
  organizationName: string;
  dateFormatted: string;
  time: string;
  durationMinutes: number;
  status: "CONFIRMED" | "PENDING";
  locale: string;
}

interface SendBookingCancellationParams {
  to: string;
  guestName: string;
  organizationName: string;
  dateFormatted: string;
  time: string;
  locale: string;
}

const translations: Record<
  string,
  {
    subject: (org: string) => string;
    greeting: (name: string) => string;
    body: (org: string) => string;
    cta: string;
    expiry: string;
    ignore: string;
  }
> = {
  nl: {
    subject: (org) => `Inloggen bij ${org}`,
    greeting: (name) => `Hallo ${name},`,
    body: (org) =>
      `Klik op de onderstaande knop om in te loggen bij het klantenportaal van ${org}.`,
    cta: "Inloggen",
    expiry: "Deze link is 24 uur geldig.",
    ignore:
      "Als u dit niet heeft aangevraagd, kunt u deze e-mail negeren.",
  },
  en: {
    subject: (org) => `Sign in to ${org}`,
    greeting: (name) => `Hi ${name},`,
    body: (org) =>
      `Click the button below to sign in to the ${org} client portal.`,
    cta: "Sign in",
    expiry: "This link expires in 24 hours.",
    ignore:
      "If you didn't request this, you can safely ignore this email.",
  },
  de: {
    subject: (org) => `Anmelden bei ${org}`,
    greeting: (name) => `Hallo ${name},`,
    body: (org) =>
      `Klicken Sie auf die Schaltfl\u00e4che unten, um sich beim Kundenportal von ${org} anzumelden.`,
    cta: "Anmelden",
    expiry: "Dieser Link ist 24 Stunden g\u00fcltig.",
    ignore:
      "Wenn Sie dies nicht angefordert haben, k\u00f6nnen Sie diese E-Mail ignorieren.",
  },
  fr: {
    subject: (org) => `Connexion \u00e0 ${org}`,
    greeting: (name) => `Bonjour ${name},`,
    body: (org) =>
      `Cliquez sur le bouton ci-dessous pour vous connecter au portail client de ${org}.`,
    cta: "Se connecter",
    expiry: "Ce lien expire dans 24 heures.",
    ignore:
      "Si vous n'avez pas demand\u00e9 ceci, vous pouvez ignorer cet e-mail.",
  },
};

export async function sendPortalMagicLink({
  to,
  clientName,
  organizationName,
  magicLink,
  locale,
}: SendPortalMagicLinkParams) {
  const t = translations[locale] || translations.en;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 0;text-align:center;">
              <h1 style="margin:0;font-size:20px;font-weight:600;color:#18181b;">${organizationName}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;">
              <p style="margin:0 0 16px;font-size:15px;color:#3f3f46;">${t.greeting(clientName)}</p>
              <p style="margin:0 0 24px;font-size:15px;color:#3f3f46;">${t.body(organizationName)}</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${magicLink}" style="display:inline-block;padding:12px 32px;background-color:#18181b;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:500;">${t.cta}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:13px;color:#71717a;">${t.expiry}</p>
              <p style="margin:8px 0 0;font-size:13px;color:#71717a;">${t.ignore}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #e4e4e7;text-align:center;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">Powered by Servible</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  const { error } = await getResend().emails.send({
    from: fromEmail,
    to,
    subject: t.subject(organizationName),
    html,
  });

  if (error) {
    console.error("Failed to send portal magic link email:", error);
    throw new Error("Failed to send email");
  }
}

// ─── Invoice Email ───

const invoiceTranslations: Record<
  string,
  {
    subject: (num: string, org: string) => string;
    greeting: (name: string) => string;
    intro: (org: string) => string;
    numberLabel: string;
    amountLabel: string;
    dueDateLabel: string;
    attached: string;
  }
> = {
  nl: {
    subject: (num, org) => `Factuur ${num} van ${org}`,
    greeting: (name) => `Hallo ${name},`,
    intro: (org) => `Hierbij ontvangt u een factuur van ${org}.`,
    numberLabel: "Factuurnummer",
    amountLabel: "Bedrag",
    dueDateLabel: "Vervaldatum",
    attached: "De factuur is bijgevoegd als PDF.",
  },
  en: {
    subject: (num, org) => `Invoice ${num} from ${org}`,
    greeting: (name) => `Hi ${name},`,
    intro: (org) => `Please find attached an invoice from ${org}.`,
    numberLabel: "Invoice number",
    amountLabel: "Amount",
    dueDateLabel: "Due date",
    attached: "The invoice is attached as a PDF.",
  },
  de: {
    subject: (num, org) => `Rechnung ${num} von ${org}`,
    greeting: (name) => `Hallo ${name},`,
    intro: (org) => `Anbei erhalten Sie eine Rechnung von ${org}.`,
    numberLabel: "Rechnungsnummer",
    amountLabel: "Betrag",
    dueDateLabel: "Fälligkeitsdatum",
    attached: "Die Rechnung ist als PDF beigefügt.",
  },
  fr: {
    subject: (num, org) => `Facture ${num} de ${org}`,
    greeting: (name) => `Bonjour ${name},`,
    intro: (org) => `Veuillez trouver ci-joint une facture de ${org}.`,
    numberLabel: "Numéro de facture",
    amountLabel: "Montant",
    dueDateLabel: "Date d'échéance",
    attached: "La facture est jointe en PDF.",
  },
};

export async function sendInvoiceEmail({
  to,
  clientName,
  organizationName,
  invoiceNumber,
  totalFormatted,
  dueDateFormatted,
  locale,
  pdfBuffer,
  pdfFilename,
}: SendInvoiceEmailParams) {
  const t = invoiceTranslations[locale] || invoiceTranslations.en;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 0;text-align:center;">
              <h1 style="margin:0;font-size:20px;font-weight:600;color:#18181b;">${organizationName}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;">
              <p style="margin:0 0 16px;font-size:15px;color:#3f3f46;">${t.greeting(clientName)}</p>
              <p style="margin:0 0 24px;font-size:15px;color:#3f3f46;">${t.intro(organizationName)}</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="padding:12px 16px;font-size:14px;color:#71717a;border-bottom:1px solid #e4e4e7;">${t.numberLabel}</td>
                  <td style="padding:12px 16px;font-size:14px;color:#18181b;font-weight:500;border-bottom:1px solid #e4e4e7;text-align:right;">${invoiceNumber}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;font-size:14px;color:#71717a;border-bottom:1px solid #e4e4e7;">${t.amountLabel}</td>
                  <td style="padding:12px 16px;font-size:14px;color:#18181b;font-weight:500;border-bottom:1px solid #e4e4e7;text-align:right;">${totalFormatted}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;font-size:14px;color:#71717a;">${t.dueDateLabel}</td>
                  <td style="padding:12px 16px;font-size:14px;color:#18181b;font-weight:500;text-align:right;">${dueDateFormatted}</td>
                </tr>
              </table>
              <p style="margin:0;font-size:13px;color:#71717a;">${t.attached}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #e4e4e7;text-align:center;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">Powered by Servible</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  const { error } = await getResend().emails.send({
    from: fromEmail,
    to,
    subject: t.subject(invoiceNumber, organizationName),
    html,
    attachments: [
      {
        content: pdfBuffer,
        filename: pdfFilename,
        contentType: "application/pdf",
      },
    ],
  });

  if (error) {
    console.error("Failed to send invoice email:", error);
    throw new Error("Failed to send invoice email");
  }
}

// ─── Quote Email ───

const quoteTranslations: Record<
  string,
  {
    subject: (num: string, org: string) => string;
    greeting: (name: string) => string;
    intro: (org: string) => string;
    titleLabel: string;
    numberLabel: string;
    amountLabel: string;
    validUntilLabel: string;
    attached: string;
  }
> = {
  nl: {
    subject: (num, org) => `Offerte ${num} van ${org}`,
    greeting: (name) => `Hallo ${name},`,
    intro: (org) => `Hierbij ontvangt u een offerte van ${org}.`,
    titleLabel: "Titel",
    numberLabel: "Offertenummer",
    amountLabel: "Bedrag",
    validUntilLabel: "Geldig tot",
    attached: "De offerte is bijgevoegd als PDF.",
  },
  en: {
    subject: (num, org) => `Quote ${num} from ${org}`,
    greeting: (name) => `Hi ${name},`,
    intro: (org) => `Please find attached a quote from ${org}.`,
    titleLabel: "Title",
    numberLabel: "Quote number",
    amountLabel: "Amount",
    validUntilLabel: "Valid until",
    attached: "The quote is attached as a PDF.",
  },
  de: {
    subject: (num, org) => `Angebot ${num} von ${org}`,
    greeting: (name) => `Hallo ${name},`,
    intro: (org) => `Anbei erhalten Sie ein Angebot von ${org}.`,
    titleLabel: "Titel",
    numberLabel: "Angebotsnummer",
    amountLabel: "Betrag",
    validUntilLabel: "Gültig bis",
    attached: "Das Angebot ist als PDF beigefügt.",
  },
  fr: {
    subject: (num, org) => `Devis ${num} de ${org}`,
    greeting: (name) => `Bonjour ${name},`,
    intro: (org) => `Veuillez trouver ci-joint un devis de ${org}.`,
    titleLabel: "Titre",
    numberLabel: "Numéro de devis",
    amountLabel: "Montant",
    validUntilLabel: "Valable jusqu'au",
    attached: "Le devis est joint en PDF.",
  },
};

export async function sendQuoteEmail({
  to,
  clientName,
  organizationName,
  quoteNumber,
  quoteTitle,
  totalFormatted,
  validUntilFormatted,
  locale,
  pdfBuffer,
  pdfFilename,
}: SendQuoteEmailParams) {
  const t = quoteTranslations[locale] || quoteTranslations.en;

  const titleRow = quoteTitle
    ? `<tr>
                  <td style="padding:12px 16px;font-size:14px;color:#71717a;border-bottom:1px solid #e4e4e7;">${t.titleLabel}</td>
                  <td style="padding:12px 16px;font-size:14px;color:#18181b;font-weight:500;border-bottom:1px solid #e4e4e7;text-align:right;">${quoteTitle}</td>
                </tr>`
    : "";

  const validUntilRow = validUntilFormatted
    ? `<tr>
                  <td style="padding:12px 16px;font-size:14px;color:#71717a;">${t.validUntilLabel}</td>
                  <td style="padding:12px 16px;font-size:14px;color:#18181b;font-weight:500;text-align:right;">${validUntilFormatted}</td>
                </tr>`
    : "";

  // If no validUntil row, remove bottom border from amount row
  const amountBorderStyle = validUntilFormatted ? "border-bottom:1px solid #e4e4e7;" : "";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 0;text-align:center;">
              <h1 style="margin:0;font-size:20px;font-weight:600;color:#18181b;">${organizationName}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;">
              <p style="margin:0 0 16px;font-size:15px;color:#3f3f46;">${t.greeting(clientName)}</p>
              <p style="margin:0 0 24px;font-size:15px;color:#3f3f46;">${t.intro(organizationName)}</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
                ${titleRow}
                <tr>
                  <td style="padding:12px 16px;font-size:14px;color:#71717a;border-bottom:1px solid #e4e4e7;">${t.numberLabel}</td>
                  <td style="padding:12px 16px;font-size:14px;color:#18181b;font-weight:500;border-bottom:1px solid #e4e4e7;text-align:right;">${quoteNumber}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;font-size:14px;color:#71717a;${amountBorderStyle}">${t.amountLabel}</td>
                  <td style="padding:12px 16px;font-size:14px;color:#18181b;font-weight:500;${amountBorderStyle}text-align:right;">${totalFormatted}</td>
                </tr>
                ${validUntilRow}
              </table>
              <p style="margin:0;font-size:13px;color:#71717a;">${t.attached}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #e4e4e7;text-align:center;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">Powered by Servible</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  const { error } = await getResend().emails.send({
    from: fromEmail,
    to,
    subject: t.subject(quoteNumber, organizationName),
    html,
    attachments: [
      {
        content: pdfBuffer,
        filename: pdfFilename,
        contentType: "application/pdf",
      },
    ],
  });

  if (error) {
    console.error("Failed to send quote email:", error);
    throw new Error("Failed to send quote email");
  }
}

// ─── Booking Confirmation Email ───

const bookingTranslations: Record<
  string,
  {
    subjectConfirmed: (org: string) => string;
    subjectPending: (org: string) => string;
    greeting: (name: string) => string;
    confirmed: (org: string) => string;
    pending: (org: string) => string;
    dateLabel: string;
    timeLabel: string;
    durationLabel: string;
    minutes: string;
    pendingNote: string;
  }
> = {
  nl: {
    subjectConfirmed: (org) => `Afspraak bevestigd bij ${org}`,
    subjectPending: (org) => `Afspraakverzoek ontvangen bij ${org}`,
    greeting: (name) => `Hallo ${name},`,
    confirmed: (org) => `Uw afspraak bij ${org} is bevestigd.`,
    pending: (org) => `Uw afspraakverzoek bij ${org} is ontvangen.`,
    dateLabel: "Datum",
    timeLabel: "Tijd",
    durationLabel: "Duur",
    minutes: "minuten",
    pendingNote: "U ontvangt een bevestiging zodra de afspraak is goedgekeurd.",
  },
  en: {
    subjectConfirmed: (org) => `Booking confirmed with ${org}`,
    subjectPending: (org) => `Booking request received from ${org}`,
    greeting: (name) => `Hi ${name},`,
    confirmed: (org) => `Your booking with ${org} has been confirmed.`,
    pending: (org) => `Your booking request with ${org} has been received.`,
    dateLabel: "Date",
    timeLabel: "Time",
    durationLabel: "Duration",
    minutes: "minutes",
    pendingNote: "You will receive a confirmation once your booking is approved.",
  },
  de: {
    subjectConfirmed: (org) => `Termin bestätigt bei ${org}`,
    subjectPending: (org) => `Terminanfrage eingegangen bei ${org}`,
    greeting: (name) => `Hallo ${name},`,
    confirmed: (org) => `Ihr Termin bei ${org} wurde bestätigt.`,
    pending: (org) => `Ihre Terminanfrage bei ${org} ist eingegangen.`,
    dateLabel: "Datum",
    timeLabel: "Uhrzeit",
    durationLabel: "Dauer",
    minutes: "Minuten",
    pendingNote: "Sie erhalten eine Bestätigung, sobald Ihr Termin genehmigt wurde.",
  },
  fr: {
    subjectConfirmed: (org) => `Rendez-vous confirmé avec ${org}`,
    subjectPending: (org) => `Demande de rendez-vous reçue de ${org}`,
    greeting: (name) => `Bonjour ${name},`,
    confirmed: (org) => `Votre rendez-vous avec ${org} a été confirmé.`,
    pending: (org) => `Votre demande de rendez-vous avec ${org} a été reçue.`,
    dateLabel: "Date",
    timeLabel: "Heure",
    durationLabel: "Durée",
    minutes: "minutes",
    pendingNote: "Vous recevrez une confirmation une fois votre rendez-vous approuvé.",
  },
};

export async function sendBookingConfirmation({
  to,
  guestName,
  organizationName,
  dateFormatted,
  time,
  durationMinutes,
  status,
  locale,
}: SendBookingConfirmationParams) {
  const t = bookingTranslations[locale] || bookingTranslations.en;

  const isConfirmed = status === "CONFIRMED";
  const subject = isConfirmed
    ? t.subjectConfirmed(organizationName)
    : t.subjectPending(organizationName);
  const statusMessage = isConfirmed
    ? t.confirmed(organizationName)
    : t.pending(organizationName);
  const pendingNote = !isConfirmed
    ? `<p style="margin:24px 0 0;font-size:13px;color:#71717a;">${t.pendingNote}</p>`
    : "";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 0;text-align:center;">
              <h1 style="margin:0;font-size:20px;font-weight:600;color:#18181b;">${organizationName}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;">
              <p style="margin:0 0 16px;font-size:15px;color:#3f3f46;">${t.greeting(guestName)}</p>
              <p style="margin:0 0 24px;font-size:15px;color:#3f3f46;">${statusMessage}</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="padding:12px 16px;font-size:14px;color:#71717a;border-bottom:1px solid #e4e4e7;">${t.dateLabel}</td>
                  <td style="padding:12px 16px;font-size:14px;color:#18181b;font-weight:500;border-bottom:1px solid #e4e4e7;text-align:right;">${dateFormatted}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;font-size:14px;color:#71717a;border-bottom:1px solid #e4e4e7;">${t.timeLabel}</td>
                  <td style="padding:12px 16px;font-size:14px;color:#18181b;font-weight:500;border-bottom:1px solid #e4e4e7;text-align:right;">${time}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;font-size:14px;color:#71717a;">${t.durationLabel}</td>
                  <td style="padding:12px 16px;font-size:14px;color:#18181b;font-weight:500;text-align:right;">${durationMinutes} ${t.minutes}</td>
                </tr>
              </table>
              ${pendingNote}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #e4e4e7;text-align:center;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">Powered by Servible</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  const { error } = await getResend().emails.send({
    from: fromEmail,
    to,
    subject,
    html,
  });

  if (error) {
    console.error("Failed to send booking confirmation email:", error);
    throw new Error("Failed to send booking confirmation email");
  }
}

// ─── Booking Cancellation Email ───

const cancellationTranslations: Record<
  string,
  {
    subject: (org: string) => string;
    greeting: (name: string) => string;
    body: (org: string) => string;
    dateLabel: string;
    timeLabel: string;
    contact: (org: string) => string;
  }
> = {
  nl: {
    subject: (org) => `Afspraak geannuleerd bij ${org}`,
    greeting: (name) => `Hallo ${name},`,
    body: (org) => `Uw afspraak bij ${org} is geannuleerd.`,
    dateLabel: "Datum",
    timeLabel: "Tijd",
    contact: (org) => `Neem contact op met ${org} als u vragen heeft.`,
  },
  en: {
    subject: (org) => `Booking cancelled with ${org}`,
    greeting: (name) => `Hi ${name},`,
    body: (org) => `Your booking with ${org} has been cancelled.`,
    dateLabel: "Date",
    timeLabel: "Time",
    contact: (org) => `Please contact ${org} if you have any questions.`,
  },
  de: {
    subject: (org) => `Termin storniert bei ${org}`,
    greeting: (name) => `Hallo ${name},`,
    body: (org) => `Ihr Termin bei ${org} wurde storniert.`,
    dateLabel: "Datum",
    timeLabel: "Uhrzeit",
    contact: (org) => `Kontaktieren Sie ${org} bei Fragen.`,
  },
  fr: {
    subject: (org) => `Rendez-vous annulé avec ${org}`,
    greeting: (name) => `Bonjour ${name},`,
    body: (org) => `Votre rendez-vous avec ${org} a été annulé.`,
    dateLabel: "Date",
    timeLabel: "Heure",
    contact: (org) => `Veuillez contacter ${org} si vous avez des questions.`,
  },
};

export async function sendBookingCancellation({
  to,
  guestName,
  organizationName,
  dateFormatted,
  time,
  locale,
}: SendBookingCancellationParams) {
  const t = cancellationTranslations[locale] || cancellationTranslations.en;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 0;text-align:center;">
              <h1 style="margin:0;font-size:20px;font-weight:600;color:#18181b;">${organizationName}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;">
              <p style="margin:0 0 16px;font-size:15px;color:#3f3f46;">${t.greeting(guestName)}</p>
              <p style="margin:0 0 24px;font-size:15px;color:#3f3f46;">${t.body(organizationName)}</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="padding:12px 16px;font-size:14px;color:#71717a;border-bottom:1px solid #e4e4e7;">${t.dateLabel}</td>
                  <td style="padding:12px 16px;font-size:14px;color:#18181b;font-weight:500;border-bottom:1px solid #e4e4e7;text-align:right;">${dateFormatted}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;font-size:14px;color:#71717a;">${t.timeLabel}</td>
                  <td style="padding:12px 16px;font-size:14px;color:#18181b;font-weight:500;text-align:right;">${time}</td>
                </tr>
              </table>
              <p style="margin:0;font-size:13px;color:#71717a;">${t.contact(organizationName)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #e4e4e7;text-align:center;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">Powered by Servible</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  const { error } = await getResend().emails.send({
    from: fromEmail,
    to,
    subject: t.subject(organizationName),
    html,
  });

  if (error) {
    console.error("Failed to send booking cancellation email:", error);
    throw new Error("Failed to send booking cancellation email");
  }
}
