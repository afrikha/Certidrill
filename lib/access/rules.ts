/**
 * Access rules (specs des offres §3). The application never asks "which plan
 * does the user have" but "which level of access on this certification":
 * resolveAccess answers it from loaded facts, and getAccess (./index.ts) loads
 * them. Pure functions, no I/O.
 *
 * Order of resolution, the first rule that applies wins:
 *   0. the user is an administrator → full, source "admin";
 *   1. the certification is free for everyone (freeAccess) → full;
 *   2. a seat in an organisation whose subscription is active → full (offers lot E);
 *   3. an active "Tout accès" subscription → full (offers lot D);
 *   4. a Pass on this certification, not expired nor revoked → full until its end;
 *   5. otherwise → free.
 */

export type AccessLevel = "free" | "full";
export type AccessSource = "admin" | "free_certification" | "team" | "subscription" | "pass" | "none";

export interface Access {
  level: AccessLevel;
  source: AccessSource;
  /** End of the access when it is known to end (Pass, cancelled or unpaid subscription); null otherwise. */
  expiresAt: Date | null;
}

/** A Pass-type right (entitlement) on one certification. */
export interface PassRight {
  startsAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
}

/** A subscription as Stripe reports it (status names are Stripe's). */
export interface SubscriptionRight {
  status: string;
  currentPeriodEnd: Date;
  pastDueSince: Date | null;
}

export interface AccessFacts {
  isAdmin: boolean;
  freeCertification: boolean;
  /** Subscriptions of the organisations where the user holds an active seat. */
  teamSubscriptions: readonly SubscriptionRight[];
  /** The user's own "Tout accès" subscriptions. */
  subscriptions: readonly SubscriptionRight[];
  /** Pass rights of the user on this certification. */
  passes: readonly PassRight[];
}

/** An unpaid subscription keeps access this many days. */
export const PAST_DUE_GRACE_DAYS = 7;
const DAY_MS = 86_400_000;

/** Whether a subscription gives access at `now`, and until when if that is known. */
export function subscriptionAccess(s: SubscriptionRight, now: Date): { active: boolean; until: Date | null } {
  switch (s.status) {
    case "active":
    case "trialing":
      return { active: true, until: null };
    case "past_due": {
      // Without the date it became unpaid, no grace: counting from "now" would never end.
      // The webhook writes that date with the status (offers lot D).
      if (s.pastDueSince === null) return { active: false, until: null };
      const until = new Date(s.pastDueSince.getTime() + PAST_DUE_GRACE_DAYS * DAY_MS);
      return { active: now < until, until };
    }
    case "canceled":
      // Cancelled: access until the end of the paid period.
      return { active: now < s.currentPeriodEnd, until: s.currentPeriodEnd };
    default:
      return { active: false, until: null };
  }
}

const valid = (p: PassRight, now: Date) => p.revokedAt === null && p.startsAt <= now && now < p.expiresAt;

function firstActive(subscriptions: readonly SubscriptionRight[], now: Date): { until: Date | null } | null {
  for (const s of subscriptions) {
    const a = subscriptionAccess(s, now);
    if (a.active) return a;
  }
  return null;
}

export function resolveAccess(facts: AccessFacts, now: Date): Access {
  if (facts.isAdmin) return { level: "full", source: "admin", expiresAt: null };
  if (facts.freeCertification) return { level: "full", source: "free_certification", expiresAt: null };
  const team = firstActive(facts.teamSubscriptions, now);
  if (team) return { level: "full", source: "team", expiresAt: team.until };
  const own = firstActive(facts.subscriptions, now);
  if (own) return { level: "full", source: "subscription", expiresAt: own.until };
  if (facts.passes.some((p) => valid(p, now))) {
    // Rights bought back to back follow each other: access lasts until the last one ends.
    return { level: "full", source: "pass", expiresAt: new Date(chainEnd(facts.passes, now)) };
  }
  return { level: "free", source: "none", expiresAt: null };
}

/** End of the current Pass, extended by the rights that start when it ends (bought again). */
function chainEnd(passes: readonly PassRight[], now: Date): number {
  const live = passes.filter((p) => p.revokedAt === null && now < p.expiresAt).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  let end = now.getTime();
  for (const p of live) if (p.startsAt.getTime() <= end && p.expiresAt.getTime() > end) end = p.expiresAt.getTime();
  return end;
}

/**
 * Dates of a new Pass of `days` days: it starts now, or when the current one
 * ends (buying again adds the days to the current end date).
 */
export function passWindow(passes: readonly PassRight[], now: Date, days: number): { startsAt: Date; expiresAt: Date } {
  const startsAt = new Date(chainEnd(passes, now));
  return { startsAt, expiresAt: new Date(startsAt.getTime() + days * DAY_MS) };
}

/** Full mock exams still allowed: null when unlimited (full access, or no quota). */
export function examsLeft(access: Access, started: number, quota: number | null): number | null {
  if (access.level === "full" || quota === null) return null;
  return Math.max(0, quota - started);
}

export type RefusalCode = "quota_exhausted" | "pass_expired" | "subscription_inactive";

/** Why a free user may not start another exam: the most specific reason for the offer screen. */
export function refusalReason(facts: AccessFacts, now: Date): RefusalCode {
  if (facts.passes.some((p) => p.revokedAt === null && p.expiresAt <= now)) return "pass_expired";
  if (facts.subscriptions.length > 0) return "subscription_inactive";
  return "quota_exhausted";
}

/** Refusal of an access-controlled action; the API answers 402 with the code. */
export class AccessError extends Error {
  readonly status = 402;
  constructor(readonly code: RefusalCode) {
    super(code);
    this.name = "AccessError";
  }
}
