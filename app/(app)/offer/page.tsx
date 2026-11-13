import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getOffers, type Offer } from "@/lib/access/offers";
import { canBuyOnline } from "@/lib/billing/checkout";
import { stripeApi } from "@/lib/billing/stripe";
import { BuyPass } from "@/components/billing/buy-pass";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Full access" };
export const dynamic = "force-dynamic";

/** Why the user lands here: a refusal (402) or the locked correction. */
const REASONS = ["quota_exhausted", "pass_expired", "subscription_inactive", "correction"] as const;
type Reason = (typeof REASONS)[number];
const isReason = (r: unknown): r is Reason => typeof r === "string" && (REASONS as readonly string[]).includes(r);

/**
 * The offer screen (specs des offres §7): the reason of the block, what full
 * access gives, and the offers on sale with their prices from the plan table.
 * The Pass is bought here directly once online payment is open (offers lot B).
 */
export default async function OfferPage({ searchParams }: Readonly<{ searchParams: Promise<{ reason?: string | string[]; certification?: string | string[] }> }>) {
  await requireUser();
  const sp = await searchParams;
  // A repeated parameter comes as an array: ignored rather than passed on.
  const code = typeof sp.certification === "string" ? sp.certification : null;
  const reason: Reason = isReason(sp.reason) ? sp.reason : "correction";
  const t = await getTranslations("offer");
  const tBilling = await getTranslations("billing");
  const format = await getFormatter();
  const [offers, certification, certifications] = await Promise.all([
    getOffers(prisma),
    code ? prisma.certification.findFirst({ where: { code, active: true }, select: { code: true, title: true } }) : null,
    prisma.certification.findMany({ where: { active: true }, orderBy: { code: "asc" }, select: { code: true, title: true } }),
  ]);
  const pass = offers.find((o) => o.kind === "pass");
  const buyable = pass ? await canBuyOnline(prisma, pass.code, stripeApi()) : false;
  const price = (o: Offer) => format.number(o.amountCents / 100, { style: "currency", currency: o.currency.toUpperCase() });
  const terms = (o: Offer) => {
    const tax = t(o.taxBehavior === "inclusive" ? "taxIncluded" : "taxExcluded");
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
          {(["benefitExams", "benefitCorrection", "benefitProgress", "benefitTime"] as const).map((k) => (
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
