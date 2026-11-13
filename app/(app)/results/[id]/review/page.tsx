import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getAttemptResults } from "@/lib/exam/results";
import { SessionError } from "@/lib/exam/session";
import { isLocale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { Html } from "@/components/questions/html";
import { AnsweredQuestion } from "./answered-question";
import { ReportForm } from "./report-form";
import { withKeys } from "@/components/with-keys";

export const metadata = { title: "Correction" };
export const dynamic = "force-dynamic";

const FILTER_LABEL = { all: "filterAll", missed: "filterMissed", flagged: "filterFlagged" } as const;

export default async function CorrectionPage({ params, searchParams }: Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string; filter?: string; domain?: string }>;
}>) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  let r;
  try {
    r = await getAttemptResults(prisma, { attemptId: id, userId: user.id, locale: isLocale(sp.lang) ? sp.lang : undefined });
  } catch (err) {
    if (err instanceof SessionError && err.code === "not_found") notFound();
    if (err instanceof SessionError && err.code === "not_started") redirect(`/exam/${id}`);
    throw err;
  }
  const t = await getTranslations("results");
  const filter = sp.filter === "missed" || sp.filter === "flagged" ? sp.filter : "all";
  const items = r.items.filter(
    (i) =>
      (filter === "all" || (filter === "missed" ? i.earned < i.max : i.flagged)) &&
      (!sp.domain || i.domain.code === sp.domain),
  );
  // Questions answered correctly are locked at the free level: shown in place, without content, when every question is listed.
  const locked = filter === "all" ? r.correction.locked.filter((l) => !sp.domain || l.domain.code === sp.domain) : [];
  const cards = [
    ...items.map((item) => ({ kind: "item" as const, order: item.order, item })),
    ...locked.map((item) => ({ kind: "locked" as const, order: item.order, item })),
  ].sort((a, b) => a.order - b.order);
  const href = (patch: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const merged = { lang: r.locale, filter, domain: sp.domain, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v && !(k === "filter" && v === "all")) q.set(k, v);
    return `/results/${r.id}/review?${q}`;
  };
  const pill = (active: boolean) => cn("rounded-full border px-3 py-1 text-sm", active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted");

  return (
    <div className="space-y-6" lang={r.locale}>
      <p className="text-sm"><Link href={`/results/${r.id}`} className="text-primary underline">← {t("backToReport")}</Link></p>
      <h1 className="text-2xl font-bold">{t("correction")} — <span className="font-mono uppercase">{r.certification.code}</span> ({r.scaledScore}/{r.maxScore})</h1>

      <nav aria-label={t("correction")} className="flex flex-wrap items-center gap-2">
        {(["all", "missed", "flagged"] as const).map((f) => (
          <Link key={f} href={href({ filter: f })} aria-current={filter === f ? "page" : undefined} className={pill(filter === f)}>
            {t(FILTER_LABEL[f])}
          </Link>
        ))}
        <span className="mx-2 h-5 border-l border-border" aria-hidden />
        <Link href={href({ domain: undefined })} aria-current={!sp.domain ? "page" : undefined} className={pill(!sp.domain)}>{t("allDomains")}</Link>
        {r.domains.map((d) => (
          <Link key={d.key} href={href({ domain: d.key })} aria-current={sp.domain === d.key ? "page" : undefined} className={pill(sp.domain === d.key)}>{d.title}</Link>
        ))}
        <span className="ml-auto text-sm">
          {t("language")} :{" "}
          {(["en", "fr"] as const).map((l) => (
            <Link key={l} href={href({ lang: l })} aria-current={r.locale === l ? "true" : undefined} className={cn("ml-2 uppercase", r.locale === l ? "font-bold" : "underline")}>{l}</Link>
          ))}
        </span>
      </nav>

      {r.correction.level === "free" && r.correction.locked.length > 0 && (
        <Card className="flex flex-wrap items-center justify-between gap-4 border-primary bg-primary/5" data-testid="correction-locked-banner">
          <p className="text-sm">{t("lockedBanner", { n: r.correction.locked.length })}</p>
          <Link href={`/offer?reason=correction&certification=${r.certification.code}`} className={buttonClasses("primary")}>{t("unlock")}</Link>
        </Card>
      )}

      {cards.length === 0 && <p className="text-muted-foreground">{t("none")}</p>}
      {cards.map((card) => {
        if (card.kind === "locked") {
          const l = card.item;
          return (
            <Card key={l.id} className="relative overflow-hidden border-l-4 border-l-success" data-testid="correction-locked">
              <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                <span className="text-base font-semibold">Q{l.order}</span>
                <span className="font-semibold text-success">✓ {t("lockedCorrect")}</span>
                <span className="text-muted-foreground">{l.domain.title}</span>
              </header>
              {/* Decorative: no question content is sent at the free level. */}
              <div aria-hidden className="mt-4 space-y-2 blur-sm select-none">
                <div className="h-3 w-11/12 rounded bg-muted-foreground/30" />
                <div className="h-3 w-9/12 rounded bg-muted-foreground/30" />
                <div className="h-3 w-10/12 rounded bg-muted-foreground/30" />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{t("lockedHint")}</p>
            </Card>
          );
        }
        const i = card.item;
        const correct = i.earned === i.max;
        return (
          <Card key={i.id} className={cn("space-y-5 border-l-4", correct ? "border-l-success" : "border-l-danger")} data-testid="correction-item">
            <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
              <span className="text-base font-semibold">Q{i.order}</span>
              <span className={cn("font-semibold", correct ? "text-success" : "text-danger")}>{correct ? "✓" : "✗"} {t("pointsItem", { earned: i.earned, max: i.max })}</span>
              <span className="text-muted-foreground">{i.domain.title} · {i.objective.code} {i.objective.title}</span>
              {i.caseStudyTitle && <span className="text-muted-foreground">{t("caseStudy", { title: i.caseStudyTitle })}</span>}
              {i.flagged && <span className="text-danger">⚑ {t("filterFlagged")}</span>}
            </header>
            <AnsweredQuestion question={i.question} response={i.response} seriesStemHtml={i.seriesStemHtml} />
            {i.response == null && <p className="text-sm font-medium text-danger">{t("noAnswer")}</p>}
            <section className="rounded-md bg-green-50 p-4 text-sm">
              <h2 className="mb-2 font-semibold text-green-900">{t("correctAnswer")}</h2>
              <ul className="space-y-1">
                {withKeys(i.correctAnswer, (l) => `${l.label ?? ""}|${l.html}`).map(({ key, item: line }) => (
                  <li key={key}>{line.label && <><Html html={line.label} inline /> → </>}<strong><Html html={line.html} inline /></strong></li>
                ))}
              </ul>
            </section>
            <section className="text-sm">
              <h2 className="mb-2 font-semibold">{t("explanation")}</h2>
              <Html html={i.explanationHtml} />
              {i.optionExplanations.length > 0 && (
                <>
                  <h3 className="mb-1 mt-3 font-semibold">{t("whyNot")}</h3>
                  <ul className="list-disc space-y-1 pl-5">
                    {withKeys(i.optionExplanations, (o) => o.label).map(({ key, item: o }) => (
                      <li key={key}><Html html={o.label} inline /> — <Html html={o.html} inline /></li>
                    ))}
                  </ul>
                </>
              )}
              <ul className="mt-3 space-y-1">
                {i.references.map((ref) => (
                  <li key={ref.url}><a href={ref.url} target="_blank" rel="noreferrer" className="text-primary underline">{t("learnMore")} — {ref.title}</a></li>
                ))}
              </ul>
            </section>
            <ReportForm questionId={i.question.id} />
          </Card>
        );
      })}
    </div>
  );
}
