"use client";

import { useTranslations } from "next-intl";
import type { AttemptView } from "@/lib/exam/session";
import { Button } from "@/components/ui/button";
import { Alert, Card } from "@/components/ui/card";

export function Welcome({ view, onStart, busy, error, blueprintRange }: Readonly<{
  view: AttemptView;
  onStart: () => void;
  busy: boolean;
  error: string | null;
  blueprintRange?: { min: number; max: number };
}>) {
  const t = useTranslations("exam");
  const kinds = new Set(view.sectionKinds);
  return (
    <main id="main" className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold">{t("welcomeTitle", { code: view.certification.code.toUpperCase() })}</h1>
      <p className="mt-1 text-muted-foreground">{view.certification.title}</p>
      <Card className="mt-6">
        <h2 className="mb-3 font-semibold">{t("rules")}</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm">
          <li>{t("duration", { n: view.durationMin })}</li>
          <li>{t("questions", { n: view.totalQuestions })}</li>
          {kinds.has("case_study") && <li>{t("sectionsCase")}</li>}
          {kinds.has("series") && <li>{t("sectionsSeries")}</li>}
          <li>{t("sectionsMain")}</li>
          <li>{t("noHints")}</li>
          <li>{t("language", { lang: view.locale === "fr" ? "Français" : "English" })}</li>
        </ul>
        {blueprintRange && view.totalQuestions < blueprintRange.min && (
          <Alert tone="info" className="mt-4">{t("shortBank", { n: view.totalQuestions, min: blueprintRange.min, max: blueprintRange.max })}</Alert>
        )}
        {error && <Alert tone="error" className="mt-4">{error}</Alert>}
        <Button className="mt-6 w-full" onClick={onStart} disabled={busy}>{busy ? t("starting") : t("start")}</Button>
      </Card>
    </main>
  );
}
