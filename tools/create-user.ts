/**
 * Creates an account (sign-ups are closed).
 *   npm run user:create -- --email me@example.com [--password '…'] [--name Anis] [--admin] [--locale fr]
 */
import { parseArgs } from "node:util";
import { PrismaClient } from "@prisma/client";
import { createUser } from "../lib/users";

async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: "string" },
      password: { type: "string" },
      name: { type: "string" },
      locale: { type: "string" },
      admin: { type: "boolean", default: false },
    },
  });
  if (!values.email) throw new Error("--email is required");
  const db = new PrismaClient();
  try {
    const user = await createUser(db, {
      email: values.email,
      password: values.password,
      name: values.name,
      locale: (values.locale as "en" | "fr" | undefined) ?? "en",
      role: values.admin ? "admin" : "user",
    });
    console.log(`✔ created ${user.role} ${user.email} (${user.id})`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
