"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { setCertificationActiveAction, setCourseStatusesAction, setQuestionStatusesAction, type PublishState } from "@/lib/actions/publish";
import { BATCH_STATUSES, isBatchStatus, type BatchStatus } from "@/lib/content/batch-status";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";

function Result({ state, done }: Readonly<{ state: PublishState; done: (count?: number) => string }>) {
  const t = useTranslations("publishAdmin");
  if (state?.ok) return <output className="text-sm text-success">{done(state.count)}</output>;
  if (state?.unchanged) return <output className="text-sm text-muted-foreground">{t("unchanged")}</output>;
  if (state?.error) return <span role="alert" className="text-sm text-danger">{t(`error_${state.error}`)}</span>;
  return null;
}

/** Activate or deactivate one certification. */
export function ActiveForm({ code, active }: Readonly<{ code: string; active: boolean }>) {
  const t = useTranslations("publishAdmin");
  const [state, action, pending] = useActionState(setCertificationActiveAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2" data-testid={`active-form-${code}`}>
      <input type="hidden" name="certification" value={code} />
      <input type="hidden" name="active" value={active ? "false" : "true"} />
      <Button type="submit" variant={active ? "secondary" : "primary"} disabled={pending}>
        {active ? t("deactivate") : t("activate")}
      </Button>
      <Result state={state} done={() => (state?.active ? t("activated") : t("deactivated"))} />
    </form>
  );
}

function Confirm({ id, label }: Readonly<{ id: string; label: string }>) {
  return (
    <label htmlFor={id} className="flex items-center gap-1.5 text-sm">
      <input id={id} type="checkbox" name="confirm" value="yes" required className="size-4 accent-primary" />
      {label}
    </label>
  );
}

function StatusSelect({ name, label, defaultValue, onChange }: Readonly<{ name: string; label: string; defaultValue: string; onChange?: (value: string) => void }>) {
  const t = useTranslations("publishAdmin");
  return (
    <label className="text-sm">
      <span className="sr-only">{label}</span>
      <Select name={name} defaultValue={defaultValue} aria-label={label} onChange={onChange && ((e) => onChange(e.target.value))}>
        {BATCH_STATUSES.map((s) => <option key={s} value={s}>{t(`status_${s}`)}</option>)}
      </Select>
    </label>
  );
}

/** Every chapter of a certification's course to one status. */
export function CourseBatchForm({ code }: Readonly<{ code: string }>) {
  const t = useTranslations("publishAdmin");
  const [state, action, pending] = useActionState(setCourseStatusesAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2" data-testid={`course-batch-${code}`}>
      <input type="hidden" name="certification" value={code} />
      <StatusSelect name="to" label={t("courseTo", { code: code.toUpperCase() })} defaultValue="published" />
      <Confirm id={`course-confirm-${code}`} label={t("confirmCourse")} />
      <Button type="submit" variant="secondary" disabled={pending}>{t("apply")}</Button>
      <Result state={state} done={(count) => t("chaptersChanged", { count: count ?? 0 })} />
    </form>
  );
}

/**
 * The questions selected by the filters of the questions page, to one status.
 * `byStatus`: the questions a batch may change, by status; the count shown is
 * those not yet at the status chosen, the ones the batch will change.
 * `groups`: the case studies and series a publishing batch would publish
 * although none of their questions changes (see groupsToPublish).
 */
export function QuestionBatchForm({ code, filters, byStatus, groups }: Readonly<{ code: string; filters: { usage?: string; chapter?: string; type?: string; status?: string; domain?: string }; byStatus: Record<BatchStatus, number>; groups: number }>) {
  const t = useTranslations("publishAdmin");
  const [state, action, pending] = useActionState(setQuestionStatusesAction, undefined);
  const [to, setTo] = useState<BatchStatus>("published");
  const total = BATCH_STATUSES.reduce((n, s) => n + byStatus[s], 0);
  const count = total - byStatus[to];
  const groupCount = to === "published" ? groups : 0;
  return (
    <form action={action} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3" data-testid="question-batch">
      <input type="hidden" name="certification" value={code} />
      <input type="hidden" name="usage" value={filters.usage ?? "exam"} />
      <input type="hidden" name="chapter" value={filters.chapter ?? ""} />
      <input type="hidden" name="type" value={filters.type ?? ""} />
      <input type="hidden" name="status" value={filters.status ?? ""} />
      <input type="hidden" name="domain" value={filters.domain ?? ""} />
      <span className="text-sm font-medium">{t("batchTitle", { count: total, code: code.toUpperCase() })}</span>
      <StatusSelect name="to" label={t("questionsTo")} defaultValue="published" onChange={(v) => isBatchStatus(v) && setTo(v)} />
      <Confirm id="question-batch-confirm" label={groupCount > 0 ? `${t("confirmQuestions", { count })} ${t("andGroups", { count: groupCount })}` : t("confirmQuestions", { count })} />
      <Button type="submit" variant="secondary" disabled={pending || count + groupCount === 0}>{t("apply")}</Button>
      <Result state={state} done={(n) => (state?.groups ? `${t("questionsChanged", { count: n ?? 0 })} ${t("groupsChanged", { count: state.groups, to: state.to ?? "published" })}` : t("questionsChanged", { count: n ?? 0 }))} />
    </form>
  );
}
