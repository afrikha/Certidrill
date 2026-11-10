import { describe, expect, it } from "vitest";
import { createRateLimiter } from "@/lib/security/rate-limit";
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
