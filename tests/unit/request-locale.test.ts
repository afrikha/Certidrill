import { describe, expect, it } from "vitest";
import { LOCALE_COOKIE, PAGE_LOCALE_COOKIE } from "@/lib/i18n/cookie";
import { requestLocale } from "@/lib/i18n/request-locale";

const request = (headers: Record<string, string>) => new Request("https://certidrill.test/api/billing/checkout", { method: "POST", headers });

describe("requestLocale", () => {
  it("follows the page cookie, then the chosen one, then Accept-Language", () => {
    expect(requestLocale(request({ cookie: `a=b; ${LOCALE_COOKIE}=en; ${PAGE_LOCALE_COOKIE}=fr` }))).toBe("fr");
    expect(requestLocale(request({ cookie: `${LOCALE_COOKIE}=fr`, "accept-language": "en-GB" }))).toBe("fr");
    expect(requestLocale(request({ cookie: `${LOCALE_COOKIE}=de; broken`, "accept-language": "fr-FR,en;q=0.8" }))).toBe("fr");
    expect(requestLocale(request({ "accept-language": "en-US" }))).toBe("en");
  });
});
