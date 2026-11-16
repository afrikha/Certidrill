"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { setSectionReadAction, type SectionReadState } from "@/lib/actions/course";
import { Button } from "@/components/ui/button";

/**
 * "Mark as read" on a section, reversible. A plain form: it works without
 * script too (the page reloads).
 */
export function MarkRead({ sectionId, read: initial, title }: Readonly<{ sectionId: string; read: boolean; title: string }>) {
  const t = useTranslations("course");
  const [state, action, pending] = useActionState<SectionReadState, FormData>(setSectionReadAction, { read: initial });
  const read = pending ? !state.read : state.read;
  return (
    <form action={action} className="flex flex-wrap items-center gap-3" data-testid="mark-read">
      <input type="hidden" name="section" value={sectionId} />
      <input type="hidden" name="read" value={String(!state.read)} />
      {read && <span className="text-sm font-semibold text-success">✓ {t("read")}</span>}
      <Button type="submit" variant={read ? "ghost" : "secondary"} disabled={pending} aria-describedby={`${sectionId}-title`} className={read ? "text-muted-foreground underline" : undefined}>
        {read ? t("markUnread") : t("markRead")}
        <span className="sr-only">: {title}</span>
      </Button>
      {state.error && <p role="alert" className="text-sm text-danger">{t("readError")}</p>}
    </form>
  );
}
