import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadCertification } from "@/lib/content/loader";
import { seedReferential } from "@/lib/content/seed";
import { createUser, UserExistsError } from "@/lib/users";

const db = new PrismaClient();

beforeAll(async () => {
  await db.$executeRawUnsafe(
    'TRUNCATE "attempt_item","attempt_section","attempt","question_report","question","case_study","question_series","objective","domain","blueprint","certification","auth_account","auth_session","auth_verification_token","user" CASCADE',
  );
});
afterAll(() => db.$disconnect());

describe("seed", () => {
  it("loads the AZ-104 referential and is idempotent", async () => {
    const content = await loadCertification(path.resolve(__dirname, "../../content/az-104"));
    await seedReferential(db, content);
    await seedReferential(db, content);
    const blueprints = await db.blueprint.findMany({ include: { domains: { include: { objectives: true } } } });
    expect(blueprints).toHaveLength(1);
    expect(blueprints[0]!.current).toBe(true);
    expect(blueprints[0]!.domains).toHaveLength(5);
    expect(blueprints[0]!.domains.flatMap((d) => d.objectives)).toHaveLength(81);
  });
});

describe("users", () => {
  it("creates a user with a hashed password and refuses duplicates", async () => {
    const u = await createUser(db, { email: "Admin@Example.com", password: "a-very-long-password", role: "admin" });
    expect(u.email).toBe("admin@example.com");
    const stored = await db.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
    await expect(createUser(db, { email: "admin@example.com" })).rejects.toBeInstanceOf(UserExistsError);
  });
});

describe("constraints", () => {
  it("allows a single in_progress attempt per user and certification", async () => {
    const user = await db.user.findFirstOrThrow();
    const bp = await db.blueprint.findFirstOrThrow();
    const base = { userId: user.id, certificationId: bp.certificationId, blueprintId: bp.id, locale: "en", seed: "s" };
    await db.attempt.create({ data: base });
    await expect(db.attempt.create({ data: base })).rejects.toThrow();
    await db.attempt.create({ data: { ...base, status: "submitted" } });
  });
});
