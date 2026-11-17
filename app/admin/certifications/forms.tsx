"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { setCertificationActiveAction, setCourseStatusesAction, setQuestionStatusesAction, type PublishState } from "@/lib/actions/publish";
import { BATCH_STATUSES } from "@/lib/content/batch-status";
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

function StatusSelect({ name, label, defaultValue }: Readonly<{ name: string; label: string; defaultValue: string }>) {
  const t = useTranslations("publishAdmin");
  return (
    <label className="text-sm">
      <span className="sr-only">{label}</span>
      <Select name={name} defaultValue={defaultValue} aria-label={label}>
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

/** The questions selected by the filters of the questions page, to one status. */
export function QuestionBatchForm({ code, filters, count }: Readonly<{ code: string; filters: { type?: string; status?: string; domain?: string }; count: number }>) {
  const t = useTranslations("publishAdmin");
  const [state, action, pending] = useActionState(setQuestionStatusesAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3" data-testid="question-batch">
      <input type="hidden" name="certification" value={code} />
      <input type="hidden" name="type" value={filters.type ?? ""} />
      <input type="hidden" name="status" value={filters.status ?? ""} />
      <input type="hidden" name="domain" value={filters.domain ?? ""} />
      <span className="text-sm font-medium">{t("batchTitle", { count, code: code.toUpperCase() })}</span>
      <StatusSelect name="to" label={t("questionsTo")} defaultValue="published" />
      <Confirm id="question-batch-confirm" label={t("confirmQuestions", { count })} />
      <Button type="submit" variant="secondary" disabled={pending || count === 0}>{t("apply")}</Button>
      <Result state={state} done={(n) => t("questionsChanged", { count: n ?? 0 })} />
    </form>
  );
}
