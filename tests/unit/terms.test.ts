import { describe, expect, it } from "vitest";
import { defaultLocale } from "@/lib/i18n/config";
import { INVOICE_FOOTER, isLiveKey, liveSalesBlocked, termsPlaceholders, VAT_MENTION, waiverText } from "@/lib/billing/terms";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

describe("terms of sale", () => {
  it("finds the passages still between brackets, in both languages", () => {
    // Until a consumer mediator is chosen, its name is a placeholder: live payment stays closed.
    const found = termsPlaceholders();
    expect(found.some((p) => p.startsWith("fr.terms.sections.mediation"))).toBe(true);
    expect(found.some((p) => p.startsWith("en.terms.sections.mediation"))).toBe(true);
    expect(termsPlaceholders({ fr: { terms: { a: ["Final text."] }, billing: { waiver: "I agree." } } })).toEqual([]);
    expect(termsPlaceholders({ fr: { terms: { a: ["Mediator: [to choose]."] } }, en: { billing: { waiver: "[waiver]" } } })).toEqual(["fr.terms.a.0: [to choose]", "en.billing.waiver: [waiver]"]);
  });

  it("closes live payment only, while a placeholder remains", () => {
    expect(isLiveKey("sk_live_abc")).toBe(true);
    expect(isLiveKey(" rk_live_abc ")).toBe(true);
    expect(isLiveKey("sk_test_abc")).toBe(false);
    expect(isLiveKey("")).toBe(false);
    expect(liveSalesBlocked("sk_live_abc", ["fr.terms: [x]"])).toBe(true);
    expect(liveSalesBlocked("sk_live_abc", [])).toBe(false);
    expect(liveSalesBlocked("sk_test_abc", ["fr.terms: [x]"])).toBe(false);
  });

  it("has the same sections in both languages, and the VAT mention on invoices", () => {
    expect(Object.keys(en.terms.sections)).toEqual(Object.keys(fr.terms.sections));
    for (const [key, section] of Object.entries(fr.terms.sections)) {
      expect(section.body.length, key).toBe(en.terms.sections[key as keyof typeof en.terms.sections].body.length);
    }
    expect(INVOICE_FOOTER).toContain("Square-soft");
    expect(INVOICE_FOOTER).toContain(VAT_MENTION);
    expect(fr.offer.vatExempt).toBe(VAT_MENTION);
  });

  it("stores the waiver text of the page's language, the default one otherwise", () => {
    expect(waiverText("en")).toBe(en.billing.waiver);
    expect(waiverText("fr")).toBe(fr.billing.waiver);
    expect(waiverText("de")).toBe(waiverText(defaultLocale));
    expect(fr.billing.waiver).toContain("rétractation");
  });
});

describe("terms version", () => {
  it("is a date, shown as one in the purchase e-mail; any other value is shown as stored", async () => {
    const { TERMS_VERSION } = await import("@/lib/billing/terms");
    const { purchaseMessage } = await import("@/lib/email/billing");
    expect(TERMS_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const mail = (termsVersion: string) =>
      purchaseMessage({ locale: "fr", certification: "az-104", expiresAt: new Date("2027-02-11T10:00:00Z"), amountCents: 1900, currency: "eur", url: "https://x.test/account/billing", waiver: { acceptedAt: new Date("2026-11-13T10:00:00Z"), text: "J'accepte.", termsVersion, termsUrl: "https://x.test/terms" } }).text;
    expect(mail("2026-11-19")).toContain("version du 19 novembre 2026");
    expect(mail("v2")).toContain("version du v2");
  });
});
