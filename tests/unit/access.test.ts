import { describe, expect, it } from "vitest";
import { AccessError, examsLeft, isRefusalCode, passWindow, PAST_DUE_GRACE_DAYS, refusalReason, resolveAccess, subscriptionAccess, type AccessFacts, type PassRight, type SubscriptionRight } from "@/lib/access/rules";

const NOW = new Date("2026-11-13T12:00:00Z");
const days = (n: number) => new Date(NOW.getTime() + n * 86_400_000);
const pass = (from: number, to: number, revoked = false): PassRight => ({ startsAt: days(from), expiresAt: days(to), revokedAt: revoked ? days(-1) : null });
const sub = (status: string, periodEnd = 20, pastDueSince: number | null = null): SubscriptionRight => ({ status, currentPeriodEnd: days(periodEnd), pastDueSince: pastDueSince === null ? null : days(pastDueSince) });
const facts = (over: Partial<AccessFacts> = {}): AccessFacts => ({ isAdmin: false, freeCertification: false, teamSubscriptions: [], subscriptions: [], passes: [], ...over });

describe("resolveAccess: order of the rules", () => {
  it("is free without any right", () => {
    expect(resolveAccess(facts(), NOW)).toEqual({ level: "free", source: "none", expiresAt: null });
  });

  it("gives full access to administrators, before anything else", () => {
    expect(resolveAccess(facts({ isAdmin: true, passes: [pass(-1, 10)] }), NOW)).toEqual({ level: "full", source: "admin", expiresAt: null });
  });

  it("gives full access on a free certification", () => {
    expect(resolveAccess(facts({ freeCertification: true, subscriptions: [sub("active")] }), NOW)).toEqual({ level: "full", source: "free_certification", expiresAt: null });
  });

  it("prefers a team seat, then an own subscription, then a Pass", () => {
    const all = facts({ teamSubscriptions: [sub("active")], subscriptions: [sub("active")], passes: [pass(-1, 10)] });
    expect(resolveAccess(all, NOW).source).toBe("team");
    expect(resolveAccess({ ...all, teamSubscriptions: [] }, NOW).source).toBe("subscription");
    expect(resolveAccess({ ...all, teamSubscriptions: [], subscriptions: [] }, NOW)).toEqual({ level: "full", source: "pass", expiresAt: days(10) });
  });

  it("skips an inactive team subscription and uses the next rule", () => {
    expect(resolveAccess(facts({ teamSubscriptions: [sub("unpaid")], passes: [pass(-1, 3)] }), NOW).source).toBe("pass");
  });
});

describe("Pass", () => {
  it("gives access from its start to its end, not after nor before, and not once revoked", () => {
    expect(resolveAccess(facts({ passes: [pass(-90, 0)] }), NOW).level).toBe("free"); // ends exactly now
    expect(resolveAccess(facts({ passes: [pass(1, 91)] }), NOW).level).toBe("free"); // not started yet
    expect(resolveAccess(facts({ passes: [pass(-1, 89, true)] }), NOW).level).toBe("free");
    expect(resolveAccess(facts({ passes: [pass(0, 90)] }), NOW).level).toBe("full");
  });

  it("follows Passes bought back to back to the last end date", () => {
    expect(resolveAccess(facts({ passes: [pass(80, 170), pass(-10, 80)] }), NOW).expiresAt).toEqual(days(170));
    // A revoked follow-up does not extend the access.
    expect(resolveAccess(facts({ passes: [pass(-10, 80), pass(80, 170, true)] }), NOW).expiresAt).toEqual(days(80));
  });

  it("buying again adds the days to the current end date", () => {
    expect(passWindow([], NOW, 90)).toEqual({ startsAt: NOW, expiresAt: days(90) });
    expect(passWindow([pass(-10, 80)], NOW, 90)).toEqual({ startsAt: days(80), expiresAt: days(170) });
    expect(passWindow([pass(-10, 80), pass(80, 170)], NOW, 90)).toEqual({ startsAt: days(170), expiresAt: days(260) });
    // Expired or revoked Passes do not delay the new one.
    expect(passWindow([pass(-100, -10), pass(-5, 85, true)], NOW, 90)).toEqual({ startsAt: NOW, expiresAt: days(90) });
  });
});

describe("subscriptions", () => {
  it("active and trialing give access with no end date", () => {
    expect(subscriptionAccess(sub("active"), NOW)).toEqual({ active: true, until: null });
    expect(subscriptionAccess(sub("trialing"), NOW)).toEqual({ active: true, until: null });
  });

  it(`past_due keeps access ${PAST_DUE_GRACE_DAYS} days, then cuts it`, () => {
    expect(subscriptionAccess(sub("past_due", 20, -6), NOW)).toEqual({ active: true, until: days(1) });
    expect(subscriptionAccess(sub("past_due", 20, -7), NOW)).toEqual({ active: false, until: days(0) });
    // Without the date it became unpaid, no grace (it would otherwise slide forever).
    expect(subscriptionAccess(sub("past_due"), NOW)).toEqual({ active: false, until: null });
    expect(resolveAccess(facts({ subscriptions: [sub("past_due", 20, -2)] }), NOW)).toEqual({ level: "full", source: "subscription", expiresAt: days(5) });
  });

  it("canceled keeps access until the end of the paid period", () => {
    expect(subscriptionAccess(sub("canceled", 3), NOW)).toEqual({ active: true, until: days(3) });
    expect(subscriptionAccess(sub("canceled", 0), NOW).active).toBe(false);
  });

  it("other statuses give no access", () => {
    for (const s of ["incomplete", "incomplete_expired", "unpaid", "paused"]) expect(subscriptionAccess(sub(s), NOW).active).toBe(false);
  });

  it("keeps an expired Pass valid next to a subscription: each right is checked on its own", () => {
    expect(resolveAccess(facts({ subscriptions: [sub("unpaid")], passes: [pass(-1, 30)] }), NOW)).toEqual({ level: "full", source: "pass", expiresAt: days(30) });
  });
});

describe("free quota and refusals", () => {
  const free = resolveAccess(facts(), NOW);
  const full = resolveAccess(facts({ isAdmin: true }), NOW);

  it("counts the free mock exams left", () => {
    expect(examsLeft(free, 0, 1)).toBe(1);
    expect(examsLeft(free, 1, 1)).toBe(0);
    expect(examsLeft(free, 3, 1)).toBe(0);
    expect(examsLeft(free, 5, null)).toBeNull();
    expect(examsLeft(full, 9, 1)).toBeNull();
  });

  it("gives the most specific reason for a refusal", () => {
    expect(refusalReason(facts(), NOW)).toBe("quota_exhausted");
    expect(refusalReason(facts({ passes: [pass(-100, -10)] }), NOW)).toBe("pass_expired");
    // A refunded (revoked) Pass is not "expired".
    expect(refusalReason(facts({ passes: [pass(-100, -10, true)] }), NOW)).toBe("quota_exhausted");
    expect(refusalReason(facts({ subscriptions: [sub("canceled", -1)] }), NOW)).toBe("subscription_inactive");
  });

  it("carries the reason and the 402 status (403 for an unverified address, which no offer lifts)", () => {
    const err = new AccessError("pass_expired");
    expect(err).toMatchObject({ code: "pass_expired", status: 402, name: "AccessError" });
    expect(new AccessError("email_unverified").status).toBe(403);
  });

  it("knows which refusals the offer screen explains", () => {
    for (const code of ["quota_exhausted", "pass_expired", "subscription_inactive"]) expect(isRefusalCode(code)).toBe(true);
    for (const code of ["email_unverified", "correction", "", null, 402]) expect(isRefusalCode(code)).toBe(false);
  });
});
