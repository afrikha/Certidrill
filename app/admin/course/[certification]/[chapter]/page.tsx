import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { CHAPTER_STATUSES, chapterForReview, type ReviewChapter } from "@/lib/course/admin";
import { courseHtml } from "@/lib/course/render";
import { locales, type Locale } from "@/lib/i18n/config";
import { localizeDocsUrl } from "@/lib/vendors";
import { setChapterStatusAction } from "@/lib/actions/course";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CodeCopy } from "@/components/course/code-copy";

export const metadata = { title: "Course preview" };
export const dynamic = "force-dynamic";

type View = Locale | "both";
const VIEWS: readonly View[] = [...locales, "both"];
const isView = (value: unknown): value is View => (VIEWS as readonly unknown[]).includes(value);

/** The chapter's HTML in one language, as readers get it (same rendering, same cache). */
async function renderIn(chapter: ReviewChapter, locale: Locale) {
  const t = await getTranslations({ locale, namespace: "course" });
  const labels = { table: t("table"), copy: t("copy") };
  const [summary, ...sections] = await Promise.all([
    courseHtml({ key: `chapter:${chapter.certification}:${chapter.code}`, contentHash: chapter.contentHash, markdown: chapter.summary[locale] }, locale, labels),
    ...chapter.sections.map((s) => courseHtml({ key: s.id, contentHash: s.contentHash, markdown: s.body[locale] }, locale, labels)),
  ]);
  return { summary: summary!, sections, objectivesLabel: t("objectives"), referencesLabel: t("references") };
}

/**
 * A chapter for review (docs/SPECS-COURS.md §9): as displayed to readers, in
 * English, in French, or both side by side, section by section; whatever its
 * status, retired included. Its status can be changed from here.
 */
export default async function AdminCoursePreviewPage({ params, searchParams }: Readonly<{
  params: Promise<{ certification: string; chapter: string }>;
  searchParams: Promise<{ view?: string }>;
}>) {
  // Checked here too: layouts are not re-run on every navigation (Next.js guidance).
  await requireAdmin();
  const { certification, chapter: code } = await params;
  const sp = await searchParams;
  const view: View = isView(sp.view) ? sp.view : "both";
  const chapter = await chapterForReview(prisma, certification, code);
  if (!chapter) notFound();
  const t = await getTranslations("courseAdmin");
  const tCourse = await getTranslations("course");
  const shown: Locale[] = view === "both" ? [...locales] : [view];
  const html = Object.fromEntries(await Promise.all(shown.map(async (l) => [l, await renderIn(chapter, l)] as const))) as Partial<Record<Locale, Awaited<ReturnType<typeof renderIn>>>>;
  const columns = cn("grid gap-6", view === "both" && "lg:grid-cols-2");
  const base = `/admin/course/${certification}/${chapter.code}`;

  return (
    <div className="space-y-6">
      <p className="text-sm"><Link href="/admin/course" className="text-primary underline">← {t("back")}</Link></p>
      <header className="space-y-3">
        <h1 className="text-2xl font-bold">{chapter.title.en} <span className="font-normal text-muted-foreground">/ {chapter.title.fr}</span></h1>
        <p className="font-mono text-xs text-muted-foreground">
          {chapter.code} · {chapter.module.en} · {chapter.free ? t("free") : t("full")} · {tCourse("minutes", { n: chapter.minutes })}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <form action={setChapterStatusAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="chapter" value={chapter.id} />
            <label className="text-sm font-medium" htmlFor="chapter-status">{t("status")}</label>
            <Select id="chapter-status" name="status" defaultValue={chapter.status} className="w-auto">
              {CHAPTER_STATUSES.map((s) => <option key={s} value={s}>{tCourse(`status_${s}`)}</option>)}
            </Select>
            <Button type="submit" variant="secondary" className="px-3 py-1">{t("save")}</Button>
          </form>
          {chapter.fileStatus !== chapter.status && <span className="text-xs text-muted-foreground">{t("fileStatus", { status: tCourse(`status_${chapter.fileStatus}`) })}</span>}
          {chapter.status !== "retired" && (
            <Link href={`/course/${certification}/${chapter.code}`} className="text-sm text-primary underline">{t("asReaders")}</Link>
          )}
        </div>
        <nav aria-label={t("view")} className="flex flex-wrap gap-2 text-sm">
          {VIEWS.map((v) => (
            <Link
              key={v}
              href={`${base}?view=${v}`}
              aria-current={view === v ? "page" : undefined}
              className={cn("rounded-full border px-3 py-1", view === v ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted")}
            >
              {t(`view_${v}`)}
            </Link>
          ))}
        </nav>
      </header>

      <div className={columns}>
        {shown.map((l) => (
          <div key={l} lang={l} className="min-w-0 space-y-2">
            {view === "both" && <p className="text-xs font-semibold uppercase text-muted-foreground">{l}</p>}
            <h2 className="text-xl font-semibold">{chapter.title[l]}</h2>
            <div className="prose-q prose-course" dangerouslySetInnerHTML={{ __html: html[l]!.summary }} />
          </div>
        ))}
      </div>

      {chapter.sections.map((s, i) => (
        <section key={s.code} id={s.code} className="space-y-3 border-t border-border pt-6" data-testid="admin-course-section" aria-label={s.title.en}>
          <p className="font-mono text-xs text-muted-foreground">#{s.code} · {s.objectives.map((o) => o.code).join(", ")}</p>
          <div className={columns}>
            {shown.map((l) => (
              <div key={l} lang={l} className="min-w-0 space-y-3">
                <h3 className="text-lg font-semibold">{s.title[l]}</h3>
                {s.objectives.length > 0 && (
                  <ul aria-label={html[l]!.objectivesLabel} className="flex flex-wrap gap-2">
                    {s.objectives.map((o) => (
                      <li key={o.code} className="rounded-full border border-border bg-muted px-3 py-0.5 text-xs">
                        <span className="font-mono font-semibold">{o.code}</span> {o.title[l]}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="prose-q prose-course" dangerouslySetInnerHTML={{ __html: html[l]!.sections[i]! }} />
              </div>
            ))}
          </div>
        </section>
      ))}

      {chapter.references.length > 0 && (
        <Card className="space-y-2">
          <h2 className="font-semibold">{t("references")}</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {chapter.references.map((r) => (
              <li key={r.url}>
                {r.title}{" "}
                {shown.map((l) => (
                  <a key={l} href={localizeDocsUrl(r.url, l)} target="_blank" rel="noopener noreferrer" className="ml-2 text-primary underline">{l.toUpperCase()}</a>
                ))}
              </li>
            ))}
          </ul>
        </Card>
      )}
      <CodeCopy copied={tCourse("copied")} />
    </div>
  );
}
