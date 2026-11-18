import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

const h = vi.hoisted(() => ({
  drain: vi.fn(),
  erase: vi.fn(),
  purge: vi.fn(),
  stripe: { customers: {} } as object | null,
  events: [] as [string, unknown][],
  errors: [] as [string, unknown][],
}));
vi.mock("@/lib/email/outbox", () => ({ drainOutbox: h.drain }));
vi.mock("@/lib/billing/erase", () => ({ eraseDeletedCustomers: h.erase }));
vi.mock("@/lib/activity/logins", () => ({ purgeLogins: h.purge }));
vi.mock("@/lib/billing/stripe", () => ({ stripeApi: () => h.stripe }));
vi.mock("@/lib/log", () => ({
  logEvent: (name: string, data: unknown) => h.events.push([name, data]),
  logError: (name: string, err: unknown) => h.errors.push([name, err]),
}));

import { kickEmailWorker } from "@/lib/email/worker";

const db = {} as PrismaClient;
const sent = { sent: 1, skipped: 0, retried: 0, failed: 0 };

const HOUR_MS = 3_600_000;
// Each test starts more than an hour after the last purge: the purge is due.
let clock = Date.UTC(2026, 10, 18);
beforeEach(() => {
  clock += 2 * HOUR_MS;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(clock);
  h.purge.mockReset().mockResolvedValue(0);
  h.drain.mockReset().mockResolvedValue(sent);
  h.erase.mockReset().mockResolvedValue({ erased: 1, failed: 0 });
  h.stripe = { customers: {} };
  h.events = [];
  h.errors = [];
});

afterEach(() => {
  vi.useRealTimers();
});

describe("e-mail worker pass", () => {
  it("purges the sign-ins past their retention at most once an hour, and logs it", async () => {
    h.purge.mockResolvedValue(3);
    await kickEmailWorker(db);
    expect(h.purge).toHaveBeenCalledWith(db);
    expect(h.events).toContainEqual(["activity.purge", { purged: 3 }]);
    vi.setSystemTime(clock + HOUR_MS - 1);
    await kickEmailWorker(db);
    expect(h.purge).toHaveBeenCalledTimes(1);
    vi.setSystemTime(clock + HOUR_MS);
    await kickEmailWorker(db);
    expect(h.purge).toHaveBeenCalledTimes(2);
    clock += HOUR_MS;
  });

  it("keeps working when the purge fails, and logs it", async () => {
    const down = new Error("database down");
    h.purge.mockRejectedValue(down);
    await expect(kickEmailWorker(db)).resolves.toBeUndefined();
    expect(h.drain).toHaveBeenCalled();
    expect(h.errors).toEqual([["activity.purge", down]]);
  });

  it("sends the e-mails and erases at Stripe in the same pass", async () => {
    await kickEmailWorker(db);
    expect(h.drain).toHaveBeenCalledWith(db);
    expect(h.erase).toHaveBeenCalledWith(db, h.stripe);
    expect(h.events).toEqual([
      ["email.outbox", sent],
      ["billing.erase", { erased: 1, failed: 0 }],
    ]);
    expect(h.errors).toEqual([]);
  });

  it("still sends the e-mails when the erasure fails, and logs it", async () => {
    const down = new Error("database down");
    h.erase.mockRejectedValue(down);
    await expect(kickEmailWorker(db)).resolves.toBeUndefined();
    expect(h.events).toEqual([["email.outbox", sent]]);
    expect(h.errors).toEqual([["billing.erase", down]]);
  });

  it("still erases when sending fails, and logs it", async () => {
    const down = new Error("smtp down");
    h.drain.mockRejectedValue(down);
    await expect(kickEmailWorker(db)).resolves.toBeUndefined();
    expect(h.events).toEqual([["billing.erase", { erased: 1, failed: 0 }]]);
    expect(h.errors).toEqual([["email.worker", down]]);
  });

  it("logs nothing when there was nothing to do, and passes no Stripe when none is configured", async () => {
    h.drain.mockResolvedValue({ sent: 0, skipped: 0, retried: 0, failed: 0 });
    h.erase.mockResolvedValue({ erased: 0, failed: 0 });
    h.stripe = null;
    await kickEmailWorker(db);
    expect(h.erase).toHaveBeenCalledWith(db, null);
    expect(h.events).toEqual([]);
  });

  it("joins a pass already running instead of starting a second one", async () => {
    let finish!: (r: typeof sent) => void;
    h.drain.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const first = kickEmailWorker(db);
    const second = kickEmailWorker(db);
    expect(second).toBe(first);
    finish(sent);
    await first;
    expect(h.drain).toHaveBeenCalledTimes(1);
    await kickEmailWorker(db);
    expect(h.drain).toHaveBeenCalledTimes(2);
  });
});
