"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { grantPassAction, revokeEntitlementAction, setCertificationPriceAction, type BillingState } from "@/lib/actions/billing";
import { GRANT_REASONS, REVOKE_REASONS } from "@/lib/access/reasons";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/card";

function Status({ state, done }: Readonly<{ state: BillingState; done: string }>) {
  const t = useTranslations("billingAdmin");
  if (state?.ok) return <Alert tone="success">{done}</Alert>;
  if (state?.error) return <Alert tone="error">{t(`error_${state.error}`)}</Alert>;
  return null;
}

/** Grant or extension of a Pass: it starts when the current one of the certification ends. */
export function GrantForm({ userId, certifications, defaultDays }: Readonly<{ userId: string; certifications: { code: string; title: string }[]; defaultDays: number }>) {
  const t = useTranslations("billingAdmin");
  const [state, action, pending] = useActionState(grantPassAction, undefined);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" data-testid="grant-form">
      <div className="sm:col-span-2"><Status state={state} done={t("granted")} /></div>
      <input type="hidden" name="userId" value={userId} />
      <div>
        <Label htmlFor="grant-certification">{t("certification")}</Label>
        <Select id="grant-certification" name="certification" required>
          {certifications.map((c) => (
            <option key={c.code} value={c.code}>{c.code.toUpperCase()} — {c.title}</option>
          ))}
        </Select>
      </div>
      <div className="flex gap-4">
        <div>
          <Label htmlFor="grant-days">{t("days")}</Label>
          <Input id="grant-days" name="days" type="number" min={1} max={3650} defaultValue={defaultDays} required className="w-28" />
        </div>
        <div>
          <Label htmlFor="grant-source">{t("source")}</Label>
          <Select id="grant-source" name="source" defaultValue="admin">
            <option value="admin">{t("source_admin")}</option>
            <option value="extension">{t("source_extension")}</option>
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="grant-reason">{t("reason")}</Label>
        <Select id="grant-reason" name="reason" required defaultValue="" aria-describedby="grant-reason-help">
          <option value="" disabled>{t("reasonChoose")}</option>
          {GRANT_REASONS.map((r) => (
            <option key={r} value={r}>{t(`reason_${r}`)}</option>
          ))}
        </Select>
      </div>
      <p id="grant-reason-help" className="sm:col-span-2 -mt-2 text-xs text-muted-foreground">{t("reasonPrivacy")}</p>
      <div className="sm:col-span-2 flex justify-end">
        <Button type="submit" disabled={pending}>{t("grant")}</Button>
      </div>
    </form>
  );
}

export function RevokeForm({ entitlementId }: Readonly<{ entitlementId: string }>) {
  const t = useTranslations("billingAdmin");
  const [state, action, pending] = useActionState(revokeEntitlementAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2" data-testid="revoke-form">
      <input type="hidden" name="entitlementId" value={entitlementId} />
      <Select name="reason" aria-label={t("reason")} required defaultValue="" className="w-48">
        <option value="" disabled>{t("reasonChoose")}</option>
        {REVOKE_REASONS.map((r) => (
          <option key={r} value={r}>{t(`reason_${r}`)}</option>
        ))}
      </Select>
      <Button type="submit" variant="secondary" disabled={pending}>{t("revoke")}</Button>
      {state?.error && <Alert tone="error">{t(`error_${state.error}`)}</Alert>}
    </form>
  );
}

/** The Pass price of one certification: a new amount, or empty for the plan's price. */
export function PriceForm({ planCode, code, current }: Readonly<{ planCode: string; code: string; current: string }>) {
  const t = useTranslations("billingAdmin");
  const [state, action, pending] = useActionState(setCertificationPriceAction, undefined);
  const id = `price-${code}`;
  return (
    <form action={action} className="flex flex-wrap items-center gap-2" data-testid={`price-form-${code}`}>
      <input type="hidden" name="plan" value={planCode} />
      <input type="hidden" name="certification" value={code} />
      <label htmlFor={id} className="sr-only">{t("priceAmount", { code: code.toUpperCase() })}</label>
      <Input id={id} name="amount" inputMode="decimal" defaultValue={current} placeholder="—" className="w-24" />
      <Button type="submit" variant="secondary" disabled={pending}>{t("priceSave")}</Button>
      {state?.ok && <span role="status" className="text-sm text-success">{t("priceSaved")}</span>}
      {state?.unchanged && <span role="status" className="text-sm text-muted-foreground">{t("priceUnchanged")}</span>}
      {state?.error && <span role="alert" className="text-sm text-danger">{t(`error_${state.error}`)}</span>}
    </form>
  );
}
