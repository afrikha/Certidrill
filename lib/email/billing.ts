/**
 * Billing e-mails (offers lot B): purchase confirmation, reminder 7 days
 * before a Pass ends, and expiry notice. Same layout as the sign-in e-mails.
 */
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { render, translator, type EmailMessage } from "@/lib/auth/email";

/** Dates in e-mails, as on the site (i18n/request.ts). */
const TIME_ZONE = "Europe/Paris";

function formatters(locale: string) {
  const l = isLocale(locale) ? locale : defaultLocale;
  return {
    date: (d: Date) => new Intl.DateTimeFormat(l, { dateStyle: "long", timeZone: TIME_ZONE }).format(d),
    money: (cents: number, currency: string) => new Intl.NumberFormat(l, { style: "currency", currency: currency.toUpperCase() }).format(cents / 100),
  };
}

const label = (code: string) => code.toUpperCase();

export function purchaseMessage(p: { locale: string; certification: string; expiresAt: Date; amountCents: number; currency: string; url: string }): EmailMessage {
  const t = translator(p.locale);
  const f = formatters(p.locale);
  const values = { certification: label(p.certification), date: f.date(p.expiresAt) };
  return render({
    locale: p.locale,
    subject: t("purchaseSubject", values),
    preheader: t("purchasePreheader", values),
    intro: t("purchaseIntro", values),
    button: { label: t("purchaseButton"), url: p.url },
    notes: [t("purchaseAmount", { amount: f.money(p.amountCents, p.currency) }), t("purchaseNote"), t("billingWhy")],
    fallback: t("fallback"),
  });
}

export function reminderMessage(p: { locale: string; certification: string; expiresAt: Date; days: number; url: string }): EmailMessage {
  const t = translator(p.locale);
  const values = { certification: label(p.certification), date: formatters(p.locale).date(p.expiresAt), days: p.days };
  return render({
    locale: p.locale,
    subject: t("reminderSubject", values),
    preheader: t("reminderIntro", values),
    intro: t("reminderIntro", values),
    button: { label: t("reminderButton"), url: p.url },
    notes: [t("billingWhy")],
    fallback: t("fallback"),
  });
}

export function expiredMessage(p: { locale: string; certification: string; expiresAt: Date; url: string }): EmailMessage {
  const t = translator(p.locale);
  const values = { certification: label(p.certification), date: formatters(p.locale).date(p.expiresAt) };
  return render({
    locale: p.locale,
    subject: t("expiredSubject", values),
    preheader: t("expiredIntro", values),
    intro: t("expiredIntro", values),
    button: { label: t("expiredButton"), url: p.url },
    notes: [t("billingWhy")],
    fallback: t("fallback"),
  });
}
