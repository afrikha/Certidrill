/**
 * Integration tests of the HTTP API: the real route handlers of app/api/**,
 * on a real PostgreSQL. Only the Auth.js session is replaced by a stub.
 */
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { loadCertification } from "@/lib/content/loader";
import { loadBank } from "@/lib/content/bank";
import { seedBank, seedReferential } from "@/lib/content/seed";
import { createUser } from "@/lib/users";
import type { AttemptView } from "@/lib/exam/session";
import { anyResponse, publishSampleBank } from "./sample-bank";

const session = vi.hoisted(() => ({ current: null as null | { user: { id: string; role: string; locale: string } } }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => session.current) }));

import * as attempts from "@/app/api/attempts/route";
import * as attempt from "@/app/api/attempts/[id]/route";
import * as start from "@/app/api/attempts/[id]/start/route";
import * as item from "@/app/api/attempts/[id]/items/[itemId]/route";
import * as lock from "@/app/api/attempts/[id]/sections/[sectionId]/lock/route";
import * as submit from "@/app/api/attempts/[id]/submit/route";
import * as results from "@/app/api/attempts/[id]/results/route";
import * as progress from "@/app/api/me/progress/route";
import * as report from "@/app/api/questions/[id]/report/route";
import * as health from "@/app/api/health/route";

const ORIGIN = "http://localhost:3000";
let alice: string;
let bob: string;

function as(userId: string | null, locale = "en") {
  session.current = userId ? { user: { id: userId, role: "user", locale } } : null;
}

function req(method: string, url: string, body?: unknown, headers: Record<string, string> = { origin: ORIGIN }) {
  return new Request(`${ORIGIN}${url}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}
const ctx = <P,>(params: P) => ({ params: Promise.resolve(params) });

async function json(res: Response) {
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

beforeAll(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "attempt_item","attempt_section","attempt","question_report","question","case_study","question_series","objective","domain","blueprint","certification","auth_account","auth_session","auth_verification_token","user" CASCADE',
  );
  const content = await loadCertification(path.resolve(__dirname, "../../content/az-104"));
  await seedReferential(prisma, content);
  await seedBank(prisma, content, await loadBank(content));
  await publishSampleBank(prisma);
  alice = (await createUser(prisma, { email: "alice-api@example.com" })).id;
  bob = (await createUser(prisma, { email: "bob-api@example.com" })).id;
});
afterAll(() => prisma.$disconnect());
beforeEach(() => as(alice));

describe("API guards", () => {
  it("rejects anonymous requests with 401", async () => {
    as(null);
    expect(await json(await progress.GET(req("GET", "/api/me/progress"), ctx({})))).toEqual({ status: 401, body: { error: "unauthenticated" } });
  });

  it("rejects mutating requests from another origin (CSRF) with 403, before authentication", async () => {
    as(null);
    const evil = req("POST", "/api/attempts", { certification: "az-104", locale: "en" }, { origin: "https://evil.example" });
    expect(await json(await attempts.POST(evil, ctx({})))).toEqual({ status: 403, body: { error: "forbidden_origin" } });
    const none = req("POST", "/api/attempts", { certification: "az-104", locale: "en" }, {});
    expect((await attempts.POST(none, ctx({}))).status).toBe(403);
    const referer = req("POST", "/api/attempts", { certification: "nope", locale: "en" }, { referer: `${ORIGIN}/dashboard` });
    expect((await attempts.POST(referer, ctx({}))).status).not.toBe(403);
  });

  it("validates bodies: invalid JSON and schema errors give 400", async () => {
    expect(await json(await attempts.POST(req("POST", "/api/attempts", "{oops"), ctx({})))).toEqual({ status: 400, body: { error: "invalid_json" } });
    const bad = await json(await attempts.POST(req("POST", "/api/attempts", { certification: "az-104", locale: "de" }), ctx({})));
    expect(bad.status).toBe(400);
    expect(bad.body.error).toBe("invalid_request");
  });

  it("maps domain errors to their HTTP status and hides internal errors", async () => {
    expect((await attempts.POST(req("POST", "/api/attempts", { certification: "zz-999", locale: "en" }), ctx({}))).status).toBe(404);
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await json(await attempt.GET(req("GET", "/api/attempts/x"), ctx({ id: null as unknown as string })));
    expect(res).toEqual({ status: 500, body: { error: "internal" } });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("health check answers ok with the database up", async () => {
    expect(await json(await health.GET())).toEqual({ status: 200, body: { status: "ok" } });
  });
});

describe("exam flow over HTTP", () => {
  it("runs an attempt end to end without ever leaking answers before submission", async () => {
    const created = await json(await attempts.POST(req("POST", "/api/attempts", { certification: "az-104", locale: "fr" }), ctx({})));
    expect(created.status).toBe(200);
    const id = created.body.attemptId as string;

    // Same call again returns the attempt in progress instead of a second one.
    const again = await json(await attempts.POST(req("POST", "/api/attempts", { certification: "az-104", locale: "fr" }), ctx({})));
    expect(again.body.attemptId).toBe(id);

    const started = await start.POST(req("POST", `/api/attempts/${id}/start`), ctx({ id }));
    expect(started.headers.get("cache-control")).toBe("no-store");
    const raw = await started.text();
    const view = JSON.parse(raw) as AttemptView;
    expect(view.items.length).toBeGreaterThan(0);
    for (const forbidden of ['"answer"', '"explanation"', '"correct"', '"references"']) expect(raw).not.toContain(forbidden);

    // Another user can neither read nor write this attempt.
    as(bob);
    expect((await attempt.GET(req("GET", `/api/attempts/${id}`), ctx({ id }))).status).toBe(404);
    const first = view.items[0]!;
    expect((await item.PUT(req("PUT", `/api/attempts/${id}/items/${first.id}`, { flagged: true }), ctx({ id, itemId: first.id }))).status).toBe(404);
    as(alice);

    const saved = await json(await item.PUT(req("PUT", `/api/attempts/${id}/items/${first.id}`, { response: anyResponse(first) }), ctx({ id, itemId: first.id })));
    expect(saved).toMatchObject({ status: 200, body: { id: first.id, answered: true } });
    const wrongShape = await json(await item.PUT(req("PUT", `/api/attempts/${id}/items/${first.id}`, { response: { nope: 1 } }), ctx({ id, itemId: first.id })));
    expect(wrongShape).toEqual({ status: 400, body: { error: "invalid_response" } });
    // Unknown fields are refused (strict body).
    expect((await item.PUT(req("PUT", `/api/attempts/${id}/items/${first.id}`, { flagged: true, score: 1 }), ctx({ id, itemId: first.id }))).status).toBe(400);

    // Results are not available before submission.
    expect((await results.GET(req("GET", `/api/attempts/${id}/results`), ctx({ id }))).status).toBe(409);

    const [s1, s2] = view.sections;
    if (s2) {
      const locked = await json(await lock.POST(req("POST", `/api/attempts/${id}/sections/${s1!.id}/lock`), ctx({ id, sectionId: s1!.id })));
      expect(locked.status).toBe(200);
      // Writing into a locked section is refused.
      const inS1 = view.items.find((i) => i.sectionId === s1!.id)!;
      expect((await item.PUT(req("PUT", `/api/attempts/${id}/items/${inS1.id}`, { flagged: false }), ctx({ id, itemId: inS1.id }))).status).toBe(409);
    }

    const done = await json(await submit.POST(req("POST", `/api/attempts/${id}/submit`), ctx({ id })));
    expect(done).toEqual({ status: 200, body: { id, status: "submitted" } });

    const fr = await json(await results.GET(req("GET", `/api/attempts/${id}/results?lang=fr`), ctx({ id })));
    expect(fr.status).toBe(200);
    expect(fr.body.scaledScore).toEqual(expect.any(Number));
    expect((fr.body.items as unknown[]).length).toBe(view.items.length);

    const p = await json(await progress.GET(req("GET", "/api/me/progress"), ctx({})));
    expect((p.body.attempts as unknown[]).length).toBe(1);

    // Reporting a question seen in the finished attempt.
    const qid = first.question.id;
    const rep = await json(await report.POST(req("POST", `/api/questions/${qid}/report`, { reason: "ambiguous", comment: "Two answers fit" }), ctx({ id: qid })));
    expect(rep.status).toBe(200);
    expect(rep.body.id).toEqual(expect.any(String));
    expect((await report.POST(req("POST", `/api/questions/${qid}/report`, { reason: "spam" }), ctx({ id: qid }))).status).toBe(400);
    // Reports on unknown or unseen questions don't use the quota.
    for (let i = 0; i < 5; i++) expect((await report.POST(req("POST", "/api/questions/nope/report", { reason: "typo" }), ctx({ id: "nope" }))).status).toBe(404);
    // Rate limit: 20 accepted reports per hour per user (the first one above counts).
    for (let i = 1; i < 20; i++) expect((await report.POST(req("POST", `/api/questions/${qid}/report`, { reason: "typo" }), ctx({ id: qid }))).status).toBe(200);
    expect(await json(await report.POST(req("POST", `/api/questions/${qid}/report`, { reason: "typo" }), ctx({ id: qid })))).toEqual({ status: 429, body: { error: "rate_limited" } });
    as(bob);
    expect((await report.POST(req("POST", `/api/questions/${qid}/report`, { reason: "typo" }), ctx({ id: qid }))).status).toBeGreaterThanOrEqual(400);
  });
});
