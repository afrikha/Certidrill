"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/input";

const REASONS = ["wrong_answer", "ambiguous", "outdated", "typo", "translation", "other"] as const;

export function ReportForm({ questionId }: { questionId: string }) {
  const t = useTranslations("results");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  if (state === "sent") return <p role="status" className="text-sm text-success">{t("reportSent")}</p>;
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-muted-foreground underline">{t("report")}</summary>
      <form
        className="mt-3 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          setState("sending");
          const res = await fetch(`/api/questions/${questionId}/report`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason: data.get("reason"), comment: data.get("comment") || undefined }),
          }).catch(() => null);
          setState(res?.ok ? "sent" : "error");
        }}
      >
        <div>
          <Label htmlFor={`reason-${questionId}`}>{t("reportReason")}</Label>
          <Select id={`reason-${questionId}`} name="reason" defaultValue="wrong_answer">
            {REASONS.map((r) => <option key={r} value={r}>{t(`reason_${r}`)}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor={`comment-${questionId}`}>{t("reportComment")}</Label>
          <textarea id={`comment-${questionId}`} name="comment" maxLength={2000} rows={3} className="block w-full rounded-md border border-border px-3 py-2" />
        </div>
        <Button type="submit" variant="secondary" disabled={state === "sending"}>{t("reportSend")}</Button>
        {state === "error" && <p role="alert" className="text-danger">Error</p>}
      </form>
    </details>
  );
}
