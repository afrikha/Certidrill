import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { findUsers, userEntitlements } from "@/lib/access/admin";
import { GRANT_REASONS, REVOKE_REASONS } from "@/lib/access/reasons";
import { getAccessSummary } from "@/lib/access";
import { recentAudit, type AuditAction } from "@/lib/audit";
import { readSwitches, SWITCHES, type Switch } from "@/lib/settings";
import { setSwitchAction } from "@/lib/actions/billing";
import { heldPayments } from "@/lib/billing/checkout";
import { cartsOf } from "@/lib/billing/cart";
import { resolvePrice } from "@/lib/billing/prices";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { GrantForm, PriceForm, RevokeForm } from "./forms";

export const metadata = { title: "Billing" };
export const dynamic = "force-dynamic";

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

/** Actions done on a user: without its target, the account was deleted since. */
const ON_USER: ReadonlySet<string> = new Set<AuditAction>(["user.create", "entitlement.grant", "entitlement.revoke"]);

/**
 * Rights back-office (specs des offres §7): find a user, see and change their
 * rights by hand, open or close the offers. Every change is in the audit log.
 */
export default async function AdminBillingPage({ searchParams }: Readonly<{ searchParams: Promise<{ q?: string | string[]; user?: string | string[] }> }>) {
  await requireAdmin();
  const sp = await searchParams;
  const q = one(sp.q);
  const userId = one(sp.user);
  const t = await getTranslations("billingAdmin");
  const format = await getFormatter();
  const date = (d: Date) => format.dateTime(d, { dateStyle: "medium" });
  const now = new Date();

  const [switches, results, selected, certifications, passPlan, held] = await Promise.all([
    readSwitches(prisma),
    findUsers(prisma, q),
    userId ? prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, role: true, emailVerified: true, createdAt: true } }) : null,
    prisma.certification.findMany({ where: { active: true }, orderBy: { code: "asc" }, select: { code: true, title: true } }),
    prisma.plan.findUnique({ where: { code: "pass_90" }, include: { prices: true } }),
    heldPayments(prisma),
  ]);
  // Every certification, active or not, so that a price can be set before it opens.
  const allCertifications = passPlan ? await prisma.certification.findMany({ orderBy: { code: "asc" }, select: { id: true, code: true, title: true, active: true } }) : [];
  const ownPrices = new Map(passPlan?.prices.map((p) => [p.certificationId, p]) ?? []);
  const carts = cartsOf(held);
  const money = (cents: number | null, currency: string) => (cents === null ? "—" : format.number(cents / 100, { style: "currency", currency: currency.toUpperCase() }));
  const [access, entitlements, log] = await Promise.all([
    selected ? getAccessSummary(prisma, selected.id, now) : [],
    selected ? userEntitlements(prisma, selected.id) : [],
    recentAudit(prisma, { targetUserId: selected?.id, take: selected ? 50 : 30 }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Card>
        <h2 className="mb-1 font-semibold">{t("switches")}</h2>
        <p className="mb-4 text-sm text-muted-foreground">{t("switchesHelp")}</p>
        <ul className="divide-y divide-border" data-testid="switches">
          {(Object.keys(SWITCHES) as Switch[]).map((name) => (
            <li key={name} className="flex flex-wrap items-center justify-between gap-4 py-2" data-switch={name} data-enabled={switches[name]}>
              <div>
                <p className="font-medium">{t(`switch_${name}`)}</p>
                <p className="font-mono text-xs text-muted-foreground">{SWITCHES[name]}</p>
              </div>
              <form action={setSwitchAction} className="flex items-center gap-3">
                <span className={cn("text-sm font-semibold", switches[name] ? "text-success" : "text-muted-foreground")}>{switches[name] ? t("on") : t("off")}</span>
                <input type="hidden" name="name" value={name} />
                <input type="hidden" name="enabled" value={String(!switches[name])} />
                <Button type="submit" variant="secondary">{switches[name] ? t("turnOff") : t("turnOn")}</Button>
              </form>
            </li>
          ))}
        </ul>
      </Card>

      {passPlan && (
        <Card className="overflow-x-auto">
          <h2 className="mb-1 font-semibold">{t("prices")}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{t("pricesHelp")}</p>
          <table className="w-full text-left text-sm" data-testid="certification-prices">
            <tbody>
              {allCertifications.map((c) => {
                const price = resolvePrice(passPlan, ownPrices.get(c.id));
                return (
                  <tr key={c.code} className="border-t border-border align-middle" data-price-certification={c.code} data-custom={price.custom}>
                    <th scope="row" className="py-2 pr-3 font-normal">
                      <span className="font-mono uppercase">{c.code}</span> <span className="text-muted-foreground">{c.title}</span>
                      {!c.active && <span className="ml-2 rounded bg-muted px-1.5 text-xs">{t("priceInactive")}</span>}
                    </th>
                    <td className="py-2 pr-3 tabular-nums">
                      <span className="font-semibold">{money(price.amountCents, price.currency)}</span>{" "}
                      <span className="text-xs text-muted-foreground">{price.custom ? t("priceOwn") : t("pricePlan")}</span>
                      {!price.stripePriceId && <span className="block text-xs text-danger">{t("priceNotLinked")}</span>}
                    </td>
                    <td className="py-2">
                      <PriceForm planCode={passPlan.code} code={c.code} current={price.custom ? (price.amountCents / 100).toFixed(2) : ""} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {held.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm" data-testid="held-payments">
            <caption className="px-4 pt-3 text-left">
              <span className="block font-semibold">{t("held")}</span>
              <span className="block text-muted-foreground">{t("heldHelp")}</span>
            </caption>
            <thead className="bg-muted">
              <tr>
                <th scope="col" className="px-4 py-2">{t("when")}</th>
                <th scope="col" className="px-4 py-2">{t("user")}</th>
                <th scope="col" className="px-4 py-2">{t("certification")}</th>
                <th scope="col" className="px-4 py-2">{t("heldAsked")}</th>
                <th scope="col" className="px-4 py-2">{t("heldCharged")}</th>
                <th scope="col" className="px-4 py-2">{t("heldStripe")}</th>
              </tr>
            </thead>
            <tbody>
              {held.map((p) => {
                const cart = carts.get(p.checkoutId)!;
                return (
                <tr key={p.id} className="border-t border-border" data-payment={p.id} data-checkout={p.checkoutId}>
                  <td className="whitespace-nowrap px-4 py-2">{p.paidAt ? date(p.paidAt) : "—"}</td>
                  <td className="px-4 py-2">
                    {p.customer.user ? (
                      <Link href={`/admin/billing?${new URLSearchParams({ user: p.customer.user.id })}`} className="text-primary underline">{p.customer.user.email}</Link>
                    ) : (
                      <span className="italic text-muted-foreground">{t("deletedUser")}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono uppercase">{p.certification.code}</td>
                  <td className="px-4 py-2 tabular-nums">{money(p.amountCents, p.currency)}</td>
                  <td className="px-4 py-2 tabular-nums">{money(p.chargedCents, p.chargedCurrency ?? p.currency)}</td>
                  <td className="px-4 py-2">
                    <span className="font-mono text-xs">{p.stripePaymentIntentId ?? "—"}</span>
                    {cart.count > 1 && (
                      <span className="block text-xs text-muted-foreground" data-testid="held-cart">{t("heldCart", { count: cart.count, total: money(cart.charged, cart.currency) })}</span>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Card>
        <form className="flex flex-wrap items-end gap-3" role="search">
          <div className="grow">
            <Label htmlFor="billing-q">{t("search")}</Label>
            <Input id="billing-q" name="q" type="search" defaultValue={q} placeholder={t("searchHint")} />
          </div>
          <Button type="submit">{t("find")}</Button>
        </form>
        {q && (
          <ul className="mt-4 divide-y divide-border text-sm" data-testid="user-results">
            {results.length === 0 && <li className="py-2 text-muted-foreground">{t("noUser")}</li>}
            {results.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-4 py-2">
                <Link href={`/admin/billing?${new URLSearchParams({ q, user: u.id })}`} className="text-primary underline">{u.email}</Link>
                <span className="text-muted-foreground">{u.name} · {u.role} · {date(u.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {selected && (
        <section className="space-y-4" data-testid="billing-user" aria-labelledby="billing-user-title">
          <h2 id="billing-user-title" className="text-xl font-semibold">{selected.email}</h2>
          <p className="text-sm text-muted-foreground">
            {selected.name && <>{selected.name} · </>}{selected.role} · {t("createdOn", { date: date(selected.createdAt) })} ·{" "}
            {selected.emailVerified ? t("verified") : t("unverified")}
          </p>

          <Card className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <caption className="px-4 pt-3 text-left font-semibold">{t("access")}</caption>
              <thead className="bg-muted">
                <tr>
                  <th scope="col" className="px-4 py-2">{t("certification")}</th>
                  <th scope="col" className="px-4 py-2">{t("level")}</th>
                  <th scope="col" className="px-4 py-2">{t("until")}</th>
                  <th scope="col" className="px-4 py-2">{t("started")}</th>
                </tr>
              </thead>
              <tbody>
                {access.map((a) => (
                  <tr key={a.certification} className="border-t border-border" data-certification={a.certification} data-level={a.level}>
                    <td className="px-4 py-2 font-mono uppercase">{a.certification}</td>
                    <td className="px-4 py-2">{t(`level_${a.level}`)} ({t(`source_${a.source}`)})</td>
                    <td className="px-4 py-2">{a.expiresAt ? date(new Date(a.expiresAt)) : "—"}</td>
                    <td className="px-4 py-2">{a.examsLeft === null ? a.started : t("startedOf", { started: a.started, left: a.examsLeft })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card>
            <h3 className="mb-4 font-semibold">{t("grantTitle")}</h3>
            <GrantForm userId={selected.id} certifications={certifications} defaultDays={passPlan?.durationDays ?? 90} />
          </Card>

          <Card className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm" data-testid="entitlements">
              <caption className="px-4 pt-3 text-left">
                <span className="block font-semibold">{t("passes")}</span>
                <span className="block text-muted-foreground">{t("passesRefund")}</span>
              </caption>
              <thead className="bg-muted">
                <tr>
                  <th scope="col" className="px-4 py-2">{t("certification")}</th>
                  <th scope="col" className="px-4 py-2">{t("source")}</th>
                  <th scope="col" className="px-4 py-2">{t("period")}</th>
                  <th scope="col" className="px-4 py-2">{t("state")}</th>
                  <th scope="col" className="px-4 py-2"><span className="sr-only">{t("revoke")}</span></th>
                </tr>
              </thead>
              <tbody>
                {entitlements.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-3 text-muted-foreground">{t("noPass")}</td></tr>
                )}
                {entitlements.map((e) => {
                  const state = passState(e, now);
                  return (
                    <tr key={e.id} className="border-t border-border" data-state={state}>
                      <td className="px-4 py-2 font-mono uppercase">{e.certification.code}</td>
                      <td className="px-4 py-2">{t(`source_${e.source}`)}</td>
                      <td className="px-4 py-2">{date(e.startsAt)} → {date(e.expiresAt)}</td>
                      <td className="px-4 py-2">{t(`state_${state}`)}{e.revokedAt && <> ({date(e.revokedAt)})</>}</td>
                      <td className="px-4 py-2">{!e.revokedAt && e.expiresAt > now && <RevokeForm entitlementId={e.id} />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </section>
      )}

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm" data-testid="audit-log">
          <caption className="px-4 pt-3 text-left font-semibold">{selected ? t("auditUser") : t("audit")}</caption>
          <thead className="bg-muted">
            <tr>
              <th scope="col" className="px-4 py-2">{t("when")}</th>
              <th scope="col" className="px-4 py-2">{t("who")}</th>
              <th scope="col" className="px-4 py-2">{t("what")}</th>
            </tr>
          </thead>
          <tbody>
            {log.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-3 text-muted-foreground">{t("noAudit")}</td></tr>
            )}
            {log.map((entry) => (
              <tr key={entry.id} className="border-t border-border align-top" data-action={entry.action}>
                <td className="whitespace-nowrap px-4 py-2">{format.dateTime(entry.createdAt, { dateStyle: "short", timeStyle: "short" })}</td>
                <td className="px-4 py-2">{entry.actor?.email ?? t("cli")}</td>
                <td className="px-4 py-2">
                  <span className="font-medium">{t(`action_${entry.action.replaceAll(".", "_")}`)}</span>
                  {entry.target ? <> — {entry.target.email}</> : ON_USER.has(entry.action) && <> — <span className="italic text-muted-foreground">{t("deletedUser")}</span></>}
                  <code className="mt-1 block break-all text-xs text-muted-foreground">{describe(entry.details, (code) => (REASONS.has(code) ? t(`reason_${code as Reason}`) : code))}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function passState(e: { revokedAt: Date | null; startsAt: Date; expiresAt: Date }, now: Date) {
  if (e.revokedAt) return "revoked";
  if (e.expiresAt <= now) return "expired";
  if (e.startsAt > now) return "upcoming";
  return "active";
}

type Reason = (typeof GRANT_REASONS)[number] | (typeof REVOKE_REASONS)[number];
const REASONS = new Set<string>([...GRANT_REASONS, ...REVOKE_REASONS]);

/**
 * The details of an audit entry on one line, without the ids already shown
 * (and a long list as its length);
 * a reason code in words (older entries kept their free text, shown as is).
 */
function describe(details: unknown, reason: (code: string) => string): string {
  if (!details || typeof details !== "object") return "";
  const text = (key: string, value: unknown) => {
    // A batch lists its questions or chapters: their number is enough here, the entry keeps them.
    if (Array.isArray(value) && value.length > 5) return `[${value.length}]`;
    if (typeof value !== "string") return JSON.stringify(value);
    return key === "reason" ? reason(value) : value;
  };
  return Object.entries(details as Record<string, unknown>)
    .filter(([k]) => k !== "entitlementId")
    .map(([k, v]) => `${k}: ${text(k, v)}`)
    .join(" · ");
}
