"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { AttemptView } from "@/lib/exam/session";
import { isAnswered, isComplete } from "@/lib/questions/public";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { QuestionView } from "@/components/questions/question-view";
import { Html } from "@/components/questions/html";
import { isRefusalCode } from "@/lib/access/rules";
import { api, ApiError, getView } from "./api";
import { ConfirmDialog } from "./confirm-dialog";
import { formatDuration, useCountdown } from "./use-countdown";
import { useSaveQueue, type SaveStatus } from "./use-save-queue";
import { Welcome } from "./welcome";
import { ReviewScreen } from "./review-screen";

type Item = AttemptView["items"][number];
type Dialog = null | "leaveCase" | "leaveMain" | "seriesNext" | "finish";

/** A pending answer could not be saved: the action is refused until it is. */
class UnsavedError extends Error {}

export function ExamClient({ initial, resumed }: Readonly<{ initial: AttemptView; resumed: boolean }>) {
  const t = useTranslations("exam");
  const router = useRouter();
  const [view, setView] = useState(initial);
  const [responses, setResponses] = useState<Record<string, unknown>>(() => Object.fromEntries(initial.items.map((i) => [i.id, i.response])));
  const [flags, setFlags] = useState<Record<string, boolean>>(() => Object.fromEntries(initial.items.map((i) => [i.id, i.flagged])));
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [mode, setMode] = useState<"question" | "review">("question");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState(() => (resumed && initial.status === "in_progress" ? t("resumeNotice") : ""));
  const [finished, setFinished] = useState(false);

  const goToResults = useCallback(() => {
    setFinished(true);
    router.replace(`/results/${view.id}`);
  }, [router, view.id]);

  const applyView = useCallback(
    (next: AttemptView, pending?: Map<string, { response?: unknown; flagged?: boolean }>) => {
      if (next.status === "submitted" || next.status === "expired") return goToResults();
      setView(next);
      // Server state, with still-unsent local changes on top.
      setResponses(Object.fromEntries(next.items.map((i) => [i.id, pending?.get(i.id)?.response !== undefined ? pending.get(i.id)!.response : i.response])));
      setFlags(Object.fromEntries(next.items.map((i) => [i.id, pending?.get(i.id)?.flagged ?? i.flagged])));
    },
    [goToResults],
  );

  const refreshRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const queue = useSaveQueue(view.id, (code) => {
    if (code === "expired" || code === "finished") goToResults();
    else void refreshRef.current();
  });
  const { pendingPatches } = queue;
  const refresh = useCallback(async () => {
    try {
      applyView(await getView(view.id), pendingPatches());
    } catch {
      setError(t("error"));
    }
  }, [view.id, applyView, pendingPatches, t]);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  // ------------------------------------------------------------ derived state
  const section = view.sections.find((s) => s.id === view.currentSectionId) ?? null;
  const sectionItems = useMemo(() => (section ? view.items.filter((i) => i.sectionId === section.id) : []), [section, view.items]);
  const firstOpenSeriesItem = sectionItems.find((i) => !i.answered);
  const current: Item | undefined =
    section?.kind === "series" ? firstOpenSeriesItem : (sectionItems.find((i) => i.id === currentId) ?? sectionItems[0]);
  const index = current ? sectionItems.indexOf(current) : -1;
  /** The last section ends the exam (submission); earlier ones are locked when left. */
  const isLastSection = section !== null && section.id === view.sections.at(-1)?.id;

  // ------------------------------------------------------------ timer & warnings
  const remaining = useCountdown(view.deadlineAt, view.serverNow);
  const warned = useRef(new Set<number>());
  useEffect(() => {
    if (remaining === null || view.status !== "in_progress") return;
    for (const min of view.warningsMin) {
      if (remaining <= min * 60_000 && remaining > (min - 1) * 60_000 && !warned.current.has(min)) {
        warned.current.add(min);
        setAnnouncement(t("warning", { n: min }));
      }
    }
  }, [remaining, view.status, view.warningsMin, t]);

  const expiring = useRef(false);
  useEffect(() => {
    if (remaining !== 0 || view.status !== "in_progress" || expiring.current) return;
    expiring.current = true;
    setAnnouncement(t("timeUp"));
    // Send what is still pending (accepted during the grace period), then let
    // the server close the attempt as expired.
    void (async () => {
      await queue.flush().catch(() => undefined);
      await new Promise((r) => setTimeout(r, 5_500));
      try {
        applyView(await getView(view.id));
      } catch {
        goToResults();
      }
    })();
  }, [remaining, view.status, view.id, queue, applyView, goToResults, t]);

  // ------------------------------------------------------------ actions
  const change = (item: Item, response: unknown) => {
    setResponses((r) => ({ ...r, [item.id]: response }));
    if (section?.kind !== "series") queue.enqueue(item.id, { response });
  };
  const toggleFlag = (item: Item) => {
    const next = !flags[item.id];
    setFlags((f) => ({ ...f, [item.id]: next }));
    queue.enqueue(item.id, { flagged: next });
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      if (err instanceof ApiError && (err.code === "expired" || err.code === "finished")) return goToResults();
      // Access refused when the clock starts (quota used meanwhile, Pass ended): the offer screen says why.
      if (err instanceof ApiError && err.status === 402 && isRefusalCode(err.code)) return router.push(`/offer?${new URLSearchParams({ reason: err.code, certification: view.certification.code })}`);
      if (err instanceof ApiError && err.code === "email_unverified") return setError(t("emailUnverified"));
      if (err instanceof UnsavedError) return setError(t("unsavedRetry"));
      setError(t("error"));
      await refresh();
    } finally {
      setBusy(false);
      setDialog(null);
    }
  };

  const start = () =>
    run(async () => {
      const next = await api<AttemptView>(`/api/attempts/${view.id}/start`, { method: "POST" });
      applyView(next);
    });

  /** Leaving a section or submitting must never drop an answer that is not saved yet. */
  const flushOrFail = async () => {
    if (!(await queue.flush())) throw new UnsavedError();
  };

  const lockCurrent = () =>
    run(async () => {
      await flushOrFail();
      await api(`/api/attempts/${view.id}/sections/${section!.id}/lock`, { method: "POST" });
      applyView(await getView(view.id));
      setCurrentId(null);
      setMode("question");
    });

  const confirmSeriesAnswer = () =>
    run(async () => {
      const item = current!;
      await api(`/api/attempts/${view.id}/items/${item.id}`, { method: "PUT", body: { response: responses[item.id] } });
      const last = sectionItems.at(-1)?.id === item.id;
      if (last && isLastSection) {
        await api(`/api/attempts/${view.id}/submit`, { method: "POST" });
        return goToResults();
      }
      if (last) await api(`/api/attempts/${view.id}/sections/${section!.id}/lock`, { method: "POST" });
      applyView(await getView(view.id));
    });

  const finish = () =>
    run(async () => {
      await flushOrFail();
      await api(`/api/attempts/${view.id}/submit`, { method: "POST" });
      goToResults();
    });

  const go = (item: Item | undefined) => {
    if (!item) return;
    setCurrentId(item.id);
    setMode("question");
    document.getElementById("question-top")?.focus();
  };

  // ------------------------------------------------------------ render
  if (finished) return <output className="block p-8 text-center">{t("submitting")}</output>;
  if (view.status === "not_started") return <Welcome view={view} onStart={start} busy={busy} error={error} blueprintRange={view.questionRange} />;
  if (!section) {
    return <output className="block p-8 text-center">{t("submitting")}</output>;
  }

  const unansweredIn = (items: Item[]) => items.filter((i) => !isAnswered(responses[i.id])).length;
  const showReview = mode === "review" && section.kind === "main";

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar
        view={view}
        sectionKind={section.kind}
        number={current?.order ?? null}
        remaining={remaining}
        saveStatus={queue.status}
      />
      <div aria-live="assertive" className="sr-only">{announcement}</div>
      {announcement && remaining !== null && remaining < 11 * 60_000 && (
        <output className="block bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-950">{announcement}</output>
      )}
      {error && <Alert tone="error" className="m-4">{error}</Alert>}

      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        {showReview && (
          <ReviewScreen
            items={sectionItems}
            responses={responses}
            flags={flags}
            onOpen={go}
            onBack={() => setMode("question")}
            onFinish={() => setDialog(isLastSection ? "finish" : "leaveMain")}
            finishLabel={isLastSection ? t("finish") : t("leaveSection")}
          />
        )}
        {!showReview && current && (
          <div className={cn(section.kind === "case_study" && "grid gap-6 lg:grid-cols-2")}>
            {section.kind === "case_study" && section.caseStudy && <CaseStudyPanel caseStudy={section.caseStudy} />}
            <div>
              <div id="question-top" tabIndex={-1} className="outline-none" />
              <QuestionView
                key={current.id}
                question={current.question}
                response={responses[current.id] ?? null}
                onChange={(r) => change(current, r)}
                seriesStemHtml={section.kind === "series" ? section.seriesStemHtml : undefined}
                disabled={busy}
              />

              <QuestionNav
                sectionKind={section.kind}
                index={index}
                count={sectionItems.length}
                busy={busy}
                answered={responses[current.id] != null}
                flagged={!!flags[current.id]}
                isLastSection={isLastSection}
                onPrevious={() => go(sectionItems[index - 1])}
                onNext={() => go(sectionItems[index + 1])}
                onReview={() => setMode("review")}
                onToggleFlag={() => toggleFlag(current)}
                onDialog={setDialog}
              />

              {section.kind === "case_study" && (
                <CaseQuestionNav items={sectionItems} currentId={current.id} responses={responses} onOpen={go} />
              )}
            </div>
          </div>
        )}
      </main>

      <ExamDialogs
        dialog={dialog}
        busy={busy}
        unanswered={unansweredIn(sectionItems)}
        incomplete={sectionItems.filter((i) => !isComplete(i.question.body, responses[i.id])).length}
        onLock={lockCurrent}
        onConfirmSeries={confirmSeriesAnswer}
        onFinish={finish}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}

function TopBar({ view, sectionKind, number, remaining, saveStatus }: Readonly<{
  view: AttemptView;
  sectionKind: "case_study" | "series" | "main";
  number: number | null;
  remaining: number | null;
  saveStatus: SaveStatus;
}>) {
  const t = useTranslations("exam");
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const on = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);
  const low = remaining !== null && remaining <= 10 * 60_000;
  const saveLabel: Record<SaveStatus, string> = { saved: `✓ ${t("saved")}`, saving: t("saving"), error: `⚠ ${t("unsaved")}` };
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2 text-sm">
        <span className="font-mono font-semibold uppercase">{view.certification.code}</span>
        <span className="text-muted-foreground">{t("section_" + sectionKind)}</span>
        {number !== null && <span className="font-medium">{t("question", { n: number, total: view.totalQuestions })}</span>}
        <output
          aria-live="polite"
          data-testid="save-status"
          className={cn("text-xs", saveStatus === "error" ? "font-semibold text-danger" : "text-muted-foreground")}
        >
          {saveLabel[saveStatus]}
        </output>
        <span className="ml-auto flex items-center gap-4">
          {remaining !== null && (
            <span role="timer" aria-label={t("timeLeft")} data-testid="timer" className={cn("font-mono text-base font-semibold tabular-nums", low && "text-danger")}>
              {formatDuration(remaining)}
            </span>
          )}
          <button
            type="button"
            className="rounded border border-border px-2 py-1 text-xs hover:bg-muted"
            onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => undefined)}
          >
            {fullscreen ? t("exitFullscreen") : t("fullscreen")}
          </button>
        </span>
      </div>
    </header>
  );
}

const TAB_STEP: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };

function CaseStudyPanel({ caseStudy }: Readonly<{ caseStudy: NonNullable<AttemptView["sections"][number]["caseStudy"]> }>) {
  const t = useTranslations("exam");
  const [tab, setTab] = useState(caseStudy.tabs[0]?.key);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const step = TAB_STEP[e.key];
    if (step === undefined) return;
    const n = caseStudy.tabs.length;
    const next = (i + step + n) % n;
    e.preventDefault();
    setTab(caseStudy.tabs[next]!.key);
    document.getElementById(`cs-tab-${caseStudy.tabs[next]!.key}`)?.focus();
  };
  return (
    <section aria-label={t("scenario")} className="rounded-md border border-border lg:sticky lg:top-16 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
      <h2 className="border-b border-border bg-muted px-4 py-2 font-semibold"><Html html={caseStudy.titleHtml} inline /></h2>
      <div role="tablist" aria-label={t("scenario")} className="flex flex-wrap border-b border-border">
        {caseStudy.tabs.map((tb, i) => (
          <button
            key={tb.key}
            id={`cs-tab-${tb.key}`}
            role="tab"
            type="button"
            aria-selected={tab === tb.key}
            aria-controls={`cs-panel-${tb.key}`}
            tabIndex={tab === tb.key ? 0 : -1}
            onClick={() => setTab(tb.key)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn("px-4 py-2 text-sm", tab === tb.key ? "border-b-2 border-primary font-semibold" : "text-muted-foreground hover:bg-muted")}
          >
            <Html html={tb.titleHtml} inline />
          </button>
        ))}
      </div>
      {caseStudy.tabs.map((tb) => (
        <div key={tb.key} id={`cs-panel-${tb.key}`} role="tabpanel" aria-labelledby={`cs-tab-${tb.key}`} hidden={tab !== tb.key} tabIndex={0} className="p-4">
          <Html html={tb.html} />
        </div>
      ))}
    </section>
  );
}

/** Buttons under the question: depend on the kind of section. */
function QuestionNav({ sectionKind, index, count, busy, answered, flagged, isLastSection, onPrevious, onNext, onReview, onToggleFlag, onDialog }: Readonly<{
  sectionKind: "case_study" | "series" | "main";
  index: number;
  count: number;
  busy: boolean;
  answered: boolean;
  flagged: boolean;
  isLastSection: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onReview: () => void;
  onToggleFlag: () => void;
  onDialog: (dialog: Dialog) => void;
}>) {
  const t = useTranslations("exam");
  if (sectionKind === "series") {
    return (
      <nav aria-label={t("section_" + sectionKind)} className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button onClick={() => onDialog("seriesNext")} disabled={busy || !answered}>{t("seriesNext")}</Button>
        {!answered && <span className="text-sm text-muted-foreground">{t("seriesChoose")}</span>}
      </nav>
    );
  }
  const hasNext = index < count - 1;
  return (
    <nav aria-label={t("section_" + sectionKind)} className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-4">
      <Button variant="secondary" onClick={onPrevious} disabled={index <= 0}>← {t("previous")}</Button>
      {hasNext && <Button variant="secondary" onClick={onNext}>{t("next")} →</Button>}
      {!hasNext && sectionKind === "main" && <Button variant="secondary" onClick={onReview}>{t("review")} →</Button>}
      {sectionKind === "main" && (
        <>
          <label className="ml-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={flagged} onChange={onToggleFlag} className="size-4 accent-primary" />
            {t("flag")}
          </label>
          <Button variant="ghost" className="ml-auto" onClick={onReview}>{t("review")}</Button>
        </>
      )}
      {sectionKind === "case_study" && (
        <Button className="ml-auto" onClick={() => onDialog(isLastSection ? "finish" : "leaveCase")}>
          {isLastSection ? t("finish") : t("leaveCase")}
        </Button>
      )}
    </nav>
  );
}

/** Direct access to the questions of a case study. */
function CaseQuestionNav({ items, currentId, responses, onOpen }: Readonly<{
  items: Item[];
  currentId: string;
  responses: Record<string, unknown>;
  onOpen: (item: Item) => void;
}>) {
  const t = useTranslations("exam");
  const style = (it: Item) => {
    if (it.id === currentId) return "border-primary bg-primary text-primary-foreground";
    return isAnswered(responses[it.id]) ? "border-primary bg-blue-50" : "border-border";
  };
  return (
    <nav aria-label={t("caseQuestions")} className="mt-4 flex flex-wrap gap-2">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          onClick={() => onOpen(it)}
          aria-current={it.id === currentId ? "step" : undefined}
          aria-label={t("goToQuestion", { n: it.order })}
          className={cn("size-9 rounded border text-sm", style(it))}
        >
          {it.order}
        </button>
      ))}
    </nav>
  );
}

/** Confirmations before leaving a section, answering in a series or submitting. */
function ExamDialogs({ dialog, busy, unanswered, incomplete, onLock, onConfirmSeries, onFinish, onCancel }: Readonly<{
  dialog: Dialog;
  busy: boolean;
  unanswered: number;
  incomplete: number;
  onLock: () => void;
  onConfirmSeries: () => void;
  onFinish: () => void;
  onCancel: () => void;
}>) {
  const t = useTranslations("exam");
  return (
    <>
      <ConfirmDialog
        open={dialog === "leaveCase"}
        title={t("leaveCaseConfirm")}
        confirmLabel={t("leaveCase")}
        cancelLabel={t("cancel")}
        onConfirm={onLock}
        onCancel={onCancel}
        busy={busy}
      >
        {t("leaveCaseUnanswered", { n: unanswered })}
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === "leaveMain"}
        title={t("leaveSectionConfirm")}
        confirmLabel={t("leaveSection")}
        cancelLabel={t("cancel")}
        onConfirm={onLock}
        onCancel={onCancel}
        busy={busy}
      >
        {t("finishUnanswered", { n: incomplete })}
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === "seriesNext"}
        title={t("seriesConfirm")}
        confirmLabel={t("confirm")}
        cancelLabel={t("cancel")}
        onConfirm={onConfirmSeries}
        onCancel={onCancel}
        busy={busy}
      />
      <ConfirmDialog
        open={dialog === "finish"}
        title={t("finishConfirm")}
        confirmLabel={t("finish")}
        cancelLabel={t("cancel")}
        onConfirm={onFinish}
        onCancel={onCancel}
        busy={busy}
      >
        {t("finishUnanswered", { n: incomplete })}
      </ConfirmDialog>
    </>
  );
}
