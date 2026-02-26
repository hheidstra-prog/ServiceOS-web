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
