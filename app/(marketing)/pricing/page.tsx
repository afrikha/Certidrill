import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { readSwitches } from "@/lib/settings";
import { freeExamQuota } from "@/lib/access";
import { getOffers, type Offer } from "@/lib/access/offers";
import { canBuyOnline } from "@/lib/billing/checkout";
import { stripeApi } from "@/lib/billing/stripe";
import { BuyPass } from "@/components/billing/buy-pass";
import { buttonClasses } from "@/components/ui/button";
import { Icon } from "../landing-visuals";

export const metadata = { title: "Pricing" };
export const dynamic = "force-dynamic";

const FAQ = ["secure", "extend", "end"] as const;

/**
 * The offers on sale and their prices, from the plan table (specs des offres
 * §7). The Pass is bought here once online payment is open; other offers come
 * with their lots.
 */
export default async function PricingPage({ searchParams }: Readonly<{ searchParams: Promise<{ certification?: string | string[] }> }>) {
  const sp = await searchParams;
  const t = await getTranslations("billing");
  const tHome = await getTranslations("home");
  const tOffer = await getTranslations("offer");
  const format = await getFormatter();
  const session = await auth();
  const [offers, quota, { signupOpen }, certifications] = await Promise.all([
    getOffers(prisma),
    freeExamQuota(prisma),
    readSwitches(prisma),
    prisma.certification.findMany({ where: { active: true }, orderBy: { code: "asc" }, select: { code: true, title: true } }),
  ]);
  const pass = offers.find((o) => o.kind === "pass");
  const others = offers.filter((o) => o.kind !== "pass");
  const buyable = pass ? await canBuyOnline(prisma, pass.code, stripeApi()) : false;
  const price = (o: Offer) => format.number(o.amountCents / 100, { style: "currency", currency: o.currency.toUpperCase() });
  const tax = (o: Offer) => tOffer(o.taxBehavior === "inclusive" ? "taxIncluded" : "taxExcluded");
  const freeExams = quota === null ? null : tHome("freeExams", { count: quota });
  const signIn = signupOpen ? { href: "/signup", label: t("signUpToBuy") } : { href: "/login", label: t("signInToBuy") };

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">{t("pricingTitle")}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">{t("pricingSubtitle")}</p>
      </div>

      <ul className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
        <li className="flex flex-col rounded-2xl border border-border p-8">
          <h2 className="text-lg font-semibold">{tHome("free")}</h2>
          <p className="mt-4 text-4xl font-bold tracking-tight">{format.number(0, { style: "currency", currency: (offers[0]?.currency ?? "eur").toUpperCase(), maximumFractionDigits: 0 })}</p>
          <p className="mt-1 text-sm text-muted-foreground">{tHome("freeTerms")}</p>
          <ul className="mt-6 space-y-3 text-sm">
            {[freeExams, tHome("freeCorrection"), tHome("freeProgress")].filter(Boolean).map((b) => (
              <li key={b} className="flex gap-3"><Icon name="check" className="size-5 shrink-0 text-success" />{b}</li>
            ))}
          </ul>
        </li>
        {pass && (
          <li className="relative flex flex-col rounded-2xl border-2 border-primary p-8 shadow-lg shadow-blue-900/10" data-offer={pass.code}>
            <span className="absolute -top-3 left-8 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">{tHome("popular")}</span>
            <h2 className="text-lg font-semibold">{tOffer("name_pass")}</h2>
            <p className="mt-4 text-4xl font-bold tracking-tight tabular-nums">{price(pass)}</p>
            <p className="mt-1 text-sm text-muted-foreground">{tOffer("termsPass", { tax: tax(pass), days: pass.durationDays ?? 0 })}</p>
            <ul className="mt-6 space-y-3 text-sm">
              {(["benefitExams", "benefitCorrection", "benefitProgress", "benefitTime"] as const).map((k) => (
                <li key={k} className="flex gap-3"><Icon name="check" className="size-5 shrink-0 text-primary" />{tOffer(k)}</li>
              ))}
            </ul>
            <div className="mt-auto pt-8">
              {!buyable && <p className="text-center text-sm text-muted-foreground">{tOffer("soonHint")}</p>}
              {buyable && session && (
                <BuyPass planCode={pass.code} certifications={certifications} defaultCertification={typeof sp.certification === "string" ? sp.certification : undefined} />
              )}
              {buyable && !session && <Link href={signIn.href} className={buttonClasses("primary", "w-full py-2.5")}>{signIn.label}</Link>}
              {buyable && <p className="mt-3 text-center text-xs text-muted-foreground">{t("extendHint")}</p>}
            </div>
          </li>
        )}
      </ul>

      {others.length > 0 && (
        <ul className="mx-auto mt-6 grid max-w-4xl gap-6 md:grid-cols-2">
          {others.map((o) => (
            <li key={o.code} className="flex flex-col rounded-2xl border border-border p-8" data-offer={o.code}>
              <h2 className="text-lg font-semibold">{tOffer(`name_${o.kind}`)}</h2>
              <p className="mt-4 text-3xl font-bold tracking-tight tabular-nums">{price(o)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {o.kind === "team" ? tOffer("termsTeam", { tax: tax(o), seats: o.minSeats ?? 1 }) : tOffer(o.interval === "year" ? "termsYear" : "termsMonth", { tax: tax(o) })}
              </p>
              <p className="mt-4 text-sm">{tOffer(`scope_${o.kind}`)}</p>
              <p className="mt-auto pt-6 text-sm text-muted-foreground">{tOffer("soon")}</p>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <Icon name="check" className="size-4 text-success" />
        {t("secure")}
      </p>

      <section className="mx-auto mt-16 max-w-3xl" aria-labelledby="pricing-faq">
        <h2 id="pricing-faq" className="text-center text-2xl font-bold tracking-tight">{t("faqTitle")}</h2>
        <div className="mt-8 divide-y divide-border rounded-xl border border-border">
          {FAQ.map((q) => (
            <details key={q} className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {t(`faq.${q}Q`)}
                <span aria-hidden className="text-xl leading-none text-muted-foreground transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-muted-foreground">{t(`faq.${q}A`)}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
