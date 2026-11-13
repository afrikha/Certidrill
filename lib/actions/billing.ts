"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { BillingAdminError, grantPass, revokeEntitlement, setSwitch } from "@/lib/access/admin";
import { SWITCHES, type Switch } from "@/lib/settings";
import { formString } from "@/lib/form-data";

export type BillingState = { ok?: true; error?: "invalid" | "not_found" | "inactive_certification" } | undefined;

async function run(fn: () => Promise<unknown>): Promise<BillingState> {
  try {
    await fn();
  } catch (err) {
    if (err instanceof ZodError) return { error: "invalid" };
    if (err instanceof BillingAdminError) return { error: err.code };
    throw err;
  }
  revalidatePath("/admin/billing");
  return { ok: true };
}

/** Grants or extends a Pass by hand (Administration → Billing). */
export async function grantPassAction(_prev: BillingState, formData: FormData): Promise<BillingState> {
  const admin = await requireAdmin();
  return run(() =>
    grantPass(prisma, admin.id, {
      userId: formString(formData, "userId"),
      certificationCode: formString(formData, "certification"),
      days: formString(formData, "days"),
      source: formString(formData, "source") as "admin" | "extension",
      reason: formString(formData, "reason"),
    }),
  );
}

export async function revokeEntitlementAction(_prev: BillingState, formData: FormData): Promise<BillingState> {
  const admin = await requireAdmin();
  return run(() => revokeEntitlement(prisma, admin.id, { entitlementId: formString(formData, "entitlementId"), reason: formString(formData, "reason") }));
}

const isSwitch = (name: string): name is Switch => Object.hasOwn(SWITCHES, name);

export async function setSwitchAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const name = formString(formData, "name");
  if (!isSwitch(name)) return;
  await setSwitch(prisma, admin.id, name, formString(formData, "enabled") === "true");
  revalidatePath("/admin/billing");
}
