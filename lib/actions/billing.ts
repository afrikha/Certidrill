"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { BillingAdminError, grantPass, revokeEntitlement, setSwitch, type GrantInput, type RevokeInput } from "@/lib/access/admin";
import { SWITCHES, type Switch } from "@/lib/settings";
import { formString } from "@/lib/form-data";
import { setCertificationPrice } from "@/lib/billing/prices";

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
      reason: formString(formData, "reason") as GrantInput["reason"],
    }),
  );
}

export async function revokeEntitlementAction(_prev: BillingState, formData: FormData): Promise<BillingState> {
  const admin = await requireAdmin();
  return run(() =>
    revokeEntitlement(prisma, admin.id, {
      entitlementId: formString(formData, "entitlementId"),
      reason: formString(formData, "reason") as RevokeInput["reason"],
    }),
  );
}

const isSwitch = (name: string): name is Switch => Object.hasOwn(SWITCHES, name);

export async function setSwitchAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const name = formString(formData, "name");
  if (!isSwitch(name)) return;
  await setSwitch(prisma, admin.id, name, formString(formData, "enabled") === "true");
  revalidatePath("/admin/billing");
}

export type PriceState = { ok?: true; unchanged?: true; error?: "invalid_price" | "not_found" } | undefined;

/** Sets the Pass price of one certification, or back to the plan's with an empty amount. */
export async function setCertificationPriceAction(_prev: PriceState, formData: FormData): Promise<PriceState> {
  const admin = await requireAdmin();
  let changed: boolean | null;
  try {
    changed = await setCertificationPrice(prisma, admin.id, {
      planCode: formString(formData, "plan"),
      certificationCode: formString(formData, "certification"),
      amount: formString(formData, "amount"),
    });
  } catch (err) {
    if (err instanceof ZodError) return { error: "invalid_price" };
    throw err;
  }
  if (changed === null) return { error: "not_found" };
  if (!changed) return { unchanged: true };
  revalidatePath("/admin/billing");
  return { ok: true };
}
