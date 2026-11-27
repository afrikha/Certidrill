import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { CourseOutline, SectionLink } from "@/lib/course/read";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/course/progress-bar";

/** The course on the dashboard: progress, the next chapter to read and, after a mock exam, the sections to read next. */
export async function CourseCard({ outline, suggestions }: Readonly<{ outline: CourseOutline; suggestions: SectionLink[] }>) {
  const t = await getTranslations("course");
  const code = outline.certification.code;
  return (
    <Card className="space-y-4" data-testid="dashboard-course">
      <h2 className="font-semibold">
        <Link href={`/course/${code}`} className="hover:underline">{t("dashboardTitle", { code: code.toUpperCase() })}</Link>
      </h2>
      <ProgressBar read={outline.read} total={outline.sections} label={t("progressLabel")} text={t("progress", { read: outline.read, total: outline.sections })} />
      {outline.resume ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href={`/course/${code}/${outline.resume.chapter}#${outline.resume.section}`} className={buttonClasses("secondary")}>
            {outline.read === 0 ? t("start") : t("resume", { chapter: outline.resume.chapterTitle })}
          </Link>
          {outline.read === 0 && <span className="text-sm text-muted-foreground">{t("dashboardNext", { chapter: outline.resume.chapterTitle })}</span>}
        </div>
      ) : (
        outline.read === outline.sections && <p className="font-semibold text-success">{t("done")}</p>
      )}
      {suggestions.length > 0 && (
        <section aria-labelledby={`suggest-${code}`} className="border-t border-border pt-4" data-testid="course-suggestions">
          <h3 id={`suggest-${code}`} className="font-semibold">{t("suggestTitle", { format: outline.certification.format === "performance" ? "performance" : "other" })}</h3>
          <p className="text-sm text-muted-foreground">{t("suggestText")}</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            {suggestions.map((s) => (
              <li key={`${s.chapter}#${s.section}`}>
                <Link href={s.href} className="text-primary underline">{s.title}</Link>
                <span className="text-muted-foreground"> — {s.chapterTitle}</span>
                {s.locked && <span className="ml-2 text-xs text-muted-foreground">🔒 {t("locked")}</span>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </Card>
  );
}
