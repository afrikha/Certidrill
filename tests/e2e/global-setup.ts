import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../lib/auth/password";

export const E2E_ADMIN = { email: "e2e-admin@certidrill.test", password: "e2e-admin-password" };

export default async function globalSetup() {
  execSync("npx prisma migrate deploy && npm run seed", { stdio: "inherit" });
  const db = new PrismaClient();
  try {
    const passwordHash = await hashPassword(E2E_ADMIN.password);
    await db.user.upsert({
      where: { email: E2E_ADMIN.email },
      create: { email: E2E_ADMIN.email, passwordHash, role: "admin", name: "E2E Admin" },
      update: { passwordHash, role: "admin" },
    });
  } finally {
    await db.$disconnect();
  }
}
