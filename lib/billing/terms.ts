/**
 * Terms of sale (CGV, offers lot C): their version, the waiver of the right
 * of withdrawal ticked at purchase, the seller and VAT mentions of invoices,
 * and the guard that keeps live payment closed while the terms are not
 * final.
 */
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

const MESSAGES = { en, fr } as const;

/** The version of the terms shown on /terms, stored with each payment. Change it with the text. */
export const TERMS_VERSION = "2026-11-19";

/** The seller, on invoices (as on /legal). */
export const SELLER = "Square-soft, SARL en cours d'immatriculation, 4 rue Saint-Michel, 78430 Louveciennes, France";

/**
 * VAT franchise (franchise en base, art. 293 B du CGI): no VAT is charged,
 * and prices and invoices carry the mention below. To change once the
 * franchise thresholds are passed, with the accountant.
 */
export const VAT_EXEMPT = true;
export const VAT_MENTION = "TVA non applicable, art. 293 B du CGI";

/** The footer of Stripe invoices: the seller, and the VAT mention under the franchise. */
export const INVOICE_FOOTER = VAT_EXEMPT ? `${SELLER}. ${VAT_MENTION}.` : `${SELLER}.`;

const localeOf = (locale: string): Locale => (isLocale(locale) ? locale : defaultLocale);

/** The exact text of the waiver box, in a locale: what the buyer ticks is what is stored. */
export function waiverText(locale: string): string {
  return MESSAGES[localeOf(locale)].billing.waiver;
}

/** Every string of a messages subtree, with its path. */
function strings(value: unknown, path: string): { path: string; text: string }[] {
  if (typeof value === "string") return [{ path, text: value }];
  if (Array.isArray(value)) return value.flatMap((v, i) => strings(v, `${path}.${i}`));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => strings(v, `${path}.${k}`));
  return [];
}

/**
 * Passages of the terms still to be written: text between square brackets
 * (the consumer mediator until one is chosen). Empty once the terms are final.
 */
export function termsPlaceholders(messages: Record<string, { terms?: unknown; billing?: { waiver?: unknown } }> = MESSAGES): string[] {
  return Object.entries(messages).flatMap(([locale, m]) =>
    [...strings(m.terms, `${locale}.terms`), ...strings(m.billing?.waiver, `${locale}.billing.waiver`)].flatMap(({ path, text }) =>
      [...text.matchAll(/\[[^\]]*\]/g)].map((match) => `${path}: ${match[0]}`),
    ),
  );
}

/** A live Stripe key: real cards are charged. */
export function isLiveKey(key = process.env.STRIPE_SECRET_KEY ?? ""): boolean {
  return /^(sk|rk)_live_/.test(key.trim());
}

/**
 * Real payment stays closed while the terms have passages to write: with a
 * live key, nothing can be bought, whatever the switch says. Test keys are
 * not concerned (nothing real is sold).
 */
export function liveSalesBlocked(key = process.env.STRIPE_SECRET_KEY ?? "", placeholders = termsPlaceholders()): boolean {
  return isLiveKey(key) && placeholders.length > 0;
}
