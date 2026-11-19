import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getOffers, type Offer } from "@/lib/access/offers";
import { passPricing } from "@/lib/billing/checkout";
import { stripeApi } from "@/lib/billing/stripe";
import { BuyPass } from "@/components/billing/buy-pass";
import { taxLabelKey } from "@/lib/billing/terms";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { hasVisibleCourse } from "@/lib/course/read";

export const metadata = { title: "Full access" };
export const dynamic = "force-dynamic";

/** Why the user lands here: a refusal (402), the locked correction or a locked chapter of the course. */
const REASONS = ["quota_exhausted", "pass_expired", "subscription_inactive", "correction", "course"] as const;
type Reason = (typeof REASONS)[number];
const isReason = (r: unknown): r is Reason => typeof r === "string" && (REASONS as readonly string[]).includes(r);

/**
 * The offer screen (specs des offres §7): the reason of the block, what full
 * access gives, and the offers on sale with their prices from the plan table.
 * The Pass is bought here directly once online payment is open (offers lot B).
 */
export default async function OfferPage({ searchParams }: Readonly<{ searchParams: Promise<{ reason?: string | string[]; certification?: string | string[] }> }>) {
  const user = await requireUser();
  const sp = await searchParams;
  // A repeated parameter comes as an array: ignored rather than passed on.
  const code = typeof sp.certification === "string" ? sp.certification : null;
  const reason: Reason = isReason(sp.reason) ? sp.reason : "correction";
  const t = await getTranslations("offer");
  const tBilling = await getTranslations("billing");
  const format = await getFormatter();
  const [offers, certification, course] = await Promise.all([
    getOffers(prisma),
    code ? prisma.certification.findFirst({ where: { code, active: true }, select: { code: true, title: true } }) : null,
    // The course is a benefit once readers have a chapter to open.
    hasVisibleCourse(prisma, { userId: user.id, isAdmin: false }),
  ]);
  const benefits = ["benefitExams", "benefitCorrection", ...(course ? ["benefitCourse" as const] : []), "benefitProgress", "benefitTime"] as const;
  const pass = offers.find((o) => o.kind === "pass");
  const pricing = pass ? await passPricing(prisma, pass.code, stripeApi()) : null;
  const buyable = (pricing?.buyable.length ?? 0) > 0;
  const money = (cents: number, currency: string) => format.number(cents / 100, { style: "currency", currency: currency.toUpperCase() });
  // The Pass is priced per certification: the price of the certification asked for, else "from X" when the prices differ.
  const price = (o: Offer) => {
    const own = o.kind === "pass" && certification ? pricing?.prices.find((p) => p.code === certification.code) : undefined;
    if (own) return money(own.amountCents, own.currency);
    const range = o.kind === "pass" ? pricing?.range : null;
    if (range && range.min !== range.max) return t("priceFrom", { price: money(range.min, range.currency) });
    return range ? money(range.min, range.currency) : money(o.amountCents, o.currency);
  };
  const certifications = (pricing?.buyable ?? []).map((c) => ({ code: c.code, title: c.title, amountCents: c.amountCents, currency: c.currency }));
  const terms = (o: Offer) => {
      const tax = t(taxLabelKey(o.taxBehavior));
    if (o.kind === "pass") return t("termsPass", { tax, days: o.durationDays ?? 0 });
    if (o.kind === "team") return t("termsTeam", { tax, seats: o.minSeats ?? 1 });
    return t(o.interval === "year" ? "termsYear" : "termsMonth", { tax });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6" data-testid="offer" data-reason={reason}>
      <div>
        <h1 className="text-2xl font-bold">{t(`title_${reason}`)}</h1>
        <p className="mt-2 text-muted-foreground">
          {t(`reason_${reason}`)}
          {certification && <> — <span className="font-mono uppercase">{certification.code}</span> {certification.title}</>}
        </p>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold">{t("fullTitle")}</h2>
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          {benefits.map((k) => (
            <li key={k} className="flex gap-2"><span aria-hidden className="font-bold text-success">✓</span>{t(k)}</li>
          ))}
        </ul>
      </Card>

      <section aria-labelledby="offers-title" className="space-y-3">
        <h2 id="offers-title" className="font-semibold">{t("offersTitle")}</h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {offers.map((o) => (
            <li key={o.code}>
              <Card className={cn("flex h-full flex-col gap-2", o.kind === "pass" && "border-primary")} data-offer={o.code}>
                <h3 className="font-semibold">{t(`name_${o.kind}`)}</h3>
                <p className="text-3xl font-bold tabular-nums">{price(o)}</p>
                <p className="text-sm text-muted-foreground">{terms(o)}</p>
                <p className="text-sm">{t(`scope_${o.kind}`)}</p>
                {o.kind === "pass" && buyable ? (
                  <BuyPass planCode={o.code} certifications={certifications} defaultCertification={certification?.code} className="mt-auto" />
                ) : (
                  <button type="button" disabled className={cn(buttonClasses("primary", "mt-auto"), "disabled:opacity-60")}>{t("soon")}</button>
                )}
              </Card>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">{buyable ? tBilling("secure") : t("soonHint")}</p>
      </section>

      <p className="text-sm"><Link href="/dashboard" className="text-primary underline">← {t("back")}</Link></p>
    </div>
  );
}
