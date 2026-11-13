import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { clientIp, createRateLimiter } from "@/lib/security/rate-limit";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createUserSchema } from "@/lib/users";

describe("rate limiter", () => {
  it("allows up to the limit within a window, then blocks, then resets", () => {
    const rl = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect(rl.hit("k", 0)).toBe(true);
    expect(rl.hit("k", 10)).toBe(true);
    expect(rl.hit("k", 20)).toBe(false);
    expect(rl.hit("other", 20)).toBe(true);
    expect(rl.hit("k", 1001)).toBe(true);
    rl.reset("k");
    expect(rl.hit("k", 1002)).toBe(true);
    expect(rl.blocked("k", 1003)).toBe(false);
    rl.hit("k", 1003);
    expect(rl.blocked("k", 1004)).toBe(true);
    expect(rl.blocked("k", 3000)).toBe(false);
    expect(rl.blocked("unknown", 0)).toBe(false);
  });

  it("gives back a hit within its window only", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1000 });
    const first = rl.take("k", 0);
    expect(first.ok).toBe(true);
    first.release(10);
    expect(rl.hit("k", 20)).toBe(true);
    const refused = rl.take("k", 30);
    expect(refused.ok).toBe(false);
    // Giving back a refused hit lowers the count to the limit: still blocked.
    refused.release(40);
    expect(rl.blocked("k", 40)).toBe(true);
    expect(rl.hit("k", 50)).toBe(false);
  });

  it("never gives back a hit to a later window, nor after a reset", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1000 });
    const old = rl.take("k", 0);
    // Window over: a new one starts, and the old hit is not taken from it.
    expect(rl.hit("k", 1500)).toBe(true);
    old.release(1600);
    expect(rl.hit("k", 1700)).toBe(false);
    const late = rl.take("k", 1800);
    rl.reset("k");
    expect(rl.hit("k", 1900)).toBe(true);
    late.release(1950);
    expect(rl.blocked("k", 1960)).toBe(true);
    // Released after its own window ended (same bucket, too late): nothing.
    const again = rl.take("j", 0);
    again.release(5000);
    expect(rl.blocked("j", 10)).toBe(true);
  });
});

describe("passwords", () => {
  it("hashes with argon2id and verifies", async () => {
    const h = await hashPassword("correct horse battery staple");
    expect(h.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(h, "correct horse battery staple")).toBe(true);
    expect(await verifyPassword(h, "wrong")).toBe(false);
    expect(await verifyPassword("not-a-hash", "x")).toBe(false);
  });
});

describe("user creation input", () => {
  it("normalizes e-mail and applies defaults", () => {
    const u = createUserSchema.parse({ email: "  Anis@Example.COM " });
    expect(u).toMatchObject({ email: "anis@example.com", role: "user", locale: "en" });
    expect(u.password).toBeUndefined();
  });

  it("rejects short passwords and bad e-mails", () => {
    expect(createUserSchema.safeParse({ email: "a@b.co", password: "short" }).success).toBe(false);
    expect(createUserSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});

describe("page guards (layouts are not re-run on every navigation: each page checks itself)", () => {
  const root = path.resolve(__dirname, "../..");
  const pages = (dir: string): string[] =>
    readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? pages(path.join(dir, e.name)) : e.name === "page.tsx" ? [path.join(dir, e.name)] : [],
    );

  it("every admin page calls requireAdmin()", () => {
    const list = pages("app/admin");
    expect(list.length).toBeGreaterThan(0);
    for (const f of list) expect(readFileSync(path.join(root, f), "utf8"), f).toMatch(/await requireAdmin\(\)/);
  });

  it("every signed-in page calls requireUser() or requireAdmin()", () => {
    const list = [...pages("app/(app)"), ...pages("app/(exam)")];
    expect(list.length).toBeGreaterThan(0);
    for (const f of list) expect(readFileSync(path.join(root, f), "utf8"), f).toMatch(/await require(User|Admin)\(\)/);
  });

  it("every admin server action calls requireAdmin()", () => {
    const src = readFileSync(path.join(root, "lib/actions/admin.ts"), "utf8");
    const actions = src.match(/export async function \w+/g) ?? [];
    expect(actions.length).toBeGreaterThan(0);
    expect(src.match(/await requireAdmin\(\)/g) ?? []).toHaveLength(actions.length);
  });
});

describe("client address", () => {
  it("is X-Real-IP (set by Caddy), else the first X-Forwarded-For entry, else unknown", () => {
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.4", "x-forwarded-for": "203.0.113.7" }))).toBe("198.51.100.4");
    expect(clientIp(new Headers({ "x-forwarded-for": " 203.0.113.7 , 10.0.0.1" }))).toBe("203.0.113.7");
    expect(clientIp(new Headers({ "x-forwarded-for": "" }))).toBe("unknown");
    expect(clientIp(new Headers())).toBe("unknown");
  });

  it("never trusts X-Forwarded-For in production, where Caddy always sets X-Real-IP", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.7" }), true)).toBe("unknown");
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.4", "x-forwarded-for": "203.0.113.7" }), true)).toBe("198.51.100.4");
  });
});
