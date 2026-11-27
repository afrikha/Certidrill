import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getCourseOutline, offerUrl } from "@/lib/course/read";
import { quizSummaries } from "@/lib/course/quiz";
import { QuizBadge } from "@/components/course/quiz-badge";
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/course/progress-bar";
import { formatArg, PerformanceNotice } from "@/components/performance";
import { EnglishOnlyNotice } from "@/components/english-only";
import { cn } from "@/lib/utils";

export const metadata = { title: "Course" };
export const dynamic = "force-dynamic";

/** The outline of a course: modules, chapters, progress, where to resume, chapters to review. */
export default async function CourseOutlinePage({ params }: Readonly<{ params: Promise<{ certification: string }> }>) {
  const { certification } = await params;
  const user = await requireUser();
  const current = await getLocale();
  const locale = isLocale(current) ? current : defaultLocale;
  const outline = await getCourseOutline(prisma, { certification, viewer: { userId: user.id, isAdmin: user.role === "admin" }, locale });
  if (!outline) notFound();
  const quizzes = await quizSummaries(prisma, { userId: user.id, isAdmin: user.role === "admin" }, outline.certification.code);
  const t = await getTranslations("course");
  const code = outline.certification.code;
  const chapters = outline.modules.flatMap((m) => m.chapters);
  const weak = chapters.filter((c) => c.weak);
  const locked = chapters.filter((c) => c.locked).length;
  const first = chapters[0];

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <h1 className="text-2xl font-bold">{t("title", { code: code.toUpperCase() })}</h1>
        <p className="text-muted-foreground">{outline.certification.title}</p>
        <EnglishOnlyNotice languages={outline.certification.languages} />
        <PerformanceNotice format={outline.certification.format} />
        <Card className="space-y-4">
          <ProgressBar read={outline.read} total={outline.sections} label={t("progressLabel")} text={t("progress", { read: outline.read, total: outline.sections })} />
          {outline.resume && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link href={`/course/${code}/${outline.resume.chapter}#${outline.resume.section}`} className={buttonClasses("primary")} data-testid="course-resume">
                {outline.read === 0 ? t("start") : t("resume", { chapter: outline.resume.chapterTitle })}
              </Link>
              {outline.read > 0 && <span className="text-sm text-muted-foreground">{t("resumeSection", { section: outline.resume.sectionTitle })}</span>}
            </div>
          )}
          {!outline.resume && first && !locked && <p className="font-semibold text-success">{t("done")}</p>}
          {locked > 0 && (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" data-testid="course-locked-count">
              <span>{t("lockedChapters", { n: locked })}</span>
              <Link href={offerUrl(code)} className="font-semibold text-primary underline">{t("unlock")}</Link>
            </p>
          )}
        </Card>
      </header>

      {weak.length > 0 && (
        <section aria-labelledby="weak-title" className="rounded-lg border border-warning/40 bg-amber-50 p-4" data-testid="course-weak">
          <h2 id="weak-title" className="font-semibold">{t("weakTitle", { format: formatArg(outline.certification.format) })}</h2>
          <p className="mt-1 text-sm">{t("weakText", { format: formatArg(outline.certification.format) })}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {weak.map((c) => (
              <li key={c.code}><Link href={`/course/${code}/${c.code}`} className="text-primary underline">{c.title}</Link></li>
            ))}
          </ul>
        </section>
      )}

      {outline.modules.map((m) => (
        <section key={m.code} aria-labelledby={`module-${m.code}`} className="space-y-3">
          <h2 id={`module-${m.code}`} className="text-lg font-semibold">{m.title}</h2>
          <ol className="space-y-3">
            {m.chapters.map((c) => {
              const done = c.sections.length > 0 && c.read === c.sections.length;
              return (
                <li key={c.code}>
                  <Card className={cn("space-y-2 p-4", c.weak && "border-warning")} data-testid="course-chapter">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <Link href={`/course/${code}/${c.code}`} className="font-semibold text-primary underline">{c.title}</Link>
                      <span className="flex flex-wrap gap-2 text-xs">
                        {c.status !== "published" && <span className="rounded bg-muted px-2 py-0.5 font-semibold">{t(`status_${c.status}`)}</span>}
                        {c.weak && <span className="rounded bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">{t("weak")}</span>}
                        {c.locked && <span className="rounded bg-muted px-2 py-0.5 font-semibold"><span aria-hidden>🔒 </span>{t("locked")}</span>}
                        {done && <span className="rounded bg-green-100 px-2 py-0.5 font-semibold text-green-900">✓ {t("completed")}</span>}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t("minutes", { n: c.minutes })} · {t("sectionsRead", { read: c.read, total: c.sections.length })}
                    </p>
                    {quizzes.has(c.code) && <QuizBadge summary={quizzes.get(c.code)!} href={`/course/${code}/${c.code}/quiz`} />}
                  </Card>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
