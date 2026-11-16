import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getChapter, type ChapterPage } from "@/lib/course/read";
import { courseHtml, type CourseLabels } from "@/lib/course/render";
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { localizeLearnUrl } from "@/lib/markdown";
import { Alert } from "@/components/ui/card";
import { CodeCopy } from "@/components/course/code-copy";
import { MarkRead } from "@/components/course/mark-read";
import { ProgressBar } from "@/components/course/progress-bar";

export const metadata = { title: "Course" };
export const dynamic = "force-dynamic";

type Params = Promise<{ certification: string; chapter: string }>;

/** Table of contents of the chapter: section links, read ones ticked. */
function Toc({ chapter, label }: Readonly<{ chapter: ChapterPage; label: string }>) {
  return (
    <ol className="space-y-1 text-sm">
      {chapter.sections.map((s) => (
        <li key={s.code}>
          <a href={`#${s.code}`} className="flex gap-2 rounded px-2 py-1 hover:bg-muted">
            <span aria-hidden className="w-4 shrink-0 text-success">{s.read ? "✓" : ""}</span>
            <span>{s.title}</span>
            {s.read && <span className="sr-only">({label})</span>}
          </a>
        </li>
      ))}
    </ol>
  );
}

/** A chapter of the course: summary, table of contents, sections, references, previous and next chapter. */
export default async function ChapterReadPage({ params }: Readonly<{ params: Params }>) {
  const { certification, chapter: code } = await params;
  const user = await requireUser();
  const current = await getLocale();
  const locale = isLocale(current) ? current : defaultLocale;
  const chapter = await getChapter(prisma, { certification, chapter: code, viewer: { userId: user.id, isAdmin: user.role === "admin" }, locale });
  if (!chapter) notFound();
  const t = await getTranslations("course");
  const labels: CourseLabels = { table: t("table"), copy: t("copy") };
  const [summary, ...bodies] = await Promise.all([
    courseHtml({ key: `chapter:${chapter.code}`, contentHash: chapter.contentHash, markdown: chapter.summary }, locale, labels),
    ...chapter.sections.map((s) => courseHtml({ key: s.id, contentHash: s.contentHash, markdown: s.body }, locale, labels)),
  ]);
  const base = `/course/${chapter.certification.code}`;
  const read = chapter.sections.filter((s) => s.read).length;

  return (
    <div className="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10">
      <aside className="hidden lg:block">
        <nav aria-label={t("toc")} className="sticky top-4 max-h-[calc(100vh-2rem)] space-y-3 overflow-y-auto">
          <p className="px-2 text-sm font-semibold">{t("toc")}</p>
          <Toc chapter={chapter} label={t("read")} />
        </nav>
      </aside>

      <article className="min-w-0 space-y-8" lang={locale}>
        <header className="space-y-3">
          <p className="text-sm">
            <Link href={base} className="text-primary underline">← {t("backToOutline")}</Link>
            <span className="text-muted-foreground"> · {chapter.module.title}</span>
          </p>
          <h1 className="text-2xl font-bold sm:text-3xl">{chapter.title}</h1>
          <p className="text-sm text-muted-foreground">{t("minutes", { n: chapter.minutes })}</p>
          {chapter.status !== "published" && <Alert>{t("preview", { status: t(`status_${chapter.status}`) })}</Alert>}
          <ProgressBar read={read} total={chapter.sections.length} label={t("progressLabel")} text={t("sectionsRead", { read, total: chapter.sections.length })} />
          <div className="prose-q prose-course" dangerouslySetInnerHTML={{ __html: summary! }} />
        </header>

        <nav aria-label={t("tocMobile")} className="lg:hidden">
          <details className="rounded-lg border border-border">
            <summary className="cursor-pointer px-4 py-3 font-semibold">{t("toc")}</summary>
            <div className="border-t border-border p-2"><Toc chapter={chapter} label={t("read")} /></div>
          </details>
        </nav>

        {chapter.sections.map((s, i) => (
          <section key={s.code} id={s.code} aria-labelledby={`${s.id}-title`} className="scroll-mt-4 space-y-4 border-t border-border pt-6" data-testid="course-section">
            <h2 id={`${s.id}-title`} className="text-xl font-semibold">{s.title}</h2>
            {s.objectives.length > 0 && (
              <ul aria-label={t("objectives")} className="flex flex-wrap gap-2">
                {s.objectives.map((o) => (
                  <li key={o.code} className="rounded-full border border-border bg-muted px-3 py-0.5 text-xs">
                    <span className="font-mono font-semibold">{o.code}</span> {o.title}
                  </li>
                ))}
              </ul>
            )}
            <div className="prose-q prose-course" dangerouslySetInnerHTML={{ __html: bodies[i]! }} />
            <MarkRead sectionId={s.id} read={s.read} title={s.title} />
          </section>
        ))}

        {chapter.references.length > 0 && (
          <section aria-labelledby="references-title" className="space-y-3 border-t border-border pt-6">
            <h2 id="references-title" className="text-xl font-semibold">{t("references")}</h2>
            <ul className="list-disc space-y-1 pl-5">
              {chapter.references.map((r) => (
                <li key={r.url}><a href={localizeLearnUrl(r.url, locale)} target="_blank" rel="noopener noreferrer" className="text-primary underline">{r.title}</a></li>
              ))}
            </ul>
          </section>
        )}

        <nav aria-label={t("chapterNav")} className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:justify-between">
          {chapter.previous ? (
            <Link href={`${base}/${chapter.previous.code}`} className="rounded-lg border border-border p-3 hover:bg-muted" rel="prev">
              <span className="block text-xs text-muted-foreground">← {t("previous")}</span>
              <span className="font-semibold">{chapter.previous.title}</span>
            </Link>
          ) : <span />}
          {chapter.next && (
            <Link href={`${base}/${chapter.next.code}`} className="rounded-lg border border-border p-3 text-right hover:bg-muted" rel="next">
              <span className="block text-xs text-muted-foreground">{t("next")} →</span>
              <span className="font-semibold">{chapter.next.title}</span>
            </Link>
          )}
        </nav>
      </article>
      <CodeCopy copied={t("copied")} />
    </div>
  );
}
