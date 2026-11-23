/**
 * E-mails to the site's owner, not to users: a notice for each new account
 * (ADMIN_NOTIFY_EMAIL). Same layout as the other e-mails.
 */
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { render, translator, type EmailMessage } from "@/lib/auth/email";

/** Dates in e-mails, as on the site (i18n/request.ts). */
const TIME_ZONE = "Europe/Paris";

/** The address that gets the owner's notices, or null when none is configured (or it is not an address). */
export function adminNotifyAddress(value = process.env.ADMIN_NOTIFY_EMAIL): string | null {
  const address = value?.trim();
  return address && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) ? address : null;
}

export function signupNoticeMessage(p: { locale: string; email: string; userLocale: string; createdAt: Date; url: string }): EmailMessage {
  const t = translator(p.locale);
  const l = isLocale(p.locale) ? p.locale : defaultLocale;
  const values = {
    email: p.email,
    language: p.userLocale.toUpperCase(),
    date: new Intl.DateTimeFormat(l, { dateStyle: "long", timeStyle: "short", timeZone: TIME_ZONE }).format(p.createdAt),
  };
  return render({
    locale: p.locale,
    subject: t("signupNoticeSubject", values),
    preheader: t("signupNoticeIntro", values),
    intro: t("signupNoticeIntro", values),
    button: { label: t("signupNoticeButton"), url: p.url },
    notes: [t("signupNoticeWhy")],
    fallback: t("fallback"),
  });
}
